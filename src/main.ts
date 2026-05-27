import "./styles/app.css";
import { initApp } from "./app/shell";

initApp().catch((err) => {
  console.error("[FormatX] init failed:", err);
  const app = document.getElementById("app");
  const message = err instanceof Error ? err.message : String(err);
  const html = `
    <div class="boot-error" style="padding:24px;font-family:system-ui;max-width:480px;margin:40px auto;">
      <h1 style="font-size:1.25rem;margin:0 0 12px;">FormatX</h1>
      <p style="color:#5f6368;margin:0 0 16px;">Не вдалося запустити застосунок.</p>
      <pre style="background:#f1f3f4;padding:12px;border-radius:8px;overflow:auto;font-size:0.8rem;">${message}</pre>
    </div>
  `;
  if (app) app.innerHTML = html;
  else document.body.insertAdjacentHTML("beforeend", html);
});
