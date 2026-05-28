import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentQueue } from "./hooks/useDocumentQueue";
import { DocumentDropZone } from "./components/DocumentDropZone";
import { DocumentQueue } from "./components/DocumentQueue";
import { DocumentToolbar } from "./components/DocumentToolbar";
import { PdfToSvgSection } from "./components/PdfToSvgSection";
import { PlaceholderSection } from "./components/PlaceholderSection";
import { PreviewModal } from "../../components/PreviewModal";
import { convertDocument, findConverter } from "./converter/registry";
import { allOutputFormats, formatLabel } from "./formatRegistry";
import type { DocumentQueueItem, DocumentFormatId } from "./types";

type DocSection = "convert" | "summarize" | "translate" | "sign" | "pdf2svg";

const SECTIONS: { id: DocSection; labelKey: string; descKey: string; icon: string }[] = [
  { id: "convert",   labelKey: "documents.sectionConvert",   descKey: "documents.sectionConvertDesc",   icon: "🔄" },
  { id: "summarize", labelKey: "documents.sectionSummarize", descKey: "documents.sectionSummarizeDesc", icon: "📝" },
  { id: "translate", labelKey: "documents.sectionTranslate", descKey: "documents.sectionTranslateDesc", icon: "🌐" },
  { id: "sign",      labelKey: "documents.sectionSign",      descKey: "documents.sectionSignDesc",      icon: "✍️" },
  { id: "pdf2svg",   labelKey: "documents.sectionPdf2Svg",   descKey: "documents.sectionPdf2SvgDesc",   icon: "📄→🖼️" },
];

export function DocumentsPage() {
  const { t } = useTranslation();
  const [section, setSection] = useState<DocSection | null>(null);
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);
  const [globalFormat, setGlobalFormat] = useState<DocumentFormatId>("md");

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
    console.log("[FormatX] Convert started", { file: item.file.name, size: item.file.size, from: item.inputFormat, to: item.outputFormat });
    if (item.status === "error") {
      // Reset error so user can retry
      markConverting(item.id);
    }

    const conv = findConverter(item.inputFormat, item.outputFormat);
    if (!conv) {
      const msg = `No converter for ${item.inputFormat} → ${item.outputFormat}`;
      console.error("[FormatX]", msg);
      markError(item.id, msg);
      return;
    }
    console.log("[FormatX] Using converter:", conv.name);

    // Re-read file data if the ArrayBuffer was detached by a previous conversion
    let data = item.data;
    if (data.byteLength === 0) {
      console.log("[FormatX] ArrayBuffer detached, re-reading file");
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
      console.log("[FormatX] Convert success:", result.filename, result.mime, result.blob.size);
      markReady(item.id, [result.blob]);
      await saveToHistory({ ...item, blobs: [result.blob] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed";
      console.error("[FormatX] Convert error:", msg, e);
      markError(item.id, msg);
    }
  }, [markConverting, markReady, markError, saveToHistory]);

  const handlePreview = useCallback((item: DocumentQueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob) {
      console.warn("[FormatX] Preview: no blob");
      return;
    }
    console.log("[FormatX] Preview:", item.file.name, blob.type, blob.size);
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
              <span className="doc-card__icon" aria-hidden="true">{s.icon}</span>
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
                {!queue.length && <p className="empty-state">{t("images.empty")}</p>}
              </div>

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
            <div className="card">
              <PlaceholderSection titleKey="documents.sectionSign" descKey="documents.signDesc" icon="✍️" />
            </div>
          )}
        </>
      )}
    </>
  );
}
