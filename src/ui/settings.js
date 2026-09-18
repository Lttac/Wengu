/**
 * 設定面板。
 * 只負責「把表單寫進 store」，不負責重新渲染——
 * 重繪由 main.js 訂閱 store 事件後統一處理，保持單向資料流。
 */

import { t, applyStatic } from "../i18n.js";
import { PRESETS, presetById, createClient, LlmError } from "../llm.js";
import { APP_VERSION, EXPORT_FILE_PREFIX } from "../config.js";
import { BUILTIN_SUBJECT_IDS, SUBJECT_NAME_MAX } from "../store.js";
import { categoryLabel } from "../i18n.js";
import { escapeHtml } from "./render.js";

function patchFor(path, value) {
  const parts = path.split(".");
  if (parts.length === 1) return { [parts[0]]: value };
  const [group, key] = parts;
  return { [group]: { [key]: value } };
}

export function createSettingsDialog({ store, toasts, doc = globalThis.document, win = globalThis.window }) {
  const dialog = doc.createElement("dialog");
  dialog.className = "sheet";
  dialog.id = "settingsDialog";
  dialog.innerHTML = `
    <div class="sheet-head">
      <h2 class="sheet-title" data-i18n="settings.title"></h2>
      <button type="button" class="icon-button" data-action="close" data-i18n-aria-label="settings.close">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"/></svg>
      </button>
    </div>
    <div class="sheet-body">
      <section class="sheet-section">
        <h3 class="sheet-section-title" data-i18n="settings.section.appearance"></h3>
        <div class="segmented" role="radiogroup" aria-label="appearance" data-segment="appearance">
          <button type="button" role="radio" aria-checked="false" data-value="system" data-i18n="settings.appearance.system"></button>
          <button type="button" role="radio" aria-checked="false" data-value="light" data-i18n="settings.appearance.light"></button>
          <button type="button" role="radio" aria-checked="false" data-value="dark" data-i18n="settings.appearance.dark"></button>
        </div>
      </section>

      <section class="sheet-section">
        <h3 class="sheet-section-title" data-i18n="settings.section.language"></h3>
        <div class="segmented" role="radiogroup" aria-label="language" data-segment="locale">
          <button type="button" role="radio" aria-checked="false" data-value="auto" data-i18n="settings.language.auto"></button>
          <button type="button" role="radio" aria-checked="false" data-value="zh-Hant">繁體中文</button>
          <button type="button" role="radio" aria-checked="false" data-value="zh-Hans">简体中文</button>
          <button type="button" role="radio" aria-checked="false" data-value="en">English</button>
        </div>
      </section>

      <section class="sheet-section">
        <h3 class="sheet-section-title" data-i18n="settings.section.review"></h3>
        <div class="stack-3">
          <div class="row-between">
            <div>
              <div data-i18n="settings.review.showMeta"></div>
              <p class="hint" data-i18n="settings.review.showMeta.hint"></p>
            </div>
            <button type="button" class="switch" role="switch" aria-checked="false" data-switch="review.showMeta"></button>
          </div>
          <div class="row-between">
            <div>
              <div data-i18n="settings.review.shuffle"></div>
              <p class="hint" data-i18n="settings.review.shuffle.hint"></p>
            </div>
            <button type="button" class="switch" role="switch" aria-checked="false" data-switch="review.shuffle"></button>
          </div>
          <div class="row-between">
            <div>
              <div data-i18n="settings.review.shortcuts"></div>
              <p class="hint" data-i18n="settings.review.shortcuts.hint"></p>
            </div>
            <button type="button" class="switch" role="switch" aria-checked="false" data-switch="review.shortcuts"></button>
          </div>
        </div>
      </section>

      <section class="sheet-section">
        <div class="row-between">
          <div>
            <div data-i18n="settings.ai.enabled"></div>
            <p class="hint" data-i18n="settings.ai.enabled.hint"></p>
          </div>
          <button type="button" class="switch" role="switch" aria-checked="false" data-switch="llm.enabled"></button>
        </div>

        <div class="stack-2" data-ai-body style="margin-top: var(--s-4)">
          <label>
            <span class="field-label" data-i18n="settings.ai.preset"></span>
            <select class="field field-select" data-field="llm.preset" data-preset-select></select>
          </label>
          <label>
            <span class="field-label" data-i18n="settings.ai.baseUrl"></span>
            <input class="field" type="url" inputmode="url" spellcheck="false"
                   data-field="llm.baseUrl" placeholder="https://api.example.com/v1"/>
          </label>
          <label>
            <span class="field-label" data-i18n="settings.ai.model"></span>
            <input class="field" type="text" spellcheck="false" data-field="llm.model" placeholder="model-name"/>
          </label>
          <label>
            <span class="field-label" data-i18n="settings.ai.apiKey"></span>
            <input class="field" type="password" autocomplete="off" spellcheck="false"
                   data-field="llm.apiKey" placeholder="sk-…"/>
          </label>
          <p class="hint" data-i18n="settings.ai.apiKey.hint"></p>
          <label>
            <span class="field-label" data-i18n="settings.ai.keyStorage"></span>
            <select class="field field-select" data-field="llm.keyStorage">
              <option value="local" data-i18n="settings.ai.keyStorage.local"></option>
              <option value="session" data-i18n="settings.ai.keyStorage.session"></option>
              <option value="memory" data-i18n="settings.ai.keyStorage.memory"></option>
            </select>
          </label>
          <p class="hint" data-i18n="settings.ai.keyStorage.hint"></p>
          <p class="callout" data-tone="warning" data-ai-warning hidden
             data-i18n="settings.ai.needsKey"></p>
          <div class="row-between">
            <button type="button" class="btn btn-quiet btn-inline" data-action="test" data-i18n="settings.ai.test"></button>
            <span class="ai-status" data-test-status></span>
          </div>
          <p class="callout" data-i18n="settings.ai.corsHint"></p>
        </div>
      </section>

      <section class="sheet-section">
        <h3 class="sheet-section-title" data-i18n="settings.section.subjects"></h3>
        <p class="hint" data-i18n="settings.subjects.hint"></p>
        <div class="subject-list" data-subject-list></div>
        <div class="subject-add">
          <input class="field" type="text" maxlength="${SUBJECT_NAME_MAX}" data-subject-input
                 data-i18n-placeholder="settings.subjects.placeholder"/>
          <button type="button" class="btn btn-quiet btn-inline" data-action="add-subject"
                  data-i18n="settings.subjects.add"></button>
        </div>
        <p class="hint subject-status" data-subject-status></p>
      </section>

      <section class="sheet-section">
        <h3 class="sheet-section-title" data-i18n="settings.section.data"></h3>
        <p class="hint" data-data-summary></p>
        <div class="btn-row" style="margin-top: var(--s-3)">
          <button type="button" class="btn btn-quiet" data-action="export" data-i18n="settings.data.export"></button>
          <button type="button" class="btn btn-quiet" data-action="import" data-i18n="settings.data.import"></button>
          <button type="button" class="btn btn-tint" data-tone="danger" data-action="reset" data-i18n="settings.data.reset"></button>
        </div>
        <p class="hint" data-i18n="settings.data.importHint"></p>
      </section>

      <section class="sheet-section">
        <h3 class="sheet-section-title" data-i18n="settings.section.about"></h3>
        <p class="hint" data-i18n="app.tagline"></p>
        <p class="hint"><span data-i18n="settings.about.version"></span> <span data-version></span></p>
        <p class="callout" data-i18n="settings.about.privacy"></p>
        <p class="hint" data-i18n="settings.about.design"></p>
      </section>
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-primary" data-action="done" data-i18n="settings.done"></button>
    </div>`;

  const fileInput = doc.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "application/json,.json";
  fileInput.hidden = true;
  dialog.appendChild(fileInput);
  doc.body.appendChild(dialog);

  const segment = (name) => dialog.querySelector(`[data-segment="${name}"]`);
  const field = (path) => dialog.querySelector(`[data-field="${path}"]`);
  const presetSelect = dialog.querySelector("[data-preset-select]");
  const aiBody = dialog.querySelector("[data-ai-body]");
  const aiWarning = dialog.querySelector("[data-ai-warning]");
  const testStatus = dialog.querySelector("[data-test-status]");
  const dataSummary = dialog.querySelector("[data-data-summary]");
  const subjectList = dialog.querySelector("[data-subject-list]");
  const subjectInput = dialog.querySelector("[data-subject-input]");
  const subjectStatus = dialog.querySelector("[data-subject-status]");
  dialog.querySelector("[data-version]").textContent = APP_VERSION;

  function setSegment(name, value) {
    for (const button of segment(name).querySelectorAll("button")) {
      button.setAttribute("aria-checked", String(button.dataset.value === value));
    }
  }

  function setSwitch(path, value) {
    const button = dialog.querySelector(`[data-switch="${path}"]`);
    if (button) button.setAttribute("aria-checked", String(Boolean(value)));
  }

  function fillPresets() {
    presetSelect.innerHTML = PRESETS
      .map((preset) => `<option value="${preset.id}">${preset.label}</option>`)
      .join("");
  }

  function setTestStatus(text, tone) {
    testStatus.textContent = text || "";
    testStatus.style.color = tone === "ok" ? "var(--success)" : tone === "error" ? "var(--danger)" : "";
  }

  function setSubjectStatus(text, tone) {
    subjectStatus.textContent = text || "";
    subjectStatus.style.color = tone === "error" ? "var(--danger-text)" : "";
  }

  function renderSubjects() {
    const rows = [
      ...BUILTIN_SUBJECT_IDS.map((id) => ({ id, label: categoryLabel(id), builtin: true })),
      ...store.getSubjects().map((s) => ({ id: s.id, label: s.name, builtin: false })),
    ];
    subjectList.innerHTML = rows.map((row) => '<div class="subject-row">'
      + `<span class="subject-name">${escapeHtml(row.label)}</span>`
      + (row.builtin
        ? `<span class="subject-tag">${escapeHtml(t("settings.subjects.builtin"))}</span>`
        : '<button type="button" class="btn btn-tint btn-inline" data-tone="danger"'
          + ` data-remove-subject="${escapeHtml(row.id)}">${escapeHtml(t("settings.subjects.remove"))}</button>`)
      + "</div>").join("");
  }

  function addSubject() {
    const result = store.addSubject(subjectInput.value);
    if (!result.ok) {
      const key = {
        empty: "settings.subjects.empty",
        duplicate: "settings.subjects.duplicate",
        "too-long": "settings.subjects.tooLong",
      }[result.reason];
      setSubjectStatus(t(key, { n: SUBJECT_NAME_MAX }), "error");
      return;
    }
    subjectInput.value = "";
    setSubjectStatus("");
    toasts?.show(t("settings.subjects.added", { name: result.subject.name }));
  }

  function removeSubject(id) {
    const name = store.getSubjects().find((s) => s.id === id)?.name ?? "";
    const result = store.removeSubject(id);
    if (result.ok) {
      setSubjectStatus("");
      toasts?.show(t("settings.subjects.removed", { name }));
      return;
    }
    if (result.reason === "in-use") {
      setSubjectStatus(t("settings.subjects.inUse", { n: result.count }), "error");
      return;
    }
    setSubjectStatus(t("settings.subjects.builtin"), "error");
  }

  function sync() {
    const settings = store.getSettings();
    applyStatic(dialog);
    fillPresets();

    setSegment("appearance", settings.appearance);
    setSegment("locale", settings.locale);
    setSwitch("review.showMeta", settings.review.showMeta);
    setSwitch("review.shuffle", settings.review.shuffle);
    setSwitch("review.shortcuts", settings.review.shortcuts);
    setSwitch("llm.enabled", settings.llm.enabled);

    presetSelect.value = PRESETS.some((p) => p.id === settings.llm.preset) ? settings.llm.preset : "custom";
    field("llm.baseUrl").value = settings.llm.baseUrl;
    field("llm.model").value = settings.llm.model;
    field("llm.keyStorage").value = settings.llm.keyStorage;

    const keyInput = field("llm.apiKey");
    if (doc.activeElement !== keyInput) keyInput.value = store.getApiKey();

    // 欄位一律顯示。之前跟著開關一起藏起來，結果變成「AI 功能好像被拿掉了」——
    // 使用者得先看到金鑰欄位，才可能去填它。開關只決定卡片介面要不要出現 AI 按鈕。
    aiBody.hidden = false;
    aiWarning.hidden = !(settings.llm.enabled && !store.getApiKey());
    dataSummary.textContent = t("settings.data.summary", { n: store.getItems().length });
    renderSubjects();
  }

  function download() {
    const payload = JSON.stringify(store.exportData(), null, 2);
    const name = `${EXPORT_FILE_PREFIX}-${new Date().toISOString().slice(0, 10)}.json`;
    const url = win.URL?.createObjectURL?.(new Blob([payload], { type: "application/json" }));
    if (!url) return false;
    const anchor = doc.createElement("a");
    anchor.href = url;
    anchor.download = name;
    doc.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => win.URL.revokeObjectURL(url), 1000);
    return true;
  }

  async function runTest() {
    const button = dialog.querySelector('[data-action="test"]');
    const settings = store.getSettings();
    button.disabled = true;
    setTestStatus(t("settings.ai.testing"));
    try {
      const client = createClient({
        baseUrl: field("llm.baseUrl").value.trim(),
        apiKey: field("llm.apiKey").value.trim() || store.getApiKey(),
        model: field("llm.model").value.trim(),
        temperature: settings.llm.temperature,
      });
      const { ms } = await client.test();
      setTestStatus(t("settings.ai.testOk", { ms }), "ok");
    } catch (err) {
      const detail = err instanceof LlmError && err.code === "status"
        ? t("ai.error.status", { status: err.detail.status })
        : err instanceof LlmError && err.code === "no-key"
          ? t("ai.error.noKey")
          : err instanceof LlmError && err.code === "network"
            ? t("ai.error.network")
            : String(err?.message || err);
      setTestStatus(t("settings.ai.testFail", { reason: detail }), "error");
    } finally {
      button.disabled = false;
    }
  }

  dialog.addEventListener("click", (event) => {
    const valueButton = event.target.closest("[data-segment] button");
    if (valueButton) {
      const name = valueButton.closest("[data-segment]").dataset.segment;
      store.updateSettings({ [name]: valueButton.dataset.value });
      return;
    }

    const switchButton = event.target.closest("[data-switch]");
    if (switchButton) {
      const path = switchButton.dataset.switch;
      const next = switchButton.getAttribute("aria-checked") !== "true";
      switchButton.setAttribute("aria-checked", String(next));
      store.updateSettings(patchFor(path, next));
      return;
    }

    const action = event.target.closest("[data-action]")?.dataset.action;
    const removeId = event.target.closest("[data-remove-subject]")?.dataset.removeSubject;
    if (removeId) {
      removeSubject(removeId);
      return;
    }
    if (action === "close" || action === "done") dialog.close();
    else if (action === "add-subject") addSubject();
    else if (action === "test") runTest();
    else if (action === "export") {
      if (download()) toasts?.show(t("toast.exported", { n: store.getItems().length }));
    } else if (action === "import") {
      fileInput.click();
    } else if (action === "reset") {
      if (win.confirm?.(t("settings.data.resetConfirm"))) {
        store.reset();
        setTestStatus("");
        toasts?.show(t("toast.reset"));
      }
    }
  });

  dialog.addEventListener("change", (event) => {
    const target = event.target;
    const path = target.dataset?.field;
    if (!path) return;

    if (path === "llm.apiKey") {
      store.setApiKey(target.value);
      return;
    }
    if (path === "llm.preset") {
      const preset = presetById(target.value);
      if (preset.baseUrl) {
        field("llm.baseUrl").value = preset.baseUrl;
        field("llm.model").value = preset.model;
        store.updateSettings({ llm: { baseUrl: preset.baseUrl, model: preset.model, preset: preset.id } });
      } else {
        store.updateSettings({ llm: { preset: preset.id } });
      }
      return;
    }
    if (path === "llm.keyStorage") {
      // 先換儲存位置，再把目前這把金鑰寫進去，否則它會留在舊位置
      store.updateSettings({ llm: { keyStorage: target.value } });
      store.setApiKey(field("llm.apiKey").value);
      return;
    }
    store.updateSettings(patchFor(path, target.value.trim()));
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const count = store.importData(await file.text(), { mode: "merge" });
      toasts?.show(t("toast.imported", { n: count }));
    } catch (err) {
      const reason = err?.message === "invalid-payload" ? "invalid JSON" : String(err?.message || err);
      toasts?.show(t("toast.importFailed", { reason }));
    } finally {
      fileInput.value = "";
    }
  });

  subjectInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSubject();
    }
  });

  dialog.addEventListener("close", () => setTestStatus(""));

  return {
    open() {
      sync();
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    },
    close: () => dialog.close(),
    sync,
    isOpen: () => dialog.open,
    element: dialog,
  };
}
