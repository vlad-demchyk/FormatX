import { useTranslation } from "react-i18next";
import { formatLabel, outputFormatsFor } from "../formatRegistry";
import type { DocumentQueueItem, DocumentFormatId } from "../types";
import { closeIcon } from "../../../app/icons";
import rawViewIcon from "/assets/icons/lsicon_view-filled.svg?raw";
import { pinIcon } from "../../clipboard/pinIcon";
import { pinWithCheck } from "../../clipboard/pinWithCheck";

const viewIcon = rawViewIcon
  .replace(/fill="#6366F1"/gi, 'fill="var(--brand-accent)"')
  .replace(/stroke="#6366F1"/gi, 'stroke="var(--brand-accent)"')
  .replace(/\s(width|height)="\d+"/g, " ");

function shortName(name: string, maxLen = 28): string {
  if (name.length <= maxLen) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const baseMax = maxLen - ext.length - 1;
  if (baseMax < 6) return name.slice(0, maxLen - 3) + "…";
  return name.slice(0, baseMax) + "…" + ext;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

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
              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300, fontSize: "0.9rem" }} title={item.file.name}>
                {shortName(item.file.name)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <span>{formatLabel(item.inputFormat)} ({formatSize(item.file.size)})</span>
                {item.status === "ready" && item.blobs?.[0] && (
                  <>
                    <span style={{ color: "var(--brand-accent)" }}>→</span>
                    <span>{formatLabel(item.outputFormat)}</span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>({formatSize(item.blobs[0].size)})</span>
                  </>
                )}
              </div>
              <div className="format-per-file">
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
                  className="btn btn-ghost btn-sm btn-icon"
                  title={t("documents.preview")}
                  onClick={() => onPreview(item)}
                >
                  <span dangerouslySetInnerHTML={{ __html: viewIcon }} />
                </button>
              )}
              {item.status === "ready" && item.blobs?.[0] && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Pin"
                  onClick={() => {
                    const blob = item.blobs![0]!;
                    const reader = new FileReader();
                    reader.onload = () => {
                      pinWithCheck({
                        type: "document",
                        label: item.file.name,
                        content: reader.result as string,
                        mime: blob.type,
                        size: blob.size,
                      });
                    };
                    reader.readAsDataURL(blob);
                  }}
                >
                  <span dangerouslySetInnerHTML={{ __html: pinIcon }} style={{ display: "flex", width: 16, height: 16 }} />
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                title={t("images.remove")}
                onClick={() => onRemove(item.id)}
              >
                <span dangerouslySetInnerHTML={{ __html: closeIcon }} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
