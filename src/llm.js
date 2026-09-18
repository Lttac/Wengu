/**
 * OpenAI 相容的 Chat Completions 客戶端。
 *
 * 刻意不送 response_format：各家相容實作對它的支援不一致（Ollama、部分代理會直接 400）。
 * 改成在提示詞裡要求純 JSON，再用 parseCardJson 容錯解析——跨服務的失敗面最小。
 * API 金鑰由呼叫端從 store 取，這個模組不碰儲存。
 */

export const PRESETS = [
  { id: "deepseek", label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { id: "ollama", label: "Ollama（本機）", baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  { id: "custom", label: "自訂 / Custom", baseUrl: "", model: "" },
];

const LANG_NAME = {
  "zh-Hant": "Traditional Chinese",
  "zh-Hans": "Simplified Chinese",
  en: "English",
};

export class LlmError extends Error {
  constructor(code, detail = {}) {
    super(code);
    this.name = "LlmError";
    this.code = code;          // network | status | protocol | no-key | aborted
    this.detail = detail;
  }
}

/** 把各家服務的錯誤碼轉成「使用者能採取行動」的說明 */
export function errorKeyOf(err) {
  if (!(err instanceof LlmError)) return "ai.error.unknown";
  if (err.code === "no-key") return "ai.error.noKey";
  if (err.code === "aborted") return "ai.error.aborted";
  if (err.code === "network") return "ai.error.network";
  if (err.code === "protocol") return "ai.error.parse";
  const status = err.detail?.status;
  if (status === 401 || status === 403) return "ai.error.auth";
  if (status === 404) return "ai.error.notFound";
  if (status === 429) return "ai.error.rateLimit";
  if (status >= 500) return "ai.error.server";
  return "ai.error.status";
}

export function presetById(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[PRESETS.length - 1];
}

function endpoint(baseUrl) {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  if (!base) throw new LlmError("no-endpoint");
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
}

export function createClient({
  baseUrl,
  apiKey,
  model,
  temperature = 0.3,
  fetchImpl,
  timeoutMs = 45000,
} = {}) {
  const doFetch = fetchImpl || globalThis.fetch?.bind(globalThis);

  async function chat(messages, { signal } = {}) {
    if (!doFetch) throw new LlmError("network", { reason: "fetch-unavailable" });
    if (!apiKey) throw new LlmError("no-key");
    if (!model) throw new LlmError("no-model");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener?.("abort", onAbort);

    let response;
    try {
      response = await doFetch(endpoint(baseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature, stream: false }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === "AbortError") throw new LlmError("aborted");
      // 瀏覽器對 CORS 失敗只給一個籠統的 TypeError，這裡照實往上報
      throw new LlmError("network", { reason: err?.message });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }

    if (!response.ok) {
      let body = "";
      try { body = (await response.text()).slice(0, 400); } catch { /* 讀不到就算了 */ }
      throw new LlmError("status", { status: response.status, body });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      throw new LlmError("protocol", { reason: "invalid-json" });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new LlmError("protocol", { reason: "empty-content" });
    }
    return content;
  }

  return {
    chat,
    /**
     * 逐字回傳的版本。LLM 介面最傷體驗的就是「按了之後幾十秒黑箱」——
     * 有東西在動，使用者才知道是在跑而不是卡住。
     *
     * 也順手處理不支援串流的服務：它會直接回一整包 JSON，
     * 這時候就當成一次性回應，不要失敗。
     */
    async chatStream(messages, { onDelta, signal } = {}) {
      if (!doFetch) throw new LlmError("network", { reason: "fetch-unavailable" });
      if (!apiKey) throw new LlmError("no-key");
      if (!model) throw new LlmError("no-model");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const onAbort = () => controller.abort();
      signal?.addEventListener?.("abort", onAbort);

      let response;
      try {
        response = await doFetch(endpoint(baseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages, temperature, stream: true }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err?.name === "AbortError") throw new LlmError("aborted");
        throw new LlmError("network", { reason: err?.message });
      } finally {
        // 失敗路徑也要清掉計時器：漏掉這一行的話，請求失敗後那個 45 秒的
        // setTimeout 會一直掛著（測試跑不完就是這樣被抓到的）。
        clearTimeout(timer);
        signal?.removeEventListener?.("abort", onAbort);
      }

      try {
        if (!response.ok) {
          let body = "";
          try { body = (await response.text()).slice(0, 400); } catch { /* 讀不到就算了 */ }
          throw new LlmError("status", { status: response.status, body });
        }

        const type = response.headers?.get?.("content-type") || "";
        if (!response.body?.getReader || type.includes("application/json")) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (typeof content !== "string" || !content.trim()) throw new LlmError("protocol", { reason: "empty-content" });
          onDelta?.(content, content);
          return content;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            let delta = "";
            try {
              delta = JSON.parse(payload)?.choices?.[0]?.delta?.content ?? "";
            } catch {
              continue;   // 不完整的片段就跳過，之後的 chunk 會補上
            }
            if (delta) {
              text += delta;
              onDelta?.(delta, text);
            }
          }
        }
        if (!text.trim()) throw new LlmError("protocol", { reason: "empty-stream" });
        return text;
      } catch (err) {
        if (err instanceof LlmError) throw err;
        if (err?.name === "AbortError") throw new LlmError("aborted");
        throw new LlmError("protocol", { reason: err?.message });
      } finally {
        clearTimeout(timer);
      }
    },
    /** 最小成本的一次往返，用來驗證位址、金鑰與模型三者是否都對 */
    async test({ signal } = {}) {
      const started = Date.now();
      await chat([{ role: "user", content: "ping" }], { signal });
      return { ms: Date.now() - started };
    },
  };
}

export function buildGenerateMessages({ text, count = 8, category, locale = "zh-Hant" }) {
  const language = LANG_NAME[locale] || LANG_NAME["zh-Hant"];
  const material = String(text || "").slice(0, 8000);
  const system = [
    "You turn study material into spaced-repetition flashcards.",
    "One card tests exactly one fact — never bundle two facts into one card.",
    "The question must be answerable on its own, without the source text.",
    "Answers are a short phrase or one sentence, not a paragraph.",
    "Never put a table, a list, or a set of items into one answer.",
    "If the material compares two things, make one card per difference instead of one comparison card.",
    "Vary the question form: definition, cause, comparison, application, sequence.",
    "Never write yes/no questions, and never use 'according to the passage' phrasing.",
    `Write every question and answer in ${language}.`,
    "Reply with JSON only — no prose, no markdown fences, no trailing commentary.",
    'Exact shape: {"cards":[{"question":"...","answer":"..."}]}',
  ].join(" ");
  const user = [
    `Create ${count} flashcards from the material below.`,
    category ? `Topic label: ${category}.` : "",
    "Pick what is most worth remembering: definitions, mechanisms, causes, numbers, distinctions.",
    "Do not invent details that are not in the material. If the material is thin, return fewer cards instead of padding.",
    "Every card must be distinct from the others.",
    `Do not exceed ${count} cards — returning fewer, sharper cards is the better outcome.`,
    "",
    "--- MATERIAL ---",
    material,
  ].filter(Boolean).join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export function buildExplainMessages({ question, answer, locale = "zh-Hant" }) {
  const language = LANG_NAME[locale] || LANG_NAME["zh-Hant"];
  const system = [
    "You explain flashcards to a student who just got one wrong.",
    `Write in ${language}.`,
    "Structure: the core idea in one sentence, then why that is the answer, then the mistake people usually make.",
    "At most 4 sentences. Be concrete.",
    "No preamble such as “Sure!”, and do not restate the question.",
    "Avoid hedging like “it depends” unless the answer genuinely depends.",
  ].join(" ");
  const user = `Question: ${question}\nAnswer: ${answer || "(none given)"}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function stripFences(raw) {
  let text = String(raw ?? "").trim();
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  return text;
}

function firstJsonSlice(text) {
  const arrayStart = text.indexOf("[");
  const objectStart = text.indexOf("{");
  const starts = [arrayStart, objectStart].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const open = text[start];
  const close = open === "[" ? "]" : "}";
  const end = text.lastIndexOf(close);
  if (end <= start) return null;
  return text.slice(start, end + 1);
}

/**
 * 容錯解析模型回傳的卡片。吃三種常見形狀：
 *   {"cards":[{...}]} / [{...}] / {"question":..,"answer":..}
 * 解析不出來就丟 LlmError("protocol")，讓上層顯示可理解的錯誤。
 */
export function parseCardJson(raw, { limit = 50 } = {}) {
  const cleaned = stripFences(raw);
  const slice = firstJsonSlice(cleaned);
  if (!slice) throw new LlmError("protocol", { reason: "no-json" });

  let parsed;
  try {
    parsed = JSON.parse(slice);
  } catch {
    throw new LlmError("protocol", { reason: "bad-json" });
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.cards) ? parsed.cards
      : Array.isArray(parsed?.items) ? parsed.items
        : (parsed?.question ? [parsed] : []);

  const cards = [];
  for (const entry of list) {
    if (!entry || typeof entry !== "object") continue;
    const question = String(entry.question ?? entry.q ?? entry.front ?? "").trim();
    const answer = String(entry.answer ?? entry.a ?? entry.back ?? "").trim();
    if (!question) continue;
    cards.push({ question, answer });
    if (cards.length >= limit) break;
  }
  if (!cards.length) throw new LlmError("protocol", { reason: "no-cards" });
  return cards;
}

/**
 * 從「還沒寫完」的 JSON 裡盡量救回卡片。
 *
 * 用途：使用者按了停止，或串流中斷時——已經生成的那幾張不該白白丟掉。
 * 做法是掃出所有括號平衡的物件，能解析且帶 question 的就留下。
 */
export function salvageCards(raw, { limit = 50 } = {}) {
  const text = stripFences(raw);
  const out = [];
  // 用堆疊記住每一層物件的起點。卡片通常包在 {"cards":[…]} 裡，
  // 只看最外層會一張都撈不到——測試就是這樣抓到的。
  const open = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") {
      open.push(i);
    } else if (ch === "}") {
      const start = open.pop();
      if (start !== undefined) {
        try {
          const entry = JSON.parse(text.slice(start, i + 1));
          const question = String(entry?.question ?? entry?.q ?? "").trim();
          const answer = String(entry?.answer ?? entry?.a ?? "").trim();
          if (question) out.push({ question, answer });
        } catch {
          // 這個物件不完整，跳過
        }
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}
