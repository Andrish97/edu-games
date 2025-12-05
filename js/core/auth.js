// js/core/auth.js

// Zakładam, że supabase-js jest załadowane z CDN przed tym plikiem
// (w index.html masz <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
//  oraz <script src="js/core/auth.js" defer></script> w tej kolejności).

const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740";

let _sb = null;

if (typeof supabase !== "undefined") {
  try {
    _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("[ArcadeAuth] Błąd inicjalizacji Supabase:", e);
  }
} else {
  console.warn("[ArcadeAuth] supabase-js niezaładowany – tryb gościa / offline.");
}

const ArcadeAuth = {
  _client: _sb,

  getMode() {
    return localStorage.getItem("arcade_mode") || "guest";
  },

  setGuest() {
    localStorage.setItem("arcade_mode", "guest");
  },

  async login(email, password) {
    if (!_sb) {
      console.warn("[ArcadeAuth] Brak klienta Supabase przy loginie");
      return { error: { message: "Brak połączenia z serwerem." } };
    }
    const { data, error } = await _sb.auth.signInWithPassword({
      email,
      password
    });
    if (!error) {
      localStorage.setItem("arcade_mode", "user");
    }
    return { data, error };
  },

  async register(email, password) {
    if (!_sb) {
      console.warn("[ArcadeAuth] Brak klienta Supabase przy rejestracji");
      return { error: { message: "Brak połączenia z serwerem." } };
    }
    const { data, error } = await _sb.auth.signUp({ email, password });
    // tryb user ustawimy dopiero po faktycznym logowaniu
    return { data, error };
  },

  async resetPassword(email, redirectTo) {
    if (!_sb) {
      return { error: { message: "Brak połączenia z serwerem." } };
    }
    const { data, error } = await _sb.auth.resetPasswordForEmail(email, {
      redirectTo
    });
    return { data, error };
  },

  async logout() {
    if (_sb) {
      await _sb.auth.signOut();
    }
    localStorage.setItem("arcade_mode", "guest");
  },

  async getCurrentUser() {
    if (!_sb) return null;
    const { data } = await _sb.auth.getUser();
    return data.user || null;
  }
};

window.ArcadeAuth = ArcadeAuth;

/**
 * ArcadeAuthUI – wspólny helper do spinania paska logowania/rejestracji
 *
 * options:
 *  - email, pass, pass2, status, error, btnLogin, btnRegister, btnGuest, btnLogout, btnForgot: selektory lub elementy DOM
 *  - onLoginSuccess(): funkcja po udanym logowaniu
 *  - onGuest(): funkcja po ustawieniu trybu gościa
 *  - checkSignupHash: bool – czy sprawdzić #type=signup w URL (np. na index.html)
 */
window.ArcadeAuthUI = {
  initLoginPanel(options) {
    const getEl = (v) =>
      typeof v === "string" ? document.querySelector(v) : v;

    const emailInput  = getEl(options.email);
    const passInput   = getEl(options.pass);
    const pass2Input  = getEl(options.pass2);
    const statusEl    = getEl(options.status);
    const errorEl     = getEl(options.error);
    const btnLogin    = getEl(options.btnLogin);
    const btnRegister = getEl(options.btnRegister);
    const btnGuest    = getEl(options.btnGuest);
    const btnLogout   = getEl(options.btnLogout);
    const btnForgot   = getEl(options.btnForgot);

    let registerMode = false; // false = logowanie, true = rejestracja

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg || "";
    }

    function setStatus(msg) {
      if (!statusEl) return;
      statusEl.textContent = msg;
    }

    function updateModeUI() {
      if (registerMode) {
        // TRYB REJESTRACJI
        if (pass2Input) pass2Input.style.display = "inline-block";
        if (btnLogin) btnLogin.style.display = "none";
        if (btnRegister) btnRegister.textContent = "Utwórz konto";
        showError("");
        setStatus("Rejestracja – wpisz email i dwa razy hasło.");
      } else {
        // TRYB LOGOWANIA
        if (pass2Input) pass2Input.style.display = "none";
        if (btnLogin) btnLogin.style.display = "inline-block";
        if (btnRegister) btnRegister.textContent = "Załóż konto";
        showError("");
        setStatus("Możesz się zalogować lub grać jako gość.");
      }
    }

    async function refreshLoggedState() {
      const user = await ArcadeAuth.getCurrentUser();
      const mode = ArcadeAuth.getMode();

      if (user) {
        setStatus("Zalogowany jako: " + (user.email || user.id));
        if (emailInput) emailInput.style.display = "none";
        if (passInput) passInput.style.display = "none";
        if (pass2Input) pass2Input.style.display = "none";
        if (btnLogin) btnLogin.style.display = "none";
        if (btnRegister) btnRegister.style.display = "none";
        if (btnGuest) btnGuest.style.display = "none";
        if (btnLogout) btnLogout.style.display = "inline-block";
        showError("");
      } else {
        if (mode === "guest") {
          setStatus("Tryb gościa – zapis lokalny.");
        } else {
          setStatus("Nie zalogowany – możesz grać jako gość lub się zalogować.");
        }
        if (emailInput) emailInput.style.display = "inline-block";
        if (passInput) passInput.style.display = "inline-block";
        if (btnRegister) btnRegister.style.display = "inline-block";
        if (btnGuest) btnGuest.style.display = "inline-block";
        if (btnLogout) btnLogout.style.display = "none";
        // pass2Input kontrolujemy przez registerMode
        updateModeUI();
      }
    }

    // --- obsługa hash z Supabase (aktywacja konta – type=signup) ---
    if (options.checkSignupHash) {
      const rawHash = window.location.hash || "";
      const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const type = hashParams.get("type");
        if (type === "signup") {
          registerMode = false;
          updateModeUI();
          setStatus("Konto aktywowane. Możesz się zalogować.");
          showError("");
          history.replaceState({}, "", window.location.pathname);
        }
      }
    }

    // --- LOGOWANIE ---
    if (btnLogin) {
      btnLogin.addEventListener("click", async () => {
        if (registerMode) return;

        const emailVal = emailInput ? emailInput.value.trim() : "";
        const passVal  = passInput ? passInput.value : "";

        if (!emailVal || !passVal) {
          showError("Podaj email i hasło.");
          return;
        }

        const { error } = await ArcadeAuth.login(emailVal, passVal);
        if (error) {
          console.error("[ArcadeAuthUI] Błąd logowania:", error);
          showError("Nieprawidłowy email lub hasło.");
          return;
        }

        showError("");
        if (typeof options.onLoginSuccess === "function") {
          options.onLoginSuccess();
        } else {
          await refreshLoggedState();
        }
      });
    }

    // --- REJESTRACJA (dwustopniowa) ---
    if (btnRegister) {
      btnRegister.addEventListener("click", async () => {
        // pierwsze kliknięcie -> wejście w tryb rejestracji
        if (!registerMode) {
          registerMode = true;
          updateModeUI();
          return;
        }

        // drugie kliknięcie -> faktyczna rejestracja
        const emailVal = emailInput ? emailInput.value.trim() : "";
        const passVal  = passInput ? passInput.value : "";
        const pass2Val = pass2Input ? pass2Input.value : "";

        if (!emailVal || !passVal || !pass2Val) {
          showError("Uzupełnij wszystkie pola.");
          return;
        }
        if (passVal !== pass2Val) {
          showError("Hasła muszą być identyczne.");
          return;
        }
        if (passVal.length < 6) {
          showError("Hasło musi mieć min. 6 znaków.");
          return;
        }

        const { error } = await ArcadeAuth.register(emailVal, passVal);
        if (error) {
          console.error("[ArcadeAuthUI] Błąd rejestracji:", error);
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("already")) {
            showError("Taki użytkownik już istnieje. Spróbuj się zalogować.");
          } else {
            showError("Błąd rejestracji: " + error.message);
          }
          return;
        }

        alert("Konto utworzone. Sprawdź maila, żeby aktywować konto, a potem zaloguj się.");

        registerMode = false;
        updateModeUI();
        if (passInput) passInput.value = "";
        if (pass2Input) pass2Input.value = "";
      });
    }

    // --- GOŚĆ ---
    if (btnGuest) {
      btnGuest.addEventListener("click", async () => {
        ArcadeAuth.setGuest();
        showError("");
        if (typeof options.onGuest === "function") {
          options.onGuest();
        } else {
          await refreshLoggedState();
        }
      });
    }

    // --- WYLOGOWANIE ---
    if (btnLogout) {
      btnLogout.addEventListener("click", async () => {
        await ArcadeAuth.logout();
        await refreshLoggedState();
      });
    }

    // --- RESET HASŁA ---
    if (btnForgot) {
      btnForgot.addEventListener("click", async () => {
        const emailVal = emailInput ? emailInput.value.trim() : "";
        if (!emailVal) {
          showError("Podaj email do resetu hasła.");
          return;
        }
        const redirectBase =
          window.location.origin +
          window.location.pathname.replace(/index\.html$/, "");
        const { error } = await ArcadeAuth.resetPassword(
          emailVal,
          redirectBase + "index.html"
        );
        if (error) {
          console.error("[ArcadeAuthUI] Błąd resetu hasła:", error);
          showError("Nie udało się wysłać linku resetującego.");
          return;
        }
        alert("Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.");
      });
    }

    // Na koniec: pobierz aktualny stan logowania
    refreshLoggedState();
  }
};
