/* SITARA Mensetkab shared shell behavior.
   Stabilizes in-app navigation and restores sidebar scroll without competing writes. */
(function () {
  "use strict";

  const KEY = "sitaraMensetkabSidebarScroll";
  const TRANSITION_MS = 180;
  let navigating = false;

  const nav = document.querySelector(".sidebar-nav");

  function safeStoreScroll(value) {
    try {
      sessionStorage.setItem(KEY, String(Math.max(0, Number(value) || 0)));
    } catch (_) {}
  }

  function readSavedScroll() {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved === null) return null;
      const value = Number(saved);
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch (_) {
      return null;
    }
  }

  function restoreScroll() {
    if (!nav) return;
    const saved = readSavedScroll();
    if (saved === null) return;

    // Clamp against the current page's scroll range so a shorter sidebar cannot
    // force repeated browser/layout corrections while the page is rendering.
    const maxScroll = Math.max(0, nav.scrollHeight - nav.clientHeight);
    nav.scrollTop = Math.min(saved, maxScroll);
  }

  function onPageReady() {
    // One controlled restore after the first layout; do not queue competing RAFs.
    restoreScroll();
    document.body.classList.add("sitara-page-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      window.requestAnimationFrame(onPageReady);
    }, { once: true });
  } else {
    window.requestAnimationFrame(onPageReady);
  }

  // pages restored from the back-forward cache retain their DOM; do not animate
  // or reset their sidebar position a second time.
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      if (nav) safeStoreScroll(nav.scrollTop);
      document.body.classList.remove("sitara-page-leaving");
      document.body.classList.add("sitara-page-ready");
    }
  });

  if (nav) {
    nav.addEventListener("scroll", function () {
      safeStoreScroll(nav.scrollTop);
    }, { passive: true });
  }

  // Intercept only approved internal navigation links. preventDefault() must run
  // synchronously inside the click event; deferring it allows native navigation
  // to race the transition and can cause the shell to flicker.
  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || navigating) return;

    const target = event.target;
    if (!target || typeof target.closest !== "function") return;

    const link = target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download") ||
        link.getAttribute("aria-disabled") === "true" ||
        link.dataset.noTransition === "true" || link.hasAttribute("data-no-transition")) return;

    const isMenuNavigation = link.matches(
      ".sidebar-nav .nav-item, .btn-view-all, .btn-open, .back-link"
    );
    if (!isMenuNavigation) return;

    const rawHref = link.getAttribute("href");
    if (!rawHref || rawHref === "#" || /^javascript:/i.test(rawHref)) return;

    let destination;
    try {
      destination = new URL(rawHref, window.location.href);
    } catch (_) {
      return;
    }

    if (destination.origin !== window.location.origin) return;
    if (destination.pathname === window.location.pathname &&
        destination.search === window.location.search &&
        destination.hash === window.location.hash) return;

    // Stop the native navigation immediately; only this handler owns the delay.
    event.preventDefault();
    navigating = true;

    if (nav) safeStoreScroll(nav.scrollTop);
    document.body.classList.add("sitara-page-leaving");

    window.setTimeout(function () {
      window.location.assign(destination.href);
    }, TRANSITION_MS);
  }, false);
})();
