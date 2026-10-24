(function () {
  "use strict";
  function initHistoryMonthDropdown() {
    const select = document.getElementById("historyMonthFilter");
    const wrap = select && select.closest(".history-month-wrap");
    if (!select || !wrap || select.dataset.customDropdown === "true") return;
    select.dataset.customDropdown = "true";
    select.classList.add("history-native-select");

    const host = document.createElement("div");
    host.className = "history-month-custom";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "history-month-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const chevron = document.createElement("i");
    chevron.className = "history-month-trigger-chevron";
    chevron.setAttribute("data-lucide", "chevron-down");
    const menu = document.createElement("div");
    menu.className = "history-month-menu";
    menu.setAttribute("role", "listbox");
    host.append(trigger, chevron, menu);
    select.parentNode.insertBefore(host, select);

    function close() {
      host.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
    function sync() {
      const current =
        Array.from(select.options).find((o) => o.value === select.value) ||
        select.options[0];
      trigger.textContent = current ? current.textContent : "Semua Bulan";
      trigger.appendChild(chevron);
      menu.querySelectorAll(".history-month-option").forEach((item) => {
        const active = item.dataset.value === select.value;
        item.classList.toggle("active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      if (window.lucide) window.lucide.createIcons({ nodes: [chevron] });
    }
    function rebuild() {
      const selected = select.value;
      menu.replaceChildren();
      Array.from(select.options).forEach((option) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "history-month-option";
        item.dataset.value = option.value;
        item.textContent = option.textContent;
        item.setAttribute("role", "option");
        item.addEventListener("click", () => {
          select.value = option.value;
          sync();
          close();
          select.dispatchEvent(new Event("change", { bubbles: true }));
          trigger.focus();
        });
        menu.appendChild(item);
      });
      if (Array.from(select.options).some((o) => o.value === selected))
        select.value = selected;
      sync();
    }
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const opening = !host.classList.contains("open");
      if (opening) rebuild();
      host.classList.toggle("open", opening);
      trigger.setAttribute("aria-expanded", opening ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      if (!host.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        close();
        trigger.focus();
      }
    });
    select.addEventListener("change", sync);
    new MutationObserver(rebuild).observe(select, { childList: true });
    rebuild();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", initHistoryMonthDropdown);
  else initHistoryMonthDropdown();
})();
