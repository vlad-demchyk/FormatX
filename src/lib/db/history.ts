import { db, type HistoryRow } from "./dexie";

const RETENTION_DAYS = 30;

export interface HistoryItem {
  id: string;
  type: "image" | "document";
  filename: string;
  mime: string;
  size: number;
  blob: Blob | null;
  createdAt: number;
  expiresAt: number;
}

function toRow(item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number; expiresAt?: number }): HistoryRow {
  const createdAt = item.createdAt ?? Date.now();
  return {
    id: item.id,
    type: item.type,
    filename: item.filename,
    mime: item.mime,
    size: item.size,
    blobData: item.blob ?? null,
    created_at: createdAt,
    expires_at: item.expiresAt ?? createdAt + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  };
}

function fromRow(row: HistoryRow): HistoryItem {
  return {
    id: row.id,
    type: row.type,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    blob: row.blobData,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function addHistoryItem(
  item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number },
): Promise<void> {
  const row = toRow(item);
  await db.historyItems.put(row);
}

export async function listHistory(): Promise<HistoryItem[]> {
  const now = Date.now();
  const rows = await db.historyItems
    .where("expires_at")
    .above(now)
    .reverse()
    .sortBy("created_at");
  return rows.map(fromRow);
}

export async function clearHistory(): Promise<void> {
  await db.historyItems.clear();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  await db.historyItems.where("id").equals(id).delete();
}

export async function purgeExpired(): Promise<void> {
  const now = Date.now();
  await db.historyItems.where("expires_at").belowOrEqual(now).delete();
}
