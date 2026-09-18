/**
 * 間隔複習排程（SM-2 的簡化版，沿用自 v0 單檔版本，公式未改）。
 * 純函式：不碰 DOM、不碰儲存，方便測試。
 */

export const QUALITY = Object.freeze({
  again: 1,   // 不會
  hard: 3,    // 困難
  good: 4,    // 一般
  easy: 5,    // 簡單
});

export const MIN_EASE = 1.3;

let lastId = 0;

/** 遞增且可排序的 id（毫秒時間戳，同一毫秒內連續呼叫不會碰撞） */
export function nextId() {
  const now = Date.now();
  lastId = now > lastId ? now : lastId + 1;
  return lastId;
}

export function createItem({ question, answer = "", category, now = new Date() }) {
  const iso = now.toISOString();
  return {
    id: nextId(),
    question: String(question).trim(),
    answer: String(answer).trim(),
    category,
    repetition: 0,
    interval: 0,
    easeFactor: 2.5,
    lapses: 0,
    reviews: 0,
    createdAt: iso,
    lastReviewed: null,
    nextReview: iso,
  };
}

/** 把可能來自舊版或外部 JSON 的卡片補齊欄位 */
export function normalizeItem(raw) {
  const now = new Date().toISOString();
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  return {
    id: num(raw?.id, nextId()),
    question: String(raw?.question ?? "").trim(),
    answer: String(raw?.answer ?? "").trim(),
    category: String(raw?.category ?? ""),
    repetition: Math.max(0, Math.round(num(raw?.repetition, 0))),
    interval: Math.max(0, Math.round(num(raw?.interval, 0))),
    easeFactor: Math.max(MIN_EASE, num(raw?.easeFactor, 2.5)),
    lapses: Math.max(0, Math.round(num(raw?.lapses, 0))),
    reviews: Math.max(0, Math.round(num(raw?.reviews, 0))),
    createdAt: raw?.createdAt || now,
    lastReviewed: raw?.lastReviewed || null,
    nextReview: raw?.nextReview || now,
  };
}

export function isDue(item, now = new Date()) {
  const t = new Date(item.nextReview).getTime();
  return Number.isFinite(t) ? t <= now.getTime() : true;
}

/**
 * 依評分更新排程。回傳新物件，不改傳入的卡片。
 * quality < 3 視為忘記：重來並計一次 lapse。
 */
export function schedule(item, quality, now = new Date()) {
  let { repetition, interval, easeFactor } = item;
  let lapses = item.lapses || 0;

  if (quality < 3) {
    repetition = 0;
    interval = 1;
    lapses += 1;
  } else {
    repetition += 1;
    if (repetition === 1) interval = 1;
    else if (repetition === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  easeFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  if (easeFactor < MIN_EASE) easeFactor = MIN_EASE;

  const next = new Date(now.getTime());
  next.setDate(next.getDate() + interval);

  return {
    ...item,
    repetition,
    interval,
    easeFactor,
    lapses,
    reviews: (item.reviews || 0) + 1,
    lastReviewed: now.toISOString(),
    nextReview: next.toISOString(),
  };
}

export function summarize(items, now = new Date()) {
  const due = items.filter((i) => isDue(i, now));
  const scheduled = items.filter((i) => !isDue(i, now));
  const reviews = items.reduce((sum, i) => sum + (i.reviews || 0), 0);
  const lapses = items.reduce((sum, i) => sum + (i.lapses || 0), 0);
  const intervals = items.filter((i) => i.interval > 0).map((i) => i.interval);
  return {
    total: items.length,
    due: due.length,
    scheduled: scheduled.length,
    graduated: items.filter((i) => i.repetition >= 3).length,
    reviews,
    lapses,
    avgInterval: intervals.length
      ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
      : 0,
    progress: items.length ? (items.length - due.length) / items.length : 0,
  };
}
