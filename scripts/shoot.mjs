/**
 * 產生 README 用的產品截圖。
 *
 *   npm run shots        # 需要先開好 http://localhost:4173（npm run serve）
 *
 * 為什麼不直接用無頭瀏覽器的 --screenshot：那個只能拍「載入後的原樣」，
 * 沒辦法開下拉、切深色、塞示範資料。這裡走 Chrome DevTools Protocol，
 * 用 Node 內建的 WebSocket，不需要任何 npm 依賴，也不需要下載瀏覽器
 * （直接用機器上已安裝的 Chrome）。
 *
 * 截圖是「用種子資料重跑出來的」而不是手拍的，所以 UI 改了重跑就好。
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "docs/screenshots");
const APP_URL = process.env.APP_URL || "http://localhost:4173/";
const PORT = Number(process.env.CDP_PORT || 9333);
const VIEWPORT = { width: 900, height: 1220 };

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);

const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error("找不到 Chrome / Edge。用 CHROME_PATH 環境變數指定路徑。");
  process.exit(1);
}

/** 示範資料：不同科目、有已排程也有到期的（進度條才不會是 0% 或 100%），
    外加一個自訂科目「生物」，讓截圖能順帶展示這個功能。 */
const now = Date.now();
const day = 86400000;
const DEMO_ITEMS = [
  ["鈉與氧氣反應時，條件不同產物有何區別？", "常溫生成氧化鈉，加熱生成過氧化鈉。", "化學", 2, 6, now + 2 * day],
  ["過氧化鈉與水反應生成什麼？", "氫氧化鈉和氧氣。", "化學", 2, 6, now - day],
  ["鈉與水反應的現象有哪些？", "浮、熔、游、響、紅。", "化學", 1, 1, now - day],
  ["碳酸鈉和碳酸氫鈉的熱穩定性哪個更強？", "碳酸鈉更穩定，碳酸氫鈉受熱易分解。", "化學", 3, 15, now + 5 * day],
  ["鈉著火時能否用水滅火？", "不能，鈉與水反應生成氫氣，會加劇燃燒。", "化學", 1, 1, now - day],
  ["牛頓第二定律的公式是什麼？", "F = ma（力 = 質量 × 加速度）", "物理", 2, 6, now - day],
  ["細胞的能源工廠是？", "粒線體", "生物", 1, 1, now - day],
  ["光合作用的產物是什麼？", "葡萄糖與氧氣", "生物", 3, 15, now + 4 * day],
].map(([question, answer, category, repetition, interval, next], i) => ({
  id: now + i,
  question, answer, category, repetition, interval,
  easeFactor: 2.5, lapses: 0, reviews: repetition,
  createdAt: new Date(now - 3 * day).toISOString(),
  lastReviewed: null,
  nextReview: new Date(next).toISOString(),
}));

const DEMO_SUBJECTS = [{ id: "s-demo-bio", name: "生物" }];

/** 語言固定繁體（與 README 一致）、外觀跟隨系統（這樣才能用 CDP 模擬深色）、AI 打開。 */
const DEMO_SETTINGS = {
  appearance: "system",
  locale: "zh-Hant",
  llm: {
    enabled: true,
    preset: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    keyStorage: "session",
    temperature: 0.3,
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "wengu-shots-"));
  const child = spawn(chrome, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--hide-scrollbars", "--force-device-scale-factor=2",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const ws = await connect();
  const send = makeSender(ws);
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    // 1x 就夠：GitHub 的 README 欄寬只有 ~830px，2x 只會讓倉庫變重
    width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false,
  });

  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.text);
    return res.result?.value;
  };

  const goto = async (url) => {
    await send("Page.navigate", { url });
    await sleep(900);
  };

  const shoot = async (name) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    const file = path.join(OUT_DIR, `${name}.png`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    const kb = Math.round(fs.statSync(file).size / 1024);
    console.log(`  ${name}.png  ${VIEWPORT.width}×${VIEWPORT.height}  ${kb} KB`);
  };

  const setTheme = (dark) => send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }],
  });

  console.log(`用 ${path.basename(chrome)} 產生截圖 → docs/screenshots/`);

  // 1. 塞示範資料（全新 profile，localStorage 是空的）
  await setTheme(false);
  await goto(APP_URL);
  await evaluate([
    `localStorage.setItem("wengu.items.v1", ${JSON.stringify(JSON.stringify(DEMO_ITEMS))})`,
    `localStorage.setItem("wengu.subjects.v1", ${JSON.stringify(JSON.stringify(DEMO_SUBJECTS))})`,
    `localStorage.setItem("wengu.settings.v1", ${JSON.stringify(JSON.stringify(DEMO_SETTINGS))})`,
  ].join(";"));
  await goto(APP_URL);
  await sleep(400);

  // 2. 淺色首頁
  await shoot("home-light");

  // 3. 深色首頁
  await setTheme(true);
  await sleep(600);
  await shoot("home-dark");

  // 4. 下拉展開（淺色）
  await setTheme(false);
  await sleep(600);
  await evaluate(`document.querySelector("#composeCard .select-trigger").click()`);
  await sleep(700);
  await shoot("select-light");

  // 5. AI 生成卡片面板
  await evaluate(`document.querySelector("#composeCard .select-trigger").click()`);
  await sleep(300);
  await evaluate(`document.querySelector("#aiGenerateButton").click()`);
  await sleep(600);
  await evaluate(`
    const ta = document.querySelector("#aiDialog [data-field='text']");
    ta.value = "鈉與水反應的現象：浮、熔、游、響、紅。常溫下鈉與氧氣反應生成氧化鈉，加熱則生成過氧化鈉。";
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  `);
  await sleep(400);
  await shoot("ai-dialog");

  // 6. 設定面板
  await evaluate(`document.querySelector("#aiDialog").close()`);
  await sleep(400);
  await evaluate(`document.querySelector("#settingsButton").click()`);
  await sleep(700);
  await shoot("settings-light");

  ws.close();
  child.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
  console.log("完成。");
}

/** 等 Chrome 的除錯埠起來，回傳第一個 page target 的 WebSocket。 */
async function connect() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) {
        const socket = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          socket.addEventListener("open", resolve, { once: true });
          socket.addEventListener("error", reject, { once: true });
        });
        return socket;
      }
    } catch {
      // 還沒起來
    }
    await sleep(250);
  }
  throw new Error("連不上 Chrome 的除錯埠");
}

function makeSender(socket) {
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
      else resolve(msg.result);
    }
  });
  return (method, params = {}) => {
    const id = (nextId += 1);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  };
}

main().catch((err) => {
  console.error("產生截圖失敗：" + err.message);
  process.exit(1);
});
