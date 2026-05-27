import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDocumentQueue } from "./hooks/useDocumentQueue";
import { DocumentDropZone } from "./components/DocumentDropZone";
import { DocumentQueue } from "./components/DocumentQueue";
import { DocumentToolbar } from "./components/DocumentToolbar";
import { convertDocument, findConverter } from "./converter/registry";
import type { DocumentFormatId, DocumentQueueItem } from "./types";

export function DocumentsPage() {
  const { t } = useTranslation();
  const [defaultOutput, setDefaultOutput] = useState<DocumentFormatId>("pdf");

  const {
    queue,
    addFiles,
    removeItem,
    clearQueue,
    selectAll,
    selectNone,
    toggleSelect,
    updateOutputFormat,
    markReady,
    markError,
    markConverting,
    downloadItem,
    saveToHistory,
  } = useDocumentQueue();

  const handleFiles = useCallback((files: FileList) => addFiles(files, defaultOutput), [addFiles, defaultOutput]);

  const handleConvert = useCallback(async (item: DocumentQueueItem) => {
    console.log("[FormatX] Convert started", { file: item.file.name, size: item.file.size, from: item.inputFormat, to: item.outputFormat });
    if (item.status === "error") return;
    
    const conv = findConverter(item.inputFormat, item.outputFormat);
    if (!conv) {
      const msg = `No converter for ${item.inputFormat} → ${item.outputFormat}`;
      console.error("[FormatX]", msg);
      markError(item.id, msg);
      return;
    }
    console.log("[FormatX] Using converter:", conv.name);

    markConverting(item.id);
    try {
      const result = await convertDocument({
        id: item.id,
        file: item.file,
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
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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

      <div className="card">
        <div className="images-row">
          <div className="field">
            <label>{t("documents.outputFormat")}</label>
            <select
              value={defaultOutput}
              onChange={(e) => setDefaultOutput(e.target.value as DocumentFormatId)}
            >
              <option value="html">HTML (перегляд)</option>
              <option value="txt">TXT (текст)</option>
              <option value="docx">DOCX (Word)</option>
              <option value="csv">CSV (таблиці)</option>
            </select>
          </div>
        </div>
        <DocumentDropZone onFiles={handleFiles} />
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
    </>
  );
}
