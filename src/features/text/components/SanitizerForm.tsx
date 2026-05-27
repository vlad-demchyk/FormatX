import { useTranslation } from "react-i18next";
import type { SanitizeOptions, FormatMode } from "../../sanitizer/logic";

interface Props {
  options: SanitizeOptions;
  onChange: (patch: Partial<SanitizeOptions>) => void;
}

const formatOptions: { value: FormatMode; labelKey: string }[] = [
  { value: "titleCase", labelKey: "sanitizer.formatTitleCase" },
  { value: "uppercase", labelKey: "sanitizer.formatUppercase" },
  { value: "lowercase", labelKey: "sanitizer.formatLowercase" },
  { value: "splitWords", labelKey: "sanitizer.formatSplitWords" },
];

export function SanitizerForm({ options, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <>
      {/* Mode selector */}
      <div className="field">
        <label htmlFor="mode">{t("sanitizer.mode")}</label>
        <select
          id="mode"
          value={options.mode}
          onChange={(e) => onChange({ mode: e.target.value as SanitizeOptions["mode"] })}
        >
          <option value="replace">{t("sanitizer.modeReplace")}</option>
          <option value="format">{t("sanitizer.modeFormat")}</option>
        </select>
      </div>

      {options.mode === "replace" ? (
        /* ── Replace mode ─────────────────────────── */
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
          <div className="field-row">
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
            <div className="field">
              <label htmlFor="removeTrailing">{t("sanitizer.removeTrailing")}</label>
              <input
                id="removeTrailing"
                type="number"
                min={0}
                value={options.removeTrailing}
                onChange={(e) => onChange({ removeTrailing: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          </div>
        </>
      ) : (
        /* ── Format mode ──────────────────────────── */
        <>
          <div className="field">
            <label htmlFor="formatMode">{t("sanitizer.formatMode")}</label>
            <select
              id="formatMode"
              value={options.formatMode}
              onChange={(e) => onChange({ formatMode: e.target.value as FormatMode })}
            >
              {formatOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>

        </>
      )}
    </>
  );
}
