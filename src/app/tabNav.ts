import { t } from "./i18n";
import { tabIcons } from "./icons";
import { getRoute, navigate, isTabRoute } from "./router";
import type { TabRoute } from "../lib/storage/types";

const TABS: { route: TabRoute; labelKey: string; disabled?: boolean }[] = [
  { route: "photo", labelKey: "tiles.photo" },
  { route: "documents", labelKey: "tiles.documents", disabled: true },
  { route: "text", labelKey: "tiles.classes" },
];

export function renderTabNav(container: HTMLElement): void {
  const active = getRoute();
  const tabActive = isTabRoute(active) ? active : null;

  container.innerHTML = `
    <nav class="shell-tabs" role="tablist" aria-label="${t("nav.tools")}">
      ${TABS.map(
        (tab) => `
        <button
          type="button"
          role="tab"
          class="shell-tab${tab.disabled ? " shell-tab--disabled" : ""}"
          data-route="${tab.route}"
          aria-selected="${tabActive === tab.route}"
          aria-current="${tabActive === tab.route ? "page" : "false"}"
          ${tab.disabled ? `disabled title="${t("documents.coming")}"` : ""}
        >
          <span class="shell-tab__icon" aria-hidden="true">${tabIcons[tab.route]}</span>
          <span class="shell-tab__label">${t(tab.labelKey)}</span>
          ${tab.disabled ? `<span class="shell-tab__badge">${t("tiles.soon")}</span>` : ""}
        </button>`,
      ).join("")}
    </nav>
  `;

  container.querySelectorAll<HTMLButtonElement>(".shell-tab:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.route as TabRoute);
    });
  });
}
