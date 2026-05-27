import { useTranslation } from "react-i18next";
import type { SanitizeOptions } from "../../sanitizer/logic";

interface Props {
  options: SanitizeOptions;
  onChange: (patch: Partial<SanitizeOptions>) => void;
}

export function SanitizerForm({ options, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <div className="field">
        <label htmlFor="replaceChar">{t("sanitizer.replaceChar")}</label>
        <input
          id="replaceChar"
          type="text"
          maxLength={5}
          value={options.charToReplace}
          onChange={(e) => onChange({ charToReplace: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="replaceWith">{t("sanitizer.replaceWith")}</label>
        <select
          id="replaceWith"
          value={options.replaceWith}
          onChange={(e) => onChange({ replaceWith: e.target.value as SanitizeOptions["replaceWith"] })}
        >
          <option value="space">{t("sanitizer.replaceSpace")}</option>
          <option value="dash">{t("sanitizer.replaceDash")}</option>
          <option value="comma">{t("sanitizer.replaceComma")}</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="spacing">{t("sanitizer.spacing")}</label>
        <select
          id="spacing"
          value={options.spacing}
          onChange={(e) => onChange({ spacing: e.target.value as SanitizeOptions["spacing"] })}
        >
          <option value="none">{t("sanitizer.spacingNone")}</option>
          <option value="around">{t("sanitizer.spacingAround")}</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="removeArgs">{t("sanitizer.removeArgs")}</label>
        <input
          id="removeArgs"
          type="number"
          min={0}
          value={options.removeArgs}
          onChange={(e) => onChange({ removeArgs: parseInt(e.target.value, 10) || 0 })}
        />
      </div>
    </>
  );
}
