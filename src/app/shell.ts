import { initI18n, onLanguageChanged, t } from "./i18n";
import {
  getRoute,
  getLastToolTab,
  initRouteFromSettings,
  isTabRoute,
  navigate,
  subscribe,
  type Route,
} from "./router";
import { applyTheme, loadSettings } from "./settings";
import { renderTabNav } from "./tabNav";
import { renderDocuments } from "./views/documents";
import { renderAccount } from "./views/account";
import { renderSanitizer } from "../features/sanitizer/view";
import { renderImages } from "../features/images/view";
import { initStorage } from "../lib/storage";
import { logoSvg } from "./logo";

function routeTitle(route: Route): string {
  const map: Record<Route, string> = {
    text: t("sanitizer.title"),
    photo: t("images.title"),
    documents: t("documents.title"),
    account: t("account.title"),
  };
  return map[route];
}

function renderMain(main: HTMLElement): void {
  const route = getRoute();
  main.innerHTML = "";
  switch (route) {
    case "text":
      renderSanitizer(main);
      break;
    case "photo":
      renderImages(main);
      break;
    case "documents":
      renderDocuments(main);
      break;
    case "account":
      renderAccount(main);
      break;
  }
}

function renderShell(app: HTMLElement): void {
  const route = getRoute();
  const inTools = isTabRoute(route);

  app.innerHTML = `
    <div class="shell">
      <header class="shell-header">
        <div class="shell-header__brand">
          <span class="shell-header__logo" aria-hidden="true">${logoSvg("shell-header__logo-svg")}</span>
          <span class="shell-header__title">${inTools ? routeTitle(route) : t("appName")}</span>
        </div>
        <div class="shell-header__actions">
          <button type="button" class="btn btn-ghost btn-icon" id="btnTheme" title="${t("theme.toggle")}" aria-label="${t("theme.toggle")}">◐</button>
          <button type="button" class="btn btn-secondary${route === "account" ? " is-active" : ""}" id="btnAccount">${t("nav.account")}</button>
        </div>
      </header>
      <div class="shell-body">
        <div class="shell-tabs-wrap" id="shellTabs"></div>
        <main class="shell-main" id="shellMain"></main>
      </div>
    </div>
  `;

  app.querySelector("#btnAccount")?.addEventListener("click", () => {
    navigate(route === "account" ? getLastToolTab() : "account");
  });
  app.querySelector("#btnTheme")?.addEventListener("click", async () => {
    const current = document.documentElement.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    await applyTheme(next);
    renderShell(app);
  });

  renderTabNav(app.querySelector("#shellTabs") as HTMLElement);
  renderMain(app.querySelector("#shellMain") as HTMLElement);
}

export async function initApp(): Promise<void> {
  await initStorage();
  const settings = await loadSettings();
  initRouteFromSettings(settings.lastTab);
  await initI18n(settings.locale);
  document.documentElement.setAttribute("data-theme", settings.theme);
  document.documentElement.lang = settings.locale;

  const app = document.getElementById("app");
  if (!app) return;

  subscribe(() => renderShell(app));
  onLanguageChanged(() => renderShell(app));
  renderShell(app);
}
