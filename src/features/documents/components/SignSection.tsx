import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { showToast } from "../../../app/toast";
import { addHistoryItem } from "../../../lib/storage";

const SIGNATURE_KEY = "formatx-signature";

/* ── helpers ── */
function loadSavedSignature(): string | null {
  try {
    return localStorage.getItem(SIGNATURE_KEY);
  } catch {
    return null;
  }
}

function saveSignature(dataUrl: string) {
  try {
    localStorage.setItem(SIGNATURE_KEY, dataUrl);
  } catch {
    /* quota exceeded – ignore */
  }
}

function deleteSavedSignature() {
  try {
    localStorage.removeItem(SIGNATURE_KEY);
  } catch {
    /* ignore */
  }
}

/* ── Signature Drawer (draw a new signature) ── */
function SignatureDrawer({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0]!;
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
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
    ctx.strokeStyle = "#000";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, []);

  const stopDraw = useCallback(() => {
    drawing.current = false;
  }, []);

  const clearCanvas = useCallback(() => {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
  }, []);

  const handleSave = useCallback(() => {
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onSave(dataUrl);
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
          width: "100%", aspectRatio: "400 / 160",
          border: "2px dashed var(--border)", borderRadius: 8,
          background: "#fff", cursor: "crosshair", touchAction: "none",
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

/* ── SignCanvas — preview document + place/resize/rotate/drag signature ── */
interface PlacedSignature {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // degrees
}

function SignCanvas({
  docUrl,
  sigDataUrl,
  onClose,
}: {
  docUrl: string;
  sigDataUrl: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sigs, setSigs] = useState<PlacedSignature[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PlacedSignature[][]>([]);
  const [redoStack, setRedoStack] = useState<PlacedSignature[][]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sigImgRef = useRef<HTMLImageElement | null>(null);

  // Drag / resize / rotate state
  const dragRef = useRef<{
    type: "move" | "resize" | "rotate" | null;
    resizeEdge: "tl" | "tr" | "bl" | "br" | "t" | "b" | "l" | "r" | null;
    sigId: string | null;
    startX: number;
    startY: number;
    startSig: PlacedSignature | null;
    isPending: boolean;
  }>({ type: null, resizeEdge: null, sigId: null, startX: 0, startY: 0, startSig: null, isPending: false });

  const pushUndo = useCallback(() => {
    setSigs((prev) => {
      setUndoStack((u) => [...u.slice(-20), prev]);
      return prev;
    });
  }, []);

  // Load document image
  useEffect(() => {
    const img = new Image();
    img.src = docUrl;
    img.onload = () => {
      imgRef.current = img;
      render();
    };
    return () => { img.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docUrl]);

  // Load signature image
  useEffect(() => {
    const img = new Image();
    img.src = sigDataUrl;
    img.onload = () => {
      sigImgRef.current = img;
      render();
    };
    return () => { img.src = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigDataUrl]);

  const getCanvasSize = useCallback(() => {
    const img = imgRef.current;
    if (!img) return { w: 600, h: 400 };
    const maxW = Math.min(containerRef.current?.clientWidth ?? 600, 800);
    const ratio = img.width / img.height;
    let w = Math.min(img.width, maxW);
    let h = w / ratio;
    if (h > 600) { h = 600; w = h * ratio; }
    return { w: Math.round(w), h: Math.round(h) };
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const doc = imgRef.current;
    if (!canvas || !ctx || !doc) return;
    const { w, h } = getCanvasSize();
    canvas.width = w;
    canvas.height = h;

    // Draw document
    ctx.drawImage(doc, 0, 0, w, h);

    // Draw signatures
    const sigImg = sigImgRef.current;
    if (sigImg) {
      for (const s of sigs) {
        ctx.save();
        ctx.translate(s.x + s.width / 2, s.y + s.height / 2);
        ctx.rotate((s.rotation * Math.PI) / 180);
        ctx.drawImage(sigImg, -s.width / 2, -s.height / 2, s.width, s.height);
        ctx.restore();

        // Selection highlight
        if (s.id === selectedId) {
          ctx.save();
          ctx.strokeStyle = "var(--brand-accent, #6366F1)";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 3]);
          ctx.strokeRect(s.x - 3, s.y - 3, s.width + 6, s.height + 6);
          ctx.setLineDash([]);
          ctx.lineWidth = 1;

          // Corner & edge handles
          const handles = [
            { x: s.x - 5, y: s.y - 5 },           // tl
            { x: s.x + s.width - 5, y: s.y - 5 },  // tr
            { x: s.x - 5, y: s.y + s.height - 5 }, // bl
            { x: s.x + s.width - 5, y: s.y + s.height - 5 }, // br
            { x: s.x + s.width / 2 - 4, y: s.y - 5 },        // t
            { x: s.x + s.width / 2 - 4, y: s.y + s.height - 5 }, // b
            { x: s.x - 5, y: s.y + s.height / 2 - 4 },       // l
            { x: s.x + s.width - 5, y: s.y + s.height / 2 - 4 }, // r
          ];
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "var(--brand-accent, #6366F1)";
          for (const h of handles) {
            ctx.fillRect(h.x, h.y, 10, 10);
            ctx.strokeRect(h.x, h.y, 10, 10);
          }

          // Rotation handle
          const rotX = s.x + s.width / 2;
          const rotY = s.y - 18;
          ctx.beginPath();
          ctx.arc(rotX, rotY, 6, 0, Math.PI * 2);
          ctx.fillStyle = "var(--brand-accent, #6366F1)";
          ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }, [getCanvasSize, sigs, selectedId]);

  useEffect(() => {
    render();
  }, [render]);

  // Hit-test: returns the signature id and what part was hit
  const hitTest = useCallback(
    (mx: number, my: number): { id: string; part: "rotate" | "resize" | "move" | "inside" } | null => {
      for (let i = sigs.length - 1; i >= 0; i--) {
        const s = sigs[i]!;
        // Rotation handle
        const rotX = s.x + s.width / 2;
        const rotY = s.y - 18;
        if (Math.hypot(mx - rotX, my - rotY) < 10) return { id: s.id, part: "rotate" };

        // Resize handles (8 handles)
        const handleSize = 12;
        // Corners + edges
        const zones = [
          { x: s.x, y: s.y, part: "resize" as const },
          { x: s.x + s.width, y: s.y, part: "resize" as const },
          { x: s.x, y: s.y + s.height, part: "resize" as const },
          { x: s.x + s.width, y: s.y + s.height, part: "resize" as const },
          { x: s.x + s.width / 2, y: s.y, part: "resize" as const },
          { x: s.x + s.width / 2, y: s.y + s.height, part: "resize" as const },
          { x: s.x, y: s.y + s.height / 2, part: "resize" as const },
          { x: s.x + s.width, y: s.y + s.height / 2, part: "resize" as const },
        ];
        for (const z of zones) {
          if (Math.abs(mx - z.x) < handleSize && Math.abs(my - z.y) < handleSize) {
            return { id: s.id, part: "resize" };
          }
        }

        // Inside signature body
        if (mx >= s.x - 4 && mx <= s.x + s.width + 4 && my >= s.y - 4 && my <= s.y + s.height + 4) {
          return { id: s.id, part: "move" };
        }
      }
      return null;
    },
    [sigs],
  );

  // Click: if hit a signature → select it; else → place new + deselect
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragRef.current.type) return; // ignore if dragging
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const hit = hitTest(mx, my);
      if (hit) {
        // Clicked on a signature → select it (or deselect if already selected)
        setSelectedId((prev) => (prev === hit.id ? null : hit.id));
        containerRef.current?.focus();
        return;
      }
      // Clicked on empty area → place new signature & deselect
      setSelectedId(null);
      containerRef.current?.focus();
      pushUndo();
      const w = 120;
      const h = 50;
      const newSig: PlacedSignature = {
        id: crypto.randomUUID(),
        dataUrl: sigDataUrl,
        x: mx - w / 2,
        y: my - h / 2,
        width: w,
        height: h,
        rotation: 0,
      };
      setSigs((prev) => [...prev, newSig]);
    },
    [sigDataUrl, hitTest, pushUndo],
  );

  // Mouse down: detect if on handle for resize/rotate, or body for move
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const hit = hitTest(mx, my);
      if (!hit) return;

      const sig = sigs.find((s) => s.id === hit.id)!;

      if (hit.part === "resize" || hit.part === "rotate") {
        // Handles: start drag immediately
        dragRef.current = {
          type: hit.part,
          resizeEdge: null,
          sigId: hit.id,
          startX: mx,
          startY: my,
          startSig: { ...sig },
          isPending: false,
        };
        setSelectedId(hit.id);
        containerRef.current?.focus();
      } else {
        // Body: mark as pending — wait for mouse move to confirm drag
        dragRef.current = {
          type: "move",
          resizeEdge: null,
          sigId: hit.id,
          startX: mx,
          startY: my,
          startSig: { ...sig },
          isPending: true,
        };
      }
    },
    [sigs, hitTest],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const drag = dragRef.current;
      if (!drag.sigId || !drag.startSig) return;

      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const dx = mx - drag.startX;
      const dy = my - drag.startY;

      // Activate pending drag if mouse moved enough
      if (drag.isPending) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; // not yet a drag
        dragRef.current = { ...drag, isPending: false };
        setSelectedId(drag.sigId);
        containerRef.current?.focus();
      }

      setSigs((prev) =>
        prev.map((s) => {
          if (s.id !== drag.sigId) return s;
          if (drag.type === "move") {
            return { ...s, x: drag.startSig!.x + dx, y: drag.startSig!.y + dy };
          }
          if (drag.type === "resize") {
            const newW = Math.max(40, drag.startSig!.width + dx);
            const ratio = drag.startSig!.height / drag.startSig!.width;
            return { ...s, width: newW, height: newW * ratio };
          }
          if (drag.type === "rotate") {
            const cx = drag.startSig!.x + drag.startSig!.width / 2;
            const cy = drag.startSig!.y + drag.startSig!.height / 2;
            const angle = Math.atan2(my - cy, mx - cx) * (180 / Math.PI);
            return { ...s, rotation: angle };
          }
          return s;
        }),
      );
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current = { type: null, resizeEdge: null, sigId: null, startX: 0, startY: 0, startSig: null, isPending: false };
  }, []);

  // Keyboard delete
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

  // Toolbar actions
  const handleRemoveSelected = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setSigs((prev) => prev.filter((s) => s.id !== selectedId));
    setSelectedId(null);
  }, [selectedId, pushUndo]);

  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const prevSigs = prev[prev.length - 1]!;
      setSigs((current) => {
        setRedoStack((r) => [...r, current]);
        return prevSigs;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const nextSigs = prev[prev.length - 1]!;
      setSigs((current) => {
        setUndoStack((u) => [...u, current]);
        return nextSigs;
      });
      return prev.slice(0, -1);
    });
  }, []);

  // Download
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "signed-document.png";
    link.href = dataUrl;
    link.click();

    // Save to history
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const blobSize = Math.round((b64.length * 3) / 4);
    addHistoryItem({
      id: crypto.randomUUID(),
      type: "document",
      filename: "signed-document.png",
      mime: "image/png",
      size: blobSize,
      blobBase64: b64,
    }).catch(() => {});
  }, []);

  // Compute cursor style based on what's under the mouse
  const cursorRef = useRef<string>("crosshair");
  const handleMouseEnterCanvas = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const hit = hitTest(mx, my);
      if (!hit || hit.part === "inside") {
        cursorRef.current = hit ? "pointer" : "crosshair";
      } else if (hit.part === "rotate") {
        cursorRef.current = "grab";
      } else if (hit.part === "resize") {
        cursorRef.current = "nwse-resize";
      } else {
        cursorRef.current = "move";
      }
      if (canvas.style.cursor !== cursorRef.current) {
        canvas.style.cursor = cursorRef.current;
      }
    },
    [hitTest],
  );

  return (
    <div style={{ marginTop: 12 }}>
      <p style={{ fontSize: "0.9rem", marginBottom: 8, color: "var(--text-muted)" }}>
        {t("documents.signPlace")}
      </p>
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ position: "relative", outline: "none" }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={(e) => { handleMouseMove(e); handleMouseEnterCanvas(e); }}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: "100%", maxWidth: 800,
            border: "1px solid var(--border)", borderRadius: 8,
            cursor: "crosshair", display: "block",
          }}
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="Undo"
        >
          ↩
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="Redo"
        >
          ↪
        </button>
        {selectedId && (
          <button type="button" className="btn btn-secondary" onClick={handleRemoveSelected}>
            ✕ {t("images.remove")}
          </button>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" className="btn btn-primary" onClick={handleDownload}>
          {t("documents.signDownload")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("images.cancel")}
        </button>
      </div>
    </div>
  );
}

/* ── Main SignSection ── */
export function SignSection() {
  const { t } = useTranslation();
  const [savedSig, setSavedSig] = useState<string | null>(loadSavedSignature);
  const [mode, setMode] = useState<"create" | "sign" | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  const handleSigSaved = useCallback((dataUrl: string) => {
    saveSignature(dataUrl);
    setSavedSig(dataUrl);
    setMode(null);
    showToast("toast.saved");
  }, []);

  const handleSigDelete = useCallback(() => {
    deleteSavedSignature();
    setSavedSig(null);
    showToast("toast.cleared");
  }, []);

  const handleDocFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFile(file);
    const url = URL.createObjectURL(file);
    setDocPreviewUrl(url);
    setMode("sign");
  }, []);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl);
    };
  }, [docPreviewUrl]);

  return (
    <div>
      {/* ── Signature management ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 12 }}>{t("documents.signCreate")}</h3>

        {savedSig && mode !== "create" && (
          <div>
            <img
              src={savedSig}
              alt="Saved signature"
              style={{
                maxWidth: 240, maxHeight: 80, width: "auto", height: "auto",
                border: "1px solid var(--border)", borderRadius: 6,
                display: "block", marginBottom: 12, background: "#fff",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setMode("create")}
              >
                {t("documents.signRedo")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSigDelete}
                style={{ color: "var(--danger, #e74c3c)" }}
              >
                {t("documents.signDelete")}
              </button>
            </div>
          </div>
        )}

        {!savedSig && mode !== "create" && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setMode("create")}
          >
            {t("documents.signCreate")}
          </button>
        )}

        {mode === "create" && (
          <SignatureDrawer
            onSave={handleSigSaved}
            onCancel={() => setMode(null)}
          />
        )}
      </div>

      {/* ── Document upload ── */}
      {savedSig && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>{t("documents.signAddDoc")}</h3>

          {!docFile && (
            <label
              className="drop-zone"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "32px 16px",
                border: "2px dashed var(--border)", borderRadius: 8,
                cursor: "pointer", textAlign: "center",
              }}
            >
              <span style={{ fontSize: "2rem", marginBottom: 8 }}>📄</span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                {t("documents.signDrop")}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleDocFile}
                style={{ display: "none" }}
              />
            </label>
          )}

          {mode === "sign" && docPreviewUrl && savedSig && (
            <SignCanvas
              docUrl={docPreviewUrl}
              sigDataUrl={savedSig}
              onClose={() => {
                setMode(null);
                setDocFile(null);
                if (docPreviewUrl) URL.revokeObjectURL(docPreviewUrl);
                setDocPreviewUrl(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
