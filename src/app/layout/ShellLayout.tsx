import { useTranslation } from "react-i18next";
import { useTheme } from "../providers/ThemeProvider";
import { logoSvg } from "../logo";
import { TabBar } from "../../components/TabBar";
import { TextPage } from "../../features/text/TextPage";
import { AccountPage } from "../../features/account/AccountPage";
import { DocumentsPage } from "../../features/documents/DocumentsPage";
import { PhotoPage } from "../../features/photo/PhotoPage";
import { ClipboardPage } from "../../features/clipboard/ClipboardPage";
import { SupportPage } from "../../features/support/SupportPage";
import { useAppRoute, type Page } from "../hooks/useAppRoute";
import { useGlobalClipboardCapture } from "../hooks/useGlobalClipboardCapture";
import { SelectionToolbar } from "../../components/SelectionToolbar";

export function ShellLayout() {
  const { t } = useTranslation();
  const { toggle } = useTheme();

  // Global clipboard capture (copy/paste/visibility)
  useGlobalClipboardCapture();

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
      <SelectionToolbar />
    </div>
  );
}
