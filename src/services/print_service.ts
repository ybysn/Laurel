/**
 * 模块职责：打印服务，复用 HTML 导出渲染链路。
 * 输入：Markdown 内容、当前文件路径、文件名。
 * 输出：打开系统打印对话框。
 */
import { buildPrintableHtml } from "./export_service";

export interface PrintOptions {
  content: string;
  currentPath?: string | null;
  fileName?: string | null;
}

/** 等待文档内所有图片加载完成或超时 */
function waitForImages(doc: Document, timeoutMs = 3000): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();

  let pending = images.length;
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => resolve(), timeoutMs);
    for (const img of images) {
      if (img.complete) {
        pending--;
        if (pending === 0) { clearTimeout(timer); resolve(); }
        continue;
      }
      const done = () => {
        pending--;
        if (pending === 0) { clearTimeout(timer); resolve(); }
      };
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  });
}

export async function printMarkdownDocument(options: PrintOptions): Promise<void> {
  const html = await buildPrintableHtml(options);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();

  await waitForImages(doc);
  iframe.contentWindow!.print();

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 500);
}
