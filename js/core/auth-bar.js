// js/core/auth-bar.js
// Neon Arcade – Auth Bar (responsive, compact, with back button + mobile drawer)
// Wymaga: auth.js (ArcadeAuth + ArcadeAuthUI) oraz opcjonalnie coins.js

(function () {
  function barHTML(backUrl) {
    return `
      <div class="arcade-topbar">
        <div class="arcade-topbar-inner">

          <div class="arcade-left">
            ${
              backUrl
                ? `<button class="arcade-back" type="button" data-back>
                     <span class="ico">←</span>
                     <span class="label">Arcade</span>
                   </button>`
                : ``
            }

            <div class="arcade-user">
              <span class="auth-status">Ładuję…</span>
              <span class="auth-coins" title="Diamenty">💎 –</span>
            </div>
          </div>

          <div class="arcade-auth" data-auth-drawer>
            <input
              type="email"
              class="arcade-input auth-email"
              placeholder="Email"
              autocomplete="email"
            />
            <input
              type="password"
              class="arcade-input auth-pass"
              placeholder="Hasło"
              autocomplete="current-password"
            />
            <input
              type="password"
              class="arcade-input auth-pass2"
              placeholder="Powtórz hasło"
              autocomplete="new-password"
              style="display:none"
            />

            <button class="arcade-btn auth-login btn-login" type="button">Login</button>
            <button class="arcade-btn auth-register btn-register" type="button">Załóż konto</button>
            <button class="arcade-btn guest auth-guest btn-guest" type="button">Gość</button>
            <button class="arcade-btn logout auth-logout" type="button" style="display:none">
              Wyloguj
            </button>

            <button class="auth-forgot btn-forgot" type="button">Przypomnij hasło</button>
            <span class="auth-error"></span>
          </div>

        </div>
      </div>
    `;
  }

  function initPanel(holder) {
    const backUrl = holder.getAttribute("data-back-url") || "";
    holder.innerHTML = barHTML(backUrl);

    const q = (s) => holder.querySelector(s);

    const topbar = q(".arcade-topbar");
    const drawer = q("[data-auth-drawer]");

    const email = q(".auth-email");
    const pass = q(".auth-pass");
    const pass2 = q(".auth-pass2");
    const status = q(".auth-status");
    const error = q(".auth-error");
    const coins = q(".auth-coins");

    const btnLogin = q(".auth-login");
    const btnRegister = q(".auth-register");
    const btnGuest = q(".auth-guest");
    const btnLogout = q(".auth-logout");
    const btnForgot = q(".auth-forgot");

    // Powrót do Arcade
    const backBtn = q("[data-back]");
    if (backBtn && backUrl) {
      backBtn.addEventListener("click", () => {
        window.location.href = backUrl;
      });
    }

    // MOBILE: klik "Login" ma rozwijać drawer (jeśli jest zwinięty)
    // Jeśli drawer jest otwarty albo to desktop — działa normalnie (ArcadeAuthUI przejmie logikę).
    btnLogin?.addEventListener(
      "click",
      () => {
        const isMobile = window.matchMedia("(max-width: 520px)").matches;
        if (!isMobile) return;

        // jeśli drawer jest zamknięty, otwórz i pokaż inputy
        if (!topbar.classList.contains("drawer-open")) {
          topbar.classList.add("drawer-open");
          // focus na email, żeby UX był szybki
          setTimeout(() => email?.focus(), 0);
        }
      },
      true // capture: nie blokujemy docelowego handlera, tylko najpierw otwieramy drawer
    );

    // Gdy klikniesz poza topbarem na mobile, można go zamknąć
    document.addEventListener("click", (e) => {
      const isMobile = window.matchMedia("(max-width: 520px)").matches;
      if (!isMobile) return;
      if (!topbar.classList.contains("drawer-open")) return;
      if (topbar.contains(e.target)) return;
      topbar.classList.remove("drawer-open");
    });

    // Inicjalizacja panelu auth + monety
    ArcadeAuthUI.initLoginPanel({
      email,
      pass,
      pass2,
      status,
      error,
      coins,
      btnLogin,
      btnRegister,
      btnGuest,
      btnLogout,
      btnForgot,

      // po login/logout zawsze odśwież (wg Twoich zasad)
      onLoginSuccess: () => window.location.reload(),
      onRegisterSuccess: () => window.location.reload(),
      onLogout: () => window.location.reload(),
      onGuest: () => window.location.reload(),
    });

    // Po każdej zmianie sesji: domknij drawer na mobile (żeby nie wisiał)
    if (window.ArcadeAuth?.onAuthStateChange) {
      window.ArcadeAuth.onAuthStateChange(() => {
        topbar.classList.remove("drawer-open");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-arcade-auth-bar]").forEach(initPanel);
  });
})();
