import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useImageQueue } from "./hooks/useImageQueue";
import { DropZone } from "./components/DropZone";
import { QueueList } from "./components/QueueList";
import { Toolbar } from "./components/Toolbar";
import type { QueueItem } from "../images/types";
import { showNotification } from "../../lib/notifications";

export function PhotoPage() {
  const { t, i18n } = useTranslation();
  const [fmtIn, setFmtIn] = useState("auto");
  const [fmtOut, setFmtOut] = useState("image/png");
  const [quality, setQuality] = useState(92);
  const convertingRef = useRef(false);

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
    (files: FileList) => addFiles(files, fmtIn),
    [addFiles, fmtIn],
  );

  const handleConvertOne = useCallback(
    async (item: QueueItem) => {
      await convertOne(item, fmtOut, quality, fmtIn);
    },
    [convertOne, fmtOut, quality, fmtIn],
  );

  const handleConvertAll = useCallback(() => {
    if (convertingRef.current) return;
    convertingRef.current = true;
    const total = queue.length;
    void convertMany(() => true, fmtOut, quality, fmtIn).then(() => {
      convertingRef.current = false;
      const lang = i18n.language;
      const title = lang === "uk" ? "FormatX" : lang === "it" ? "FormatX" : "FormatX";
      const body =
        lang === "uk"
          ? `Конвертацію завершено: ${total} файлів`
          : lang === "it"
            ? `Conversione completata: ${total} file`
            : `Conversion complete: ${total} files`;
      void showNotification(title, body);
    });
  }, [convertMany, fmtOut, quality, fmtIn, queue.length, i18n.language]);

  const handleConvertSelected = useCallback(() => {
    if (convertingRef.current) return;
    convertingRef.current = true;
    const selected = queue.filter((q) => q.selected).length;
    void convertMany((q) => q.selected, fmtOut, quality, fmtIn).then(() => {
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
  }, [convertMany, fmtOut, quality, fmtIn, queue, i18n.language]);

  const handleZipSelected = useCallback(
    () => void downloadZip((q) => q.selected && !!q.blobs && q.status === "ready", fmtOut),
    [downloadZip, fmtOut],
  );

  const handleZipAll = useCallback(
    () => void downloadZip((q) => !!q.blobs && q.status === "ready", fmtOut),
    [downloadZip, fmtOut],
  );

  return (
    <>
      <h2>{t("images.title")}</h2>
      <div className="card">
        <div className="images-row">
          <div className="field">
            <label htmlFor="fmtIn">{t("images.fmtIn")}</label>
            <select id="fmtIn" value={fmtIn} onChange={(e) => setFmtIn(e.target.value)}>
              <option value="auto">{t("images.auto")}</option>
              <option value="heic">HEIC</option>
              <option value="svg">SVG</option>
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="fmtOut">{t("images.fmtOut")}</label>
            <select id="fmtOut" value={fmtOut} onChange={(e) => setFmtOut(e.target.value)}>
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="quality">{t("images.quality")}</label>
            <input
              id="quality"
              type="number"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value) || 92)}
            />
          </div>
        </div>
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
      <div className="card" style={{ marginTop: 16 }}>
        <h3>
          {t("images.queue")}
          <span className="badge" style={{ marginLeft: 8 }}>{queue.length}</span>
        </h3>
        <QueueList
          queue={queue}
          onConvert={handleConvertOne}
          onDownload={(item) => downloadItem(item, fmtOut)}
          onRemove={removeItem}
          onToggleSelect={toggleSelect}
        />
        {!queue.length && <p className="empty-state">{t("images.empty")}</p>}
      </div>
    </>
  );
}
