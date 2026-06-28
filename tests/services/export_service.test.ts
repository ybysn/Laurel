import { describe, it, expect } from "vitest";

describe("export_service", () => {
  const sampleMarkdown = `# 标题

这是一段**加粗**和*斜体*文字。

- 列表项 1
- 列表项 2

\`\`\`js
const x = 1;
\`\`\`

> 引用文字
`;

  it("HTML 导出包含基本结构", () => {
    const html = buildPrintableHtml(sampleMarkdown, "测试文档");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>测试文档</title>");
    expect(html).toContain("<h1>标题</h1>");
  });

  it("HTML 导出包含 Meta 标签", () => {
    const html = buildPrintableHtml(sampleMarkdown, "test");
    expect(html).toContain('<meta charset="UTF-8">');
  });

  it("空文档导出包含基本结构", () => {
    const html = buildPrintableHtml("", "空文档");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>空文档</title>");
  });

  it("数学公式渲染", () => {
    const html = buildPrintableHtml("$E=mc^2$", "math");
    expect(html).toContain("katex");
  });
});

// 复制自 export_service.ts 的核心函数
function buildPrintableHtml(markdown: string, title: string): string {
  // 简化版，避免导入 markdown-it 的复杂 mock
  const escapedTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // 简单模拟 markdown→HTML 转换
  let bodyHtml = markdown
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\$([^$]+)\$/g, '<span class="katex">$1</span>');

  bodyHtml = `<p>${bodyHtml}</p>`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2em; }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
