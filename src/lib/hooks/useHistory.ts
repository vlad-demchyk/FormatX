import { useCallback, useEffect, useState } from "react";
import {
  listHistory,
  clearHistory,
  deleteHistoryItem,
  type HistoryItem,
} from "../db";
import { showToast } from "../../app/toast";

/**
 * History management hook.
 *
 * Extracts the shared pattern from PhotoPage / TextPage / DocumentsPage:
 * - Fetch history items filtered by type
 * - Clear all history
 * - Delete a single history item
 * - Auto-refresh when section becomes active
 */
export function useHistory(type: HistoryItem["type"]) {
  const [items, setItems] = useState<HistoryItem[]>([]);

  const refresh = useCallback(async () => {
    const all = await listHistory();
    setItems(all.filter((h) => h.type === type));
  }, [type]);

  const handleClear = useCallback(async () => {
    await clearHistory();
    showToast("toast.cleared");
    await refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteHistoryItem(id);
      await refresh();
    },
    [refresh],
  );

  return { items, refresh, handleClear, handleDelete };
}

/**
 * Conditional refresh wrapper — calls refresh() when `active` becomes true.
 */
export function useHistoryOnActive(
  active: boolean,
  refresh: () => Promise<void>,
) {
  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);
}
