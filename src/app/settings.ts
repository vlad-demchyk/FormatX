import { getSettings, saveSettings, type AppLocale, type AppSettings, type ThemeMode } from "../lib/storage";
import { setLocale } from "./i18n";

export async function loadSettings(): Promise<AppSettings> {
  return getSettings();
}

export async function applyTheme(theme: ThemeMode): Promise<void> {
  document.documentElement.setAttribute("data-theme", theme);
  const settings = await getSettings();
  await saveSettings({ ...settings, theme });
}

export async function applyLocale(locale: AppLocale): Promise<void> {
  await setLocale(locale);
  const settings = await getSettings();
  await saveSettings({ ...settings, locale });
}
