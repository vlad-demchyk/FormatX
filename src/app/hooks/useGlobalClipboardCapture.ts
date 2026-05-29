import { useEffect, useRef } from "react";
import { addClipboardEntry } from "../../features/clipboard/storage";
import { showToast } from "../toast";

/**
 * Global clipboard capture hook.
 *
 * Listens for copy/paste events and visibility changes to capture
 * text into the clipboard history. Works across all pages.
 *
 * Moved from ShellLayout to keep layout component focused on layout.
 */
export function useGlobalClipboardCapture() {
  const lastCapturedRef = useRef("");

  // Try to read from the system clipboard (works on mobile when native copy is used)
  async function tryReadSystemClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed && trimmed !== lastCapturedRef.current) {
        lastCapturedRef.current = trimmed;
        addClipboardEntry(trimmed);
        showToast("toast.copied");
      }
    } catch {
      // Silently fail — clipboard read may require user gesture or permission
    }
  }

  useEffect(() => {
    const capture = () => {
      setTimeout(() => {
        // Try document selection first
        let text = document.getSelection()?.toString().trim() ?? "";
        // Fallback: if focus is on input/textarea, read selected range
        if (!text) {
          const el = document.activeElement;
          if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
            const input = el as HTMLInputElement | HTMLTextAreaElement;
            const start = input.selectionStart ?? 0;
            const end = input.selectionEnd ?? 0;
            text = input.value.substring(start, end).trim();
          }
        }
        if (text) {
          lastCapturedRef.current = text;
          addClipboardEntry(text);
          showToast("toast.copied");
        }
      }, 0);
    };
    const onCopy = () => capture();
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (text) {
        setTimeout(() => {
          lastCapturedRef.current = text;
          addClipboardEntry(text);
          showToast("toast.copied");
        }, 0);
      }
    };

    // On mobile, when user copies via native dialog (long-press → Copy)
    // the `copy` event may not fire or document.getSelection() may be empty.
    // Try reading from the system clipboard when the page becomes visible again.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tryReadSystemClipboard();
      }
    };

    window.addEventListener("copy", onCopy, true);
    window.addEventListener("paste", onPaste, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("copy", onCopy, true);
      window.removeEventListener("paste", onPaste, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
