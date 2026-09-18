/**
 * 吐司。用一句話交代「剛剛發生了什麼」，並可帶一個動作（目前用於刪除後撤銷）。
 */

export function createToasts({ root = globalThis.document?.body, duration = 5200 } = {}) {
  if (!root) return { show() {}, clear() {} };

  const doc = globalThis.document;
  const stack = doc.createElement("div");
  stack.className = "toast-stack";
  stack.setAttribute("role", "status");
  stack.setAttribute("aria-live", "polite");
  root.appendChild(stack);

  const live = new Set();

  function dismiss(node) {
    if (!node || !live.has(node)) return;
    live.delete(node);
    node.classList.add("leaving");
    setTimeout(() => node.remove(), 220);
  }

  function show(message, { actionLabel, onAction, durationMs = duration } = {}) {
    const node = doc.createElement("div");
    node.className = "toast";

    const text = doc.createElement("span");
    text.textContent = message;
    node.appendChild(text);

    if (actionLabel) {
      const action = doc.createElement("button");
      action.type = "button";
      action.className = "btn btn-inline";
      action.textContent = actionLabel;
      action.addEventListener("click", () => {
        dismiss(node);
        onAction?.();
      });
      node.appendChild(action);
    }

    stack.appendChild(node);
    live.add(node);
    if (durationMs > 0) setTimeout(() => dismiss(node), durationMs);
    return () => dismiss(node);
  }

  return { show, clear: () => [...live].forEach(dismiss) };
}
