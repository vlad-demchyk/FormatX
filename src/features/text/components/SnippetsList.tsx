import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listTextSnippets, type TextSnippet } from "../../../lib/storage";
import { copyText } from "../../../lib/clipboard";
import { pinIcon } from "../../clipboard/pinIcon";
import { addPinnedEntry } from "../../clipboard/pinnedStorage";
import { showToast } from "../../../app/toast";

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
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => copyText(s.outputText)}
              >
                {t("sanitizer.classCopy")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                title="Pin"
                onClick={() => {
                  addPinnedEntry({
                    type: "text",
                    label: s.inputPreview,
                    content: s.outputText,
                  });
                  showToast("toast.pinned");
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: pinIcon }} style={{ display: "flex", width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}
