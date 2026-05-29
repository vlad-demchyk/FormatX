import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImageQueue } from "../hooks/useImageQueue";
import { useAnimationController } from "../hooks/useAnimationController";
import { DropZone } from "./DropZone";
import { QueueList } from "./QueueList";
import { Toolbar } from "./Toolbar";
import type { QueueItem } from "../../images/types";
import { showNotification } from "../../../lib/notifications";

interface Props {
  onPreview: (item: QueueItem) => void;
}

export function ConvertSection({ onPreview }: Props) {
  const { t, i18n } = useTranslation();

  const [fmtOut, setFmtOut] = useState("image/png");
  const [quality, setQuality] = useState(92);
  const convertingRef = useRef(false);
  const [showConvertCards, setShowConvertCards] = useState(false);

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
    onPreview(item);
  }, [onPreview]);

  /* ── Animation ── */
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

  return (
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
  );
}
