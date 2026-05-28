# Модулі та функції FormatX

## 1. Photo — Конвертація зображень

**Файли:** `src/features/photo/`, `src/features/images/`

### Можливості
- Конвертація між форматами: PNG, JPEG, WebP
- Підтримка HEIC/HEIF (через heic-to WASM)
- Підтримка SVG (растеризація через Web Worker)
- Пакетне завантаження через drag & drop
- Вибіркове перетворення
- ZIP-архівація результатів
- Попередній перегляд з масштабуванням
- Історія конвертацій (зберігається в SQL.js)

### Формати введення
- Auto (автовизначення)
- HEIC, SVG, PNG, JPEG, WebP, BMP, GIF

### Якість
- Для JPEG/WebP: 40–100%
- Для PNG: без втрат (quality ignored)

### Потік роботи
1. Користувач додає файли (drag & drop або клік)
2. Система визначає формат (auto/heic/svg/тощо)
3. Користувач вибирає вихідний формат та якість
4. Конвертація: HEIC → WASM, SVG → Worker, решта → Canvas
5. Скачування окремо або ZIP-архівом

---

## 2. Documents — Конвертація документів

**Файли:** `src/features/documents/`

### Можливості
- Конвертація між 11 форматами
- Пакетна обробка
- Вибір вихідного формату per-file або глобально
- PDF → SVG (через pdf-into-svg WASM)
- Електронний підпис документів (вбудований редактор)
- Попередній перегляд HTML/Markdown результатів
- Pin готових документів до Clipboard

### Формати
PDF, DOCX, DOC, ODT, RTF, TXT, HTML, Markdown (MD), XLSX, XLS, CSV

### Секції
| Секція | Статус | Опис |
|--------|--------|------|
| Conversion | ✅ | Конвертація між форматами |
| PDF→SVG | ✅ | Векторизація PDF |
| Sign | ✅ | Підпис документів |
| Summarize | 🔜 | AI-сумаризація |
| Translate | 🔜 | Переклад документів |

---

## 3. Text — Текстові інструменти

**Файли:** `src/features/text/`, `src/features/sanitizer/`

### Можливості
- Режим заміни символів
- Режим форматування тексту
- CSS class → селектор конвертер
- Dual mode (дві панелі одночасно)
- Історія перетворень (snippets)
- Копіювання результату в буфер

### Режими

#### Character replacement
- Заміна будь-якого символу на: пробіл, дефіс (-), кому (,)
- Налаштування spacing (без пробілів / з пробілами навколо)
- Видалення N сегментів на початку/в кінці

#### Text formatting
- Title Case (Name Surname)
- UPPERCASE
- lowercase
- Split into words (кожне слово з нового рядка)
- Remove trailing N words

#### Class converter
- Перетворює "class1 class2" → ".class1.class2"
- Підтримує парсинг `class="..."` з HTML

### Секції
| Секція | Статус |
|--------|--------|
| Text formatting | ✅ |
| Character replacement | ✅ |
| CSS class processing | ✅ |
| Translate | 🔜 |
| Summarize | 🔜 |
| Generate (AI) | 🔜 |

---

## 4. Clipboard — Менеджер буфера обміну

**Файли:** `src/features/clipboard/`

### Можливості
- Автоматичний захват тексту при copy/paste (глобально)
- Історія clipboard (до 20 записів)
- Pinned items: збереження важливих даних
- Pin тексту, зображень, документів
- Перегляд pinned зображень/документів
- Копіювання назад у буфер

### Clipboard Tab
- Відображає останні скопійовані тексти
- Оновлюється кожні 2 секунди
- Кнопки: Copy, Pin, Delete

### Pinned Tab
- Зберігається в localStorage (ключ: `formatx-pinned`)
- Типи: text, image, document
- Підтримує data URL для медіа
- Кнопки: Unpin, Preview (для медіа)

---

## 5. Account — Налаштування та історія

**Файли:** `src/features/account/`

### Можливості
- Перемикання теми (light/dark)
- Вибір мови (UK/IT/EN)
- Налаштування сповіщень
- Історія конвертацій зі SQL.js
- Видалення окремих записів або всієї історії
- Попередній перегляд/скачування з історії
- **AI Assistant**: налаштування LLM (Ollama, OpenAI, Anthropic, Custom)
  - Провайдер, endpoint, API key, модель
  - Поки не інтегровано в основний функціонал

---

## 6. Support — Сторінка підтримки

**Файли:** `src/features/support/`

- Інформація про проект
- Buy me a coffee (посилання)
- Контакти автора (GitHub, LinkedIn, Telegram)
- Посилання на документацію
