// js/core/ui.js
// ArcadeUI — lekkie helpery UI

window.ArcadeUI = window.ArcadeUI || {};

/* Loader */
ArcadeUI.showLoading = () => {
  document.querySelectorAll("[data-arcade-wait]").forEach(el => el.style.display = "block");
};

ArcadeUI.hideLoading = () => {
  document.querySelectorAll("[data-arcade-wait]").forEach(el => el.style.display = "none");
};

/* Error */
ArcadeUI.setError = (msg) => {
  const el = document.querySelector("[data-arcade-error]");
  if (el) {
    el.textContent = msg;
    el.style.display = "block";
  }
};

ArcadeUI.clearError = () => {
  const el = document.querySelector("[data-arcade-error]");
  if (el) el.style.display = "none";
};

/* Render HTML */
ArcadeUI.renderHTML = (selector, html) => {
  const node = document.querySelector(selector);
  if (!node) return null;
  node.innerHTML = html;
  return node;
};

/* Animate number */
ArcadeUI.animateNumber = (el, to, duration = 300) => {
  const from = Number(el.textContent || 0);
  const start = performance.now();

  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.floor(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
};
