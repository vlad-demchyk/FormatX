import { useCallback, useRef, useState } from "react";
import {
  convertItem,
  detectFormatKey,
  heicLikely,
  buildZipForItems,
  extFromMime,
  baseName,
} from "../../images/logic";
import type { QueueItem, ImageStatus } from "../../images/types";
import { addHistoryItem } from "../../../lib/db";
import { downloadBlob } from "../../../lib/download";

const MAX_HISTORY_BLOB = 2 * 1024 * 1024;

export function useImageQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);

  const updateQueue = useCallback((fn: (prev: QueueItem[]) => QueueItem[]) => {
    setQueue((prev) => {
      const next = fn(prev);
      queueRef.current = next;
      return [...next];
    });
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      setQueue((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        );
        queueRef.current = next;
        return next;
      });
    },
    [],
  );

  const addFiles = useCallback(
    (fileList: FileList, fmtIn: string) => {
      const newItems: QueueItem[] = [];
      for (const file of Array.from(fileList)) {
        const asHeic =
          fmtIn === "heic" ||
          (fmtIn === "auto" && (heicLikely(file) || detectFormatKey(file, "auto") === "heic"));
        newItems.push({
          id: crypto.randomUUID(),
          file,
          thumbUrl: asHeic ? null : URL.createObjectURL(file),
          blobs: null,
          status: "pending" as ImageStatus,
          error: null,
          selected: true,
          heicPreview: asHeic,
        });
      }
      updateQueue((prev) => [...prev, ...newItems]);
    },
    [updateQueue],
  );

  const clearQueue = useCallback(() => {
    for (const item of queueRef.current) {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    }
    updateQueue(() => []);
  }, [updateQueue]);

  const removeItem = useCallback(
    (id: string) => {
      const item = queueRef.current.find((q) => q.id === id);
      if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      updateQueue((prev) => prev.filter((q) => q.id !== id));
    },
    [updateQueue],
  );

  const selectAll = useCallback(() => {
    updateQueue((prev) => prev.map((q) => ({ ...q, selected: true })));
  }, [updateQueue]);

  const selectNone = useCallback(() => {
    updateQueue((prev) => prev.map((q) => ({ ...q, selected: false })));
  }, [updateQueue]);

  const toggleSelect = useCallback(
    (id: string) => {
      updateQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q)),
      );
    },
    [updateQueue],
  );

  const convertOne = useCallback(
    async (item: QueueItem, outMime: string, quality: number, fmtIn: string) => {
      updateItem(item.id, { status: "converting" });
      try {
        await convertItem(item, outMime, quality, fmtIn);
        updateItem(item.id, { status: item.status, blobs: item.blobs, error: item.error, thumbUrl: item.thumbUrl });
      } catch {
        updateItem(item.id, { status: "error", error: "Conversion failed" });
      }
    },
    [updateItem],
  );

  const convertMany = useCallback(
    async (pred: (q: QueueItem) => boolean, outMime: string, quality: number, fmtIn: string) => {
      const targets = queueRef.current.filter(pred);
      for (const item of targets) {
        await convertOne(item, outMime, quality, fmtIn);
      }
    },
    [convertOne],
  );

  const downloadItem = useCallback(
    (item: QueueItem, outMime: string) => {
      if (!item.blobs?.[0]) return;
      const ext = extFromMime(outMime);
      downloadBlob(item.blobs[0], `${baseName(item.file.name)}.${ext}`);
    },
    [],
  );

  const downloadZip = useCallback(
    async (pred: (q: QueueItem) => boolean, outMime: string) => {
      const targets = queueRef.current.filter(pred);
      const zip = await buildZipForItems(targets, outMime);
      if (zip) downloadBlob(zip, "converted-images.zip");
      else alert("No ready files for ZIP");
    },
    [],
  );

  const saveToHistory = useCallback(
    async (item: QueueItem, outMime: string) => {
      const blob = item.blobs?.[0];
      if (!blob || blob.size > MAX_HISTORY_BLOB) return;
      const ext = extFromMime(outMime);
      await addHistoryItem({
        id: crypto.randomUUID(),
        type: "image",
        filename: `${baseName(item.file.name)}.${ext}`,
        mime: outMime,
        size: blob.size,
        blob,
      });
    },
    [],
  );

  return {
    queue,
    addFiles,
    clearQueue,
    removeItem,
    selectAll,
    selectNone,
    toggleSelect,
    convertOne: async (item: QueueItem, outMime: string, quality: number, fmtIn: string) => {
      await convertOne(item, outMime, quality, fmtIn);
      if (item.status === "ready") await saveToHistory(item, outMime);
    },
    convertMany: async (pred: (q: QueueItem) => boolean, outMime: string, quality: number, fmtIn: string) => {
      await convertMany(pred, outMime, quality, fmtIn);
      for (const item of queueRef.current.filter(pred)) {
        if (item.status === "ready") await saveToHistory(item, outMime);
      }
    },
    downloadItem,
    downloadZip,
    saveToHistory,
  };
}
