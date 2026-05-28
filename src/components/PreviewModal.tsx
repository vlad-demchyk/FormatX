import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadBlob } from "../lib/download";
import { closeIcon } from "../app/icons";

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
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Wheel zoom
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
  const objectUrl = URL.createObjectURL(item.blob);

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
            onLoad={() => {
              setLoaded(true);
              URL.revokeObjectURL(objectUrl);
            }}
            onError={() => setLoaded(true)}
          />
        ) : (
          <iframe
            src={objectUrl}
            className="preview-iframe"
            title={item.name}
            style={{ opacity: loaded ? 1 : 0 }}
            onLoad={() => {
              setLoaded(true);
              URL.revokeObjectURL(objectUrl);
            }}
          />
        )}
      </div>
    </div>
  );
}
