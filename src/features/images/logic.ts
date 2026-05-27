import JSZip from "jszip";
import { MIME_MAP, type QueueItem } from "./types";

type HeicModule = typeof import("heic-to");
let heicModulePromise: Promise<HeicModule> | null = null;

async function loadHeicModule(): Promise<HeicModule> {
  if (!heicModulePromise) heicModulePromise = import("heic-to");
  return heicModulePromise;
}

export function extFromMime(m: string): string {
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return "bin";
}

export function heicLikely(file: File): boolean {
  const n = file.name.toLowerCase();
  const t = (file.type || "").toLowerCase();
  return n.endsWith(".heic") || n.endsWith(".heif") || t.includes("heic") || t.includes("heif");
}

export function detectFormatKey(file: File, manual: string): string {
  if (manual && manual !== "auto") return manual;
  const n = file.name.toLowerCase();
  const ext = n.split(".").pop() || "";
  if ((file.type || "").includes("heic") || (file.type || "").includes("heif")) return "heic";
  if (ext === "heic" || ext === "heif") return "heic";
  if (MIME_MAP[ext]) return ext === "jpg" ? "jpeg" : ext;
  return heicLikely(file) ? "heic" : "jpeg";
}

export function shouldDecodeAsHeic(file: File, fmtIn: string): boolean {
  if (fmtIn === "heic") return true;
  if (fmtIn !== "auto") return false;
  return detectFormatKey(file, "auto") === "heic" || heicLikely(file);
}

async function rasterToBlob(file: File, outMime: string, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const q = Math.min(1, Math.max(0.4, quality / 100));
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      outMime === "image/png" ? "image/png" : outMime,
      outMime === "image/png" ? undefined : q,
    );
  });
}

export async function convertItem(
  item: QueueItem,
  outMime: string,
  quality: number,
  fmtIn: string,
): Promise<void> {
  item.status = "converting";
  try {
    if (shouldDecodeAsHeic(item.file, fmtIn)) {
      let heicTo: HeicModule["heicTo"];
      try {
        ({ heicTo } = await loadHeicModule());
      } catch {
        throw new Error(
          "HEIC decoder failed to load. Use http://localhost (not file://).",
        );
      }
            const qc = Math.min(1, Math.max(0.1, quality / 100));
            const heicOut =
              outMime === "image/png"
                ? await heicTo({ blob: item.file, type: "image/png" })
                : await heicTo({
                    blob: item.file,
                    type: outMime as `image/${string}`,
                    quality: qc,
                  });
            const outBlob = heicOut instanceof Blob ? heicOut : await rasterToBlob(item.file, outMime, quality);
            item.blobs = [outBlob];
    } else {
      item.blobs = [await rasterToBlob(item.file, outMime, quality)];
    }
    item.status = "ready";
    item.error = null;
    const first = item.blobs?.[0];
    if (first && item.heicPreview) {
      if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      item.thumbUrl = URL.createObjectURL(first);
      item.heicPreview = false;
    }
  } catch (e) {
    item.status = "error";
    let msg = e instanceof Error ? e.message : String(e);
    if (/ERR_LIBHEIF|libheif|format not supported|HEIF processing error/i.test(msg)) {
      msg +=
        " Try exporting JPG/PNG from Photos — some HDR/Live modes may not decode in browser.";
    }
    item.error = msg;
    item.blobs = null;
  }
}

export function baseName(name: string): string {
  return name.replace(/\.[^.\\/]+$/, "");
}

export async function buildZipForItems(
  list: QueueItem[],
  outMime: string,
): Promise<Blob | null> {
  const ext = extFromMime(outMime);
  const zip = new JSZip();
  const used: Record<string, true> = {};
  let added = 0;
  let row = 0;
  const prefixRow = list.filter((it) => it.blobs?.length).length > 1;

  function uniqueEntryName(label: string): string {
    const prefix = prefixRow ? `${String(row).padStart(2, "0")}-` : "";
    let base = `${prefix}${label}`;
    let name = `${base}.${ext}`;
    let dup = 2;
    while (used[name]) {
      name = `${base}_${dup}.${ext}`;
      dup++;
    }
    used[name] = true;
    return name;
  }

  for (const item of list) {
    if (!item.blobs?.length) continue;
    row += 1;
    const stem = baseName(item.file.name);
    if (item.blobs.length === 1) {
      zip.file(uniqueEntryName(stem), item.blobs[0]!);
      added++;
    } else {
      item.blobs.forEach((b, idx) => {
        zip.file(uniqueEntryName(`${stem}-${idx + 1}`), b);
        added++;
      });
    }
  }
  if (added === 0) return null;
  return zip.generateAsync({ type: "blob" });
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
