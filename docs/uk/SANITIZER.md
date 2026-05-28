# Текстовий санітайзер

## Огляд

Модуль санітайзера дозволяє обробляти текст двома способами: заміна символів та форматування. Також включає конвертер CSS класів у селектори.

## Режими роботи

### 1. Character replacement (`mode: "replace"`)

Замінює вказаний символ в тексті на інший розділювач.

**Параметри:**

| Параметр | Тип | Опис |
|----------|-----|------|
| `charToReplace` | string | Символ для заміни |
| `replaceWith` | "space" \| "dash" \| "comma" | Чим замінити |
| `spacing` | "none" \| "around" | Пробіли навколо заміни |
| `removeArgs` | number | Видалити N сегментів з початку |
| `removeTrailing` | number | Видалити N сегментів з кінця |

**Приклад:**
```
Input:  "a/b/c/d"
Config: char="/", replaceWith="dash", spacing="none"
Output: "a-b-c-d"

Input:  "a/b/c/d"
Config: char="/", replaceWith="comma", spacing="around"
Output: "a , b , c , d"

Input:  "a/b/c/d"
Config: char="/", replaceWith="dash", removeArgs=1, removeTrailing=1
Output: "b-c"
```

### 2. Text formatting (`mode: "format"`)

**Доступні режими:**

| Режим | Опис | Приклад |
|-------|------|---------|
| `titleCase` | Перша літера кожного слова велика | "hello WORLD" → "Hello World" |
| `uppercase` | Всі літери великі | "Hello" → "HELLO" |
| `lowercase` | Всі літери малі | "Hello" → "hello" |
| `splitWords` | Кожне слово з нового рядка | "a b c" → "a\nb\nc" |
| `removeTrailing` | Видалити N слів з кінця | "a b c d" (N=2) → "a b" |

### 3. Class → Selector converter

Перетворює список CSS класів у CSS селектор.

**Приклад:**
```
Input:  "btn btn-primary active"
Output: ".btn.btn-primary.active"

Input:  'class="header nav-item"'
Output: ".header.nav-item"
```

Підтримує парсинг HTML атрибуту `class="..."`.

## Функції API

```typescript
// Основна функція санітайзера
sanitize(text: string, options: SanitizeOptions): string

// Обрізає пробіли + санітайз
trimAndSanitize(text: string, options: SanitizeOptions): string

// Конвертує класи в селектори
sanitizeClasses(text: string): string
```

## Hook useSanitizer

Хук для інтеграції санітайзера в React компоненти.

```typescript
const {
  state,              // SanitizerState
  ready,              // boolean (завантажено зі storage)
  updateOptions,      // (patch: Partial<SanitizeOptions>) => void
  updateInput,        // (input: string) => void
  updateClassInput,   // (input: string) => void
  convert,            // () => void
  getConvertResult,   // () => string
  getTrimResult,      // () => string
  getClassResult,     // () => string
} = useSanitizer();
```

**Особливості:**
- Автоматично завантажує налаштування з SQL.js при старті
- Автоматично зберігає налаштування (debounced 300ms)
- Ліве об'єднання (deep-merge) нових полів налаштувань
