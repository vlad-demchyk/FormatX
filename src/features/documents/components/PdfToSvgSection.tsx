import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { initialize, convertPdfToSvg } from "pdf-into-svg";
import { downloadBlob } from "../../../lib/download";
import { logger } from "../../../lib/logger";

export function PdfToSvgSection() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setPreviewUrl(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
      setPreviewUrl(null);
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setPreviewUrl(null);

    try {
      // Initialize WASM on first use
      if (!initializedRef.current) {
        setInitializing(true);
        await initialize();
        initializedRef.current = true;
        setInitializing(false);
      }

      const data = await selectedFile.arrayBuffer();
      const result = await convertPdfToSvg(data);
      const stem = selectedFile.name.replace(/\.[^.]+$/, "");

      if (result.pages.length === 0) {
        throw new Error("No pages found in PDF");
      }

      // For multi-page PDFs, wrap all pages in a single SVG
      let svgString: string;
      if (result.pages.length === 1) {
        svgString = result.pages[0]!.svg;
      } else {
        const svgPages = result.pages.map((p) => p.svg);
        // Extract viewBox from first page to measure dimensions
        const firstSvg = svgPages[0]!;
        const wMatch = firstSvg.match(/width="([\d.]+)"/);
        const hMatch = firstSvg.match(/height="([\d.]+)"/);
        const pw = wMatch ? parseFloat(wMatch[1]!) : 800;
        const ph = hMatch ? parseFloat(hMatch[1]!) : 600;
        const totalHeight = svgPages.length * (ph + 20) - 20;
        svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${totalHeight}" viewBox="0 0 ${pw} ${totalHeight}">\n${svgPages.map((s, i) => `<g transform="translate(0, ${i * (ph + 20)})">${s.replace(/<svg[^>]*>|<\/svg>/g, "")}</g>`).join("\n")}\n</svg>`;
      }

      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      setResult({ blob, name: `${stem}.svg` });
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Conversion failed";
      logger.error("PDF→SVG error:", msg, e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  return (
    <div>
      <h3>{t("documents.pdf2svgTitle")}</h3>
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("documents.pdf2svgDesc")}
      </p>

      <div
        className="images-drop"
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ cursor: "pointer", marginBottom: 16 }}
      >
        <p><strong>{selectedFile ? selectedFile.name : t("documents.pdf2svgDrop")}</strong></p>
        {selectedFile && (
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            PDF · {(selectedFile.size / 1024).toFixed(0)} KB
          </p>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        hidden
        onChange={handleFile}
      />

      {(initializing && (
        <div className="card" style={{ marginBottom: 12, textAlign: "center" }}>
          <p>{t("documents.wasmLoading")}</p>
        </div>
      ))}

      <button
        type="button"
        className="btn btn-primary"
        disabled={!selectedFile || loading || initializing}
        onClick={handleConvert}
        style={{ width: "100%" }}
      >
        {initializing
          ? t("documents.wasmLoading")
          : loading
            ? t("images.statusConverting")
            : t("documents.pdf2svgConvert")}
      </button>

      {error && (
        <div className="card" style={{ marginTop: 12, borderColor: "var(--error)" }}>
          <p style={{ color: "var(--error)", fontSize: "0.85rem" }}>{error}</p>
        </div>
      )}

      {result && previewUrl && (
        <div className="card" style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            ✅ {t("documents.pdf2svgReady")}
          </p>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 12 }}>
            {result.name} · {(result.blob.size / 1024).toFixed(0)} KB
          </p>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 8,
              marginBottom: 12,
              background: "#fff",
              maxHeight: 300,
              overflow: "auto",
              textAlign: "center",
            }}
          >
            <img src={previewUrl} alt="SVG preview" style={{ maxWidth: "100%", maxHeight: 280 }} />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => downloadBlob(result.blob, result.name)}
            style={{ width: "100%" }}
          >
            {t("images.download")}
          </button>
        </div>
      )}
    </div>
  );
}
