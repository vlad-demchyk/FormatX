import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onFiles: (files: FileList) => void;
}

export function DropZone({ onFiles }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        onFiles(e.target.files);
        e.target.value = "";
      }
    },
    [onFiles],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <>
      <div
        className={`images-drop${dragover ? " dragover" : ""}`}
        tabIndex={0}
        role="button"
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          handleDrag(e);
          setDragover(true);
        }}
        onDragOver={(e) => {
          handleDrag(e);
          setDragover(true);
        }}
        onDragLeave={(e) => {
          handleDrag(e);
          setDragover(false);
        }}
        onDrop={(e) => {
          handleDrag(e);
          setDragover(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
      >
        <p><strong>{t("images.drop")}</strong></p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{t("images.heicHint")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={handleChange}
      />
    </>
  );
}
