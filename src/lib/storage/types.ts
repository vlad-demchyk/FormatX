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

export interface LlmConfig {
  provider: LlmProvider;
  endpoint: string;
  apiKey: string;
  model: string;
  enabled: boolean;
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

export interface HistoryItem {
  id: string;
  type: "image" | "document";
  filename: string;
  mime: string;
  size: number;
  blobBase64: string | null;
  createdAt: number;
  expiresAt: number;
}

export interface TextSnippet {
  id: string;
  inputPreview: string;
  outputText: string;
  createdAt: number;
}
