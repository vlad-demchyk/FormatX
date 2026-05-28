// Public API — same contract as old lib/storage/index.ts

import { purgeExpired } from "./history";

export type {
  AppSettings,
  ThemeMode,
  AppLocale,
  TabRoute,
  SanitizerSettings,
  SanitizeMode,
  FormatMode,
  LlmConfig,
  LlmProvider,
} from "./types";

export { getSettings, saveSettings } from "./settings";
export { addHistoryItem, listHistory, clearHistory, deleteHistoryItem, purgeExpired } from "./history";
export type { HistoryItem } from "./history";
export { addTextSnippet, listTextSnippets } from "./snippets";
export type { TextSnippet } from "./snippets";

export async function initStorage(): Promise<void> {
  // Dexie auto-opens on first use. Just purge expired on init.
  await purgeExpired();

}
