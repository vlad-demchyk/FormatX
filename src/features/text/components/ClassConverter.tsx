import { useTranslation } from "react-i18next";

interface Props {
  classInput: string;
  classOutput: string;
  onInputChange: (value: string) => void;
  onConvert: () => void;
  onCopy: () => void;
}

export function ClassConverter({ classInput, classOutput, onInputChange, onConvert, onCopy }: Props) {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h3>{t("sanitizer.classesTitle")}</h3>
      <div className="field">
        <label htmlFor="classInput">{t("sanitizer.classesInput")}</label>
        <textarea
          id="classInput"
          placeholder={t("sanitizer.classesPlaceholder")}
          value={classInput}
          onChange={(e) => onInputChange(e.target.value)}
        />
      </div>
      <div className="field">
        <label>{t("sanitizer.output")}</label>
        <div
          className={`output-area${classOutput ? "" : " output-placeholder"}`}
        >
          {classOutput || t("sanitizer.selectorPlaceholder")}
        </div>
      </div>
      <div className="sanitizer-actions">
        <button type="button" className="btn btn-primary" onClick={onConvert}>
          {t("sanitizer.classConvert")}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCopy}>
          {t("sanitizer.classCopy")}
        </button>
      </div>
    </div>
  );
}
