import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../../lib/clipboard";
import { showToast } from "../../app/toast";
import { closeIcon } from "../../app/icons";
import { loadClipboard, clearClipboard, removeClipboardEntry } from "./storage";
import type { ClipboardEntry } from "./storage";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function ClipboardPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ClipboardEntry[]>(() => loadClipboard());

  // Web: show desktop-only message
  if (!isTauri()) {
    return (
      <>
        <h2>{t("clipboard.title")}</h2>
        <div className="card" style={{ marginTop: 16, padding: "24px 16px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", margin: 0 }}>
            {t("clipboard.desktopOnly")}
          </p>
        </div>
      </>
    );
  }

  const refresh = useCallback(() => setEntries(loadClipboard()), []);

  // Re-read when tab becomes visible
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleCopy = useCallback(async (text: string) => {
    if (await copyText(text)) {
      showToast("toast.copied");
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    setEntries(removeClipboardEntry(id));
  }, []);

  const handleClear = useCallback(() => {
    clearClipboard();
    setEntries([]);
    showToast("toast.cleared");
  }, []);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2>{t("clipboard.title")}</h2>
        {entries.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={handleClear}>
            {t("clipboard.clear")}
          </button>
        )}
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
        {t("clipboard.hint")}
      </p>
      <div className="clipboard-list">
        {entries.map((entry) => (
          <div key={entry.id} className="clipboard-item">
            <div className="clipboard-item__meta">
              <span className="clipboard-item__time">
                {formatTime(entry.createdAt)}
              </span>
            </div>
            <pre className="clipboard-item__text">{entry.text}</pre>
            <div className="clipboard-item__actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleCopy(entry.text)}
              >
                {t("clipboard.copyBtn")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => handleDelete(entry.id)}
              >
                <span dangerouslySetInnerHTML={{ __html: closeIcon }} />
              </button>
            </div>
          </div>
        ))}
        {!entries.length && (
          <p className="empty-state">{t("clipboard.empty")}</p>
        )}
      </div>
    </>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return new Date(ts).toLocaleDateString();
}
