import { useCallback, useRef, useState } from "react";
import picaLib from "pica";
type PicaInstance = ReturnType<typeof picaLib>;
import type { QueueItem, ImageStatus } from "../../images/types";
import { extFromMime, baseName } from "../../images/logic";
import { downloadBlob } from "../../../lib/download";
import { logger } from "../../../lib/logger";
import { addHistoryItem } from "../../../lib/db";

const MIME_SAME = "__same__";

function buildFileName(name: string, mime: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = mime === MIME_SAME ? name.slice(dot + 1) : extFromMime(mime);
  return `${base}_resized.${ext}`;
}

export interface ResizeOptions {
  /** Target max width in px */
  width: number;
  /** Target max height in px */
  height: number;
  /** Output MIME type. "__same__" = keep original. */
  outMime: string;
  /** JPEG/WebP quality 0-100 */
  quality: number;
  /** Crop aspect ratio (width/height). null = no crop. */
  cropRatio: number | null;
}

const DEFAULT_OPTS: ResizeOptions = {
  width: 1920,
  height: 1080,
  outMime: MIME_SAME,
  quality: 85,
  cropRatio: null,
};

export function useResizeQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const picaRef = useRef<PicaInstance | null>(null);

  const getPica = useCallback(async () => {
    if (!picaRef.current) {
      picaRef.current = picaLib({ features: ["wasm", "ww", "js"] });
    }
    return picaRef.current;
  }, []);

  const updateQueue = useCallback(
    (fn: (prev: QueueItem[]) => QueueItem[]) => {
      setQueue((prev) => {
        const next = fn(prev);
        queueRef.current = next;
        return [...next];
      });
    },
    [],
  );

  const addFiles = useCallback(
    (fileList: FileList) => {
      const newItems: QueueItem[] = [];
      for (const file of Array.from(fileList)) {
        newItems.push({
          id: crypto.randomUUID(),
          file,
          thumbUrl: URL.createObjectURL(file),
          blobs: null,
          status: "pending" as ImageStatus,
          error: null,
          selected: true,
          heicPreview: false,
        });
      }
      updateQueue((prev) => [...prev, ...newItems]);
    },
    [updateQueue],
  );

  const removeItem = useCallback(
    (id: string) => {
      const item = queueRef.current.find((q) => q.id === id);
      if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      updateQueue((prev) => prev.filter((q) => q.id !== id));
    },
    [updateQueue],
  );

  const clearQueue = useCallback(() => {
    for (const item of queueRef.current) {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
    }
    updateQueue(() => []);
  }, [updateQueue]);

  /**
   * Resize a single image using pica.
   * Returns the resized Blob.
   */
  const resizeOne = useCallback(
    async (item: QueueItem, opts: ResizeOptions): Promise<Blob> => {
      const instance = await getPica();

      // Decode source image
      let img: HTMLImageElement;
      if (item.thumbUrl) {
        img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Failed to load image"));
          el.src = item.thumbUrl!;
        });
      } else {
        const url = URL.createObjectURL(item.file);
        img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error("Failed to load image"));
          el.src = url;
        });
        URL.revokeObjectURL(url);
      }

      // ── Crop (if enabled) ──
      let cropW = img.naturalWidth;
      let cropH = img.naturalHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (opts.cropRatio) {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        if (imgRatio > opts.cropRatio) {
          // Image is wider than crop — crop width
          cropW = Math.round(img.naturalHeight * opts.cropRatio);
          offsetX = Math.round((img.naturalWidth - cropW) / 2);
        } else {
          // Image is taller than crop — crop height
          cropH = Math.round(img.naturalWidth / opts.cropRatio);
          offsetY = Math.round((img.naturalHeight - cropH) / 2);
        }
      }

      // Draw cropped source on canvas
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = cropW;
      srcCanvas.height = cropH;
      const srcCtx = srcCanvas.getContext("2d")!;
      srcCtx.drawImage(img, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);

      // Calculate new dimensions (maintain aspect ratio)
      let { width, height } = opts;
      const ratio = Math.min(width / cropW, height / cropH, 1);
      const outW = Math.round(cropW * ratio);
      const outH = Math.round(cropH * ratio);

      const dstCanvas = document.createElement("canvas");
      dstCanvas.width = outW;
      dstCanvas.height = outH;

      // Map user quality (0-100) to pica's CibResizeQuality (0-3)
      const cibQuality: 0 | 1 | 2 | 3 =
        opts.quality <= 30 ? 0 : opts.quality <= 60 ? 1 : opts.quality <= 85 ? 2 : 3;

      // Resize using pica
      await instance.resize(srcCanvas, dstCanvas, {
        quality: cibQuality,
      });

      // Determine output MIME type
      const outMime =
        opts.outMime === MIME_SAME
          ? item.file.type || "image/png"
          : opts.outMime;

      // Convert to blob via pica.toBlob (handles quality correctly for JPEG/WebP)
      const blob = await instance.toBlob(
        dstCanvas,
        outMime,
        outMime === "image/png" ? undefined : opts.quality / 100,
      );

      return blob;
    },
    [getPica],
  );

  const processOne = useCallback(
    async (item: QueueItem, opts: ResizeOptions) => {
      updateQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "converting" as ImageStatus } : q)),
      );
      try {
        const blob = await resizeOne(item, opts);
        updateQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, blobs: [blob], status: "ready" as ImageStatus }
              : q,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Resize failed";
        logger.error("Resize error:", msg, e);
        updateQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error" as ImageStatus, error: msg }
              : q,
          ),
        );
      }
    },
    [updateQueue, resizeOne],
  );

  const processAll = useCallback(
    async (opts: ResizeOptions) => {
      const items = queueRef.current;
      for (const item of items) {
        await processOne(item, opts);
      }
    },
    [processOne],
  );

  const processSelected = useCallback(
    async (opts: ResizeOptions) => {
      const items = queueRef.current.filter((q) => q.selected);
      for (const item of items) {
        await processOne(item, opts);
      }
    },
    [processOne],
  );

  const downloadItem = useCallback(
    (item: QueueItem) => {
      if (!item.blobs?.[0]) return;
      const mime = item.blobs[0].type;
      const name = buildFileName(item.file.name, mime);
      downloadBlob(item.blobs[0], name);
    },
    [],
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

  const saveToHistory = useCallback(async (item: QueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob || blob.size > 2 * 1024 * 1024) return;
    const mime = blob.type;
    await addHistoryItem({
      id: crypto.randomUUID(),
      type: "image",
      filename: `${baseName(item.file.name)}_resized.${extFromMime(mime)}`,
      mime,
      size: blob.size,
      blob,
    });
  }, []);

  const processOneWithHistory = useCallback(
    async (item: QueueItem, opts: ResizeOptions) => {
      await processOne(item, opts);
      const updated = queueRef.current.find((q) => q.id === item.id);
      if (updated?.status === "ready") await saveToHistory(updated);
    },
    [processOne, saveToHistory],
  );

  return {
    queue,
    addFiles,
    removeItem,
    clearQueue,
    processOne,
    processAll,
    processSelected,
    processOneWithHistory,
    downloadItem,
    selectAll,
    selectNone,
    toggleSelect,
    defaultOptions: DEFAULT_OPTS,
  };
}
