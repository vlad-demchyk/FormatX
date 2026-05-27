import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../app/providers/ThemeProvider";
import {
  clearHistory,
  deleteHistoryItem,
  listHistory,
  type AppLocale,
  type AppSettings,
  type HistoryItem,
} from "../../lib/storage";
import { downloadBlob } from "../../lib/download";
import { showToast } from "../../app/toast";
import { useStorage } from "../../app/providers/StorageProvider";

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { getSettings, saveSettings } = useStorage();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [locale, setLocaleState] = useState<AppLocale>("uk");
  const [settings, setSettingsState] = useState<AppSettings | null>(null);

  useEffect(() => {
    void getSettings().then((s) => {
      setLocaleState(s.locale);
      setSettingsState(s);
    });
  }, [getSettings]);

  const refreshHistory = useCallback(async () => {
    setItems(await listHistory());
  }, []);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const handleTheme = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      await setTheme(e.target.value as "light" | "dark");
      showToast("toast.saved");
    },
    [setTheme],
  );

  const handleLocale = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const loc = e.target.value as AppLocale;
      setLocaleState(loc);
      const s = await getSettings();
      await saveSettings({ ...s, locale: loc });
      await i18n.changeLanguage(loc);
      document.documentElement.lang = loc;
      window.location.reload();
    },
    [getSettings, saveSettings, i18n],
  );

  const handleToggle = useCallback(
    async (key: "closeToTray" | "notificationsEnabled") => {
      if (!settings) return;
      const updated = { ...settings, [key]: !settings[key] };
      setSettingsState(updated);
      await saveSettings(updated);
      showToast("toast.saved");
    },
    [settings, saveSettings],
  );

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    showToast("toast.cleared");
    await refreshHistory();
  }, [refreshHistory]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteHistoryItem(id);
      await refreshHistory();
    },
    [refreshHistory],
  );

  return (
    <>
      <h2>{t("account.title")}</h2>
      <div className="card">
        <h3>{t("account.settings")}</h3>
        <div className="images-row">
          <div className="field">
            <label htmlFor="accTheme">{t("theme.light")} / {t("theme.dark")}</label>
            <select id="accTheme" value={theme} onChange={handleTheme}>
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="accLocale">Language</label>
            <select id="accLocale" value={locale} onChange={handleLocale}>
              <option value="uk">{t("locale.uk")}</option>
              <option value="it">{t("locale.it")}</option>
              <option value="en">{t("locale.en")}</option>
            </select>
          </div>
        </div>
        <div className="settings-toggles">
          <label className="toggle-row">
            <span>{t("account.trayLabel")}</span>
            <input
              type="checkbox"
              checked={settings?.closeToTray ?? true}
              onChange={() => handleToggle("closeToTray")}
            />
          </label>
          <label className="toggle-row">
            <span>{t("account.notifLabel")}</span>
            <input
              type="checkbox"
              checked={settings?.notificationsEnabled ?? true}
              onChange={() => handleToggle("notificationsEnabled")}
            />
          </label>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{t("account.pwaHint")}</p>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("account.history")}</h3>
          <button type="button" className="btn btn-secondary" onClick={handleClearHistory}>
            {t("account.clearHistory")}
          </button>
        </div>
        <div className="account-list">
          {items.map((item) => (
            <div key={item.id} className="account-item">
              <div>
                <strong>{item.filename}</strong>
                <br />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {new Date(item.createdAt).toLocaleString()} · {(item.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {item.blobBase64 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => downloadBlob(base64ToBlob(item.blobBase64!, item.mime), item.filename)}
                  >
                    {t("images.download")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleDelete(item.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        {!items.length && <p className="empty-state">{t("account.noHistory")}</p>}
      </div>
    </>
  );
}
