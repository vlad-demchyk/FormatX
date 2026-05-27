export type ThemeMode = "light" | "dark";
export type AppLocale = "uk" | "it" | "en";
export type TabRoute = "photo" | "documents" | "text" | "clipboard";

export interface AppSettings {
  locale: AppLocale;
  theme: ThemeMode;
  pwaInstallDismissed: boolean;
  lastTab: TabRoute;
  closeToTray: boolean;
  notificationsEnabled: boolean;
}

export interface HistoryItem {
  id: string;
  type: "image";
  filename: string;
  mime: string;
  size: number;
  blobBase64: string | null;
  createdAt: number;
  expiresAt: number;
}

export interface TextSnippet {
  id: string;
  inputPreview: string;
  outputText: string;
  createdAt: number;
}
