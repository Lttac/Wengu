/**
 * DESIGN.md 結構檢查。
 * 設計文件會隨專案演進而漂移；這支腳本讓「文件還準不準」變成可執行的事實。
 *
 *   npm run lint:design
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "DESIGN.md");

const REQUIRED_SECTIONS = [
  "Overview", "Colors", "Typography", "Layout",
  "Elevation & Depth", "Shapes", "Components", "Do's and Don'ts",
];
const CANONICAL_KEYS = ["version", "name", "description", "colors", "typography", "rounded", "spacing", "components"];
const REF_ALIASES = { component: "components" };
const REF = /\{([A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+)+)\}/g;
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC_COLOR = /^(?:rgba?|hsla?)\(\s*[0-9.,%\s/]+\)$/i;
const PLACEHOLDER = /(?<![A-Za-z0-9_-])(TODO|TO_FILL|FIXME)(?![A-Za-z0-9_-])/;

const errors = [];
const warnings = [];

const text = fs.readFileSync(FILE, "utf8");

function stripComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || line[i - 1] === " " || line[i - 1] === "\t")) {
      return line.slice(0, i);
    }
  }
  return line;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith("{") && value.endsWith("}")) {
    const out = {};
    for (const part of value.slice(1, -1).split(",")) {
      const index = part.indexOf(":");
      if (index < 0) continue;
      const key = part.slice(0, index).trim().replace(/^["']|["']$/g, "");
      if (key) out[key] = parseScalar(part.slice(index + 1));
    }
    return out;
  }
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(source) {
  const root = {};
  const stack = [[-1, root]];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line.trim() || line.trim().startsWith("- ")) continue;
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    const index = trimmed.indexOf(":");
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    while (stack.length > 1 && indent <= stack.at(-1)[0]) stack.pop();
    const parent = stack.at(-1)[1];
    if (value === "") {
      const child = {};
      parent[key] = child;
      stack.push([indent, child]);
    } else {
      parent[key] = parseScalar(value);
    }
  }
  return root;
}

// ---- frontmatter ----------------------------------------------------------
if (!text.startsWith("---")) {
  errors.push("缺少 YAML frontmatter");
}
const parts = text.split(/^---\s*$/m);
const frontmatter = parts.length >= 3 ? parseFrontmatter(parts[1]) : {};
const body = parts.length >= 3 ? parts.slice(2).join("---") : text;

for (const key of CANONICAL_KEYS) {
  if (!frontmatter[key]) errors.push(`frontmatter 缺少 ${key}`);
}
for (const key of Object.keys(frontmatter)) {
  if (!CANONICAL_KEYS.includes(key)) warnings.push(`frontmatter 多了非標準鍵 ${key}`);
}

const colors = frontmatter.colors || {};
for (const [name, value] of Object.entries(colors)) {
  if (typeof value !== "string") continue;
  const ok = HEX.test(value) || FUNC_COLOR.test(value) || REF.test(value) || value === "transparent";
  if (!ok) errors.push(`colors.${name} = ${value} 不是合法色值`);
  REF.lastIndex = 0;
}

// ---- 章節 -----------------------------------------------------------------
const sections = [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].replace(/[’‘]/g, "'").toLowerCase());
for (const section of REQUIRED_SECTIONS) {
  if (!sections.includes(section.replace(/[’‘]/g, "'").toLowerCase())) {
    errors.push(`缺少章節 ## ${section}`);
  }
}
if (!sections.includes("iteration guide")) warnings.push("建議補上 ## Iteration Guide");

// ---- token 引用 -----------------------------------------------------------
const flatten = (node, prefix = "") => Object.entries(node).flatMap(([key, value]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return [path, ...(value && typeof value === "object" ? flatten(value, path) : [])];
});
const defined = new Set(flatten(frontmatter));
const scan = text.replace(/<!--[\s\S]*?-->/g, "");

for (const match of scan.matchAll(REF)) {
  const ref = match[1];
  const [head, ...rest] = ref.split(".");
  if (defined.has(ref) || defined.has(`${REF_ALIASES[head] || head}.${rest.join(".")}`)) continue;
  if (head === "token") continue;                      // Iteration Guide 裡的元語法示例
  warnings.push(`token 引用 {${ref}} 未定義`);
}

// ---- 佔位符 ---------------------------------------------------------------
if (PLACEHOLDER.test(text)) errors.push("文件仍有未填寫的 TODO / TO_FILL");

// ---- 其他必備敘述 ---------------------------------------------------------
if (!/44\s*px/.test(text)) warnings.push("未提到 44px 觸控目標");
if (!/box-shadow|陰影/.test(text)) warnings.push("未描述陰影系統");
if (!/substitut|替代/i.test(text)) warnings.push("未描述字體替代方案");

// ---- 輸出 -----------------------------------------------------------------
for (const warning of warnings) console.log(`  [WARN]  ${warning}`);
for (const error of errors) console.log(`  [ERROR] ${error}`);

console.log(`\nDESIGN.md：${errors.length} 個錯誤、${warnings.length} 個警告`);
if (errors.length) process.exit(1);
console.log("設計文件結構檢查通過");
