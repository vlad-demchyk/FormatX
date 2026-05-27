import { QueueItemRow } from "./QueueItem";
import type { QueueItem } from "../../images/types";

interface Props {
  queue: QueueItem[];
  onConvert: (item: QueueItem) => void;
  onDownload: (item: QueueItem) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
}

export function QueueList({
  queue,
  onConvert,
  onDownload,
  onRemove,
  onToggleSelect,
}: Props) {
  if (!queue.length) return null;

  return (
    <div className="images-items">
      {queue.map((item) => (
        <QueueItemRow
          key={item.id}
          item={item}
          onConvert={onConvert}
          onDownload={onDownload}
          onRemove={onRemove}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
