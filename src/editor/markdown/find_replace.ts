/**
 * 模块职责：当前文档内查找/替换纯函数。
 * 输入：文档内容、查询字符串、替换文本、选项。
 * 输出：查找匹配列表、替换后的新内容。
 */

export interface FindMatch {
  start: number;
  end: number;
  text: string;
}

export interface FindOptions {
  caseSensitive: boolean;
}

export interface ReplaceAllResult {
  content: string;
  count: number;
}

/** 在 content 中查找所有 query 匹配位置 */
export function findMatches(
  content: string,
  query: string,
  options: FindOptions,
): FindMatch[] {
  if (!query) return [];

  const matches: FindMatch[] = [];
  const source = options.caseSensitive ? content : content.toLowerCase();
  const target = options.caseSensitive ? query : query.toLowerCase();

  let pos = 0;
  while (pos < source.length) {
    const idx = source.indexOf(target, pos);
    if (idx === -1) break;
    matches.push({ start: idx, end: idx + target.length, text: content.slice(idx, idx + target.length) });
    pos = idx + target.length;
  }

  return matches;
}

/** 替换单个匹配，返回新内容和新光标位置 */
export function replaceCurrentMatch(
  content: string,
  match: FindMatch,
  replaceText: string,
): { content: string; cursorPos: number } {
  const newContent =
    content.slice(0, match.start) + replaceText + content.slice(match.end);
  return {
    content: newContent,
    cursorPos: match.start + replaceText.length,
  };
}

/** 替换所有匹配 */
export function replaceAllMatches(
  content: string,
  query: string,
  replaceText: string,
  options: FindOptions,
): ReplaceAllResult {
  const matches = findMatches(content, query, options);
  if (matches.length === 0) return { content, count: 0 };

  // 从后往前替换，避免索引偏移
  let result = content;
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    result = result.slice(0, m.start) + replaceText + result.slice(m.end);
  }

  return { content: result, count: matches.length };
}
