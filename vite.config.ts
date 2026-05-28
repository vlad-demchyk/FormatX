import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/** GitHub Pages base path */
const isGithubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  base: isGithubPages ? "/FormatX/" : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globIgnores: ["**/sql-asm*", "**/sql-asm-debug*", "**/worker.sql-asm*", "**/wasm/**"],
      },
      manifest: {
        name: "FormatX",
        short_name: "FormatX",
        description: "Your content — in perfect order",
        theme_color: "#4F46E5",
        background_color: "#FFFFFF",
        display: "standalone",
        icons: [
          { src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
          }),
  ],
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  server: {
    port: 1420,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
    fs: {
      allow: [".", "../node_modules/pdf-into-svg/runtime"],
    },
  },
  optimizeDeps: {
    include: ["sql.js/dist/sql-wasm.js"],
    exclude: ["pdf-into-svg"],
  },
  assetsInclude: ["**/*.wasm"],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("heic-to")) return "heic-to";
          if (id.includes("sql.js") || id.includes("sql-wasm")) return "sql";
          if (id.includes("@matbee/libreoffice-converter")) return "libreoffice";
          if (id.includes("pdfjs-dist")) return "pdfjs";
        },
      },
    },
  },
});
