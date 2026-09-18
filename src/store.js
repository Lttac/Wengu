/**
 * 狀態與持久化。
 *
 * 兩條硬規則：
 *  1. API 金鑰永遠不進 settings 物件，因此永遠不會被匯出或跟著資料同步跑掉。
 *  2. 任何 localStorage 存取都要能失敗（無痕模式會直接丟例外），壞掉就退回記憶體。
 */

import { createItem, normalizeItem, schedule } from "./srs.js";

export const ITEMS_KEY = "wengu.items.v1";
export const SETTINGS_KEY = "wengu.settings.v1";
export const SUBJECTS_KEY = "wengu.subjects.v1";
export const API_KEY_KEY = "wengu.llm.key";
export const API_KEY_SESSION_KEY = "wengu.llm.key.session";

/** 更名前的鍵名（還叫 smart-review 的時期）。遷移只複製、不刪除。 */
export const RENAMED_KEYS = {
  [ITEMS_KEY]: "reminder.items.v1",
  [SETTINGS_KEY]: "reminder.settings.v1",
  [SUBJECTS_KEY]: "reminder.subjects.v1",
  [API_KEY_KEY]: "reminder.llm.key",
  [API_KEY_SESSION_KEY]: "reminder.llm.key.session",
};

export const LEGACY_ITEMS_KEY = "review_items";     // v0 單檔版
export const LEGACY_THEME_KEY = "review_theme";     // v0 單檔版

export const SCHEMA_VERSION = 1;

/**
 * 內建科目。id 就是這幾個中文字串——它們已經寫在使用者的資料與匯出檔裡，
 * 不能為了「整齊」改掉。顯示名稱由 i18n 提供，id 永遠不翻譯。
 */
export const BUILTIN_SUBJECT_IDS = Object.freeze(["語文", "數學", "英語", "物理", "化學", "地理"]);
export const SUBJECT_NAME_MAX = 12;

export const DEFAULT_SETTINGS = Object.freeze({
  appearance: "system",          // system | light | dark
  locale: "auto",                // auto | zh-Hant | zh-Hans | en
  review: {
    showMeta: true,              // 卡片上顯示間隔天數與難度
    shuffle: false,              // 今日任務隨機排序
    shortcuts: true,             // 空白鍵揭示、數字鍵評分
  },
  llm: {
    enabled: false,
    preset: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    keyStorage: "session",       // local | session | memory
    temperature: 0.3,
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** 只合併已知欄位，避免外部 JSON 灌進奇怪的鍵 */
function mergeSettings(base, patch) {
  const out = clone(base);
  if (!isPlainObject(patch)) return out;
  if (["system", "light", "dark"].includes(patch.appearance)) out.appearance = patch.appearance;
  if (typeof patch.locale === "string") out.locale = patch.locale;
  if (isPlainObject(patch.review)) {
    for (const key of Object.keys(out.review)) {
      if (typeof patch.review[key] === typeof out.review[key]) out.review[key] = patch.review[key];
    }
  }
  if (isPlainObject(patch.llm)) {
    for (const key of Object.keys(out.llm)) {
      if (key === "temperature") {
        const n = Number(patch.llm.temperature);
        if (Number.isFinite(n)) out.llm.temperature = Math.min(1, Math.max(0, n));
      } else if (typeof patch.llm[key] === typeof out.llm[key]) {
        out.llm[key] = patch.llm[key];
      }
    }
  }
  return out;
}

function safeRead(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeWrite(storage, key, value) {
  try {
    if (!storage) return false;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function createStore({ local = globalThis.localStorage, session = globalThis.sessionStorage } = {}) {
  const memory = new Map();          // storage 不可用時的後備
  const listeners = new Set();
  let memoryApiKey = "";

  const readLocal = (key) => {
    const fromStorage = safeRead(local, key);
    return fromStorage === null ? (memory.get(key) ?? null) : fromStorage;
  };
  const writeLocal = (key, value) => {
    memory.set(key, value);
    return safeWrite(local, key, value);
  };

  function parseJson(text, fallback) {
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  // ---- 一次性遷移 --------------------------------------------------------
  // 兩段歷史：更名前的 reminder.*，以及 v0 單檔版的 review_items / review_theme。
  // 一律只複製、不刪除——就算哪裡判斷錯了，舊資料還在，使用者的卡片不會消失。
  function migrateLegacy() {
    for (const [next, previous] of Object.entries(RENAMED_KEYS)) {
      if (readLocal(next) !== null) continue;
      const value = safeRead(local, previous) ?? safeRead(session, previous);
      if (value === null) continue;
      if (next === API_KEY_SESSION_KEY) safeWrite(session, next, value);
      else writeLocal(next, value);
    }

    const hasItems = readLocal(ITEMS_KEY) !== null;
    const legacyItems = readLocal(LEGACY_ITEMS_KEY);
    if (!hasItems && legacyItems) {
      const parsed = parseJson(legacyItems, null);
      if (Array.isArray(parsed)) {
        writeLocal(ITEMS_KEY, JSON.stringify(parsed.map(normalizeItem)));
      }
    }
    const hasSettings = readLocal(SETTINGS_KEY) !== null;
    const legacyTheme = safeRead(local, LEGACY_THEME_KEY);
    if (!hasSettings && (legacyTheme === "dark" || legacyTheme === "light")) {
      writeLocal(SETTINGS_KEY, JSON.stringify(mergeSettings(DEFAULT_SETTINGS, { appearance: legacyTheme })));
    }
  }

  let items = [];
  let settings = clone(DEFAULT_SETTINGS);
  let subjects = [];

  migrateLegacy();
  const storedItems = parseJson(readLocal(ITEMS_KEY), []);
  if (Array.isArray(storedItems)) items = storedItems.map(normalizeItem);
  settings = mergeSettings(DEFAULT_SETTINGS, parseJson(readLocal(SETTINGS_KEY), {}));
  const storedSubjects = parseJson(readLocal(SUBJECTS_KEY), []);
  if (Array.isArray(storedSubjects)) {
    subjects = storedSubjects
      .filter((s) => s && typeof s.name === "string" && s.name.trim())
      .map((s) => ({
        id: typeof s.id === "string" && s.id ? s.id : `s-${Math.random().toString(36).slice(2, 10)}`,
        name: s.name.trim().slice(0, SUBJECT_NAME_MAX),
      }));
  }

  function persistItems() {
    writeLocal(ITEMS_KEY, JSON.stringify(items));
  }
  function persistSettings() {
    writeLocal(SETTINGS_KEY, JSON.stringify(settings));
  }
  function persistSubjects() {
    writeLocal(SUBJECTS_KEY, JSON.stringify(subjects));
  }
  function emit(change) {
    for (const fn of listeners) fn(change, api);
  }

  // ---- API 金鑰：與 settings 完全分離 -----------------------------------
  function getApiKey() {
    switch (settings.llm.keyStorage) {
      case "local": return safeRead(local, API_KEY_KEY) || "";
      case "session": return safeRead(session, API_KEY_SESSION_KEY) || "";
      default: return memoryApiKey;
    }
  }

  function setApiKey(value) {
    const key = String(value || "").trim();
    memoryApiKey = key;
    // 換儲存方式時把另一邊清掉，避免舊金鑰留在瀏覽器裡
    if (settings.llm.keyStorage !== "local") safeWrite(local, API_KEY_KEY, null);
    if (settings.llm.keyStorage !== "session") safeWrite(session, API_KEY_SESSION_KEY, null);
    if (settings.llm.keyStorage === "local") safeWrite(local, API_KEY_KEY, key);
    if (settings.llm.keyStorage === "session") safeWrite(session, API_KEY_SESSION_KEY, key);
    emit({ type: "apikey" });
  }

  const api = {
    // ---- 讀取 ----------------------------------------------------------
    getItems: () => items,
    getItem: (id) => items.find((i) => i.id === id) || null,
    getSettings: () => settings,
    getSubjects: () => subjects,
    getApiKey,
    countInSubject: (id) => items.filter((i) => i.category === id).length,
    isBuiltinSubject: (id) => BUILTIN_SUBJECT_IDS.includes(id),

    /** 回傳結構化結果而不是丟例外，UI 才能直接對應到提示文案 */
    addSubject(name) {
      const raw = String(name ?? "").trim();
      if (!raw) return { ok: false, reason: "empty" };
      if (raw.length > SUBJECT_NAME_MAX) return { ok: false, reason: "too-long" };
      const lower = raw.toLowerCase();
      const taken = BUILTIN_SUBJECT_IDS.some((id) => id.toLowerCase() === lower)
        || subjects.some((s) => s.name.toLowerCase() === lower);
      if (taken) return { ok: false, reason: "duplicate" };
      const subject = {
        id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        name: raw,
      };
      subjects = [...subjects, subject];
      persistSubjects();
      emit({ type: "subjects", action: "add", id: subject.id });
      return { ok: true, subject };
    },

    /** 還有卡片在用就不給刪——比默默把卡片改到別的科目安全得多 */
    removeSubject(id) {
      if (BUILTIN_SUBJECT_IDS.includes(id)) return { ok: false, reason: "builtin" };
      const count = items.filter((i) => i.category === id).length;
      if (count) return { ok: false, reason: "in-use", count };
      const next = subjects.filter((s) => s.id !== id);
      if (next.length === subjects.length) return { ok: false, reason: "not-found" };
      subjects = next;
      persistSubjects();
      emit({ type: "subjects", action: "remove", id });
      return { ok: true };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // ---- 卡片 ----------------------------------------------------------
    addItem({ question, answer = "", category }) {
      const item = createItem({ question, answer, category });
      items = [item, ...items];
      persistItems();
      emit({ type: "items", action: "add", ids: [item.id] });
      return item;
    },

    addItems(list) {
      const created = list.map((raw) => createItem({ question: raw.question, answer: raw.answer, category: raw.category }));
      if (!created.length) return [];
      items = [...created, ...items];
      persistItems();
      emit({ type: "items", action: "add", ids: created.map((i) => i.id) });
      return created;
    },

    updateItem(id, patch) {
      let updated = null;
      items = items.map((i) => {
        if (i.id !== id) return i;
        updated = { ...i, ...patch };
        return updated;
      });
      if (updated) {
        persistItems();
        emit({ type: "items", action: "update", ids: [id] });
      }
      return updated;
    },

    removeItem(id) {
      const index = items.findIndex((i) => i.id === id);
      if (index < 0) return null;
      const [removed] = items.splice(index, 1);
      persistItems();
      emit({ type: "items", action: "remove", ids: [id] });
      return { item: removed, index };
    },

    /** 供 undo 用：插回原本的位置 */
    restoreItem(item, index = 0) {
      const next = items.slice();
      next.splice(Math.min(Math.max(index, 0), next.length), 0, item);
      items = next;
      persistItems();
      emit({ type: "items", action: "restore", ids: [item.id] });
      return item;
    },

    gradeItem(id, quality, now = new Date()) {
      let updated = null;
      items = items.map((i) => {
        if (i.id !== id) return i;
        updated = schedule(i, quality, now);
        return updated;
      });
      if (updated) {
        persistItems();
        emit({ type: "items", action: "grade", ids: [id] });
      }
      return updated;
    },

    reorder(fromId, toId) {
      const from = items.findIndex((i) => i.id === fromId);
      const to = items.findIndex((i) => i.id === toId);
      if (from < 0 || to < 0 || from === to) return false;
      const next = items.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      items = next;
      persistItems();
      emit({ type: "items", action: "reorder", ids: [fromId, toId] });
      return true;
    },

    // ---- 設定 ----------------------------------------------------------
    updateSettings(patch) {
      settings = mergeSettings(settings, patch);
      persistSettings();
      emit({ type: "settings", patch });
      return settings;
    },

    setApiKey,

    // ---- 資料 ----------------------------------------------------------
    /** 匯出：刻意不含 API 金鑰 */
    exportData(now = new Date()) {
      return {
        app: "wengu",
        schemaVersion: SCHEMA_VERSION,
        exportedAt: now.toISOString(),
        items: clone(items),
        subjects: clone(subjects),
        settings: clone(settings),
      };
    },

    /**
     * 匯入。mode: "replace" 覆蓋 | "merge" 依 id 去重後附加。
     * 回傳「這次真的新增了幾張」——全部重複時回 0，吐司才說得準。
     */
    importData(payload, { mode = "merge" } = {}) {
      const data = typeof payload === "string" ? parseJson(payload, null) : payload;
      if (!isPlainObject(data) || !Array.isArray(data.items)) {
        throw new Error("invalid-payload");
      }
      const incoming = data.items.map(normalizeItem).filter((i) => i.question);
      let added = incoming.length;
      if (mode === "replace") {
        items = incoming;
      } else {
        const existing = new Set(items.map((i) => i.id));
        const fresh = incoming.filter((i) => !existing.has(i.id));
        added = fresh.length;
        items = [...items, ...fresh];
      }
      settings = mergeSettings(settings, data.settings);
      if (Array.isArray(data.subjects)) {
        const taken = new Set([
          ...BUILTIN_SUBJECT_IDS.map((id) => id.toLowerCase()),
          ...subjects.map((s) => s.name.toLowerCase()),
        ]);
        const extra = [];
        for (const raw of data.subjects) {
          const name = typeof raw?.name === "string" ? raw.name.trim().slice(0, SUBJECT_NAME_MAX) : "";
          if (!name || taken.has(name.toLowerCase())) continue;
          taken.add(name.toLowerCase());
          extra.push({
            id: typeof raw?.id === "string" && raw.id ? raw.id : `s-${Math.random().toString(36).slice(2, 10)}`,
            name,
          });
        }
        if (extra.length) {
          subjects = [...subjects, ...extra];
          persistSubjects();
        }
      }
      persistSettings();
      persistItems();
      emit({ type: "import", count: added });
      return added;
    },

    reset() {
      items = [];
      subjects = [];
      settings = clone(DEFAULT_SETTINGS);
      memoryApiKey = "";
      memory.clear();
      safeWrite(local, ITEMS_KEY, null);
      safeWrite(local, SETTINGS_KEY, null);
      safeWrite(local, SUBJECTS_KEY, null);
      safeWrite(local, API_KEY_KEY, null);
      safeWrite(session, API_KEY_SESSION_KEY, null);
      emit({ type: "reset" });
    },
  };

  return api;
}
