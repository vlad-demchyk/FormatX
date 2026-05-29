import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { PreviewModal } from "../../components/PreviewModal";
import type { QueueItem } from "../images/types";
import { type HistoryItem } from "../../lib/db";
import { hashFor } from "../../app/hooks/useAppRoute";
import { useSectionRouting } from "../../lib/hooks/useSectionRouting";
import { themedIcon } from "../../lib/iconTheme";
import { ConvertSection } from "./components/ConvertSection";
import { HistorySection } from "./components/HistorySection";
import { MetadataSection } from "./components/MetadataSection";
import { ResizeSection } from "./components/ResizeSection";

import convertRaw from "/assets/icons/tabler_photo.svg?raw";
import historyRaw from "/assets/icons/clipboard-list.svg?raw";
import metadataRaw from "/assets/icons/material-symbols_brush.svg?raw";

type PhotoSection = "convert" | "history" | "metadata" | "resize";

const SECTIONS: { id: PhotoSection; labelKey: string; descKey: string; icon: string }[] = [
  { id: "convert",  labelKey: "images.sectionConvert",  descKey: "images.sectionConvertDesc",  icon: themedIcon(convertRaw) },
  { id: "history",  labelKey: "images.sectionHistory",  descKey: "images.sectionHistoryDesc",  icon: themedIcon(historyRaw) },
  { id: "metadata", labelKey: "images.sectionMetadata", descKey: "images.sectionMetadataDesc", icon: themedIcon(metadataRaw) },
  {
    id: "resize",
    labelKey: "images.sectionResize",
    descKey: "images.sectionResizeDesc",
    icon: `<svg width=\"48\" height=\"48\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M15 3h6v6\"/><path d=\"M9 21H3v-6\"/><path d=\"M21 3l-7 7\"/><path d=\"M3 21l7-7\"/></svg>`,
  },
];

export function PhotoPage() {
  const { t } = useTranslation();

  /* ── Section routing ── */
  const validSections: PhotoSection[] = ["convert", "history", "metadata", "resize"];
  const { section, setSection } = useSectionRouting(validSections, "photo", hashFor as (page: string, section?: string) => string);

  /* ── Shared preview state ── */
  const [previewItem, setPreviewItem] = useState<{ blob: Blob; name: string } | null>(null);

  const handleImagePreview = useCallback((item: QueueItem) => {
    const blob = item.blobs?.[0];
    if (!blob) return;
    setPreviewItem({ blob, name: item.file.name });
  }, []);

  const handleHistoryPreview = useCallback((item: HistoryItem) => {
    if (item.blob) {
      setPreviewItem({ blob: item.blob, name: item.filename });
    }
  }, []);

  return (
    <>
      <h2>{t("images.title")}</h2>

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
            ← {t("images.title")}
          </button>

          {section === "convert" && <ConvertSection onPreview={handleImagePreview} />}
          {section === "history" && <HistorySection active={true} onPreview={handleHistoryPreview} />}
          {section === "metadata" && <MetadataSection />}
          {section === "resize" && <ResizeSection />}
        </>
      )}

      <PreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </>
  );
}
