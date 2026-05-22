/**
 * 模块职责：Typora 式所见即所得编辑器，基于 Milkdown Crepe。
 */
import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/nord.css";

export interface TyporaEditorPanelProps {
  content: string;
  currentPath?: string | null;
  fontFamily: string;
  fontSize: number;
  onChange: (nextContent: string) => void;
  /** 大纲点击后需要滚动到的标题文本 */
  scrollToHeadingText?: string | null;
}

export function TyporaEditorPanel({
  content,
  currentPath,
  fontFamily,
  fontSize,
  onChange,
  scrollToHeadingText,
}: TyporaEditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const docKeyRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const docKey = currentPath ?? "__new__";
    if (docKeyRef.current === docKey && crepeRef.current) return;

    const prev = crepeRef.current;
    if (prev) {
      prev.destroy();
      crepeRef.current = null;
    }
    container.innerHTML = "";

    const crepe = new Crepe({
      root: container,
      defaultValue: content,
    });
    crepeRef.current = crepe;
    docKeyRef.current = docKey;

    crepe.on((api) => {
      api.markdownUpdated((_ctx, markdown) => {
        onChangeRef.current(markdown);
      });
    });

    crepe.create().then(() => {
      if (cancelled) { crepe.destroy(); return; }
      crepe.setReadonly(false);
    });

    return () => {
      cancelled = true;
      if (crepeRef.current) {
        crepeRef.current.destroy();
        crepeRef.current = null;
        docKeyRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  // 大纲跳转：在 DOM 中查找匹配的标题元素并滚动
  useEffect(() => {
    if (!scrollToHeadingText || !containerRef.current) return;
    const container = containerRef.current;

    // 延迟等待 DOM 更新
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
      className="typora-editor"
      style={{ fontFamily, fontSize: `${fontSize}px` }}
    />
  );
}
