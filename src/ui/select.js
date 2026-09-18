/**
 * 把原生 <select> 升級成主題化的下拉。
 *
 * 做法是「包起來、不取代」：原生 select 仍留在 DOM 裡當唯一事實來源，
 * 只是視覺上被藏起來。既有程式照舊寫 select.value、照舊監聽 change，
 * 不需要為了換皮而改動任何商業邏輯——這是這個模組最重要的設計約束。
 *
 * 原生 select 的展開清單由作業系統繪製（灰底、系統字體），與玻璃材質完全衝突，
 * 這是非換不可的理由。
 */

const registry = new WeakMap();

const CHECK = '<svg class="icon select-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6.5 9.6 17 4 11.4"/></svg>';
const CHEVRON = '<svg class="icon select-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

export function enhanceSelect(select) {
  if (!select || registry.has(select) || select.dataset.enhanced === "true") return registry.get(select) || null;
  const doc = select.ownerDocument;

  const wrap = doc.createElement("div");
  wrap.className = "select";
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);
  select.classList.add("select-native");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  select.dataset.enhanced = "true";

  const trigger = doc.createElement("button");
  trigger.type = "button";
  trigger.className = "field select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const label = select.getAttribute("aria-label");
  if (label) trigger.setAttribute("aria-label", label);
  trigger.innerHTML = `<span class="select-value"></span>${CHEVRON}`;
  wrap.appendChild(trigger);

  const menu = doc.createElement("div");
  menu.className = "select-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  wrap.appendChild(menu);

  const valueEl = trigger.querySelector(".select-value");
  let open = false;

  const options = () => [...select.options];
  const isOpen = () => open;

  function setOpen(next) {
    if (next === open) return;
    open = next;
    menu.hidden = !next;
    trigger.setAttribute("aria-expanded", String(next));
    wrap.dataset.open = String(next);
    if (next) {
      const current = menu.querySelector('[aria-selected="true"]') || menu.querySelector(".select-option");
      current?.focus();
    }
  }

  function choose(value) {
    if (select.value !== value) {
      select.value = value;
      const EventCtor = doc.defaultView?.Event || globalThis.Event;
      select.dispatchEvent(new EventCtor("change", { bubbles: true }));
    }
    sync();
    setOpen(false);
    trigger.focus();
  }

  /** 把原生 select 的選項與目前值同步到自製 UI */
  function sync() {
    const list = options();
    valueEl.textContent = list.find((o) => o.value === select.value)?.textContent ?? "";
    menu.innerHTML = "";
    for (const option of list) {
      const item = doc.createElement("button");
      item.type = "button";
      item.className = "select-option";
      item.setAttribute("role", "option");
      item.dataset.value = option.value;
      item.setAttribute("aria-selected", String(option.value === select.value));
      const text = doc.createElement("span");
      text.textContent = option.textContent;
      item.append(text);
      item.insertAdjacentHTML("beforeend", CHECK);
      item.addEventListener("click", () => choose(option.value));
      menu.appendChild(item);
    }
  }

  function move(delta) {
    const items = [...menu.querySelectorAll(".select-option")];
    if (!items.length) return;
    const index = items.indexOf(doc.activeElement);
    const next = index < 0 ? (delta > 0 ? 0 : items.length - 1)
      : (index + delta + items.length) % items.length;
    items[next].focus();
  }

  trigger.addEventListener("click", () => setOpen(!isOpen()));
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen()) setOpen(true);
      else move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Escape" && isOpen()) {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  });
  menu.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.focus();
    }
  });

  const onDocPointerDown = (event) => {
    if (!isOpen() || wrap.contains(event.target)) return;
    setOpen(false);
  };
  doc.addEventListener("pointerdown", onDocPointerDown, true);

  select.addEventListener("change", sync);
  // 程式碼可能只換 innerHTML 或直接指定 value（renderer 就是這樣做的），
  // 兩者都不會觸發 change，所以再監看一次子節點。
  // 沒有 MutationObserver 也不該壞掉——那只代表程式改選項後要手動 sync()
  const Observer = doc.defaultView?.MutationObserver || globalThis.MutationObserver;
  const observer = Observer ? new Observer(sync) : null;
  observer?.observe(select, { childList: true });

  sync();
  const api = {
    sync,
    close: () => setOpen(false),
    element: wrap,
    destroy() {
      observer?.disconnect();
      doc.removeEventListener("pointerdown", onDocPointerDown, true);
      registry.delete(select);
    },
  };
  registry.set(select, api);
  return api;
}

/** 掃描整份文件，把還沒升級的 select 全部升級（可重複呼叫） */
export function enhanceAll(root = globalThis.document) {
  if (!root?.querySelectorAll) return [];
  return [...root.querySelectorAll("select:not([data-enhanced])")].map(enhanceSelect).filter(Boolean);
}
