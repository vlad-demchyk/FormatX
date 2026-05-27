import { spawnSync } from "node:child_process";
import path from "node:path";

const home = process.env.USERPROFILE || process.env.HOME || "";
const cargoBin = path.join(home, ".cargo", "bin");
const pathKey = process.platform === "win32" ? "Path" : "PATH";
const env = {
  ...process.env,
  [pathKey]: `${cargoBin}${path.delimiter}${process.env[pathKey] ?? ""}`,
};

const args = process.argv.slice(2);
const result = spawnSync("npx", ["tauri", ...args], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
