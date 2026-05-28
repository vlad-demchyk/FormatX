import type { AppSettings, SanitizerSettings, LlmConfig } from "./types";

const SETTINGS_KEY = "formatx-settings";

function defaultSanitizer(): SanitizerSettings {
  return {
    mode: "replace",
    formatMode: "titleCase",
    charToReplace: "/",
    replaceWith: "space",
    spacing: "none",
    removeArgs: 0,
    removeTrailing: 0,
  };
}

function defaultLlm(): LlmConfig {
  return {
    provider: "ollama",
    endpoint: "http://localhost:11434",
    apiKey: "",
    model: "llama3.2",
    enabled: false,
  };
}

function defaultSettings(): AppSettings {
  return {
    locale: "uk",
    theme: "light",
    pwaInstallDismissed: false,
    lastTab: "photo",
    closeToTray: true,
    notificationsEnabled: true,
    sanitizer: defaultSanitizer(),
    hotkey: "ctrl+shift+v",
    llm: defaultLlm(),
  };
}

export async function getSettings(): Promise<AppSettings> {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings();
  const defaults = defaultSettings();
  const saved = JSON.parse(raw);
  const parsed = { ...defaults, ...saved } as AppSettings;
  if (parsed.lastTab !== "photo" && parsed.lastTab !== "text" && parsed.lastTab !== "documents") {
    parsed.lastTab = "photo";
  }
  parsed.sanitizer = { ...defaults.sanitizer, ...(saved.sanitizer || {}) };
  parsed.llm = { ...defaults.llm, ...(saved.llm || {}) };
  return parsed;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
