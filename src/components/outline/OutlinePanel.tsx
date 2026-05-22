/**
 * 模块职责：右侧大纲面板，展示文档标题层级结构、文档统计信息，支持点击跳转。
 * 当前输入：outlineItems（标题列表）、stats（文档统计）、onSelectOutlineItem（点击回调）。
 * 当前输出：缩进标题列表、行号、文档统计（字符/词数/行数/标题数）。
 * 后续扩展点：标题折叠/展开、高亮当前滚动位置、更多统计维度。
 */
import { type MarkdownOutlineItem } from "../../editor/markdown/parse_outline";
import { type DocumentStats } from "../../app/document_state";

export interface OutlinePanelProps {
  outlineItems: MarkdownOutlineItem[];
  stats: DocumentStats | null;
  isEditing: boolean;
  onSelectOutlineItem: (item: MarkdownOutlineItem) => void;
}

export function OutlinePanel({
  outlineItems,
  stats,
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
          <ul className="outline-list">
            {outlineItems.map((item) => (
              <li
                key={item.id}
                className="outline-list__item"
                style={{ paddingLeft: `${(item.level - 1) * 16}px` }}
                onClick={() => onSelectOutlineItem(item)}
              >
                <span className={`outline-list__marker outline-list__marker--h${item.level}`}>
                  {"#".repeat(item.level)}
                </span>
                <span className="outline-list__text">{item.text}</span>
                <span className="outline-list__line">{item.line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="outline-stats">
        <div className="outline-stats__item">
          <span className="outline-stats__label">字符</span>
          <span className="outline-stats__value">{stats?.charCount ?? 0}</span>
        </div>
        <div className="outline-stats__item">
          <span className="outline-stats__label">词数</span>
          <span className="outline-stats__value">{stats?.wordCount ?? 0}</span>
        </div>
        <div className="outline-stats__item">
          <span className="outline-stats__label">行数</span>
          <span className="outline-stats__value">{stats?.lineCount ?? 0}</span>
        </div>
        <div className="outline-stats__item">
          <span className="outline-stats__label">标题</span>
          <span className="outline-stats__value">{stats?.headingCount ?? 0}</span>
        </div>
      </footer>
    </div>
  );
}
