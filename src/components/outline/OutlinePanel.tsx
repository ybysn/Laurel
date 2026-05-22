/**
 * 模块职责：大纲面板，展示文档标题层级结构，支持点击跳转。
 * 当前输入：outlineItems（标题列表）、isEditing、onSelectOutlineItem。
 * 当前输出：按级别缩进 + 样式的标题列表，纯文本展示。
 */
import { type MarkdownOutlineItem } from "../../editor/markdown/parse_outline";

export interface OutlinePanelProps {
  outlineItems: MarkdownOutlineItem[];
  isEditing: boolean;
  onSelectOutlineItem: (item: MarkdownOutlineItem) => void;
}

export function OutlinePanel({
  outlineItems,
  isEditing,
  onSelectOutlineItem,
}: OutlinePanelProps) {
  const headingCount = outlineItems.length;

  return (
    <div className="panel panel--outline">
      <header className="panel__header">
        <h2 className="panel__title">大纲</h2>
      </header>
      <div className="panel__body">
        {!isEditing || headingCount === 0 ? (
          <div className="outline-placeholder">
            {!isEditing ? "请打开 Markdown 文件以查看大纲" : "暂无标题"}
          </div>
        ) : (
          <div className="outline-list">
            {outlineItems.map((item) => (
              <button
                key={item.id}
                className={`outline-item outline-item--h${item.level}`}
                onClick={() => onSelectOutlineItem(item)}
                title={item.text}
              >
                <span className="outline-item__text">{item.text}</span>
                <span className="outline-item__line">{item.line}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
