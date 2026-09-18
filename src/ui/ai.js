/**
 * AI 面板：從筆記生成卡片、為單張卡片產生解釋。
 * 金鑰一律經 store 取得；這個模組不直接讀 localStorage。
 */

import { t, applyStatic, getLocale } from "../i18n.js";
import { createClient, buildGenerateMessages, buildExplainMessages, parseCardJson, salvageCards, errorKeyOf } from "../llm.js";

export function createAI({ store, renderer, toasts, onOpenSettings, doc = globalThis.document }) {
  const isEnabled = () => store.getSettings().llm.enabled;
  const hasKey = () => Boolean(store.getApiKey());

  function makeClient() {
    const settings = store.getSettings();
    return createClient({
      baseUrl: settings.llm.baseUrl,
      apiKey: store.getApiKey(),
      model: settings.llm.model,
      temperature: settings.llm.temperature,
    });
  }

  function errorText(err) {
    const key = errorKeyOf(err);
    if (key === "ai.error.status") return t(key, { status: err?.detail?.status ?? "?" });
    if (key === "ai.error.unknown") return `${t(key)}：${String(err?.message || err)}`;
    return t(key);
  }

  function promptForKey() {
    toasts?.show(t("ai.noKey"), {
      actionLabel: t("ai.openSettings"),
      onAction: () => onOpenSettings?.(),
      durationMs: 8000,
    });
  }

  // ---- 解釋 --------------------------------------------------------------
  const streams = new Map();   // 卡片 id → AbortController

  async function explain(id) {
    const item = store.getItem(id);
    if (!item) return;
    if (!isEnabled()) {
      toasts?.show(t("ai.disabled"), { actionLabel: t("ai.openSettings"), onAction: () => onOpenSettings?.() });
      return;
    }
    if (!hasKey()) {
      promptForKey();
      return;
    }
    // 已經在跑了就當成「停止」
    if (streams.has(id)) {
      stopExplain(id);
      return;
    }

    const controller = new AbortController();
    streams.set(id, controller);
    renderer.setExplanation(id, { state: "streaming", text: "" });
    try {
      const raw = await makeClient().chatStream(buildExplainMessages({
        question: item.question,
        answer: item.answer,
        locale: getLocale(),
      }), {
        signal: controller.signal,
        onDelta: (_delta, full) => renderer.setExplanation(id, { state: "streaming", text: full }),
      });
      renderer.setExplanation(id, { state: "ready", text: raw.trim() });
    } catch (err) {
      if (err?.code === "aborted") {
        renderer.setExplanation(id, { state: "ready", text: t("ai.error.aborted") });
        return;
      }
      renderer.setExplanation(id, {
        state: "error",
        text: `${t("ai.explain.failed")}：${errorText(err)}`,
      });
    } finally {
      streams.delete(id);
    }
  }

  function stopExplain(id) {
    streams.get(id)?.abort();
  }

  // ---- 生成卡片 ----------------------------------------------------------
  const dialog = doc.createElement("dialog");
  dialog.className = "sheet";
  dialog.id = "aiDialog";
  dialog.innerHTML = `
    <div class="sheet-head">
      <h2 class="sheet-title" data-i18n="ai.generate.title"></h2>
      <button type="button" class="icon-button" data-action="close" data-i18n-aria-label="settings.close">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5"/></svg>
      </button>
    </div>
    <div class="sheet-body">
      <p class="hint" data-i18n="ai.generate.hint"></p>
      <label style="display:block;margin-top:var(--s-3)">
        <textarea class="field field-textarea" data-field="text"
                  data-i18n-placeholder="ai.generate.placeholder"></textarea>
      </label>
      <div class="row-between" style="margin-top:var(--s-3)">
        <label style="flex:0 0 auto">
          <span class="field-label" data-i18n="ai.generate.count"></span>
          <select class="field field-select" data-field="count">
            <option value="3">3</option>
            <option value="5" selected>5</option>
            <option value="8">8</option>
          </select>
        </label>
        <span class="ai-status" data-status></span>
      </div>
      <p class="hint" data-i18n="ai.generate.countHint"></p>
      <p class="hint" data-preview-label hidden></p>
      <div class="ai-list" data-preview></div>
    </div>
    <div class="sheet-foot" data-foot></div>`;
  doc.body.appendChild(dialog);

  const textarea = dialog.querySelector('[data-field="text"]');
  const countSelect = dialog.querySelector('[data-field="count"]');
  const status = dialog.querySelector("[data-status]");
  const previewList = dialog.querySelector("[data-preview]");
  const previewLabel = dialog.querySelector("[data-preview-label]");
  const foot = dialog.querySelector("[data-foot]");
  let cards = [];
  let state = "idle";
  let generateController = null;

  function setStatus(text, tone) {
    status.textContent = text || "";
    status.style.color = tone === "error" ? "var(--danger)" : "";
    status.classList.toggle("ai-status", true);
  }

  function selectedCount() {
    return previewList.querySelectorAll('input[type="checkbox"]:checked').length;
  }

  function renderFoot() {
    if (state === "loading") {
      foot.innerHTML = `
        <button type="button" class="btn btn-quiet" data-action="stop">${t("ai.stop")}</button>
        <button type="button" class="btn btn-primary" disabled>
          <span class="spinner" aria-hidden="true"></span>${t("ai.generating")}
        </button>`;
      return;
    }
    if (state === "preview") {
      foot.innerHTML = `
        <button type="button" class="btn btn-quiet" data-action="run">${t("ai.regenerate")}</button>
        <button type="button" class="btn btn-primary" data-action="add">${t("ai.generate.add", { n: selectedCount() })}</button>`;
      return;
    }
    foot.innerHTML = `
      <button type="button" class="btn btn-quiet" data-action="close">${t("ai.cancel")}</button>
      <button type="button" class="btn btn-primary" data-action="run">${t("ai.generate.run")}</button>`;
  }

  function renderPreview() {
    previewList.innerHTML = "";
    if (!cards.length) {
      previewLabel.hidden = true;
      return;
    }
    previewLabel.hidden = false;
    previewLabel.textContent = t("ai.generate.preview", { n: cards.length });
    cards.forEach((card, index) => {
      const row = doc.createElement("label");
      row.className = "ai-item";
      const box = doc.createElement("input");
      box.type = "checkbox";
      box.checked = true;
      box.dataset.index = String(index);
      box.addEventListener("change", () => {
        const add = foot.querySelector('[data-action="add"]');
        if (add) add.textContent = t("ai.generate.add", { n: selectedCount() });
      });
      const body = doc.createElement("div");
      const question = doc.createElement("div");
      question.className = "ai-item-q";
      question.textContent = card.question;
      const answer = doc.createElement("div");
      answer.className = "ai-item-a";
      answer.textContent = card.answer;
      body.append(question, answer);
      row.append(box, body);
      previewList.appendChild(row);
    });
  }

  function setState(next) {
    state = next;
    renderFoot();
  }

  async function run() {
    const text = textarea.value.trim();
    if (!text) {
      setStatus(t("ai.error.needText"), "error");
      return;
    }
    if (!hasKey()) {
      promptForKey();
      return;
    }

    const controller = new AbortController();
    generateController = controller;
    setStatus("");
    setState("loading");
    let received = "";
    try {
      received = await makeClient().chatStream(buildGenerateMessages({
        text,
        count: Number(countSelect.value) || 5,
        category: doc.getElementById("category")?.value,
        locale: getLocale(),
      }), {
        signal: controller.signal,
        onDelta: (_delta, full) => {
          received = full;
          // 邊收邊數：讓「有在跑」看得見，而不是一個轉圈等到底
          setStatus(t("ai.generatingCount", { n: (full.match(/"question"/g) || []).length }));
        },
      });
      cards = parseCardJson(received);
      renderPreview();
      setStatus("");
      setState("preview");
    } catch (err) {
      if (err?.code === "aborted") {
        // 中止不等於失敗：已經生成的那幾張盡量救回來
        cards = salvageCards(received);
        renderPreview();
        setStatus(cards.length ? t("ai.stoppedWith", { n: cards.length }) : t("ai.stopped"), cards.length ? "" : "error");
        setState(cards.length ? "preview" : "idle");
      } else {
        cards = [];
        renderPreview();
        setStatus(errorText(err), "error");
        setState("idle");
      }
    } finally {
      if (generateController === controller) generateController = null;
    }
  }

  function stopGenerate() {
    generateController?.abort();
  }

  function addSelected() {
    const picked = [...previewList.querySelectorAll('input[type="checkbox"]')]
      .filter((box) => box.checked)
      .map((box) => cards[Number(box.dataset.index)])
      .filter(Boolean);
    if (!picked.length) {
      setStatus(t("ai.generate.none"), "error");
      return;
    }
    const category = doc.getElementById("category")?.value;
    store.addItems(picked.map((card) => ({ ...card, category })));
    toasts?.show(t("toast.added", { n: picked.length }));
    dialog.close();
  }

  dialog.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "close") dialog.close();
    else if (action === "stop") stopGenerate();
    else if (action === "run") run();
    else if (action === "add") addSelected();
  });

  dialog.addEventListener("close", () => {
    cards = [];
    previewList.innerHTML = "";
    previewLabel.hidden = true;
    setStatus("");
    setState("idle");
  });

  renderFoot();

  return {
    isEnabled,
    explain,
    stopExplain,
    openGenerate(prefill) {
      applyStatic(dialog);
      if (prefill && !textarea.value.trim()) textarea.value = prefill;
      setState("idle");
      setStatus("");
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      textarea.focus();
    },
    sync() {
      applyStatic(dialog);
      renderFoot();
      if (state === "preview") renderPreview();
    },
    element: dialog,
  };
}
