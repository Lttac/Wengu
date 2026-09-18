/**
 * 用 Chrome DevTools Protocol 驅動一個無頭瀏覽器。
 *
 *   import { openBrowser } from "./lib/browser.mjs";
 *   const page = await openBrowser({ width: 900, height: 1220 });
 *   await page.goto(url);
 *   await page.shoot("docs/screenshots", "home-light");
 *   await page.close();
 *
 * 為什麼是 CDP 而不是無頭瀏覽器的 --screenshot：後者只能拍「載入後的原樣」，
 * 沒辦法開下拉、切深色、拖曳到一半、塞示範資料。這裡用 Node 內建的 WebSocket
 * 自己接 CDP，不需要任何 npm 依賴，也不需要下載瀏覽器（直接用機器上已安裝的）。
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function chromePath() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) throw new Error("找不到 Chrome / Edge，請用 CHROME_PATH 指定路徑");
  return found;
}

export async function openBrowser({
  port = 9333,
  width = 900,
  height = 1220,
  scale = 1,
  theme = "light",
} = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "wengu-cdp-"));
  const child = spawn(chromePath(), [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ], { stdio: "ignore", windowsHide: true });

  const socket = await connect(port);
  const send = makeSender(socket);
  await send("Page.enable");
  await send("Runtime.enable");

  const api = {
    send,

    async evaluate(expression) {
      const res = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (res.exceptionDetails) throw new Error(`${res.exceptionDetails.text} :: ${expression.slice(0, 70)}`);
      return res.result?.value;
    },

    async setViewport(w, h) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: w, height: h, deviceScaleFactor: scale, mobile: false,
      });
    },

    setTheme(dark) {
      return send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }],
      });
    },

    // 彈簧曲線的尾巴很長（約 1.1s），太早拍會拍到卡片還在亞像素移動的瞬間——
    // 那會讓同一份程式碼每次產生略微不同的 PNG。等它真的停下來。
    async goto(url, settle = 1400) {
      await send("Page.navigate", { url });
      await sleep(settle);
    },

    /** 元素中心的座標（找不到回傳 null） */
    rectOf(selector, nth = 0) {
      return api.evaluate(`(() => {
        const el = document.querySelectorAll(${JSON.stringify(selector)})[${nth}];
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
      })()`);
    },

    mouse(type, x, y, extra = {}) {
      return send("Input.dispatchMouseEvent", {
        type, x, y, button: "left", clickCount: type === "mousePressed" ? 1 : 0, ...extra,
      });
    },

    async clickAt({ x, y }, settle = 350) {
      await api.mouse("mousePressed", x, y);
      await sleep(50);
      await api.mouse("mouseReleased", x, y);
      await sleep(settle);
    },

    async click(selector, nth = 0) {
      const rect = await api.rectOf(selector, nth);
      if (!rect) throw new Error(`找不到元素：${selector}`);
      await api.clickAt(rect);
      return rect;
    },

    /** 真實的拖曳：按下 → 分段移動 → （可選）停住不放 */
    async drag(start, offsets, { release = true, settle = 300 } = {}) {
      await api.mouse("mousePressed", start.x, start.y);
      for (const dx of offsets) {
        await api.mouse("mouseMoved", start.x + dx, start.y + 4);
        await sleep(60);
      }
      await sleep(settle);
      if (release) await api.mouse("mouseReleased", start.x + offsets.at(-1), start.y + 4);
    },

    async scrollTo(selector, settle = 500) {
      await api.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: "start" })`);
      await sleep(settle);
    },

    async shoot(dir, name) {
      fs.mkdirSync(dir, { recursive: true });
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const file = path.join(dir, `${name}.png`);
      fs.writeFileSync(file, Buffer.from(data, "base64"));
      const kb = Math.round(fs.statSync(file).size / 1024);
      console.log(`  ${name}.png  ${width}×${height}  ${kb} KB`);
      return file;
    },

    async close() {
      try { socket.close(); } catch { /* 已關 */ }
      child.kill();
      await sleep(250);
      fs.rmSync(profile, { recursive: true, force: true });
    },
  };

  await api.setViewport(width, height);
  await api.setTheme(theme === "dark");
  return api;
}

/** 等除錯埠起來，回傳第一個 page target 的 WebSocket */
async function connect(port) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
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
      // 還沒起來，再等
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
