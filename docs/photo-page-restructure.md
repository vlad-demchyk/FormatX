# Реструктуризація PhotoPage — додавання секцій

> **Статус:** ✅ Виконано. PhotoPage розкладено на `ConvertSection`, `HistorySection`, `MetadataSection`, `ResizeSection`.
> Актуальну архітектуру див. у [ARCHITECTURE.md](uk/ARCHITECTURE.md).

## Контекст

Користувачі FormatX мають три основні сценарії роботи із зображеннями:
1. **Конвертація** — зміна форматів, стиснення (поточна функціональність)
2. **Історія** — перегляд раніше конвертованих файлів (зараз на сторінці Account)
3. **Очищення метаданих** — видалення EXIF та інших метаданих (майбутня функція)

Зараз усе знаходиться на одному екрані, а історія — взагалі на іншій сторінці (Account).

## План

### 1. Додати переклади (`images.*`) для трьох секцій

| Ключ | uk | en | it |
|------|----|----|-----|
| `images.sectionConvert` | Конвертація | Conversion | Conversione |
| `images.sectionConvertDesc` | Конвертуйте зображення між форматами | Convert images between formats | Converti immagini tra formati |
| `images.sectionHistory` | Історія | History | Cronologia |
| `images.sectionHistoryDesc` | Перегляд раніше конвертованих файлів | View previously converted files | Visualizza file convertiti in precedenza |
| `images.sectionMetadata` | Очищення метаданих | Metadata cleanup | Pulizia metadati |
| `images.sectionMetadataDesc` | Видалення EXIF та інших прихованих даних | Remove EXIF and other hidden data | Rimuovi EXIF e altri dati nascosti |

### 2. Використати SVG іконки для секцій

- **convert** — `tabler_photo.svg` (поточна іконка фото)
- **history** — `clipboard-list.svg` (вже є в проєкті)
- **metadata** — проста інлайн SVG або емодзі 🧹

### 3. Реструктуризувати `PhotoPage.tsx`

Структура за аналогією з `DocumentsPage.tsx`:

```
PhotoPage
├── h2 (title)
├── card grid (коли section === null)
│   ├── convert card
│   ├── history card
│   └── metadata card
└── active section (коли section !== null)
    ├── back button
    ├── convert section (поточний UI конвертації)
    ├── history section (історія з AccountPage, тільки image)
    └── metadata section (PlaceholderSection)
```

Тип секції:
```ts
type PhotoSection = "convert" | "history" | "metadata";
```

Навігація через URL hash (як у DocumentsPage):
- `#/photo` — картки секцій
- `#/photo/convert` — конвертація
- `#/photo/history` — історія
- `#/photo/metadata` — очищення метаданих

### 4. Перенести історію з AccountPage

- Скопіювати логіку `listHistory()`, `clearHistory()`, `deleteHistoryItem()` з `AccountPage`
- Фільтрувати тільки `type === "image"` для PhotoPage (можна додати параметр фільтра)
- Додати `base64ToBlob()` як спільну утиліту
- Видалити історію з `AccountPage` (або залишити тільки документи)

### 5. Залишити конвертацію без змін

Весь поточний UI конвертації залишається незмінним, тільки обгорнутий у `section === "convert"`.

## Файли для змін

| Файл | Зміна |
|------|-------|
| `src/locales/uk.json` | + ключі `images.section*` |
| `src/locales/en.json` | + ключі `images.section*` |
| `src/locales/it.json` | + ключі `images.section*` |
| `src/features/photo/PhotoPage.tsx` | реструктуризація |
| `src/features/account/AccountPage.tsx` | видалення історії |
| `src/lib/storage/index.ts` | можливо + функція фільтрації історії |
| `src/lib/storage/webStorage.ts` | можливо + `listImageHistory()` |
