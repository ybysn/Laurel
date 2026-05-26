/**
 * 模块职责：展示 Emoji、颜文字、特殊字符面板，用户点击后回调 onInsert(symbol)。
 */
import { useState } from "react";

const EMOJI = [
  "😀", "😄", "😅", "😂", "😊", "😍", "😎", "🤔",
  "😭", "😡", "👍", "👎", "🙏", "👏", "💪", "✅",
  "❌", "⚠️", "🔥", "⭐", "📌", "💡", "🚀", "🎯",
];

const KAOMOJI = [
  "(￣▽￣)", "(｀・ω・´)", "(´・ω・｀)",
  "(╯°□°）╯︵ ┻━┻", "┬─┬ ノ( ゜-゜ノ)",
  "( •̀ ω •́ )✧", "(｡･ω･｡)", "(。・∀・)ノ",
  "_(:з」∠)_", "(；´Д｀)",
];

const SPECIAL = [
  "©", "®", "™", "§", "¶", "·", "…", "—",
  "–", "→", "←", "↑", "↓", "↔", "⇒", "⇐",
  "±", "×", "÷", "≈", "≠", "≤", "≥",
  "√", "∞", "∑", "∏", "Δ", "Ω",
  "μ", "α", "β", "γ", "λ", "π",
];

type Tab = "emoji" | "kaomoji" | "special";

export interface SymbolInsertPanelProps {
  onInsert: (symbol: string) => void;
  onClose: () => void;
}

export function SymbolInsertPanel({ onInsert, onClose }: SymbolInsertPanelProps) {
  const [tab, setTab] = useState<Tab>("emoji");

  const symbols = tab === "emoji" ? EMOJI : tab === "kaomoji" ? KAOMOJI : SPECIAL;

  return (
    <div className="symbol-panel" data-tab={tab} onClick={(e) => e.stopPropagation()}>
      <div className="symbol-panel__header">
        <span className="symbol-panel__title">表情与符号</span>
        <button className="symbol-panel__close" onClick={onClose}>&times;</button>
      </div>
      <div className="symbol-panel__tabs">
        <button
          className={`symbol-panel__tab ${tab === "emoji" ? "symbol-panel__tab--active" : ""}`}
          onClick={() => setTab("emoji")}
        >
          表情
        </button>
        <button
          className={`symbol-panel__tab ${tab === "kaomoji" ? "symbol-panel__tab--active" : ""}`}
          onClick={() => setTab("kaomoji")}
        >
          颜文字
        </button>
        <button
          className={`symbol-panel__tab ${tab === "special" ? "symbol-panel__tab--active" : ""}`}
          onClick={() => setTab("special")}
        >
          符号
        </button>
      </div>
      <div className="symbol-panel__grid">
        {symbols.map((s) => (
          <button
            key={s}
            className="symbol-panel__item"
            onClick={() => onInsert(s)}
            title={s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
