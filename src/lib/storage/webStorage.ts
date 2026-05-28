import initSqlJs from "sql.js/dist/sql-wasm.js";
import type { Database, SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { MIGRATION_001, MAX_SNIPPETS, RETENTION_DAYS } from "./schema";
import type { AppSettings, HistoryItem, TextSnippet, SanitizerSettings, LlmConfig } from "./types";

const DB_KEY = "formatx-sqljs";
const SETTINGS_KEY = "formatx-settings";

let sqlApi: SqlJsStatic | null = null;
let db: Database | null = null;

async function getSql(): Promise<SqlJsStatic> {
  if (!sqlApi) {
    sqlApi = await initSqlJs({ locateFile: () => wasmUrl });
  }
  return sqlApi;
}

async function openDb(): Promise<Database> {
  if (db) return db;
  const SQL = await getSql();
  const saved = localStorage.getItem(DB_KEY);
  db = saved
    ? new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0)))
    : new SQL.Database();
  if (!saved) db.run(MIGRATION_001);
  return db;
}

function persist(): void {
  if (!db) return;
  const data = db.export();
  let binary = "";
  for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]!);
  localStorage.setItem(DB_KEY, btoa(binary));
}

function defaultSanitizer(): SanitizerSettings {
  return {
    mode: "replace",
    formatMode: "titleCase",
    charToReplace: "/",
    replaceWith: "space",
    spacing: "none",
    removeArgs: 0,
    removeTrailing: 0,
  };
}

function defaultLlm(): LlmConfig {
  return {
    provider: "ollama",
    endpoint: "http://localhost:11434",
    apiKey: "",
    model: "llama3.2",
    enabled: false,
  };
}

function defaultSettings(): AppSettings {
  return {
    locale: "uk",
    theme: "light",
    pwaInstallDismissed: false,
    lastTab: "photo",
    closeToTray: true,
    notificationsEnabled: true,
    sanitizer: defaultSanitizer(),
    hotkey: "ctrl+shift+v",
    llm: defaultLlm(),
  };
}

export async function initWebStorage(): Promise<void> {
  await openDb();
  await purgeExpired();
}

export async function getSettings(): Promise<AppSettings> {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings();
  const defaults = defaultSettings();
  const saved = JSON.parse(raw);
  const parsed = { ...defaults, ...saved } as AppSettings;
  if (parsed.lastTab !== "photo" && parsed.lastTab !== "text" && parsed.lastTab !== "documents") {
    parsed.lastTab = "photo";
  }
  // Deep-merge sanitizer settings so new fields get defaults
  parsed.sanitizer = { ...defaults.sanitizer, ...(saved.sanitizer || {}) };
  // Deep-merge LLM config so new fields get defaults
  parsed.llm = { ...defaults.llm, ...(saved.llm || {}) };
  return parsed;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function purgeExpired(): Promise<void> {
  const database = await openDb();
  const now = Date.now();
  database.run("DELETE FROM history_items WHERE expires_at < ?", [now]);
  persist();
}

export async function addHistoryItem(
  item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number },
): Promise<void> {
  const database = await openDb();
  const createdAt = item.createdAt ?? Date.now();
  const expiresAt = createdAt + RETENTION_DAYS * 24 * 60 * 60 * 1000;
  database.run(
    `INSERT OR REPLACE INTO history_items
     (id, type, filename, mime, size, blob_base64, created_at, expires_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      item.id,
      item.type,
      item.filename,
      item.mime,
      item.size,
      item.blobBase64,
      createdAt,
      expiresAt,
    ],
  );
  persist();
}

export async function listHistory(): Promise<HistoryItem[]> {
  const database = await openDb();
  const now = Date.now();
  const stmt = database.prepare(
    "SELECT id, type, filename, mime, size, blob_base64, created_at, expires_at FROM history_items WHERE expires_at >= ? ORDER BY created_at DESC",
  );
  stmt.bind([now]);
  const items: HistoryItem[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, string | number | null>;
    items.push({
      id: String(row.id),
      type: "image",
      filename: String(row.filename),
      mime: String(row.mime),
      size: Number(row.size),
      blobBase64: row.blob_base64 ? String(row.blob_base64) : null,
      createdAt: Number(row.created_at),
      expiresAt: Number(row.expires_at),
    });
  }
  stmt.free();
  return items;
}

export async function clearHistory(): Promise<void> {
  const database = await openDb();
  database.run("DELETE FROM history_items");
  persist();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const database = await openDb();
  database.run("DELETE FROM history_items WHERE id = ?", [id]);
  persist();
}

export async function addTextSnippet(input: string, output: string): Promise<void> {
  const database = await openDb();
  const id = crypto.randomUUID();
  const preview = input.slice(0, 80);
  const now = Date.now();
  database.run(
    `INSERT INTO text_snippets (id, input_preview, output_text, created_at, sync_status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [id, preview, output, now],
  );
  const count = database.exec("SELECT COUNT(*) as c FROM text_snippets");
  const total = Number(count[0]?.values[0]?.[0] ?? 0);
  if (total > MAX_SNIPPETS) {
    database.run(
      `DELETE FROM text_snippets WHERE id IN (
        SELECT id FROM text_snippets ORDER BY created_at ASC LIMIT ?
      )`,
      [total - MAX_SNIPPETS],
    );
  }
  persist();
}

export async function listTextSnippets(): Promise<TextSnippet[]> {
  const database = await openDb();
  const stmt = database.prepare(
    "SELECT id, input_preview, output_text, created_at FROM text_snippets ORDER BY created_at DESC LIMIT 10",
  );
  const items: TextSnippet[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, string | number>;
    items.push({
      id: String(row.id),
      inputPreview: String(row.input_preview),
      outputText: String(row.output_text),
      createdAt: Number(row.created_at),
    });
  }
  stmt.free();
  return items;
}
