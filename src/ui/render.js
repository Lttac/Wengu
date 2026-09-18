/**
 * 三個主區塊的渲染。只讀 store、只寫 DOM，不直接呼叫 LLM
 * （AI 動作由 handlers 傳進來，避免 UI 層互相依賴）。
 */

import { t, categoryLabel } from "../i18n.js";
import { isDue, summarize, QUALITY } from "../srs.js";
import { BUILTIN_SUBJECT_IDS } from "../store.js";
import { animateIn, animateOut, flashCard, motionOK } from "../motion.js";

const TONES = [
  { tone: "danger", quality: QUALITY.again, label: "rating.again" },
  { tone: "warning", quality: QUALITY.hard, label: "rating.hard" },
  { tone: "neutral", quality: QUALITY.good, label: "rating.good" },
  { tone: "success", quality: QUALITY.easy, label: "rating.easy" },
];

/** 評分的方向：兩端往兩側飛出去，中間兩個原地縮掉 */
const TONE_DIRECTION = { danger: -1, warning: 0, neutral: 0, success: 1 };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function truncate(text, max = 24) {
  const value = String(text ?? "");
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function shuffled(ids) {
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createRenderer({ store, toasts, handlers = {}, doc = globalThis.document }) {
  const byId = (id) => doc.getElementById(id);
  const nodes = {
    question: byId("question"),
    answer: byId("answer"),
    category: byId("category"),
    addButton: byId("addButton"),
    taskCount: byId("taskCount"),
    taskList: byId("taskList"),
    progress: byId("progress"),
    progressBar: byId("progressBar"),
    progressTrack: doc.querySelector(".progress"),
    manageList: byId("manageList"),
    search: byId("searchKeyword"),
    filter: byId("filterCategory"),
    sort: byId("sortOrder"),
    categoryStats: byId("categoryStats"),
  };

  const seenTasks = new Set();
  const seenRows = new Set();
  const revealed = new Set();
  const explanations = new Map();
  let shuffledIds = null;
  let shuffleKey = "";

  // ---- 科目：內建六個（標籤跟著語系走）＋ 使用者自訂 ---------------------
  const subjectLabel = (id) => store.getSubjects().find((s) => s.id === id)?.name ?? categoryLabel(id);

  const subjectOptions = () => [
    ...BUILTIN_SUBJECT_IDS.map((id) => ({ id, label: categoryLabel(id) })),
    ...store.getSubjects().map((s) => ({ id: s.id, label: s.name })),
  ];

  function fillCategoryOptions() {
    if (!nodes.category || !nodes.filter) return;
    const options = subjectOptions();
    const ids = options.map((o) => o.id);
    const composeValue = nodes.category.value;
    const filterValue = nodes.filter.value || "全部";
    const asOptions = (list) => list
      .map((o) => `<option value="${escapeHtml(o.id)}">${escapeHtml(o.label)}</option>`)
      .join("");
    nodes.category.innerHTML = asOptions(options);
    nodes.filter.innerHTML = [`<option value="全部">${escapeHtml(t("manage.filter.all"))}</option>`]
      .concat(asOptions(options));
    // 重建選項後把先前的選擇還原；科目被刪掉就退回第一個
    nodes.category.value = ids.includes(composeValue) ? composeValue : ids[0];
    nodes.filter.value = (filterValue === "全部" || ids.includes(filterValue)) ? filterValue : "全部";
  }

  function dueItems(now = new Date()) {
    const list = store.getItems().filter((item) => isDue(item, now));
    list.sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
    if (!store.getSettings().review.shuffle) return list;

    const key = list.map((i) => i.id).join(",");
    if (key !== shuffleKey) {
      shuffleKey = key;
      shuffledIds = shuffled(list.map((i) => i.id));
    }
    const map = new Map(list.map((i) => [i.id, i]));
    return shuffledIds.map((id) => map.get(id)).filter(Boolean);
  }

  function renderExplanation(id, explanation) {
    if (explanation.state === "loading") {
      return `<div class="ai-status" data-explanation-for="${id}">`
        + `<span class="spinner" aria-hidden="true"></span>${escapeHtml(t("ai.explain.loading"))}</div>`;
    }
    const tone = explanation.state === "error" ? ' data-tone="warning"' : "";
    const streaming = explanation.state === "streaming";
    return `<div class="ai-explain" data-explanation-for="${id}" data-state="${explanation.state}">`
      + `<p class="callout"${tone}><span class="callout-text">${escapeHtml(explanation.text)}</span>`
      + (streaming ? '<span class="stream-caret" aria-hidden="true"></span>' : "")
      + "</p>"
      + (streaming
        ? `<button type="button" class="btn btn-quiet btn-inline" data-action="stop-explain"`
          + ` data-id="${id}">${escapeHtml(t("ai.stop"))}</button>`
        : "")
      + "</div>";
  }

  // ---- 今日任務 ----------------------------------------------------------
  function renderToday() {
    if (!nodes.taskList) return;
    const items = store.getItems();
    const stats = summarize(items);
    const due = dueItems();

    nodes.taskCount.textContent = t("today.count", { n: stats.due });
    nodes.progress.textContent = t("today.progress", { done: stats.scheduled, total: stats.total });
    const pct = Math.round(stats.progress * 100);
    nodes.progressBar.style.width = `${pct}%`;
    nodes.progressTrack?.setAttribute("aria-valuenow", String(pct));

    nodes.taskList.innerHTML = "";

    if (!items.length) {
      nodes.taskList.innerHTML = `<p class="empty">${escapeHtml(t("today.empty"))}</p>`;
      return;
    }

    if (!due.length) {
      nodes.taskList.innerHTML = '<p class="empty" data-tone="done">'
        + '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6.5 9.6 17 4 11.4"/></svg>'
        + `${escapeHtml(t("today.done"))}</p>`;
      return;
    }

    const showMeta = store.getSettings().review.showMeta;
    const aiEnabled = handlers.aiEnabled?.() ?? false;

    due.forEach((item, index) => {
      const card = doc.createElement("article");
      card.className = "task-card";
      card.id = `task-card-${item.id}`;
      card.dataset.id = String(item.id);
      const slot = doc.createElement("div");
      slot.className = "task-slot";

      const isRevealed = revealed.has(item.id);
      const explanation = explanations.get(item.id);
      const meta = showMeta
        ? `<span class="meta">${escapeHtml(t("today.meta", { interval: item.interval, ease: item.easeFactor.toFixed(2) }))}</span>`
        : "";
      const rateButtons = TONES.map(({ tone, quality, label }) => '<button type="button" class="btn btn-tint"'
        + ` data-tone="${tone}" data-action="rate" data-id="${item.id}" data-quality="${quality}">`
        + `${escapeHtml(t(label))}</button>`).join("");

      card.innerHTML = '<div class="row-head">'
        + `<span class="chip">${escapeHtml(subjectLabel(item.category))}</span>${meta}</div>`
        + `<p class="task-question">${escapeHtml(item.question)}</p>`
        + '<div class="answer-collapse">'
        + `<p class="task-answer${isRevealed ? " is-revealed" : ""}" data-answer-for="${item.id}">${escapeHtml(item.answer)}</p>`
        + "</div>"
        + '<div class="btn-row">'
        + `<button type="button" class="btn btn-quiet" data-action="reveal" data-id="${item.id}">`
        + `${escapeHtml(isRevealed ? t("today.hide") : t("today.reveal"))}</button>`
        + (aiEnabled ? `<button type="button" class="btn btn-quiet" data-action="explain" data-id="${item.id}">`
          + `${escapeHtml(t("ai.explain"))}</button>` : "")
        + "</div>"
        + `<div class="btn-row btn-row-rate">${rateButtons}</div>`
        + (explanation ? renderExplanation(item.id, explanation) : "");

      slot.innerHTML = `<span class="swipe-hint" data-dir="left" aria-hidden="true">${escapeHtml(t("rating.again"))}</span>`
        + `<span class="swipe-hint" data-dir="right" aria-hidden="true">${escapeHtml(t("rating.easy"))}</span>`;
      slot.prepend(card);
      nodes.taskList.appendChild(slot);
      if (!seenTasks.has(item.id)) {
        seenTasks.add(item.id);
        animateIn(card, Math.min(index, 6) * 45);
      }
    });
  }

  /** 就地更新解釋區塊，避免為了顯示一段文字而整份重繪 */
  function setExplanation(id, explanation) {
    explanations.set(id, explanation);
    const card = byId(`task-card-${id}`);
    if (!card) return;
    const existing = card.querySelector(`[data-explanation-for="${id}"]`);
    // 串流時每個 token 都重建 DOM 會卡頓；狀態沒變就只換文字
    if (existing && explanation.state === "streaming" && existing.dataset.state === "streaming") {
      const textEl = existing.querySelector(".callout-text");
      if (textEl) {
        textEl.textContent = explanation.text;
        return;
      }
    }
    const holder = doc.createElement("div");
    holder.innerHTML = renderExplanation(id, explanation);
    const next = holder.firstElementChild;
    if (existing) existing.replaceWith(next);
    else card.appendChild(next);
  }

  // ---- 管理列表 ----------------------------------------------------------
  function renderStats() {
    if (!nodes.categoryStats) return;
    const items = store.getItems();
    const stats = subjectOptions()
      .map((o) => `${o.label} ${items.filter((i) => i.category === o.id).length}`)
      .join(" · ");
    nodes.categoryStats.textContent = t("manage.stats", { stats });
  }

  function renderManage() {
    if (!nodes.manageList) return;
    const filter = nodes.filter.value || "全部";
    const keyword = (nodes.search.value || "").trim().toLowerCase();
    const order = nodes.sort.value || "added";

    let list = store.getItems().filter((item) => {
      if (filter !== "全部" && item.category !== filter) return false;
      if (!keyword) return true;
      return item.question.toLowerCase().includes(keyword)
        || item.answer.toLowerCase().includes(keyword);
    });
    // "added" 保留陣列本身的順序（新增時插在最前，所以就是「新的在上」）。
    // 不重新排序，拖曳的結果才留得住。
    if (order !== "added") {
      list = list.slice().sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
    }

    nodes.manageList.innerHTML = "";
    if (!list.length) {
      nodes.manageList.innerHTML = `<p class="empty">${escapeHtml(t("manage.empty"))}</p>`;
      renderStats();
      return;
    }

    list.forEach((item, index) => {
      const row = doc.createElement("article");
      row.className = "row-card";
      row.id = `row-card-${item.id}`;
      row.dataset.id = String(item.id);
      row.draggable = order === "added";   // 依下次複習時間排序時，手動順序沒有意義
      row.innerHTML = '<div class="row-head">'
        + `<span class="chip">${escapeHtml(subjectLabel(item.category))}</span>`
        + '<span class="drag-handle" aria-hidden="true">'
        + '<svg class="icon" viewBox="0 0 24 24"><path d="M8.5 7h7M8.5 12h7M8.5 17h7"/></svg></span></div>'
        + `<input class="field" type="text" data-field="question" value="${escapeHtml(item.question)}"`
        + ` aria-label="${escapeHtml(t("compose.question"))}"/>`
        + `<input class="field" type="text" data-field="answer" value="${escapeHtml(item.answer)}"`
        + ` aria-label="${escapeHtml(t("compose.answer"))}"/>`
        + `<select class="field field-select" data-field="category" aria-label="${escapeHtml(t("compose.category"))}">`
        + subjectOptions().map((o) => `<option value="${escapeHtml(o.id)}"${o.id === item.category ? " selected" : ""}>`
          + `${escapeHtml(o.label)}</option>`).join("")
        + "</select>"
        + '<div class="btn-row">'
        + `<button type="button" class="btn btn-tint" data-tone="blue" data-action="save" data-id="${item.id}">`
        + `${escapeHtml(t("manage.save"))}</button>`
        + `<button type="button" class="btn btn-tint" data-tone="danger" data-action="delete" data-id="${item.id}">`
        + `${escapeHtml(t("manage.delete"))}</button>`
        + "</div>";

      nodes.manageList.appendChild(row);
      if (!seenRows.has(item.id)) {
        seenRows.add(item.id);
        animateIn(row, Math.min(index, 8) * 30, 240);
      }
    });

    renderStats();
  }

  // ---- 動作 --------------------------------------------------------------
  function toggleReveal(id) {
    const answer = doc.querySelector(`[data-answer-for="${id}"]`);
    const button = doc.querySelector(`[data-action="reveal"][data-id="${id}"]`);
    const next = !revealed.has(id);
    if (next) revealed.add(id);
    else revealed.delete(id);
    answer?.classList.toggle("is-revealed", next);
    if (button) button.textContent = next ? t("today.hide") : t("today.reveal");
    return next;
  }

  function rate(id, quality, tone, { direction, from = 0 } = {}) {
    const card = byId(`task-card-${id}`);
    const dir = direction ?? TONE_DIRECTION[tone] ?? 0;
    const commit = () => {
      revealed.delete(id);
      store.gradeItem(id, quality);
    };
    if (!card || !motionOK()) {
      commit();
      return;
    }
    flashCard(card, tone);
    animateOut(card, { direction: dir, from }).then(commit);
  }

  /**
   * 手勢評分。方向由手指決定：左 = 不會，右 = 簡單。
   * 手勢比點按容易誤判，所以完成後給一次撤銷——把評分前的排程原樣寫回去。
   */
  function rateBySwipe({ id, direction, card, dx = 0 }) {
    const snapshot = store.getItem(id);
    if (!snapshot) return;
    const tone = direction < 0 ? "danger" : "success";
    const quality = direction < 0 ? QUALITY.again : QUALITY.easy;
    const labelKey = direction < 0 ? "rating.again" : "rating.easy";

    const commit = () => {
      revealed.delete(id);
      store.gradeItem(id, quality);
    };

    if (!card || !motionOK()) {
      commit();
      return;
    }
    flashCard(card, tone);
    animateOut(card, { direction, from: dx }).then(() => {
      commit();
      toasts?.show(t("toast.rated", { label: t(labelKey) }), {
        actionLabel: t("toast.undo"),
        onAction: () => store.updateItem(id, snapshot),
      });
    });
  }

  function firstDueId() {
    const due = dueItems();
    return due.length ? due[0].id : null;
  }

  function submitCompose() {
    const question = (nodes.question.value || "").trim();
    if (!question) {
      handlers.onNeedQuestion?.();
      nodes.question.focus();
      return null;
    }
    const item = store.addItem({
      question,
      answer: nodes.answer.value,
      category: nodes.category.value,
    });
    nodes.question.value = "";
    nodes.answer.value = "";
    nodes.question.focus();
    return item;
  }

  function relabel() {
    const sortValue = nodes.sort.value;
    nodes.search.placeholder = t("manage.search");
    nodes.search.setAttribute("aria-label", t("manage.search"));
    nodes.sort.innerHTML = [
      `<option value="added">${escapeHtml(t("manage.sort.added"))}</option>`,
      `<option value="nextReview">${escapeHtml(t("manage.sort.nextReview"))}</option>`,
    ].join("");
    nodes.sort.value = sortValue;
    fillCategoryOptions();
  }

  function render() {
    fillCategoryOptions();
    renderToday();
    renderManage();
  }

  return {
    render,
    relabel,
    renderToday,
    renderManage,
    toggleReveal,
    rate,
    rateBySwipe,
    firstDueId,
    submitCompose,
    setExplanation,
    saveRow(id) {
      const row = byId(`row-card-${id}`);
      if (!row) return;
      const value = (name) => row.querySelector(`[data-field="${name}"]`)?.value ?? "";
      store.updateItem(id, {
        question: value("question").trim(),
        answer: value("answer").trim(),
        category: value("category"),
      });
    },
    deleteWithUndo(id) {
      const row = byId(`row-card-${id}`);
      const item = store.getItem(id);
      if (!item) return;
      const commit = () => {
        const removed = store.removeItem(id);
        if (!removed) return;
        toasts?.show(t("toast.deleted", { name: truncate(item.question) }), {
          actionLabel: t("toast.undo"),
          onAction: () => store.restoreItem(removed.item, removed.index),
        });
      };
      if (!row || !motionOK()) {
        commit();
        return;
      }
      animateOut(row).then(commit);
    },
    clearSeen() {
      seenTasks.clear();
      seenRows.clear();
    },
  };
}
