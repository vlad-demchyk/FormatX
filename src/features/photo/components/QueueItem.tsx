import { useTranslation } from "react-i18next";
import type { QueueItem } from "../../images/types";

interface Props {
  item: QueueItem;
  onConvert: (item: QueueItem) => void;
  onDownload: (item: QueueItem) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
}

export function QueueItemRow({
  item,
  onConvert,
  onDownload,
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
        <div style={{ fontWeight: 600, wordBreak: "break-all" }}>{item.file.name}</div>
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
}
