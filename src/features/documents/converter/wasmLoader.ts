let initPromise: Promise<void> | null = null;
let latestProgress = 0;

export type WasmLoadState = "idle" | "loading" | "ready" | "error";

let state: WasmLoadState = "idle";
let errorMessage = "";

export function getWasmState() {
  return { state, progress: latestProgress, error: errorMessage };
}

export function resetWasmState() {
  state = "idle";
  latestProgress = 0;
  errorMessage = "";
  initPromise = null;
}

export async function preloadLibreOffice(onProgress?: (pct: number) => void): Promise<void> {
  if (state === "ready") return;
  if (state === "loading" && initPromise) return initPromise;

  state = "loading";
  latestProgress = 0;
  errorMessage = "";

  initPromise = (async () => {
    try {
      const mod = await import("@matbee/libreoffice-converter/browser");
      const { WorkerBrowserConverter, createWasmPaths } = mod;

      const wasmPaths = createWasmPaths("https://unpkg.com/@matbee/libreoffice-converter@2.6.0/wasm/");
      const converter = new WorkerBrowserConverter({
        sofficeJs: wasmPaths.sofficeJs,
        sofficeWasm: wasmPaths.sofficeWasm,
        sofficeData: wasmPaths.sofficeData,
        sofficeWorkerJs: wasmPaths.sofficeWorkerJs,
        browserWorkerJs: "https://unpkg.com/@matbee/libreoffice-converter@2.6.0/wasm/browser.worker.global.js",
        onProgress: (progress: any) => {
          const pct = Math.round(
            ((progress.loaded || 0) / (progress.total || 1)) * 100,
          );
          latestProgress = Math.min(pct, 99);
          onProgress?.(latestProgress);
        },
      });

      await converter.initialize();
      latestProgress = 100;
      onProgress?.(100);
      state = "ready";

      // Store the converter for later use by LibreOfficeWasmAdapter
      (window as any).__formatx_lo_converter = converter;
    } catch (e) {
      state = "error";
      errorMessage = e instanceof Error ? e.message : "Failed to load LibreOffice WASM";
      throw e;
    }
  })();

  return initPromise;
}
