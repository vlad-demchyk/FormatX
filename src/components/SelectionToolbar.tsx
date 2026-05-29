import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { copyText } from "../lib/clipboard";
import { addClipboardEntry } from "../features/clipboard/storage";
import { pinWithCheck } from "../features/clipboard/pinWithCheck";
import { showToast } from "../app/toast";

interface Position {
  top: number;
  left: number;
}

/**
 * A floating toolbar that appears when the user selects text on the page.
 * Provides quick actions: Copy and Pin.
 * Handles mobile where native selection toolbar is unreliable.
 */
export function SelectionToolbar() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSelectionRect = (): DOMRect | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    return range.getBoundingClientRect();
  };

  const getSelectedText = (): string => {
    let text = window.getSelection()?.toString().trim() ?? "";
    if (!text) {
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        const input = el as HTMLInputElement | HTMLTextAreaElement;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;
        text = input.value.substring(start, end).trim();
      }
    }
    return text;
  };

  const updateToolbar = useCallback(() => {
    const text = getSelectedText();
    if (!text) {
      setVisible(false);
      return;
    }

    const rect = getSelectionRect();
    if (!rect) {
      setVisible(false);
      return;
    }

    setSelectedText(text);

    // Position above the selection, centered horizontally
    const toolbarWidth = 160;
    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    const top = rect.top - 8; // 8px above

    // Keep within viewport bounds
    if (left < 8) left = 8;
    const maxLeft = window.innerWidth - toolbarWidth - 8;
    if (left > maxLeft) left = maxLeft;

    setPosition({ top, left });
    setVisible(true);

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onSelectionChange = () => {
      // Debounce: wait a short moment for selection to settle
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(updateToolbar, 200);
    };

    const onScroll = () => {
      if (visible) {
        // Recalculate position on scroll if visible
        updateToolbar();
      }
    };

    const onResize = () => {
      if (visible) {
        updateToolbar();
      }
    };

    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [updateToolbar, visible]);

  // Hide when toolbar loses focus (click outside)
  useEffect(() => {
    if (!visible) return;

    const onClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        // Don't hide immediately — let the click event finish processing
        // so that buttons inside the toolbar can still fire
        setTimeout(() => {
          setVisible(false);
        }, 100);
      }
    };

    // Delay adding the listener to avoid catching the same click that triggered selection
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", onClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [visible]);

  const handleCopy = useCallback(async () => {
    if (!selectedText) return;
    if (await copyText(selectedText)) {
      addClipboardEntry(selectedText);
      showToast("toast.copied");
    }
    setVisible(false);
  }, [selectedText]);

  const handlePin = useCallback(async () => {
    if (!selectedText) return;
    await pinWithCheck({
      type: "text",
      label: selectedText.slice(0, 60),
      content: selectedText,
    });
    // Also add to clipboard history
    addClipboardEntry(selectedText);
    setVisible(false);
  }, [selectedText]);

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className="selection-toolbar"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 9999,
      }}
      // Prevent text selection on the toolbar itself
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="selection-toolbar__btn"
        onClick={handleCopy}
        title={t("clipboard.copyBtn")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>{t("clipboard.copyBtn")}</span>
      </button>
      <button
        type="button"
        className="selection-toolbar__btn"
        onClick={handlePin}
        title={t("clipboard.pinBtn")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
        </svg>
        <span>{t("clipboard.pinBtn")}</span>
      </button>
    </div>
  );
}
