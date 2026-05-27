import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  onFiles: (files: FileList) => void;
}

export function DocumentDropZone({ onFiles }: Props) {
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
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragover(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragover(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragover(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragover(false);
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
      >
        <p><strong>{t("documents.drop")}</strong></p>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          PDF, DOCX, ODT, RTF, TXT, HTML
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.odt,.rtf,.txt,.html,.htm,.md,.markdown,.xlsx,.xls,.csv"
        multiple
        hidden
        onChange={handleChange}
      />
    </>
  );
}
