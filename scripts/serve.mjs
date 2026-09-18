/**
 * 極簡靜態伺服器，只為了本機開發。
 * 不能直接雙擊 index.html 的情況（例如瀏覽器對 file:// 的模組限制），用這個跑：
 *
 *   npm run serve      → http://localhost:4173/
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_PORT = Number(process.env.PORT || 4173);
const SHOULD_OPEN = !process.argv.includes("--no-open") && process.env.NO_OPEN !== "1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function openBrowser(url) {
  try {
    const [command, args] = process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
    spawn(command, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    // 開不了瀏覽器不算錯誤，使用者自己貼上網址就好
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `localhost:${port}`}`);
  let filePath = path.join(ROOT, decodeURIComponent(url.pathname));

  // 路徑逃逸防護：解析後必須仍在專案根目錄內
  const relative = path.relative(ROOT, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("403 Forbidden");
    return;
  }

  try {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    // 交給下面的 readFile 統一處理 404
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(`404 Not Found: ${url.pathname}`);
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      // no-store 而非 no-cache：本機開發時最惱人的就是「改了檔案但瀏覽器還在跑舊模組」。
      // no-cache 只要求重新驗證，而這個伺服器不送 ETag / Last-Modified，
      // 瀏覽器就有空間直接用快取的副本——ES 模組尤其容易中招。
      "Cache-Control": "no-store, must-revalidate",
    });
    response.end(data);
  });
});

let port = BASE_PORT;
let attempts = 0;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE" && attempts < 10) {
    attempts += 1;
    port += 1;
    console.log(`埠 ${port - 1} 已被占用，改用 ${port}`);
    server.listen(port);
    return;
  }
  console.error(`無法啟動伺服器：${error.message}`);
  process.exitCode = 1;
});

server.on("listening", () => {
  const url = `http://localhost:${port}/`;
  console.log(`溫故 → ${url}`);
  console.log("按 Ctrl+C 結束（關掉這個視窗也會結束）");
  if (SHOULD_OPEN) openBrowser(url);
});

server.listen(port);
