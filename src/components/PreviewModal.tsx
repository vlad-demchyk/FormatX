import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../lib/download";
import { closeIcon } from "../app/icons";
import { PdfPreview } from "./PdfPreview";

interface PreviewItem {
  blob: Blob;
  name: string;
  mime?: string;
}

interface Props {
  item: PreviewItem | null;
  onClose: () => void;
}

const ZOOM_STEP = 0.25;
const MAX_ZOOM = 5;
const MIN_ZOOM = 0.25;

export function PreviewModal({ item, onClose }: Props) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Stable object URL — only re-created when blob changes
  const objectUrl = useMemo(() => {
    if (!item) return "";
    return URL.createObjectURL(item.blob);
  }, [item?.blob]);

  // Clean up object URL when item changes or component unmounts
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  // Read PDF blob as ArrayBuffer for PdfPreview
  useEffect(() => {
    if (!item) {
      setPdfData(null);
      return;
    }
    const isPdf =
      item.blob.type === "application/pdf" ||
      item.mime === "application/pdf" ||
      item.name.endsWith(".pdf");

    if (isPdf) {
      setLoaded(false);
      item.blob.arrayBuffer().then((buf) => setPdfData(buf));
    } else {
      setPdfData(null);
    }
  }, [item]);

  // Reset zoom when item changes
  useEffect(() => {
    setZoom(1);
    setLoaded(false);
  }, [item]);

  // Close on Escape
  useEffect(() => {
    if (!item) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [item, onClose]);

  // Wheel zoom (images only)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
    });
  }, []);

  // Click outside image to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose],
  );

  if (!item) return null;

  const isImage = item.blob.type.startsWith("image/");
  const isPdf =
    item.blob.type === "application/pdf" ||
    item.mime === "application/pdf" ||
    item.name.endsWith(".pdf");

  return (
    <div
      ref={overlayRef}
      className="preview-overlay"
      onClick={handleOverlayClick}
      onWheel={handleWheel}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
    >
      {/* Toolbar */}
      <div className="preview-toolbar">
        <span className="preview-toolbar__name" title={item.name}>
          {item.name}
        </span>
        <div className="preview-toolbar__actions">
          {!isPdf && (
            <>
              <span className="preview-zoom-label">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
                disabled={zoom <= MIN_ZOOM}
                title={t("images.preview")}
              >
                −
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setZoom(1)}
                title={t("images.preview")}
              >
                ↺
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
                disabled={zoom >= MAX_ZOOM}
                title={t("images.preview")}
              >
                +
              </button>
              <div className="preview-toolbar__divider" />
            </>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => downloadBlob(item.blob, item.name)}
          >
            {t("images.download")}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon preview-close"
            onClick={onClose}
            aria-label={t("images.remove")}
          >
            <span dangerouslySetInnerHTML={{ __html: closeIcon }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="preview-body">
        {isImage ? (
          <img
            ref={imgRef}
            src={objectUrl}
            alt={item.name}
            className="preview-image"
            style={{
              transform: `scale(${zoom})`,
              opacity: loaded ? 1 : 0,
            }}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        ) : isPdf ? (
          pdfData ? (
            <div className="preview-pdf-wrapper" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <PdfPreview data={pdfData} fileName={item.name} />
            </div>
          ) : (
            <div className="preview-loading">
              <p>{t("documents.signLoadingDoc")}</p>
            </div>
          )
        ) : (
          <iframe
            src={objectUrl}
            className="preview-iframe"
            title={item.name}
            style={{ opacity: loaded ? 1 : 0 }}
            onLoad={() => setLoaded(true)}
          />
        )}
      </div>
    </div>
  );
}
