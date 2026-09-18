/**
 * 視覺巡檢：把 app 推到各種狀態拍下來，用來人工看過一遍。
 *
 *   npm run inspect              # 全部 13 個狀態
 *   npm run inspect -- english   # 只跑名稱含 english 的場景
 *
 * 輸出到 .inspect/（已 gitignore）。這些是開發時檢視用的，不進倉庫；
 * README 要用的圖走 npm run shots。
 *
 * 涵蓋幾種「光看程式碼看不出來」的狀態：拖曳到一半的滑動、游標停在標題上的
 * 透鏡、展開中的下拉、吐司、空狀態、窄螢幕、英文與簡體介面。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { openBrowser, sleep } from "./lib/browser.mjs";
import { demoItems, demoSettings, seedExpression } from "./lib/demo.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".inspect");
const APP = process.env.APP_URL || "http://localhost:4173/";
const filter = process.argv.slice(2).find((a) => !a.startsWith("-")) || "";

const day = 86400000;
const now = Date.now();

// 巡檢才需要這兩張：長答案（檢查換行與收合）與全新卡片（interval 0）
const EXTRA = [
  ["請完整說明鈉與水反應的現象，以及每一個現象背後的原因。",
    "浮：鈉的密度比水小；熔：反應放熱且鈉的熔點只有 97.8°C，因此熔成小球；游：生成的氫氣推動小球在水面游動；響：氫氣快速逸出發出聲響；紅：生成氫氧化鈉使酚酞變紅。常見錯誤是只記得浮與游，漏掉熔與紅，或把變紅說成石蕊。",
    "化學", 1, 1, now - day],
  ["電解熔融氯化鈉可以得到什麼？", "鈉和氯氣。", "化學", 0, 0, now - day],
];

const page = await openBrowser({ port: 9444, width: 900, height: 1220, theme: "light" });
const wanted = (name) => !filter || name.includes(filter);

async function seed(settings = demoSettings()) {
  await page.evaluate(seedExpression({ items: demoItems(EXTRA), settings }));
  await page.goto(APP);
}

try {
  await page.goto(APP);
  await seed();
  console.log(`巡檢輸出 → ${path.relative(ROOT, OUT)}/`);

  if (wanted("answer-revealed")) {
    await page.click('.task-card [data-action="reveal"]');
    await sleep(500);
    await page.shoot(OUT, "01-answer-revealed");
  }

  if (wanted("long-answer")) {
    await page.click('.task-card [data-action="reveal"]', 2);
    await sleep(600);
    await page.shoot(OUT, "02-long-answer");
  }

  if (wanted("manage-list")) {
    await page.scrollTo("#manageCard");
    await page.shoot(OUT, "03-manage-list");
  }

  if (wanted("row-dropdown")) {
    await page.click("#manageList .row-card .select-trigger");
    await sleep(600);
    await page.shoot(OUT, "04-row-dropdown");
    await page.evaluate('document.querySelector("#manageList .row-card .select-trigger").click()');
    await sleep(400);
  }

  if (wanted("toast")) {
    await page.scrollTo("#manageCard");
    await page.click('#manageList .row-card [data-action="delete"]');
    await sleep(700);
    await page.shoot(OUT, "05-toast-undo");
  }

  if (wanted("swipe")) {
    await page.scrollTo("#todayCard");
    await sleep(300);
    const card = await page.rectOf(".task-card");
    await page.drag({ x: card.x + 60, y: card.y }, [-30, -70, -110]);
    await page.shoot(OUT, "06-swipe-drag");
    await page.mouse("mouseReleased", card.x - 50, card.y + 4);
    await sleep(800);
  }

  if (wanted("lens")) {
    await page.evaluate("window.scrollTo(0, 0)");
    await sleep(600);
    const title = await page.rectOf(".large-title");
    await page.mouse("mouseMoved", title.x, title.y);
    await sleep(150);
    await page.mouse("mouseMoved", title.x + 30, title.y + 2);
    await sleep(500);
    await page.shoot(OUT, "07-lens-cursor");
  }

  if (wanted("english")) {
    await seed(demoSettings({ locale: "en" }));
    await page.shoot(OUT, "08-english");
  }

  if (wanted("simplified")) {
    await seed(demoSettings({ locale: "zh-Hans" }));
    await page.shoot(OUT, "09-simplified");
  }

  if (wanted("dark")) {
    await page.setTheme(true);
    await seed();
    await page.click('.task-card [data-action="reveal"]');
    await sleep(500);
    await page.shoot(OUT, "10-dark-revealed");
  }

  if (wanted("empty")) {
    await page.setTheme(false);
    await page.evaluate('localStorage.setItem("wengu.items.v1", "[]")');
    await page.goto(APP);
    await page.shoot(OUT, "11-empty");
  }

  if (wanted("settings")) {
    await seed();
    await page.click("#settingsButton");
    await sleep(600);
    await page.evaluate('document.querySelector("#settingsDialog .sheet-body").scrollTop = 9999');
    await sleep(500);
    await page.shoot(OUT, "12-settings-bottom");
  }

  if (wanted("narrow")) {
    await page.setViewport(390, 844);
    await seed();
    await sleep(400);
    await page.shoot(OUT, "13-narrow");
  }

  console.log("完成。");
} finally {
  await page.close();
}
