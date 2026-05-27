import { useTranslation } from "react-i18next";
import type { DocumentQueueItem } from "../types";

interface Props {
  queue: DocumentQueueItem[];
  onConvertAll: () => void;
  onConvertSelected: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onClear: () => void;
  disabled?: boolean;
}

export function DocumentToolbar({
  queue,
  onConvertAll,
  onConvertSelected,
  onSelectAll,
  onSelectNone,
  onClear,
  disabled,
}: Props) {
  const { t } = useTranslation();
  if (!queue.length) return null;

  return (
    <div className="images-toolbar">
      <button type="button" className="btn btn-primary" onClick={onConvertAll} disabled={disabled}>
        {t("images.convertAll")}
      </button>
      <button type="button" className="btn btn-primary" onClick={onConvertSelected} disabled={disabled}>
        {t("images.convertSel")}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onSelectAll}>
        {t("images.selAll")}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onSelectNone}>
        {t("images.selNone")}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onClear}>
        {t("images.clear")}
      </button>
    </div>
  );
}
