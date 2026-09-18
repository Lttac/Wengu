/**
 * 自訂屬性引用檢查（雙向）。
 *
 * CSS 的 var() 打錯字不會報錯，只會靜默回退成繼承值或 initial；反過來，
 * CSS 等一個 JS 永遠沒寫進去的變數，也一樣是安靜地壞掉。兩邊都要查。
 *
 *   定義處     = CSS 裡 `--x: value`
 *   執行時寫入 = JS 裡 setProperty("--x", ...)   ← 這些不需要 CSS 定義
 *   被引用     = CSS 的 var(--x) 或 JS 字串裡出現的 "--x"
 *
 *   npm run lint:tokens
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STYLE_DIR = path.join(ROOT, "src/styles");
const SRC_DIR = path.join(ROOT, "src");
const SHEETS = ["tokens.css", "spring.css", "app.css", "motion.css"];

const read = (file) => fs.readFileSync(file, "utf8");
const cssOf = (name) => read(path.join(STYLE_DIR, name));
/** 註解要先拿掉：註解裡寫的 `--x:` 會被當成定義，`var(--y)` 會被當成引用，
   兩者都會讓檢查失真。這件事已經害過一次（在註解裡舉反例，結果檢查去比對那段文字）。 */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, " ");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

const jsFiles = walk(SRC_DIR);
const jsText = stripComments(jsFiles.map((file) => `\n/* ${path.relative(ROOT, file)} */\n${read(file)}`).join(""));
const cssText = SHEETS.map((name) => stripComments(cssOf(name))).join("\n");

const DEFINITION = /(?:^|[;{\s])(--[\w-]+)\s*:/g;
const CSS_REFERENCE = /var\(\s*(--[\w-]+)/g;
const JS_REFERENCE = /["'`](--[\w-]+)["'`]/g;
const JS_WRITE = /setProperty\(\s*["'`](--[\w-]+)["'`]/g;

const defined = new Set();
for (const name of SHEETS) {
  for (const match of stripComments(cssOf(name)).matchAll(DEFINITION)) defined.add(match[1]);
}

const written = new Set();
for (const match of jsText.matchAll(JS_WRITE)) written.add(match[1]);

const referenced = new Set();
for (const match of cssText.matchAll(CSS_REFERENCE)) referenced.add(match[1]);
for (const match of jsText.matchAll(JS_REFERENCE)) referenced.add(match[1]);

const problems = [];

// 1. 被引用但沒有來源
for (const token of [...referenced].sort()) {
  if (defined.has(token) || written.has(token)) continue;
  problems.push(`${token} 被引用，但 CSS 沒定義、JS 也沒寫入`);
}

// 2. JS 寫了，但沒有任何 CSS 在讀（通常是改名後留下的孤兒）
for (const token of [...written].sort()) {
  if (!referenced.has(token)) problems.push(`${token} 由 JS 寫入，但沒有 CSS 在讀`);
}

// 3. 定義了卻沒人用。尺度與色盤本來就比用到得多，只提示不當錯。
const unused = [...defined].filter((token) => !referenced.has(token)).sort();

console.log(`自訂屬性：定義 ${defined.size}、JS 寫入 ${written.size}、被引用 ${referenced.size}`);
console.log(`JS 寫入的：${[...written].sort().join(" ")}`);
for (const problem of problems) console.log(`  [ERROR] ${problem}`);
if (unused.length) console.log(`  [INFO]  定義了但沒被引用：${unused.join(" ")}`);

if (problems.length) {
  console.log(`\n自訂屬性檢查失敗：${problems.length} 項`);
  process.exit(1);
}
console.log("\n自訂屬性檢查通過（CSS 定義、JS 寫入、雙向引用都對得上）");
