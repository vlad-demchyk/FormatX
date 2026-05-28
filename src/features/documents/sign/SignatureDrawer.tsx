import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SignaturePad from "signature_pad";
import { showToast } from "../../../app/toast";
import { trimSignaturePng } from "./trimSignature";

interface Props {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

function resizeSignatureCanvas(canvas: HTMLCanvasElement, pad: SignaturePad): void {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const cssW = canvas.offsetWidth;
  const cssH = canvas.offsetHeight;
  if (cssW < 1 || cssH < 1) return;

  const strokes = pad.toData();
  canvas.width = Math.floor(cssW * ratio);
  canvas.height = Math.floor(cssH * ratio);

  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  pad.clear();
  if (strokes.length > 0) {
    pad.fromData(strokes);
  }
}

export function SignatureDrawer({ onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const pad = new SignaturePad(canvas, {
      penColor: "#000000",
      minWidth: 0.8,
      maxWidth: 3,
      velocityFilterWeight: 0.7,
      minDistance: 2,
      backgroundColor: "rgba(0,0,0,0)",
    });
    padRef.current = pad;

    const syncEmpty = () => setIsEmpty(pad.isEmpty());
    const resize = () => resizeSignatureCanvas(canvas, pad);

    requestAnimationFrame(resize);
    const ro = new ResizeObserver(() => requestAnimationFrame(resize));
    ro.observe(wrapper);

    canvas.addEventListener("pointerup", syncEmpty);
    canvas.addEventListener("pointerleave", syncEmpty);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerup", syncEmpty);
      canvas.removeEventListener("pointerleave", syncEmpty);
      pad.off();
      padRef.current = null;
    };
  }, []);

  const clearCanvas = useCallback(() => {
    padRef.current?.clear();
    setIsEmpty(true);
  }, []);

  const handleSave = useCallback(async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      showToast("documents.signEmpty");
      return;
    }
    const raw = pad.toDataURL("image/png");
    const trimmed = await trimSignaturePng(raw);
    onSave(trimmed);
  }, [onSave]);

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: "0.9rem", marginBottom: 8 }}>{t("documents.signDraw")}</p>
      <div
        ref={wrapperRef}
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          aspectRatio: "5 / 2",
          border: "2px dashed var(--border)",
          borderRadius: 8,
          background: "repeating-conic-gradient(#f5f5f5 0% 25%, #fff 0% 50%) 50% / 16px 16px",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: "crosshair",
            touchAction: "none",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={isEmpty}>
          {t("documents.signSave")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={clearCanvas} disabled={isEmpty}>
          {t("documents.signRedo")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t("images.cancel")}
        </button>
      </div>
    </div>
  );
}
