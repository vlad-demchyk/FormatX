import { t } from "./i18n";

interface ConfirmResult {
  confirmed: boolean;
}

/**
 * Show a custom confirm dialog that auto-dismisses after `timeout` ms.
 * Supports interpolation via `{{key}}` in the message key.
 * Returns a promise that resolves with `{ confirmed: true }` on confirm,
 * or `{ confirmed: false }` on cancel / timeout.
 */
export function showConfirm(
  messageKey: string,
  interpolations?: Record<string, string>,
  timeout = 15_000,
): Promise<ConfirmResult> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay show";

    const box = document.createElement("div");
    box.className = "confirm-box";

    const msg = document.createElement("p");
    msg.className = "confirm-msg";
    let text = t(messageKey);
    if (interpolations) {
      for (const [key, val] of Object.entries(interpolations)) {
        text = text.replace(`{{${key}}}`, val);
      }
    }
    msg.textContent = text;

    const btnRow = document.createElement("div");
    btnRow.className = "confirm-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-ghost";
    cancelBtn.textContent = t("toast.cancel") || "Cancel";
    cancelBtn.onclick = () => {
      cleanup();
      resolve({ confirmed: false });
    };

    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "btn btn-primary";
    okBtn.textContent = t("toast.ok") || "OK";
    okBtn.onclick = () => {
      cleanup();
      resolve({ confirmed: true });
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(okBtn);
    box.appendChild(msg);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const timer = setTimeout(() => {
      cleanup();
      resolve({ confirmed: false });
    }, timeout);

    function cleanup() {
      clearTimeout(timer);
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 200);
    }
  });
}
