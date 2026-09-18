/**
 * 進入點：組裝 store / i18n / renderer / dialogs，並把事件接起來。
 * 單向資料流——任何模組改了 store，都經由 store.subscribe 統一重繪。
 */

import { createStore } from "./store.js";
import { t, setLocale, resolveLocale, applyStatic } from "./i18n.js";
import { createRenderer } from "./ui/render.js";
import { createToasts } from "./ui/toast.js";
import { createSettingsDialog } from "./ui/settings.js";
import { createAI } from "./ui/ai.js";
import { mountSwipe } from "./ui/swipe.js";
import { mountScrollFx } from "./ui/scrollfx.js";
import { enhanceAll } from "./ui/select.js";
import { mountSpecular } from "./motion.js";
import { mountLensCursor } from "./lens.js";

const doc = document;
const win = window;

const store = createStore();
const toasts = createToasts();

let ai = null;
const renderer = createRenderer({
  store,
  toasts,
  handlers: {
    aiEnabled: () => ai?.isEnabled() ?? false,
    onNeedQuestion: () => toasts.show(t("compose.needQuestion")),
  },
});

const settings = createSettingsDialog({ store, toasts });
ai = createAI({ store, renderer, toasts, onOpenSettings: () => settings.open() });

const nodes = {
  settingsButton: doc.getElementById("settingsButton"),
  themeButton: doc.getElementById("themeButton"),
  addButton: doc.getElementById("addButton"),
  aiGenerateButton: doc.getElementById("aiGenerateButton"),
  question: doc.getElementById("question"),
  search: doc.getElementById("searchKeyword"),
  filter: doc.getElementById("filterCategory"),
  sort: doc.getElementById("sortOrder"),
  manageList: doc.getElementById("manageList"),
};

// ---- 外觀 ----------------------------------------------------------------
const systemDark = win.matchMedia("(prefers-color-scheme: dark)");

function applyAppearance(mode) {
  const dark = mode === "dark" || (mode === "system" && systemDark.matches);
  doc.documentElement.classList.toggle("dark", dark);
  const meta = doc.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#05070d" : "#eef1f6");
}

function applyLocale() {
  setLocale(resolveLocale(store.getSettings().locale));
}

function syncUI() {
  applyLocale();
  applyAppearance(store.getSettings().appearance);
  applyStatic(doc);
  renderer.relabel();
  renderer.render();
  // 原生 select 的展開清單是作業系統畫的，與玻璃主題衝突；
  // 這一呼叫會把它們換成自己的下拉（原生 select 仍留在 DOM 裡當資料來源）。
  enhanceAll(doc);
  settings.sync();
  ai.sync();
  if (nodes.aiGenerateButton) nodes.aiGenerateButton.hidden = !store.getSettings().llm.enabled;
}

store.subscribe(() => syncUI());
systemDark.addEventListener?.("change", () => {
  if (store.getSettings().appearance === "system") applyAppearance("system");
});

// ---- 靜態控制項 -----------------------------------------------------------
nodes.settingsButton?.addEventListener("click", () => settings.open());
nodes.themeButton?.addEventListener("click", () => {
  const isDark = doc.documentElement.classList.contains("dark");
  store.updateSettings({ appearance: isDark ? "light" : "dark" });
});
nodes.addButton?.addEventListener("click", () => renderer.submitCompose());
nodes.aiGenerateButton?.addEventListener("click", () => {
  ai.openGenerate(nodes.question?.value.trim() || "");
});

[nodes.question].forEach((input) => {
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderer.submitCompose();
    }
  });
});

nodes.search?.addEventListener("input", () => renderer.renderManage());
nodes.filter?.addEventListener("change", () => renderer.renderManage());
nodes.sort?.addEventListener("change", () => renderer.renderManage());

// ---- 動態按鈕（事件委派）--------------------------------------------------
doc.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.closest("dialog")) return;   // 對話框內由各自模組處理
  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  if (action === "reveal") renderer.toggleReveal(id);
  else if (action === "rate") renderer.rate(id, Number(button.dataset.quality), button.dataset.tone);
  else if (action === "explain") ai.explain(id);
  else if (action === "stop-explain") ai.stopExplain(id);
  else if (action === "save") renderer.saveRow(id);
  else if (action === "delete") renderer.deleteWithUndo(id);
});

// 記下評分鈕被按下的位置，閃光就從那一點漫出來
doc.addEventListener("pointerdown", (event) => {
  const button = event.target.closest?.('[data-action="rate"][data-id]');
  if (!button || button.closest("dialog")) return;
  const card = button.closest(".task-card");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty("--fx", `${Math.round(event.clientX - rect.left)}px`);
  card.style.setProperty("--fy", `${Math.round(event.clientY - rect.top)}px`);
}, { passive: true });

// 滑動評分（手指驅動）與捲動連動（標題收縮 + 視差）
mountSwipe({ root: doc.body, onCommit: (info) => renderer.rateBySwipe(info) });
mountScrollFx({ doc, win });

// ---- 拖曳排序 -------------------------------------------------------------
let dragId = null;
nodes.manageList?.addEventListener("dragstart", (event) => {
  const row = event.target.closest(".row-card");
  if (!row || row.draggable === false) return;
  dragId = Number(row.dataset.id);
  row.classList.add("dragging");
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
});
nodes.manageList?.addEventListener("dragend", (event) => {
  event.target.closest(".row-card")?.classList.remove("dragging");
  dragId = null;
});
nodes.manageList?.addEventListener("dragover", (event) => event.preventDefault());
nodes.manageList?.addEventListener("drop", (event) => {
  event.preventDefault();
  const row = event.target.closest(".row-card");
  if (!row || dragId == null) return;
  store.reorder(dragId, Number(row.dataset.id));
});

// ---- 鍵盤快捷鍵 -----------------------------------------------------------
const RATING_KEYS = {
  1: ["danger", 1],
  2: ["warning", 3],
  3: ["neutral", 4],
  4: ["success", 5],
};

doc.addEventListener("keydown", (event) => {
  if (!store.getSettings().review.shortcuts) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const el = event.target;
  if (el?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName)) return;
  if (doc.querySelector("dialog[open]")) return;

  const id = renderer.firstDueId();
  if (id == null) return;

  if (event.key === " ") {
    event.preventDefault();
    renderer.toggleReveal(id);
    return;
  }
  const rating = RATING_KEYS[event.key];
  if (rating) {
    event.preventDefault();
    renderer.rate(id, rating[1], rating[0]);
  }
});

// ---- 啟動 -----------------------------------------------------------------
mountSpecular(doc);
mountLensCursor();
syncUI();

// index.html 用這個旗標判斷模組有沒有成功載入（用 file:// 開會被瀏覽器擋掉）
win.__SMART_REVIEW_BOOTED__ = true;
