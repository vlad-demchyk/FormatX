import { downloadBlob } from "../../lib/download";
import {
  clearHistory,
  deleteHistoryItem,
  listHistory,
  type AppLocale,
  type ThemeMode,
} from "../../lib/storage";
import { applyLocale, applyTheme, loadSettings } from "../settings";
import { t } from "../i18n";
import { showToast } from "../toast";

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function renderAccount(root: HTMLElement): void {
  root.innerHTML = `
    <h2>${t("account.title")}</h2>
    <div class="card">
      <h3>${t("account.settings")}</h3>
      <div class="images-row">
        <div class="field"><label for="accTheme">${t("theme.light")} / ${t("theme.dark")}</label>
          <select id="accTheme">
            <option value="light">${t("theme.light")}</option>
            <option value="dark">${t("theme.dark")}</option>
          </select></div>
        <div class="field"><label for="accLocale">Language</label>
          <select id="accLocale">
            <option value="uk">${t("locale.uk")}</option>
            <option value="it">${t("locale.it")}</option>
            <option value="en">${t("locale.en")}</option>
          </select></div>
      </div>
      <p style="color:var(--text-muted);font-size:0.9rem">${t("account.pwaHint")}</p>
    </div>
    <div class="card" style="margin-top:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <h3 style="margin:0">${t("account.history")}</h3>
        <button type="button" class="btn btn-secondary" id="btnClearHistory">${t("account.clearHistory")}</button>
      </div>
      <div id="historyList" class="account-list"></div>
      <p id="historyEmpty" class="empty-state">${t("account.noHistory")}</p>
    </div>
  `;

  const themeSel = root.querySelector("#accTheme") as HTMLSelectElement;
  const localeSel = root.querySelector("#accLocale") as HTMLSelectElement;
  void loadSettings().then((s) => {
    themeSel.value = s.theme;
    localeSel.value = s.locale;
  });

  themeSel.addEventListener("change", async () => {
    await applyTheme(themeSel.value as ThemeMode);
    showToast("toast.saved");
  });
  localeSel.addEventListener("change", async () => {
    await applyLocale(localeSel.value as AppLocale);
    document.documentElement.lang = localeSel.value;
    window.location.reload();
  });

  async function refreshHistory(): Promise<void> {
    const items = await listHistory();
    const list = root.querySelector("#historyList") as HTMLElement;
    const empty = root.querySelector("#historyEmpty") as HTMLElement;
    list.innerHTML = "";
    empty.style.display = items.length ? "none" : "block";
    for (const item of items) {
      const row = document.createElement("div");
      row.className = "account-item";
      const date = new Date(item.createdAt).toLocaleString();
      row.innerHTML = `<div><strong>${item.filename}</strong><br><span style="font-size:0.8rem;color:var(--text-muted)">${date} · ${(item.size / 1024).toFixed(0)} KB</span></div>`;
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.gap = "8px";
      if (item.blobBase64) {
        const dl = document.createElement("button");
        dl.type = "button";
        dl.className = "btn btn-primary";
        dl.textContent = t("images.download");
        dl.addEventListener("click", () => {
          downloadBlob(base64ToBlob(item.blobBase64!, item.mime), item.filename);
        });
        actions.appendChild(dl);
      }
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn btn-ghost";
      rm.textContent = "×";
      rm.addEventListener("click", async () => {
        await deleteHistoryItem(item.id);
        await refreshHistory();
      });
      actions.appendChild(rm);
      row.appendChild(actions);
      list.appendChild(row);
    }
  }

  root.querySelector("#btnClearHistory")?.addEventListener("click", async () => {
    await clearHistory();
    showToast("toast.cleared");
    await refreshHistory();
  });

  void refreshHistory();
}
