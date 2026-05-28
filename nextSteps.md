# AI Integration Plan for FormatX

> **Status:** DB Migration in progress -> see [DBChange.md](./DBChange.md)
> **Version:** 0.2 - updated storage architecture

## CURRENT: DB Migration (SQL.js -> Dexie + OPFS)

Switching from SQL.js+localStorage to IndexedDB (Dexie) for main DB and OPFS for AI models.
Detailed plan: [DBChange.md](./DBChange.md)

---

## 0. Аналіз поточного стану

### 0.1 Storage (UPDATED)

| Storage | Technology | Purpose |
|---------|-----------|---------|
| **Main DB** | IndexedDB (Dexie.js) | History items, text snippets, AI chats, prompts |
| **AI Models** | OPFS | Transformers.js model cache, AI response cache |
| **Settings** | localStorage (JSON) | App settings (~1 KB) |
| **Clipboard** | localStorage (JSON) | Clipboard/pinned entries |

**Rationale:** SQL.js + localStorage had 5 MB limit, double base64 overhead, and full serialization on every write. IndexedDB stores Blobs natively, OPFS is Worker-accessible for AI models.

### 0.2 Current LLM Config

```typescript
// types.ts — поточний стан
export type LlmProvider = "ollama" | "openai" | "anthropic" | "custom";
export interface LlmConfig {
  provider: LlmProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}
```

**Що потрібно додати:**
- `mode: "local" | "cloud"` — локальний vs хмарний AI
- `localModel: string` — назва моделі для локального виконання (Transformers.js / WebLLM)
- `localModelReady: boolean` — чи завантажена локальна модель
- `fallbackToCloud: boolean` — чи пробувати хмару при локальній помилці
- `prompts` — масив AI-промтів (див. крок 3)

---

## 1. Архітектура AI Provider Interface

### 1.1 Абстракція

```typescript
// src/lib/ai/types.ts
export type AiMode = "local" | "cloud";
export type AiTask = "generate" | "summarize" | "translate";

export interface AiGenerateRequest {
  task: AiTask;
  prompt: string;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export interface AiGenerateResponse {
  text: string;
  model: string;
  tokensUsed?: number;
  durationMs: number;
}

export interface AiProvider {
  readonly name: string;
  readonly mode: AiMode;
  generate(req: AiGenerateRequest): Promise<AiGenerateResponse>;
  isReady(): boolean;
  init?(): Promise<void>;
}
```

### 1.2 Реалізації

```
src/lib/ai/
├── types.ts              # AiProvider, AiGenerateRequest, etc.
├── baseProvider.ts        # Спільна логіка (retry, error mapping)
├── localProvider.ts       # Transformers.js / WebLLM (у Web Worker)
├── cloudProvider.ts       # OpenAI / Anthropic / Ollama API
├── providerRegistry.ts    # Реєстрація та вибір провайдера
├── aiController.ts        # Головний контролер (mode switch, fallback)
├── promptRegistry.ts      # Керування AI-промптами
└── workers/
    └── ai.worker.ts       # Web Worker для локальних моделей
```

### 1.3 Патерн Provider Registry (аналог converter/registry)

```typescript
// providerRegistry.ts
import type { AiProvider, AiMode } from "./types";
import { LocalProvider } from "./localProvider";
import { CloudProvider } from "./cloudProvider";

const providers: AiProvider[] = [
  new LocalProvider(),
  new CloudProvider(),
];

export function getProvider(mode: AiMode): AiProvider {
  return providers.find(p => p.mode === mode) ?? providers[0]!;
}
```

---

## 2. Zustand для стану AI

### 2.1 Структура Store

```typescript
// src/lib/ai/aiStore.ts
import { create } from "zustand";
import type { AiMode, AiTask, AiGenerateResponse } from "./types";

interface AiState {
  mode: AiMode;                    // local | cloud
  isProcessing: boolean;           // чи йде генерація
  progress: number;                // 0-100 (завантаження моделі)
  history: ChatMessage[];          // останні повідомлення (in-memory)
  error: string | null;
  lastResponse: AiGenerateResponse | null;

  // Actions
  setMode: (mode: AiMode) => void;
  setProgress: (p: number) => void;
  addMessage: (msg: ChatMessage) => void;
  clearHistory: () => void;
  setError: (err: string | null) => void;
}

export const useAiStore = create<AiState>((set) => ({
  mode: "local",
  isProcessing: false,
  progress: 0,
  history: [],
  error: null,
  lastResponse: null,

  setMode: (mode) => set({ mode }),
  setProgress: (progress) => set({ progress }),
  addMessage: (msg) => set((s) => ({ history: [...s.history, msg] })),
  clearHistory: () => set({ history: [] }),
  setError: (error) => set({ error }),
}));
```

### 2.2 Чому Zustand

- Легкий (1 KB), ідеально для PWA
- Не потребує Provider (на відміну від Redux/Context)
- Підтримує devtools, middleware, persist
- `persist` middleware → IndexedDB для AI-історії

---

## 3. Промти: налаштування та стандарти

### 3.1 Типи AI-завдань і дефолтні промти

```typescript
// src/lib/ai/promptRegistry.ts

export const DEFAULT_PROMPTS: Record<AiTask, AiPromptTemplate> = {
  generate: {
    id: "generate-default",
    task: "generate",
    labelKey: "ai.promptGenerateLabel",
    systemPrompt: "Ти професійний асистент. Відповідай чітко та по суті.",
    userPrompt: "{input}",
  },
  summarize: {
    id: "summarize-default",
    task: "summarize",
    labelKey: "ai.promptSummarizeLabel",
    systemPrompt: "Ти експерт зі стислого викладу інформації.",
    userPrompt: "Стисло перекажи головні думки з наступного тексту. Відповідь українською:\n\n{input}",
  },
  translate: {
    id: "translate-default",
    task: "translate",
    labelKey: "ai.promptTranslateLabel",
    systemPrompt: "",
    userPrompt: "Переклади наступний текст на {targetLang}. Збережи стиль і тон:\n\n{input}",
  },
};
```

### 3.2 Інтерфейс налаштування в AccountPage

```
AccountPage
├── Settings (тема, мова, сповіщення)
├── AI Configuration
│   ├── Mode: [Local] [Cloud]
│   ├── Provider (cloud mode): [OpenAI] [Anthropic] [Ollama] [Custom]
│   ├── API Key + Endpoint
│   ├── Model selection
│   └── [✓] Fallback to cloud if local fails
└── Prompt Templates
    ├── Generate tab — редагування generate-промту
    ├── Summarize tab — редагування summarize-промту
    └── Translate tab — редагування translate-промту
```

### 3.3 Збереження кастомних промптів

```typescript
// Зберігаються в localStorage + синхронізуються з Settings
interface AiPromptCustom {
  id: string;
  task: AiTask;
  label: string;           // назва для селектора
  systemPrompt: string;
  userPrompt: string;      // з плейсхолдером {input}
  isDefault: boolean;
}
```

---

## 4. Локальний AI (Privacy-First)

### 4.1 Transformers.js (легкі задачі)

Для: translate, короткий generate, summarize.

```typescript
// src/lib/ai/localProvider.ts
export class LocalProvider implements AiProvider {
  readonly name = "transformers.js";
  readonly mode: AiMode = "local";
  private pipeline: Pipeline | null = null;
  private worker: Worker | null = null;

  async init(): Promise<void> {
    // Ліниве завантаження в Web Worker
    this.worker = new Worker(
      new URL("./workers/ai.worker.ts", import.meta.url),
      { type: "module" }
    );
    await this.postToWorker({ type: "init", task: "translation" });
  }

  isReady(): boolean {
    return this.pipeline !== null;
  }

  async generate(req: AiGenerateRequest): Promise<AiGenerateResponse> {
    // Web Worker обробляє запит
    return this.postToWorker({ type: "generate", req });
  }
}
```

### 4.2 Web Worker для AI моделей

```typescript
// src/lib/ai/workers/ai.worker.ts
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;  // завантажуємо кешовані з HuggingFace

let translator: any = null;
let generator: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { type, task, req } = e.data;

  if (type === "init") {
    if (task === "translation") {
      self.postMessage({ type: "progress", progress: 10 });
      translator = await pipeline("translation", "Xenova/nllb-200-distilled-600M", {
        quantized: true,
        progress_callback: (progress: any) => {
          self.postMessage({ type: "progress", progress: progress.progress });
        },
      });
      self.postMessage({ type: "ready" });
    }
    return;
  }

  if (type === "generate" && req.task === "translate" && translator) {
    const result = await translator(req.prompt, {
      src_lang: req.srcLang,
      tgt_lang: req.tgtLang,
    });
    self.postMessage({ type: "result", text: result[0].translation_text });
  }
};
```

### 4.3 Error Fallback (локальна → хмарна)

```typescript
// aiController.ts
export class AiController {
  private local: LocalProvider;
  private cloud: CloudProvider;

  async generate(req: AiGenerateRequest): Promise<AiGenerateResponse> {
    const store = useAiStore.getState();

    if (store.mode === "local") {
      try {
        return await this.local.generate(req);
      } catch (e) {
        // Fallback to cloud
        if (settings.llm.fallbackToCloud) {
          return await this.cloud.generate(req);
        }
        throw e;
      }
    }

    return this.cloud.generate(req);
  }
}
```

---

## 5. Рівні конфіденційності

| Рівень | Опис | Технологія |
|--------|------|-----------|
| 🟢 **Local only** | Все на пристрої | Transformers.js, IndexedDB |
| 🟡 **Cloud (own server)** | Користувач вказує свій endpoint | Ollama, Custom API |
| 🟠 **Cloud (free API)** | Gemini free tier, безкоштовні endpoint'и | Gemini, OpenRouter |
| 🔴 **Cloud (paid API)** | OpenAI, Anthropic з API key | OpenAI, Anthropic |

---

## 6. Інтеграція в UI

### 6.1 Поточні секції, де буде AI

| Сторінка | AI-функція | Статус |
|----------|-----------|--------|
| **Text → Summarize** | Підсумовування тексту | Заглушка → AI |
| **Text → Translate** | Переклад тексту | Заглушка → AI |
| **Text → Generate** | Генерація тексту за промтом | Заглушка → AI |
| **Documents → Summarize** | Підсумовування DOCX/PDF | Заглушка → AI |
| **Documents → Translate** | Переклад документів | Заглушка → AI |

### 6.2 UI компонент AI-відповіді

```tsx
// src/components/AiResponse.tsx
function AiResponse({ text, isLoading, error }: AiResponseProps) {
  return (
    <div className="ai-response card">
      {isLoading && <Spinner />}
      {error && <AiErrorFallback error={error} />}
      {text && (
        <>
          <div className="ai-response__output">{text}</div>
          <AiActions text={text} /> {/* Copy, Download, Retry */}
        </>
      )}
    </div>
  );
}
```

---

## 7. Кроки впровадження (Roadmap)

### Крок 0 — Підготовка архітектури (1-2 дні)

- [ ] Встановити `zustand`, `@xenova/transformers`, `dexie`
- [ ] Створити `src/lib/ai/` з базовою структурою
- [ ] Оновити `package.json` з новими залежностями
- [ ] Перевірити Tauri/safari сумісність Web Workers + WASM

### Крок 1 — AI Provider Interface + Types (~1 день)

- [ ] `src/lib/ai/types.ts` — всі інтерфейси
- [ ] `src/lib/ai/baseProvider.ts` — спільна логіка
- [ ] `src/lib/ai/providerRegistry.ts` — реєстрація провайдерів
- [ ] Unit tests для реєстру

### Крок 2 — Cloud Provider (~1 день)

- [ ] `src/lib/ai/cloudProvider.ts` — OpenAI + Anthropic + Ollama
- [ ] Інтеграція з поточним `LlmConfig`
- [ ] Обробка помилок API (rate limit, auth errors)

### Крок 3 — Local Provider + Web Worker (~2 дні)

- [ ] `src/lib/ai/localProvider.ts`
- [ ] `src/lib/ai/workers/ai.worker.ts`
- [ ] Transformers.js для перекладу (найлегша задача)
- [ ] Прогрес-бар завантаження моделі
- [ ] Error fallback до хмари

### Крок 4 — Zustand Store (~0.5 дня)

- [ ] `src/lib/ai/aiStore.ts`
- [ ] `persist` middleware → IndexedDB
- [ ] Дебаунс історії чатів

### Крок 5 — Prompt Registry (~1 день)

- [ ] `src/lib/ai/promptRegistry.ts`
- [ ] Дефолтні промти для всіх `AiTask`
- [ ] Збереження кастомних промптів
- [ ] Валідація плейсхолдера `{input}`

### Крок 6 — AccountPage AI налаштування (~1.5 дні)

- [ ] Рефакторинг LLM секції:
  - Додати `mode` (local/cloud)
  - Додати `fallbackToCloud`
  - Додати вибір локальної моделі
- [ ] Prompt Templates UI:
  - Селектор типу задачі (generate/summarize/translate)
  - Редактор system prompt
  - Редактор user prompt з підстановкою `{input}`
- [ ] Переклади для нових ключів

### Крок 7 — AI Component (~1 день)

- [ ] `src/components/AiResponse.tsx`
- [ ] Стани: loading, error, empty, success
- [ ] Кнопки: Copy, Download, Retry
- [ ] Інтеграція з `AiController`

### Крок 8 — Підключення AI до секцій Text (~2 дні)

- [ ] Text → Summarize: прибрати заглушку, додати AI
- [ ] Text → Translate: прибрати заглушку, додати AI
- [ ] Text → Generate: прибрати заглушку, додати AI
- [ ] Потік: ввід тексту → вибір промту → AI → відповідь → дії

### Крок 9 — AI в Documents (~1.5 дні)

- [ ] Documents → Summarize: екстракція тексту з PDF/DOCX → AI summarize
- [ ] Documents → Translate: екстракція тексту → AI translate

### Крок 10 — Тестування, PWA, Tauri (~2 дні)

- [ ] Тести для AiController
- [ ] PWA offline: Transformers.js має працювати без мережі
- [ ] Tauri: перевірка Web Workers + WASM
- [ ] Safari iOS: перевірка лімітів памʼяті для локальних моделей
- [ ] Розмір бандла: перевірити, чи не блоатять моделі основний бандл

---

## 8. Розширений LlmConfig (після змін)

```typescript
interface LlmConfig {
  // Mode
  mode: "local" | "cloud";
  enabled: boolean;
  fallbackToCloud: boolean;

  // Local
  localModel: "Xenova/nllb-200-distilled-600M" | "Xenova/gemma-2b-it" | string;
  localModelReady: boolean;

  // Cloud
  provider: LlmProvider;      // "ollama" | "openai" | "anthropic" | "custom"
  endpoint: string;
  apiKey: string;
  model: string;

  // Prompts
  prompts: AiPromptCustom[];
}
```

---

## 9. Ризики та обмеження

| Ризик | Ймовірність | Вплив | Мітигація |
|-------|-------------|-------|-----------|
| Transformers.js > 200 MB модель | Висока | Довге завантаження | Квантовані моделі, ліниве завантаження, кеш IndexedDB |
| Web Worker не підтримує WASM | Низька | Local mode не працює | Fallback до хмари |
| Safari iOS обмежує памʼять | Середня | Модель не завантажується | Квантування + менші моделі |
| localStorage ліміт для чат-історії | Висока | Втрата історії | IndexedDB через Dexie |
| API ключ в localStorage | Середня | Потенційний витік | Шифрування (Tauri), попередження для PWA |

---

## 10. Залежності для встановлення

```json
{
  "@xenova/transformers": "^2.17.2",
  "zustand": "^5.0.3",
  "dexie": "^4.1.0"
}
```

> **Примітка:** `@xenova/transformers` для локального AI (translate, summarize). `zustand` для AI-стану. `dexie` для IndexedDB обгортки (AI історія).
