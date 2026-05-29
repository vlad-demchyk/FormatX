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
          <ShellLayout>
            <TabBar />       ← Навігація
            <main>
              <TextPage /> | <PhotoPage /> | <DocumentsPage />
              | <ClipboardPage /> | <AccountPage /> | <SupportPage />
            </main>
          </ShellLayout>
        </I18nProvider>
      </ThemeProvider>
    </StorageProvider>
  </ErrorBoundary>
</App>
```

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

### Clipboard capture (ShellLayout)
Глобальний перехоплювач подій `copy`/`paste` працює на всіх вкладках. При копіюванні тексту (через `copy` або `paste`) додає запис у ClipboardPage.

### Toast сповіщення
Легковажна система сповіщень через DOM-елемент `#toast`. Використовує CSS класи `.toast--success` та `.toast--error`. Автоматично зникає через 2 секунди.

### Confirm dialog
Кастомний модальний діалог підтвердження. Підтримує інтерполяцію ключів i18n через `{{key}}`. Авто-закриття через таймаут (за замовчуванням 15 с).

### Browser Notifications
Використовує Notification API для сповіщень про завершення конвертації. Поважає налаштування `notificationsEnabled`.

## CSS Архітектура

```
styles/
├── tokens.css         # CSS-змінні: кольори, радіуси, тіні
├── components.css     # UI компоненти: .btn, .card, .tile, .toast, .field
└── app.css            # Layout: .shell, header, body, tabs
```

Темна тема реалізована через атрибут `data-theme="dark"` на `<html>`. Всі кольори — через CSS-змінні.

## Обробка помилок

- **ErrorBoundary** — класовий компонент, ловить помилки рендеру
- **BootError** — статичний fallback при критичних помилках
- Кожен конвертер має try/catch з логуванням через `logger`
- Помилки конвертації відображаються в черзі файлів зі статусом "Error"
