# FormatX

> **🌐 Live demo:** [vlad-demchyk.github.io/FormatX](https://vlad-demchyk.github.io/FormatX/)

Ваш контент — у досконалому порядку.

Веб-додаток (PWA) на React 19 + Vite 6 + TypeScript для конвертації та обробки файлів.

## Початок роботи

```bash
npm install
npm run dev       # http://localhost:1420
npm run build     # → dist
npm run test
```

## CI/CD

- **GitHub Pages** — автоматичний деплой при пуші в `main`

## Features

| Модуль |          |
|--------|:--------:|
| 📷 Photo — convert, batch ZIP, metadata cleanup, resize+crop | ✅ |
| 📄 Documents — PDF/DOCX/MD/XLS, PDF→SVG, sign documents | ✅ |
| ✏️ Text — sanitize, format, classes→CSS, dual mode | ✅ |
| 📋 Clipboard — history, pinned items (text/images/docs) | ✅ |
| 👤 Account — theme, locale, history, AI Assistant, SVG cleaner | ✅ |

- **i18n:** uk, it, en (react-i18next)
- **Storage:** SQL.js + IndexedDB (Dexie)
- **Documents:** pdf-lib, pdf.js, mammoth, marked, xlsx, docx, pdf-into-svg, LibreOffice WASM
- **Images:** heic-to (WASM), jszip, exifr, pica, svgo (lazy-loaded)
- **Sign:** signature_pad, pdf-lib, LibreOffice WASM

## Project Structure

```
src/
  main.tsx              # React entry
  app/                  # Shell, routing, providers, i18n
  components/           # ShellLayout, TabBar, ErrorBoundary
  features/
    text/               # Text sanitizer (React + dual mode)
    photo/              # Image converter + metadata + resize (React)
    documents/          # Document converter (pdf, docx, md, xlsx...)
    clipboard/          # Clipboard history + pinned storage
    account/            # Settings, history, AI Assistant
    support/            # Support page
    sanitizer/          # Pure logic: sanitize, format, classes
    images/             # Pure logic: convert, detect, zip
  lib/
    storage/            # SQL.js storage + Dexie
    workers/            # Web Worker pool + SVG converter
    animation/          # AnimationController
    download.ts, clipboard.ts, logger.ts, notifications.ts
  locales/              # en.json, it.json, uk.json
  styles/               # CSS design tokens (light/dark)
```

## Locales

`uk`, `it`, `en` — files in `src/locales/`.

## Brand

- Primary: `#4F46E5` (light) / `#6366F1` (dark accent)
- Package id: `dev.formatx.app`

## Documentation

| Language | Directory |
|----------|-----------|
| 🇺🇦 Українська | [docs/uk/](docs/uk/) |
| 🇬🇧 English | [docs/](docs/) — research & migration docs |

### Ukrainian docs (`docs/uk/`)

| Документ | Опис |
|----------|------|
| [README.md](docs/uk/README.md) | Головна документація |
| [ARCHITECTURE.md](docs/uk/ARCHITECTURE.md) | Архітектура проекту |
| [FEATURES.md](docs/uk/FEATURES.md) | Опис модулів та функцій |
| [LIBRARIES.md](docs/uk/LIBRARIES.md) | Бібліотеки та залежності |
| [STORAGE.md](docs/uk/STORAGE.md) | Система зберігання даних |
| [CONVERTER.md](docs/uk/CONVERTER.md) | Конвертація документів |
| [IMAGE_CONVERTER.md](docs/uk/IMAGE_CONVERTER.md) | Конвертація зображень |
| [SANITIZER.md](docs/uk/SANITIZER.md) | Текстовий санітайзер |
| [I18N.md](docs/uk/I18N.md) | Інтернаціоналізація |
| [STYLES.md](docs/uk/STYLES.md) | Дизайн-система та CSS |
| [HOOKS.md](docs/uk/HOOKS.md) | React хуки та утиліти |
| [PWA.md](docs/uk/PWA.md) | PWA та деплой |
| [SIGN_SECTION.md](docs/uk/SIGN_SECTION.md) | Секція підпису документів |
| [GLOSSARY.md](docs/uk/GLOSSARY.md) | Глосарій термінів |
| [ANIMATION.md](docs/uk/ANIMATION.md) | Система анімації |

### Research & migration docs

| Topic | File |
|-------|------|
| Documents module (formats, engines, architecture) | [docs/documents-module-research.md](docs/documents-module-research.md) |
| Migration vanilla TS → React | [docs/migration-to-react.md](docs/migration-to-react.md) |

## License

MIT
