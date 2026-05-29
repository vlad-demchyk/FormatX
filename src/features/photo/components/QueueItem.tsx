import { useTranslation } from "react-i18next";
import type { QueueItem } from "../../images/types";
import { pinIcon } from "../../clipboard/pinIcon";
import { pinWithCheck } from "../../clipboard/pinWithCheck";
import { baseName, extFromMime } from "../../images/logic";

/** Shorten filename: show start + "…" + extension. */
function shortName(name: string, maxLen = 28): string {
  if (name.length <= maxLen) return name;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const baseMax = maxLen - ext.length - 1;
  if (baseMax < 6) return name.slice(0, maxLen - 3) + "…";
  return name.slice(0, baseMax) + "…" + ext;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/tiff": "tiff",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

interface Props {
  item: QueueItem;
  onConvert: (item: QueueItem) => void;
  onDownload: (item: QueueItem) => void;
  onPreview: (item: QueueItem) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  isRemoving?: boolean;
  onAnimationEnd?: () => void;
}

export function QueueItemRow({
  item,
  onConvert,
  onDownload,
  onPreview,
  onRemove,
  onToggleSelect,
  isRemoving,
  onAnimationEnd,
}: Props) {
  const { t } = useTranslation();

  const detectedFormat = item.file.type.includes("heic") ? "heic" : item.file.name.split(".").pop() || "?";
  const outputBlob = item.blobs?.[0];
  const outFormat = outputBlob ? (MIME_TO_EXT[outputBlob.type] || outputBlob.type.split("/").pop() || "?") : null;

  return (
    <div
      className={`images-item${isRemoving ? ' is-removing' : ''}`}
      onAnimationEnd={onAnimationEnd}
    >
      <input
        type="checkbox"
        checked={item.selected}
        onChange={() => onToggleSelect(item.id)}
      />
      <div>
        {item.heicPreview && !item.thumbUrl ? (
          <div className="images-thumb-ph">HEIC</div>
        ) : (
          <img className="images-thumb" src={item.thumbUrl || ""} alt="" />
        )}
      </div>
      <div className="images-item__info">
        <div className="images-item__name" title={item.file.name}>
          {shortName(item.file.name)}
        </div>
        <div className="images-item__meta">
          {detectedFormat.toUpperCase()} ({formatSize(item.file.size)})
          {outFormat && (
            <> → {outFormat} ({formatSize(outputBlob!.size)})</>
          )}
          {item.status === "converting" && <> · {t("images.statusConverting")}</>}
          {item.status === "error" && <> · <span style={{ color: "var(--error)" }}>{item.error || t("images.statusError")}</span></>}
          {item.status === "ready" && <> · <span style={{ color: "var(--success)" }}>{t("images.statusReady")}</span></>}
          {item.status === "pending" && <> · <span className="status-wait">{t("images.statusPending")}</span></>}
        </div>
      </div>
      <div className="images-item__actions">
        <button
          type="button"
          className="btn btn-secondary btn--icon-label"
          disabled={item.status === "converting"}
          onClick={() => onConvert(item)}
        >
          <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="btn-label">{t("images.convert")}</span>
        </button>
        <button
          type="button"
          className="btn btn-primary btn--icon-label"
          disabled={!item.blobs || item.status !== "ready"}
          onClick={() => onDownload(item)}
        >
          <svg className="btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="btn-label">{t("images.download")}</span>
        </button>
        {item.status === "ready" && item.blobs?.[0] && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title="Pin"
            onClick={() => {
              const blob = item.blobs![0]!;
              const reader = new FileReader();
              reader.onload = () => {
                const pinName = `${baseName(item.file.name)}.${extFromMime(blob.type)}`;
                pinWithCheck({ type: "image", label: pinName, content: reader.result as string, mime: blob.type, size: blob.size });
              };
              reader.readAsDataURL(blob);
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: pinIcon }} style={{ display: "flex", width: 16, height: 16 }} />
          </button>
        )}
        {item.status === "ready" && item.blobs?.[0] && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title={t("images.preview")}
            onClick={() => onPreview(item)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          title={t("images.remove")}
          onClick={() => onRemove(item.id)}
        >
          <span style={{ fontSize: "1.2rem", lineHeight: 1 }}>×</span>
        </button>
      </div>
    </div>
  );
}
