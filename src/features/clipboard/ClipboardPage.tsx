import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../../lib/clipboard";
import { showToast } from "../../app/toast";
import { closeIcon } from "../../app/icons";
import { loadClipboard, clearClipboard, removeClipboardEntry, addClipboardEntry } from "./storage";
import type { ClipboardEntry } from "./storage";
import { loadPinned, addPinnedEntry, removePinnedEntry, clearPinned } from "./pinnedStorage";
import type { PinnedEntry } from "./pinnedStorage";
import { PreviewModal } from "../../components/PreviewModal";
import rawViewIcon from "/assets/icons/lsicon_view-filled.svg?raw";
import { pinIcon } from "./pinIcon";

const viewIcon = rawViewIcon
  .replace(/fill="#6366F1"/gi, 'fill="var(--brand-accent)"')
  .replace(/stroke="#6366F1"/gi, 'stroke="var(--brand-accent)"')
  .replace(/\s(width|height)="\d+"/g, " ");

type ClipTab = "clipboard" | "pinned";

export function ClipboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ClipTab>("clipboard");
  const [entries, setEntries] = useState<ClipboardEntry[]>(() => loadClipboard());
  const [pinned, setPinned] = useState<PinnedEntry[]>(() => loadPinned());
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);
  const [pinText, setPinText] = useState("");
  const pinFileRef = useRef<HTMLInputElement>(null);

  function dataUrlToBlob(dataUrl: string): Blob {
    const [header, b64] = dataUrl.split(",", 2);
    const mime = header?.split(":")[1]?.split(";")[0] || "application/octet-stream";
    const raw = atob(b64 || "");
    const buf = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    return new Blob([buf], { type: mime });
  }

  const refresh = useCallback(() => {
    setEntries(loadClipboard());
    setPinned(loadPinned());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  /* ── Capture system copy / paste across the whole app ── */
  useEffect(() => {
    const onCopy = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text) {
        setEntries(addClipboardEntry(text));
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text) {
        setTimeout(() => setEntries(addClipboardEntry(text)), 0);
      }
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  /* ── Clipboard actions ── */
  const handleCopy = useCallback(async (text: string) => {
    if (await copyText(text)) showToast("toast.copied");
  }, []);

  const handleDeleteClip = useCallback((id: string) => {
    setEntries(removeClipboardEntry(id));
  }, []);

  const handleClearClip = useCallback(() => {
    clearClipboard();
    setEntries([]);
    showToast("toast.cleared");
  }, []);

  /* ── Pin / unpin ── */
  const handlePin = useCallback((text: string) => {
    const updated = addPinnedEntry({ type: "text", label: text.slice(0, 60), content: text });
    setPinned(updated);
    showToast("toast.pinned");
  }, []);

  const handleUnpin = useCallback((id: string) => {
    setPinned(removePinnedEntry(id));
    showToast("toast.cleared");
  }, []);

  const handleClearPinned = useCallback(() => {
    clearPinned();
    setPinned([]);
    showToast("toast.cleared");
  }, []);

  const handlePinText = useCallback(() => {
    const text = pinText.trim();
    if (!text) return;
    const updated = addPinnedEntry({ type: "text", label: text.slice(0, 60), content: text });
    setPinned(updated);
    setPinText("");
    showToast("toast.saved");
  }, [pinText]);

  const handlePinFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const type = file.type.startsWith("image/") ? "image" : "document";
      const updated = addPinnedEntry({ type, label: file.name, content: dataUrl, mime: file.type, size: file.size });
      setPinned(updated);
      showToast("toast.saved");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2>{t("clipboard.title")}</h2>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            className={`btn btn-sm ${tab === "clipboard" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("clipboard")}
          >
            {t("clipboard.tabClipboard")}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${tab === "pinned" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab("pinned")}
          >
            {t("clipboard.tabPinned")}
          </button>
        </div>
      </div>

      {tab === "clipboard" && (
        <>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 8, marginBottom: 12 }}>
            {t("clipboard.hint")}
          </p>
          {entries.length > 0 && (
            <button type="button" className="btn btn-secondary" onClick={handleClearClip} style={{ marginBottom: 12 }}>
              {t("clipboard.clear")}
            </button>
          )}
          <div className="clipboard-list">
            {entries.map((entry) => (
              <div key={entry.id} className="clipboard-item">
                <div className="clipboard-item__meta">
                  <span className="clipboard-item__time">{formatTime(entry.createdAt)}</span>
                </div>
                <pre className="clipboard-item__text">{entry.text}</pre>
                <div className="clipboard-item__actions">
                  <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handlePin(entry.text)} title={t("clipboard.pinBtn")}>
                    <span dangerouslySetInnerHTML={{ __html: pinIcon }} style={{ display: "flex", width: 16, height: 16 }} />
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCopy(entry.text)}>
                    {t("clipboard.copyBtn")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteClip(entry.id)}>
                    <span dangerouslySetInnerHTML={{ __html: closeIcon }} />
                  </button>
                </div>
              </div>
            ))}
            {!entries.length && <p className="empty-state">{t("clipboard.empty")}</p>}
          </div>
        </>
      )}

      {tab === "pinned" && (
        <>
          <div className="card" style={{ marginTop: 8, padding: "16px" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>{t("clipboard.pinnedHint")}</p>
            <textarea
              value={pinText}
              onChange={(e) => setPinText(e.target.value)}
              placeholder={t("clipboard.hint")}
              rows={2}
              style={{
                width: "100%", resize: "vertical",
                font: "inherit", fontSize: "0.9rem",
                padding: "10px 12px",
                border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--surface)", color: "var(--text)",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={handlePinText} disabled={!pinText.trim()}>
                {t("clipboard.copyBtn")}
              </button>
              <label className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                📎 {t("images.drop")}
                <input ref={pinFileRef} type="file" accept="image/*,.pdf,.docx,.doc,.txt,.md" onChange={handlePinFile} style={{ display: "none" }} />
              </label>
              {pinned.length > 0 && (
                <button type="button" className="btn btn-ghost" onClick={handleClearPinned}>
                  {t("clipboard.clear")}
                </button>
              )}
            </div>
          </div>
          <div className="clipboard-list">
            {pinned.map((entry) => (
              <div key={entry.id} className="clipboard-item">
                <div className="clipboard-item__meta">
                  <span className="clipboard-item__time">
                    {entry.type === "text" ? "📝" : entry.type === "image" ? "🖼️" : "📄"}
                    {" · "}
                    {formatTime(entry.createdAt)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: 8 }}>{entry.label}</span>
                </div>

                {/* Type-specific content */}
                {entry.type === "image" && (
                  <div
                    style={{
                      width: "100%", height: 200, overflow: "hidden",
                      borderRadius: 6, margin: "4px 0",
                      cursor: "pointer", background: "var(--surface)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    onClick={() =>
                      setPreviewItem({
                        blob: dataUrlToBlob(entry.content),
                        name: entry.label,
                      })
                    }
                  >
                    <img
                      src={entry.content}
                      alt={entry.label}
                      style={{ height: "100%", width: "auto", display: "block", borderRadius: 6, objectFit: "contain" }}
                    />
                  </div>
                )}
                {entry.type === "document" && (
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "8px 0", cursor: "pointer",
                    }}
                    onClick={() =>
                      setPreviewItem({
                        blob: dataUrlToBlob(entry.content),
                        name: entry.label,
                      })
                    }
                  >
                    <span style={{ fontSize: "1.5rem" }}>📄</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {entry.label}
                    </span>
                  </div>
                )}
                {entry.type === "text" && (
                  <pre className="clipboard-item__text">{entry.content}</pre>
                )}

                <div className="clipboard-item__actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCopy(entry.content)}>
                    {t("clipboard.copyBtn")}
                  </button>
                  {(entry.type === "image" || entry.type === "document") && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-icon"
                      title={t("account.preview")}
                      onClick={() =>
                        setPreviewItem({
                          blob: dataUrlToBlob(entry.content),
                          name: entry.label,
                        })
                      }
                    >
                      <span dangerouslySetInnerHTML={{ __html: viewIcon }} style={{ display: "flex", width: 18, height: 18 }} />
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleUnpin(entry.id)}>
                    {t("clipboard.unpinBtn")}
                  </button>
                </div>
              </div>
            ))}
            {!pinned.length && <p className="empty-state">{t("clipboard.pinnedEmpty")}</p>}
          </div>

          {/* Preview modal */}
          <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
        </>
      )}
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
