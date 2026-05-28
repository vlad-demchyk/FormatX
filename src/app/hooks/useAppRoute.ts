import { useCallback, useEffect, useState } from "react";
import { getSettings, saveSettings, type TabRoute } from "../../lib/db";

export type Page = "text" | "photo" | "documents" | "clipboard" | "account" | "support";

const TAB_ROUTES: TabRoute[] = ["photo", "documents", "text", "clipboard"];

function isTabRoute(p: Page): p is TabRoute {
  return TAB_ROUTES.includes(p as TabRoute);
}

function normalizeTab(tab: TabRoute | undefined): TabRoute {
  if (!tab) return "photo";
  return tab;
}

/** Read the initial page from the URL hash. */
function pageFromHash(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "").split("/")[0] || "";
  const valid: Page[] = ["text", "photo", "documents", "clipboard", "account", "support"];
  return valid.includes(hash as Page) ? (hash as Page) : "photo";
}

/** Build a hash for the given page and optional section. */
export function hashFor(page: Page, section?: string): string {
  return section ? `#/${page}/${section}` : `#/${page}`;
}

export function useAppRoute() {
  const [page, setPageState] = useState<Page>(() => pageFromHash());
  const [ready, setReady] = useState(false);

  // Sync initial hash from saved settings if no hash is set
  useEffect(() => {
    if (window.location.hash && window.location.hash.startsWith("#/")) {
      setReady(true);
      return;
    }
    void getSettings().then((s) => {
      const lastTab = normalizeTab(s.lastTab);
      setPageState(lastTab);
      window.location.hash = hashFor(lastTab);
      setReady(true);
    });
  }, []);

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => {
      const p = pageFromHash();
      setPageState(p);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const setPage = useCallback((next: Page) => {
    setPageState(next);
    window.location.hash = hashFor(next);
    if (isTabRoute(next)) {
      void getSettings().then((s) =>
        saveSettings({ ...s, lastTab: next }),
      );
    }
  }, []);

  const lastToolTab: TabRoute = isTabRoute(page) ? page : "photo";

  const backToTools = useCallback(() => {
    setPage(lastToolTab);
  }, [lastToolTab, setPage]);

  return { page, setPage, ready, lastToolTab, backToTools };
}
