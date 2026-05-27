import { downloadBlob } from "../../lib/download";
import { addHistoryItem } from "../../lib/storage";
import {
  blobToBase64,
  buildZipForItems,
  convertItem,
  detectFormatKey,
  extFromMime,
  heicLikely,
  baseName,
} from "./logic";
import type { QueueItem } from "./types";
import { t } from "../../app/i18n";

const MAX_HISTORY_BLOB = 2 * 1024 * 1024;

export function renderImages(root: HTMLElement): void {
  let queue: QueueItem[] = [];

  root.innerHTML = `
    <h2>${t("images.title")}</h2>
    <div class="card">
      <div class="images-row">
        <div class="field"><label for="fmtIn">${t("images.fmtIn")}</label>
          <select id="fmtIn">
            <option value="auto">${t("images.auto")}</option>
            <option value="heic">HEIC</option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select></div>
        <div class="field"><label for="fmtOut">${t("images.fmtOut")}</label>
          <select id="fmtOut">
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select></div>
        <div class="field"><label for="quality">${t("images.quality")}</label>
          <input id="quality" type="number" min="40" max="100" value="92" /></div>
      </div>
      <div id="drop" class="images-drop" tabindex="0" role="button">
        <p><strong>${t("images.drop")}</strong></p>
        <p style="color:var(--text-muted);font-size:0.85rem">${t("images.heicHint")}</p>
      </div>
      <input type="file" id="filesInput" accept="image/*,.heic,.heif" multiple hidden />
      <div class="images-toolbar">
        <button type="button" class="btn btn-primary" id="btnConvertAll">${t("images.convertAll")}</button>
        <button type="button" class="btn btn-primary" id="btnConvertSel">${t("images.convertSel")}</button>
        <button type="button" class="btn btn-secondary" id="btnDlSelZIP">${t("images.zipSel")}</button>
        <button type="button" class="btn btn-secondary" id="btnDlAllZIP">${t("images.zipAll")}</button>
        <button type="button" class="btn btn-secondary" id="btnSelAll">${t("images.selAll")}</button>
        <button type="button" class="btn btn-secondary" id="btnSelNone">${t("images.selNone")}</button>
        <button type="button" class="btn btn-secondary" id="btnClear">${t("images.clear")}</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <h3>${t("images.queue")} <span id="countBadge" class="badge" style="margin-left:8px">0</span></h3>
      <div id="items" class="images-items"></div>
      <p id="empty" class="empty-state">${t("images.empty")}</p>
    </div>
  `;

  const drop = root.querySelector("#drop") as HTMLElement;
  const filesInput = root.querySelector("#filesInput") as HTMLInputElement;
  const itemsEl = root.querySelector("#items") as HTMLElement;
  const emptyEl = root.querySelector("#empty") as HTMLElement;
  const countBadge = root.querySelector("#countBadge") as HTMLElement;

  const fmtIn = () => (root.querySelector("#fmtIn") as HTMLSelectElement).value;
  const fmtOut = () => (root.querySelector("#fmtOut") as HTMLSelectElement).value;
  const quality = () => Number((root.querySelector("#quality") as HTMLInputElement).value) || 92;

  async function saveToHistory(item: QueueItem): Promise<void> {
    const blob = item.blobs?.[0];
    if (!blob || blob.size > MAX_HISTORY_BLOB) return;
    const b64 = await blobToBase64(blob);
    const ext = extFromMime(fmtOut());
    await addHistoryItem({
      id: crypto.randomUUID(),
      type: "image",
      filename: `${baseName(item.file.name)}.${ext}`,
      mime: fmtOut(),
      size: blob.size,
      blobBase64: b64,
    });
  }

  function render(): void {
    itemsEl.innerHTML = "";
    emptyEl.style.display = queue.length ? "none" : "block";
    countBadge.textContent = String(queue.length);

    for (const item of queue) {
      const row = document.createElement("div");
      row.className = "images-item";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.selected;
      cb.addEventListener("change", () => {
        item.selected = cb.checked;
      });

      const thumbWrap = document.createElement("div");
      if (item.heicPreview && !item.thumbUrl) {
        const ph = document.createElement("div");
        ph.className = "images-thumb-ph";
        ph.textContent = "HEIC";
        thumbWrap.appendChild(ph);
      } else {
        const img = document.createElement("img");
        img.className = "images-thumb";
        img.src = item.thumbUrl || "";
        img.alt = "";
        thumbWrap.appendChild(img);
      }

      const meta = document.createElement("div");
      meta.innerHTML = `<div style="font-weight:600;word-break:break-all">${item.file.name}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">${(item.file.size / 1024 / 1024).toFixed(2)} MB · ${detectFormatKey(item.file, fmtIn())}</div>`;

      const statusEl = document.createElement("div");
      if (item.status === "ready") {
        statusEl.className = "status-ready";
        statusEl.textContent = t("images.statusReady");
      } else if (item.status === "error") {
        statusEl.className = "status-err";
        statusEl.textContent = item.error || t("images.statusError");
      } else if (item.status === "converting") {
        statusEl.textContent = t("images.statusConverting");
      } else {
        statusEl.className = "status-wait";
        statusEl.textContent = t("images.statusPending");
      }

      const actions = document.createElement("div");
      actions.className = "images-item__actions";

      const btnConv = document.createElement("button");
      btnConv.type = "button";
      btnConv.className = "btn btn-secondary";
      btnConv.textContent = t("images.convert");
      btnConv.disabled = item.status === "converting";
      btnConv.addEventListener("click", async () => {
        await convertItem(item, fmtOut(), quality(), fmtIn());
        if (item.status === "ready") await saveToHistory(item);
        render();
      });

      const btnDl = document.createElement("button");
      btnDl.type = "button";
      btnDl.className = "btn btn-primary";
      btnDl.textContent = t("images.download");
      btnDl.disabled = !item.blobs || item.status !== "ready";
      btnDl.addEventListener("click", () => {
        if (!item.blobs?.[0]) return;
        const ext = extFromMime(fmtOut());
        downloadBlob(item.blobs[0], `${baseName(item.file.name)}.${ext}`);
      });

      const btnRm = document.createElement("button");
      btnRm.type = "button";
      btnRm.className = "btn btn-ghost";
      btnRm.textContent = "×";
      btnRm.title = t("images.remove");
      btnRm.addEventListener("click", () => {
        if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
        queue = queue.filter((x) => x.id !== item.id);
        render();
      });

      actions.append(btnConv, btnDl, btnRm);
      row.append(cb, thumbWrap, meta, statusEl, actions);
      itemsEl.appendChild(row);
    }
  }

  function addFiles(fileList: FileList): void {
    for (const file of Array.from(fileList)) {
      const manual = fmtIn();
      const asHeic =
        manual === "heic" ||
        (manual === "auto" && (heicLikely(file) || detectFormatKey(file, "auto") === "heic"));
      queue.push({
        id: crypto.randomUUID(),
        file,
        thumbUrl: asHeic ? null : URL.createObjectURL(file),
        blobs: null,
        status: "pending",
        error: null,
        selected: true,
        heicPreview: asHeic,
      });
    }
    render();
  }

  drop.addEventListener("click", () => filesInput.click());
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      filesInput.click();
    }
  });
  filesInput.addEventListener("change", () => {
    if (filesInput.files?.length) addFiles(filesInput.files);
    filesInput.value = "";
  });
  ["dragenter", "dragover", "dragleave", "drop"].forEach((ev) => {
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
  drop.addEventListener("dragenter", () => drop.classList.add("dragover"));
  drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));
  drop.addEventListener("drop", (e) => {
    drop.classList.remove("dragover");
    if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
  });

  root.querySelector("#btnSelAll")?.addEventListener("click", () => {
    queue.forEach((q) => (q.selected = true));
    render();
  });
  root.querySelector("#btnSelNone")?.addEventListener("click", () => {
    queue.forEach((q) => (q.selected = false));
    render();
  });
  root.querySelector("#btnClear")?.addEventListener("click", () => {
    queue.forEach((q) => {
      if (q.thumbUrl) URL.revokeObjectURL(q.thumbUrl);
    });
    queue = [];
    render();
  });

  async function convertMany(pred: (q: QueueItem) => boolean): Promise<void> {
    for (const item of queue.filter(pred)) {
      await convertItem(item, fmtOut(), quality(), fmtIn());
      if (item.status === "ready") await saveToHistory(item);
      render();
    }
  }

  root.querySelector("#btnConvertAll")?.addEventListener("click", () => convertMany(() => true));
  root.querySelector("#btnConvertSel")?.addEventListener("click", () =>
    convertMany((q) => q.selected),
  );

  root.querySelector("#btnDlSelZIP")?.addEventListener("click", async () => {
    const sel = queue.filter((q) => q.selected && q.blobs && q.status === "ready");
    const z = await buildZipForItems(sel, fmtOut());
    if (z) downloadBlob(z, "converted-images.zip");
    else alert(t("images.noReadyZip"));
  });

  root.querySelector("#btnDlAllZIP")?.addEventListener("click", async () => {
    const sel = queue.filter((q) => q.blobs && q.status === "ready");
    const z = await buildZipForItems(sel, fmtOut());
    if (z) downloadBlob(z, "converted-images.zip");
    else alert(t("images.noReadyZip"));
  });

  render();
}
