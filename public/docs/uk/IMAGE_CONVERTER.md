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

## Історія конвертацій

Після конвертації, якщо розмір < 2 MB, зберігає blob у SQL.js для історії.
