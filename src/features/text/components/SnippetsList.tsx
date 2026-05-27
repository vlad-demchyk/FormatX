import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listTextSnippets, type TextSnippet } from "../../../lib/storage";
import { copyText } from "../../../lib/clipboard";

export function SnippetsList({ refreshKey }: { refreshKey: number }) {
  const { t } = useTranslation();
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);

  useEffect(() => {
    void listTextSnippets().then(setSnippets);
  }, [refreshKey]);

  if (!snippets.length) return null;

  return (
    <details className="snippets card" open>
      <summary>{t("sanitizer.recent")}</summary>
      <div className="snippets-list">
        {snippets.map((s) => (
          <div key={s.id} className="snippet-item">
            <span title={s.outputText}>{s.inputPreview}</span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => copyText(s.outputText)}
            >
              {t("sanitizer.classCopy")}
            </button>
          </div>
        ))}
      </div>
    </details>
  );
}
