import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../app/providers/ThemeProvider";
import { logoSvg } from "../app/logo";
import { TabBar } from "./TabBar";
import { TextPage } from "../features/text/TextPage";
import { AccountPage } from "../features/account/AccountPage";
import { DocumentsPage } from "../features/documents/DocumentsPage";
import { PhotoPage } from "../features/photo/PhotoPage";
import { ClipboardPage } from "../features/clipboard/ClipboardPage";
import { ClipboardToast } from "../features/clipboard/ClipboardToast";
import { useClipboardMonitor } from "../features/clipboard/hooks/useClipboardMonitor";
import type { ClipboardEntry } from "../features/clipboard/storage";
import { useAppRoute, type Page } from "../app/hooks/useAppRoute";

export function ShellLayout() {
  const { t } = useTranslation();
  const { toggle } = useTheme();
  const { page, setPage, ready } = useAppRoute();

  const { entries, latestEntry } = useClipboardMonitor();
  const [toastEntry, setToastEntry] = useState<ClipboardEntry | null>(null);
  const lastToastIdRef = useRef<string>("");

  // Show toast only for genuinely new entries (not on tab re-focus)
  useEffect(() => {
    if (latestEntry && latestEntry.id !== lastToastIdRef.current) {
      lastToastIdRef.current = latestEntry.id;
      setToastEntry(latestEntry);
    }
  }, [latestEntry]);

  if (!ready) return null;

  const titles: Record<Page, string> = {
    photo: t("images.title"),
    documents: t("documents.title"),
    text: t("sanitizer.title"),
    clipboard: t("clipboard.title"),
    account: t("account.title"),
  };

  const isTool = page !== "account";

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
          {page === "account" && <AccountPage />}
        </main>
      </div>
      <ClipboardToast
        entry={toastEntry}
        allEntries={entries}
        onClose={() => setToastEntry(null)}
      />
    </div>
  );
}
