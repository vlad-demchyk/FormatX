import { useTranslation } from "react-i18next";
import { formatLabel, outputFormatsFor } from "../formatRegistry";
import type { DocumentQueueItem, DocumentFormatId } from "../types";

interface Props {
  items: DocumentQueueItem[];
  onConvert: (item: DocumentQueueItem) => void;
  onDownload: (item: DocumentQueueItem) => void;
  onPreview?: (item: DocumentQueueItem) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onOutputFormatChange: (id: string, fmt: DocumentFormatId) => void;
  disabled?: boolean;
}

export function DocumentQueue({
  items,
  onConvert,
  onDownload,
  onPreview,
  onRemove,
  onToggleSelect,
  onOutputFormatChange,
  disabled,
}: Props) {
  const { t } = useTranslation();

  if (!items.length) return null;

  return (
    <div className="images-items">
      {items.map((item) => {
        const outFormats = outputFormatsFor(item.inputFormat);
        return (
          <div key={item.id} className="images-item">
            <input
              type="checkbox"
              checked={item.selected}
              onChange={() => onToggleSelect(item.id)}
            />
            <div style={{ flex: 1, minWidth: 0, gridColumn: "2 / 4" }}>
              <div style={{ fontWeight: 600, wordBreak: "break-all", fontSize: "0.9rem" }}>
                {item.file.name}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                {formatLabel(item.inputFormat)} · {(item.file.size / 1024).toFixed(0)} KB
              </div>
              <div className="format-per-file">
                <span className="format-per-file__label">{t("documents.to")}</span>
                <select
                  value={item.outputFormat}
                  onChange={(e) => onOutputFormatChange(item.id, e.target.value as DocumentFormatId)}
                >
                  {outFormats.map((fmt: DocumentFormatId) => (
                    <option key={fmt} value={fmt}>{formatLabel(fmt)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              {item.status === "ready" && (
                <span style={{ color: "var(--success)", fontSize: "0.8rem", fontWeight: 600 }}>
                  {t("images.statusReady")}
                </span>
              )}
              {item.status === "error" && (
                <span style={{ color: "var(--error)", fontSize: "0.8rem" }} title={item.error || ""}>
                  {t("images.statusError")}
                </span>
              )}
              {item.status === "converting" && (
                <span style={{ fontSize: "0.8rem" }}>{t("images.statusConverting")}</span>
              )}
              {item.status === "pending" && (
                <span className="status-wait" style={{ fontSize: "0.8rem" }}>
                  {t("images.statusPending")}
                </span>
              )}
            </div>
            <div className="images-item__actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={disabled || item.status === "converting" || item.status === "error"}
                onClick={() => onConvert(item)}
              >
                {t("images.convert")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!item.blobs || item.status !== "ready"}
                onClick={() => onDownload(item)}
              >
                {t("images.download")}
              </button>
              {onPreview && (item.outputFormat === "html" || item.outputFormat === "md") && item.status === "ready" && item.blobs?.[0] && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onPreview(item)}
                >
                  {t("documents.preview")}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost"
                title={t("images.remove")}
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
