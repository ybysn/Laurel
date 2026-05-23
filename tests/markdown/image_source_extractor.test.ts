import { describe, it, expect } from "vitest";
import { extractMarkdownImageSources, detectUnsafeImageSources } from "../../src/editor/markdown/image_source_extractor";

describe("extractMarkdownImageSources", () => {
  it("提取单个本地图片 src", () => {
    const result = extractMarkdownImageSources("![alt](./a.png)");
    expect(result).toEqual(["./a.png"]);
  });

  it("提取多张图片 src", () => {
    const result = extractMarkdownImageSources("![a](./a.png)\n![b](./b.jpg)");
    expect(result).toEqual(["./a.png", "./b.jpg"]);
  });

  it("代码块内的图片语法不被识别", () => {
    const result = extractMarkdownImageSources("```md\n![fake](fake.png)\n```");
    expect(result).toEqual([]);
  });

  it("空 src 不返回", () => {
    const result = extractMarkdownImageSources("![empty]()");
    expect(result).toEqual([]);
  });

  it("重复 src 去重", () => {
    const result = extractMarkdownImageSources("![a](./x.png)\n![b](./x.png)");
    expect(result).toEqual(["./x.png"]);
  });

  it("http/https 外链跳过", () => {
    const result = extractMarkdownImageSources("![web](https://example.com/a.png)");
    expect(result).toEqual([]);
  });

  it("data URI 跳过", () => {
    const result = extractMarkdownImageSources("![img](data:image/png;base64,abc)");
    expect(result).toEqual([]);
  });

  it("相对路径和远程图片混合", () => {
    const result = extractMarkdownImageSources(
      "![local](./a.png)\n![remote](https://x.com/b.png)\n![local2](./c.jpg)"
    );
    expect(result).toEqual(["./a.png", "./c.jpg"]);
  });
});

describe("detectUnsafeImageSources", () => {
  it("安全路径返回 0", () => {
    const result = detectUnsafeImageSources("![a](./a.png)");
    expect(result).toBe(0);
  });

  it("blob URL 在提取阶段已被过滤，不进入 detect", () => {
    // extractMarkdownImageSources 在提取时已跳过 blob: 前缀，
    // 因此 detectUnsafeImageSources 收到的 sources 不含 blob。
    const result = detectUnsafeImageSources("![a](blob:http://localhost/a.png)");
    expect(result).toBe(0);
  });

  it("data URL 在提取阶段已被过滤", () => {
    const result = detectUnsafeImageSources("![a](data:image/png;base64,abc)");
    expect(result).toBe(0);
  });

  it("绝对路径被提取后计为不安全", () => {
    // 使用正斜线路径以便 markdown-it 正确解析
    const result = detectUnsafeImageSources("![a](C:/path/to/a.png)");
    expect(result).toBe(1);
  });
});
