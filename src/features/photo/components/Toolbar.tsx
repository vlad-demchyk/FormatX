import { useTranslation } from "react-i18next";
import type { QueueItem } from "../../images/types";

interface Props {
  queue: QueueItem[];
  onConvertAll: () => void;
  onConvertSelected: () => void;
  onZipSelected: () => void;
  onZipAll: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onClear: () => void;
}

export function Toolbar({
  queue,
  onConvertAll,
  onConvertSelected,
  onZipSelected,
  onZipAll,
  onSelectAll,
  onSelectNone,
  onClear,
}: Props) {
  const { t } = useTranslation();
  if (!queue.length) return null;

  return (
    <div className="images-toolbar">
      <button type="button" className="btn btn-primary" onClick={onConvertAll}>
        {t("images.convertAll")}
      </button>
      <button type="button" className="btn btn-primary" onClick={onConvertSelected}>
        {t("images.convertSel")}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onZipSelected}>
        {t("images.zipSel")}
      </button>
      <button type="button" className="btn btn-secondary" onClick={onZipAll}>
        {t("images.zipAll")}
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
