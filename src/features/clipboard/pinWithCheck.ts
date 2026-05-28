import { showConfirm } from "../../app/confirm";
import { showToast } from "../../app/toast";
import { addPinnedEntry } from "./pinnedStorage";
import { addClipboardEntry } from "./storage";
import type { PinnedEntry } from "./pinnedStorage";

/**
 * Pin an item with duplicate name check.
 * - If an item with the same label+type exists, asks for confirmation (15s timeout).
 * - On confirm or no duplicate, saves to pinned AND adds to clipboard.
 * - Returns the updated pinned list, or null if the user cancelled.
 */
export async function pinWithCheck(
  entry: Omit<PinnedEntry, "id" | "createdAt">,
): Promise<PinnedEntry[] | null> {
  const { loadPinned } = await import("./pinnedStorage");
  const existing = await loadPinned();
  const dup = existing.find(
    (e) => e.label === entry.label && e.type === entry.type,
  );

  if (dup) {
    const { confirmed } = await showConfirm("toast.duplicate", {
      name: entry.label,
    });
    if (!confirmed) {
      showToast("toast.saved");
      return null;
    }
  }

  // Save to pinned
  const updated = await addPinnedEntry(entry);

  // Also add text content to clipboard
  if (entry.type === "text") {
    addClipboardEntry(entry.content);
  }

  showToast("toast.pinned");
  return updated;
}
