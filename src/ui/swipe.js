/**
 * 滑動評分：卡片跟著手指走、橡皮筋抵抗、放開後依距離與速度決定去留。
 *
 * 這是介面裡唯一「手勢驅動」的動效，也是 iOS 靈動感真正來源的一半：
 * 動畫不是播放出來的，而是手指位置的連續函式——純 CSS 轉場做不到這件事。
 *
 * 觸控交給 CSS 的 touch-action: pan-y，垂直捲動優先，橫向才歸這裡。
 */

import { durations, ms } from "../motion.js";

export const COMMIT_PX = 92;          // 越過這個距離就判定要評分
export const RUBBER_PX = 150;         // 超過之後開始阻尼：拉得動，但拉不遠
export const COMMIT_VELOCITY = 0.45;  // px/ms，甩得夠快就算距離不足也判定
const AXIS_LOCK_PX = 8;               // 位移超過這麼多才決定是橫向還是縱向

/** 超過 RUBBER_PX 之後每多拉 1px 只前進 0.32px——手感上的「拉不動了」 */
export function rubber(dx) {
  const distance = Math.abs(dx);
  if (distance <= RUBBER_PX) return dx;
  return Math.sign(dx) * (RUBBER_PX + (distance - RUBBER_PX) * 0.32);
}

export function mountSwipe({ root, onCommit, doc = globalThis.document } = {}) {
  if (!root?.addEventListener) return { destroy() {} };

  const view = doc.defaultView || globalThis;
  const now = () => (view.performance?.now ? view.performance.now() : Date.now());
  let drag = null;

  const asElement = (node) => (node instanceof globalThis.Element ? node : null);

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = asElement(event.target);
    const card = target?.closest(".task-card");
    if (!card || !root.contains(card)) return;
    // 按鈕上的拖曳不當滑動，否則想按「困難」會誤觸
    if (target.closest(".btn")) return;
    if (card.classList.contains("swiping")) return;

    drag = {
      card,
      id: Number(card.dataset.id),
      x0: event.clientX,
      y0: event.clientY,
      t0: now(),
      dx: 0,
      axis: null,
      pointerId: event.pointerId,
    };
  }

  function paint(event) {
    const offset = rubber(drag.dx);
    const progress = Math.min(Math.abs(offset) / COMMIT_PX, 1);
    const rect = drag.card.getBoundingClientRect();

    drag.card.style.transform = `translate3d(${offset}px, 0, 0) rotate(${(offset * 0.028).toFixed(2)}deg)`;
    drag.card.style.setProperty("--swipe", progress.toFixed(3));
    // 閃光起點跟著手指，顏色像是從按下去的地方漫出來
    drag.card.style.setProperty("--fx", `${Math.round(event.clientX - rect.left)}px`);
    drag.card.style.setProperty("--fy", `${Math.round(event.clientY - rect.top)}px`);
    drag.card.classList.toggle("swiping-left", drag.dx < 0);
    drag.card.classList.toggle("swiping-right", drag.dx > 0);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.x0;
    const dy = event.clientY - drag.y0;

    if (!drag.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      // 縱向手勢交給瀏覽器捲動，這次拖曳直接放棄
      drag.axis = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
      if (drag.axis === "y") {
        drag = null;
        return;
      }
      drag.card.classList.add("swiping");
      try {
        drag.card.setPointerCapture?.(drag.pointerId);
      } catch {
        // 抓不到就算了，滑動照樣能用——capture 只是讓手指移出卡片後仍收到事件
      }
    }

    drag.dx = dx;
    paint(event);
  }

  /**
   * 釋放 pointer capture。
   * 這裡曾經是本模組最致命的一行：原本寫成 card.releasePointerCapture?.(drag?.pointerId)，
   * 而呼叫時 drag 已經被設成 null，等於傳 undefined 進去 → 瀏覽器丟 NotFoundError →
   * 整個 pointerup 處理器當場中止 → 卡片就留在拖到一半的位置（「滑動後卡片卡住」）。
   * 兩道防線：只在自己的 pointerId 真的被捕捉時才釋放，而且任何錯誤都不往外丟。
   */
  function releaseCapture(card, pointerId) {
    if (pointerId === undefined || pointerId === null) return;
    try {
      if (card.hasPointerCapture?.(pointerId)) card.releasePointerCapture(pointerId);
    } catch {
      // 已經自動釋放、或這個環境不支援——都不是錯誤
    }
  }

  /** 把卡片恢復成「什麼都沒發生」的樣子。任何收尾失敗都走這裡。 */
  function resetCard(card) {
    card.classList.remove("swiping", "swiping-left", "swiping-right");
    card.style.removeProperty("--swipe");
    card.style.removeProperty("transform");
    card.style.removeProperty("--fx");
    card.style.removeProperty("--fy");
  }

  function springBack(card, dx) {
    if (!card.animate) {
      resetCard(card);
      return;
    }
    const d = durations();
    const from = `translate3d(${rubber(dx)}px, 0, 0) rotate(${(rubber(dx) * 0.028).toFixed(2)}deg)`;
    const anim = card.animate(
      [{ transform: from }, { transform: "none" }],
      { duration: ms(d.slow, 420), easing: d.springBounce, fill: "none" },
    );
    const done = () => resetCard(card);
    if (anim.finished) anim.finished.then(done).catch(done);
    else done();
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;

    // 收尾整段包起來：手勢出錯絕對不能讓畫面停在半路
    try {
      if (current.axis !== "x") {
        resetCard(current.card);
        return;
      }
      const elapsed = Math.max(now() - current.t0, 1);
      const velocity = current.dx / elapsed;
      const passed = Math.abs(current.dx) > COMMIT_PX || Math.abs(velocity) > COMMIT_VELOCITY;

      releaseCapture(current.card, current.pointerId);
      current.card.classList.remove("swiping", "swiping-left", "swiping-right");
      current.card.style.removeProperty("--swipe");

      if (!passed) {
        springBack(current.card, current.dx);
        return;
      }
      onCommit?.({
        id: current.id,
        direction: current.dx < 0 ? -1 : 1,
        card: current.card,
        dx: current.dx,
        velocity,
      });
    } catch (err) {
      console.warn("[swipe] 手勢收尾失敗，已把卡片回復原位", err);
      resetCard(current.card);
    }
  }

  function onPointerCancel(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;
    try {
      releaseCapture(current.card, current.pointerId);
      springBack(current.card, current.dx);
    } catch {
      resetCard(current.card);
    }
  }

  root.addEventListener("pointerdown", onPointerDown, { passive: true });
  root.addEventListener("pointermove", onPointerMove);
  // 掛在 window 而非 root：手指在卡片外（甚至視窗外）放開時，事件才收得到
  view.addEventListener("pointerup", onPointerUp, true);
  view.addEventListener("pointercancel", onPointerCancel, true);

  return {
    destroy() {
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      view.removeEventListener("pointerup", onPointerUp, true);
      view.removeEventListener("pointercancel", onPointerCancel, true);
    },
  };
}
