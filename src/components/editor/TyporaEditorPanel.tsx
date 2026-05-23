/**
 * 模块职责：Typora 式所见即所得编辑器，基于 Milkdown Crepe。
 * 图片处理策略：
 *   - Crepe 内部 Markdown 始终保持相对路径（不喂 data URL）
 *   - 渲染后用 DOM patch 将 img.src 替换为 data URL 以显示
 *   - markdownUpdated 时用 normalizeMarkdownImageSources 清洗 blob/data/localhost
 *   - MutationObserver 监听新增 img 节点自动 patch
 *   - 图片插入时 ProseMirror 节点 src 使用 relativePath
 * 生命周期安全：
 *   - generationRef 单调递增，所有异步任务执行前校验
 *   - img.isConnected 确保不操作已销毁 DOM（触发 ProseMirror 内部 DOM→state 链条）
 */
import {
  useEffect,
  useRef,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/nord.css";
import "katex/dist/katex.min.css";
import { editorViewCtx } from "@milkdown/kit/core";
import {
  normalizeMarkdownImageSources,
  detectUnsafeImageSources,
} from "../../editor/image/normalize_markdown_images";
import {
  importImageFilesForMarkdown,
  type ImageInsertSource,
} from "../../editor/image/image_asset_workflow";
import { isImageFile, ALLOWED_IMAGE_FORMATS_STRING } from "../../editor/image/image_validation";
import {
  resolveMarkdownAssetPath,
  safeDecodeMarkdownImageSrc,
} from "../../services/path_service";
import { readImageAssetAsDataUrl } from "../../services/asset_service";

export interface TyporaEditorPanelProps {
  content: string;
  currentPath?: string | null;
  fontFamily: string;
  fontSize: number;
  onChange: (nextContent: string) => void;
  scrollToHeadingText?: string | null;
  onStatusMessage?: (message: string) => void;
}

export interface TyporaEditorPanelHandle {
  insertImageFiles: (files: File[], source?: ImageInsertSource) => Promise<void>;
  highlightFindMatches: (query: string, caseSensitive: boolean, activeIndex: number) => boolean;
  clearFindHighlights: () => void;
  scrollToFindMatch: (activeIndex: number) => void;
  getSelectedText: () => string;
  /** 注册查找参数 observer: ProseMirror DOM 重写后自动恢复高亮 */
  setFindObserver: (opts: { query: string; caseSensitive: boolean; activeIndex: number } | null) => void;
  refreshContent: (newContent: string) => void;
}

export const TyporaEditorPanel = forwardRef<TyporaEditorPanelHandle, TyporaEditorPanelProps>(
  function TyporaEditorPanel({
    content,
    currentPath,
    fontFamily,
    fontSize,
    onChange,
    scrollToHeadingText,
    onStatusMessage,
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const crepeRef = useRef<Crepe | null>(null);
    const docKeyRef = useRef<string | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const isComposingRef = useRef(false);
    const onStatusRef = useRef(onStatusMessage);
    onStatusRef.current = onStatusMessage;
    const dropProcessingRef = useRef(false);

    // ── 生命周期 guard ──
    const isMountedRef = useRef(false);
    const generationRef = useRef(0);
    const rafIdsRef = useRef<Set<number>>(new Set());

    /** relativePath → dataUrl 缓存（用于 DOM patch） */
    const relativeDataUrlCacheRef = useRef<Map<string, string>>(new Map());
    /** 已处理的 img 元素集合（避免重复 patch） */
    const patchedImagesRef = useRef<WeakSet<HTMLImageElement>>(new WeakSet());
    const currentPathRef = useRef(currentPath);
    currentPathRef.current = currentPath;

    const [isDragOver, setIsDragOver] = useState(false);
    /** 替换操作后触发编辑器重建的版本号 */
    const [refreshVersion, setRefreshVersion] = useState(0);

    /** 检查当前生命周期是否有效（mounted + generation 匹配） */
    const isLive = useCallback((gen: number) => isMountedRef.current && generationRef.current === gen, []);

    // ── 安全 RAF ──
    const safeRaf = useCallback((fn: () => void) => {
      const gen = generationRef.current;
      const id = requestAnimationFrame(() => {
        rafIdsRef.current.delete(id);
        if (isLive(gen)) fn();
      });
      rafIdsRef.current.add(id);
      return id;
    }, [isLive]);

    // ── 组件挂载/卸载 ──
    useEffect(() => {
      generationRef.current++;
      isMountedRef.current = true;
      console.debug("[WRITING_LIFECYCLE] mount generation", generationRef.current);
      return () => {
        isMountedRef.current = false;
        generationRef.current++;
        if (findDebounceRef.current) clearTimeout(findDebounceRef.current);
        console.debug("[WRITING_LIFECYCLE] cleanup generation", generationRef.current);
        rafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
        rafIdsRef.current.clear();
      };
    }, []);

    // ── DOM patch：将 img.src 替换为 data URL ──
    const patchSingleImage = useCallback(async (img: HTMLImageElement, gen: number) => {
      // 已处理过，跳过
      if (patchedImagesRef.current.has(img)) return;

      const src = img.getAttribute("src") || img.src || "";
      if (!src) { patchedImagesRef.current.add(img); return; }

      // 跳过外部 URL（非本地）
      if (/^https?:\/\//i.test(src) && !/localhost:\d+/.test(src) && !src.includes("asset.localhost")) {
        patchedImagesRef.current.add(img);
        return;
      }
      if (/^data:/i.test(src)) { patchedImagesRef.current.add(img); return; }
      if (/^blob:/i.test(src)) {
        patchedImagesRef.current.add(img);
        return;
      }

      let relativePath = src;
      if (/localhost:\d+\//.test(src) || src.includes("asset.localhost")) {
        try {
          const decoded = decodeURIComponent(src);
          const match = decoded.match(/[^/]+\.assets\/.+/);
          if (match) { relativePath = match[0]; }
          else { patchedImagesRef.current.add(img); return; }
        } catch { patchedImagesRef.current.add(img); return; }
      }

      if (/^[a-zA-Z]:[/\\]/.test(relativePath) || relativePath.startsWith("/")) {
        patchedImagesRef.current.add(img);
        return;
      }

      const cp = currentPathRef.current;
      if (!cp || !relativePath) { patchedImagesRef.current.add(img); return; }

      // 异步读取 dataUrl
      let dataUrl = relativeDataUrlCacheRef.current.get(relativePath);
      if (!dataUrl) {
        try {
          const absPath = resolveMarkdownAssetPath(cp, safeDecodeMarkdownImageSrc(relativePath));
          dataUrl = relativeDataUrlCacheRef.current.get(absPath)
            || await readImageAssetAsDataUrl(absPath);
          relativeDataUrlCacheRef.current.set(relativePath, dataUrl);
          relativeDataUrlCacheRef.current.set(absPath, dataUrl);
        } catch {
          patchedImagesRef.current.add(img);
          return;
        }
      }

      // ★ 关键 guard：检查生命周期和 DOM 连接状态
      // img.isConnected 为 false 表示元素已不在 DOM 中（editor 已销毁）
      // 此时设置 img.src 会触发 ProseMirror 内部 DOM→state 链条 → editorView not found
      if (!isLive(gen)) {
        console.debug("[WRITING_PATCH] skip stale generation", { gen, current: generationRef.current });
        return;
      }
      if (!img.isConnected || !crepeRef.current) {
        console.debug("[WRITING_PATCH] img disconnected or editor gone, skip");
        return;
      }

      img.src = dataUrl;
      patchedImagesRef.current.add(img);
    }, [isLive]);

    const patchAllImages = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const gen = generationRef.current;
      const imgs = container.querySelectorAll("img");
      for (const img of imgs) void patchSingleImage(img as HTMLImageElement, gen);
    }, [patchSingleImage]);

    // ── 统一图片插入入口 ──
    const insertImageFiles = useCallback(
      async (files: File[], source: ImageInsertSource = "button") => {
        const gen = generationRef.current;
        if (!isLive(gen) || !crepeRef.current) {
          console.warn("[WRITING_ACTION] skip insertImageFiles, editor not ready", { gen, source });
          return;
        }

        const view = crepeRef.current.editor.ctx.get(editorViewCtx);
        if (!view) return;

        console.debug(`[IMAGE_INSERT][writing] start`, { source, fileCount: files.length });

        if (!currentPath) {
          onStatusRef.current?.("请先保存 Markdown 文件，再插入图片");
          return;
        }

        const { results, errors } = await importImageFilesForMarkdown({ files, markdownPath: currentPath });

        // 异步回来后再次检查生命周期
        if (!isLive(gen)) return;

        if (results.length === 0 && errors.length > 0) {
          if (errors[0].message.includes("请先保存")) {
            onStatusRef.current?.(errors[0].message);
          } else {
            onStatusRef.current?.(`图片保存失败 (${errors.length} 张)`);
          }
          return;
        }

        if (files.length > results.length && errors.length === 0 && results.length === 0) {
          onStatusRef.current?.(`仅支持图片文件 (${ALLOWED_IMAGE_FORMATS_STRING})`);
          return;
        }

        for (const r of results) {
          if (!isLive(gen)) return;
          relativeDataUrlCacheRef.current.set(r.relativePath, r.dataUrl);
          relativeDataUrlCacheRef.current.set(r.assetPath, r.dataUrl);

          const { state, dispatch } = view;
          if (state.schema.nodes.image) {
            const imageNode = state.schema.nodes.image.create({ src: r.relativePath, alt: r.fileName, title: "" });
            dispatch(state.tr.insert(state.selection.from, imageNode));
          } else {
            dispatch(state.tr.insertText(`![${r.fileName}](${r.relativePath})\n`, state.selection.from, state.selection.to));
          }
        }

        safeRaf(() => patchAllImages());

        console.debug("[IMAGE_INSERT][writing] done", { success: results.length, errors: errors.length });

        if (errors.length > 0 && results.length > 0) {
          onStatusRef.current?.(`已插入 ${results.length} 张，${errors.length} 张失败`);
        } else if (results.length === 1) {
          onStatusRef.current?.("已插入 1 张图片");
        } else if (results.length > 1) {
          onStatusRef.current?.(`已插入 ${results.length} 张图片`);
        }
      },
      [currentPath, isLive, safeRaf, patchAllImages],
    );

    // ── 查找高亮（写作模式 DOM 层） ──
    const findObserverRef = useRef<{ query: string; caseSensitive: boolean; activeIndex: number } | null>(null);

    const highlightFindMatches = useCallback((query: string, caseSensitive: boolean, activeIndex: number): boolean => {
      const container = containerRef.current;
      if (!container || !query) return false;

      clearFindHighlights();

      const target = caseSensitive ? query : query.toLowerCase();
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          if (!node.textContent) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest("script,style,pre,code")) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest(".writing-find-match")) return NodeFilter.FILTER_REJECT;
          const src = caseSensitive ? node.textContent : node.textContent.toLowerCase();
          return src.includes(target) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });

      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

      let globalIdx = 0;
      for (const node of textNodes) {
        const text = node.textContent ?? "";
        const source = caseSensitive ? text : text.toLowerCase();
        let pos = 0;
        const frag = document.createDocumentFragment();

        while (pos < text.length) {
          const idx = source.indexOf(target, pos);
          if (idx === -1) {
            frag.appendChild(document.createTextNode(text.slice(pos)));
            break;
          }
          if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
          const mark = document.createElement("mark");
          mark.className = "writing-find-match";
          if (globalIdx === activeIndex) mark.classList.add("is-active");
          mark.textContent = text.slice(idx, idx + target.length);
          frag.appendChild(mark);
          pos = idx + target.length;
          globalIdx++;
        }
        node.parentNode?.replaceChild(frag, node);
      }

      return globalIdx > 0;
    }, []);

    const clearFindHighlights = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const marks = container.querySelectorAll(".writing-find-match");
      for (const m of marks) {
        const parent = m.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(m.textContent ?? ""), m);
          parent.normalize();
        }
      }
    }, []);

    const scrollToFindMatch = useCallback((activeIndex: number) => {
      const container = containerRef.current;
      if (!container) return;

      const allMatches = container.querySelectorAll(".writing-find-match");
      allMatches.forEach((m) => m.classList.remove("is-active"));

      if (allMatches.length === 0) return;
      const idx = Math.max(0, Math.min(activeIndex, allMatches.length - 1));
      const match = allMatches[idx];
      match.classList.add("is-active");
      match.scrollIntoView({ block: "center", behavior: "smooth" });
    }, []);

    const getSelectedText = useCallback((): string => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) return "";
      if (!containerRef.current.contains(sel.anchorNode)) return "";
      return sel.toString();
    }, []);

    const refreshContent = useCallback((_newContent: string) => {
      if (crepeRef.current) {
        crepeRef.current.destroy();
        crepeRef.current = null;
      }
      docKeyRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
      patchedImagesRef.current = new WeakSet();
      setRefreshVersion((v) => v + 1);
    }, []);

    // ── 查找高亮自动恢复 observer ──
    const setFindObserver = useCallback((opts: { query: string; caseSensitive: boolean; activeIndex: number } | null) => {
      findObserverRef.current = opts;
    }, []);

    // ── find 恢复 debounce timer ──
    const findDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleFindHighlight = useCallback(() => {
      if (findDebounceRef.current) clearTimeout(findDebounceRef.current);
      const opts = findObserverRef.current;
      if (!opts || !opts.query) return;

      findDebounceRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        const ok = highlightFindMatches(opts.query, opts.caseSensitive, opts.activeIndex);
        if (ok) {
          requestAnimationFrame(() => scrollToFindMatch(opts.activeIndex));
        }
      }, 100);
    }, [highlightFindMatches, scrollToFindMatch]);

    // ── MutationObserver（图片 + 查找高亮自动恢复） ──
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const observer = new MutationObserver((_mutations) => {
        const gen = generationRef.current;
        if (!isLive(gen)) return;

        const c = containerRef.current;
        if (c) {
          const imgs = c.querySelectorAll("img");
          for (const img of imgs) {
            if (!patchedImagesRef.current.has(img as HTMLImageElement)) {
              void patchSingleImage(img as HTMLImageElement, gen);
            }
          }
        }

        scheduleFindHighlight();
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["src"],
      });

      return () => {
        console.debug("[WRITING_OBSERVER] disconnected generation", generationRef.current);
        observer.disconnect();
      };
    }, [isLive, patchSingleImage, scheduleFindHighlight]);

    useImperativeHandle(ref, () => ({
      insertImageFiles,
      highlightFindMatches,
      clearFindHighlights,
      scrollToFindMatch,
      getSelectedText,
      setFindObserver,
      refreshContent,
    }), [insertImageFiles, highlightFindMatches, clearFindHighlights, scrollToFindMatch, getSelectedText, setFindObserver, refreshContent]);

    // ── 原生 capture-phase 拖拽 ──
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;

      const onDragOverCapture = (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes("Files")) return;
        if (!Array.from(e.dataTransfer.files).some(isImageFile)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        setIsDragOver(true);
      };

      const onDragLeaveCapture = () => setIsDragOver(false);

      const onDropCapture = (e: DragEvent) => {
        if (!e.dataTransfer?.types.includes("Files")) return;
        const files = e.dataTransfer?.files;
        if (!files || files.length === 0) return;
        const imageFiles = Array.from(files).filter(isImageFile);
        if (imageFiles.length === 0) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsDragOver(false);

        if (dropProcessingRef.current) return;
        dropProcessingRef.current = true;

        void insertImageFiles(imageFiles, "drop").finally(() => {
          setTimeout(() => { dropProcessingRef.current = false; }, 300);
        });
      };

      el.addEventListener("dragover", onDragOverCapture, { capture: true });
      el.addEventListener("dragleave", onDragLeaveCapture, { capture: true });
      el.addEventListener("drop", onDropCapture, { capture: true });

      return () => {
        el.removeEventListener("dragover", onDragOverCapture, { capture: true });
        el.removeEventListener("dragleave", onDragLeaveCapture, { capture: true });
        el.removeEventListener("drop", onDropCapture, { capture: true });
      };
    }, [insertImageFiles]);

    // ── IME ──
    const handleCompositionStart = useCallback(() => { isComposingRef.current = true; }, []);
    const handleCompositionEnd = useCallback(() => { isComposingRef.current = false; }, []);

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      el.addEventListener("compositionstart", handleCompositionStart);
      el.addEventListener("compositionend", handleCompositionEnd);
      return () => {
        el.removeEventListener("compositionstart", handleCompositionStart);
        el.removeEventListener("compositionend", handleCompositionEnd);
      };
    }, [handleCompositionStart, handleCompositionEnd]);

    // ── RESOURCE_DEBUG ──
    useEffect(() => {
      const handler = (event: Event) => {
        const el = event.target as HTMLElement | null;
        if (el && "src" in el) {
          const imgEl = el as HTMLImageElement;
          const src = imgEl.getAttribute("src") || imgEl.src || "";
          console.warn("[RESOURCE_DEBUG] load failed", {
            tagName: imgEl.tagName,
            src: src.slice(0, 120),
            reason: /^blob:/i.test(src) ? "blob" : /^data:/i.test(src) ? "data" : /localhost/.test(src) ? "localhost" : "path",
          });
        }
      };
      window.addEventListener("error", handler, true);
      return () => window.removeEventListener("error", handler, true);
    }, []);

    // ── 初始化 Crepe ──
    useEffect(() => {
      let cancelled = false;
      const container = containerRef.current;
      if (!container) return;

      const docKey = currentPath ?? "__new__";
      if (docKeyRef.current === docKey && crepeRef.current) return;

      generationRef.current++;
      const createGen = generationRef.current;
      console.debug("[WRITING_LIFECYCLE] create start generation", createGen);

      const prev = crepeRef.current;
      if (prev) { prev.destroy(); crepeRef.current = null; }
      container.innerHTML = "";
      patchedImagesRef.current = new WeakSet();

      if (currentPath) {
        const unsafeCount = detectUnsafeImageSources(content);
        if (unsafeCount > 0) {
          console.warn("[IMAGE_GUARD] detected", unsafeCount, "unsafe image sources in content loaded into writing mode");
        }
      }

      const createStart = performance.now();

      const crepe = new Crepe({ root: container, defaultValue: content });
      crepeRef.current = crepe;
      docKeyRef.current = docKey;

      crepe.on((api) => {
        api.markdownUpdated((_ctx, markdown) => {
          if (cancelled || !isMountedRef.current || generationRef.current !== createGen) return;
          if (isComposingRef.current) return;
          const safe = normalizeMarkdownImageSources(markdown);
          onChangeRef.current(safe);
          safeRaf(() => patchAllImages());
        });
      });

      crepe.create().then(() => {
        if (cancelled || !isMountedRef.current || generationRef.current !== createGen) {
          crepe.destroy();
          return;
        }

        console.debug("[WRITING_LIFECYCLE] create done generation", createGen);
        console.log("[PERF][WritingMode] create editor", (performance.now() - createStart).toFixed(1), "ms");
        crepe.setReadonly(false);

        safeRaf(() => patchAllImages());
        safeRaf(() => {
          if (isMountedRef.current && generationRef.current === createGen) {
            const editable = container.querySelector(".ProseMirror, [contenteditable='true']");
            if (editable instanceof HTMLElement) editable.focus();
          }
        });
      }).catch((err: unknown) => {
        console.warn("[TyporaEditor] create failed", err);
      });

      return () => {
        cancelled = true;
        if (crepeRef.current) {
          crepeRef.current.destroy();
          crepeRef.current = null;
          docKeyRef.current = null;
        }
        console.debug("[WRITING_LIFECYCLE] cleanup generation", createGen);
      };
    }, [currentPath, refreshVersion, safeRaf, patchAllImages]);

    // ── 大纲跳转 ──
    useEffect(() => {
      if (!scrollToHeadingText || !containerRef.current) return;
      const container = containerRef.current;
      const timer = setTimeout(() => {
        const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
        for (const h of headings) {
          if (h.textContent?.trim() === scrollToHeadingText) {
            h.scrollIntoView({ block: "center", behavior: "smooth" });
            break;
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [scrollToHeadingText]);

    return (
      <div
        ref={containerRef}
        className={`typora-editor${isDragOver ? " typora-editor--drag-over" : ""}`}
        style={{ fontFamily, fontSize: `${fontSize}px` }}
      />
    );
  },
);
