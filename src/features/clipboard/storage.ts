export interface ClipboardEntry {
  id: string;
  text: string;
  preview: string;
  createdAt: number;
}

const STORAGE_KEY = "formatx-clipboard";
const MAX_ENTRIES = 20;

export function loadClipboard(): ClipboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClipboardEntry[];
  } catch {
    return [];
  }
}

export function saveClipboard(entries: ClipboardEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full — silently drop oldest
  }
}

export function addClipboardEntry(text: string): ClipboardEntry[] {
  const entries = loadClipboard();
  // Avoid duplicate consecutive entries
  if (entries.length > 0 && entries[0]!.text === text) return entries;

  const entry: ClipboardEntry = {
    id: crypto.randomUUID(),
    text,
    preview: text.slice(0, 120),
    createdAt: Date.now(),
  };
  entries.unshift(entry);
  saveClipboard(entries);
  return entries;
}

export function clearClipboard(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function removeClipboardEntry(id: string): ClipboardEntry[] {
  const entries = loadClipboard().filter((e) => e.id !== id);
  saveClipboard(entries);
  return entries;
}
