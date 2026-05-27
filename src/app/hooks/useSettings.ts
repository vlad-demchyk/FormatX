import { useCallback, useEffect, useState } from "react";
import {
  getSettings,
  saveSettings,
  type AppLocale,
  type AppSettings,
  type ThemeMode,
  type TabRoute,
} from "../../lib/storage";

interface UseSettingsReturn {
  settings: AppSettings;
  ready: boolean;
  updateLocale: (locale: AppLocale) => Promise<void>;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  updateLastTab: (tab: TabRoute) => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>({
    locale: "uk",
    theme: "light",
    pwaInstallDismissed: false,
    lastTab: "photo",
    closeToTray: true,
    notificationsEnabled: true,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getSettings().then((s) => {
      setSettings(s);
      setReady(true);
    });
  }, []);

  const updateLocale = useCallback(async (locale: AppLocale) => {
    const updated = { ...settings, locale };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const updateTheme = useCallback(async (theme: ThemeMode) => {
    const updated = { ...settings, theme };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const updateLastTab = useCallback(async (lastTab: TabRoute) => {
    const updated = { ...settings, lastTab };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  }, [settings]);

  return { settings, ready, updateLocale, updateTheme, updateLastTab, updateSetting };
}
