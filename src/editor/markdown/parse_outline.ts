/**
 * 模块职责：从 Markdown 文本中提取 ATX 标题，生成大纲条目列表。
 * 输入：Markdown 原始文本。
 * 输出：MarkdownOutlineItem 数组，text 字段为清洗后的纯文本。
 */
export interface MarkdownOutlineItem {
  id: string;
  level: number;
  text: string;
  line: number;
  raw: string;
}

/**
 * 清洗标题文本，去除 Markdown 行内语法标记。
 * - 去除 **bold** / __bold__ → bold
 * - 去除 *italic* / _italic_ → italic
 * - 去除 `code` → code
 * - 去除 [text](url) → text
 * - 去除 ![alt](url) → alt
 * - 去除 ~~strike~~ → strike
 * - 去除 HTML 标签
 * - 去除剩余 * / _ / ` 字符
 */
function cleanMarkdownHeadingText(text: string): string {
  let cleaned = text;

  // 图片 ![alt](url) → alt
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // 链接 [text](url) → text
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // 粗体 **text** 或 __text__
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  // 斜体 *text* 或 _text_
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
  // 删除线 ~~text~~
  cleaned = cleaned.replace(/~~([^~]+)~~/g, "$1");
  // 行内代码 `text`
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  // HTML 标签
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  // 残留的标记符号
  cleaned = cleaned.replace(/[*_`~]/g, "");
  // 多余空白
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

export function parseMarkdownOutline(content: string): MarkdownOutlineItem[] {
  const lines = content.split("\n");
  const items: MarkdownOutlineItem[] = [];
  let inCodeBlock = false;
  let codeBlockFence = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trimStart();

    const fenceMatch = trimmed.match(/^(```|~~~)/);
    if (fenceMatch) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockFence = fenceMatch[1];
        continue;
      }
      if (fenceMatch[1] === codeBlockFence) {
        inCodeBlock = false;
        codeBlockFence = "";
        continue;
      }
    }

    if (inCodeBlock) continue;

    const headingMatch = rawLine.match(/^ {0,3}(#{1,6}) (.+)$/);
    if (!headingMatch) continue;

    const level = headingMatch[1].length;
    let rawText = headingMatch[2].replace(/\s*#+\s*$/, "").trim();
    if (rawText === "") continue;

    const text = cleanMarkdownHeadingText(rawText);
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
