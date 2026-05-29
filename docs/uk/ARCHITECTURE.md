# Архітектура FormatX

## Загальна архітектура

FormatX — односторінковий додаток (SPA) з маршрутизацією через URL hash. Архітектура побудована на принципах:

- **Context Providers** для глобального стану (тема, сховище, i18n)
- **Feature-based** структура модулів
- **Adapter pattern** для системи конвертації
- **Web Workers** для важких обчислень

## Дерево компонентів

```
<App>
  <ErrorBoundary fallback={<BootError />}>
    <StorageProvider>        ← SQL.js ініціалізація
      <ThemeProvider>        ← Light/Dark тема
        <I18nProvider>       ← i18next + react-i18next
          <ShellLayout>      ← src/app/layout/ShellLayout.tsx
            <TabBar />       ← Навігація
            <main>
              <TextPage /> | <PhotoPage /> | <DocumentsPage />
              | <ClipboardPage /> | <AccountPage /> | <SupportPage />
            </main>
            <SelectionToolbar />
          </ShellLayout>
        </I18nProvider>
      </ThemeProvider>
    </StorageProvider>
  </ErrorBoundary>
</App>
```

**PhotoPage** (тонка обгортка, `src/features/photo/PhotoPage.tsx`):
- Використовує `useSectionRouting` для навігації по секціях через URL hash
- Рендерить card grid (home) або одну з секцій:
  - `<ConvertSection />` — дроп-зона, тулбар, черга конвертації, анімації
  - `<HistorySection />` — історія конвертацій з preview/download
  - `<MetadataSection />` — очищення EXIF/SVG метаданих
  - `<ResizeSection />` — зміна розміру + кадрування

**DocumentsPage** (тонка обгортка, `src/features/documents/DocumentsPage.tsx`):
- Використовує `useSectionRouting` для навігації по секціях
- Рендерить card grid (home) або одну з секцій:
  - `<DocumentsConvertSection />` — дроп-зона, тулбар, черга конвертації
  - `<PdfToSvgSection />`, `<SignSection />`, `<PlaceholderSection />`

**TextPage** (`src/features/text/TextPage.tsx`):
- Підтримує дуальний режим (дві панелі поруч)

## Маршрутизація

Використовується hash-based routing через `useAppRoute` hook.

```
#/photo               → PhotoPage (картки секцій)
#/photo/convert       → Секція конвертації зображень
#/photo/history       → Історія конвертацій
#/photo/metadata      → Очищення EXIF/SVG метаданих
#/photo/resize        → Зміна розміру + кадрування
#/documents           → DocumentsPage
#/documents/convert   → Секція конвертації
#/documents/sign      → Секція підпису
#/documents/pdf2svg   → PDF→SVG
#/text                → TextPage (картки секцій)
#/text/format         → Секція форматування
#/text/replace        → Секція заміни символів
#/text/classes        → CSS class конвертер
#/text/translate      → 🔜 Переклад
#/text/summarize      → 🔜 Сумаризація
#/text/generate       → 🔜 AI генерація
#/clipboard           → ClipboardPage
#/account             → AccountPage
#/support             → SupportPage
```

Останній інструмент (TabRoute) зберігається в налаштуваннях і відновлюється при повторному вході.

## Провайдери

### StorageProvider
- Асинхронно ініціалізує SQL.js WASM
- Надає контекст з методами CRUD для історії та налаштувань
- Показує "FormatX loading…" поки база не завантажиться

### ThemeProvider
- Читає тему з налаштувань при старті
- Встановлює `data-theme` атрибут на `<html>`
- Надає `theme`, `toggle()`, `setTheme()`

### I18nProvider
- Читає локаль з налаштувань
- Ініціалізує i18next з LanguageDetector
- Обгортає в `I18nextProvider` з react-i18next

## Глобальні механізми

### Clipboard capture (useGlobalClipboardCapture)
Глобальний перехоплювач подій `copy`/`paste` працює на всіх вкладках. Винесено в окремий хук `src/app/hooks/useGlobalClipboardCapture.ts` і викликається з `ShellLayout`. При копіюванні тексту (через `copy` або `paste`) додає запис у ClipboardPage.

### Toast сповіщення
Легковажна система сповіщень через DOM-елемент `#toast`. Використовує CSS класи `.toast--success` та `.toast--error`. Автоматично зникає через 2 секунди.

### Confirm dialog
Кастомний модальний діалог підтвердження. Підтримує інтерполяцію ключів i18n через `{{key}}`. Авто-закриття через таймаут (за замовчуванням 15 с).

### Browser Notifications
Використовує Notification API для сповіщень про завершення конвертації. Поважає налаштування `notificationsEnabled`.

## CSS Архітектура

```
styles/
├── tokens.css              # CSS-змінні: кольори, типографіка, відступи, анімації, z-index, радіуси
├── base.css                # Reset, body, scrollbar
├── app.css                 # Barrel: @import усіх файлів
├── layout/
│   ├── shell.css           # .shell, .shell-header, .shell-tabs, media-queries
│   └── viewer.css          # .doc-viewer, .doc-content (MD рендеринг), WASM loading
├── components/
│   ├── buttons.css         # .btn, .btn-primary, .btn-ghost, .btn-icon, .btn-sm
│   ├── cards.css           # .card, .tile, .badge, .doc-card
│   ├── forms.css           # .field, .toggle-row, .output-area
│   └── overlays.css        # .toast, .confirm-*, .preview-*, .selection-toolbar
└── features/
    ├── photo.css           # .images-*, .resize-*, .img-compare, .metadata-*, @keyframes
    ├── clipboard.css       # .clipboard-*, .clipboard-toast
    ├── text.css            # .sanitizer-*, .dual-panel, .snippets
    ├── account.css         # .account-*, .empty-state
    └── documents.css       # .documents-placeholder
```

Темна тема реалізована через атрибут `data-theme="dark"` на `<html>`. Всі кольори — через CSS-змінні.

## Обробка помилок

- **ErrorBoundary** — класовий компонент, ловить помилки рендеру
- **BootError** — статичний fallback при критичних помилках
- Кожен конвертер має try/catch з логуванням через `logger`
- Помилки конвертації відображаються в черзі файлів зі статусом "Error"
