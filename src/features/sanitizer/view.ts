import { copyText } from "../../lib/clipboard";
import { addTextSnippet, listTextSnippets } from "../../lib/storage";
import { t } from "../../app/i18n";
import { showToast } from "../../app/toast";
import {
  sanitize,
  sanitizeClasses,
  trimAndSanitize,
  type SanitizeOptions,
} from "./logic";

function readOptions(root: HTMLElement): SanitizeOptions {
  return {
    charToReplace: (root.querySelector("#replaceChar") as HTMLInputElement).value,
    replaceWith: (root.querySelector("#replaceWith") as HTMLSelectElement)
      .value as SanitizeOptions["replaceWith"],
    spacing: (root.querySelector("#spacing") as HTMLSelectElement)
      .value as SanitizeOptions["spacing"],
    removeArgs: parseInt((root.querySelector("#removeArgs") as HTMLInputElement).value, 10) || 0,
  };
}

function setOutput(el: HTMLElement, text: string, placeholder: string): void {
  if (!text) {
    el.textContent = placeholder;
    el.classList.add("output-placeholder");
  } else {
    el.textContent = text;
    el.classList.remove("output-placeholder");
  }
}

async function renderSnippets(container: HTMLElement): Promise<void> {
  const snippets = await listTextSnippets();
  const list = container.querySelector(".snippets-list");
  if (!list) return;
  list.innerHTML = snippets
    .map(
      (s) => `
    <div class="snippet-item">
      <span title="${s.outputText.replace(/"/g, "&quot;")}">${s.inputPreview}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-copy="${encodeURIComponent(s.outputText)}">${t("sanitizer.classCopy")}</button>
    </div>`,
    )
    .join("");
  list.querySelectorAll<HTMLButtonElement>("button[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = decodeURIComponent(btn.dataset.copy || "");
      if (await copyText(text)) showToast("toast.copied");
    });
  });
}

export function renderSanitizer(root: HTMLElement): void {
  root.innerHTML = `
    <h2>${t("sanitizer.title")}</h2>
    <div class="sanitizer-grid">
      <div class="card">
        <div class="field"><label for="replaceChar">${t("sanitizer.replaceChar")}</label>
          <input id="replaceChar" type="text" maxlength="5" value="/" /></div>
        <div class="field"><label for="replaceWith">${t("sanitizer.replaceWith")}</label>
          <select id="replaceWith">
            <option value="space">${t("sanitizer.replaceSpace")}</option>
            <option value="dash">${t("sanitizer.replaceDash")}</option>
            <option value="comma">${t("sanitizer.replaceComma")}</option>
          </select></div>
        <div class="field"><label for="spacing">${t("sanitizer.spacing")}</label>
          <select id="spacing">
            <option value="none">${t("sanitizer.spacingNone")}</option>
            <option value="around">${t("sanitizer.spacingAround")}</option>
          </select></div>
        <div class="field"><label for="removeArgs">${t("sanitizer.removeArgs")}</label>
          <input id="removeArgs" type="number" min="0" value="0" /></div>
        <div class="field"><label for="input">${t("sanitizer.input")}</label>
          <textarea id="input" placeholder=""></textarea></div>
        <div class="field"><label>${t("sanitizer.output")}</label>
          <div id="output" class="output-area output-placeholder">${t("sanitizer.outputPlaceholder")}</div></div>
        <div class="sanitizer-actions">
          <button type="button" class="btn btn-primary" id="btnConvert">${t("sanitizer.convert")}</button>
          <button type="button" class="btn btn-secondary" id="btnConvertCopy">${t("sanitizer.convertCopy")}</button>
          <button type="button" class="btn btn-secondary" id="btnTrimCopy">${t("sanitizer.trimCopy")}</button>
        </div>
      </div>
      <div class="card">
        <h3>${t("sanitizer.classesTitle")}</h3>
        <div class="field"><label for="classInput">${t("sanitizer.classesInput")}</label>
          <textarea id="classInput" placeholder="${t("sanitizer.classesPlaceholder")}"></textarea></div>
        <div class="field"><label>${t("sanitizer.output")}</label>
          <div id="classOutput" class="output-area output-placeholder">${t("sanitizer.selectorPlaceholder")}</div></div>
        <div class="sanitizer-actions">
          <button type="button" class="btn btn-primary" id="btnClassConvert">${t("sanitizer.classConvert")}</button>
          <button type="button" class="btn btn-secondary" id="btnClassCopy">${t("sanitizer.classCopy")}</button>
        </div>
      </div>
    </div>
    <details class="snippets card" open>
      <summary>${t("sanitizer.recent")}</summary>
      <div class="snippets-list"></div>
    </details>
  `;

  const outputEl = root.querySelector("#output") as HTMLElement;
  const classOutputEl = root.querySelector("#classOutput") as HTMLElement;
  const inputEl = root.querySelector("#input") as HTMLTextAreaElement;
  const classInputEl = root.querySelector("#classInput") as HTMLTextAreaElement;

  const updateOutput = () => {
    const result = sanitize(inputEl.value, readOptions(root));
    setOutput(outputEl, result, t("sanitizer.outputPlaceholder"));
  };

  const updateClassOutput = () => {
    const result = sanitizeClasses(classInputEl.value);
    setOutput(classOutputEl, result, t("sanitizer.selectorPlaceholder"));
  };

  root.querySelector("#btnConvert")?.addEventListener("click", updateOutput);

  root.querySelector("#btnConvertCopy")?.addEventListener("click", async () => {
    const result = sanitize(inputEl.value, readOptions(root));
    updateOutput();
    if (result && (await copyText(result))) {
      await addTextSnippet(inputEl.value, result);
      showToast("toast.copied");
      await renderSnippets(root);
    }
  });

  root.querySelector("#btnTrimCopy")?.addEventListener("click", async () => {
    const result = trimAndSanitize(inputEl.value, readOptions(root));
    setOutput(outputEl, result, t("sanitizer.outputPlaceholder"));
    if (await copyText(result)) {
      await addTextSnippet(inputEl.value, result);
      showToast("toast.copied");
      await renderSnippets(root);
    }
  });

  root.querySelector("#btnClassConvert")?.addEventListener("click", updateClassOutput);
  root.querySelector("#btnClassCopy")?.addEventListener("click", async () => {
    const result = sanitizeClasses(classInputEl.value);
    updateClassOutput();
    if (result && (await copyText(result))) showToast("toast.copied");
  });

  inputEl.addEventListener("input", updateOutput);
  classInputEl.addEventListener("input", updateClassOutput);
  root.querySelectorAll("#replaceChar, #replaceWith, #spacing, #removeArgs").forEach((el) => {
    el.addEventListener("input", updateOutput);
    el.addEventListener("change", updateOutput);
  });

  void renderSnippets(root);
}
