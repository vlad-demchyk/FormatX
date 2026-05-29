import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { DocumentsConvertSection } from "./components/ConvertSection";
import { PdfToSvgSection } from "./components/PdfToSvgSection";
import { PlaceholderSection } from "./components/PlaceholderSection";
import { SignSection } from "./components/SignSection";
import { PreviewModal } from "../../components/PreviewModal";
import type { DocumentQueueItem } from "./types";
import { hashFor } from "../../app/hooks/useAppRoute";
import { useSectionRouting } from "../../lib/hooks/useSectionRouting";
import { themedIcon } from "../../lib/iconTheme";

import convertRaw from "/assets/icons/streamline-ultimate_coding-apps-website-data-conversion-documents-1.svg?raw";
import summarizeRaw from "/assets/icons/material-symbols_summarize-outline.svg?raw";
import signRaw from "/assets/icons/mdi_sign.svg?raw";
import frame4Raw from "/assets/icons/Frame 4.svg?raw";
import translateRaw from "/assets/icons/ant-design_global-outlined.svg?raw";

type DocSection = "convert" | "summarize" | "translate" | "sign" | "pdf2svg";

const SECTIONS: { id: DocSection; labelKey: string; descKey: string; icon: string }[] = [
  { id: "convert",   labelKey: "documents.sectionConvert",   descKey: "documents.sectionConvertDesc",   icon: themedIcon(convertRaw) },
  { id: "summarize", labelKey: "documents.sectionSummarize", descKey: "documents.sectionSummarizeDesc", icon: themedIcon(summarizeRaw) },
  { id: "translate", labelKey: "documents.sectionTranslate", descKey: "documents.sectionTranslateDesc", icon: themedIcon(translateRaw) },
  { id: "sign",      labelKey: "documents.sectionSign",      descKey: "documents.sectionSignDesc",      icon: themedIcon(signRaw) },
  { id: "pdf2svg",   labelKey: "documents.sectionPdf2Svg",   descKey: "documents.sectionPdf2SvgDesc",   icon: themedIcon(frame4Raw) },
];

export function DocumentsPage() {
  const { t } = useTranslation();

  /* ── Section routing ── */
  const validSections: DocSection[] = ["convert", "summarize", "translate", "sign", "pdf2svg"];
  const { section, setSection } = useSectionRouting(validSections, "documents", hashFor as (page: string, section?: string) => string);

  /* ── Shared preview state ── */
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);

  const handlePreview = useCallback((item: DocumentQueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob) return;
    setPreviewItem({ blob, name: item.file.name });
  }, []);

  return (
    <>
      <h2>{t("documents.title")}</h2>

      {section === null && (
        /* ── Card grid (home) ── */
        <div className="doc-cards">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="doc-card"
              onClick={() => setSection(s.id)}
            >
              <span className="doc-card__icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: s.icon }} />
              <span className="doc-card__title">{t(s.labelKey)}</span>
              <span className="doc-card__desc">{t(s.descKey)}</span>
            </button>
          ))}
        </div>
      )}

      {section !== null && (
        /* ── Active section view ── */
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSection(null)}
            style={{ marginBottom: 12 }}
          >
            ← {t("documents.back")}
          </button>

          {section === "convert" && <DocumentsConvertSection onPreview={handlePreview} />}
          {section === "pdf2svg" && (
            <div className="card">
              <PdfToSvgSection />
            </div>
          )}
          {section === "summarize" && (
            <div className="card">
              <PlaceholderSection titleKey="documents.sectionSummarize" descKey="documents.summarizeDesc" icon="📝" />
            </div>
          )}
          {section === "translate" && (
            <div className="card">
              <PlaceholderSection titleKey="documents.sectionTranslate" descKey="documents.translateDesc" icon="🌐" />
            </div>
          )}
          {section === "sign" && <SignSection />}
        </>
      )}

      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </>
  );
}
