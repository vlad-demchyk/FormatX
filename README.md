# FormatX

> **🌐 Live demo:** [vlad-demchyk.github.io/FormatX](https://vlad-demchyk.github.io/FormatX/)

Local toolkit for text, images, and document conversion (PWA + Tauri desktop).

**Tagline:** Your content — in perfect order.

## Features

| Module | What it does |
|--------|-------------|
| **📷 Photo** | Convert images (HEIC via bundled `heic-to`), batch ZIP download |
| **📄 Documents** | PDF, DOCX, Markdown, Excel conversion — preview, merge/split, extract text |
| **✏️ Text** | Sanitize strings, classes→CSS, last 10 snippets history |
| **📋 Clipboard** | Monitors Ctrl+C, stores last 20 items, OS notifications + toast |
| **👤 Account** | Settings (theme, locale), image history (3-day TTL), tray/notification toggles |

## Prerequisites

- Node.js 20+
- Rust (rustup) + MSVC Build Tools (Windows) for Tauri desktop builds
- WebView2 Runtime (Windows)

## Commands

```bash
npm install
npm run dev          # Web UI at http://localhost:1420
npm run build        # Production web build
npm run test         # Vitest (sanitizer logic)
npm run tauri dev    # Desktop app (requires Rust)
npm run tauri build  # Windows .exe in src-tauri/target/release/bundle/
```

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite 6
- **Desktop:** Tauri 2 (Windows .exe with close-to-tray)
- **PWA:** Installable via browser (service worker caching)
- **i18n:** uk, it, en (react-i18next)
- **Storage:** SQL.js (web) / Tauri SQLite (desktop)
- **Documents:** pdf-lib, pdf.js, mammoth, marked, xlsx, docx
- **Images:** heic-to (WASM), jszip

## Project Structure

```
src/
  main.tsx              # React entry
  app/                  # Shell, routing, providers, i18n
  components/           # ShellLayout, TabBar, ErrorBoundary
  features/
    text/               # Text sanitizer (React)
    photo/              # Image converter (React + heic-to)
    documents/          # Document converter (pdf, docx, md, xlsx...)
    clipboard/          # Clipboard history (20 items, OS notifications)
    account/            # Settings, history
  lib/
    storage/            # Dual backend: SQL.js / Tauri SQLite
    notifications.ts    # OS notifications (Tauri + Browser API)
  locales/              # en.json, it.json, uk.json
  styles/               # CSS design tokens (light/dark)
```

## Locales

`uk`, `it`, `en` — files in `src/locales/`.

## Brand

- Primary: `#4F46E5` (light) / `#6366F1` (dark accent)
- Package id: `dev.formatx.app`

## Documentation

| Topic | File |
|-------|------|
| Documents module (formats, engines, architecture) | [docs/documents-module-research.md](docs/documents-module-research.md) |
| Migration vanilla TS → React | [docs/migration-to-react.md](docs/migration-to-react.md) |

## License

MIT
