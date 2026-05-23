/**
 * 模块职责：查找/替换栏，显示在编辑器工具栏下方。
 * 当前输入：query/replaceText/caseSensitive/matchCount/activeIndex/isReplaceMode + 回调。
 * 当前输出：查找替换输入区 + 导航按钮 + 替换按钮。
 */
import { useRef, useEffect } from "react";

export interface FindReplaceBarProps {
  query: string;
  replaceText: string;
  caseSensitive: boolean;
  matchCount: number;
  activeIndex: number;
  isReplaceMode: boolean;
  onQueryChange: (value: string) => void;
  onReplaceTextChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onToggleCaseSensitive: () => void;
  onToggleReplace: () => void;
  onClose: () => void;
}

export function FindReplaceBar({
  query,
  replaceText,
  caseSensitive,
  matchCount,
  activeIndex,
  isReplaceMode,
  onQueryChange,
  onReplaceTextChange,
  onNext,
  onPrev,
  onReplaceCurrent,
  onReplaceAll,
  onToggleCaseSensitive,
  onToggleReplace,
  onClose,
}: FindReplaceBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const hasMatches = matchCount > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        onPrev();
      } else {
        onNext();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (isReplaceMode) {
        onToggleReplace();
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="find-replace-bar">
      <input
        ref={inputRef}
        className="find-replace-bar__input"
        type="text"
        placeholder="查找..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <span className="find-replace-bar__count">
        {query ? `${activeIndex + 1} / ${matchCount}` : ""}
      </span>

      <button className="find-replace-bar__btn" onClick={onPrev} title="上一个 (Shift+Enter)">
        &#9650;
      </button>
      <button className="find-replace-bar__btn" onClick={onNext} title="下一个 (Enter)">
        &#9660;
      </button>

      <button
        className={`find-replace-bar__btn ${caseSensitive ? "find-replace-bar__btn--active" : ""}`}
        onClick={onToggleCaseSensitive}
        title="区分大小写"
      >
        Aa
      </button>

      <button
        className={`find-replace-bar__btn ${isReplaceMode ? "find-replace-bar__btn--active" : ""}`}
        onClick={onToggleReplace}
        title={isReplaceMode ? "收起替换" : "展开替换"}
      >
        {isReplaceMode ? "\u25B2 替换" : "替换"}
      </button>

      {isReplaceMode && (
        <>
          <span className="find-replace-bar__sep" />
          <input
            className="find-replace-bar__input"
            type="text"
            placeholder="替换为..."
            value={replaceText}
            onChange={(e) => onReplaceTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="find-replace-bar__btn"
            disabled={!hasMatches}
            onClick={onReplaceCurrent}
            title="替换当前匹配"
          >
            替换
          </button>
          <button
            className="find-replace-bar__btn"
            disabled={!hasMatches}
            onClick={onReplaceAll}
            title="替换所有匹配"
          >
            全部替换
          </button>
        </>
      )}

      <span className="find-replace-bar__spacer" />
      <button className="find-replace-bar__btn" onClick={onClose} title="关闭 (Esc)">
        &#10005;
      </button>
    </div>
  );
}
