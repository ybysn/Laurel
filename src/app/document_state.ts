/**
 * 模块职责：文档状态类型定义与统计计算，描述当前编辑文档的核心状态。
 * 当前：类型定义 + 统计函数，在 AppShell 中使用 React useState 管理。
 * 后续扩展点：可能提取为自定义 hook 或 context，加入保存状态、错误状态等。
 */

export interface DocumentState {
  /** 当前文件的绝对路径，新文档为 null */
  currentPath: string | null;
  /** 文件名（含扩展名），新文档显示"未命名文档" */
  fileName: string;
  /** 编辑器中当前 Markdown 文本内容 */
  content: string;
  /** 自上次保存以来是否有未保存的修改 */
  isDirty: boolean;
  /** 是否已进入编辑状态（已打开文件或已新建文档） */
  isEditing: boolean;
}

export interface DocumentStats {
  /** 字符数（含空格和换行） */
  charCount: number;
  /** 行数（空内容时为 0） */
  lineCount: number;
  /** 粗略词数（CJK 单字 + 连续拉丁字母/数字） */
  wordCount: number;
  /** 有效标题数（排除代码块内标题） */
  headingCount: number;
}

export function createEmptyDocument(): DocumentState {
  return {
    currentPath: null,
    fileName: "未命名文档",
    content: "",
    isDirty: false,
    isEditing: false,
  };
}

/**
 * 计算文档基础统计（字符数、行数、词数）。
 * headingCount 由调用方传入（来自 parseMarkdownOutline 的结果），
 * 避免重复解析。
 */
export function getDocumentStats(
  content: string,
  headingCount: number,
): DocumentStats {
  const lineCount = content ? content.split("\n").length : 0;

  // 词数：CJK 统一汉字按单字计数，拉丁字母/数字序列按一个词计数
  const wordMatches =
    content.match(/[\u4e00-\u9fff\uff00-\uffef]|[a-zA-Z0-9]+/g) ?? [];
  const wordCount = wordMatches.length;

  return {
    charCount: content.length,
    lineCount,
    wordCount,
    headingCount,
  };
}
