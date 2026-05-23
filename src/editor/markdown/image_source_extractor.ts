/**
 * 模块职责：从 Markdown 文本中提取图片路径，仅依赖 markdown-it 核心解析器。
 * 输入：Markdown 字符串。
 * 输出：图片 src 数组 / 不安全图片源计数。
 * 风险点：不加载 KaTeX/highlight.js/Mermaid 等渲染插件，仅做 token 解析。
 */
import MarkdownIt from "markdown-it";

const imageMd = new MarkdownIt({ html: false, linkify: false, typographer: false });

/**
 * 从 Markdown 中提取所有本地图片路径。
 * 跳过了 http/data/blob/localhost 等非本地源。
 */
export function extractMarkdownImageSources(content: string): string[] {
  const tokens = imageMd.parse(content, {});
  const sources: string[] = [];
  for (const token of tokens) {
    if (token.type === "inline") {
      for (const child of token.children ?? []) {
        if (child.type === "image") {
          const src = child.attrGet("src");
          if (
            src &&
            !/^(https?:|data:|asset:|ipc:|blob:)/i.test(src) &&
            !src.includes("asset.localhost")
          ) {
            sources.push(src);
          }
        }
      }
    }
  }
  return [...new Set(sources)];
}

/**
 * 检测 Markdown 中是否存在不安全图片源（blob/data/localhost/绝对路径）。
 * 返回不安全源的数量，0 表示安全。
 */
export function detectUnsafeImageSources(markdown: string): number {
  const sources = extractMarkdownImageSources(markdown);
  let count = 0;
  for (const src of sources) {
    if (
      /^blob:/i.test(src) ||
      /^data:/i.test(src) ||
      /localhost:\d+/.test(src) ||
      src.includes("asset.localhost") ||
      /^[a-zA-Z]:[/\\]/.test(src) ||
      src.startsWith("/")
    ) {
      console.warn("[IMAGE_GUARD] unsafe image source detected", { src: src.slice(0, 80) });
      count++;
    }
  }
  return count;
}
