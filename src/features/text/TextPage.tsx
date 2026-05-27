import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../../lib/clipboard";
import { addTextSnippet } from "../../lib/storage";
import { showToast } from "../../app/toast";
import { SanitizerForm } from "./components/SanitizerForm";
import { ClassConverter } from "./components/ClassConverter";
import { SnippetsList } from "./components/SnippetsList";
import { useSanitizer } from "./hooks/useSanitizer";

export function TextPage() {
  const { t } = useTranslation();
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

  return (
    <>
      <h2>{t("sanitizer.title")}</h2>
      <div className="sanitizer-grid">
        <div className="card">
          <SanitizerForm options={state.options} onChange={updateOptions} />
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
            <div
              className={`output-area${state.output ? "" : " output-placeholder"}`}
            >
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
        <ClassConverter
          classInput={state.classInput}
          classOutput={state.classOutput}
          onInputChange={updateClassInput}
          onConvert={handleClassConvert}
          onCopy={handleClassCopy}
        />
      </div>
      <SnippetsList refreshKey={snippetKey} />
    </>
  );
}
