import { useTranslation } from "react-i18next";
import type { QueueItem } from "../../images/types";
import rawViewIcon from "/assets/icons/lsicon_view-filled.svg?raw";import { closeIcon } from "../../../app/icons";
import { pinIcon } from "../../clipboard/pinIcon";
import { addPinnedEntry } from "../../clipboard/pinnedStorage";
import { showToast } from "../../../app/toast";
/** Prepare SVG icon: use brand accent color, remove fixed size so it fills the container. */
const themedViewIcon = rawViewIcon
  .replace(/fill="#6366F1"/gi, 'fill="var(--brand-accent)"')
  .replace(/stroke="#6366F1"/gi, 'stroke="var(--brand-accent)"')
  .replace(/\s(width|height)="\d+"/g, " ");

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
        <div style={{ fontWeight: 600, wordBreak: "break-all", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>{item.file.name}</div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          {(item.file.size / 1024 / 1024).toFixed(2)} MB · {detectedFormat}
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
                addPinnedEntry({
                  type: "image",
                  label: item.file.name,
                  content: reader.result as string,
                  mime: blob.type,
                  size: blob.size,
                });
                showToast("toast.pinned");
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
