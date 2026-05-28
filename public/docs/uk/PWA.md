# PWA та деплой

## PWA (Progressive Web App)

### Конфігурація

PWA налаштована через плагін `vite-plugin-pwa` у `vite.config.ts`.

```typescript
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.svg"],
  workbox: {
    maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
    globIgnores: [
      "**/sql-asm*",
      "**/sql-asm-debug*",
      "**/worker.sql-asm*",
    ],
  },
  manifest: {
    name: "FormatX",
    short_name: "FormatX",
    description: "Your content — in perfect order",
    theme_color: "#4F46E5",
    background_color: "#FFFFFF",
    display: "standalone",
    icons: [
      {
        src: "favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  },
})
```

### Особливості
- **Auto-update:** Service worker оновлюється автоматично
- **Cache:** Файли до 6 MB кешуються
- **Винятки:** SQL.js WASM файли виключені з кешу (завеликі)
- **Standalone:** Додаток працює в окремому вікні
- **Іконка:** SVG favicon

## GitHub Pages

### Конфігурація Vite

```typescript
const isGithubPages = process.env.GITHUB_PAGES === "true";
base: isGithubPages ? "/FormatX/" : "/",
```

### Деплой

Автоматичний деплой на GitHub Pages при пуші в гілку `main`.

**URL:** `https://vlad-demchyk.github.io/FormatX/`

### CI/CD Pipeline

Налаштований через GitHub Actions (або інший CI):
1. Встановлює `GITHUB_PAGES=true`
2. `npm ci`
3. `npm run build`
4. Деплой в `gh-pages` гілку

## Vite конфігурація

```typescript
// vite.config.ts
server: {
  port: 1420,
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
      },
    },
  },
},
```

### Ручне розділення чанків (manualChunks)
- `heic-to` → окремий chunk (WASM модуль)
- `sql.js` / `sql-wasm` → окремий chunk (великий WASM модуль)

## Tauri

Tauri (`@tauri-apps/cli`) присутній в devDependencies, але **більше не підтримується**. Всі Tauri-специфічні компоненти (`useIsTauri`, `useHotkey`) є заглушками.
