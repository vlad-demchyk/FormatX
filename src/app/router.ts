import { getSettings, saveSettings } from "../lib/storage";
import type { TabRoute } from "../lib/storage/types";

export type Route = TabRoute | "account";

const TAB_ROUTES: TabRoute[] = ["photo", "documents", "text"];

let currentRoute: Route = "photo";
let lastToolTab: TabRoute = "photo";
const listeners = new Set<() => void>();

export function isTabRoute(route: Route): route is TabRoute {
  return TAB_ROUTES.includes(route as TabRoute);
}

function normalizeTab(tab: TabRoute | undefined): TabRoute {
  if (tab === "documents") return "photo";
  return tab && TAB_ROUTES.includes(tab) ? tab : "photo";
}

export function initRouteFromSettings(lastTab?: TabRoute): void {
  const tab = normalizeTab(lastTab);
  currentRoute = tab;
  lastToolTab = tab;
}

export function getRoute(): Route {
  return currentRoute;
}

export function getLastToolTab(): TabRoute {
  return lastToolTab;
}

export function navigate(route: Route): void {
  currentRoute = route;
  if (isTabRoute(route)) {
    lastToolTab = route;
    void persistLastTab(route);
  }
  listeners.forEach((l) => l());
}

async function persistLastTab(tab: TabRoute): Promise<void> {
  try {
    const settings = await getSettings();
    await saveSettings({ ...settings, lastTab: tab });
  } catch {
    /* UI must stay usable if persistence fails */
  }
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
