import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "../../../app/toast";
import { downloadBlob } from "../../../lib/download";
import { addHistoryItem } from "../../../lib/db";
import { addPinnedEntry } from "../../clipboard/pinnedStorage";
import { pinIcon } from "../../clipboard/pinIcon";
import { exportSignedDocument } from "./exportSignedDocument";
import { getSignatureAspect, normalizedSigHeight, signatureDataUrlToBuffer } from "./trimSignature";
import type { PlacedSignature, SignDocumentSource } from "./types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const DEFAULT_SIG_W = 0.18;

interface SignCanvasProps {
  source: SignDocumentSource;
  sigDataUrl: string;
  onClose: () => void;
}

interface DragState {
  type: "move" | "resize" | "rotate";
  sigId: string;
  startX: number;
  startY: number;
  startSig: PlacedSignature;
  resizeCorner?: "br";
}

type SigWithUrl = PlacedSignature & { dataUrl: string };

function SignatureOverlay({
  sig,
  selected,
  onSelect,
  onDragStart,
}: {
  sig: SigWithUrl;
  selected: boolean;
  onSelect: (id: string) => void;
  onDragStart: (state: DragState, e: React.PointerEvent) => void;
}) {
  const stop = (e: React.PointerEvent) => {
    e.stopPropagation();
  };

  const startMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(sig.id);
    onDragStart(
      { type: "move", sigId: sig.id, startX: e.clientX, startY: e.clientY, startSig: { ...sig } },
      e,
    );
  };

  const startResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(sig.id);
    onDragStart(
      {
        type: "resize",
        sigId: sig.id,
        startX: e.clientX,
        startY: e.clientY,
        startSig: { ...sig },
        resizeCorner: "br",
      },
      e,
    );
  };

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(sig.id);
    onDragStart(
      { type: "rotate", sigId: sig.id, startX: e.clientX, startY: e.clientY, startSig: { ...sig } },
      e,
    );
  };

  return (
    <div
      role="presentation"
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(sig.id);
      }}
      style={{
        position: "absolute",
        left: `${sig.x * 100}%`,
        top: `${sig.y * 100}%`,
        width: `${sig.w * 100}%`,
        height: `${sig.h * 100}%`,
        transform: `rotate(${sig.rotation}deg)`,
        transformOrigin: "center center",
        cursor: "move",
        touchAction: "none",
        boxSizing: "border-box",
        outline: selected ? "2px dashed var(--brand-accent, #6366F1)" : "none",
        outlineOffset: 2,
      }}
    >
      <img
        src={sig.dataUrl}
        alt=""
        draggable={false}
        onPointerDown={startMove}
        style={{ width: "100%", height: "100%", objectFit: "fill", pointerEvents: "auto", userSelect: "none" }}
      />
      {selected && (
        <>
          <div
            onPointerDown={startResize}
            style={{
              position: "absolute",
              right: -6,
              bottom: -6,
              width: 12,
              height: 12,
              background: "#fff",
              border: "2px solid var(--brand-accent, #6366F1)",
              borderRadius: 2,
              cursor: "nwse-resize",
            }}
          />
          <div
            onPointerDown={startRotate}
            style={{
              position: "absolute",
              left: "50%",
              top: -24,
              transform: "translateX(-50%)",
              width: 14,
              height: 14,
              background: "var(--brand-accent, #6366F1)",
              border: "2px solid #fff",
              borderRadius: "50%",
              cursor: "grab",
            }}
          />
        </>
      )}
    </div>
  );
}

export function SignCanvas({ source, sigDataUrl, onClose }: SignCanvasProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [sigs, setSigs] = useState<(PlacedSignature & { dataUrl: string })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<(PlacedSignature & { dataUrl: string })[][]>([]);
  const [redoStack, setRedoStack] = useState<(PlacedSignature & { dataUrl: string })[][]>([]);
  const [exporting, setExporting] = useState(false);
  const [sigAspect, setSigAspect] = useState(2.5);
  const dragRef = useRef<DragState | null>(null);

  const page = source.pages[pageIndex];
  const pageSigs = sigs.filter((s) => s.pageIndex === pageIndex);

  useEffect(() => {
    getSignatureAspect(sigDataUrl).then(setSigAspect).catch(() => setSigAspect(2.5));
  }, [sigDataUrl]);

  const pushUndo = useCallback(() => {
    setSigs((prev) => {
      setUndoStack((u) => [...u.slice(-20), prev]);
      setRedoStack([]);
      return prev;
    });
  }, []);

  const placeSignature = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!pageRef.current || e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.pageBg) {
        return;
      }
      const rect = pageRef.current.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const pg = source.pages[pageIndex];
      if (!pg) return;
      const sigH = normalizedSigHeight(DEFAULT_SIG_W, sigAspect, pg.nativeWidth, pg.nativeHeight);
      pushUndo();
      const newSig: PlacedSignature & { dataUrl: string } = {
        id: crypto.randomUUID(),
        pageIndex,
        dataUrl: sigDataUrl,
        x: Math.max(0, Math.min(1 - DEFAULT_SIG_W, nx - DEFAULT_SIG_W / 2)),
        y: Math.max(0, Math.min(1 - sigH, ny - sigH / 2)),
        w: DEFAULT_SIG_W,
        h: sigH,
        rotation: 0,
      };
      setSigs((prev) => [...prev, newSig]);
      setSelectedId(newSig.id);
    },
    [pageIndex, pushUndo, sigAspect, sigDataUrl, source.pages],
  );

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-signature-overlay]")) return;
      setSelectedId(null);
      if (target.dataset.pageBg === "1" || target === e.currentTarget) {
        placeSignature(e);
      }
    },
    [placeSignature],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !pageRef.current) return;
      const rect = pageRef.current.getBoundingClientRect();

      setSigs((prev) =>
        prev.map((s) => {
          if (s.id !== drag.sigId) return s;
          if (drag.type === "move") {
            const dx = (e.clientX - drag.startX) / rect.width;
            const dy = (e.clientY - drag.startY) / rect.height;
            return {
              ...s,
              x: Math.max(0, Math.min(1 - s.w, drag.startSig.x + dx)),
              y: Math.max(0, Math.min(1 - s.h, drag.startSig.y + dy)),
            };
          }
          if (drag.type === "resize") {
            const dx = (e.clientX - drag.startX) / rect.width;
            const pg = source.pages[drag.startSig.pageIndex];
            const newW = Math.max(0.04, Math.min(0.9, drag.startSig.w + dx));
            const newH = pg
              ? normalizedSigHeight(newW, sigAspect, pg.nativeWidth, pg.nativeHeight)
              : newW * (drag.startSig.h / drag.startSig.w);
            return { ...s, w: newW, h: newH };
          }
          if (drag.type === "rotate") {
            const cx = rect.left + (drag.startSig.x + drag.startSig.w / 2) * rect.width;
            const cy = rect.top + (drag.startSig.y + drag.startSig.h / 2) * rect.height;
            const angle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
            return { ...s, rotation: angle };
          }
          return s;
        }),
      );
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [sigAspect, source.pages]);

  const onDragStart = useCallback((state: DragState, e: React.PointerEvent) => {
    pushUndo();
    dragRef.current = state;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [pushUndo]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        pushUndo();
        setSigs((prev) => prev.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
    },
    [selectedId, pushUndo],
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (!prev.length) return prev;
      const snapshot = prev[prev.length - 1]!;
      setSigs((current) => {
        setRedoStack((r) => [...r, current]);
        return snapshot;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (!prev.length) return prev;
      const snapshot = prev[prev.length - 1]!;
      setSigs((current) => {
        setUndoStack((u) => [...u, current]);
        return snapshot;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    }
  }, []);

  const handleDownload = useCallback(async () => {
    setExporting(true);
    try {
      const signaturePng = await signatureDataUrlToBuffer(sigDataUrl);
      const placed: PlacedSignature[] = sigs.map(({ dataUrl: _, ...rest }) => rest);
      const result = await exportSignedDocument({ source, signatures: placed, signaturePng });
      downloadBlob(result.blob, result.filename);

      await addHistoryItem({
        id: crypto.randomUUID(),
        type: "document",
        filename: result.filename,
        mime: result.mime,
        size: result.blob.size,
        blob: result.blob,
      }).catch(() => {});
      showToast("toast.saved");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [sigDataUrl, sigs, source]);

  const handlePin = useCallback(async () => {
    setExporting(true);
    try {
      const signaturePng = await signatureDataUrlToBuffer(sigDataUrl);
      const placed: PlacedSignature[] = sigs.map(({ dataUrl: _, ...rest }) => rest);
      const result = await exportSignedDocument({ source, signatures: placed, signaturePng });

      const buf = new Uint8Array(await result.blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]!);
      const b64 = btoa(binary);
      const dataUrl = `data:${result.mime};base64,${b64}`;

      addPinnedEntry({
        type: "document",
        label: result.filename,
        content: dataUrl,
        mime: result.mime,
        size: result.blob.size,
      });
      showToast("toast.pinned");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }, [sigDataUrl, sigs, source]);

  if (!page) return null;

  const displayW = page.nativeWidth * zoom;
  const displayH = page.nativeHeight * zoom;

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: "0.9rem", marginBottom: 8, color: "var(--text-muted)" }}>
        {t("documents.signPlace")}
      </p>

      {source.pages.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => p - 1)}
          >
            ←
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {t("documents.signPage", { current: pageIndex + 1, total: source.pages.length })}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pageIndex >= source.pages.length - 1}
            onClick={() => setPageIndex((p) => p + 1)}
          >
            →
          </button>
        </div>
      )}

      <div
        ref={viewportRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        style={{
          overflow: "auto",
          maxHeight: "70vh",
          border: "1px solid var(--border)",
          borderRadius: 8,
          outline: "none",
          background: "#888",
        }}
      >
        <div
          ref={pageRef}
          data-page-bg="1"
          onClick={handlePageClick}
          style={{
            position: "relative",
            width: displayW,
            height: displayH,
            margin: "0 auto",
            cursor: "crosshair",
            touchAction: "none",
          }}
        >
          <img
            data-page-bg="1"
            src={page.previewUrl}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", display: "block", pointerEvents: "none", userSelect: "none" }}
          />
          {pageSigs.map((sig) => (
            <div key={sig.id} data-signature-overlay="1">
              <SignatureOverlay
                sig={sig}
                selected={sig.id === selectedId}
                onSelect={setSelectedId}
                onDragStart={onDragStart}
              />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn btn-ghost" onClick={handleUndo} disabled={undoStack.length === 0} title="Undo">
          ↩
        </button>
        <button type="button" className="btn btn-ghost" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo">
          ↪
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))} title={t("documents.signZoomIn")}>
          +
        </button>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", minWidth: 48, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" className="btn btn-ghost" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))} title={t("documents.signZoomOut")}>
          −
        </button>
        {selectedId && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              pushUndo();
              setSigs((prev) => prev.filter((s) => s.id !== selectedId));
              setSelectedId(null);
            }}
          >
            ✕ {t("images.remove")}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handlePin}
          disabled={exporting}
          title={t("clipboard.pinBtn")}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <span dangerouslySetInnerHTML={{ __html: pinIcon }} style={{ display: "flex", width: 16, height: 16 }} />
          {t("clipboard.pinBtn")}
        </button>
        <button type="button" className="btn btn-primary" onClick={handleDownload} disabled={exporting}>
          {exporting ? "…" : t("documents.signDownload")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("images.cancel")}
        </button>
      </div>
    </div>
  );
}
