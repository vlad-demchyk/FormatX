# FormatX

Local toolkit for text sanitization and image conversion (PWA + Tauri desktop).

**Tagline:** Your content — in perfect order.

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

## MVP features

- **Text** — sanitize strings, classes → CSS, last 10 snippets
- **Photo** — convert images (HEIC via bundled `heic-to`), batch ZIP
- **Account** — settings (theme, locale), image history (3-day TTL)
- **Documents** — placeholder (v1)

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

Obsidian (Formattick vault): `MyProject/Formattick/docs/` — Ukrainian summaries with links to the repo.
