import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgWasm = join(root, "node_modules/@matbee/libreoffice-converter/wasm");
const pkgWorker = join(root, "node_modules/@matbee/libreoffice-converter/dist/browser.worker.global.js");
const dest = join(root, "public/wasm");

if (!existsSync(pkgWasm)) {
  console.warn("[FormatX] LibreOffice WASM package not installed — skipping wasm copy");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(pkgWasm, dest, { recursive: true });
if (existsSync(pkgWorker)) {
  cpSync(pkgWorker, join(dest, "browser.worker.global.js"));
}
console.log("[FormatX] Copied LibreOffice WASM assets to public/wasm");
