// Re-export all types — same contract as old lib/storage/types.ts

export type ThemeMode = "light" | "dark";
export type AppLocale = "uk" | "it" | "en";
export type TabRoute = "photo" | "documents" | "text" | "clipboard";

export type SanitizeMode = "replace" | "format";
export type FormatMode =
  | "titleCase"
  | "uppercase"
  | "lowercase"
  | "splitWords"
  | "removeTrailing";

export type LlmProvider = "ollama" | "openai" | "anthropic" | "custom";

export type LlmMode = "local" | "cloud";

export interface AiPromptCustom {
  id: string;
  task: "generate" | "summarize" | "translate";
  label: string;
  systemPrompt: string;
  userPrompt: string;
  isDefault: boolean;
}

export interface LlmConfig {
  /** Local vs cloud AI mode */
  mode: LlmMode;
  enabled: boolean;
  /** Try cloud if local AI fails */
  fallbackToCloud: boolean;

  // Local
  localModel: string;
  localModelReady: boolean;

  // Cloud
  provider: LlmProvider;
  endpoint: string;
  apiKey: string;
  model: string;

  // Custom prompts
  prompts: AiPromptCustom[];
}

export interface SanitizerSettings {
  mode: SanitizeMode;
  formatMode: FormatMode;
  charToReplace: string;
  replaceWith: "space" | "dash" | "comma";
  spacing: "none" | "around";
  removeArgs: number;
  removeTrailing: number;
}

export interface AppSettings {
  locale: AppLocale;
  theme: ThemeMode;
  pwaInstallDismissed: boolean;
  lastTab: TabRoute;
  closeToTray: boolean;
  notificationsEnabled: boolean;
  sanitizer: SanitizerSettings;
  hotkey: string;
  llm: LlmConfig;
}
