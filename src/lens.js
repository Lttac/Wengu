/**
 * 光標透鏡：蓋滿視口的 canvas，用 difference 混合把白盤底下的東西整片反相。
 * 機制取自 DeepSeek 官網首頁標語的交互（讀其源碼歸納），參數見 DESIGN.md 的 Motion 一節。
 *
 * 兩個關鍵約束：
 *  1. canvas 必須掛在 document.body，不能放進任何 backdrop-filter 容器裡，否則混合會被隔離。
 *  2. 不裁切。圓盤直徑一旦大於文字行高，裁切就會變成一條看得見的硬邊。
 */

export function mountLensCursor({
  radius = 22,
  target = '[data-cursor="blend"]',
  doc = globalThis.document,
  win = globalThis.window,
} = {}) {
  const noop = { destroy() {} };
  if (!doc?.createElement || !win) return noop;
  try {
    if (!win.matchMedia("(hover: hover) and (pointer: fine)").matches) return noop;
    if (win.matchMedia("(prefers-reduced-motion: reduce)").matches) return noop;
  } catch {
    return noop;
  }

  const canvas = doc.createElement("canvas");
  canvas.className = "lens-canvas";
  canvas.setAttribute("aria-hidden", "true");

  let ctx = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  if (!ctx) return noop;
  doc.body.appendChild(canvas);

  let tx = 0, ty = 0, cx = 0, cy = 0;
  let alpha = 0, targetAlpha = 0, scale = 0.62, targetScale = 0.62;
  let rafId = 0, lastX = 0, lastY = 0, lastR = 0;

  function clearPrev() {
    if (!lastR) return;
    ctx.clearRect(lastX - lastR - 2, lastY - lastR - 2, (lastR + 2) * 2, (lastR + 2) * 2);
  }

  function schedule() {
    if (!rafId && !doc.hidden) rafId = win.requestAnimationFrame(frame);
  }

  function frame() {
    rafId = 0;
    const dx = tx - cx;
    const dy = ty - cy;
    const ease = Math.hypot(dx, dy) < 50 ? 0.7 : 0.42;   // 近距離咬得更緊
    cx += dx * ease;
    cy += dy * ease;
    alpha += (targetAlpha - alpha) * 0.24;
    scale += (targetScale - scale) * 0.24;

    clearPrev();
    const r = radius * scale;
    if (alpha > 0.002) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      lastX = cx;
      lastY = cy;
      lastR = r;
    } else {
      lastR = 0;
    }

    const settled = Math.abs(dx) + Math.abs(dy) <= 0.1
      && Math.abs(targetAlpha - alpha) <= 0.002
      && Math.abs(targetScale - scale) <= 0.002;
    if (settled) {
      cx = tx; cy = ty; alpha = targetAlpha; scale = targetScale;
    } else {
      schedule();
    }
  }

  function onPointer(event) {
    const el = event.target instanceof win.Element ? event.target.closest(target) : null;
    if (!el) {
      targetAlpha = 0;
      if (alpha > 0.002 || lastR) schedule();
      return;
    }
    tx = event.clientX;
    ty = event.clientY;
    if (alpha <= 0.002 && !lastR) { cx = tx; cy = ty; }   // 首次出現直接就位
    targetAlpha = 1;
    targetScale = 1;
    schedule();
  }

  function fadeOut() {
    targetAlpha = 0;
    if (alpha > 0.002 || lastR) schedule();
  }

  function resize() {
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    const w = win.innerWidth;
    const h = win.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    alpha = 0; targetAlpha = 0; lastR = 0;
  }

  function onVisibility() {
    if (doc.hidden) {
      if (rafId) win.cancelAnimationFrame(rafId);
      rafId = 0;
    } else if (targetAlpha > 0 || alpha > 0.002) {
      schedule();
    }
  }

  doc.addEventListener("pointermove", onPointer, { passive: true });
  doc.addEventListener("pointerover", onPointer, { passive: true });
  doc.addEventListener("pointerleave", fadeOut, { passive: true });
  win.addEventListener("scroll", fadeOut, { passive: true });
  win.addEventListener("resize", resize);
  doc.addEventListener("visibilitychange", onVisibility);
  resize();

  return {
    destroy() {
      if (rafId) win.cancelAnimationFrame(rafId);
      doc.removeEventListener("pointermove", onPointer);
      doc.removeEventListener("pointerover", onPointer);
      doc.removeEventListener("pointerleave", fadeOut);
      win.removeEventListener("scroll", fadeOut);
      win.removeEventListener("resize", resize);
      doc.removeEventListener("visibilitychange", onVisibility);
      canvas.remove();
    },
  };
}
