# Глосарій термінів

| Термін | Визначення |
|--------|------------|
| **Adapter** | Клас-конвертер, що імплементує `DocumentConverter` |
| **Allowed Edge** | Дозволена пара конвертації (from → to) |
| **AppLocale** | Підтримувана мова додатку: "uk" \| "it" \| "en" |
| **AppSettings** | Глобальні налаштування додатку |
| **Blob** | Бінарний об'єкт результату конвертації |
| **ClipboardEntry** | Запис в історії буфера обміну |
| **ConversionRequest** | Запит на конвертацію (id, file, data, format) |
| **ConversionResult** | Результат конвертації (blob, mime, filename) |
| **DocStatus** | Статус елемента в черзі: pending \| converting \| ready \| error |
| **DocumentFormatId** | Ідентифікатор формату: pdf, docx, md, html, txt, xlsx... |
| **DocumentQueueItem** | Елемент черги конвертації документів |
| **Dual Mode** | Режим TextPage з двома незалежними панелями |
| **Edge** | Пара форматів (from → to) в графі конвертації |
| **FormatEntry** | Запис формату: id, label, extensions, mime |
| **FormatMode** | Режим форматування тексту |
| **HistoryItem** | Запис в історії конвертацій (SQL.js) |
| **ImageStatus** | Статус зображення: pending \| converting \| ready \| error |
| **LLM** | Large Language Model (AI асистент) |
| **LlmConfig** | Конфігурація AI провайдера |
| **LlmProvider** | Провайдер AI: ollama \| openai \| anthropic \| custom |
| **PinnedEntry** | Збережений елемент (текст/зображення/документ) |
| **QueueItem** | Елемент черги конвертації зображень |
| **SanitizeMode** | Режим санітайзера: replace \| format |
| **SanitizerSettings** | Налаштування санітайзера |
| **TabRoute** | Маршрут вкладки інструменту: photo \| documents \| text \| clipboard |
| **TextSnippet** | Збережений текстовий фрагмент |
| **ThemeMode** | Режим теми: light \| dark |
| **Toast** | Тимчасове сповіщення в інтерфейсі |
| **Web Worker** | Потік для фонових обчислень (SVG растеризація) |
| **WorkerPool** | Пул Web Workers для паралельної обробки |
