// js/core/auth-bar.js
// Pasek logowania + integracja z ArcadeAuthUI

(function () {
  function barHTML() {
    return `
      <div class="arcade-topbar">
        <div class="auth-status">
          Ładuję status...
        </div>
        <div class="auth-controls">
          <input
            type="email"
            class="auth-email arcade-input"
            placeholder="Email"
          />
          <input
            type="password"
            class="auth-pass arcade-input"
            placeholder="Hasło"
          />
          <input
            type="password"
            class="auth-pass2 arcade-input"
            placeholder="Powtórz hasło"
            style="display:none"
          />

          <button class="arcade-btn auth-login">Zaloguj</button>
          <button class="arcade-btn auth-register">Utwórz konto</button>
          <button class="arcade-btn auth-guest">Gość</button>
          <button class="arcade-btn auth-logout" style="display:none">Wyloguj</button>

          <span
            class="auth-forgot"
            style="cursor:pointer;font-size:11px;opacity:0.8;margin-left:8px;"
          >
            Przypomnij hasło
          </span>

          <span class="auth-error" style="margin-left:8px;font-size:11px;color:#fca5a5;"></span>
        </div>
      </div>
    `;
  }

  function initPanel(holder) {
    holder.innerHTML = barHTML();

    const email = holder.querySelector(".auth-email");
    const pass = holder.querySelector(".auth-pass");
    const pass2 = holder.querySelector(".auth-pass2");
    const status = holder.querySelector(".auth-status");
    const error = holder.querySelector(".auth-error");

    const btnLogin = holder.querySelector(".auth-login");
    const btnRegister = holder.querySelector(".auth-register");
    const btnGuest = holder.querySelector(".auth-guest");
    const btnLogout = holder.querySelector(".auth-logout");
    const btnForgot = holder.querySelector(".auth-forgot");

    const checkHash = holder.hasAttribute("data-check-signup-hash");

    // tryb logowanie / rejestracja
    let mode = "login";

    function switchToLoginMode() {
      mode = "login";
      pass2.style.display = "none";
      btnLogin.textContent = "Zaloguj";
      btnRegister.textContent = "Utwórz konto";
    }

    function switchToRegisterMode() {
      mode = "register";
      pass2.style.display = "inline-block";
      btnLogin.textContent = "Zarejestruj";
      btnRegister.textContent = "Mam konto – zaloguj";
    }

    // przełącznik trybu logowanie/rejestracja
    btnRegister.addEventListener("click", () => {
      if (mode === "login") {
        switchToRegisterMode();
      } else {
        switchToLoginMode();
      }
    });

    const opts = {
      email,
      pass,
      pass2,
      status,
      error,
      btnLogin,
      btnRegister,
      btnGuest,
      btnLogout,
      btnForgot,
      checkSignupHash: checkHash,
      mode,

      // po każdej akcji – odśwież stronę
      onLoginSuccess() {
        window.location.reload();
      },
      onRegisterSuccess() {
        window.location.reload();
      },
      onLogout() {
        window.location.reload();
      },
      onGuest() {
        window.location.reload();
      },
    };

    ArcadeAuthUI.initLoginPanel(opts);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const holders = document.querySelectorAll("[data-arcade-auth-bar]");
    holders.forEach(initPanel);
  });

  window.ArcadeAuthBar = {
    mount(holder) {
      initPanel(holder);
    },
  };
})();
