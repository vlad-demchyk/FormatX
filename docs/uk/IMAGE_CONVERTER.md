# Система конвертації зображень

## Архітектура

Конвертація зображень відбувається через Canvas 2D API з використанням Web Workers для SVG растеризації.

## Потік конвертації

```
Файл → Визначення формату → Вибір стратегії
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                  HEIC        SVG        Інші
                    │           │           │
                    ▼           ▼           ▼
              heic-to WASM   Worker     createImageBitmap
                    │           │           │
                    └───────────┼───────────┘
                                ▼
                          Canvas 2D
                                │
                                ▼
                      canvas.toBlob()
                                │
                                ▼
                           Blob
```

## Формати та їх обробка

### HEIC/HEIF
- **Бібліотека:** `heic-to` (WASM)
- **Визначення:** за розширенням (.heic, .heif) або MIME типом
- **Вимоги:** Працює тільки через HTTP (не file://)
- **Quality:** 0.1–1.0 (конвертується з quality/100)
- **Прев'ю:** Для HEIC файлів thumbUrl = null (показується після конвертації)

### SVG
- **Конвертація:** через Web Worker (OffscreenCanvas)
- **Декодування:** через `<img>` елемент (найнадійніший спосіб)
- **Fallback:** Якщо `<img>` не спрацював — очищення SVG (коментарі, XML декларація),
  додавання xmlns та width/height

### Растрові формати (JPEG, PNG, WebP, BMP, GIF)
- **Декодування:** `createImageBitmap` (швидко, без DOM)
- **Fallback:** через `<img>` елемент + Canvas
- **Конвертація:** Canvas 2D → `canvas.toBlob()`

## Web Worker система

### WorkerPool (`src/lib/workers/workerPool.ts`)
- Generic пул Web Workers
- Кількість воркерів: `navigator.hardwareConcurrency` (або 4)
- Черга завдань з dispatch при звільненні воркера
- Підтримка Transferable об'єктів

### SVG Converter Worker (`src/lib/workers/svgConverter.worker.ts`)
- Отримує: `ImageBitmap` (transferred), outMime, quality
- Малює на `OffscreenCanvas`
- Повертає: `Blob` через `canvas.convertToBlob()`

### ImageWorkerManager (`src/lib/workers/imageWorkerManager.ts`)
- Керує пулом воркерів
- Декодує SVG/raster в `ImageBitmap` на головному потоці
- Передає `ImageBitmap` у воркер (transfer)
- Для SVG: використовує `<img>` з fallback-логікою

## Визначення формату

```typescript
function detectFormatKey(file: File, manual: string): string
```

- Якщо `manual !== "auto"` → використовує вказаний формат
- Перевіряє MIME тип на heic/heif
- Перевіряє розширення
- Якщо нічого не визначено → heic (if likely) або jpeg

## Генерація ZIP архівів

```typescript
buildZipForItems(list: QueueItem[], outMime: string): Promise<Blob | null>
```

- Використовує JSZip
- Уникає дублікатів імен (додає `_2`, `_3`...)
- Додає числовий префікс при >1 файлах
- Повертає null, якщо немає готових файлів

## Очищення метаданих (Metadata Section)

**Компонент:** `src/features/photo/components/MetadataSection.tsx`

Секція для аналізу та видалення метаданих із зображень.

### Raster images (JPEG, PNG, WebP)
- **Аналіз:** `exifr.parse(file, { multiSegment: true })` — читає EXIF, IPTC, ICC, XMP
- **Очищення:** `stripMetaViaCanvas(file)` — перемальовує через `<img>` → `<canvas>` → `toBlob()`
- Втрачаються всі EXIF дані (GPS, камера, дата, автор), але зберігається якість

### SVG
- **Аналіз:** `analyzeSvg(text)` через DOMParser:
  - `<metadata>` теги
  - XML коментарі (`<!-- -->`)
  - Редакторські атрибути (inkscape, sodipodi, illustator, data-name)
  - Вбудовані растрові зображення (`data:image/...;base64,...`)
  - Згенеровані ID (st0, st1…)
- **Два методи очищення:**
  - **SVGO** (метод `autoCleanSvgSvgo`): `import("svgo/browser")` — офіційний browser entry point, lazy-loaded (~300 KB)
  - **DOMParser** (метод `autoCleanSvgDom`): видаляє nodes через DOM API
  - SVGO використовує вбудовану браузерну збірку (`dist/svgo.browser.js`), без Node.js залежностей
- **Метод вибирається** через `localStorage.getItem("formatx-svg-cleaner")` || "svgo"
- **Ручний редактор:** contentEditable div з кольоровим підсвічуванням проблемних зон

## Зміна розміру (Resize Section)

**Компонент:** `src/features/photo/components/ResizeSection.tsx`
**Хук:** `src/features/photo/hooks/useResizeQueue.ts`

### Бібліотека pica
```
import picaLib from "pica";
const instance = picaLib({ features: ["wasm", "ww", "js"] });
```

- WASM + Web Workers для високопродуктивного масштабування
- Використовує Lanczos фільтр

### Параметри (ResizeOptions)
```typescript
interface ResizeOptions {
  width: number;          // Цільова ширина px
  height: number;         // Цільова висота px
  outMime: string;        // Вихідний MIME або "__same__"
  quality: number;        // 0-100
  cropRatio: number|null; // Співвідношення сторін (w/h) або null
}
```

### Процес
1. Декодування в `<img>` елемент
2. Crop (якщо увімкнено) — обчислення offset + canvas crop
3. Масштабування через pica (`pica.resize()`)
4. Експорт через `toBlob()`

### Crop Preview
- Візуальне затемнення області за межами кадрування
- Автоматичний розрахунок центрованого crop

### Оцінка розміру
- BPP (bits-per-pixel) коефіцієнти для різних форматів
- Корекція якості для lossy форматів
- Прогнозування розміру до конвертації

### ImageCompareSlider
- Компонент для порівняння оригіналу та результату
- Drag-слайдер посередині
- Ліва/права половинки з підписами

## Історія конвертацій

Після конвертації, якщо розмір < 2 MB, зберігає blob у SQL.js для історії.
