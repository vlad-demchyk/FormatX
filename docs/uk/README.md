# FormatX — Повна документація

> **FormatX** — це PWA (Progressive Web App) на React 19 + Vite 6 + TypeScript для конвертації та обробки файлів. Працює повністю локально в браузері, без завантажень на сервер.

**🌐 Live demo:** [vlad-demchyk.github.io/FormatX](https://vlad-demchyk.github.io/FormatX/)

---

## Зміст документації

| Розділ | Опис |
|--------|------|
| [Архітектура проекту](ARCHITECTURE.md) | Загальна архітектура, компонування, провайдери |
| [Модулі та функції](FEATURES.md) | Детальний опис всіх модулів |
| [Бібліотеки та залежності](LIBRARIES.md) | Список бібліотек, їх призначення та версії |
| [Система зберігання даних](STORAGE.md) | SQL.js, localStorage, схема даних |
| [Система конвертації документів](CONVERTER.md) | Архітектура адаптерів, формати, Edge-граф |
| [Система конвертації зображень](IMAGE_CONVERTER.md) | HEIC, SVG, Web Workers |
| [Текстовий санітайзер](SANITIZER.md) | Режими роботи, форматування, CSS-селектори |
| [Інтернаціоналізація (i18n)](I18N.md) | Підтримка мов, структура перекладів |
| [Дизайн-система та CSS](STYLES.md) | Токени, теми, компоненти |
| [Хуки та утиліти](HOOKS.md) | React хуки, допоміжні функції |
| [PWA та деплой](PWA.md) | PWA конфігурація, GitHub Pages, CI/CD |
| [Міграція](MIGRATION.md) | Історія міграції vanilla TS → React |
| [Глосарій](GLOSSARY.md) | Терміни та визначення |

---

## Швидкий старт

```bash
npm install
npm run dev       # → http://localhost:1420
npm run build     # → dist/
npm run test      # → Vitest
```

## Команди

| Команда | Опис |
|---------|------|
| `npm run dev` | Запуск сервера розробки (Vite, порт 1420) |
| `npm run build` | TypeScript компіляція + Vite build |
| `npm run preview` | Попередній перегляд збірки |
| `npm run test` | Запуск тестів (Vitest) |

## Структура проекту

```
src/
├── main.tsx                        # Точка входу React
├── app/
│   ├── App.tsx                     # Кореневий компонент
│   ├── confirm.ts                  # Кастомний confirm dialog
│   ├── i18n.ts                     # i18n ініціалізація
│   ├── icons.ts                    # Іконки навігації (themed SVG)
│   ├── logo.ts                     # SVG логотип
│   ├── toast.ts                    # Toast сповіщення
│   ├── hooks/
│   │   ├── useAppRoute.ts          # Маршрутизація через hash
│   │   ├── useHotkey.ts            # Глобальні гарячі клавіші
│   │   └── useIsTauri.ts           # Tauri детекція
│   └── providers/
│       ├── StorageProvider.tsx      # SQL.js контекст
│       ├── I18nProvider.tsx         # i18next провайдер
│       └── ThemeProvider.tsx        # Тема (light/dark)
├── components/
│   ├── BootError.tsx               # Екран помилки завантаження
│   ├── ErrorBoundary.tsx           # React Error Boundary
│   ├── PreviewModal.tsx            # Модальне вікно попереднього перегляду
│   ├── ShellLayout.tsx             # Головний layout
│   └── TabBar.tsx                  # Навігаційна панель
├── features/
│   ├── account/                    # Налаштування, історія
│   ├── clipboard/                  # Кліпборд, Pinned items
│   ├── documents/                  # Конвертація документів
│   ├── images/                     # Логіка обробки зображень
│   ├── photo/                      # UI конвертації зображень
│   ├── sanitizer/                  # Логіка санітайзера тексту
│   ├── support/                    # Сторінка підтримки
│   └── text/                       # UI текстових інструментів
├── lib/
│   ├── clipboard.ts                # clipboard.writeText
│   ├── download.ts                 # Скачування blob
│   ├── logger.ts                   # Стилізований логер
│   ├── notifications.ts            # Browser Notifications API
│   ├── storage/                    # SQL.js + localStorage
│   └── workers/                    # Web Workers (SVG rasterization)
├── locales/                        # Файли перекладів
│   ├── uk.json
│   ├── it.json
│   └── en.json
└── styles/                         # CSS
    ├── app.css                     # Основний layout
    ├── components.css              # UI компоненти
    └── tokens.css                  # CSS-змінні (світла/темна тема)
```

---

## Технологічний стек

| Технологія | Версія | Призначення |
|-----------|--------|-------------|
| React | 19.2.6 | UI бібліотека |
| TypeScript | 5.6.2 | Типізація |
| Vite | 6.0.3 | Збірка |
| Vitest | 4.1.7 | Тестування |
| i18next | 26.3.0 | Інтернаціоналізація |
| SQL.js | 1.14.1 | База даних (SQLite via WASM) |
| pdf-lib | 1.17.1 | PDF маніпуляції |
| pdfjs-dist | 3.10.111 | PDF парсинг |
| mammoth | 1.12.0 | DOCX → HTML/TXT |
| marked | 18.0.4 | Markdown → HTML |
| docx | 9.7.1 | Генерація DOCX |
| xlsx | 0.18.5 | Excel парсинг |
| turndown | 7.2.4 | HTML → Markdown |
| heic-to | 1.5.2 | HEIC декодування (WASM) |
| jszip | 3.10.1 | ZIP архіви |
| pdf-into-svg | 1.0.1 | PDF → SVG (WASM) |
| @matbee/libreoffice-converter | 2.6.0 | LibreOffice конвертер |

## Ліцензія

MIT
