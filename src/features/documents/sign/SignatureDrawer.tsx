import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { trimSignaturePng } from "./trimSignature";

interface Props {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

export function SignatureDrawer({ onSave, onCancel }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0]!;
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, []);

  const stopDraw = useCallback(() => {
    drawing.current = false;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleSave = useCallback(async () => {
    const raw = canvasRef.current!.toDataURL("image/png");
    const trimmed = await trimSignaturePng(raw);
    onSave(trimmed);
  }, [onSave]);

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: "0.9rem", marginBottom: 8 }}>{t("documents.signDraw")}</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={160}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        style={{
          width: "100%",
          aspectRatio: "400 / 160",
          border: "2px dashed var(--border)",
          borderRadius: 8,
          background: "repeating-conic-gradient(#f5f5f5 0% 25%, #fff 0% 50%) 50% / 16px 16px",
          cursor: "crosshair",
          touchAction: "none",
          display: "block",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          {t("documents.signSave")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={clearCanvas}>
          {t("documents.signRedo")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t("images.cancel")}
        </button>
      </div>
    </div>
  );
}
