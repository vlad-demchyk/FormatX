import { useTranslation } from "react-i18next";
import { useTheme } from "../app/providers/ThemeProvider";
import { logoSvg } from "../app/logo";
import { TabBar } from "./TabBar";
import { TextPage } from "../features/text/TextPage";
import { AccountPage } from "../features/account/AccountPage";
import { DocumentsPage } from "../features/documents/DocumentsPage";
import { PhotoPage } from "../features/photo/PhotoPage";
import { ClipboardPage } from "../features/clipboard/ClipboardPage";
import { SupportPage } from "../features/support/SupportPage";
import { useAppRoute, type Page } from "../app/hooks/useAppRoute";
import { useEffect, useRef } from "react";
import { addClipboardEntry } from "../features/clipboard/storage";
import { showToast } from "../app/toast";

export function ShellLayout() {
  const { t } = useTranslation();
  const { toggle } = useTheme();

  // Keep track of last captured text to avoid duplicates
  const lastCapturedRef = useRef("");

  // Try to read from the system clipboard (works on mobile when native copy is used)
  async function tryReadSystemClipboard() {
    try {
      // Check for clipboard-read permission first (optional, some browsers may reject)
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

  // Global copy/paste capture — works on every tab
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
  const { page, setPage, ready } = useAppRoute();

  if (!ready) return null;

  const titles: Record<Page, string> = {
    photo: t("images.title"),
    documents: t("documents.title"),
    text: t("sanitizer.title"),
    clipboard: t("clipboard.title"),
    account: t("account.title"),
    support: t("support.title"),
  };

  const isTool = page !== "account" && page !== "support";

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-header__brand">
          <span className="shell-header__logo" aria-hidden="true">
            <span dangerouslySetInnerHTML={{ __html: logoSvg("shell-header__logo-svg") }} />
          </span>
          <span className="shell-header__title">
            {isTool ? titles[page] : t("appName")}
          </span>
        </div>
        <div className="shell-header__branding">
          <span className="shell-header__credit">{t("footer.credit", { author: "vl.demchyk" })}</span>
        </div>
        <div className="shell-header__actions">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={toggle}
            title={t("theme.toggle")}
            aria-label={t("theme.toggle")}
          >
            ◐
          </button>
          <button
            type="button"
            className={`btn btn-secondary${page === "account" ? " is-active" : ""}`}
            onClick={() => setPage(page === "account" ? "photo" : "account")}
          >
            {t("nav.account")}
          </button>
        </div>
      </header>
      <div className="shell-body">
        <div className="shell-tabs-wrap">
          <TabBar active={page} onSelect={(p) => setPage(p)} />
        </div>
        <main className="shell-main">
          {page === "text" && <TextPage />}
          {page === "photo" && <PhotoPage />}
          {page === "documents" && <DocumentsPage />}
          {page === "clipboard" && <ClipboardPage />}
          {page === "support" && <SupportPage />}
          {page === "account" && <AccountPage />}
        </main>
      </div>
    </div>
  );
}

