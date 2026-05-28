import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../app/providers/ThemeProvider";
import {
  type AppLocale,
  type AppSettings,
  type LlmProvider,
} from "../../lib/storage";
import { showToast } from "../../app/toast";
import { useStorage } from "../../app/providers/StorageProvider";

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { getSettings, saveSettings } = useStorage();
  const [locale, setLocaleState] = useState<AppLocale>("uk");
  const [settings, setSettingsState] = useState<AppSettings | null>(null);

  useEffect(() => {
    void getSettings().then((s) => {
      setLocaleState(s.locale);
      setSettingsState(s);
    });
  }, [getSettings]);

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
    async (key: "notificationsEnabled" | "llm") => {
      if (!settings) return;
      if (key === "llm") {
        const updated = {
          ...settings,
          llm: { ...settings.llm, enabled: !settings.llm.enabled },
        };
        setSettingsState(updated);
        await saveSettings(updated);
      } else {
        const updated = { ...settings, [key]: !settings[key] };
        setSettingsState(updated);
        await saveSettings(updated);
      }
      showToast("toast.saved");
    },
    [settings, saveSettings],
  );

  const handleLlmChange = useCallback(
    async (field: "provider" | "endpoint" | "apiKey" | "model" | "enabled", value: string | boolean) => {
      if (!settings) return;
      const updated = {
        ...settings,
        llm: { ...settings.llm, [field]: value },
      };
      setSettingsState(updated);
      await saveSettings(updated);
    },
    [settings, saveSettings],
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
        <h3>{t("account.llm")}</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          {t("account.llmDesc")}
        </p>
        <label className="toggle-row" style={{ marginBottom: 16 }}>
          <span>{t("account.llmEnable")}</span>
          <input
            type="checkbox"
            checked={settings?.llm.enabled ?? false}
            onChange={() => handleToggle("llm")}
          />
        </label>
        {settings?.llm.enabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="field">
              <label htmlFor="llmProvider">{t("account.llmProvider")}</label>
              <select
                id="llmProvider"
                value={settings.llm.provider}
                onChange={(e) => handleLlmChange("provider", e.target.value as LlmProvider)}
              >
                <option value="ollama">{t("account.llmProviderOllama")}</option>
                <option value="openai">{t("account.llmProviderOpenai")}</option>
                <option value="anthropic">{t("account.llmProviderAnthropic")}</option>
                <option value="custom">{t("account.llmProviderCustom")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="llmEndpoint">{t("account.llmEndpoint")}</label>
              <input
                id="llmEndpoint"
                type="text"
                value={settings.llm.endpoint}
                placeholder={t("account.llmEndpointPlaceholder")}
                onChange={(e) => handleLlmChange("endpoint", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="llmApiKey">{t("account.llmApiKey")}</label>
              <input
                id="llmApiKey"
                type="password"
                value={settings.llm.apiKey}
                placeholder={t("account.llmApiKeyPlaceholder")}
                onChange={(e) => handleLlmChange("apiKey", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="llmModel">{t("account.llmModel")}</label>
              <input
                id="llmModel"
                type="text"
                value={settings.llm.model}
                placeholder={t("account.llmModelPlaceholder")}
                onChange={(e) => handleLlmChange("model", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
