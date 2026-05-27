import { useCallback, useEffect, useState } from "react";
import { getSettings, saveSettings, type TabRoute } from "../../lib/storage";

export type Page = "text" | "photo" | "documents" | "clipboard" | "account";

const TAB_ROUTES: TabRoute[] = ["photo", "documents", "text", "clipboard"];

function isTabRoute(p: Page): p is TabRoute {
  return TAB_ROUTES.includes(p as TabRoute);
}

function normalizeTab(tab: TabRoute | undefined): TabRoute {
  if (!tab) return "photo";
  return tab;
}

export function useAppRoute() {
  const [page, setPageState] = useState<Page>("photo");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void getSettings().then((s) => {
      const lastTab = normalizeTab(s.lastTab);
      setPageState(lastTab);
      setReady(true);
    });
  }, []);

  const setPage = useCallback((next: Page) => {
    setPageState(next);
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
