import { t } from "../i18n";

export function renderDocuments(root: HTMLElement): void {
  root.innerHTML = `
    <div class="documents-placeholder card">
      <span class="badge">${t("tiles.soon")}</span>
      <h2>${t("documents.title")}</h2>
      <p>${t("documents.coming")}</p>
    </div>
  `;
}
