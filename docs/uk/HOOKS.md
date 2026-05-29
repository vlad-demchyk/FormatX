# React хуки та утиліти

## Спільні хуки (`src/lib/hooks/`)

### useQueueState
**Файл:** `src/lib/hooks/useQueueState.ts`

Узагальнений хук для керування чергою елементів. Використовується `useImageQueue`, `useDocumentQueue`, `useResizeQueue`.

```typescript
function useQueueState<T extends { id: string; selected: boolean }>(initial?: T[]): {
  items: T[];                    // Поточний стан
  ref: React.RefObject<T[]>;     // Синхронний знімок для асинхронних операцій
  addItems: (items: T[]) => void;
  updateItem: (id: string, patch: Partial<T>) => void;
  updateWhere: (pred: (item: T) => boolean, patch: Partial<T>) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  selectAll: () => void;
  selectNone: () => void;
  toggleSelect: (id: string) => void;
  commit: (next: T[]) => void;   // Повна заміна стану
}
```

### useSectionRouting
**Файл:** `src/lib/hooks/useSectionRouting.ts`

Hash-based навігація по секціях сторінки. Використовується в `PhotoPage`, `DocumentsPage`, `TextPage`.

```typescript
function useSectionRouting<TSection extends string>(
  validSections: TSection[],
  pageRoute: string,
  hashForFn: (page: string, section?: string) => string,
): {
  section: TSection | null;
  setSection: (s: TSection | null) => void;
}
```

**Деталі:**
- Читає секцію з `window.location.hash` (другий сегмент після `/`)
- `setSection` оновлює стан і `window.location.hash`
- Автоматично синхронізується з `hashchange` (back/forward браузера)

### useHistory / useHistoryOnActive
**Файл:** `src/lib/hooks/useHistory.ts`

Керування історією конвертацій.

```typescript
function useHistory(type: HistoryItem["type"]): {
  items: HistoryItem[];
  refresh: () => Promise<void>;
  handleClear: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
}

function useHistoryOnActive(active: boolean, refresh: () => Promise<void>): void
```

**Деталі:**
- Фільтрує історію за типом (`image` / `document`)
- `handleClear` показує toast після очищення
- `useHistoryOnActive` викликає `refresh()` коли секція стає активною

### useGlobalClipboardCapture
**Файл:** `src/app/hooks/useGlobalClipboardCapture.ts`

Глобальний перехоплювач clipboard. Викликається один раз у `ShellLayout`.

```typescript
function useGlobalClipboardCapture(): void
```

- Слухає події `copy`, `paste` на `window`
- Слухає `visibilitychange` для мобільних пристроїв (після native copy)
- Додає текст у clipboard історію та показує toast

### themedIcon / themedIconVar
**Файл:** `src/lib/iconTheme.ts`

Утиліти для заміни кольорів у raw SVG рядках.

```typescript
function themedIcon(raw: string): string
// Замінює fill/stroke на currentColor

function themedIconVar(raw: string, varName?: string): string
// Замінює fill/stroke на CSS-змінну (за замовчуванням var(--brand-accent))
```

## Кастомні хуки

### useAppRoute
**Файл:** `src/app/hooks/useAppRoute.ts`

Маршрутизація через URL hash.

```typescript
const { page, setPage, ready, lastToolTab, backToTools } = useAppRoute();
```

| Властивість | Тип | Опис |
|-------------|-----|------|
| `page` | `Page` | Поточна сторінка |
| `setPage` | `(page: Page) => void` | Зміна сторінки |
| `ready` | `boolean` | Готовність (після відновлення lastTab) |
| `lastToolTab` | `TabRoute` | Останній інструмент |
| `backToTools` | `() => void` | Повернення до останнього інструменту |

**Деталі:**
- Читає `page` з `window.location.hash` (`#/photo`, `#/documents`, тощо)
- Якщо hash порожній — відновлює `lastTab` з налаштувань
- Слухає `hashchange` для навігації back/forward
- Зберігає `lastTab` при зміні вкладки інструменту
- Функція `hashFor(page, section?)` будує hash

### useTheme
**Файл:** `src/app/providers/ThemeProvider.tsx`

```typescript
const { theme, toggle, setTheme } = useTheme();
```

| Властивість | Опис |
|-------------|------|
| `theme` | "light" \| "dark" |
| `toggle` | Перемикання теми |
| `setTheme` | Встановлення конкретної теми |

### useStorage
**Файл:** `src/app/providers/StorageProvider.tsx`

```typescript
const { ready, getSettings, saveSettings, addHistoryItem, listHistory, ... } = useStorage();
```

Повний список методів див. в [STORAGE.md](STORAGE.md).

### useHotkey
**Файл:** `src/app/hooks/useHotkey.ts`

```typescript
useHotkey({ onTrigger: () => void }): void
```

**Note:** Заглушка для веб-версії. Гарячі клавіші працювали б у Tauri.

### useIsTauri
**Файл:** `src/app/hooks/useIsTauri.ts`

```typescript
const isTauri: boolean = useIsTauri();
```

Завжди повертає `false` — Tauri більше не підтримується.

### useSanitizer
**Файл:** `src/features/text/hooks/useSanitizer.ts`

```typescript
const {
  state: SanitizerState,
  ready: boolean,
  updateOptions: (patch) => void,
  updateInput: (input) => void,
  updateClassInput: (input) => void,
  convert: () => void,
  getConvertResult: () => string,
  getTrimResult: () => string,
  getClassResult: () => string,
} = useSanitizer();
```

Детальний опис в [SANITIZER.md](SANITIZER.md).

### useDocumentQueue
**Файл:** `src/features/documents/hooks/useDocumentQueue.ts`

Побудовано на `useQueueState<DocumentQueueItem>`. Додає document-специфічну логіку.

```typescript
const {
  queue: DocumentQueueItem[],
  addFiles: (files, outputFormat) => void,
  removeItem, clearQueue,
  selectAll, selectNone, toggleSelect,
  updateOutputFormat, updateOutputFormatForSelected,
  markReady, markError, markConverting,
  downloadItem, saveToHistory,
} = useDocumentQueue();
```

**Деталі:**
- Використовує `useQueueState` для базових операцій з чергою
- Читає всі файли паралельно (`Promise.all`) для уникнення NotReadableError
- Зберігає історію для файлів < 5 MB

### useImageQueue
**Файл:** `src/features/photo/hooks/useImageQueue.ts`

Побудовано на `useQueueState<QueueItem>`. Додає image-специфічну логіку.

```typescript
const {
  queue: QueueItem[],
  addFiles, clearQueue, removeItem,
  selectAll, selectNone, toggleSelect,
  convertOne, convertMany,
  downloadItem, downloadZip, saveToHistory,
} = useImageQueue();
```

**Деталі:**
- Використовує `useQueueState` для базових операцій з чергою
- Для HEIC файлів: thumbUrl = null (створюється після конвертації)
- Звільняє ObjectURL при видаленні/очищенні
- Зберігає історію для файлів < 2 MB

### useResizeQueue
**Файл:** `src/features/photo/hooks/useResizeQueue.ts`

Побудовано на `useQueueState<QueueItem>`. Хук для керування чергою зміни розміру зображень.

```typescript
const {
  queue, addFiles, removeItem, clearQueue,
  selectAll, selectNone, toggleSelect,
  processOne, processAll, processSelected,
  downloadItem, saveToHistory,
} = useResizeQueue();
```

**Деталі:**
- Використовує `useQueueState` для базових операцій з чергою
- Використовує `pica` для високоякісного масштабування
- Підтримує crop з aspect ratio
- BPP-based прогноз розміру файлу

### useClipboardMonitor
**Файл:** `src/features/clipboard/hooks/useClipboardMonitor.ts`

Хук для моніторингу clipboard в межах ClipboardPage (на додачу до глобального `useGlobalClipboardCapture`).

```typescript
useClipboardMonitor({
  onCopy: (text: string) => void,
}): void
```

- Періодично оновлює список clipboard записів
- Використовується тільки на `ClipboardPage`

### useAnimationController
**Файл:** `src/features/photo/hooks/useAnimationController.ts`

React-обгортка для `AnimationController`.

```typescript
const anim = useAnimationController(
  { onRemove: (id) => void, onCollapseEnd: () => void },
  { staggerMs?: number, removeMs?: number, collapseMs?: number },
);

// Властивості
anim.phase        // "idle" | "removing" | "collapsing"
anim.removingIds  // Set<string> — ID елементів що анімуються
anim.startRemove(id)  // Почати анімацію видалення
anim.clearAll(ids)    // Анімоване очищення всіх
```

Детальний опис в [ANIMATION.md](ANIMATION.md).

## Допоміжні функції

### `src/lib/download.ts`
```typescript
downloadBlob(blob: Blob, filename: string): void
```
Створює `<a>` елемент, клікає, звільняє URL через 2 с.

### `src/lib/clipboard.ts`
```typescript
copyText(text: string): Promise<boolean>
```
Використовує `navigator.clipboard.writeText()`.

### `src/lib/logger.ts`
```typescript
logger.log(...args: unknown[]): void
logger.warn(...args: unknown[]): void
logger.error(...args: unknown[]): void
```
Стилізований `console` з префіксом `[FormatX]` у фірмовому кольорі.

### `src/lib/notifications.ts`
```typescript
requestNotificationPermission(): void
showNotification(title: string, body: string): Promise<void>
```
Browser Notifications API з урахуванням налаштувань користувача.

### `src/app/toast.ts`
```typescript
showToast(messageKey: string, kind?: "success" | "error"): void
```
Показує тимчасове повідомлення в DOM-елементі `#toast`.

### `src/app/confirm.ts`
```typescript
showConfirm(messageKey: string, interpolations?, timeout?: number): Promise<{confirmed: boolean}>
```
Кастомний confirm dialog з підтримкою i18n інтерполяції.

### `src/app/icons.ts`
```typescript
tabIcons: Record<string, string>  // Themed SVG іконки для вкладок
closeIcon: string                 // Themed close іконка
```

### `src/app/logo.ts`
```typescript
logoSvg(className?: string): string
```
SVG логотип FormatX.
