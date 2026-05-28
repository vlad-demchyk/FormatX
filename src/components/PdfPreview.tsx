import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { renderPdfPages, revokeSignPages } from "../features/documents/sign/pdfRender";
import type { SignPage } from "../features/documents/sign/types";

interface Props {
  data: ArrayBuffer;
  fileName: string;
}

/**
 * Renders PDF pages as images using pdf.js (same engine as SignSection).
 * Works reliably on all devices — no native PDF viewer dependency.
 */
export function PdfPreview({ data, fileName }: Props) {
  const { t } = useTranslation();
  const [pages, setPages] = useState<SignPage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);
    setPageIndex(0);
    setZoom(1);

    renderPdfPages(data, 1.5)
      .then((result) => {
        if (!mountedRef.current) {
          revokeSignPages(result.pages);
          return;
        }
        setPages(result.pages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Failed to render PDF");
        setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, [data]);

  // Cleanup pages on unmount
  useEffect(() => {
    return () => {
      if (pages.length > 0) revokeSignPages(pages);
    };
    // Only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const page = pages[pageIndex];

  const goPrev = useCallback(() => {
    setPageIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageIndex((i) => Math.min(pages.length - 1, i + 1));
  }, [pages.length]);

  if (error) {
    return (
      <div className="preview-error">
        <p>{t("documents.signLoadError")}</p>
        <p className="preview-error__detail">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="preview-loading">
        <p>{t("documents.signLoadingDoc")}</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="preview-error">
        <p>{t("documents.signLoadError")}</p>
      </div>
    );
  }

  const displayW = Math.round(page.nativeWidth * zoom);
  const displayH = Math.round(page.nativeHeight * zoom);

  return (
    <div className="pdf-preview">
      <div
        className="pdf-preview__page"
        style={{
          width: displayW,
          maxWidth: "100%",
          margin: "0 auto",
        }}
      >
        <img
          src={page.previewUrl}
          alt={`${fileName} — ${t("documents.signPage", { current: pageIndex + 1, total: pages.length })}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 4 }}
          draggable={false}
        />
      </div>
      {pages.length > 1 && (
        <div className="pdf-preview__nav">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={goPrev}
            disabled={pageIndex === 0}
          >
            ←
          </button>
          <span className="pdf-preview__page-label">
            {pageIndex + 1} / {pages.length}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={goNext}
            disabled={pageIndex >= pages.length - 1}
          >
            →
          </button>
          <span className="pdf-preview__zoom-label">{Math.round(zoom * 100)}%</span>
        </div>
      )}
      {pages.length <= 1 && (
        <div className="pdf-preview__nav">
          <span className="pdf-preview__zoom-label">{Math.round(zoom * 100)}%</span>
        </div>
      )}
      {/* Zoom controls */}
      <div className="pdf-preview__zoom" style={{ display: "none" }}>
        {/* Hidden — zoom is controlled via PreviewModal toolbar */}
      </div>
    </div>
  );
}
