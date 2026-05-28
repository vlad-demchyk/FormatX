import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../../lib/clipboard";
import { addTextSnippet } from "../../lib/storage";
import { showToast } from "../../app/toast";
import { SanitizerForm } from "./components/SanitizerForm";
import { ClassConverter } from "./components/ClassConverter";
import { SnippetsList } from "./components/SnippetsList";
import { PlaceholderSection } from "../documents/components/PlaceholderSection";
import { useSanitizer } from "./hooks/useSanitizer";

type TextSection = "format" | "replace" | "classes" | "translate" | "summarize";

const SECTIONS: { id: TextSection; labelKey: string; descKey: string; icon: string }[] = [
  { id: "format",    labelKey: "sanitizer.sectionFormat",    descKey: "sanitizer.sectionFormatDesc",    icon: "🔤" },
  { id: "replace",   labelKey: "sanitizer.sectionReplace",   descKey: "sanitizer.sectionReplaceDesc",   icon: "✂️" },
  { id: "classes",   labelKey: "sanitizer.sectionClasses",   descKey: "sanitizer.sectionClassesDesc",   icon: "🎨" },
  { id: "translate", labelKey: "sanitizer.sectionTranslate", descKey: "sanitizer.sectionTranslateDesc", icon: "🌐" },
  { id: "summarize", labelKey: "sanitizer.sectionSummarize", descKey: "sanitizer.sectionSummarizeDesc", icon: "📝" },
];

/** One half of the dual-mode layout — independent card grid + section view. */
function TextPanel({
  section,
  onSelect,
  onBack,
  label,
  state,
  updateOptions,
  updateInput,
  updateClassInput,
  convert,
  handleConvertCopy,
  handleTrimCopy,
  handleClassCopy,
  handleClassConvert,
  t,
}: {
  section: TextSection | null;
  onSelect: (id: TextSection) => void;
  onBack: () => void;
  label: string;
  state: ReturnType<typeof useSanitizer>["state"];
  updateOptions: ReturnType<typeof useSanitizer>["updateOptions"];
  updateInput: ReturnType<typeof useSanitizer>["updateInput"];
  updateClassInput: ReturnType<typeof useSanitizer>["updateClassInput"];
  convert: ReturnType<typeof useSanitizer>["convert"];
  handleConvertCopy: () => void;
  handleTrimCopy: () => void;
  handleClassCopy: () => void;
  handleClassConvert: () => void;
  t: (key: string) => string;
}) {
  if (section === null) {
    return (
      <div className="dual-panel">
        <h4 className="dual-panel__label">{label}</h4>
        <div className="doc-cards">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="doc-card"
              onClick={() => onSelect(s.id)}
            >
              <span className="doc-card__icon" aria-hidden="true">{s.icon}</span>
              <span className="doc-card__title">{t(s.labelKey)}</span>
              <span className="doc-card__desc">{t(s.descKey)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dual-panel">
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onBack}
        style={{ marginBottom: 8, fontSize: "0.8rem" }}
      >
        ← {t("sanitizer.back")}
      </button>

      {section === "classes" && (
        <ClassConverter
          classInput={state.classInput}
          classOutput={state.classOutput}
          onInputChange={updateClassInput}
          onConvert={handleClassConvert}
          onCopy={handleClassCopy}
        />
      )}

      {(section === "format" || section === "replace") && (
        <div className="card" style={{ padding: 14 }}>
          <SanitizerForm options={state.options} onChange={updateOptions} mode={section} />
          <div className="field">
            <label htmlFor={`input-${section}`}>{t("sanitizer.input")}</label>
            <textarea
              id={`input-${section}`}
              value={state.input}
              onChange={(e) => updateInput(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("sanitizer.output")}</label>
            <div className={`output-area${state.output ? "" : " output-placeholder"}`}>
              {state.output || t("sanitizer.outputPlaceholder")}
            </div>
          </div>
          <div className="sanitizer-actions">
            <button type="button" className="btn btn-primary" onClick={convert}>
              {t("sanitizer.convert")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleConvertCopy}>
              {t("sanitizer.convertCopy")}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleTrimCopy}>
              {t("sanitizer.trimCopy")}
            </button>
          </div>
        </div>
      )}

      {(section === "translate" || section === "summarize") && (
        <PlaceholderSection
          titleKey={`sanitizer.section${section === "translate" ? "Translate" : "Summarize"}`}
          descKey={`sanitizer.${section}Desc`}
          icon={section === "translate" ? "🌐" : "📝"}
        />
      )}
    </div>
  );
}

export function TextPage() {
  const { t } = useTranslation();
  const [dualMode, setDualMode] = useState(false);
  const [singleSection, setSingleSection] = useState<TextSection | null>(null);

  // Independent state for left & right panels in dual mode
  const [leftSection, setLeftSection] = useState<TextSection | null>(null);
  const [rightSection, setRightSection] = useState<TextSection | null>(null);

  const {
    state,
    updateOptions,
    updateInput,
    updateClassInput,
    convert,
    getConvertResult,
    getTrimResult,
    getClassResult,
  } = useSanitizer();

  const [snippetKey, setSnippetKey] = useState(0);

  const handleConvertCopy = useCallback(async () => {
    const result = getConvertResult();
    convert();
    if (result && (await copyText(result))) {
      await addTextSnippet(state.input, result);
      setSnippetKey((k) => k + 1);
      showToast("toast.copied");
    }
  }, [getConvertResult, convert, state.input]);

  const handleTrimCopy = useCallback(async () => {
    const result = getTrimResult();
    if (await copyText(result)) {
      await addTextSnippet(state.input, result);
      setSnippetKey((k) => k + 1);
      showToast("toast.copied");
    }
  }, [getTrimResult, state.input]);

  const handleClassCopy = useCallback(async () => {
    const result = getClassResult();
    if (result && (await copyText(result))) {
      showToast("toast.copied");
    }
  }, [getClassResult]);

  const handleClassConvert = useCallback(() => {
    convert();
  }, [convert]);

  const isSingleOpen = singleSection !== null;

  return (
    <>
      <h2>{t("sanitizer.title")}</h2>

      {/* Dual mode toggle */}
      <label className="toggle-row" style={{ marginBottom: 12 }}>
        <span>{t("sanitizer.dualMode")}</span>
        <input
          type="checkbox"
          checked={dualMode}
          onChange={(e) => {
            setDualMode(e.target.checked);
            if (!e.target.checked) {
              setLeftSection(null);
              setRightSection(null);
            }
          }}
        />
      </label>

      {!dualMode && !isSingleOpen && (
        /* ── Single mode: card grid ── */
        <div className="doc-cards">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="doc-card"
              onClick={() => setSingleSection(s.id)}
            >
              <span className="doc-card__icon" aria-hidden="true">{s.icon}</span>
              <span className="doc-card__title">{t(s.labelKey)}</span>
              <span className="doc-card__desc">{t(s.descKey)}</span>
            </button>
          ))}
        </div>
      )}

      {!dualMode && isSingleOpen && (
        /* ── Single mode: section view ── */
        <>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSingleSection(null)}
            style={{ marginBottom: 12 }}
          >
            ← {t("sanitizer.back")}
          </button>

          {singleSection === "classes" && (
            <ClassConverter
              classInput={state.classInput}
              classOutput={state.classOutput}
              onInputChange={updateClassInput}
              onConvert={handleClassConvert}
              onCopy={handleClassCopy}
            />
          )}

          {(singleSection === "format" || singleSection === "replace") && (
            <div className="card">
              <SanitizerForm options={state.options} onChange={updateOptions} mode={singleSection} />
              <div className="field">
                <label htmlFor="input">{t("sanitizer.input")}</label>
                <textarea
                  id="input"
                  value={state.input}
                  onChange={(e) => updateInput(e.target.value)}
                />
              </div>
              <div className="field">
                <label>{t("sanitizer.output")}</label>
                <div className={`output-area${state.output ? "" : " output-placeholder"}`}>
                  {state.output || t("sanitizer.outputPlaceholder")}
                </div>
              </div>
              <div className="sanitizer-actions">
                <button type="button" className="btn btn-primary" onClick={convert}>
                  {t("sanitizer.convert")}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleConvertCopy}>
                  {t("sanitizer.convertCopy")}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleTrimCopy}>
                  {t("sanitizer.trimCopy")}
                </button>
              </div>
            </div>
          )}

          {(singleSection === "translate" || singleSection === "summarize") && (
            <div className="card">
              <PlaceholderSection
                titleKey={`sanitizer.section${singleSection === "translate" ? "Translate" : "Summarize"}`}
                descKey={`sanitizer.${singleSection}Desc`}
                icon={singleSection === "translate" ? "🌐" : "📝"}
              />
            </div>
          )}

          <SnippetsList refreshKey={snippetKey} />
        </>
      )}

      {dualMode && (
        /* ── Dual mode: two independent columns ── */
        <div className="dual-panels">
          <TextPanel
            section={leftSection}
            onSelect={setLeftSection}
            onBack={() => setLeftSection(null)}
            label={t("sanitizer.panelLeft")}
            state={state}
            updateOptions={updateOptions}
            updateInput={updateInput}
            updateClassInput={updateClassInput}
            convert={convert}
            handleConvertCopy={handleConvertCopy}
            handleTrimCopy={handleTrimCopy}
            handleClassCopy={handleClassCopy}
            handleClassConvert={handleClassConvert}
            t={t}
          />
          <TextPanel
            section={rightSection}
            onSelect={setRightSection}
            onBack={() => setRightSection(null)}
            label={t("sanitizer.panelRight")}
            state={state}
            updateOptions={updateOptions}
            updateInput={updateInput}
            updateClassInput={updateClassInput}
            convert={convert}
            handleConvertCopy={handleConvertCopy}
            handleTrimCopy={handleTrimCopy}
            handleClassCopy={handleClassCopy}
            handleClassConvert={handleClassConvert}
            t={t}
          />
        </div>
      )}
    </>
  );
}
