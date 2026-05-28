import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgRuntime = join(root, "node_modules/pdf-into-svg/dist/runtime");
const dest = join(root, "public/assets/runtime");

if (!existsSync(pkgRuntime)) {
  console.warn("[FormatX] pdf-into-svg package not installed — skipping runtime copy");
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(pkgRuntime, dest, { recursive: true });
console.log("[FormatX] Copied pdf-into-svg runtime to public/assets/runtime");
