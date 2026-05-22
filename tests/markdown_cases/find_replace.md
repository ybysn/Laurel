# Find & Replace Test

## 标题测试

这是一段包含重复文字的段落。测试测试测试。
Find the word "test" in this paragraph. Test should match.
TestCase should also match because default is case-insensitive.

## Markdown Syntax

The **bold** text and *italic* text.

## Code Block

```typescript
function test() {
  return "test";
}
```

Code block中的 test 也应该能被 CtrL+F 找到，但本阶段不排除代码块。

## Chinese Test

中文查找测试：这是查找目标。
另一个查找目标是"替换"这个词。
查找和替换功能是编辑器的基础功能。
