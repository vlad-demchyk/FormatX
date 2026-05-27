import Database from "@tauri-apps/plugin-sql";
import { MIGRATION_001, MAX_SNIPPETS, RETENTION_DAYS } from "./schema";
import type { AppSettings, HistoryItem, TabRoute, TextSnippet } from "./types";

let db: Database | null = null;

function asRows<T>(result: T | T[]): T[] {
  return Array.isArray(result) ? result : result ? [result] : [];
}

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:formatx.db");
    await db.execute(MIGRATION_001);
  }
  return db;
}

function defaultSettings(): AppSettings {
  return { locale: "uk", theme: "light", pwaInstallDismissed: false, lastTab: "photo" };
}

function parseLastTab(value: string | undefined): TabRoute {
  if (value === "photo" || value === "text" || value === "documents") return value;
  return "photo";
}

export async function initTauriStorage(): Promise<void> {
  await getDb();
  await purgeExpired();
}

export async function getSettings(): Promise<AppSettings> {
  const database = await getDb();
  const rows = asRows(
    await database.select<{ key: string; value: string }>("SELECT key, value FROM settings"),
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  if (!rows.length) return defaultSettings();
  return {
    locale: (map.locale as AppSettings["locale"]) || "uk",
    theme: (map.theme as AppSettings["theme"]) || "light",
    pwaInstallDismissed: map.pwaInstallDismissed === "true",
    lastTab: parseLastTab(map.lastTab),
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await getDb();
  const entries: [string, string][] = [
    ["locale", settings.locale],
    ["theme", settings.theme],
    ["pwaInstallDismissed", String(settings.pwaInstallDismissed)],
    ["lastTab", settings.lastTab],
  ];
  for (const [key, value] of entries) {
    await database.execute(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  }
}

export async function purgeExpired(): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM history_items WHERE expires_at < ?", [
    Date.now(),
  ]);
}

export async function addHistoryItem(
  item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number },
): Promise<void> {
  const database = await getDb();
  const createdAt = item.createdAt ?? Date.now();
  const expiresAt = createdAt + RETENTION_DAYS * 24 * 60 * 60 * 1000;
  await database.execute(
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
}

export async function listHistory(): Promise<HistoryItem[]> {
  const database = await getDb();
  const rows = asRows(
    await database.select<{
      id: string;
      type: string;
      filename: string;
      mime: string;
      size: number;
      blob_base64: string | null;
      created_at: number;
      expires_at: number;
    }>(
      "SELECT id, type, filename, mime, size, blob_base64, created_at, expires_at FROM history_items WHERE expires_at >= ? ORDER BY created_at DESC",
      [Date.now()],
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    type: "image",
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    blobBase64: r.blob_base64,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

export async function clearHistory(): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM history_items");
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM history_items WHERE id = ?", [id]);
}

export async function addTextSnippet(input: string, output: string): Promise<void> {
  const database = await getDb();
  const id = crypto.randomUUID();
  const preview = input.slice(0, 80);
  const now = Date.now();
  await database.execute(
    `INSERT INTO text_snippets (id, input_preview, output_text, created_at, sync_status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [id, preview, output, now],
  );
  const countRows = asRows(await database.select<{ c: number }>("SELECT COUNT(*) as c FROM text_snippets"));
  const c = countRows[0]?.c ?? 0;
  if (c > MAX_SNIPPETS) {
    await database.execute(
      `DELETE FROM text_snippets WHERE id IN (
        SELECT id FROM text_snippets ORDER BY created_at ASC LIMIT ?
      )`,
      [c - MAX_SNIPPETS],
    );
  }
}

export async function listTextSnippets(): Promise<TextSnippet[]> {
  const database = await getDb();
  const rows = asRows(
    await database.select<{
      id: string;
      input_preview: string;
      output_text: string;
      created_at: number;
    }>(
      "SELECT id, input_preview, output_text, created_at FROM text_snippets ORDER BY created_at DESC LIMIT 10",
    ),
  );
  return rows.map((r) => ({
    id: r.id,
    inputPreview: r.input_preview,
    outputText: r.output_text,
    createdAt: r.created_at,
  }));
}
