export interface PinnedEntry {
  id: string;
  type: "text" | "image" | "document";
  label: string;
  content: string; // text content or data URL
  mime?: string;
  size?: number;
  createdAt: number;
}

const STORAGE_KEY = "formatx-pinned";

export function loadPinned(): PinnedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PinnedEntry[];
  } catch {
    return [];
  }
}

function savePinned(entries: PinnedEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full
  }
}

export function addPinnedEntry(entry: Omit<PinnedEntry, "id" | "createdAt">): PinnedEntry[] {
  const entries = loadPinned();
  const newEntry: PinnedEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  entries.unshift(newEntry);
  savePinned(entries);
  return entries;
}

export function removePinnedEntry(id: string): PinnedEntry[] {
  const entries = loadPinned().filter((e) => e.id !== id);
  savePinned(entries);
  return entries;
}

export function clearPinned(): void {
  localStorage.removeItem(STORAGE_KEY);
}
