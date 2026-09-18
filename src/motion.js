/**
 * 動效。所有時長與曲線都從 CSS token 讀，改 tokens.css 就同時改到這裡。
 * prefers-reduced-motion 下動畫退化為瞬時，光斑完全不掛載。
 */

let cachedTokens = null;

/**
 * CSS 時長 → 毫秒數字。
 * Element.animate 的 duration / delay 吃字串時，各家引擎的解析寬容度不一致；
 * 一律轉成數字最保險，轉不動就用後備值並留下訊息，不要讓整個動效層靜靜爆掉。
 */
export function ms(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  const text = String(value ?? "").trim();
  const match = text.match(/^([0-9]*\.?[0-9]+)(ms|s)$/);
  if (match) {
    const n = Number(match[1]);
    const millis = match[2] === "s" ? n * 1000 : n;
    if (Number.isFinite(millis) && millis >= 0) return millis;
  }
  console.warn(`[motion] 無法解析時長 ${JSON.stringify(value)}，改用 ${fallback}ms`);
  return fallback;
}

function media(query) {
  try {
    return globalThis.matchMedia?.(query) ?? null;
  } catch {
    return null;
  }
}

export function prefersReducedMotion() {
  return media("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

export function hasFinePointer() {
  return media("(hover: hover) and (pointer: fine)")?.matches ?? false;
}

export function motionOK() {
  return !prefersReducedMotion();
}

export function durations() {
  if (cachedTokens) return cachedTokens;
  const empty = { fast: "120ms", base: "220ms", slow: "320ms", exit: "400ms",
    ease: "cubic-bezier(0.32, 0.72, 0, 1)", easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
    springSnap: "linear(0, 1)", spring: "linear(0, 1)",
    springBounce: "linear(0, 1)", springSoft: "linear(0, 1)" };
  const root = globalThis.document?.documentElement;
  const styles = root && globalThis.getComputedStyle ? globalThis.getComputedStyle(root) : null;
  if (!styles) return empty;
  const read = (name, fallback) => (styles.getPropertyValue(name) || "").trim() || fallback;
  cachedTokens = {
    fast: read("--dur-1", empty.fast),
    base: read("--dur-2", empty.base),
    slow: read("--dur-3", empty.slow),
    exit: read("--dur-4", empty.exit),
    ease: read("--ease", empty.ease),
    easeOut: read("--ease-out", empty.easeOut),
    springSnap: read("--ease-spring-snap", empty.springSnap),
    spring: read("--ease-spring", empty.spring),
    springBounce: read("--ease-spring-bounce", empty.springBounce),
    springSoft: read("--ease-spring-soft", empty.springSoft),
  };
  return cachedTokens;
}

/**
 * 進場：從下方 10px 浮上來，帶 ζ0.62 的彈簧。
 * 過衝會被 easing 帶過頭一點再收回——位移夠大才看得見，所以起點不能太近。
 */
export function animateIn(el, delay = 0, duration) {
  if (!motionOK() || !el?.animate) return;
  const d = durations();
  el.animate(
    [{ opacity: 0, transform: "translateY(10px) scale(0.97)" }, { opacity: 1, transform: "none" }],
    { duration: ms(duration ?? d.slow, 420), delay: ms(delay, 0), easing: d.springBounce, fill: "backwards" },
  );
}

/**
 * 離場：微微脹一下（確認感），再縮小並把高度與上邊距塌掉。
 * 高度不塌，下方內容就會「啪」地跳一格。
 *
 * direction 非 0 時往該側飛出去（滑動評分用），from 是手指放開當下的位移，
 * 讓動畫從手指停住的位置接著跑，而不是跳回原點再出發。
 */
export function animateOut(el, { direction = 0, from = 0 } = {}) {
  if (!motionOK() || !el?.animate) return Promise.resolve();
  const d = durations();
  const height = el.offsetHeight;
  const marginTop = globalThis.getComputedStyle?.(el).marginTop || "0px";
  const travel = direction
    ? direction * Math.max(380, (globalThis.innerWidth || 800) * 0.9)
    : 0;
  const start = `translate3d(${from}px, 0, 0) rotate(${(from * 0.028).toFixed(2)}deg)`;
  const mid = `translate3d(${(from * 0.45).toFixed(1)}px, 0, 0) scale(1.012)`;
  const end = direction
    ? `translate3d(${travel}px, 0, 0) rotate(${direction * 7}deg) scale(0.96)`
    : "scale(0.94)";
  el.style.overflow = "hidden";
  const anim = el.animate([
    { height: `${height}px`, marginTop, opacity: 1, transform: start, offset: 0 },
    { height: `${height}px`, marginTop, opacity: 1, transform: mid, offset: 0.28 },
    { height: "0px", marginTop: "0px", opacity: 0, transform: end, offset: 1 },
  ], { duration: ms(d.exit, 400), easing: d.spring });
  return anim.finished ? anim.finished.catch(() => {}) : Promise.resolve();
}

/** 評分閃光：加語意色 class，動畫由 CSS 負責 */
export function flashCard(el, tone) {
  if (!el) return;
  el.classList.add(`flash-${tone}`);
}

/**
 * 跟隨指針的光斑：把座標寫進卡片的 --mx/--my，CSS 的 ::after 負責畫。
 * 用 rAF 節流，避免每個 pointermove 都觸發一次重繪。
 */
export function mountSpecular(target = globalThis.document) {
  if (!target?.addEventListener || !hasFinePointer() || prefersReducedMotion()) {
    return { destroy() {} };
  }
  let hovered = null;
  let pending = null;
  let rafId = 0;

  const apply = () => {
    rafId = 0;
    if (!pending) return;
    const rect = pending.el.getBoundingClientRect();
    pending.el.style.setProperty("--mx", `${pending.x - rect.left}px`);
    pending.el.style.setProperty("--my", `${pending.y - rect.top}px`);
    pending.el.style.setProperty("--hi", "1");
  };

  const onMove = (event) => {
    const el = event.target instanceof globalThis.Element
      ? event.target.closest(".glass-card, .task-card")
      : null;
    if (el !== hovered) {
      hovered?.style.setProperty("--hi", "0");
      hovered = el;
    }
    if (!el) return;
    pending = { el, x: event.clientX, y: event.clientY };
    if (!rafId) rafId = globalThis.requestAnimationFrame(apply);
  };

  target.addEventListener("pointermove", onMove, { passive: true });
  return {
    destroy() {
      target.removeEventListener("pointermove", onMove);
      if (rafId) globalThis.cancelAnimationFrame(rafId);
    },
  };
}
