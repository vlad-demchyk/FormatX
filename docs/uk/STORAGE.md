# Система зберігання даних

FormatX використовує два рівні зберігання:

1. **SQL.js (SQLite через WASM)** — для структурованих даних
2. **localStorage** — для налаштувань та clipboard/pinned даних

## SQL.js

### Ініціалізація
```typescript
import initSqlJs from "sql.js/dist/sql-wasm.js";
```

- WASM файл завантажується через URL: `sql.js/dist/sql-wasm.wasm?url`
- База даних зберігається в localStorage під ключем `formatx-sqljs`
- При старті: завантажується з localStorage або створюється нова
- При кожній зміні: експорт у base64 → localStorage

### Схема

```sql
-- Історія конвертацій
CREATE TABLE IF NOT EXISTS history_items (
  id TEXT PRIMARY KEY NOT NULL,       -- UUID
  type TEXT NOT NULL,                  -- 'image' | 'document'
  filename TEXT NOT NULL,              -- оригінальне ім'я файлу
  mime TEXT NOT NULL,                  -- MIME тип
  size INTEGER NOT NULL,               -- розмір в байтах
  blob_base64 TEXT,                    -- base64 вмісту файлу (опціонально)
  created_at INTEGER NOT NULL,         -- timestamp створення
  expires_at INTEGER NOT NULL,         -- timestamp закінчення терміну
  sync_status TEXT DEFAULT 'pending',  -- для майбутньої синхронізації
  remote_id TEXT,                      -- для майбутньої синхронізації
  updated_at INTEGER                   -- для майбутньої синхронізації
);

-- Текстові фрагменти (історія санітайзера)
CREATE TABLE IF NOT EXISTS text_snippets (
  id TEXT PRIMARY KEY NOT NULL,
  input_preview TEXT NOT NULL,          -- перші 80 символів вводу
  output_text TEXT NOT NULL,            -- результат
  created_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'pending',
  remote_id TEXT,
  updated_at INTEGER
);

-- Налаштування (фактично не використовується, налаштування в localStorage)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

### Політика зберігання
- **Термін зберігання** (RETENTION_DAYS): 30 днів
- **Максимум snippets** (MAX_SNIPPETS): 30
- **Максимум історії** для blob: 5 MB (документи), 2 MB (зображення)
- **Автоматичне очищення** прострочених записів при старті

### CRUD операції

Усі операції експортовані через `src/lib/storage/index.ts`:

```typescript
// Ініціалізація
initStorage(): Promise<void>

// Налаштування
getSettings(): Promise<AppSettings>
saveSettings(s: AppSettings): Promise<void>

// Історія
purgeExpired(): Promise<void>
addHistoryItem(item): Promise<void>
listHistory(): Promise<HistoryItem[]>
clearHistory(): Promise<void>
deleteHistoryItem(id: string): Promise<void>

// Текстові снипети
addTextSnippet(input: string, output: string): Promise<void>
listTextSnippets(): Promise<TextSnippet[]>
```

## localStorage

### Ключі

| Ключ | Формат | Призначення |
|------|--------|-------------|
| `formatx-settings` | JSON | Налаштування додатку |
| `formatx-sqljs` | Base64 | SQL.js база даних |
| `formatx-clipboard` | JSON | Історія clipboard (до 20 записів) |
| `formatx-pinned` | JSON | Pinned items |
| `formatx-signature` | Base64 DataURL | Збережений підпис |

### Структура налаштувань

```typescript
interface AppSettings {
  locale: AppLocale;           // "uk" | "it" | "en"
  theme: ThemeMode;            // "light" | "dark"
  pwaInstallDismissed: boolean;
  lastTab: TabRoute;           // "photo" | "documents" | "text" | "clipboard"
  closeToTray: boolean;
  notificationsEnabled: boolean;
  sanitizer: SanitizerSettings;
  hotkey: string;              // "ctrl+shift+v"
  llm: LlmConfig;              // AI налаштування
}

interface SanitizerSettings {
  mode: "replace" | "format";
  formatMode: "titleCase" | "uppercase" | "lowercase" | "splitWords" | "removeTrailing";
  charToReplace: string;
  replaceWith: "space" | "dash" | "comma";
  spacing: "none" | "around";
  removeArgs: number;
  removeTrailing: number;
}

interface LlmConfig {
  provider: "ollama" | "openai" | "anthropic" | "custom";
  endpoint: string;            // "http://localhost:11434"
  apiKey: string;
  model: string;               // "llama3.2"
  enabled: boolean;
}
```

### Clipboard структура

```typescript
interface ClipboardEntry {
  id: string;              // UUID
  text: string;            // повний текст
  preview: string;         // перші 120 символів
  createdAt: number;       // timestamp
}

interface PinnedEntry {
  id: string;
  type: "text" | "image" | "document";
  label: string;           // назва
  content: string;         // текст або data URL
  mime?: string;           // MIME тип (для медіа)
  size?: number;           // розмір (для медіа)
  createdAt: number;
}
```
