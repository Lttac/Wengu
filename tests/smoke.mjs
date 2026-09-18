/**
 * 冒煙測試：先驗純邏輯（srs / i18n / llm / store），再把整個 app 掛進 jsdom 走一遍流程。
 *
 * jsdom 不執行 <script type="module">，所以這裡不用「開網頁」的方式測，
 * 而是先裝好 DOM 全域，再直接 import 模組——測到的就是瀏覽器跑的同一份程式碼。
 *
 *   node tests/smoke.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const results = [];
const problems = [];

function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  if (!ok) problems.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

function eq(name, actual, expected) {
  check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ---- 環境：把 jsdom 的 DOM 裝成全域，模組才能直接 import -----------------
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const dom = new JSDOM(html, { url: "https://review.test/", pretendToBeVisual: true });
const { window } = dom;

const media = { fine: false, reduced: false, dark: false };
window.matchMedia = (query) => ({
  matches: query.includes("pointer: fine") ? media.fine
    : query.includes("prefers-reduced-motion") ? media.reduced
      : query.includes("prefers-color-scheme") ? media.dark : false,
  media: query,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});

for (const key of ["window", "document", "localStorage", "sessionStorage", "Element", "Blob",
  "getComputedStyle", "MutationObserver", "Event", "DOMException"]) {
  Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true });
}
globalThis.matchMedia = window.matchMedia;
globalThis.requestAnimationFrame = (fn) => window.setTimeout(() => fn(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id);
window.confirm = () => true;

// jsdom 沒有 Element.animate，而這正是唯一會在真瀏覽器上炸掉的地方——
// 所以這裡補一個「跟 Chromium 一樣挑」的替身：duration / delay 必須是非負數字，
// 傳字串就丟錯。動效層只要傳錯型別，測試就會紅，不必等開瀏覽器才發現。
const animationCalls = [];
window.Element.prototype.animate = function animate(keyframes, options = {}) {
  const check = (name, value) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`${name} must be non-negative or auto`);
    }
  };
  check("duration", options.duration);
  if (options.delay !== undefined) check("delay", options.delay);
  if (options.easing !== undefined && typeof options.easing !== "string") {
    throw new TypeError("easing must be a string");
  }
  animationCalls.push({ keyframes, options });
  return {
    finished: Promise.resolve(),
    cancel() {},
    get playState() { return "finished"; },
  };
};

// jsdom 也沒有 pointer capture。而 capture 的釋放是很會丟錯的一步
// （id 不對就 NotFoundError），偏偏那個錯誤會讓整個 pointerup 處理器中止，
// 卡片就留在拖到一半的位置——所以這裡照 Chromium 的規則補一個會挑錯的替身。
const capturedPointers = new WeakMap();
window.Element.prototype.setPointerCapture = function setPointerCapture(pointerId) {
  if (pointerId === undefined || pointerId === null) {
    throw new TypeError("Failed to execute 'setPointerCapture': 1 argument required");
  }
  capturedPointers.set(this, pointerId);
};
window.Element.prototype.releasePointerCapture = function releasePointerCapture(pointerId) {
  if (capturedPointers.get(this) !== pointerId) {
    throw new window.DOMException(`No active pointer with id ${pointerId}`, "NotFoundError");
  }
  capturedPointers.delete(this);
};
window.Element.prototype.hasPointerCapture = function hasPointerCapture(pointerId) {
  return capturedPointers.get(this) === pointerId;
};

// ---- srs ------------------------------------------------------------------
{
  const { createItem, schedule, isDue, summarize, normalizeItem, nextId } = await import("../src/srs.js");
  const now = new Date("2026-01-01T00:00:00Z");
  const card = createItem({ question: "  Q  ", answer: " A ", category: "數學", now });
  eq("createItem 去空白", card.question, "Q");
  eq("createItem 初始間隔", card.interval, 0);

  const first = schedule(card, 4, now);
  eq("第一次一般 → 間隔 1 天", first.interval, 1);
  eq("第一次一般 → repetition 1", first.repetition, 1);
  const second = schedule(first, 4, now);
  eq("第二次一般 → 間隔 6 天", second.interval, 6);
  const third = schedule(second, 4, now);
  eq("第三次一般 → 6 × 2.5", third.interval, 15);

  const forgot = schedule(third, 1, now);
  eq("忘記 → 重來", forgot.repetition, 0);
  eq("忘記 → 間隔回到 1", forgot.interval, 1);
  eq("忘記 → lapse +1", forgot.lapses, third.lapses + 1);

  let low = { ...card, easeFactor: 1.3 };
  for (let i = 0; i < 5; i += 1) low = schedule(low, 1, now);
  eq("難度係數地板 1.3", low.easeFactor, 1.3);

  const future = new Date(now.getTime() + 86400000 * 3).toISOString();
  check("isDue 判斷到期", isDue({ nextReview: now.toISOString() }, now) && !isDue({ nextReview: future }, now));

  const stats = summarize([card, first], now);
  eq("summarize 總數", stats.total, 2);
  eq("summarize 到期數", stats.due, 1);
  eq("summarize 進度", Math.round(stats.progress * 100), 50);

  const weird = normalizeItem({ question: "x", easeFactor: -5, interval: "3" });
  eq("normalizeItem 修掉非法難度", weird.easeFactor, 1.3);
  eq("normalizeItem 轉數字", weird.interval, 3);
  check("nextId 遞增", nextId() < nextId());
}

// ---- i18n -----------------------------------------------------------------
{
  const { t, setLocale, resolveLocale, categoryLabel, applyStatic, LOCALES } = await import("../src/i18n.js");
  eq("auto + zh-TW → 繁體", resolveLocale("auto", ["zh-TW"]), "zh-Hant");
  eq("auto + zh-CN → 簡體", resolveLocale("auto", ["zh-CN"]), "zh-Hans");
  eq("auto + en-US → 英文", resolveLocale("auto", ["en-US"]), "en");
  eq("auto + 未知語言 → 回退繁體", resolveLocale("auto", ["fr-FR"]), "zh-Hant");
  eq("明確指定優先", resolveLocale("en", ["zh-TW"]), "en");

  setLocale("en");
  eq("英文標題", t("app.title"), "Wengu");
  eq("變數插值", t("today.count", { n: 3 }), "3 due");
  eq("未知 key 原樣回傳", t("no.such.key"), "no.such.key");
  eq("英文分類標籤", categoryLabel("數學"), "Math");
  setLocale("zh-Hans");
  eq("簡體分類標籤", categoryLabel("數學"), "数学");
  setLocale("en");

  // 三個語系的 key 必須完全一致，否則切換語系會出現半英半中
  const dicts = await import("../src/i18n.js");
  const keysOf = (locale) => {
    setLocale(locale);
    const keys = [];
    const probe = ["app.title", "today.count", "settings.title", "ai.generate", "toast.undo",
      "rating.again", "manage.stats", "settings.about.privacy", "ai.error.network", "compose.add"];
    for (const key of probe) {
      setLocale(locale);
      keys.push(dicts.hasKey(key));
    }
    return keys;
  };
  check("三個語系都具備關鍵字串",
    LOCALES.every((l) => keysOf(l.id).every(Boolean)),
    JSON.stringify(LOCALES.map((l) => [l.id, keysOf(l.id)])));

  setLocale("zh-Hant");
  applyStatic(globalThis.document);
  eq("applyStatic 寫入 DOM", globalThis.document.querySelector('[data-i18n="app.title"]').textContent, "溫故");
  eq("applyStatic 設定 lang", globalThis.document.documentElement.lang, "zh-Hant");
}

// ---- llm ------------------------------------------------------------------
{
  const { parseCardJson, buildGenerateMessages, buildExplainMessages, createClient, LlmError } =
    await import("../src/llm.js");

  eq("解析標準物件", parseCardJson('{"cards":[{"question":"q1","answer":"a1"}]}')[0].question, "q1");
  eq("解析陣列", parseCardJson('[{"question":"q2","answer":"a2"}]')[0].answer, "a2");
  eq("解析單張", parseCardJson('{"question":"q3","answer":"a3"}')[0].question, "q3");
  eq("拆掉 markdown 圍欄",
    parseCardJson('```json\n{"cards":[{"question":"q4","answer":"a4"}]}\n```')[0].question, "q4");
  eq("忽略前後廢話",
    parseCardJson('Sure! Here you go:\n[{"question":"q5","answer":"a5"}]\nHope that helps.')[0].question, "q5");
  eq("接受 q/a 簡寫", parseCardJson('{"cards":[{"q":"q6","a":"a6"}]}')[0].answer, "a6");
  check("丟掉沒有題目的項目", parseCardJson('{"cards":[{"answer":"orphan"},{"question":"q7","answer":"a7"}]}').length === 1);

  let threw = null;
  try { parseCardJson("no json at all"); } catch (err) { threw = err; }
  check("無法解析時丟 LlmError", threw instanceof LlmError && threw.code === "protocol", String(threw));

  const gen = buildGenerateMessages({ text: "光合作用", count: 6, locale: "en" });
  check("生成提示詞帶上數量", gen[1].content.includes("Create 6 flashcards"));
  check("生成提示詞指定語言", gen[0].content.includes("English"));
  check("生成提示詞要求 JSON", gen[0].content.includes("JSON"));
  check("解釋提示詞帶入題目", buildExplainMessages({ question: "Q?", answer: "A" })[1].content.includes("Q?"));

  const calls = [];
  const stubFetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"cards":[{"question":"x","answer":"y"}]}' } }] }),
      text: async () => "",
    };
  };
  const client = createClient({
    baseUrl: "https://api.example.com/v1/",
    apiKey: "sk-test",
    model: "test-model",
    fetchImpl: stubFetch,
  });
  const content = await client.chat([{ role: "user", content: "hi" }]);
  eq("端點拼接正確", calls[0].url, "https://api.example.com/v1/chat/completions");
  eq("帶上 Authorization", calls[0].options.headers.Authorization, "Bearer sk-test");
  eq("body 帶上 model", JSON.parse(calls[0].options.body).model, "test-model");
  check("回傳模型內容", content.includes("cards"));

  const failing = createClient({
    baseUrl: "https://api.example.com/v1",
    apiKey: "sk",
    model: "m",
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => "unauthorized" }),
  });
  let statusErr = null;
  try { await failing.chat([{ role: "user", content: "x" }]); } catch (err) { statusErr = err; }
  check("HTTP 錯誤轉成 LlmError(status)",
    statusErr instanceof LlmError && statusErr.code === "status" && statusErr.detail.status === 401);

  const offline = createClient({
    baseUrl: "https://api.example.com/v1",
    apiKey: "sk",
    model: "m",
    fetchImpl: async () => { throw new TypeError("Failed to fetch"); },
  });
  let netErr = null;
  try { await offline.chat([{ role: "user", content: "x" }]); } catch (err) { netErr = err; }
  check("網路/CORS 失敗轉成 LlmError(network)", netErr instanceof LlmError && netErr.code === "network");

  const noKey = createClient({ baseUrl: "https://x/v1", apiKey: "", model: "m", fetchImpl: stubFetch });
  let keyErr = null;
  try { await noKey.chat([{ role: "user", content: "x" }]); } catch (err) { keyErr = err; }
  check("缺金鑰時不發出請求", keyErr instanceof LlmError && keyErr.code === "no-key");
}

// ---- store ----------------------------------------------------------------
{
  const { createStore, ITEMS_KEY, API_KEY_KEY, API_KEY_SESSION_KEY, LEGACY_ITEMS_KEY } =
    await import("../src/store.js");

  window.localStorage.clear();
  window.sessionStorage.clear();
  const store = createStore({ local: window.localStorage, session: window.sessionStorage });

  check("預設外觀跟隨系統", store.getSettings().appearance === "system");
  const added = store.addItem({ question: "第一題", answer: "答案", category: "數學" });
  eq("新增後數量", store.getItems().length, 1);
  eq("新卡片排在最前", store.getItems()[0].id, added.id);
  check("寫進 localStorage", JSON.parse(window.localStorage.getItem(ITEMS_KEY)).length === 1);

  store.updateItem(added.id, { question: "改過的題目" });
  eq("更新卡片", store.getItem(added.id).question, "改過的題目");

  store.gradeItem(added.id, 5);
  eq("評分寫回", store.getItem(added.id).repetition, 1);
  eq("評分累計次數", store.getItem(added.id).reviews, 1);

  const second = store.addItem({ question: "第二題", category: "英語" });
  check("拖曳排序", store.reorder(added.id, second.id) && store.getItems()[0].id === added.id);

  // 匯出絕不能夾帶金鑰
  store.updateSettings({ llm: { keyStorage: "local" } });
  store.setApiKey("sk-secret-value");
  const dump = JSON.stringify(store.exportData());
  check("匯出不含 API 金鑰", !dump.includes("sk-secret-value"));
  check("匯出含卡片", JSON.parse(dump).items.length === 2);

  // 金鑰儲存方式
  eq("local 模式寫進 localStorage", window.localStorage.getItem(API_KEY_KEY), "sk-secret-value");
  store.updateSettings({ llm: { keyStorage: "session" } });
  store.setApiKey("sk-session");
  eq("session 模式寫進 sessionStorage", window.sessionStorage.getItem(API_KEY_SESSION_KEY), "sk-session");
  check("切換後清掉舊位置", window.localStorage.getItem(API_KEY_KEY) === null);
  store.updateSettings({ llm: { keyStorage: "memory" } });
  store.setApiKey("sk-memory");
  check("memory 模式不落地",
    window.localStorage.getItem(API_KEY_KEY) === null && window.sessionStorage.getItem(API_KEY_SESSION_KEY) === null);
  eq("memory 模式仍可讀回", store.getApiKey(), "sk-memory");

  // 匯入
  eq("匯入略過重複 id（回報 0 張新增）", store.importData({ items: [{ id: added.id, question: "重複" }] }, { mode: "merge" }), 0);
  eq("合併後仍為兩張", store.getItems().length, 2);
  eq("匯入新卡片回報 1",
    store.importData({ items: [{ id: 999, question: "外來卡片", answer: "a", category: "物理" }] }, { mode: "merge" }), 1);
  eq("新 id 會被加入", store.getItems().length, 3);
  eq("replace 回報全部",
    store.importData({ items: [{ id: 1000, question: "只有這張", category: "地理" }] }, { mode: "replace" }), 1);
  eq("replace 覆蓋", store.getItems().length, 1);
  let badImport = null;
  try { store.importData({ nope: true }); } catch (err) { badImport = err; }
  check("壞掉的匯入檔會被擋下", badImport?.message === "invalid-payload");

  // 刪除 + 撤銷
  const doomed = store.getItems()[0];
  const removed = store.removeItem(doomed.id);
  eq("刪除後清空", store.getItems().length, 0);
  store.restoreItem(removed.item, removed.index);
  eq("撤銷還原", store.getItems().length, 1);

  // reset
  store.setApiKey("sk-x");
  store.reset();
  eq("重置清空卡片", store.getItems().length, 0);
  eq("重置清空金鑰", store.getApiKey(), "");

  // 舊版資料遷移
  const fresh = window.localStorage;
  fresh.clear();
  fresh.setItem(LEGACY_ITEMS_KEY, JSON.stringify([
    { id: 1, question: "舊卡片", answer: "a", category: "語文", nextReview: "2020-01-01T00:00:00.000Z", easeFactor: 2.5 },
  ]));
  fresh.setItem("review_theme", "dark");
  const migrated = createStore({ local: fresh, session: window.sessionStorage });
  eq("v0 卡片被搬過來", migrated.getItems().length, 1);
  eq("v0 主題被搬過來", migrated.getSettings().appearance, "dark");
  check("遷移後補齊欄位", migrated.getItems()[0].lapses === 0 && migrated.getItems()[0].reviews === 0);

  // 更名遷移：還叫 smart-review 時存的 reminder.* 要自動搬過來，而且舊鍵不刪
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.localStorage.setItem("reminder.items.v1", JSON.stringify([
    { id: 42, question: "舊鍵名時期的卡片", answer: "a", category: "語文", nextReview: "2020-01-01T00:00:00.000Z", easeFactor: 2.5 },
  ]));
  window.localStorage.setItem("reminder.settings.v1", JSON.stringify({ appearance: "dark" }));
  window.localStorage.setItem("reminder.subjects.v1", JSON.stringify([{ id: "s-old", name: "生物" }]));
  window.sessionStorage.setItem("reminder.llm.key.session", "sk-old");
  const renamed = createStore({ local: window.localStorage, session: window.sessionStorage });
  eq("更名後卡片被搬過來", renamed.getItems().length, 1);
  eq("更名後設定被搬過來", renamed.getSettings().appearance, "dark");
  eq("更名後科目被搬過來", renamed.getSubjects().map((s) => s.name).join(","), "生物");
  eq("更名後金鑰被搬過來", renamed.getApiKey(), "sk-old");
  check("新鍵名有寫入", window.localStorage.getItem("wengu.items.v1") !== null);
  check("舊鍵名不刪除（萬一判斷錯還有救）", window.localStorage.getItem("reminder.items.v1") !== null);

  // localStorage 壞掉時要退回記憶體
  const brokenStorage = {
    getItem() { throw new Error("quota"); },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("quota"); },
  };
  const resilient = createStore({ local: brokenStorage, session: brokenStorage });
  resilient.addItem({ question: "斷網也能用", category: "語文" });
  eq("storage 失效仍可運作", resilient.getItems().length, 1);
}

// ---- renderer -------------------------------------------------------------
{
  const { createStore } = await import("../src/store.js");
  const { createRenderer } = await import("../src/ui/render.js");
  const { setLocale } = await import("../src/i18n.js");
  setLocale("zh-Hant");

  window.localStorage.clear();
  const store = createStore({ local: window.localStorage, session: window.sessionStorage });
  const toasts = [];
  const renderer = createRenderer({
    store,
    toasts: { show: (message, options) => toasts.push({ message, options }) },
    handlers: { aiEnabled: () => false },
  });
  // main.js 會訂閱 store 後重繪；這裡比照辦理，否則 DOM 會停在舊狀態
  store.subscribe(() => renderer.render());
  const q = (sel) => globalThis.document.querySelector(sel);
  const qa = (sel) => [...globalThis.document.querySelectorAll(sel)];

  renderer.render();
  check("空狀態：沒有卡片時顯示提示", q("#taskList .empty")?.textContent.includes("還沒有卡片"));

  const item = store.addItem({ question: "光合作用的產物？", answer: "葡萄糖與氧氣", category: "化學" });
  renderer.render();
  eq("今日任務出現一張卡", qa(".task-card").length, 1);
  eq("管理列表出現一列", qa(".row-card").length, 1);
  check("任務數文案", q("#taskCount").textContent.includes("1"));
  eq("進度條寬度", q("#progressBar").style.width, "0%");

  renderer.toggleReveal(item.id);
  check("揭示答案加上 class", q(`[data-answer-for="${item.id}"]`).classList.contains("is-revealed"));
  eq("按鈕文字切換", q(`[data-action="reveal"][data-id="${item.id}"]`).textContent, "隱藏答案");
  renderer.render();
  check("重新渲染後仍保持揭示", q(`[data-answer-for="${item.id}"]`).classList.contains("is-revealed"));
  renderer.toggleReveal(item.id);
  check("再按一次收回", !q(`[data-answer-for="${item.id}"]`).classList.contains("is-revealed"));

  // 進場動效必須傳數字時長。這裡的 animate 替身會依 Chromium 的規則擋下字串，
  // 所以「卡片有進場動畫，而且參數合法」是被真的驗過的，而不是被靜靜跳過。
  // 注意：動效只對首次出現的項目播放，所以要新增一張卡才測得到。
  const beforeAnimations = animationCalls.length;
  const animated = store.addItem({ question: "動效測試", category: "語文" });
  check("進場動效有實際執行", animationCalls.length > beforeAnimations,
    `animate 呼叫數 ${animationCalls.length}（之前 ${beforeAnimations}）`);
  const badCalls = animationCalls.filter((c) => typeof c.options.duration !== "number");
  check("所有 animate 呼叫都帶數字時長", badCalls.length === 0, JSON.stringify(badCalls.slice(0, 1)));
  store.removeItem(animated.id);

  // XSS：題目裡的標籤與引號都不得變成 DOM 或撐破屬性
  const nasty = store.addItem({ question: '<b>x</b>"quote"', answer: "<img src=x onerror=alert(1)>", category: "語文" });
  renderer.render();
  check("題目中的 HTML 被轉義", !q("#taskList").innerHTML.includes("<b>x</b>"));
  const nastyRow = q(`#row-card-${nasty.id}`);
  eq("含引號的內容完整寫入 input", nastyRow.querySelector('[data-field="question"]').value, '<b>x</b>"quote"');
  store.removeItem(nasty.id);

  // 搜尋
  globalThis.document.getElementById("searchKeyword").value = "葡萄糖";
  renderer.renderManage();
  eq("搜尋命中", qa(".row-card").length, 1);
  globalThis.document.getElementById("searchKeyword").value = "找不到";
  renderer.renderManage();
  eq("搜尋落空顯示空狀態", qa(".row-card").length, 0);
  globalThis.document.getElementById("searchKeyword").value = "";
  renderer.renderManage();

  // 儲存列
  q(`#row-card-${item.id} [data-field="question"]`).value = "改過的題目";
  renderer.saveRow(item.id);
  eq("列內編輯寫回", store.getItem(item.id).question, "改過的題目");

  // 刪除 + 撤銷
  renderer.deleteWithUndo(item.id);
  await sleep(20);
  eq("刪除後清空", store.getItems().length, 0);
  check("顯示可撤銷的吐司", toasts.length === 1 && Boolean(toasts[0].options?.onAction));
  toasts[0].options.onAction();
  eq("撤銷把卡片放回去", store.getItems().length, 1);

  // 評分會把卡片移出今日清單
  const target = store.getItems()[0];
  renderer.render();
  renderer.rate(target.id, 5, "success");
  await sleep(20);
  eq("評分後移出今日", qa(".task-card").length, 0);
  check("評分寫回間隔", store.getItem(target.id).interval === 1);
  check("完成後顯示打勾空狀態", q("#taskList .empty")?.textContent.includes("今天已全部完成"));
  eq("進度條滿格", q("#progressBar").style.width, "100%");
}

// ---- 自訂科目與主題化下拉 -------------------------------------------------
{
  const { createStore, SUBJECT_NAME_MAX } = await import("../src/store.js");
  const { enhanceSelect } = await import("../src/ui/select.js");
  const { createRenderer } = await import("../src/ui/render.js");
  const { setLocale } = await import("../src/i18n.js");
  setLocale("zh-Hant");
  const doc = globalThis.document;

  window.localStorage.clear();
  window.sessionStorage.clear();
  const store = createStore({ local: window.localStorage, session: window.sessionStorage });

  eq("預設沒有自訂科目", store.getSubjects().length, 0);
  const added = store.addSubject("  生物  ");
  check("新增科目會去空白", added.ok && added.subject.name === "生物", JSON.stringify(added));
  eq("重複名稱被擋下", store.addSubject("生物").reason, "duplicate");
  eq("與內建同名也被擋下", store.addSubject("語文").reason, "duplicate");
  eq("空名稱被擋下", store.addSubject("   ").reason, "empty");
  eq("過長名稱被擋下", store.addSubject("一".repeat(SUBJECT_NAME_MAX + 1)).reason, "too-long");
  eq("內建科目不能刪", store.removeSubject("語文").reason, "builtin");

  const item = store.addItem({ question: "用自訂科目", category: added.subject.id });
  const blocked = store.removeSubject(added.subject.id);
  check("還有卡片在用就不給刪",
    !blocked.ok && blocked.reason === "in-use" && blocked.count === 1, JSON.stringify(blocked));
  store.removeItem(item.id);
  check("沒卡片就能刪", store.removeSubject(added.subject.id).ok);
  eq("刪除後清單為空", store.getSubjects().length, 0);

  // 匯出／匯入必須帶上科目，否則換裝置就消失
  store.addSubject("生物");
  const dump = JSON.parse(JSON.stringify(store.exportData()));
  check("匯出檔含自訂科目",
    Array.isArray(dump.subjects) && dump.subjects[0]?.name === "生物", JSON.stringify(dump.subjects));
  eq("科目會持久化", createStore({ local: window.localStorage, session: window.sessionStorage })
    .getSubjects().length, 1);

  window.localStorage.clear();
  const target = createStore({ local: window.localStorage, session: window.sessionStorage });
  target.importData(dump, { mode: "merge" });
  eq("匯入後科目還在", target.getSubjects().map((s) => s.name).join(","), "生物");
  target.importData(dump, { mode: "merge" });
  eq("重複匯入不會長出第二個", target.getSubjects().length, 1);

  // --- 主題化下拉：換的是皮，不是行為 ---
  doc.body.insertAdjacentHTML("beforeend",
    '<select id="probeSelect" aria-label="測試"><option value="a">甲</option><option value="b">乙</option></select>');
  const native = doc.getElementById("probeSelect");
  native.value = "b";
  enhanceSelect(native);
  const wrap = native.closest(".select");
  const trigger = wrap.querySelector(".select-trigger");

  check("展開鈕顯示目前選項", trigger.querySelector(".select-value").textContent === "乙");
  check("原生 select 被藏起來但仍在 DOM", native.classList.contains("select-native") && native.isConnected);
  eq("自製清單選項數", wrap.querySelectorAll(".select-option").length, 2);
  eq("選中的那項標記 aria-selected",
    wrap.querySelector('[data-value="b"]').getAttribute("aria-selected"), "true");

  let changed = null;
  native.addEventListener("change", () => { changed = native.value; });
  trigger.click();
  check("點展開鈕會打開清單", !wrap.querySelector(".select-menu").hidden);
  wrap.querySelector('[data-value="a"]').click();
  eq("選了之後原生 value 跟著變", native.value, "a");
  eq("並對外送出 change 事件（商業邏輯不必改）", changed, "a");
  check("選完會關閉清單", wrap.querySelector(".select-menu").hidden);
  eq("展開鈕文字更新", trigger.querySelector(".select-value").textContent, "甲");

  // renderer 就是「改 innerHTML + 指定 value」，兩者都不會觸發 change
  native.innerHTML = '<option value="x">X</option><option value="y">Y</option>';
  native.value = "y";
  await sleep(10);
  eq("選項被重建後自製清單跟著更新", wrap.querySelectorAll(".select-option").length, 2);
  eq("並反映新的值", trigger.querySelector(".select-value").textContent, "Y");

  // 這一條守的是一個很難查的坑：`.select-menu { display: flex }` 的特異性
  // 高於 UA 的 `[hidden] { display: none }`，所以「收合」的選單其實一直開著，
  // 壓在下面的按鈕上（AI 欄位與 AI 生成按鈕也中過同一個坑）。
  const appCss = fs.readFileSync(path.join(ROOT, "src/styles/app.css"), "utf8");
  check("全域規則保證 hidden 真的隱藏",
    /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(appCss));
  // 另一個更隱蔽的坑：玻璃用 backdrop-filter，這會建立新的堆疊上下文，
  // 於是選單的 z-index 只在卡片內有效，後面的卡片整張蓋上來把它吃掉。
  check("展開中的下拉會把所屬卡片抬到兄弟之上",
    /\.glass-card:has\(\.select\[data-open="true"\]\)/.test(appCss)
    && /\.row-card:has\(\.select\[data-open="true"\]\)/.test(appCss));

  // --- renderer 端真的用得到自訂科目 ---
  window.localStorage.clear();
  const store2 = createStore({ local: window.localStorage, session: window.sessionStorage });
  const subject = store2.addSubject("生物").subject;
  const renderer2 = createRenderer({ store: store2, toasts: { show() {} }, handlers: { aiEnabled: () => false } });
  store2.subscribe(() => renderer2.render());
  renderer2.render();

  const values = [...doc.getElementById("category").options].map((o) => o.value);
  check("分類選單含自訂科目", values.includes(subject.id), values.join(","));
  doc.getElementById("category").value = subject.id;
  doc.getElementById("question").value = "細胞的能源工廠是？";
  renderer2.submitCompose();
  eq("可以建立自訂科目的卡片", store2.getItems()[0].category, subject.id);
  eq("卡片標籤顯示自訂名稱", doc.querySelector(".task-card .chip").textContent, "生物");
  check("分類統計含自訂科目", doc.getElementById("categoryStats").textContent.includes("生物 1"),
    doc.getElementById("categoryStats").textContent);
}

// ---- AI：串流、中止、錯誤對應 ---------------------------------------------
{
  const { createClient, salvageCards, errorKeyOf, LlmError, buildGenerateMessages } = await import("../src/llm.js");
  const { createStore } = await import("../src/store.js");
  const { createRenderer } = await import("../src/ui/render.js");
  const { createAI } = await import("../src/ui/ai.js");
  const { setLocale } = await import("../src/i18n.js");
  setLocale("zh-Hant");
  const doc = globalThis.document;

  const sse = (chunks, type = "text/event-stream") => new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  }), { headers: { "content-type": type } });

  const base = { baseUrl: "https://api.example.com/v1", apiKey: "sk", model: "m" };

  // 逐字回傳
  const seen = [];
  const streaming = createClient({
    ...base,
    fetchImpl: async () => sse([
      'data: {"choices":[{"delta":{"content":"光合"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"作用"}}]}\n\n',
      "data: [DONE]\n\n",
    ]),
  });
  const full = await streaming.chatStream([{ role: "user", content: "x" }], {
    onDelta: (_delta, text) => seen.push(text),
  });
  eq("串流回傳完整文字", full, "光合作用");
  eq("onDelta 逐次累積", seen.join("|"), "光合|光合作用");

  // 不支援串流的服務：直接回一整包 JSON，也要能用
  const plain = createClient({
    ...base,
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: "一次到位" } }] }),
      { headers: { "content-type": "application/json" } }),
  });
  eq("不支援串流的服務也能用", await plain.chatStream([{ role: "user", content: "x" }]), "一次到位");

  // 中止
  const abortController = new AbortController();
  const slow = createClient({
    ...base,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        reject(err);
      });
    }),
  });
  const pending = slow.chatStream([{ role: "user", content: "x" }], { signal: abortController.signal })
    .catch((err) => err);
  abortController.abort();
  const aborted = await pending;
  check("中止會轉成 LlmError(aborted)", aborted?.code === "aborted", String(aborted?.code));

  // 半截 JSON 救援：按停止時已經生成的那幾張不該白丟
  eq("能從半截 JSON 救回已完成的卡片",
    salvageCards('{"cards":[{"question":"q1","answer":"a1"},{"question":"q2","ans').length, 1);
  eq("救回的內容正確",
    salvageCards('{"cards":[{"question":"q1","answer":"a1"},{"q').at(0).question, "q1");
  eq("字串內的括號不會誤判",
    salvageCards('{"question":"a}b","answer":"c{d"}').at(0).answer, "c{d");
  eq("空字串回空陣列", salvageCards("").length, 0);

  // 錯誤對應到「能採取行動」的說明
  const statusKey = (status) => errorKeyOf(new LlmError("status", { status }));
  eq("401 → 金鑰問題", statusKey(401), "ai.error.auth");
  eq("403 → 金鑰問題", statusKey(403), "ai.error.auth");
  eq("404 → 找不到模型", statusKey(404), "ai.error.notFound");
  eq("429 → 額度問題", statusKey(429), "ai.error.rateLimit");
  eq("500 → 服務端問題", statusKey(500), "ai.error.server");
  eq("網路失敗", errorKeyOf(new LlmError("network")), "ai.error.network");

  // 「一次少一點」要靠提示詞真的擋住，不是靠使用者自己克制
  const gen = buildGenerateMessages({ text: "鈉與水反應", count: 5, locale: "zh-Hant" });
  const system = gen[0].content;
  check("提示詞要求一卡一 fact", /exactly one fact/.test(system));
  check("提示詞禁止把表格塞進一張卡", /Never put a table, a list/.test(system));
  check("提示詞要求把對比拆成多張", /one card per difference/.test(system));
  check("提示詞有張數上限", /Do not exceed 5 cards/.test(gen[1].content));
  check("提示詞明說少而準更好", /fewer, sharper cards is the better outcome/.test(gen[1].content));

  // 解釋要真的以串流寫進卡片
  window.localStorage.clear();
  window.sessionStorage.clear();
  const store = createStore({ local: window.localStorage, session: window.sessionStorage });
  store.updateSettings({ llm: { enabled: true, baseUrl: "https://api.example.com/v1", model: "m", keyStorage: "memory" } });
  store.setApiKey("sk-test");
  const item = store.addItem({ question: "蒸散作用主要發生在哪裡？", answer: "葉子的氣孔", category: "生物" });
  const renderer = createRenderer({ store, toasts: { show() {} }, handlers: { aiEnabled: () => true } });
  store.subscribe(() => renderer.render());
  renderer.render();

  const states = [];
  const originalSet = renderer.setExplanation.bind(renderer);
  renderer.setExplanation = (id, payload) => {
    states.push(payload.state);
    originalSet(id, payload);
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => sse([
    'data: {"choices":[{"delta":{"content":"氣孔是"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"葉片上的開口。"}}]}\n\n',
    "data: [DONE]\n\n",
  ]);
  const ai = createAI({ store, renderer, toasts: { show() {} }, onOpenSettings() {} });
  eq("生成數量預設 5 張", doc.querySelector("#aiDialog [data-field='count']")?.value, "5");
  await ai.explain(item.id);
  globalThis.fetch = originalFetch;

  const block = doc.querySelector(`[data-explanation-for="${item.id}"]`);
  check("解釋以串流寫進卡片", block?.textContent.includes("氣孔是葉片上的開口。"), block?.textContent);
  check("過程中有經過 streaming 狀態", states.includes("streaming") && states.at(-1) === "ready", states.join(","));
  eq("完成後移除游標", block?.querySelectorAll(".stream-caret").length, 0);
  eq("完成後移除停止鈕", block?.querySelectorAll('[data-action="stop-explain"]').length, 0);
}

// ---- 手勢與捲動連動 -------------------------------------------------------
{
  const { createStore } = await import("../src/store.js");
  const { createRenderer } = await import("../src/ui/render.js");
  const { mountSwipe, rubber, COMMIT_PX } = await import("../src/ui/swipe.js");
  const { mountScrollFx } = await import("../src/ui/scrollfx.js");
  const { setLocale } = await import("../src/i18n.js");
  setLocale("zh-Hant");

  const doc = globalThis.document;
  window.localStorage.clear();
  const store = createStore({ local: window.localStorage, session: window.sessionStorage });
  const toasts = [];
  const renderer = createRenderer({
    store,
    toasts: { show: (message, options) => toasts.push({ message, options }) },
    handlers: { aiEnabled: () => false },
    doc,
  });
  store.subscribe(() => renderer.render());

  mountSwipe({ root: doc.body, onCommit: (info) => renderer.rateBySwipe(info), doc });

  // 手勢必須佔用真實時間：速度是 px/ms，同步派發會算出無窮大，
  // 於是每一次拖拽都被判成甩動——測到的就不是程式邏輯了。
  const gesture = async (target, { from, to, id = 1, steps = 3, durationMs = 240 }) => {
    if (!target) throw new Error(`gesture 目標不存在（from ${from} to ${to}）`);
    const point = (x, y) => {
      const event = new window.MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y });
      Object.defineProperty(event, "pointerId", { value: id });
      Object.defineProperty(event, "pointerType", { value: "touch" });
      return event;
    };
    const down = new window.MouseEvent("pointerdown", { bubbles: true, clientX: from[0], clientY: from[1], button: 0 });
    Object.defineProperty(down, "pointerId", { value: id });
    Object.defineProperty(down, "pointerType", { value: "touch" });
    target.dispatchEvent(down);
    const stepMs = durationMs / (steps + 1);
    for (let i = 1; i <= steps; i += 1) {
      await sleep(stepMs);
      const t = i / steps;
      target.dispatchEvent(point(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t));
    }
    await sleep(stepMs);
    const up = new window.MouseEvent("pointerup", { bubbles: true, clientX: to[0], clientY: to[1] });
    Object.defineProperty(up, "pointerId", { value: id });
    target.dispatchEvent(up);
  };

  check("橡皮筋：界內線性、界外阻尼", rubber(100) === 100 && rubber(300) < 300 && rubber(300) > 150);

  // 1. 慢慢拖過門檻 → 應該評分
  const cardA = store.addItem({ question: "滑動評分", category: "語文" });
  renderer.render();
  const elA = doc.getElementById(`task-card-${cardA.id}`);
  check("任務卡帶得動（有 dataset.id）", elA?.dataset.id === String(cardA.id));

  await gesture(elA, { from: [300, 300], to: [300 - COMMIT_PX - 30, 302] });
  await sleep(160);
  // 「不會」在 SM-2 裡是把 repetition 歸零，所以要看 reviews 才對
  eq("滑動超過門檻 → 已評分", store.getItem(cardA.id)?.reviews, 1);
  eq("左滑記為「不會」", store.getItem(cardA.id)?.lapses, 1);
  check("滑動評分給了撤銷", toasts.length === 1 && Boolean(toasts[0].options?.onAction), toasts[0]?.message);

  toasts[0].options.onAction();
  await sleep(20);
  eq("撤銷把排程還原", store.getItem(cardA.id)?.reviews, 0);

  // 2. 拖不到門檻又慢 → 應該彈回，不評分
  renderer.render();
  const elA2 = doc.getElementById(`task-card-${cardA.id}`);
  const before = store.getItem(cardA.id).reviews;
  await gesture(elA2, { from: [300, 300], to: [330, 304] });
  await sleep(180);
  eq("未達門檻不評分", store.getItem(cardA.id).reviews, before);
  check("未達門檻時用彈簧彈回", animationCalls.some((c) => String(c.options.easing).startsWith("linear(")),
    String(animationCalls.at(-1)?.options.easing).slice(0, 24));
  // 回歸測試：「滑動後卡片卡住」就是收尾時丟錯、處理器中斷造成的。
  // 手勢結束後卡片不准留下任何行內 transform 或拖曳樣式。
  check("彈回後不留拖曳殘留", !elA2.style.transform && !elA2.style.getPropertyValue("--swipe"),
    `transform=${elA2.style.transform} swipe=${elA2.style.getPropertyValue("--swipe")}`);
  check("彈回後移除拖曳樣式", !elA2.classList.contains("swiping"));

  // 3. 垂直拖曳 → 讓給瀏覽器捲動，不該被當成滑動
  renderer.render();
  const elA3 = doc.getElementById(`task-card-${cardA.id}`);
  await gesture(elA3, { from: [300, 300], to: [306, 420] });
  await sleep(60);
  eq("垂直手勢不觸發評分", store.getItem(cardA.id).reviews, before);
  check("垂直手勢不留滑動樣式", !elA3.classList.contains("swiping"));

  // 4. 按鈕上的拖曳不當滑動（否則想按「困難」會誤觸）
  renderer.render();
  const rateButton = doc.querySelector(`#task-card-${cardA.id} [data-action="rate"][data-tone="warning"]`);
  await gesture(rateButton, { from: [300, 300], to: [140, 300], id: 2 });
  await sleep(60);
  eq("從按鈕起手的拖曳不評分", store.getItem(cardA.id).reviews, before);

  // 5. 右滑 → 應該是「簡單」，而且離場動畫往右飛
  const cardB = store.addItem({ question: "右滑", category: "英語" });
  renderer.render();
  const callsBefore = animationCalls.length;
  await gesture(doc.getElementById(`task-card-${cardB.id}`), { from: [120, 300], to: [120 + COMMIT_PX + 40, 296], id: 3 });
  await sleep(160);
  eq("右滑記為「簡單」", store.getItem(cardB.id)?.interval, 1);
  const exitCall = animationCalls.slice(callsBefore).find((c) => c.keyframes.length === 3);
  check("離場動畫往右飛出去", String(exitCall?.keyframes?.[2]?.transform).includes("translate3d("),
    String(exitCall?.keyframes?.[2]?.transform));

  // 6. 捲動連動：標題縮小、玻璃條淡入、壁紙視差
  mountScrollFx({ doc, win: window });
  window.scrollY = 40;
  window.dispatchEvent(new window.Event("scroll"));
  await sleep(40);
  const root = doc.documentElement;
  const scale = Number(root.style.getPropertyValue("--title-scale"));
  const glass = Number(root.style.getPropertyValue("--header-glass"));
  check("捲動後標題縮小", scale < 1 && scale > 0.7, `--title-scale=${scale}`);
  check("捲動後玻璃條淡入", glass > 0 && glass <= 1, `--header-glass=${glass}`);
  check("標題縮小寫在 transform 而非字級（不動版面）",
    /\.large-title \{[^}]*transform: scale\(var\(--title-scale/.test(fs.readFileSync(path.join(ROOT, "src/styles/app.css"), "utf8")));
  check("壁紙有視差係數", /--parallax:/.test(fs.readFileSync(path.join(ROOT, "src/styles/app.css"), "utf8")));
}

// ---- 整合：真的把 app 跑起來 ----------------------------------------------
{
  window.localStorage.clear();
  window.sessionStorage.clear();
  await import("../src/main.js");
  await sleep(10);

  const doc = globalThis.document;
  const q = (sel) => doc.querySelector(sel);

  check("掛上光標透鏡觸發點", Boolean(q('[data-cursor="blend"]')));
  check("精細指標關閉時不建立 canvas", !q(".lens-canvas"));

  q("#question").value = "整合測試題目";
  q("#answer").value = "整合測試答案";
  q("#addButton").click();
  await sleep(10);
  eq("點按新增後出現任務卡", doc.querySelectorAll(".task-card").length, 1);

  // 語言切換要走完整條鏈路：設定 → store → i18n → DOM
  q("#settingsButton").click();
  const settingsDialog = doc.getElementById("settingsDialog");
  check("設定面板開啟", settingsDialog.hasAttribute("open"));
  [...settingsDialog.querySelectorAll('[data-segment="locale"] button')]
    .find((b) => b.dataset.value === "en").click();
  await sleep(10);
  eq("切到英文後標題跟著換", q('[data-i18n="app.title"]').textContent, "Wengu");
  eq("html lang 更新", doc.documentElement.lang, "en");
  eq("切換語言後卡片按鈕也翻譯", doc.querySelector('.task-card [data-action="reveal"]').textContent, "Show answer");

  // 外觀切換
  q("#themeButton").click();
  await sleep(10);
  check("夜間模式生效", doc.documentElement.classList.contains("dark"));
  check("外觀寫進設定", JSON.parse(window.localStorage.getItem("wengu.settings.v1")).appearance === "dark");

  // AI 未啟用時不顯示生成按鈕
  check("未啟用 AI 時隱藏生成按鈕", doc.getElementById("aiGenerateButton").hidden);

  // 但設定裡的 AI 欄位不能跟著藏——藏起來會讓人以為整個功能被拿掉了
  const aiBody = doc.querySelector("[data-ai-body]");
  check("AI 欄位在未啟用時仍看得見", aiBody && !aiBody.hidden);

  const settingsDialog2 = doc.getElementById("settingsDialog");
  const aiToggle = settingsDialog2.querySelector('[data-switch="llm.enabled"]');
  aiToggle.click();
  await sleep(10);
  const warning = doc.querySelector("[data-ai-warning]");
  check("開啟 AI 但沒金鑰時會提示", warning && !warning.hidden);
  aiToggle.click();
  await sleep(10);
}

// ---- 結果 -----------------------------------------------------------------
const passed = results.filter((r) => r.ok).length;
for (const item of results) {
  if (!item.ok) console.log(`FAIL  ${item.name}${item.detail ? `  → ${item.detail}` : ""}`);
}
console.log(`\n${passed}/${results.length} 通過`);
if (problems.length) {
  console.log("\n問題彙總：");
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exit(1);
}
console.log("冒煙測試全數通過");
