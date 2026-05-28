import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../../lib/clipboard";
import { downloadBlob } from "../../lib/download";
import { showToast } from "../../app/toast";
import { closeIcon } from "../../app/icons";
import { loadClipboard, clearClipboard, removeClipboardEntry, addClipboardEntry } from "./storage";
import type { ClipboardEntry } from "./storage";
import { loadPinned, removePinnedEntry, clearPinned, getPinnedBlob } from "./pinnedStorage";
import type { PinnedEntry } from "./pinnedStorage";
import { PreviewModal } from "../../components/PreviewModal";
import rawViewIcon from "/assets/icons/lsicon_view-filled.svg?raw";
import rawUploadIcon from "/assets/icons/material-symbols_upload-rounded.svg?raw";
import rawPhotoIcon from "/assets/icons/tabler_photo.svg?raw";
import rawDocsIcon from "/assets/icons/material-symbols_docs.svg?raw";
import rawTextIcon from "/assets/icons/solar_text-bold.svg?raw";
import { pinIcon } from "./pinIcon";
import { pinWithCheck } from "./pinWithCheck";

function themedSvg(raw: string): string {
  return raw
    .replace(/fill="#6366F1"/gi, 'fill="currentColor"')
    .replace(/stroke="#6366F1"/gi, 'stroke="currentColor"')
    .replace(/\s(width|height)="\d+"/g, " ");
}

const viewIcon = rawViewIcon
  .replace(/fill="#6366F1"/gi, 'fill="var(--brand-accent)"')
  .replace(/stroke="#6366F1"/gi, 'stroke="var(--brand-accent)"')
  .replace(/\s(width|height)="\d+"/g, " ");

const uploadIcon = themedSvg(rawUploadIcon);
const photoIcon = themedSvg(rawPhotoIcon);
const docsIcon = themedSvg(rawDocsIcon);
const textIcon = themedSvg(rawTextIcon);

type ClipTab = "clipboard" | "pinned";

type PinnedDisplay = PinnedEntry & { thumbUrl?: string };

export function ClipboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ClipTab>("clipboard");
  const [entries, setEntries] = useState<ClipboardEntry[]>(() => loadClipboard());
  const [pinned, setPinned] = useState<PinnedDisplay[]>([]);
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);
  const [pinText, setPinText] = useState("");
  const pinFileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setEntries(loadClipboard());
    const p = await loadPinned();

    // Load thumbnails for image entries
    const display: PinnedDisplay[] = await Promise.all(
      p.map(async (entry) => {
        if (entry.type === "image") {
          const blob = await getPinnedBlob(entry.id);
          if (blob) {
            return { ...entry, thumbUrl: URL.createObjectURL(blob) };
          }
        }
        return entry;
      }),
    );

    // Revoke old thumbnail URLs
    setPinned((prev) => {
      for (const old of prev) {
        if (old.thumbUrl) URL.revokeObjectURL(old.thumbUrl);
      }
      return display;
    });
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  // Try to read from the system clipboard when this page is opened
  // (user gesture from tab click allows clipboard.readText())
  useEffect(() => {
    let cancelled = false;
    async function tryRead() {
      try {
        const text = await navigator.clipboard.readText();
        if (!cancelled && text.trim()) {
          const entries = addClipboardEntry(text.trim());
          setEntries(entries);
        }
      } catch {
        // Silently fail — clipboard read needs permission or user gesture
      }
    }
    tryRead();
    return () => { cancelled = true; };
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
  const handlePin = useCallback(async (text: string) => {
    const updated = await pinWithCheck({ type: "text", label: text.slice(0, 60), content: text });
    if (updated) setPinned(updated);
  }, []);

  const handleUnpin = useCallback(async (id: string) => {
    const updated = await removePinnedEntry(id);
    setPinned(updated);
    showToast("toast.cleared");
  }, []);

  const handleClearPinned = useCallback(async () => {
    await clearPinned();
    setPinned([]);
    showToast("toast.cleared");
  }, []);

  /* ── Pinned item actions ── */
  const handleDownloadPinned = useCallback(async (entry: PinnedEntry) => {
    let blob: Blob;
    if (entry.type === "text") {
      blob = new Blob([entry.content], { type: "text/plain" });
    } else {
      const b = await getPinnedBlob(entry.id);
      if (!b) return;
      blob = b;
    }
    const ext = entry.mime
      ? `.${entry.mime.split("/")[1]?.replace("+", ".") || "bin"}`
      : "";
    const name = entry.label.includes(".") ? entry.label : `${entry.label}${ext}`;
    downloadBlob(blob, name);
  }, []);

  const handleCopyPinned = useCallback(async (entry: PinnedEntry) => {
    if (entry.type === "text") {
      if (await copyText(entry.content)) showToast("toast.copied");
      return;
    }
    if (entry.type === "image") {
      try {
        const blob = await getPinnedBlob(entry.id);
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob }),
        ]);
        showToast("toast.copied");
        return;
      } catch {
        void handleDownloadPinned(entry);
        return;
      }
    }
    void handleDownloadPinned(entry);
  }, [handleDownloadPinned]);

  const handlePreviewPinned = useCallback(async (entry: PinnedEntry) => {
    if (entry.type === "text") return;
    const blob = await getPinnedBlob(entry.id);
    if (blob) {
      setPreviewItem({ blob, name: entry.label });
    }
  }, []);

  const handlePinText = useCallback(async () => {
    const text = pinText.trim();
    if (!text) return;
    const updated = await pinWithCheck({ type: "text", label: text.slice(0, 60), content: text });
    if (updated) {
      setPinned(updated);
      setPinText("");
    }
  }, [pinText]);

  const handlePinFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const type = file.type.startsWith("image/") ? "image" : "document";
      const updated = await pinWithCheck({ type, label: file.name, content: dataUrl, mime: file.type, size: file.size });
      if (updated) setPinned(updated);
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
              <button type="button" className="btn btn-primary" onClick={handlePinText} disabled={!pinText.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span dangerouslySetInnerHTML={{ __html: pinIcon }} style={{ display: "flex", width: 16, height: 16 }} />
                {t("clipboard.pinBtn")}
              </button>
              <label className="btn btn-secondary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span dangerouslySetInnerHTML={{ __html: uploadIcon }} style={{ display: "flex", width: 18, height: 18 }} />
                {t("images.drop")}
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
                  <span className="clipboard-item__time" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {entry.type === "text" ? (
                      <span dangerouslySetInnerHTML={{ __html: textIcon }} style={{ display: "flex", width: 14, height: 14, flexShrink: 0 }} />
                    ) : entry.type === "image" ? (
                      <span dangerouslySetInnerHTML={{ __html: photoIcon }} style={{ display: "flex", width: 14, height: 14, flexShrink: 0 }} />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: docsIcon }} style={{ display: "flex", width: 14, height: 14, flexShrink: 0 }} />
                    )}
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
                    onClick={() => handlePreviewPinned(entry)}
                  >
                    <img
                      src={entry.thumbUrl || entry.content}
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
                    onClick={() => handlePreviewPinned(entry)}
                  >
                    <span style={{ display: "flex", width: 24, height: 24, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: docsIcon }} />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                      {entry.label}
                    </span>
                  </div>
                )}
                {entry.type === "text" && (
                  <pre className="clipboard-item__text">{entry.content}</pre>
                )}

                <div className="clipboard-item__actions">
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => handleCopyPinned(entry)}>
                    {entry.type === "text" ? t("clipboard.copyBtn") : t("images.download")}
                  </button>
                  {(entry.type === "image" || entry.type === "document") && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        title={t("account.preview")}
                        onClick={() => handlePreviewPinned(entry)}
                      >
                        <span dangerouslySetInnerHTML={{ __html: viewIcon }} style={{ display: "flex", width: 18, height: 18 }} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title={t("images.download")}
                        onClick={() => handleDownloadPinned(entry)}
                      >
                        {t("images.download")}
                      </button>
                    </>
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
