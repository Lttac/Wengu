/**
 * 對比度檢查。
 *
 * 顏色的問題不該靠「看起來怪」來判斷。這支腳本把 tokens.css 讀進來，
 * 依實際堆疊順序合成背景（玻璃 → 底色 → 淡色底），再算 WCAG 對比。
 *
 *   npm run lint:contrast
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 先去掉註解：註解裡示範寫法的 `--x: …` 會被誤認為定義
const CSS = fs.readFileSync(path.join(ROOT, "src/styles/tokens.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, " ");

// ---- 解析 -----------------------------------------------------------------
function parseBlock(selector) {
  const index = CSS.indexOf(selector);
  if (index < 0) throw new Error(`找不到 ${selector}`);
  const open = CSS.indexOf("{", index);
  const close = CSS.indexOf("\n}", open);
  const body = CSS.slice(open + 1, close);
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("/*")) continue;
    const match = line.match(/^\s*(--[\w-]+)\s*:\s*(.+?);\s*$/);
    if (match) out[match[1]] = match[2].trim();
  }
  return out;
}

const light = parseBlock(":root {");
const dark = { ...light, ...parseBlock("html.dark {") };

function parseColor(value) {
  const text = String(value).trim();
  if (text === "transparent") return [0, 0, 0, 0];
  const hex = text.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn = text.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    const parts = fn[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  throw new Error(`無法解析色值：${text}`);
}

/** 依序把前景疊到背景上（前一個結果成為下一個的背景） */
function compositeLayers(layers) {
  return layers.reduce((base, top) => {
    const a = top[3];
    return [
      top[0] * a + base[0] * (1 - a),
      top[1] * a + base[1] * (1 - a),
      top[2] * a + base[2] * (1 - a),
      1,
    ];
  });
}

function luminance([r, g, b]) {
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// ---- 要驗的組合 -----------------------------------------------------------
// bg 是「由下往上」的堆疊，最後一層是文字所在的表面。
const CARD = ["--canvas", "--glass-fill"];
const CHROME = ["--canvas", "--glass-fill-strong"];
const MENU = ["--canvas", "--glass-fill-solid"];
const tone = (soft) => [...CARD, soft];

const CHECKS = [
  { label: "主文字 ink / 卡片", fg: "--ink", bg: CARD, min: 4.5 },
  { label: "正文 body / 卡片", fg: "--body", bg: CARD, min: 4.5 },
  { label: "後設 mute / 卡片", fg: "--mute", bg: CARD, min: 4.5 },
  { label: "mute / 浮動控制", fg: "--mute", bg: CHROME, min: 4.5 },
  { label: "分類標籤 accent-deep / accent-soft", fg: "--accent-deep", bg: tone("--accent-soft"), min: 4.5 },
  { label: "不會 danger-text / danger-soft", fg: "--danger-text", bg: tone("--danger-soft"), min: 4.5 },
  { label: "困難 warning-text / warning-soft", fg: "--warning-text", bg: tone("--warning-soft"), min: 4.5 },
  { label: "簡單 success-text / success-soft", fg: "--success-text", bg: tone("--success-soft"), min: 4.5 },
  { label: "答案 success-text / success-soft", fg: "--success-text", bg: tone("--success-soft"), min: 4.5 },
  { label: "空狀態 success-text / 卡片", fg: "--success-text", bg: CARD, min: 4.5 },
  { label: "一般 neutral / 卡片", fg: "--body", bg: tone("--neutral-soft"), min: 4.5 },
  { label: "選單文字 ink / select-menu", fg: "--ink", bg: MENU, min: 4.5 },
  { label: "選單選中項 accent-deep / select-menu", fg: "--accent-deep", bg: MENU, min: 4.5 },
  { label: "主要按鈕 on-accent / accent", fg: "--on-accent", bg: ["--canvas", "--accent"], min: 3.0 },
];

// 只印不計分：裝飾性填充，資訊由旁邊的文字承載。
const INFO = [
  { label: "進度條 success / 軌道", fg: "--success", bg: [...CARD, "--field-fill"] },
];

function run(name, tokens) {
  console.log(`\n== ${name}`);
  let failures = 0;
  for (const item of CHECKS) {
    const background = compositeLayers(item.bg.map((key) => parseColor(tokens[key])));
    const foreground = parseColor(tokens[item.fg]);
    const ratio = contrast(foreground, background);
    const ok = ratio >= item.min;
    if (!ok) failures += 1;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${ratio.toFixed(2).padStart(5)} : 1  (需 ${item.min})  ${item.label}`);
  }
  return failures;
}

const lightFailures = run("淺色", light);
const darkFailures = run("深色", dark);
const failures = lightFailures + darkFailures;

console.log("\n== 參考值（不計入通過與否）");
for (const item of INFO) {
  for (const [name, tokens] of [["淺色", light], ["深色", dark]]) {
    const bg = compositeLayers(item.bg.map((key) => parseColor(tokens[key])));
    const ratio = contrast(parseColor(tokens[item.fg]), bg);
    console.log(`  ${ratio.toFixed(2).padStart(5)} : 1  ${name} ${item.label}`);
  }
}
console.log("  （進度條的資訊由旁邊的文字承載，填色本身屬裝飾性，故不設門檻）");

console.log(`\n${failures === 0 ? "對比度檢查通過" : `對比度未達標：${failures} 組`}`);
process.exit(failures === 0 ? 0 : 1);
