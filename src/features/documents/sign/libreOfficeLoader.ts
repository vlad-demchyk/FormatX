import type { LoadProgress } from "./loadDocument";
import { WorkerBrowserConverter, createWasmPaths } from "@matbee/libreoffice-converter/browser";

type LoConverter = WorkerBrowserConverter;

let converter: LoConverter | null = null;
let initPromise: Promise<LoConverter> | null = null;

export async function getLibreOfficeConverter(onProgress?: LoadProgress): Promise<LoConverter> {
  if (converter) return converter;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    onProgress?.("Loading conversion engine…", 5);
    const instance = new WorkerBrowserConverter({
      ...createWasmPaths("/wasm/"),
      browserWorkerJs: "/wasm/browser.worker.global.js",
      onProgress: (info) => {
        onProgress?.(info.message, info.percent);
      },
    });

    await instance.initialize();
    converter = instance;
    return instance;
  })();

  return initPromise;
}

export async function convertDocToPdfForPreview(
  data: ArrayBuffer,
  filename: string,
  onProgress?: LoadProgress,
): Promise<ArrayBuffer> {
  const lo = await getLibreOfficeConverter(onProgress);
  onProgress?.("Converting to PDF…", 50);
  const result = await lo.convert(data, { outputFormat: "pdf" }, filename);
  return result.data.buffer.slice(
    result.data.byteOffset,
    result.data.byteOffset + result.data.byteLength,
  ) as ArrayBuffer;
}

export async function convertDocxToDoc(
  docxBytes: ArrayBuffer,
  filename: string,
  onProgress?: LoadProgress,
): Promise<ArrayBuffer> {
  const lo = await getLibreOfficeConverter(onProgress);
  const result = await lo.convert(docxBytes, { outputFormat: "doc" }, filename.replace(/\.docx$/i, ".docx"));
  return result.data.buffer.slice(
    result.data.byteOffset,
    result.data.byteOffset + result.data.byteLength,
  ) as ArrayBuffer;
}

export async function convertDocToDocx(
  docBytes: ArrayBuffer,
  filename: string,
  onProgress?: LoadProgress,
): Promise<ArrayBuffer> {
  const lo = await getLibreOfficeConverter(onProgress);
  const result = await lo.convert(docBytes, { outputFormat: "docx" }, filename);
  return result.data.buffer.slice(
    result.data.byteOffset,
    result.data.byteOffset + result.data.byteLength,
  ) as ArrayBuffer;
}
