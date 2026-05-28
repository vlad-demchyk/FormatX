# Система конвертації документів

## Архітектура

Система конвертації побудована на **Adapter Pattern**. Кожен конвертер — це клас, що імплементує інтерфейс `DocumentConverter`.

### Інтерфейс

```typescript
interface DocumentConverter {
  readonly name: string;
  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean;
  convert(request: ConversionRequest): Promise<ConversionResult>;
}
```

### Registry (`src/features/documents/converter/registry.ts`)

Реєстр містить масив всіх доступних конвертерів. Функція `findConverter(from, to)` знаходить перший конвертер, що може виконати задану конвертацію.

```typescript
const converters: DocumentConverter[] = [
  new PdfLibAdapter(),
  new PdfToDocxAdapter(),
  new MammothAdapter(),
  new PdfJsAdapter(),
  new MarkedAdapter(),
  new XlsxAdapter(),
  new TextToMarkdownAdapter(),
  new MarkdownToDocxAdapter(),
  new MarkdownToPdfAdapter(),
];
```

## Доступні адаптери

### 1. PdfLibAdapter (`pdf-lib`)
- **Ім'я:** `pdf-lib`
- **Маршрути:** PDF → PDF
- **Можливості:** Копіювання PDF, merge (`mergePdfs()`), split (`splitPdf()`)

### 2. PdfToDocxAdapter (`pdf.js` + `docx`)
- **Ім'я:** `PDF→DOCX`
- **Маршрути:** PDF → DOCX
- **Деталі:** Витягує текст через pdf.js, створює DOCX з параграфами. Визначає заголовки за розміром шрифту та жирністю.

### 3. PdfJsAdapter (`pdf.js`)
- **Ім'я:** `pdf.js`
- **Маршрути:** PDF → TXT, PDF → HTML, PDF → MD
- **Worker:** завантажується з unpkg CDN
- **Деталі:** Витягує текст сторінка за сторінкою. Для MD додає заголовки сторінок.

### 4. MammothAdapter (`mammoth`)
- **Ім'я:** `mammoth`
- **Маршрути:** DOCX → HTML, DOCX → TXT, DOCX → MD
- **Деталі:** Швидкий, легкий, без WASM. Markdown отримується через turndown.

### 5. MarkedAdapter (`marked`)
- **Ім'я:** `marked`
- **Маршрути:** MD → HTML, MD → TXT
- **Деталі:** Async парсинг. Генерує стилізований HTML з CSS.

### 6. XlsxAdapter (`xlsx` / SheetJS)
- **Ім'я:** `xlsx`
- **Маршрути:** XLSX/XLS/CSV → HTML, CSV, TXT, MD
- **Деталі:** Підтримує всі листи книги. Для MD використовує turndown.

### 7. TextToMarkdownAdapter
- **Ім'я:** `text→md`
- **Маршрути:** HTML → MD, TXT → MD/HTML/DOCX/TXT
- **Деталі:** Універсальний адаптер для текстових форматів.

### 8. MarkdownToDocxAdapter (`marked` + `docx`)
- **Ім'я:** `MD→DOCX`
- **Маршрути:** MD → DOCX
- **Деталі:** Парсить MD через marked, створює DOCX з Header/Footer/PageNumber.

### 9. MarkdownToPdfAdapter (`marked` + `pdf-lib`)
- **Ім'я:** `MD→PDF`
- **Маршрути:** MD → PDF
- **Деталі:** A4 формат, Helvetica шрифт. Має мапу Unicode→ASCII для WinAnsi сумісності.

## Формати документів

```typescript
type DocumentFormatId =
  | "pdf" | "docx" | "doc" | "odt" | "rtf"
  | "txt" | "html" | "md"
  | "xlsx" | "xls" | "csv";
```

## Граф конвертації (Allowed Edges)

```
PDF ──→ PDF, MD, TXT, DOCX, HTML
DOCX ─→ TXT, HTML, PDF, MD
MD ───→ HTML, TXT, DOCX, PDF
HTML ─→ MD
TXT ──→ MD, HTML, DOCX, TXT
XLSX ─→ HTML, CSV, TXT, MD
XLS ──→ HTML, CSV, TXT, MD
CSV ──→ HTML, TXT, MD
```

Повний список: `ALLOWED_EDGES` у `formatRegistry.ts`.

## Типи даних

```typescript
interface ConversionRequest {
  id: string;
  file: File;
  data: ArrayBuffer;
  inputFormat: DocumentFormatId;
  outputFormat: DocumentFormatId;
}

interface ConversionResult {
  blob: Blob;
  mime: string;
  filename: string;
}

interface DocumentQueueItem {
  id: string;
  file: File;
  data: ArrayBuffer;
  inputFormat: DocumentFormatId;
  outputFormat: DocumentFormatId;
  status: "pending" | "converting" | "ready" | "error";
  error: string | null;
  blobs: Blob[] | null;
  selected: boolean;
}
```

## Допоміжні функції

| Функція | Опис |
|---------|------|
| `detectFormat(file)` | Визначає формат за розширенням файлу |
| `canConvert(from, to)` | Перевіряє чи можлива конвертація |
| `formatLabel(id)` | Повертає назву формату |
| `formatMime(id)` | Повертає MIME тип |
| `outputFormatsFor(input)` | Список доступних вихідних форматів |
| `inputFormatsFor(output)` | Список вхідних форматів для вихідного |
| `allOutputFormats()` | Глобальний список вихідних форматів |
| `buildOutputFilename(name, format)` | Генерує ім'я вихідного файлу |
