import { useCallback, useRef, useState } from "react";
import { addHistoryItem } from "../../../lib/storage";
import { downloadBlob } from "../../../lib/download";
import { createQueueItem, validateItem, buildOutputFilename } from "../logic";
import { blobToBase64 } from "../../images/logic";
import type { DocumentQueueItem, DocumentFormatId } from "../types";

const MAX_HISTORY_BLOB = 5 * 1024 * 1024;

export function useDocumentQueue() {
  const [queue, setQueue] = useState<DocumentQueueItem[]>([]);
  const queueRef = useRef<DocumentQueueItem[]>([]);

  const addFiles = useCallback((fileList: FileList, outputFormat: DocumentFormatId) => {
    const newItems: DocumentQueueItem[] = [];
    for (const file of Array.from(fileList)) {
      const item = createQueueItem(file, outputFormat);
      // Don't validate on add — error shows only on Convert click
      newItems.push(item);
    }
    setQueue((prev) => {
      const next = [...prev, ...newItems];
      queueRef.current = next;
      return [...next];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.filter((q) => q.id !== id);
      queueRef.current = next;
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue(() => {
      queueRef.current = [];
      return [];
    });
  }, []);

  const selectAll = useCallback(() => {
    setQueue((prev) => {
      const next = prev.map((q) => ({ ...q, selected: true }));
      queueRef.current = next;
      return next;
    });
  }, []);

  const selectNone = useCallback(() => {
    setQueue((prev) => {
      const next = prev.map((q) => ({ ...q, selected: false }));
      queueRef.current = next;
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q));
      queueRef.current = next;
      return next;
    });
  }, []);

  const updateOutputFormat = useCallback((id: string, outputFormat: DocumentFormatId) => {
    setQueue((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const err = validateItem({
          id: item.id,
          file: item.file,
          inputFormat: item.inputFormat,
          outputFormat,
        });
        const updated: DocumentQueueItem = {
          ...item,
          outputFormat,
          status: err ? "error" : "pending",
          error: err,
          blobs: null,
        };
        return updated;
      });
      queueRef.current = next;
      return next;
    });
  }, []);

  const markReady = useCallback((id: string, blobs: Blob[]) => {
    setQueue((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, status: "ready" as const, blobs, error: null } : item,
      );
      queueRef.current = next;
      return next;
    });
  }, []);

  const markError = useCallback((id: string, error: string) => {
    setQueue((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, status: "error" as const, error } : item,
      );
      queueRef.current = next;
      return next;
    });
  }, []);

  const markConverting = useCallback((id: string) => {
    setQueue((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, status: "converting" as const } : item,
      );
      queueRef.current = next;
      return next;
    });
  }, []);

  const downloadItem = useCallback((item: DocumentQueueItem) => {
    if (!item.blobs?.[0]) return;
    const filename = buildOutputFilename(item.file.name, item.outputFormat);
    downloadBlob(item.blobs[0], filename);
  }, []);

  const saveToHistory = useCallback(async (item: DocumentQueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob || blob.size > MAX_HISTORY_BLOB) return;
    const b64 = await blobToBase64(blob);
    await addHistoryItem({
      id: crypto.randomUUID(),
      type: "image",
      filename: buildOutputFilename(item.file.name, item.outputFormat),
      mime: "",
      size: blob.size,
      blobBase64: b64,
    });
  }, []);

  return {
    queue,
    addFiles,
    removeItem,
    clearQueue,
    selectAll,
    selectNone,
    toggleSelect,
    updateOutputFormat,
    markReady,
    markError,
    markConverting,
    downloadItem,
    saveToHistory,
  };
}
