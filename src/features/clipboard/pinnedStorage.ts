import { db, type PinnedBlobRow } from "../../lib/db/dexie";

/* ── Types ── */

export interface PinnedEntry {
  id: string;
  type: "text" | "image" | "document";
  label: string;
  content: string; // text content (for type=text). Image/doc blobs live in IndexedDB.
  mime?: string;
  size?: number;
  createdAt: number;
}

/* ── Text items (small) → localStorage ── */

const TEXT_KEY = "formatx-pinned-text";

interface PinnedTextEntry {
  id: string;
  type: "text";
  label: string;
  content: string;
  createdAt: number;
}

function loadTextPinned(): PinnedTextEntry[] {
  try {
    return JSON.parse(localStorage.getItem(TEXT_KEY) || "[]") as PinnedTextEntry[];
  } catch {
    return [];
  }
}

function saveTextPinned(entries: PinnedTextEntry[]): void {
  localStorage.setItem(TEXT_KEY, JSON.stringify(entries));
}

/* ── File items (image/document) → IndexedDB via dexie ── */

const BLOB_INDEX_KEY = "formatx-pinned-blob-ids";

function loadBlobIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(BLOB_INDEX_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function saveBlobIds(ids: string[]): void {
  localStorage.setItem(BLOB_INDEX_KEY, JSON.stringify(ids));
}

/* ── Public API ── */

/** Full async load: text from localStorage + file metadata from IndexedDB */
export async function loadPinned(): Promise<PinnedEntry[]> {
  const textEntries = loadTextPinned();
  const blobIds = loadBlobIds();

  const blobEntries: PinnedEntry[] = [];
  if (blobIds.length > 0) {
    const rows = await db.pinnedBlobs.bulkGet(blobIds as "id"[]);
    for (const row of rows) {
      if (row) {
        blobEntries.push({
          id: row.id,
          type: row.type,
          label: row.label,
          content: "", // blob is fetched separately via getPinnedBlob()
          mime: row.mime,
          size: row.size,
          createdAt: row.created_at,
        });
      }
    }
  }

  // Merge and sort by createdAt desc
  return [...textEntries, ...blobEntries].sort((a, b) => b.createdAt - a.createdAt);
}

export async function addPinnedEntry(entry: Omit<PinnedEntry, "id" | "createdAt">): Promise<PinnedEntry[]> {
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  if (entry.type === "text") {
    const textEntries = loadTextPinned();
    const newEntry: PinnedTextEntry = { id, type: "text", label: entry.label, content: entry.content, createdAt };
    textEntries.unshift(newEntry);
    saveTextPinned(textEntries);
  } else {
    // Convert data URL → Blob for IndexedDB storage
    const blob = dataUrlToBlob(entry.content, entry.mime || "application/octet-stream");
    const row: PinnedBlobRow = {
      id,
      type: entry.type as "image" | "document",
      label: entry.label,
      mime: entry.mime || "application/octet-stream",
      size: entry.size || blob.size,
      blobData: blob,
      created_at: createdAt,
    };
    await db.pinnedBlobs.put(row);

    const blobIds = loadBlobIds();
    blobIds.unshift(id);
    saveBlobIds(blobIds);
  }

  return loadPinned();
}

export async function removePinnedEntry(id: string): Promise<PinnedEntry[]> {
  const textEntries = loadTextPinned();
  const filtered = textEntries.filter((e) => e.id !== id);
  if (filtered.length !== textEntries.length) {
    saveTextPinned(filtered);
  }
  // Also remove from blob storage
  const blobIds = loadBlobIds().filter((bid) => bid !== id);
  saveBlobIds(blobIds);
  void db.pinnedBlobs.delete(id as "id");
  return loadPinned();
}

export async function clearPinned(): Promise<void> {
  localStorage.removeItem(TEXT_KEY);
  const blobIds = loadBlobIds();
  saveBlobIds([]);
  await db.pinnedBlobs.bulkDelete(blobIds as "id"[]);
}

/** Get the Blob for a pinned file entry */
export async function getPinnedBlob(id: string): Promise<Blob | null> {
  const row = await db.pinnedBlobs.get(id as "id");
  return row?.blobData ?? null;
}

/* ── Helpers ── */

function dataUrlToBlob(dataUrl: string, fallbackMime: string): Blob {
  const [header, b64] = dataUrl.split(",", 2);
  const mime = header?.split(":")[1]?.split(";")[0] || fallbackMime;
  const raw = atob(b64 || "");
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return new Blob([buf], { type: mime });
}


