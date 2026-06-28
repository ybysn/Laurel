# Laurel — A Modern Markdown Editor for Desktop

> 本地优先、所见即所得的 Markdown 桌面编辑器。基于 Tauri 2 + Milkdown 构建，支持 Windows / macOS / Linux。

A local-first WYSIWYG Markdown editor built with Tauri 2 and Milkdown. Write, preview, and export — no cloud, no accounts, just your files.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CI](https://github.com/ybysn/Laurel/actions/workflows/ci.yml/badge.svg)](https://github.com/ybysn/Laurel/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/ybysn/Laurel)](https://github.com/ybysn/Laurel/releases)

## Why Laurel?

Most Markdown editors are either Electron apps that eat RAM, or web-only tools that require an internet connection. **Laurel is different:** a lightweight, offline-first desktop app built on Tauri 2 — fast, private, and native on every platform.

- **Local-first** — your files stay on your disk, nothing leaves your machine
- **WYSIWYG** — what you see is exactly what gets saved
- **No accounts** — no sign-up, no cloud sync, no tracking
- **Cross-platform** — single installer for Windows, macOS, and Linux

## Highlights

| Category | Details |
|----------|---------|
| ✍️ **Editor** | Milkdown Crepe — WYSIWYG with ProseMirror, three view modes (write / split / source) |
| 📁 **Files** | Open any .md, workspace folder management, image asset auto-organization |
| 🎨 **Rendering** | Code highlighting (highlight.js), math (KaTeX), diagrams (Mermaid) |
| 🧭 **Navigation** | Outline sidebar, quick-open (Ctrl+P), command palette (Ctrl+Shift+P) |
| 🌗 **Theme** | Light/dark mode, configurable fonts |
| 📤 **Export** | HTML, PDF (via Chromium headless), print |
| 🔒 **Safety** | Path sandbox — delete & rename restricted to workspace boundaries |

## Quick Start

```bash
# Prerequisites: Node.js >= 18, pnpm >= 9, Rust (rustup)
# Linux only: sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

pnpm install
pnpm tauri dev
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript + Vite |
| Editor engine | Milkdown Crepe (WYSIWYG) / ProseMirror |
| Markdown | markdown-it, highlight.js, KaTeX, Mermaid |
| Package manager | pnpm |

## Features

### Editing
- Three views: WYSIWYG (writing mode), split (edit + preview), source (raw Markdown)
- Full Markdown syntax support with live rendering
- Math formulas (KaTeX) and Mermaid diagram rendering
- Find & replace (case-sensitive)
- Auto-save with configurable delay

### File Management
- Open / save / new Markdown files
- Workspace mode: scan a folder, file tree sidebar
- Image handling: drag-drop, paste, file pick → auto-copied to `.assets` folder
- Recent files tracking

### Workspace
- File tree with create / rename / delete operations
- Protection: blocks operations on `.git`, `node_modules`, system directories
- Path sandbox: delete and rename enforced within workspace root

### Export
- HTML export (standalone, styled)
- PDF export (Chromium headless, no print dialog)
- Browser print support

### UI/UX
- Dark/light theme with Notion-inspired design tokens
- Command palette (Ctrl+Shift+P)
- Quick file open (Ctrl+P)
- Focus mode / fullscreen
- Outline sidebar with heading navigation

## Project Status

**v0.1.0 — First release**. Stable for daily writing. Actively maintained.

- ✅ Core editing (WYSIWYG / split / source)
- ✅ File open / save / manage workspace
- ✅ Image assets
- ✅ Outline navigation
- ✅ HTML / PDF export
- ✅ CI/CD pipeline
- ✅ 126 tests

See [open issues](https://github.com/ybysn/Laurel/issues) for planned features.

## Keywords

`markdown-editor` `wysiwyg` `tauri` `react` `desktop-app` `local-first` `markdown` `rust` `open-source` `milkdown`

## License

MIT © [ybysn](https://github.com/ybysn)
