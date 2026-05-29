import { useCallback } from "react";
import { useQueueState } from "../../../lib/hooks/useQueueState";
import { addHistoryItem } from "../../../lib/db";
import { downloadBlob } from "../../../lib/download";
import { createQueueItem, buildOutputFilename } from "../logic";
import type { DocumentQueueItem, DocumentFormatId } from "../types";

const MAX_HISTORY_BLOB = 5 * 1024 * 1024;

export function useDocumentQueue() {
  const {
    items: queue,
    addItems,
    removeItem,
    clearQueue,
    selectAll,
    selectNone,
    toggleSelect,
    updateItem,
    updateWhere,
  } = useQueueState<DocumentQueueItem>([]);

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
    addItems(newItems);
  }, [addItems]);

  const updateOutputFormat = useCallback((id: string, outputFormat: DocumentFormatId) => {
    updateItem(id, {
      outputFormat,
      status: "pending" as const,
      error: null,
      blobs: null,
    } as Partial<DocumentQueueItem>);
  }, [updateItem]);

  const updateOutputFormatForSelected = useCallback((outputFormat: DocumentFormatId) => {
    updateWhere(
      (item) => item.selected,
      {
        outputFormat,
        status: "pending" as const,
        error: null,
        blobs: null,
      } as Partial<DocumentQueueItem>,
    );
  }, [updateWhere]);

  const markReady = useCallback((id: string, blobs: Blob[]) => {
    updateItem(id, { status: "ready" as const, blobs, error: null } as Partial<DocumentQueueItem>);
  }, [updateItem]);

  const markError = useCallback((id: string, error: string) => {
    updateItem(id, { status: "error" as const, error } as Partial<DocumentQueueItem>);
  }, [updateItem]);

  const markConverting = useCallback((id: string) => {
    updateItem(id, { status: "converting" as const } as Partial<DocumentQueueItem>);
  }, [updateItem]);

  const downloadItem = useCallback((item: DocumentQueueItem) => {
    if (!item.blobs?.[0]) return;
    const filename = buildOutputFilename(item.file.name, item.outputFormat);
    downloadBlob(item.blobs[0], filename);
  }, []);

  const saveToHistory = useCallback(async (item: DocumentQueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob || blob.size > MAX_HISTORY_BLOB) return;
    await addHistoryItem({
      id: crypto.randomUUID(),
      type: "document",
      filename: buildOutputFilename(item.file.name, item.outputFormat),
      mime: "",
      size: blob.size,
      blob,
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
