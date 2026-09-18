/**
 * 產生 README 用的產品截圖。
 *
 *   npm run shots       # 需要先開好 npm run serve
 *
 * 截圖是「用示範資料重跑出來的」而不是手拍的，所以 UI 改了重跑就好。
 * 瀏覽器驅動在 scripts/lib/browser.mjs，示範資料在 scripts/lib/demo.mjs。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser, sleep } from "./lib/browser.mjs";
import { demoItems, demoSettings, seedExpression } from "./lib/demo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/screenshots");
const APP = process.env.APP_URL || "http://localhost:4173/";

const AI_SCRATCH = "鈉與水反應的現象：浮、熔、游、響、紅。常溫下鈉與氧氣反應生成氧化鈉，加熱則生成過氧化鈉。";

const page = await openBrowser({ port: 9333, width: 900, height: 1220, theme: "light" });

try {
  // 全新 profile，先塞示範資料再重新載入
  await page.goto(APP);
  await page.evaluate(seedExpression({ items: demoItems(), settings: demoSettings() }));
  await page.goto(APP);
  console.log(`產生截圖 → ${path.relative(ROOT, OUT)}/`);

  await page.shoot(OUT, "home-light");

  await page.setTheme(true);
  await sleep(800);
  await page.shoot(OUT, "home-dark");

  await page.setTheme(false);
  await sleep(800);
  await page.evaluate('document.querySelector("#composeCard .select-trigger").click()');
  await sleep(700);
  await page.shoot(OUT, "select-light");

  await page.evaluate('document.querySelector("#composeCard .select-trigger").click()');
  await sleep(300);
  await page.evaluate('document.querySelector("#aiGenerateButton").click()');
  await sleep(600);
  await page.evaluate(`(() => {
    const ta = document.querySelector("#aiDialog [data-field='text']");
    ta.value = ${JSON.stringify(AI_SCRATCH)};
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await sleep(400);
  await page.shoot(OUT, "ai-dialog");

  await page.evaluate('document.querySelector("#aiDialog").close()');
  await sleep(400);
  await page.evaluate('document.querySelector("#settingsButton").click()');
  await sleep(700);
  await page.shoot(OUT, "settings-light");

  console.log("完成。");
} finally {
  await page.close();
}
