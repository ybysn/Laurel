# Laurel — 现代 Markdown 桌面编辑器

> 本地优先、所见即所得的 Markdown 编辑器。基于 Tauri 2 + Milkdown，支持 Windows / macOS / Linux。无需云、无需注册，你的文件始终留在本地。

[English](./README.md) | 中文

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/ybysn/Laurel/actions/workflows/ci.yml/badge.svg)](https://github.com/ybysn/Laurel/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/ybysn/Laurel)](https://github.com/ybysn/Laurel/releases)

## 为什么选 Laurel？

市面上大多数 Markdown 编辑器要么是 Electron 套壳、吃内存，要么是网页版、必须联网。**Laurel 不一样：** 基于 Rust 驱动的 Tauri 2，轻量、离线、原生跨平台。

- **本地优先** — 文件存在你的硬盘上，数据不外泄
- **所见即所得** — 编辑器展示的样子就是保存的最终效果
- **无账号** — 不需要注册、不需要云同步、不收集任何数据
- **全平台** — 一套安装包覆盖 Windows、macOS、Linux

## 亮点

| 类别 | 说明 |
|------|------|
| ✍️ **编辑** | Milkdown Crepe 所见即所得编辑器，支持三种视图模式（写作/分屏/源码） |
| 📁 **文件** | 打开任意 .md，工作区文件夹管理，图片自动整理到 .assets 目录 |
| 🎨 **渲染** | 代码高亮（highlight.js）、数学公式（KaTeX）、图表（Mermaid） |
| 🧭 **导航** | 大纲侧边栏、快速打开（Ctrl+P）、命令面板（Ctrl+Shift+P） |
| 🌗 **主题** | 亮色/暗色模式，参考 Notion 设计系统 |
| 📤 **导出** | HTML、PDF（Chromium 无头打印）、浏览器打印 |
| 🔒 **安全** | 路径沙箱 — 删除和重命名操作限定在工作区内 |

## 快速开始

```bash
# 前置环境: Node.js >= 18, pnpm >= 9, Rust (rustup)
# Linux 额外依赖: sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

pnpm install
pnpm tauri dev
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2 (Rust) |
| 前端 | React 19 + TypeScript + Vite |
| 编辑器引擎 | Milkdown Crepe (WYSIWYG) / ProseMirror |
| Markdown 渲染 | markdown-it、highlight.js、KaTeX、Mermaid |
| 包管理 | pnpm |

## 功能清单

### 编辑
- 三种视图：写作模式（所见即所得）、分屏（编辑+预览）、源码（原始 Markdown）
- 完整 Markdown 语法支持，实时渲染
- 数学公式（KaTeX）和 Mermaid 图表
- 查找替换（支持大小写）
- 自动保存（可配置延迟）

### 文件管理
- 打开 / 保存 / 新建 Markdown 文件
- 工作区模式：扫描文件夹，文件树侧边栏
- 图片处理：拖拽、粘贴、文件选择 → 自动复制到 `.assets` 目录
- 最近文件记录

### 工作区
- 文件树支持新建 / 重命名 / 删除
- 保护机制：禁止操作 `.git`、`node_modules`、系统目录
- 路径沙箱：删除和重命名强制限定在工作区根目录内

### 导出
- HTML 导出（独立、带样式）
- PDF 导出（Chromium 无头打印，无弹窗）
- 浏览器打印

### 界面与交互
- 亮色/暗色主题，参考 Notion 设计 token
- 命令面板（Ctrl+Shift+P）
- 快速打开文件（Ctrl+P）
- 专注模式 / 全屏
- 大纲侧边栏，支持标题跳转

## 项目状态

**v0.1.0 — 首个发布版**。日常写作可用，持续维护中。

- ✅ 核心编辑（所见即所得 / 分屏 / 源码）
- ✅ 文件打开 / 保存 / 工作区管理
- ✅ 图片资产管理
- ✅ 大纲导航
- ✅ HTML / PDF 导出
- ✅ CI/CD 流水线
- ✅ 126 个测试

更多计划见 [Issues](https://github.com/ybysn/Laurel/issues)。

## 关键词

`markdown-editor` `wysiwyg` `tauri` `react` `desktop-app` `local-first` `markdown` `rust` `开源` `milkdown` `本地Markdown编辑器`

## 许可证

MIT © [ybysn](https://github.com/ybysn)
