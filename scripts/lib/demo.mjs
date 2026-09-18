/**
 * 截圖與巡檢共用的示範資料。
 *
 * 刻意挑不同科目、有已排程也有到期的（進度條才不會是 0% 或 100%），
 * 並含一個自訂科目「生物」，讓截圖能順帶展示這個功能。
 *
 * 用示範資料而不是真實卡片：截圖是給 README 和視覺檢視用的，
 * 不該把使用者自己的卡片內容拍進去。
 */

const day = 86400000;

export function demoItems(extra = []) {
  const now = Date.now();
  const rows = [
    ["鈉與氧氣反應時，條件不同產物有何區別？", "常溫生成氧化鈉，加熱生成過氧化鈉。", "化學", 2, 6, now + 2 * day],
    ["過氧化鈉與水反應生成什麼？", "氫氧化鈉和氧氣。", "化學", 2, 6, now - day],
    ["鈉與水反應的現象有哪些？", "浮、熔、游、響、紅。", "化學", 1, 1, now - day],
    ["碳酸鈉和碳酸氫鈉的熱穩定性哪個更強？", "碳酸鈉更穩定，碳酸氫鈉受熱易分解。", "化學", 3, 15, now + 5 * day],
    ["鈉著火時能否用水滅火？", "不能，鈉與水反應生成氫氣，會加劇燃燒。", "化學", 1, 1, now - day],
    ["牛頓第二定律的公式是什麼？", "F = ma（力 = 質量 × 加速度）", "物理", 2, 6, now + 3 * day],
    ["細胞的能源工廠是？", "粒線體", "生物", 1, 1, now + 1 * day],
    ["光合作用的產物是什麼？", "葡萄糖與氧氣", "生物", 3, 15, now + 4 * day],
    ...extra,
  ];
  return rows.map(([question, answer, category, repetition, interval, next], i) => ({
    id: now + i,
    question, answer, category, repetition, interval,
    easeFactor: 2.5, lapses: 0, reviews: repetition,
    createdAt: new Date(now - 3 * day).toISOString(),
    lastReviewed: null,
    nextReview: new Date(next).toISOString(),
  }));
}

export const demoSubjects = [{ id: "s-demo-bio", name: "生物" }];

/** 語言固定繁體（與 README 一致）、外觀跟隨系統（這樣才能用 CDP 模擬深色）、AI 打開。 */
export function demoSettings(patch = {}) {
  return {
    appearance: "system",
    locale: "zh-Hant",
    review: { showMeta: true, shuffle: false, shortcuts: true },
    llm: {
      enabled: true,
      preset: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
      keyStorage: "session",
      temperature: 0.3,
    },
    ...patch,
  };
}

/** 產生一段在頁面裡執行的 localStorage 寫入語句 */
export function seedExpression({ items, settings, subjects = demoSubjects }) {
  return [
    `localStorage.setItem("wengu.items.v1", ${JSON.stringify(JSON.stringify(items))})`,
    `localStorage.setItem("wengu.subjects.v1", ${JSON.stringify(JSON.stringify(subjects))})`,
    `localStorage.setItem("wengu.settings.v1", ${JSON.stringify(JSON.stringify(settings))})`,
  ].join(";");
}
