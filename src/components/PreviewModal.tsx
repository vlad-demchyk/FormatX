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
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchesRef = useRef<{ startDist: number; startZoom: number } | null>(null);

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

  // Reset zoom & pan when item changes
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setLoaded(false);
  }, [item]);

  // Lock body scroll while preview is open
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
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

  const clampPan = useCallback(
    (x: number, y: number, z: number) => {
      // When zoom <= 1, image fits — no panning
      if (z <= 1) return { x: 0, y: 0 };
      // Max offset so the image edge doesn't go past viewport center
      const maxOffset = (z - 1) * 500;
      return {
        x: Math.min(maxOffset, Math.max(-maxOffset, x)),
        y: Math.min(maxOffset, Math.max(-maxOffset, y)),
      };
    },
    [],
  );

  const setZoomClamped = useCallback(
    (z: number) => {
      setZoom(() => {
        const newZ = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
        setPanX((px) => clampPan(px, 0, newZ).x);
        setPanY((py) => clampPan(0, py, newZ).y);
        return newZ;
      });
    },
    [clampPan],
  );

  /* ── Mouse drag ── */

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, panX, panY };
    },
    [zoom, panX, panY],
  );

  useEffect(() => {
    if (!item) return;
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPanX(dragStart.current.panX + dx);
      setPanY(dragStart.current.panY + dy);
    };
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false;
        // Clamp after drag
        setPanX((px) => clampPan(px, 0, zoom).x);
        setPanY((py) => clampPan(0, py, zoom).y);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [item, zoom, clampPan]);

  /* ── Touch drag & pinch ── */

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && zoom > 1) {
        const t = e.touches[0]!;
        dragging.current = true;
        dragStart.current = { x: t.clientX, y: t.clientY, panX, panY };
      } else if (e.touches.length === 2) {
        dragging.current = false;
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
        touchesRef.current = { startDist: Math.hypot(dx, dy), startZoom: zoom };
      }
    },
    [zoom, panX, panY],
  );

  useEffect(() => {
    if (!item) return;
    const onTouchMove = (e: TouchEvent) => {
      if (touchesRef.current && e.touches.length === 2) {
        const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
        const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
        const dist = Math.hypot(dx, dy);
        const scale = dist / touchesRef.current.startDist;
        setZoomClamped(touchesRef.current.startZoom * scale);
      }
    };
    const onTouchEnd = () => {
      touchesRef.current = null;
      if (dragging.current) {
        dragging.current = false;
        setPanX((px) => clampPan(px, 0, zoom).x);
        setPanY((py) => clampPan(0, py, zoom).y);
      }
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [item, zoom, setZoomClamped, clampPan]);

  // Wheel zoom (images only)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoomClamped(zoom + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP));
    },
    [zoom, setZoomClamped],
  );

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
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              opacity: loaded ? 1 : 0,
            }}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
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
