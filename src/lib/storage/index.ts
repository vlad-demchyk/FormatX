import type { AppSettings, HistoryItem } from "./types";

export type {
  AppSettings,
  HistoryItem,
  TextSnippet,
  ThemeMode,
  AppLocale,
  TabRoute,
  SanitizerSettings,
  SanitizeMode,
  FormatMode,
} from "./types";

let webBackend: typeof import("./webStorage") | null = null;

async function web() {
  if (!webBackend) webBackend = await import("./webStorage");
  return webBackend;
}

export async function initStorage(): Promise<void> {
  return (await web()).initWebStorage();
}

export async function getSettings(): Promise<AppSettings> {
  return (await web()).getSettings();
}

export async function saveSettings(s: AppSettings): Promise<void> {
  return (await web()).saveSettings(s);
}

export async function purgeExpired(): Promise<void> {
  return (await web()).purgeExpired();
}

export async function addHistoryItem(
  item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number },
): Promise<void> {
  return (await web()).addHistoryItem(item);
}

export async function listHistory(): Promise<HistoryItem[]> {
  return (await web()).listHistory();
}

export async function clearHistory(): Promise<void> {
  return (await web()).clearHistory();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  return (await web()).deleteHistoryItem(id);
}

export async function addTextSnippet(input: string, output: string): Promise<void> {
  return (await web()).addTextSnippet(input, output);
}

export async function listTextSnippets() {
  return (await web()).listTextSnippets();
}
