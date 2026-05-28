# Секція підпису документів (Sign Section)

## Огляд

Секція підпису (`Sign Section`) дозволяє створювати цифровий підпис та накладати його на документи різних форматів. Реалізована як окремий модуль у `src/features/documents/sign/`.

**Основні можливості:**
- Створення підпису через canvas (сенсорний/миша)
- Автоматичне обрізання прозорих полів підпису
- Накладання підпису на документи
- Переміщення, масштабування, обертання підпису
- Підтримка багатосторінкових документів
- Експорт у вихідному форматі (PDF, DOCX, DOC, PNG)
- Undo/Redo (до 20 кроків)
- Збереження історії результатів у SQL.js

## Архітектура модуля

```
sign/
├── SignSection.tsx           # Головний компонент (оркестратор)
├── SignatureDrawer.tsx       # Canvas для малювання підпису
├── SignCanvas.tsx            # Canvas для розміщення підпису на документі
├── signatueStorage.ts        # Робота з localStorage
├── loadDocument.ts           # Завантаження та рендер документів
├── pdfRender.ts              # Рендер PDF сторінок (pdf.js)
├── trimSignature.ts          # Обрізання прозорих полів підпису
├── libreOfficeLoader.ts      # Конвертер через LibreOffice WASM
├── exportSignedDocument.ts   # Точка входу для експорту
├── exportPdf.ts              # Експорт підписаного PDF
├── exportImage.ts            # Експорт підписаного зображення
├── exportDocx.ts             # Експорт підписаного DOCX
├── exportDoc.ts              # Експорт підписаного DOC
└── types.ts                  # Типи даних
```

## Типи даних

```typescript
/** Тип вихідного документа */
type SignSourceKind = "image" | "pdf" | "docx" | "doc";

/** Сторінка документа для відображення */
interface SignPage {
  index: number;
  nativeWidth: number;     // оригінальна ширина в пікселях
  nativeHeight: number;    // оригінальна висота в пікселях
  previewUrl: string;      // Object URL або data URL для прев'ю
  bitmap?: ImageBitmap;    // бітмап для експорту
}

/** Джерело документа для підпису */
interface SignDocumentSource {
  kind: SignSourceKind;
  file: File;
  originalBytes: ArrayBuffer;
  pages: SignPage[];
  previewPdfBytes?: ArrayBuffer;  // для doc/docx (проміжний PDF)
}

/** Координати підпису (нормалізовані 0–1) */
interface PlacedSignature {
  id: string;
  pageIndex: number;
  x: number;      // 0–1 від ширини сторінки
  y: number;      // 0–1 від висоти сторінки
  w: number;      // 0–1 від ширини сторінки
  h: number;      // 0–1 від висоти сторінки
  rotation: number; // градуси
}
```

## Потік роботи

```
1. Користувач створює підпис (SignatureDrawer)
        │
        ▼
2. Підпис зберігається в localStorage (signatureStorage)
        │
        ▼
3. Користувач завантажує документ (loadDocument)
        │
        ├── image → createImageBitmap → SignPage
        ├── pdf   → pdf.js render → SignPage[]
        ├── docx  → LibreOffice WASM → PDF preview → SignPage[]
        └── doc   → LibreOffice WASM → PDF preview → SignPage[]
        │
        ▼
4. Користувач розміщує/редагує підпис (SignCanvas)
   - Клік на сторінці → додати підпис
   - Перетягування → переміщення
   - Кутовий маркер → масштабування
   - Круговий маркер → обертання
   - Delete/Backspace → видалення
   - Ctrl+Wheel → масштабування перегляду
        │
        ▼
5. Експорт (exportSignedDocument)
        │
        ├── image → Canvas 2D compositing → PNG
        ├── pdf   → pdf-lib embedPng → PDF
        ├── docx  → JSZip XML manipulation → DOCX
        └── doc   → DOC → DOCX → підпис → DOC
```

## Компоненти React

### SignSection (`SignSection.tsx`)
Головний компонент-оркестратор.

**Стан:**
- `savedSig` — data URL збереженого підпису (або null)
- `mode` — `"create"` (малювання) | `"sign"` (розміщення) | null
- `docSource` — завантажений документ (`SignDocumentSource`)
- `loading`, `loadMessage`, `loadError` — стан завантаження

**Потік:**
1. Якщо підпис не створено → кнопка "Create signature"
2. Після створення → показує прев'ю підпису + секція завантаження документа
3. Після завантаження документа → показує SignCanvas

### SignatureDrawer (`SignatureDrawer.tsx`)
Компонент для малювання підпису.

**Бібліотека:** `signature_pad` (незалежна, не вказана в package.json — встановлена окремо)

**Технічні деталі:**
- Використовує `SignaturePad` бібліотеку для згладжування кривих
- HiDPI підтримка: canvas масштабується на `devicePixelRatio`
- `ResizeObserver` для адаптивного розміру
- Прозорий фон (`backgroundColor: "rgba(0,0,0,0)"`)
- Параметри: penColor=#000, minWidth=0.8, maxWidth=3, velocityFilterWeight=0.7

**Збереження:**
1. `pad.toDataURL("image/png")` → отримує PNG
2. `trimSignaturePng()` → обрізає прозорі поля
3. `onSave(trimmed)` → передає батьківському компоненту

### SignCanvas (`SignCanvas.tsx`)
Компонент для розміщення підпису на документі.

**Можливості:**
- Додавання підпису кліком на сторінці
- Переміщення (drag)
- Масштабування (кутовий маркер bottom-right)
- Обертання (верхній круговий маркер)
- Видалення (Delete/Backspace або кнопка)
- Перегортання сторінок (для багатосторінкових)
- Масштабування перегляду (Ctrl+Wheel / кнопки +/−)
- Undo/Redo (історія до 20 кроків)

**Внутрішні компоненти:**
- `SignatureOverlay` — окремий компонент для відображення та взаємодії з одним підписом
- Підписи зберігаються у відсоткових координатах (0–1) відносно сторінки
- Pointer events для перетягування (обробка на window для плавності)

**Експорт:**
1. `signatureDataUrlToBuffer(sigDataUrl)` → ArrayBuffer
2. `exportSignedDocument({source, signatures, signaturePng})` → `{blob, mime, filename}`
3. `downloadBlob(blob, filename)` → скачування
4. Збереження в історію SQL.js

## Завантаження документів (`loadDocument.ts`)

Функція `loadSignDocument(file)` визначає тип файлу та створює `SignDocumentSource`:

| Тип | Метод | Вивід |
|-----|-------|-------|
| `image` | `createImageBitmap` | 1 сторінка, previewUrl = data URL |
| `pdf` | `pdf.js` з масштабом 2x | N сторінок, previewUrl + bitmap |
| `docx` | LibreOffice WASM → PDF | N сторінок через проміжний PDF |
| `doc` | LibreOffice WASM → PDF | N сторінок через проміжний PDF |

**COEP вимоги:** Для DOC/DOCX потрібен `crossOriginIsolated` через SharedArrayBuffer у LibreOffice WASM.

## Рендер PDF (`pdfRender.ts`)

```
renderPdfPages(data, scale=2) → { pages: SignPage[], numPages }
```

- Використовує `pdfjs-dist` 3.10.111
- Worker завантажується з unpkg CDN
- Кожна сторінка рендериться в canvas → `canvas.toDataURL("image/png")`
- Зберігається `ImageBitmap` для експорту
- Масштаб рендеру: 2x (баланс якості та продуктивності)

## Обрізання підпису (`trimSignature.ts`)

### trimSignaturePng(dataUrl)
Автоматично обрізає прозорі (alpha < 8) пікселі з усіх боків.

**Алгоритм:**
1. Завантажує PNG в canvas
2. Сканує пікселі: шукає minX, minY, maxX, maxY з alpha > 8
3. Додає padding 4px з усіх боків
4. Вирізає область та повертає data URL

### Допоміжні функції:
- `getSignatureAspect(dataUrl)` — співвідношення сторін підпису
- `normalizedSigHeight(normalizedW, sigAspect, pageW, pageH)` — нормалізована висота
- `signatureDataUrlToBuffer(dataUrl)` — data URL → ArrayBuffer

## Експорт

### exportPdf.ts — PDF → підписаний PDF
- Використовує `pdf-lib`
- Завантажує оригінальний PDF
- Вбудовує PNG підпис через `pdfDoc.embedPng()`
- Малює на сторінці з урахуванням координат (перевернуті Y: `y = height - (sig.y + sig.h) * height`)
- Підтримує обертання через `degrees()`

### exportImage.ts — Image → підписаний PNG
- Використовує Canvas 2D композитинг
- Малює оригінальне зображення (з bitmap або HTML Image)
- Малює підпис з transformation (translate + rotate + drawImage)
- Експорт в PNG

### exportDocx.ts — DOCX → підписаний DOCX
- Використовує `JSZip` для маніпуляції XML
- Додає зображення підпису в `word/media/`
- Додає relationship в `word/_rels/document.xml.rels`
- Додає Drawing XML в `word/document.xml`
- Підтримує багатосторінкові документи (пошук page breaks)
- Координати конвертуються в EMU (English Metric Units): 1px = 9525 EMU
- Обертання: 1 градус = 60000 EMU

### exportDoc.ts — DOC → підписаний DOC
1. Конвертує DOC → DOCX через LibreOffice WASM
2. Додає підпис через `exportSignedDocx`
3. Конвертує назад DOCX → DOC через LibreOffice WASM

## LibreOffice WASM (`libreOfficeLoader.ts`)

**Бібліотека:** `@matbee/libreoffice-converter` (v2.6.0)

**WASM файли:** `/wasm/` (мають бути розгорнуті на сервері)

**Функції:**
- `convertDocToPdfForPreview(data, filename)` — DOC/DOCX → PDF для прев'ю
- `convertDocxToDoc(docxBytes, filename)` — DOCX → DOC
- `convertDocToDocx(docBytes, filename)` — DOC → DOCX

**Вимоги:**
- HTTP протокол (не file://)
- Cross-Origin-Isolated заголовки (SharedArrayBuffer)
- WASM файли доступні за шляхом `/wasm/`

## Зберігання підпису (`signatureStorage.ts`)

- **Ключ:** `"formatx-signature"`
- **Формат:** Data URL (PNG)
- **Методи:** `loadSavedSignature()`, `saveSignature()`, `deleteSavedSignature()`
- Обробляє помилки квоти localStorage

## Прогрес завантаження

Більшість функцій підтримує callback `onProgress`:
```typescript
type LoadProgress = (message: string, percent?: number) => void;
```

Використовується для відображення статусу: "Loading conversion engine…", "Converting to PDF…", тощо.
