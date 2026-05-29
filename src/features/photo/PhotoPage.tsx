import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImageQueue } from "./hooks/useImageQueue";
import { useAnimationController } from "./hooks/useAnimationController";
import { DropZone } from "./components/DropZone";
import { QueueList } from "./components/QueueList";
import { Toolbar } from "./components/Toolbar";
import { PreviewModal } from "../../components/PreviewModal";
import type { QueueItem } from "../images/types";
import { showNotification } from "../../lib/notifications";
import { listHistory, clearHistory, deleteHistoryItem, type HistoryItem } from "../../lib/db";
import { downloadBlob } from "../../lib/download";
import { showToast } from "../../app/toast";
import { closeIcon } from "../../app/icons";
import { hashFor } from "../../app/hooks/useAppRoute";

import convertRaw from "/assets/icons/tabler_photo.svg?raw";
import historyRaw from "/assets/icons/clipboard-list.svg?raw";
import metadataRaw from "/assets/icons/material-symbols_brush.svg?raw";
import { ResizeSection } from "./components/ResizeSection";
import { MetadataSection } from "./components/MetadataSection";

function themedIcon(raw: string): string {
  return raw
    .replace(/fill="#6366F1"/gi, 'fill="currentColor"')
    .replace(/stroke="#6366F1"/gi, 'stroke="currentColor"')
    .replace(/fill="black"/gi, 'fill="currentColor"')
    .replace(/stroke="black"/gi, 'stroke="currentColor"');
}

type PhotoSection = "convert" | "history" | "metadata" | "resize";

const SECTIONS: { id: PhotoSection; labelKey: string; descKey: string; icon: string }[] = [
  { id: "convert",  labelKey: "images.sectionConvert",  descKey: "images.sectionConvertDesc",  icon: themedIcon(convertRaw) },
  { id: "history",  labelKey: "images.sectionHistory",  descKey: "images.sectionHistoryDesc",  icon: themedIcon(historyRaw) },
  { id: "metadata", labelKey: "images.sectionMetadata", descKey: "images.sectionMetadataDesc", icon: themedIcon(metadataRaw) },
  {
    id: "resize",
    labelKey: "images.sectionResize",
    descKey: "images.sectionResizeDesc",
    icon: `<svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 3h6v6\"/><path d=\"M9 21H3v-6\"/><path d=\"M21 3l-7 7\"/><path d=\"M3 21l7-7\"/></svg>`,
  },
];

export function PhotoPage() {
  const { t, i18n } = useTranslation();

  // Read section from URL hash
  const sectionFromHash = (): PhotoSection | null => {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/");
    const valid: PhotoSection[] = ["convert", "history", "metadata", "resize"];
    return parts.length > 1 && valid.includes(parts[1] as PhotoSection) ? (parts[1] as PhotoSection) : null;
  };

  const [section, setSectionState] = useState<PhotoSection | null>(() => sectionFromHash());
  const [fmtOut, setFmtOut] = useState("image/png");
  const [quality, setQuality] = useState(92);
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);
  const convertingRef = useRef(false);
  const [showConvertCards, setShowConvertCards] = useState(false);

  /* ── History state ── */
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const refreshHistory = useCallback(async () => {
    const all = await listHistory();
    setHistoryItems(all.filter((h) => h.type === "image"));
  }, []);

  useEffect(() => {
    if (section === "history") void refreshHistory();
  }, [section, refreshHistory]);

  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    showToast("toast.cleared");
    await refreshHistory();
  }, [refreshHistory]);

  const handleDeleteHistory = useCallback(
    async (id: string) => {
      await deleteHistoryItem(id);
      await refreshHistory();
    },
    [refreshHistory],
  );

  /* ── Section navigation ── */

  const setSection = useCallback((s: PhotoSection | null) => {
    setSectionState(s);
    if (s) {
      window.location.hash = hashFor("photo", s);
    } else {
      window.location.hash = hashFor("photo");
    }
  }, []);

  // Sync section when hash changes externally
  useEffect(() => {
    const onHash = () => setSectionState(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* ── Queue (convert section) ── */

  const {
    queue,
    addFiles,
    clearQueue,
    removeItem,
    selectAll,
    selectNone,
    toggleSelect,
    convertOne,
    convertMany,
    downloadItem,
    downloadZip,
  } = useImageQueue();

  const handleFiles = useCallback(
    (files: FileList) => addFiles(files, "auto"),
    [addFiles],
  );

  const handleConvertOne = useCallback(
    async (item: QueueItem) => {
      await convertOne(item, fmtOut, quality, "auto");
    },
    [convertOne, fmtOut, quality],
  );

  const handleConvertAll = useCallback(() => {
    if (convertingRef.current) return;
    convertingRef.current = true;
    const total = queue.length;
    void convertMany(() => true, fmtOut, quality, "auto").then(() => {
      convertingRef.current = false;
      const lang = i18n.language;
      const body =
        lang === "uk"
          ? `Конвертацію завершено: ${total} файлів`
          : lang === "it"
            ? `Conversione completata: ${total} file`
            : `Conversion complete: ${total} files`;
      void showNotification("FormatX", body);
    });
  }, [convertMany, fmtOut, quality, queue.length, i18n.language]);

  const handleConvertSelected = useCallback(() => {
    if (convertingRef.current) return;
    convertingRef.current = true;
    const selected = queue.filter((q) => q.selected).length;
    void convertMany((q) => q.selected, fmtOut, quality, "auto").then(() => {
      convertingRef.current = false;
      const lang = i18n.language;
      const body =
        lang === "uk"
          ? `Конвертацію завершено: ${selected} файлів`
          : lang === "it"
            ? `Conversione completata: ${selected} file`
            : `Conversion complete: ${selected} files`;
      void showNotification("FormatX", body);
    });
  }, [convertMany, fmtOut, quality, queue, i18n.language]);

  const handleZipSelected = useCallback(
    () => void downloadZip((q) => q.selected && !!q.blobs && q.status === "ready", fmtOut),
    [downloadZip, fmtOut],
  );

  const handleZipAll = useCallback(
    () => void downloadZip((q) => !!q.blobs && q.status === "ready", fmtOut),
    [downloadZip, fmtOut],
  );

  const handlePreview = useCallback((item: QueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob) return;
    setPreviewItem({ blob, name: item.file.name });
  }, []);

  /* ── Convert section animation ── */
  const convertAnim = useAnimationController(
    {
      onRemove: (id) => removeItem(id),
      onCollapseEnd: () => setShowConvertCards(false),
    },
    { staggerMs: 80, removeMs: 450, collapseMs: 400 },
  );

  useEffect(() => {
    if (queue.length > 0) setShowConvertCards(true);
  }, [queue.length]);

  const handleHistoryPreview = useCallback((item: HistoryItem) => {
    if (item.blob) {
      setPreviewItem({
        blob: item.blob,
        name: item.filename,
      });
    }
  }, []);

  return (
    <>
      <h2>{t("images.title")}</h2>

      {section === null && (
        /* ── Card grid (home) ── */
        <div className="doc-cards">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="doc-card"
              onClick={() => setSection(s.id)}
            >
              <span className="doc-card__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.icon }} />
              <span className="doc-card__title">{t(s.labelKey)}</span>
              <span className="doc-card__desc">{t(s.descKey)}</span>
            </button>
          ))}
        </div>
      )}

      {section !== null && (
        /* ── Active section view ── */
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSection(null)}
            style={{ marginBottom: 12 }}
          >
            ← {t("images.title")}
          </button>

          {/* Conversion */}
          {section === "convert" && (
            <>
              <div className="card">
                <DropZone onFiles={handleFiles} />
                <Toolbar
                  queue={queue}
                  onConvertAll={handleConvertAll}
                  onConvertSelected={handleConvertSelected}
                  onZipSelected={handleZipSelected}
                  onZipAll={handleZipAll}
                  onSelectAll={selectAll}
                  onSelectNone={selectNone}
                  onClear={clearQueue}
                />
              </div>

              {/* Format options + Queue */}
              {(showConvertCards || queue.length > 0) && (
                <div className={`card resize-collapse${convertAnim.phase === 'collapsing' ? ' is-collapsing' : ''}`} style={{ marginTop: 16 }}>
                  <h3>
                    {t("images.queue")}
                    <span className="badge" style={{ marginLeft: 8 }}>{queue.length}</span>
                  </h3>

                  <div className="format-bar" style={{ marginBottom: 14 }}>
                    <span className="format-bar__label">{t("images.fmtOut")}</span>
                    <select value={fmtOut} onChange={(e) => setFmtOut(e.target.value)}>
                      <option value="image/png">PNG</option>
                      <option value="image/jpeg">JPEG</option>
                      <option value="image/webp">WebP</option>
                    </select>
                    <div className="toolbar-sep" />
                    <span className="format-bar__label">{t("images.quality")}</span>
                    <input
                      type="number"
                      min={40}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value) || 92)}
                      style={{ width: 70, font: "inherit", padding: "4px 8px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)" }}
                    />
                  </div>

                  <QueueList
                    queue={queue}
                    onConvert={handleConvertOne}
                    onDownload={(item) => downloadItem(item, fmtOut)}
                    onPreview={handlePreview}
                    onRemove={(id) => convertAnim.startRemove(id)}
                    onToggleSelect={toggleSelect}
                    removingIds={convertAnim}
                  />
                </div>
              )}
            </>
          )}

          {/* History */}
          {section === "history" && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>{t("account.history")}</h3>
                <button type="button" className="btn btn-secondary" onClick={handleClearHistory}>
                  {t("account.clearHistory")}
                </button>
              </div>
              <div className="account-list">
                {historyItems.map((item) => (
                  <div key={item.id} className="account-item">
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>🖼️</span>
                      <div>
                        <strong>{item.filename}</strong>
                        <br />
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(item.createdAt).toLocaleString()} · {(item.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {item.blob && (
                        <>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => handleHistoryPreview(item)}
                            title={t("account.preview")}
                            aria-label={t("account.preview")}
                          >
                            <span
                              dangerouslySetInnerHTML={{
                                __html: themedIcon(`
                                  <svg width="20" height="20" viewBox="0 0 51 51" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M31.875 17H31.8963M6.375 12.75C6.375 11.0592 7.04665 9.43774 8.24219 8.24219C9.43774 7.04665 11.0592 6.375 12.75 6.375H38.25C39.9408 6.375 41.5623 7.04665 42.7578 8.24219C43.9534 9.43774 44.625 11.0592 44.625 12.75V38.25C44.625 39.9408 43.9534 41.5623 42.7578 42.7578C41.5623 43.9534 39.9408 44.625 38.25 44.625H12.75C11.0592 44.625 9.43774 43.9534 8.24219 42.7578C7.04665 41.5623 6.375 39.9408 6.375 38.25V12.75Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M6.375 34L17 23.375C18.972 21.4774 21.403 21.4774 23.375 23.375L34 34" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M29.75 29.75L31.875 27.625C33.847 25.7274 36.278 25.7274 38.25 27.625L44.625 34" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>
                                `),
                              }}
                              style={{ display: "flex", width: 20, height: 20 }}
                            />
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => downloadBlob(item.blob!, item.filename)}
                          >
                            {t("images.download")}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleDeleteHistory(item.id)}
                      >
                        <span dangerouslySetInnerHTML={{ __html: closeIcon }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {!historyItems.length && <p className="empty-state">{t("account.noHistory")}</p>}
            </div>
          )}

          {/* Metadata cleanup */}
          {section === "metadata" && <MetadataSection />}

          {/* Resize */}
          {section === "resize" && <ResizeSection />}
        </>
      )}

      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </>
  );
}
