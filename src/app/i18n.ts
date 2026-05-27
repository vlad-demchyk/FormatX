import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import uk from "../locales/uk.json";
import en from "../locales/en.json";
import it from "../locales/it.json";
import type { AppLocale } from "../lib/storage/types";

const resources = {
  uk: { translation: uk },
  en: { translation: en },
  it: { translation: it },
};

let ready = false;

export async function initI18n(locale?: AppLocale): Promise<void> {
  if (ready) {
    if (locale) await i18n.changeLanguage(locale);
    return;
  }
  await i18n.use(LanguageDetector).init({
    resources,
    fallbackLng: "uk",
    lng: locale,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });
  ready = true;
}

export function t(key: string): string {
  return i18n.t(key);
}

export async function setLocale(locale: AppLocale): Promise<void> {
  await i18n.changeLanguage(locale);
}

export function onLanguageChanged(cb: () => void): void {
  i18n.on("languageChanged", cb);
}

export { i18n };
