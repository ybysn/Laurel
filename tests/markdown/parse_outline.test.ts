import { describe, it, expect } from "vitest";
import { parseMarkdownOutline } from "../../src/editor/markdown/parse_outline";

describe("parseMarkdownOutline", () => {
  it("提取 h1-h3 标题", () => {
    const result = parseMarkdownOutline(
      "# 一级标题\n\n## 二级标题\n\n### 三级标题"
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ level: 1, text: "一级标题" });
    expect(result[1]).toMatchObject({ level: 2, text: "二级标题" });
    expect(result[2]).toMatchObject({ level: 3, text: "三级标题" });
  });

  it("代码块内的 # 不被识别为标题", () => {
    const result = parseMarkdownOutline(
      "# 真实标题\n\n```\n# 这不是标题\n```\n\n## 另一个标题"
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ level: 1, text: "真实标题" });
    expect(result[1]).toMatchObject({ level: 2, text: "另一个标题" });
  });

  it("中文标题可识别", () => {
    const result = parseMarkdownOutline("# 你好世界\n\n## 中文标题测试");
    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("你好世界");
    expect(result[1].text).toBe("中文标题测试");
  });

  it("六级标题全支持", () => {
    const result = parseMarkdownOutline(
      "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6"
    );
    expect(result).toHaveLength(6);
    expect(result.map((r) => r.level)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("空文档返回空数组", () => {
    const result = parseMarkdownOutline("");
    expect(result).toEqual([]);
  });

  it("无标题的文档返回空数组", () => {
    const result = parseMarkdownOutline("这是普通段落。\n\n没有标题。");
    expect(result).toEqual([]);
  });

  it("line 字段正确记录行号", () => {
    const result = parseMarkdownOutline("第一行\n# 标题\n第三行");
    expect(result).toHaveLength(1);
    expect(result[0].line).toBe(2);
  });

  it("标题内行内标记被清洗", () => {
    const result = parseMarkdownOutline("# **加粗** 和 *斜体* 和 `代码`");
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("加粗 和 斜体 和 代码");
  });
});
