# Code Syntax Highlighting Test Cases

## 1. TypeScript

```ts
const message: string = "hello";
console.log(message);

interface Person {
  name: string;
  age: number;
}

const person: Person = { name: "Alice", age: 30 };
```

## 2. Python

```python
def fib(n: int) -> int:
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(10))
```

## 3. Rust

```rust
fn main() {
    let greeting = String::from("你好世界");
    println!("{}", greeting);

    for i in 0..5 {
        println!("Number: {}", i);
    }
}
```

## 4. Bash

```bash
#!/bin/bash
echo "Hello from bash"
for f in *.md; do
    echo "Processing $f"
done
```

## 5. JSON

```json
{
  "name": "markdown-editor",
  "version": "0.1.0",
  "dependencies": {
    "highlight.js": "11.x",
    "markdown-it": "14.x"
  }
}
```

## 6. 未指定语言

```
This block has no language identifier.
It should still be rendered in monospace.
But no syntax highlighting applied.
```

## 7. 不支持的语言

```brainfuck
++++++++++[>+++++++>++++++++++>+++>+<<<<-]
>++.>+.+++++++..+++.>++.<<+++++++++++++++.
```

## 8. 包含 HTML 标签的代码块（验证不会执行）

```html
<script>alert("XSS test — should not execute!")</script>
<div class="safe-content">This is just displayed, not executed</div>
```

```ts
const x = "<script>alert(1)</script>";
// This string literal should be highlighted but not executed
console.log(x);
```
