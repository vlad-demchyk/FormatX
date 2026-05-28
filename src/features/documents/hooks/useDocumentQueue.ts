import { useCallback, useRef, useState } from "react";
import { addHistoryItem } from "../../../lib/storage";
import { downloadBlob } from "../../../lib/download";
import { createQueueItem, buildOutputFilename } from "../logic";
import { blobToBase64 } from "../../images/logic";
import type { DocumentQueueItem, DocumentFormatId } from "../types";

const MAX_HISTORY_BLOB = 5 * 1024 * 1024;

export function useDocumentQueue() {
  const [queue, setQueue] = useState<DocumentQueueItem[]>([]);
  const queueRef = useRef<DocumentQueueItem[]>([]);

  const addFiles = useCallback(async (fileList: FileList, outputFormat: DocumentFormatId) => {
    // Start ALL reads synchronously before any await. This ensures the
    // browser begins reading each file before the event handler returns,
    // preventing NotReadableError from invalidated file references.
    const files = Array.from(fileList);
    const reads = files.map((f) => f.arrayBuffer());
    const buffers = await Promise.all(reads);
    const newItems: DocumentQueueItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const item = createQueueItem(files[i]!, buffers[i]!, outputFormat);
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
        return {
          ...item,
          outputFormat,
          status: "pending" as const,
          error: null,
          blobs: null,
        };
      });
      queueRef.current = next;
      return next;
    });
  }, []);

  const updateOutputFormatForSelected = useCallback((outputFormat: DocumentFormatId) => {
    setQueue((prev) => {
      const next = prev.map((item) => {
        if (!item.selected) return item;
        return {
          ...item,
          outputFormat,
          status: "pending" as const,
          error: null,
          blobs: null,
        };
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
      type: "document",
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
    updateOutputFormatForSelected,
    markReady,
    markError,
    markConverting,
    downloadItem,
    saveToHistory,
  };
}
