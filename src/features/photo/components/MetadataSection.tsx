import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import exifr from "exifr";
import type { optimize as SvgoOptimize } from "svgo/browser";
import { DropZone } from "./DropZone";

// Lazy-load SVGO (browser entry) — heavy library (~300 KB), loaded only when user picks SVGO method
let svgoOptimize: typeof SvgoOptimize | null = null;
async function getSvgo() {
  if (!svgoOptimize) {
    const mod = await import("svgo/browser");
    svgoOptimize = mod.optimize;
  }
  return svgoOptimize;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

/* ── Types ── */

interface MetaFile {
  file: File;
  thumbUrl: string;
  /** parsed metadata (exifr for raster, custom for SVG) */
  metadata: Record<string, unknown> | null;
  analyzed: boolean;
  analyzing: boolean;
  cleanBlob: Blob | null;
  cleaning: boolean;
  error: string | null;
  /** SVG-specific */
  svgSource?: string;
  svgIssues?: SvgIssue[];
  svgEdited?: string;
}

interface SvgIssue {
  type: "metadata" | "comment" | "editor-attrs" | "raster" | "empty-id";
  label: string;
  snippet: string;
  start: number;
  end: number;
}

/* ─── SVG helpers ─── */

function analyzeSvg(text: string): { metadata: Record<string, unknown>; issues: SvgIssue[] } {
  const issues: SvgIssue[] = [];
  const meta: Record<string, unknown> = {};
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");

  // <metadata>
  const metaEl = doc.querySelector("metadata");
  if (metaEl?.textContent?.trim()) {
    meta.metadata = metaEl.textContent.trim();
    issues.push({
      type: "metadata", label: "<metadata> tag", snippet: `<metadata>…</metadata>`,
      start: text.indexOf("<metadata"),
      end: text.indexOf("</metadata>") + "</metadata>".length,
    });
  }

  // <!-- comments -->
  const commentRe = /<!--[\s\S]*?-->/g;
  let m: RegExpExecArray | null;
  const comments: string[] = [];
  while ((m = commentRe.exec(text)) !== null) {
    comments.push(m[0]);
    issues.push({
      type: "comment", label: "XML comment", snippet: m[0].slice(0, 60),
      start: m.index, end: m.index + m[0].length,
    });
  }
  if (comments.length) meta.comments = comments;

  // editor-specific attrs (inkscape, sodipodi, data-name, etc.)
  const editorAttrRe = /(inkscape:|sodipodi:|data-name|data-source|illustrator:)/gi;
  const editorMatches = text.match(editorAttrRe);
  if (editorMatches) {
    meta.editorAttrs = editorMatches.length;
    // collect unique attribute names
    const attrNames = new Set(editorMatches.map((a) => a.replace(/[:=].*$/, "")));
    meta.editorAttrNames = [...attrNames];
    issues.push({
      type: "editor-attrs", label: `Editor attributes (${editorMatches.length})`,
      snippet: [...attrNames].join(", "),
      start: 0, end: 0,
    });
  }

  // embedded raster images (data:image)
  const rasterRe = /data:image\/(png|jpeg|jpg|gif|webp);base64,[a-zA-Z0-9+/=]+/g;
  let rasterMatch: RegExpExecArray | null;
  const rasters: string[] = [];
  while ((rasterMatch = rasterRe.exec(text)) !== null) {
    rasters.push(rasterMatch[0].slice(0, 50));
    issues.push({
      type: "raster", label: "Embedded raster image", snippet: rasterMatch[0].slice(0, 60),
      start: rasterMatch.index, end: rasterMatch.index + rasterMatch[0].length,
    });
  }
  if (rasters.length) meta.embeddedRasters = rasters.length;

  // empty IDs (st0, st1…)
  const idRe = /\sid="[^"]*"/g;
  let idMatch: RegExpExecArray | null;
  const ids: string[] = [];
  while ((idMatch = idRe.exec(text)) !== null) {
    ids.push(idMatch[0]);
  }
  if (ids.length > 3) {
    meta.generatedIds = ids.length;
    issues.push({
      type: "empty-id", label: `Generated IDs (${ids.length})`,
      snippet: `e.g. ${ids.slice(0, 3).join(", ")}…`,
      start: 0, end: 0,
    });
  }

  meta.fileSize = text.length;
  return { metadata: meta, issues };
}

/** SVGO-based cleaner (потужний multipass-оптимізатор, lazy-loaded ~300 KB) */
async function autoCleanSvgSvgo(text: string): Promise<string> {
  const optimize = await getSvgo();
  const result = optimize(text, {
    multipass: true,
    plugins: [
      "preset-default",
      "removeMetadata",
      "removeComments",
      "removeDesc",
      "removeTitle",
      { name: "removeAttrs", params: { attrs: ["data-name", "inkscape:*", "sodipodi:*", "illustrator:*"] } },
      "removeRasterImages",
      "removeEmptyAttrs",
      "removeEmptyContainers",
      "removeUnusedNS",
      "sortAttrs",
    ],
  });
  return result.data;
}

/** DOMParser-based cleaner (легкий, працює скрізь) */
function autoCleanSvgDom(text: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "image/svg+xml");
  doc.querySelectorAll("metadata").forEach((el) => el.remove());
  const removeComments = (node: Node) => {
    let child = node.firstChild;
    while (child) {
      const next = child.nextSibling;
      if (child.nodeType === 8) node.removeChild(child);
      else removeComments(child);
      child = next;
    }
  };
  removeComments(doc);
  const editorAttrs = ["data-name", "inkscape:", "sodipodi:", "illustrator:"];
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (editorAttrs.some((prefix) => attr.name.startsWith(prefix))) el.removeAttribute(attr.name);
    });
  });
  doc.querySelectorAll("desc, title").forEach((el) => el.remove());
  return new XMLSerializer().serializeToString(doc).replace(/^<\?xml[^>]*\?>/, "").trim();
}

/* ─── Raster helpers ─── */

function flattenMetadata(obj: Record<string, unknown>, prefix = ""): [string, unknown][] {
  const entries: [string, unknown][] = [];
  for (const [key, val] of Object.entries(obj)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      entries.push(...flattenMetadata(val as Record<string, unknown>, label));
    } else {
      entries.push([label, val]);
    }
  }
  return entries;
}

function stripMetaViaCanvas(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D not available")); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error("toBlob failed")); },
        file.type,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

/* ── Component ── */

export function MetadataSection() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<MetaFile[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isSvg = (f: File) => f.type === "image/svg+xml" || f.name.toLowerCase().endsWith(".svg");

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: MetaFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".svg")) continue;
      const thumbUrl = URL.createObjectURL(file);
      newFiles.push({
        file, thumbUrl,
        metadata: null, analyzed: false, analyzing: false,
        cleanBlob: null, cleaning: false, error: null,
        svgSource: undefined, svgIssues: undefined, svgEdited: undefined,
      });
    }
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) { handleFiles(e.target.files); e.target.value = ""; }
    },
    [handleFiles],
  );

  /* ── Analyze ── */

  const handleAnalyze = useCallback(async (idx: number) => {
    const item = files[idx];
    if (!item || item.analyzing) return;
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, analyzing: true, error: null } : f)));

    try {
      if (isSvg(item.file)) {
        const text = await item.file.text();
        const { metadata, issues } = analyzeSvg(text);
        setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, metadata, svgSource: text, svgIssues: issues, analyzed: true, analyzing: false } : f)));
      } else {
        // Try exifr first (supports JPEG, PNG, WebP, HEIC, TIFF, AVIF)
        let meta: Record<string, unknown> | null = null;
        try {
          const parsed = await exifr.parse(item.file, { multiSegment: true });
          meta = (parsed as Record<string, unknown>) ?? null;
        } catch {
          // exifr may fail for some WebP/PNG files — treat as "no metadata"
          meta = null;
        }
        setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, metadata: meta, analyzed: true, analyzing: false } : f)));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to read metadata";
      setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, analyzed: true, analyzing: false, error: msg } : f)));
    }
  }, [files]);

  /* ── Clean (auto) ── */

  const handleClean = useCallback(async (idx: number) => {
    const item = files[idx];
    if (!item || item.cleaning) return;
    setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, cleaning: true, error: null } : f)));

    try {
      if (isSvg(item.file) && item.svgSource !== undefined) {
        const src = item.svgEdited || item.svgSource;
        const method = localStorage.getItem("formatx-svg-cleaner") || "svgo";
        console.log(`[MetadataSection] SVG cleaner method: ${method}`);
        const cleaned = method === "domparser"
          ? autoCleanSvgDom(src)
          : await autoCleanSvgSvgo(src);
        const blob = new Blob([cleaned], { type: "image/svg+xml" });
        setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, cleanBlob: blob, cleaning: false } : f)));
      } else {
        const cleanBlob = await stripMetaViaCanvas(item.file);
        setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, cleanBlob, cleaning: false } : f)));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to clean";
      setFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, cleaning: false, error: msg } : f)));
    }
  }, [files]);

  /* ── Manual edit ── */

  const handleOpenEditor = useCallback((idx: number) => {
    const item = files[idx];
    if (!item?.svgSource) return;
    setEditingIdx(idx);
    setEditText(item.svgEdited || item.svgSource);
  }, [files]);

  const handleSaveEdit = useCallback(() => {
    if (editingIdx === null) return;
    const blob = new Blob([editText], { type: "image/svg+xml" });
    setFiles((prev) => prev.map((f, i) => (i === editingIdx ? { ...f, svgEdited: editText, cleanBlob: blob } : f)));
    setEditingIdx(null);
    setEditText("");
  }, [editingIdx, editText]);

  /* ── Download ── */

  const handleDownload = useCallback((idx: number) => {
    const item = files[idx];
    if (!item?.cleanBlob) return;
    const cleanName = item.file.name.replace(/\.[^/.]+$/, "_clean$&");
    const url = URL.createObjectURL(item.cleanBlob);
    const a = document.createElement("a");
    a.href = url; a.download = cleanName; a.click();
    URL.revokeObjectURL(url);
  }, [files]);

  const handleRemove = useCallback((idx: number) => {
    setFiles((prev) => {
      const item = prev[idx];
      if (item?.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const hasMeta = (m: Record<string, unknown> | null | undefined): boolean => m != null && Object.keys(m).length > 0;

  const isSvgItem = (item: MetaFile) => isSvg(item.file);

  const issueColors: Record<string, string> = {
    metadata: "#ff6b6b", comment: "#ffd93d", "editor-attrs": "#6bcbff",
    raster: "#ff8a5c", "empty-id": "#c084fc",
  };
  const issueLabels: Record<string, string> = {
    metadata: "Metadata", comment: "Comment", "editor-attrs": "Editor attr",
    raster: "Embedded raster", "empty-id": "Generated ID",
  };

  return (
    <>
      <div className="card">
        <DropZone onFiles={handleFiles} />
      </div>

      {files.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="images-items">
            {files.map((item, idx) => (
              <div key={idx} className="metadata-item">
                <div className="metadata-item__header">
                  <img src={item.thumbUrl} alt="" className="images-thumb" />
                  <div className="metadata-item__info">
                    <div className="metadata-item__name">{item.file.name}</div>
                    <div className="metadata-item__meta">
                      {formatSize(item.file.size)}
                      {item.analyzing && <> · {t("images.statusConverting")}</>}
                      {item.cleaning && <> · {t("images.statusConverting")}</>}
                      {item.error && <> · <span style={{ color: "var(--error)" }}>{item.error}</span></>}
                      {item.cleanBlob && <> → {formatSize(item.cleanBlob.size)}</>}
                    </div>
                  </div>
                  <div className="metadata-item__actions">
                    {!item.analyzed && !item.analyzing && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleAnalyze(idx)}>Аналіз</button>
                    )}
                    {item.analyzed && !item.cleanBlob && !item.cleaning && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleClean(idx)}>Очистити</button>
                    )}
                    {item.analyzed && isSvgItem(item) && !item.cleanBlob && !item.cleaning && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleOpenEditor(idx)}>Ручне</button>
                    )}
                    {item.cleaning && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>…</span>}
                    {item.cleanBlob && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => handleDownload(idx)}>Завантажити</button>
                    )}
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemove(idx)}>
                      <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>×</span>
                    </button>
                  </div>
                </div>

                {/* SVG issues */}
                {item.analyzed && isSvgItem(item) && item.svgIssues && item.svgIssues.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {item.svgIssues.map((issue, i) => (
                      <span key={i} style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600,
                        background: issueColors[issue.type] + "22",
                        color: issueColors[issue.type],
                        border: `1px solid ${issueColors[issue.type]}44`,
                      }}>
                        {issueLabels[issue.type] || issue.type}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metadata table */}
                {item.analyzed && hasMeta(item.metadata) && (
                  <details className="metadata-details" open>
                    <summary className="metadata-summary">
                      {isSvgItem(item) ? "SVG analysis" : `EXIF / IPTC (${Object.keys(item.metadata!).length} keys)`}
                    </summary>
                    <table className="metadata-table">
                      <tbody>
                        {flattenMetadata(item.metadata!).map(([key, val]) => (
                          <tr key={key}>
                            <td className="metadata-key">{key}</td>
                            <td className="metadata-val">{formatMetaValue(val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}

                {item.analyzed && !hasMeta(item.metadata) && !isSvgItem(item) && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 6 }}>Метадані не знайдено</p>
                )}
                {item.analyzed && isSvgItem(item) && (!item.svgIssues || item.svgIssues.length === 0) && (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 6 }}>SVG чистий, проблемних елементів не знайдено</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SVG Manual Editor Modal ── */}
      {editingIdx !== null && (
        <div className="preview-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingIdx(null); }} role="dialog" aria-modal="true">
          <div className="preview-toolbar">
            <span className="preview-toolbar__name">Редагування SVG</span>
            <div className="preview-toolbar__actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveEdit}>Зберегти</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingIdx(null)}>Скасувати</button>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 12, gap: 8, overflow: "hidden" }}>
            {/* Legend */}
            {files[editingIdx]?.svgIssues && files[editingIdx]!.svgIssues!.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.75rem" }}>
                {Object.entries(issueLabels).map(([type, label]) => (
                  <span key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 2, background: issueColors[type] }} />
                    {label}
                  </span>
                ))}
                <span style={{ color: "var(--text-muted)" }}>— This regions are safe to remove</span>
              </div>
            )}
            {/* Highlighted editor */}
            <div
              className="svg-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={(e) => setEditText((e.target as HTMLElement).innerText)}
              style={{
                flex: 1, width: "100%", overflow: "auto",
                fontFamily: '"Cascadia Code", "Fira Code", monospace',
                fontSize: "0.78rem", lineHeight: 1.5, tabSize: 2,
                padding: 12, border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--bg)", color: "var(--text)", whiteSpace: "pre-wrap", wordWrap: "break-word",
              }}
            >
              {renderHighlightedSvg(editText, files[editingIdx]?.svgIssues ?? [], issueColors)}
            </div>
          </div>
        </div>
      )}

      <input ref={inputRef} type="file" accept="image/*,.svg" multiple hidden onChange={handleInputChange} />
    </>
  );
}

/** Рендерить SVG-текст з кольоровим підсвічуванням проблемних зон. */
function renderHighlightedSvg(
  text: string,
  issues: SvgIssue[],
  colors: Record<string, string>,
): ReactNode[] {
  if (!issues.length) return [text];

  const sorted = issues
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let last = 0;

  for (const issue of sorted) {
    if (issue.start > last) {
      nodes.push(text.slice(last, issue.start));
    }
    const color = colors[issue.type] || "#888";
    nodes.push(
      <span
        key={`${issue.start}-${issue.end}`}
        style={{
          background: color + "33",
          borderBottom: `2px solid ${color}`,
          borderRadius: 2,
        }}
        title={issue.label}
      >
        {text.slice(issue.start, issue.end)}
      </span>,
    );
    last = issue.end;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return nodes;
}

function formatMetaValue(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (Array.isArray(val)) return val.map((v) => String(v)).join(", ");
  if (val === null || val === undefined) return "—";
  return String(val);
}
