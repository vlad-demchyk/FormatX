import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentQueue } from "./hooks/useDocumentQueue";
import { DocumentDropZone } from "./components/DocumentDropZone";
import { DocumentQueue } from "./components/DocumentQueue";
import { DocumentToolbar } from "./components/DocumentToolbar";
import { PdfToSvgSection } from "./components/PdfToSvgSection";
import { PlaceholderSection } from "./components/PlaceholderSection";
import { SignSection } from "./components/SignSection";
import { PreviewModal } from "../../components/PreviewModal";
import { convertDocument, findConverter } from "./converter/registry";
import { allOutputFormats, formatLabel } from "./formatRegistry";
import type { DocumentQueueItem, DocumentFormatId } from "./types";
import { hashFor } from "../../app/hooks/useAppRoute";
import { logger } from "../../lib/logger";

import convertRaw from "/assets/icons/streamline-ultimate_coding-apps-website-data-conversion-documents-1.svg?raw";
import summarizeRaw from "/assets/icons/material-symbols_summarize-outline.svg?raw";
import signRaw from "/assets/icons/mdi_sign.svg?raw";
import frame4Raw from "/assets/icons/Frame 4.svg?raw";
import translateRaw from "/assets/icons/ant-design_global-outlined.svg?raw";

function themedIcon(raw: string): string {
  return raw
    .replace(/fill="#6366F1"/gi, 'fill="currentColor"')
    .replace(/stroke="#6366F1"/gi, 'stroke="currentColor"')
    .replace(/fill="black"/gi, 'fill="currentColor"')
    .replace(/stroke="black"/gi, 'stroke="currentColor"');
}

type DocSection = "convert" | "summarize" | "translate" | "sign" | "pdf2svg";

const SECTIONS: { id: DocSection; labelKey: string; descKey: string; icon: string }[] = [
  { id: "convert",   labelKey: "documents.sectionConvert",   descKey: "documents.sectionConvertDesc",   icon: themedIcon(convertRaw) },
  { id: "summarize", labelKey: "documents.sectionSummarize", descKey: "documents.sectionSummarizeDesc", icon: themedIcon(summarizeRaw) },
  { id: "translate", labelKey: "documents.sectionTranslate", descKey: "documents.sectionTranslateDesc", icon: themedIcon(translateRaw) },
  { id: "sign",      labelKey: "documents.sectionSign",      descKey: "documents.sectionSignDesc",      icon: themedIcon(signRaw) },
  { id: "pdf2svg",   labelKey: "documents.sectionPdf2Svg",   descKey: "documents.sectionPdf2SvgDesc",   icon: themedIcon(frame4Raw) },
];

export function DocumentsPage() {
  const { t } = useTranslation();

  // Read section from URL hash
  const sectionFromHash = (): DocSection | null => {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/");
    const valid: DocSection[] = ["convert", "summarize", "translate", "sign", "pdf2svg"];
    return parts.length > 1 && valid.includes(parts[1] as DocSection) ? (parts[1] as DocSection) : null;
  };

  const [section, setSectionState] = useState<DocSection | null>(() => sectionFromHash());
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);
  const [globalFormat, setGlobalFormat] = useState<DocumentFormatId>("md");

  const setSection = useCallback((s: DocSection | null) => {
    setSectionState(s);
    if (s) {
      window.location.hash = hashFor("documents", s);
    } else {
      window.location.hash = hashFor("documents");
    }
  }, []);

  // Sync section when hash changes externally
  useEffect(() => {
    const onHash = () => setSectionState(sectionFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const {
    queue,
    addFiles,
    removeItem,
    clearQueue,
    selectAll,
    selectNone,
    toggleSelect,
    updateOutputFormat,
    updateOutputFormatForSelected,
    markReady,
    markError,
    markConverting,
    downloadItem,
    saveToHistory,
  } = useDocumentQueue();

  const handleFiles = useCallback((files: FileList) => addFiles(files, "md"), [addFiles]);

  const handleConvert = useCallback(async (item: DocumentQueueItem) => {
    logger.log("Convert started", { file: item.file.name, size: item.file.size, from: item.inputFormat, to: item.outputFormat });
    if (item.status === "error") {
      // Reset error so user can retry
      markConverting(item.id);
    }

    const conv = findConverter(item.inputFormat, item.outputFormat);
    if (!conv) {
      const msg = `No converter for ${item.inputFormat} → ${item.outputFormat}`;
      logger.error(msg);
      markError(item.id, msg);
      return;
    }
    logger.log("Using converter:", conv.name);

    // Re-read file data if the ArrayBuffer was detached by a previous conversion
    let data = item.data;
    if (data.byteLength === 0) {
      logger.log("ArrayBuffer detached, re-reading file");
      data = await item.file.arrayBuffer();
    }

    markConverting(item.id);
    try {
      const result = await convertDocument({
        id: item.id,
        file: item.file,
        data,
        inputFormat: item.inputFormat,
        outputFormat: item.outputFormat,
      });
      logger.log("Convert success:", result.filename, result.mime, result.blob.size);
      markReady(item.id, [result.blob]);
      await saveToHistory({ ...item, blobs: [result.blob] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed";
      logger.error("Document convert error:", msg, e);
      markError(item.id, msg);
    }
  }, [markConverting, markReady, markError, saveToHistory]);

  const handlePreview = useCallback((item: DocumentQueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob) {
      logger.warn("Preview: no blob");
      return;
    }
    logger.log("Preview:", item.file.name, blob.type, blob.size);
    setPreviewItem({ blob, name: item.file.name });
  }, []);

  const handleConvertAll = useCallback(async () => {
    for (const item of queue) {
      if (item.status === "error") continue;
      await handleConvert(item);
    }
  }, [queue, handleConvert]);

  const handleConvertSelected = useCallback(async () => {
    for (const item of queue.filter((q) => q.selected)) {
      if (item.status === "error") continue;
      await handleConvert(item);
    }
  }, [queue, handleConvert]);

  return (
    <>
      <h2>{t("documents.title")}</h2>

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
            ← {t("documents.back")}
          </button>

          {/* Conversion */}
          {section === "convert" && (
            <>
              <div className="card">
                <DocumentDropZone onFiles={handleFiles} />
                {queue.length > 1 && (
                  <div className="format-bar">
                    <span className="format-bar__label">{t("documents.outputFormat")}</span>
                    <select
                      value={globalFormat}
                      onChange={(e) => setGlobalFormat(e.target.value as DocumentFormatId)}
                    >
                      {allOutputFormats().map((fmt) => (
                        <option key={fmt} value={fmt}>{formatLabel(fmt)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => updateOutputFormatForSelected(globalFormat)}
                      style={{ fontSize: "0.8rem", padding: "4px 10px" }}
                    >
                      {t("documents.applyToSelected")}
                    </button>
                  </div>
                )}
                <DocumentToolbar
                  queue={queue}
                  onConvertAll={handleConvertAll}
                  onConvertSelected={handleConvertSelected}
                  onSelectAll={selectAll}
                  onSelectNone={selectNone}
                  onClear={clearQueue}
                />
              </div>
              {queue.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                  <h3>
                    {t("images.queue")}
                    <span className="badge" style={{ marginLeft: 8 }}>{queue.length}</span>
                  </h3>
                  <DocumentQueue
                    items={queue}
                    onConvert={handleConvert}
                    onDownload={downloadItem}
                    onPreview={handlePreview}
                    onRemove={removeItem}
                    onToggleSelect={toggleSelect}
                    onOutputFormatChange={updateOutputFormat}
                  />
                </div>
              )}

              <PreviewModal
                item={previewItem}
                onClose={() => setPreviewItem(null)}
              />
            </>
          )}

          {section === "pdf2svg" && (
            <div className="card">
              <PdfToSvgSection />
            </div>
          )}

          {section === "summarize" && (
            <div className="card">
              <PlaceholderSection titleKey="documents.sectionSummarize" descKey="documents.summarizeDesc" icon="📝" />
            </div>
          )}
          {section === "translate" && (
            <div className="card">
              <PlaceholderSection titleKey="documents.sectionTranslate" descKey="documents.translateDesc" icon="🌐" />
            </div>
          )}
          {section === "sign" && (
            <SignSection />
          )}
        </>
      )}
    </>
  );
}
