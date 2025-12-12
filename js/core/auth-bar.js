// js/core/auth-bar.js
// Neon Arcade Auth Bar v2 (z powrotem do Arcade)

(function () {
  function barHTML(backUrl) {
    return `
      <div class="arcade-topbar">
        <div class="arcade-topbar-inner">

          <button class="arcade-back" type="button">
            <span class="arrow">←</span>
            <span class="label">Arcade</span>
          </button>

          <div class="arcade-user">
            <span class="auth-status">Ładuję...</span>
            <span class="auth-coins"></span>
            <button class="auth-toggle">👤 Konto</button>
          </div>

          <div class="arcade-auth">
            <input type="email" class="arcade-input auth-email" placeholder="Email" />
            <input type="password" class="arcade-input auth-pass" placeholder="Hasło" />
            <input type="password" class="arcade-input auth-pass2" placeholder="Powtórz hasło" style="display:none" />

            <button class="arcade-btn auth-login">Zaloguj</button>
            <button class="arcade-btn auth-register">Załóż konto</button>
            <button class="arcade-btn guest auth-guest">Gość</button>
            <button class="arcade-btn logout auth-logout" style="display:none">Wyloguj</button>

            <button class="auth-forgot">Przypomnij hasło</button>
            <span class="auth-error"></span>
          </div>
        </div>
      </div>
    `;
  }

  function initPanel(holder) {
    const backUrl = holder.getAttribute("data-back-url") || "../../arcade.html";
    holder.innerHTML = barHTML(backUrl);

    const topbar = holder.querySelector(".arcade-topbar");
    const btnToggle = holder.querySelector(".auth-toggle");
    const btnBack = holder.querySelector(".arcade-back");

    btnBack.addEventListener("click", () => {
      window.location.href = backUrl;
    });

    btnToggle.addEventListener("click", () => {
      topbar.classList.toggle("drawer-open");
    });

    ArcadeAuthUI.initLoginPanel({
      email: holder.querySelector(".auth-email"),
      pass: holder.querySelector(".auth-pass"),
      pass2: holder.querySelector(".auth-pass2"),
      status: holder.querySelector(".auth-status"),
      error: holder.querySelector(".auth-error"),
      coins: holder.querySelector(".auth-coins"),
      btnLogin: holder.querySelector(".auth-login"),
      btnRegister: holder.querySelector(".auth-register"),
      btnGuest: holder.querySelector(".auth-guest"),
      btnLogout: holder.querySelector(".auth-logout"),
      btnForgot: holder.querySelector(".auth-forgot"),
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document
      .querySelectorAll("[data-arcade-auth-bar]")
      .forEach(initPanel);
  });
})();
