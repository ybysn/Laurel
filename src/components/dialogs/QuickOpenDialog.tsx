/**
 * 模块职责：快速打开弹窗，搜索最近文件并打开。
 * 输入：recentFiles、currentPath、onOpenFile、onClose。
 * 输出：搜索过滤 + 键盘选择 + 鼠标点击。
 * 风险点：不直接调用 Tauri / file_service，打开文件由父组件处理。
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { RecentFileItem } from "../../services/recent_files_service";

export interface QuickOpenDialogProps {
  open: boolean;
  recentFiles: RecentFileItem[];
  currentPath: string | null;
  onOpenFile: (path: string) => void;
  onClose: () => void;
}

export function QuickOpenDialog({
  open,
  recentFiles,
  currentPath,
  onOpenFile,
  onClose,
}: QuickOpenDialogProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recentFiles;
    return recentFiles.filter(
      (f) =>
        f.fileName.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q),
    );
  }, [recentFiles, query]);

  // 打开时重置状态
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // activeIndex 夹持
  const safeIndex = Math.max(0, Math.min(activeIndex, filtered.length - 1));

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          filtered.length === 0 ? 0 : Math.min(prev + 1, filtered.length - 1),
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length === 0 ? 0 : Math.max(prev - 1, 0)));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[safeIndex];
        if (item) onOpenFile(item.path);
        return;
      }
    },
    [onClose, filtered, safeIndex, onOpenFile],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="quick-open-overlay" onClick={onClose}>
      <div className="quick-open" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="quick-open__input"
          type="text"
          placeholder="搜索最近文件..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
        />

        {recentFiles.length === 0 ? (
          <div className="quick-open__empty">暂无最近文件</div>
        ) : filtered.length === 0 ? (
          <div className="quick-open__empty">没有匹配的最近文件</div>
        ) : (
          <div className="quick-open__list">
            {filtered.map((f, i) => {
              const isCurrent = f.path === currentPath;
              const isActive = i === safeIndex;
              let cls = "quick-open__item";
              if (isActive) cls += " quick-open__item--active";
              if (isCurrent) cls += " quick-open__item--current";
              return (
                <div
                  key={f.path}
                  className={cls}
                  onClick={() => onOpenFile(f.path)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <span className="quick-open__file-name">
                    {f.fileName}
                    {isCurrent && (
                      <span className="quick-open__current-tag">当前</span>
                    )}
                  </span>
                  <span className="quick-open__file-path">{f.path}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
