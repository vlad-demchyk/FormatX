import { QueueItemRow } from "./QueueItem";
import type { QueueItem } from "../../images/types";
import type { AnimationController } from "../../../lib/animation/AnimationController";

interface Props {
  queue: QueueItem[];
  onConvert: (item: QueueItem) => void;
  onDownload: (item: QueueItem) => void;
  onPreview: (item: QueueItem) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
  removingIds: AnimationController;
}

export function QueueList({
  queue,
  onConvert,
  onDownload,
  onPreview,
  onRemove,
  onToggleSelect,
  removingIds,
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
          onPreview={onPreview}
          onRemove={onRemove}
          onToggleSelect={onToggleSelect}
          isRemoving={removingIds.isRemoving(item.id)}
          onAnimationEnd={() => {
            if (removingIds.isRemoving(item.id)) removingIds.endRemove(item.id);
          }}
        />
      ))}
    </div>
  );
}
