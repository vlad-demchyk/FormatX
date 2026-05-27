import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  initStorage,
  getSettings,
  saveSettings,
  purgeExpired,
  addHistoryItem,
  listHistory,
  clearHistory,
  deleteHistoryItem,
  addTextSnippet,
  listTextSnippets,
  type AppSettings,
  type HistoryItem,
  type TextSnippet,
} from "../../lib/storage";

interface StorageContextValue {
  ready: boolean;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (s: AppSettings) => Promise<void>;
  purgeExpired: () => Promise<void>;
  addHistoryItem: (
    item: Omit<HistoryItem, "createdAt" | "expiresAt"> & { createdAt?: number },
  ) => Promise<void>;
  listHistory: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
  addTextSnippet: (input: string, output: string) => Promise<void>;
  listTextSnippets: () => Promise<TextSnippet[]>;
}

const StorageCtx = createContext<StorageContextValue | null>(null);

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageCtx);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}

export function StorageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void initStorage().then(() => setReady(true));
  }, []);

  if (!ready) {
    return <div style={{ padding: 24, fontFamily: "system-ui" }}>FormatX loading…</div>;
  }

  return (
    <StorageCtx.Provider
      value={{
        ready,
        getSettings,
        saveSettings,
        purgeExpired,
        addHistoryItem,
        listHistory,
        clearHistory,
        deleteHistoryItem,
        addTextSnippet,
        listTextSnippets,
      }}
    >
      {children}
    </StorageCtx.Provider>
  );
}
