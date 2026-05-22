/**
 * 模块职责：从 Markdown 文本中提取 ATX 标题，生成大纲条目列表。
 * 输入：Markdown 原始文本。
 * 输出：MarkdownOutlineItem 数组，包含标题层级、文本、行号。
 * 解析边界：
 *   - 只识别 ATX 标题（# 开头），不处理 Setext 标题。
 *   - 必须 # 后有空格才算标题（"# 标题" 有效，"#标题" 不识别）。
 *   - 行首允许 0-3 个空格缩进。
 *   - 忽略 fenced code block 内的伪标题。
 *   - 去掉末尾 closing hashes（"## 标题 ##" → "标题"）。
 * 为什么要忽略代码块内标题：
 *   代码块中的 "#" 行可能是注释或示例，不应出现在大纲中，
 *   否则会导致用户混淆和大纲跳转错误。
 */

export interface MarkdownOutlineItem {
  /** 唯一标识 */
  id: string;
  /** 标题级别 1-6 */
  level: number;
  /** 标题文本，已去除 # 前缀和末尾 closing hashes */
  text: string;
  /** 在原文中的 1-based 行号 */
  line: number;
  /** 原始行文本，保留用于调试 */
  raw: string;
}

/**
 * 解析 Markdown 文本中的 ATX 标题，返回大纲条目列表。
 * 会自动跳过 fenced code block 内的内容，避免代码块中的
 * 注释行被误识别为标题。
 */
export function parseMarkdownOutline(content: string): MarkdownOutlineItem[] {
  const lines = content.split("\n");
  const items: MarkdownOutlineItem[] = [];
  let inCodeBlock = false;
  let codeBlockFence = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    // 跳过纯空白行开头引出的 fence 判断错误 — 只检查 trimmed
    const trimmed = rawLine.trimStart();

    // 检测 fenced code block 边界（三反引号或三波浪号）
    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockFence = fenceMatch[1];
        continue;
      }
      // 同一类型的 fence 结束代码块
      if (fenceMatch[1] === codeBlockFence) {
        inCodeBlock = false;
        codeBlockFence = "";
        continue;
      }
      // 不同类型 fence 当作代码块内容，不改变状态
    }

    // 处于代码块内时跳过所有行
    if (inCodeBlock) continue;

    // 匹配 ATX 标题：行首最多 3 空格 + 1-6 个 # + 空格 + 文本
    const headingMatch = rawLine.match(/^ {0,3}(#{1,6}) (.+)$/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    // 去掉末尾的 closing hashes 和空白
    let text = headingMatch[2].replace(/\s*#+\s*$/, "").trim();

    // 空标题不加入大纲（去除 closing hashes 后可能为空）
    if (text === "") continue;

    items.push({
      id: `heading-${i}`,
      level,
      text,
      line: i + 1,
      raw: rawLine,
    });
  }

  return items;
}
