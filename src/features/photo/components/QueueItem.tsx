import { useTranslation } from "react-i18next";
import type { QueueItem } from "../../images/types";
import rawViewIcon from "/assets/icons/lsicon_view-filled.svg?raw";import { closeIcon } from "../../../app/icons";
import { pinIcon } from "../../clipboard/pinIcon";
import { pinWithCheck } from "../../clipboard/pinWithCheck";
/** Prepare SVG icon: use brand accent color, remove fixed size so it fills the container. */
const themedViewIcon = rawViewIcon
  .replace(/fill="#6366F1"/gi, 'fill="var(--brand-accent)"')
  .replace(/stroke="#6366F1"/gi, 'stroke="var(--brand-accent)"')
  .replace(/\s(width|height)="\d+"/g, " ");

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
}

export function QueueItemRow({
  item,
  onConvert,
  onDownload,
  onPreview,
  onRemove,
  onToggleSelect,
}: Props) {
  const { t } = useTranslation();

  const detectedFormat = item.file.type.includes("heic") ? "heic" : item.file.name.split(".").pop() || "?";
  const outputBlob = item.blobs?.[0];
  const outFormat = outputBlob ? (MIME_TO_EXT[outputBlob.type] || outputBlob.type.split("/").pop() || "?") : null;

  return (
    <div className="images-item">
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
      <div>
        <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }} title={item.file.name}>
          {shortName(item.file.name)}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <span>{detectedFormat.toUpperCase()} ({formatSize(item.file.size)})</span>
          {outFormat && (
            <>
              <span style={{ color: "var(--brand-accent)" }}>→</span>
              <span>{outFormat}</span>
              <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>({formatSize(outputBlob!.size)})</span>
            </>
          )}
        </div>
      </div>
      <div
        className={
          item.status === "ready"
            ? "status-ready"
            : item.status === "error"
              ? "status-err"
              : item.status === "converting"
                ? ""
                : "status-wait"
        }
      >
        {item.status === "ready"
          ? t("images.statusReady")
          : item.status === "error"
            ? item.error || t("images.statusError")
            : item.status === "converting"
              ? t("images.statusConverting")
              : t("images.statusPending")}
      </div>
      <div className="images-item__actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={item.status === "converting"}
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
                  type: "image",
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
        {item.status === "ready" && item.blobs?.[0] && (
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon"
            title={t("images.preview")}
            onClick={() => onPreview(item)}
          >
            <span dangerouslySetInnerHTML={{ __html: themedViewIcon }} style={{ display: "flex", width: 20, height: 20 }} />
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
}
