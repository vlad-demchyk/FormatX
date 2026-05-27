import { t } from "./i18n";

export function showToast(
  messageKey: string,
  kind: "success" | "error" = "success",
): void {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = t(messageKey);
  el.className = `toast toast--${kind} show`;
  setTimeout(() => {
    el.classList.remove("show");
  }, 2000);
}
