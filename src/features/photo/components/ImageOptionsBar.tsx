import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/* ── Constants ── */

const MIME_OPTIONS = [
  { value: "__same__", labelKey: "images.resize.sameFormat" },
  { value: "image/png", label: "PNG" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/webp", label: "WebP" },
] as const;

const CROP_OPTIONS = [
  { value: "", label: "✂️" },
  { value: "1:1", label: "1:1" },
  { value: "4:3", label: "4:3" },
  { value: "3:2", label: "3:2" },
  { value: "16:9", label: "16:9" },
  { value: "9:16", label: "9:16" },
  { value: "2:3", label: "2:3" },
  { value: "3:4", label: "3:4" },
] as const;

type TabId = "width" | "quality" | "result" | "crop";

interface Props {
  width: number;
  height: number;
  quality: number;
  outMime: string;
  cropVal: string;
  naturalWidth: number;
  onWidthChange: (w: number) => void;
  onQualityChange: (q: number) => void;
  onMimeChange: (m: string) => void;
  onCropChange: (v: string) => void;
}

export function ImageOptionsBar({
  width,
  height,
  quality,
  outMime,
  cropVal,
  naturalWidth,
  onWidthChange,
  onQualityChange,
  onMimeChange,
  onCropChange,
}: Props) {
  const { t } = useTranslation();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabId>("width");

  const tabs: { id: TabId; label: string }[] = [
    { id: "width",   label: t("images.resize.width") },
    { id: "quality", label: "Якість %" },
    { id: "result",  label: t("images.fmtOut") },
    { id: "crop",    label: t("images.resize.crop") },
  ];

  /* ── Scroll helpers ── */

  const scrollToTab = useCallback((id: TabId) => {
    const container = tabsRef.current;
    if (!container) return;
    const btn = container.querySelector<HTMLElement>(`[data-tab="${id}"]`);
    if (!btn) return;
    const cw = container.offsetWidth;
    const bw = btn.offsetWidth;
    container.scrollTo({
      left: btn.offsetLeft - cw / 2 + bw / 2,
      behavior: "smooth",
    });
  }, []);

  const handleTabClick = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      scrollToTab(id);
    },
    [scrollToTab],
  );

  const handlePrev = useCallback(() => {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (idx <= 0) return;
    const prev = tabs[idx - 1]!;
    setActiveTab(prev.id);
    scrollToTab(prev.id);
  }, [activeTab, tabs, scrollToTab]);

  const handleNext = useCallback(() => {
    const idx = tabs.findIndex((t) => t.id === activeTab);
    if (idx >= tabs.length - 1) return;
    const next = tabs[idx + 1]!;
    setActiveTab(next.id);
    scrollToTab(next.id);
  }, [activeTab, tabs, scrollToTab]);

  /* ── Width range ── */

  const handleWidthRange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onWidthChange(Number(e.target.value));
    },
    [onWidthChange],
  );

  /* ── Quality range ── */

  const handleQualityRange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onQualityChange(Number(e.target.value));
    },
    [onQualityChange],
  );

  return (
    <div className="image-options">
      {/* ── Tab strip ── */}
      <div className="image-options__strip">
        <button
          type="button"
          className="image-options__arrow"
          onClick={handlePrev}
          disabled={tabs.findIndex((t) => t.id === activeTab) <= 0}
          aria-label="Previous tab"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="image-options__scroll" ref={tabsRef}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-tab={tab.id}
              className={`image-options__tab${activeTab === tab.id ? " is-active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="image-options__arrow"
          onClick={handleNext}
          disabled={tabs.findIndex((t) => t.id === activeTab) >= tabs.length - 1}
          aria-label="Next tab"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      {/* ── Active panel ── */}
      <div className="image-options__panel">
        {activeTab === "width" && (
          <div className="image-options__range-group">
            <div className="image-options__range-header">
              <span>{width} × {height} px</span>
            </div>
            <input
              type="range"
              className="image-options__range"
              min={100}
              max={naturalWidth}
              step={10}
              value={width}
              onChange={handleWidthRange}
            />
            <div className="image-options__range-labels">
              <span>100</span>
              <span>{naturalWidth}</span>
            </div>
          </div>
        )}

        {activeTab === "quality" && (
          <div className="image-options__range-group">
            <div className="image-options__range-header">
              <span>{quality}%</span>
            </div>
            <input
              type="range"
              className="image-options__range"
              min={10}
              max={100}
              step={1}
              value={quality}
              onChange={handleQualityRange}
            />
            <div className="image-options__range-labels">
              <span>10%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {activeTab === "result" && (
          <div className="image-options__btn-group">
            {MIME_OPTIONS.map((opt) => {
              const label = "labelKey" in opt ? t(opt.labelKey) : opt.label;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`image-options__btn${outMime === opt.value ? " is-active" : ""}`}
                  onClick={() => onMimeChange(opt.value)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "crop" && (
          <div className="image-options__btn-group">
            {CROP_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`image-options__btn${cropVal === opt.value ? " is-active" : ""}`}
                onClick={() => onCropChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
