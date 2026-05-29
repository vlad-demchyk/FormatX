import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DropZone } from "./DropZone";
import { PreviewModal } from "../../../components/PreviewModal";
import { useResizeQueue, type ResizeOptions } from "../hooks/useResizeQueue";
import type { QueueItem } from "../../images/types";
import { ImageCompareSlider } from "./ImageCompareSlider";

const MIME_OPTIONS = [
  { value: "__same__", labelKey: "images.resize.sameFormat" },
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
];



const CROP_OPTIONS = [
  { value: "", label: "✂️" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:2", label: "3:2" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "2:3", label: "2:3" },
  { value: "3:4", label: "3:4" },
];

const RATIO_MAP: Record<string, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "3:2": 3 / 2,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "2:3": 2 / 3,
  "3:4": 3 / 4,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

/**
 * Average bits-per-pixel coefficients for common image formats (quality 80-90%).
 * Used for cross-format prediction (e.g. PNG → JPG).
 * For same-format prediction (e.g. PNG → PNG) we compute actual source BPP.
 */
const BPP_COEFS: Record<string, number> = {
  jpeg: 1.75,
  jpg: 1.75,
  webp: 1.2,
  png: 16.0,
};

/** Resolve the format short name from a MIME type or "__same__" marker. */
function resolveFmt(mimeOrSame: string, fallbackMime: string): string {
  if (mimeOrSame === "__same__") {
    const ext = fallbackMime.split("/").pop() || "?";
    return ext === "jpeg" ? "jpg" : ext;
  }
  const ext = mimeOrSame.split("/").pop() || "?";
  return ext === "jpeg" ? "jpg" : ext;
}

/** Estimate output size using BPP. Uses sourceBpp when format matches source. */
function estimateSizeBytes(
  ow: number,
  oh: number,
  outFmt: string,
  inFmt: string,
  sourceBpp: number,
): number {
  const bpp = outFmt === inFmt ? sourceBpp : (BPP_COEFS[outFmt] ?? 1.5);
  return Math.round((ow * oh * bpp) / 8);
}

/**
 * Renders the image with a crop-aspect-ratio overlay.
 * Darkens the areas outside the crop region so the user can preview the crop.
 */
function CropPreview({ imgSrc, cropRatio }: { imgSrc: string; cropRatio: number | null }) {
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
      <img src={imgSrc} alt="" className="resize-input-gallery__img" style={{ cursor: "default" }} />
      {cropRatio && <CropOverlay imgSrc={imgSrc} cropRatio={cropRatio} />}
    </div>
  );
}

/** Overlays semi‑transparent bars outside the crop region to show the crop preview. */
function CropOverlay({ imgSrc, cropRatio }: { imgSrc: string; cropRatio: number }) {
  const [style, setStyle] = useState<React.CSSProperties>({ display: "none" });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const ir = nw / nh;
      let cropFrac: number; // fraction of width or height that is cropped
      if (ir > cropRatio) {
        // Image wider → darken sides
        cropFrac = 1 - (nh * cropRatio) / nw;
        const sidePct = (cropFrac / 2) * 100;
        setStyle({
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right,
            rgba(0,0,0,0.55) ${sidePct}%,
            transparent ${sidePct}%,
            transparent ${100 - sidePct}%,
            rgba(0,0,0,0.55) ${100 - sidePct}%)`,
          pointerEvents: "none",
        });
      } else {
        // Image taller → darken top & bottom
        cropFrac = 1 - (nw / cropRatio) / nh;
        const sidePct = (cropFrac / 2) * 100;
        setStyle({
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to bottom,
            rgba(0,0,0,0.55) ${sidePct}%,
            transparent ${sidePct}%,
            transparent ${100 - sidePct}%,
            rgba(0,0,0,0.55) ${100 - sidePct}%)`,
          pointerEvents: "none",
        });
      }
    };
    img.src = imgSrc;
  }, [imgSrc, cropRatio]);

  return <div style={style} />;
}

/** Shows the expected output size (prediction) or real result after conversion. */
function CropInfo({ item, opts, formatSize: fs }: {
  item: QueueItem;
  opts: ResizeOptions;
  formatSize: (b: number) => string;
}) {
  const [text, setText] = useState<string | null>(null);
  const mountKey = `${item.id}_${opts.width}_${opts.height}_${opts.cropRatio}_${opts.outMime}_${item.blobs?.[0]?.size ?? ""}`;

  useEffect(() => {
    let cancelled = false;

    // ── Real result (after conversion) ──
    if (item.blobs?.[0]) {
      const inFmtShort = resolveFmt("__same__", item.file.type);
      const outFmtShort = resolveFmt(item.blobs[0].type, item.file.type);
      setText(`${inFmtShort.toUpperCase()} (${fs(item.file.size)}) → ${outFmtShort.toUpperCase()} (${fs(item.blobs[0].size)})`);
      return;
    }

    // ── Prediction ──
    const url = item.thumbUrl;
    if (!url) { setText(null); return; }
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const sourceBpp = (item.file.size * 8) / (nw * nh);

      let cw = nw, ch = nh;
      if (opts.cropRatio) {
        const ir = nw / nh;
        if (ir > opts.cropRatio) { cw = Math.round(nh * opts.cropRatio); }
        else { ch = Math.round(nw / opts.cropRatio); }
      }
      const ratio = Math.min(opts.width / cw, opts.height / ch, 1);
      const ow = Math.round(cw * ratio);
      const oh = Math.round(ch * ratio);

      const inFmtShort = resolveFmt("__same__", item.file.type);
      const outFmtShort = resolveFmt(opts.outMime, item.file.type);
      const estimated = estimateSizeBytes(ow, oh, outFmtShort, inFmtShort, sourceBpp);

      setText(`${inFmtShort.toUpperCase()} (${fs(item.file.size)}) → ${outFmtShort.toUpperCase()} (~${fs(estimated)})`);
    };
    img.onerror = () => { if (!cancelled) setText(null); };
    img.src = url;
    return () => { cancelled = true; };
  }, [mountKey]);

  if (!text) return null;
  return <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{text}</span>;
}

export function ResizeSection() {
  const { t } = useTranslation();
  const {
    queue,
    addFiles,
    removeItem,
    clearQueue,
    processOne,
    processAll,
    downloadItem,
    selectAll,
    selectNone,
    toggleSelect,
    defaultOptions,
  } = useResizeQueue();

  const [opts, setOpts] = useState<ResizeOptions>(defaultOptions);
  const [cropVal, setCropVal] = useState("");
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);
  const [galIdx, setGalIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const ratioRef = useRef(1);

  // ── Compute aspect ratio from the first image ──
  useEffect(() => {
    const first = queue[0];
    if (!first) return;
    const url = first.thumbUrl;
    if (!url) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        ratioRef.current = img.naturalWidth / img.naturalHeight;
        setOpts((prev) => {
          if (prev.width === defaultOptions.width) {
            return { ...prev, height: Math.max(1, Math.round(prev.width / ratioRef.current)) };
          }
          return prev;
        });
      }
    };
    img.src = url;
  }, [queue.length > 0 ? queue[0]?.id : null]);

  // ── Build effective opts with cropRatio ──
  const currentOpts = useMemo<ResizeOptions>(
    () => ({ ...opts, cropRatio: cropVal ? (RATIO_MAP[cropVal] ?? null) : null }),
    [opts, cropVal],
  );

  const handleWidthChange = useCallback(
    (w: number) => {
      const width = Math.max(1, w);
      setOpts((p) => ({ ...p, width, height: Math.max(1, Math.round(width / ratioRef.current)) }));
    },
    [],
  );

  const handleFiles = useCallback((files: FileList) => addFiles(files), [addFiles]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles],
  );

  const handleResizeOne = useCallback(
    async (item: (typeof queue)[number]) => { await processOne(item, currentOpts); },
    [processOne, currentOpts],
  );

  const handleResizeAll = useCallback(() => { void processAll(currentOpts); }, [processAll, currentOpts]);

  const handleDownload = useCallback((item: (typeof queue)[number]) => downloadItem(item), [downloadItem]);

  return (
    <>
      {/* ── Drop zone only (always visible) ── */}
      <div className="card">
        <DropZone onFiles={handleFiles} />
      </div>

      {/* ── Input gallery + tools ── */}
      {queue.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>{t("images.resize.title")}</h3>

          <div className="resize-input-gallery">
            {(() => {
              const current = queue[galIdx];
              const isReady = current?.status === "ready" && current.blobs?.[0];

              // ── After conversion: comparison slider ──
              if (isReady && current) {
                return (
                  <div className="resize-input-gallery__main">
                    <div className="resize-input-gallery__compare">
                      <ImageCompareSlider
                        beforeSrc={current.thumbUrl!}
                        afterSrc={URL.createObjectURL(current.blobs![0]!)}
                        beforeLabel={t("images.resize.before")}
                        afterLabel={t("images.resize.after")}
                        beforeSize={formatSize(current.file.size)}
                        afterSize={formatSize(current.blobs![0]!.size)}
                      />
                    </div>
                    <div className="resize-input-gallery__info">
                      <CropInfo item={current} opts={currentOpts} formatSize={formatSize} />
                    </div>
                  </div>
                );
              }

              // ── Before conversion: plain image with optional crop overlay ──
              return (
                <div className="resize-input-gallery__main">
                  {current?.thumbUrl ? (
                    <CropPreview imgSrc={current.thumbUrl} cropRatio={currentOpts.cropRatio} />
                  ) : (
                    <div className="resize-input-gallery__empty">{t("images.resize.noPreview")}</div>
                  )}
                  <div className="resize-input-gallery__info">
                    {current && <CropInfo item={current} opts={currentOpts} formatSize={formatSize} />}
                  </div>
                </div>
              );
            })()}

            {queue.length > 1 && (
              <div className="resize-input-gallery__nav">
                <button type="button" className="resize-gallery__arrow"
                  onClick={() => setGalIdx((p) => (p - 1 + queue.length) % queue.length)}>‹</button>
                <div className="resize-input-gallery__thumbs">
                  {queue.map((item, i) => (
                    <button key={item.id} type="button"
                      className={`resize-gallery__thumb${i === galIdx ? " is-active" : ""}`}
                      onClick={() => setGalIdx(i)}>
                      {item.thumbUrl && <img src={item.thumbUrl} alt="" />}
                    </button>
                  ))}
                </div>
                <button type="button" className="resize-gallery__arrow"
                  onClick={() => setGalIdx((p) => (p + 1) % queue.length)}>›</button>
              </div>
            )}
          </div>

          {/* ── Options row ── */}
          <div className="images-row" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div className="field" style={{ flex: "0 0 100px" }}>
              <label htmlFor="resize-width">{t("images.resize.width")}</label>
              <input id="resize-width" type="number" min={1} max={10000} value={opts.width}
                onChange={(e) => handleWidthChange(Number(e.target.value) || 1)} />
            </div>
            <div className="field" style={{ flex: "0 0 90px" }}>
              <label htmlFor="resize-quality">{t("images.quality")}</label>
              <input id="resize-quality" type="number" min={10} max={100} value={opts.quality}
                onChange={(e) => setOpts((p) => ({ ...p, quality: Math.min(100, Math.max(10, Number(e.target.value) || 85)) }))} />
            </div>
            <div className="field" style={{ flex: "0 0 110px" }}>
              <label htmlFor="resize-format">{t("images.fmtOut")}</label>
              <select id="resize-format" value={opts.outMime}
                onChange={(e) => setOpts((p) => ({ ...p, outMime: e.target.value }))}>
                {MIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {"labelKey" in opt ? t(opt.labelKey!) : opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ flex: "0 0 auto", minWidth: 90 }}>
              <label>{t("images.resize.crop")}</label>
              <select className="toolbar-select" value={cropVal}
                onChange={(e) => setCropVal(e.target.value)}>
                {CROP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="images-toolbar" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-primary" onClick={handleResizeAll}>
              {t("images.resize.resizeAll")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={selectAll}>
              {t("images.selAll")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={selectNone}>
              {t("images.selNone")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearQueue}>
              {t("images.clear")}
            </button>
          </div>
        </div>
      )}

      {/* ── Queue list (1+) ── */}
      {queue.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>
            {t("images.queue")}
            <span className="badge" style={{ marginLeft: 8 }}>{queue.length}</span>
          </h3>
          <div className="images-items">
            {queue.map((item) => (
              <div key={item.id} className="images-item">
                <input type="checkbox" checked={item.selected} onChange={() => toggleSelect(item.id)} />
                <div>
                  {item.thumbUrl && <img className="images-thumb" src={item.thumbUrl} alt="" />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200, fontSize: "0.85rem" }}>
                    {item.file.name}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {(item.file.type.split("/").pop() || "?").toUpperCase()} ({formatSize(item.file.size)})
                  </div>
                  {item.status === "ready" && item.blobs?.[0] && (
                    <div style={{ fontSize: "0.78rem", color: "var(--brand-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                      → {(item.blobs[0].type.split("/").pop() || "?").toUpperCase()} ({formatSize(item.blobs[0].size)})
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "0.8rem" }}>
                  {item.status === "converting" && t("images.statusConverting")}
                  {item.status === "error" && <span style={{ color: "var(--error)" }}>{item.error || t("images.statusError")}</span>}
                  {item.status === "ready" && <span style={{ color: "var(--success)" }}>{t("images.statusReady")}</span>}
                  {item.status === "pending" && <span className="status-wait">{t("images.statusPending")}</span>}
                </div>
                <div className="images-item__actions">
                  <button type="button" className="btn btn-ghost btn-icon" title={t("images.preview")}
                    onClick={() => {
                      const blob = item.blobs?.[0];
                      if (blob) { setPreviewItem({ blob, name: item.file.name }); return; }
                      if (item.thumbUrl) {
                        fetch(item.thumbUrl).then(r => r.blob()).then(b => setPreviewItem({ blob: b, name: item.file.name }));
                      }
                    }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button type="button" className="btn btn-secondary" disabled={item.status === "converting"} onClick={() => handleResizeOne(item)}>
                    {t("images.convert")}
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!item.blobs || item.status !== "ready"} onClick={() => handleDownload(item)}>
                    {t("images.download")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-icon" title={t("images.remove")} onClick={() => {
                    if (galIdx >= queue.length - 1 && queue.length > 1) setGalIdx((p) => Math.max(0, p - 1));
                    removeItem(item.id);
                  }}>
                    <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>×</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}





      <PreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleInputChange} />
    </>
  );
}
