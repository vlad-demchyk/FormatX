import { useTranslation } from "react-i18next";
import { downloadBlob } from "../../../lib/download";
import { type HistoryItem } from "../../../lib/db";
import { closeIcon } from "../../../app/icons";
import { themedIcon } from "../../../lib/iconTheme";
import { useHistory, useHistoryOnActive } from "../../../lib/hooks/useHistory";

interface Props {
  active: boolean;
  onPreview: (item: HistoryItem) => void;
}

export function HistorySection({ active, onPreview }: Props) {
  const { t } = useTranslation();

  const { items, refresh, handleClear, handleDelete } = useHistory("image");
  useHistoryOnActive(active, refresh);

  const handlePreview = (item: HistoryItem) => {
    if (item.blob) onPreview(item);
  };

  if (!active) return null;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{t("account.history")}</h3>
        <button type="button" className="btn btn-secondary" onClick={handleClear}>
          {t("account.clearHistory")}
        </button>
      </div>
      <div className="account-list">
        {items.map((item) => (
          <div key={item.id} className="account-item">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>🖼️</span>
              <div>
                <strong>{item.filename}</strong>
                <br />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {new Date(item.createdAt).toLocaleString()} · {(item.size / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {item.blob && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => handlePreview(item)}
                    title={t("account.preview")}
                    aria-label={t("account.preview")}
                  >
                    <span
                      dangerouslySetInnerHTML={{
                        __html: themedIcon(`
                          <svg width="20" height="20" viewBox="0 0 51 51" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M31.875 17H31.8963M6.375 12.75C6.375 11.0592 7.04665 9.43774 8.24219 8.24219C9.43774 7.04665 11.0592 6.375 12.75 6.375H38.25C39.9408 6.375 41.5623 7.04665 42.7578 8.24219C43.9534 9.43774 44.625 11.0592 44.625 12.75V38.25C44.625 39.9408 43.9534 41.5623 42.7578 42.7578C41.5623 43.9534 39.9408 44.625 38.25 44.625H12.75C11.0592 44.625 9.43774 43.9534 8.24219 42.7578C7.04665 41.5623 6.375 39.9408 6.375 38.25V12.75Z" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M6.375 34L17 23.375C18.972 21.4774 21.403 21.4774 23.375 23.375L34 34" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M29.75 29.75L31.875 27.625C33.847 25.7274 36.278 25.7274 38.25 27.625L44.625 34" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        `),
                      }}
                      style={{ display: "flex", width: 20, height: 20 }}
                    />
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => downloadBlob(item.blob!, item.filename)}
                  >
                    {t("images.download")}
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => handleDelete(item.id)}
              >
                <span dangerouslySetInnerHTML={{ __html: closeIcon }} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {!items.length && <p className="empty-state">{t("account.noHistory")}</p>}
    </div>
  );
}
