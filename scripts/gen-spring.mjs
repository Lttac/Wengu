/**
 * 阻尼彈簧 → CSS linear() 取樣器。
 *
 * 為什麼要自己算：CSS 內建的 easing 全是單調曲線（ease-out、cubic-bezier），
 * 而 iOS 的「靈動」來自彈簧——速度曲線會先衝過頭再收回來。用 linear() 把
 * 阻尼振盪器取樣成關鍵點，就能在 CSS 與 Web Animations 裡直接當 easing 用。
 *
 *   node scripts/gen-spring.mjs        # 重新產生 src/styles/spring.css
 *
 * 產生出來的檔案是commit進倉庫的——執行時不需要跑這支腳本，
 * 只有要調整彈簧手感時才重跑。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @param damping ζ：1 = 臨界阻尼（不過衝），< 1 才會回彈。iOS 多在 0.75~1.0。
 * @param response 響應時間（秒）：越小越急。0.3 = 很快，0.5 = 從容。
 * @param samples 取樣點數。48 點在 60fps 下已看不出折線。
 */
function spring({ damping = 0.85, response = 0.4, samples = 48 } = {}) {
  const w0 = (2 * Math.PI) / response;
  const total = response * 2.4;          // 取樣長度，末端已收斂到 1
  const points = [];

  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * total;
    let value;
    if (damping >= 1) {
      // 臨界阻尼：不會過衝，速度曲線仍是彈簧
      value = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    } else {
      const wd = w0 * Math.sqrt(1 - damping * damping);
      value = 1 - Math.exp(-damping * w0 * t)
        * (Math.cos(wd * t) + ((damping * w0) / wd) * Math.sin(wd * t));
    }
    points.push({ percent: (i / samples) * 100, value });
  }

  points[points.length - 1] = { percent: 100, value: 1 };
  const body = points
    .map((p, i) => {
      const v = Number(p.value.toFixed(4));
      if (i === 0) return "0";
      if (i === points.length - 1) return "1";
      return `${v} ${Number(p.percent.toFixed(1))}%`;
    })
    .join(", ");
  return `linear(${body})`;
}

const SETS = [
  { name: "--ease-spring-snap", note: "ζ1.0、0.30s：按壓下沉，臨界阻尼不過衝", damping: 1, response: 0.3 },
  { name: "--ease-spring", note: "ζ0.78、0.42s：一般進場與揭示", damping: 0.78, response: 0.42 },
  { name: "--ease-spring-bounce", note: "ζ0.62、0.46s：手勢釋放與卡片進場，過衝看得見", damping: 0.62, response: 0.46 },
  { name: "--ease-spring-soft", note: "ζ0.92、0.5s：面板與吐司，幾乎不過衝", damping: 0.92, response: 0.5 },
];

const peakOf = (set) => {
  const values = spring(set).slice(7, -1).split(",").map((p) => Number(p.trim().split(" ")[0]));
  return Math.max(...values);
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(ROOT, "src/styles/spring.css");

const body = SETS.map((set) => {
  const peak = peakOf(set);
  const note = `${set.note}｜峰值 ${peak.toFixed(4)}${peak > 1.001 ? "（會過衝）" : "（不過衝）"}`;
  return `  /* ${note} */\n  ${set.name}: ${spring(set)};`;
}).join("\n\n");

const css = `/* 彈簧曲線 —— 由 scripts/gen-spring.mjs 產生，不要手改。
 *
 * CSS 內建的 easing 全是單調曲線，而 iOS 的靈動來自彈簧：速度快到會衝過頭再收回來。
 * 這裡把阻尼振盪器取樣成 linear()，CSS 與 Web Animations 都能直接當 easing 用。
 * 要調手感就改腳本裡的 damping / response，然後 node scripts/gen-spring.mjs。
 */

:root {
${body}
}
`;

fs.writeFileSync(TARGET, css, "utf8");
console.log(`已寫入 ${path.relative(ROOT, TARGET)}（${SETS.length} 條曲線）`);
for (const set of SETS) console.log(`  ${set.name.padEnd(22)} 峰值 ${peakOf(set).toFixed(4)}`);
