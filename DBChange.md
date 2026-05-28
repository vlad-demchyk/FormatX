# DB Migration Plan: SQL.js → IndexedDB (Dexie) + OPFS

> **Status:** ✅ Completed — Block 0-4 done (2026-05-29)  
> **Next:** Block 5 — OPFS for AI models (future stage)

---

## Architecture Decision

| Storage | Technology | Purpose |
|---------|-----------|---------|
| **Main DB** | IndexedDB via **Dexie.js** | History items, text snippets, AI chat history, prompt templates |
| **AI Models** | **OPFS** (Origin Private File System) | Transformers.js model cache (~200 MB), AI response cache |
| **Settings** | `localStorage` (JSON) | App settings (tiny, ~1 KB) |
| **Clipboard** | `localStorage` (JSON) | Clipboard entries (unchanged) |
| **Pinned** | `localStorage` (JSON) | Pinned items (unchanged) |

### Why OPFS for AI models

- Accessible from **Web Workers** (unlike IndexedDB)
- No quota prompts — silent storage
- Perfect for caching large model files
- `FileSystemSyncAccessHandle` for fast synchronous reads

---

## Execution Blocks

### Блок 0: Setup — залежності та структура ✅

- [x] `npm install dexie`
- [x] `npm uninstall sql.js @types/sql.js`
- [x] Створити `src/lib/db/` директорію (нова, замість `src/lib/storage/`)
- [x] Створити `src/lib/db/dexie.ts` — ініціалізація Dexie
- [x] Створити `src/lib/db/types.ts` — нові типи
- [x] Оновити `src/lib/ai/` план під OPFS

### Блок 1: Dexie схема + API ✅

- [x] `src/lib/db/dexie.ts` — клас FormatXDB з таблицями
- [x] `src/lib/db/history.ts` — CRUD для history_items (з Blob підтримкою)
- [x] `src/lib/db/snippets.ts` — CRUD для text_snippets
- [x] `src/lib/db/settings.ts` — get/save налаштувань (з localStorage)
- [x] `src/lib/db/index.ts` — публічний API (такий самий контракт)

### Блок 2: Оновлення хуків (прибрати blobToBase64) ✅

- [x] `src/features/photo/hooks/useImageQueue.ts` — `blobToBase64` → прямий Blob
- [x] `src/features/documents/hooks/useDocumentQueue.ts` — аналогічно
- [x] `src/features/photo/PhotoPage.tsx` — `base64ToBlob` → `item.blob`
- [x] Видалити `src/features/images/logic.ts::blobToBase64`
- [x] `src/features/documents/sign/SignCanvas.tsx` — blobBase64 → blob

### Блок 3: Оновлення провайдерів та імпортів ✅

- [x] `src/app/providers/StorageProvider.tsx` — новий API
- [x] `src/app/providers/I18nProvider.tsx` — імпорт
- [x] `src/app/providers/ThemeProvider.tsx` — імпорт
- [x] `src/app/hooks/useAppRoute.ts` — імпорт
- [x] `src/lib/notifications.ts` — імпорт
- [x] `src/features/text/TextPage.tsx` — імпорт
- [x] `src/features/text/hooks/useSanitizer.ts` — імпорт
- [x] `src/features/text/components/SnippetsList.tsx` — імпорт
- [x] `src/app/i18n.ts` — імпорт

### Блок 4: Очищення SQL.js ✅

- [x] Видалити `src/lib/storage/webStorage.ts`
- [x] Видалити `src/lib/storage/schema.ts`
- [x] Видалити `src/lib/storage/index.ts`
- [x] Видалити `src/lib/storage/types.ts`
- [x] Оновити `vite.config.ts` — видалити sql-wasm згадки
- [x] `npm uninstall sql.js @types/sql.js`
- [x] `npx tsc --noEmit` → 0 errors ✅

### Блок 5: OPFS для AI (наступний етап)

- [ ] `src/lib/db/opfs.ts` — OPFS helpers для AI моделей
- [ ] `src/lib/ai/workers/ai.worker.ts` — використовує OPFS для кешу

---

## Current DB Schema → Dexie Schema

```typescript
// Стара SQL схема (schema.ts) — ВИДАЛЯЄМО
// Нова Dexie схема:

class FormatXDB extends Dexie {
  historyItems!: Table<HistoryRow, "id">;
  textSnippets!: Table<SnippetRow, "id">;
  aiChats!: Table<AiChatRow, "id">;       // AI-історія
  aiPrompts!: Table<AiPromptRow, "id">;    // Кастомні промти

  constructor() {
    super("FormatX");
    this.version(1).stores({
      historyItems: "id, type, created_at, expires_at",
      textSnippets: "id, created_at",
      aiChats: "id, session_id, created_at",
      aiPrompts: "id, task",
    });
  }
}
```

---

## Files Changed (14 files)

| # | File | Action |
|---|------|--------|
| 1 | `src/lib/db/dexie.ts` | 🆕 New |
| 2 | `src/lib/db/types.ts` | 🆕 New |
| 3 | `src/lib/db/index.ts` | 🆕 New |
| 4 | `src/lib/db/history.ts` | 🆕 New |
| 5 | `src/lib/db/snippets.ts` | 🆕 New |
| 6 | `src/lib/db/settings.ts` | 🆕 New |
| 7 | `src/lib/storage/webStorage.ts` | ❌ Delete |
| 8 | `src/lib/storage/schema.ts` | ❌ Delete |
| 9 | `src/lib/storage/types.ts` | ✏️ Update |
| 10 | `src/features/photo/hooks/useImageQueue.ts` | ✏️ blobToBase64 → Blob |
| 11 | `src/features/documents/hooks/useDocumentQueue.ts` | ✏️ blobToBase64 → Blob |
| 12 | `src/features/photo/PhotoPage.tsx` | ✏️ base64ToBlob → item.blob |
| 13 | `src/features/images/logic.ts` | ✏️ Remove blobToBase64 |
| 14 | `package.json` | ✏️ -sql.js +dexie |

---

## Rollback Plan (if needed)

```bash
git revert <commit>
npm install sql.js @types/sql.js
```
