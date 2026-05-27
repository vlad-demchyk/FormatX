import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../../lib/clipboard";
import type { ClipboardEntry } from "./storage";

interface Props {
  entry: ClipboardEntry | null;
  allEntries: ClipboardEntry[];
  onClose: () => void;
}

export function ClipboardToast({ entry, allEntries, onClose }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<number>(0);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entry) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setExpanded(false);

    clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      onClose();
    }, 4000);

    return () => clearTimeout(timerRef.current);
  }, [entry, onClose]);

  const handleCopy = async (text: string) => {
    await copyText(text);
    showCopyFeedback(toastRef.current!);
  };

  if (!visible || !entry) return null;

  return (
    <div
      ref={toastRef}
      className={`clipboard-toast${expanded ? " clipboard-toast--expanded" : ""}`}
      onMouseEnter={() => clearTimeout(timerRef.current)}
      onMouseLeave={() => {
        timerRef.current = window.setTimeout(() => {
          setVisible(false);
          onClose();
        }, 2000);
      }}
    >
      <div className="clipboard-toast__header" onClick={() => setExpanded(!expanded)}>
        <span className="clipboard-toast__icon">📋</span>
        <span className="clipboard-toast__label">{t("clipboard.copied")}</span>
        <button
          className="clipboard-toast__close"
          onClick={(e) => { e.stopPropagation(); setVisible(false); onClose(); }}
        >
          ×
        </button>
      </div>
      <div className="clipboard-toast__preview">{entry.preview}</div>
      {expanded && (
        <div className="clipboard-toast__list">
          {allEntries.slice(0, 10).map((e) => (
            <div key={e.id} className="clipboard-toast__item">
              <span className="clipboard-toast__item-text">{e.preview}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(e.text)}>
                {t("clipboard.copyBtn")}
              </button>
            </div>
          ))}
        </div>
      )}
      {allEntries.length > 1 && (
        <button
          className="clipboard-toast__toggle"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t("clipboard.showLess") : t("clipboard.showMore", { count: allEntries.length - 1 })}
        </button>
      )}
    </div>
  );
}

function showCopyFeedback(el: HTMLElement) {
  const feedback = document.createElement("span");
  feedback.className = "clipboard-toast__feedback";
  feedback.textContent = "✓";
  feedback.style.cssText = "position:absolute;top:-4px;right:-4px;background:var(--success);color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;display:flex;align-items:center;justify-content:center;";
  el.appendChild(feedback);
  setTimeout(() => feedback.remove(), 800);
}
