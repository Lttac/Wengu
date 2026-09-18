/**
 * 捲動連動效果：大標題縮小 + 玻璃條淡入 + 壁紙視差。
 *
 * 這是 iOS 最容易認出來的一組動作——大標題捲上去時收成細標題，
 * 同時浮出一條玻璃底。三者由同一個捲動進度驅動，所以永遠同步。
 *
 * 用 CSS 自訂屬性當載體：JS 只寫 --scroll-y / --title-scale / --header-glass，
 * 實際動畫都在 CSS，不必每幀改 style。
 */

const SHRINK_DISTANCE = 64;   // 前 64px 內完成所有變化
const TITLE_MIN_SCALE = 0.76;

export function mountScrollFx({ doc = globalThis.document, win = globalThis.window } = {}) {
  if (!doc?.documentElement || !win?.addEventListener) return { destroy() {} };

  let reduced = false;
  try {
    reduced = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    reduced = false;
  }

  const root = doc.documentElement;
  let rafId = 0;

  function apply() {
    rafId = 0;
    const y = Math.max(win.scrollY || 0, 0);
    const progress = Math.min(y / SHRINK_DISTANCE, 1);

    // 降低動效時保留玻璃條（純透明度），但關掉位移與視差
    root.style.setProperty("--scroll-y", reduced ? "0px" : `${y}px`);
    root.style.setProperty("--title-scale",
      reduced ? "1" : (1 - (1 - TITLE_MIN_SCALE) * progress).toFixed(3));
    root.style.setProperty("--header-glass", progress.toFixed(3));
  }

  function onScroll() {
    if (!rafId) rafId = win.requestAnimationFrame(apply);
  }

  win.addEventListener("scroll", onScroll, { passive: true });
  apply();

  return {
    destroy() {
      win.removeEventListener("scroll", onScroll);
      if (rafId) win.cancelAnimationFrame(rafId);
    },
  };
}
