import * as tauri from "./tauriStorage";
import type { AppSettings, HistoryItem } from "./types";

export type {
  AppSettings,
  HistoryItem,
  TextSnippet,
  ThemeMode,
  AppLocale,
  TabRoute,
} from "./types";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

type WebStorage = typeof import("./webStorage");

let webBackend: WebStorage | null = null;

async function web(): Promise<WebStorage> {
  if (!webBackend) webBackend = await import("./webStorage");
  return webBackend;
}

async function backend() {
  return isTauri() ? tauri : web();
}

export async function initStorage(): Promise<void> {
  if (isTauri()) await tauri.initTauriStorage();
  else await (await web()).initWebStorage();
}

export async function getSettings(): Promise<AppSettings> {
  return (await backend()).getSettings();
}

export async function saveSettings(s: AppSettings): Promise<void> {
  return (await backend()).saveSettings(s);
}

export async function purgeExpired(): Promise<void> {
  return (await backend()).purgeExpired();
}

export async function addHistoryItem(
  item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number },
): Promise<void> {
  return (await backend()).addHistoryItem(item);
}

export async function listHistory(): Promise<HistoryItem[]> {
  return (await backend()).listHistory();
}

export async function clearHistory(): Promise<void> {
  return (await backend()).clearHistory();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  return (await backend()).deleteHistoryItem(id);
}

export async function addTextSnippet(input: string, output: string): Promise<void> {
  return (await backend()).addTextSnippet(input, output);
}

export async function listTextSnippets() {
  return (await backend()).listTextSnippets();
}
