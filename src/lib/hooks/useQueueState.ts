import { useCallback, useRef, useState } from "react";

/**
 * Generic queue state management hook.
 *
 * Extracts the shared pattern from useImageQueue / useDocumentQueue / useResizeQueue:
 * - Internal state + ref (for synchronous snapshot reads)
 * - addItems, removeItem, clearQueue
 * - selectAll, selectNone, toggleSelect
 * - updateItem (partial patch by id)
 *
 * @typeParam T - Queue item type, must have `id: string` and `selected: boolean`
 */
export interface QueueStateItem {
  id: string;
  selected: boolean;
}

export function useQueueState<T extends QueueStateItem>(initial: T[] = []) {
  const [items, setItems] = useState<T[]>(initial);
  const ref = useRef<T[]>(initial);

  const commit = useCallback((next: T[]) => {
    ref.current = next;
    setItems([...next]);
  }, []);

  const addItems = useCallback(
    (newItems: T[]) => {
      setItems((prev) => {
        const next = [...prev, ...newItems];
        ref.current = next;
        return [...next];
      });
    },
    [],
  );

  const updateItem = useCallback(
    (id: string, patch: Partial<T>) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        );
        ref.current = next;
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((q) => q.id !== id);
      ref.current = next;
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    ref.current = [];
    setItems([]);
  }, []);

  const selectAll = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((q) => ({ ...q, selected: true }));
      ref.current = next;
      return next;
    });
  }, []);

  const selectNone = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((q) => ({ ...q, selected: false }));
      ref.current = next;
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((q) =>
        q.id === id ? { ...q, selected: !q.selected } : q,
      );
      ref.current = next;
      return next;
    });
  }, []);

  /**
   * Batch-update all items matching a predicate with a partial patch.
   */
  const updateWhere = useCallback(
    (pred: (item: T) => boolean, patch: Partial<T>) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          pred(item) ? { ...item, ...patch } : item,
        );
        ref.current = next;
        return next;
      });
    },
    [],
  );

  return {
    items,
    ref,
    addItems,
    updateItem,
    updateWhere,
    removeItem,
    clearQueue,
    selectAll,
    selectNone,
    toggleSelect,
    commit,
  };
}
