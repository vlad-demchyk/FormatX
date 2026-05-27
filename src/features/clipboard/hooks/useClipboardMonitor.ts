import { useEffect, useRef, useState, useCallback } from "react";
import { loadClipboard, addClipboardEntry } from "../storage";
import { showNotification } from "../../../lib/notifications";
import type { ClipboardEntry } from "../storage";

interface ClipboardMonitorResult {
  entries: ClipboardEntry[];
  latestEntry: ClipboardEntry | null;
  refresh: () => void;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let tauriReadText: (() => Promise<string>) | null = null;

async function ensureTauriClipboard() {
  if (!tauriReadText) {
    try {
      const mod = await import("@tauri-apps/plugin-clipboard-manager");
      tauriReadText = mod.readText;
    } catch {
      tauriReadText = null;
    }
  }
}

export function useClipboardMonitor(): ClipboardMonitorResult {
  const [entries, setEntries] = useState<ClipboardEntry[]>(() => loadClipboard());
  const [latestEntry, setLatestEntry] = useState<ClipboardEntry | null>(null);
  const lastTextRef = useRef<string>("");
  const mountedRef = useRef(true);

  const refresh = useCallback(() => {
    setEntries(loadClipboard());
  }, []);

  const captureText = useCallback((rawText: string) => {
    const text = rawText.trim();
    if (!text || text === lastTextRef.current) return;
    lastTextRef.current = text;
    const updated = addClipboardEntry(text);
    if (mountedRef.current) {
      setEntries(updated);
      setLatestEntry(updated[0] || null);
    }
    // Native OS notification (Tauri desktop + Browser Notification API)
    const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;
    void showNotification("📋 FormatX", preview);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // --- Browser: listen for copy events ---
    const handleCopy = () => {
      const text = window.getSelection()?.toString() || "";
      if (text && text !== lastTextRef.current) {
        setTimeout(() => captureText(text), 100);
      }
    };
    document.addEventListener("copy", handleCopy);

    // --- Tauri Desktop: poll system clipboard every 1.5s ---
    // Works even when minimized to tray (OS-level access)
    let tauriInterval: ReturnType<typeof setInterval> | undefined;

    if (isTauri()) {
      void ensureTauriClipboard();
      tauriInterval = setInterval(async () => {
        try {
          if (!tauriReadText) return;
          const text = await tauriReadText();
          captureText(text);
        } catch {
          // Silent — clipboard read may fail temporarily
        }
      }, 1500);
    }

    // --- Browser: periodic clipboard read ---
    // Тільки коли таб активний (обмеження безпеки браузера).
    // При поверненні на таб — читаємо одразу через visibilitychange.
    const readClipboardBrowser = async () => {
      if (isTauri()) return;
      try {
        if (!navigator.clipboard?.read) return;
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            const text = await blob.text();
            captureText(text);
          }
        }
      } catch {
        // Clipboard read may be denied — silent
      }
    };

    // Read when tab becomes visible
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) void readClipboardBrowser();
    });

    // Periodic poll every 3s (only succeeds if tab is active)
    const browserInterval = setInterval(readClipboardBrowser, 3000);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("visibilitychange", readClipboardBrowser);
      if (tauriInterval) clearInterval(tauriInterval);
      clearInterval(browserInterval);
    };
  }, [captureText]);

  return { entries, latestEntry, refresh };
}
