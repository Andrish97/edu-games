// js/core/auth.js

// --- KONFIG SUPABASE ---

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

// --- NISKI POZIOM: API AUTORYZACJI ---

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
      return { error: { message: "Brak połączenia z serwerem." } };
    }
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (!error) {
      localStorage.setItem("arcade_mode", "user");
    }
    return { data, error };
  },

  async register(email, password) {
    if (!_sb) {
      return { error: { message: "Brak połączenia z serwerem." } };
    }
    const { data, error } = await _sb.auth.signUp({ email, password });
    return { data, error };
  },

  async resetPassword(email, redirectTo) {
    if (!_sb) {
      return { error: { message: "Brak połączenia z serwerem." } };
    }
    const { data, error } = await _sb.auth.resetPasswordForEmail(email, { redirectTo });
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

// --- WYSOKI POZIOM: WSPÓLNA LOGIKA UI ---

/**
 * ArcadeAuthUI.initLoginPanel(options)
 *
 * options:
 *  - email, pass, pass2, status, error, btnLogin, btnRegister, btnGuest, btnLogout, btnForgot
 *    -> mogą być selektorami (string) albo elementami DOM
 *  - checkSignupHash: bool – czy sprawdzać #type=signup (link z maila)
 *  - onLoginSuccess: funkcja po udanym logowaniu
 *  - onGuest: funkcja po wejściu jako gość
 */
window.ArcadeAuthUI = {
  initLoginPanel(options) {
    const q = (v) =>
      typeof v === "string" ? document.querySelector(v) : v;

    const emailInput  = q(options.email);
    const passInput   = q(options.pass);
    const pass2Input  = q(options.pass2);
    const statusEl    = q(options.status);
    const errorEl     = q(options.error);
    const btnLogin    = q(options.btnLogin);
    const btnRegister = q(options.btnRegister);
    const btnGuest    = q(options.btnGuest);
    const btnLogout   = q(options.btnLogout);
    const btnForgot   = q(options.btnForgot);

    const checkSignupHash = !!options.checkSignupHash;
    const onLoginSuccess  = options.onLoginSuccess || null;
    const onGuest         = options.onGuest || null;

    let registerMode = false;

    function showError(msg) {
      if (errorEl) errorEl.textContent = msg || "";
    }

    function setStatus(msg) {
      if (statusEl) statusEl.textContent = msg;
    }

    function setRegisterUI(isRegister) {
      registerMode = isRegister;
      if (pass2Input) {
        pass2Input.style.display = isRegister ? "inline-block" : "none";
      }
      if (btnLogin) {
        btnLogin.style.display = isRegister ? "none" : "inline-block";
      }
      if (btnRegister) {
        btnRegister.textContent = isRegister ? "Utwórz konto" : "Załóż konto";
      }
      if (!isRegister) {
        showError("");
      }
    }

    async function refreshState() {
      const A = window.ArcadeAuth;
      if (!A || !A.getCurrentUser) {
        setStatus("Tryb offline / gość.");
        return;
      }

      const user = await A.getCurrentUser();
      const mode = A.getMode ? A.getMode() : (localStorage.getItem("arcade_mode") || "guest");

      if (user) {
        setStatus("Zalogowany jako: " + (user.email || user.id));
        emailInput && (emailInput.style.display = "none");
        passInput  && (passInput.style.display  = "none");
        pass2Input && (pass2Input.style.display = "none");
        btnLogin   && (btnLogin.style.display   = "none");
        btnRegister&& (btnRegister.style.display= "none");
        btnGuest   && (btnGuest.style.display   = "none");
        btnLogout  && (btnLogout.style.display  = "inline-block");
        showError("");
      } else {
        if (mode === "guest") {
          setStatus("Tryb gościa – zapis lokalny.");
        } else {
          setStatus("Nie zalogowany – możesz grać jako gość lub się zalogować.");
        }
        emailInput && (emailInput.style.display = "inline-block");
        passInput  && (passInput.style.display  = "inline-block");
        btnRegister&& (btnRegister.style.display= "inline-block");
        btnGuest   && (btnGuest.style.display   = "inline-block");
        btnLogout  && (btnLogout.style.display  = "none");
        setRegisterUI(registerMode); // odśwież UI przycisków
      }
    }

    // Obsługa linka aktywacji z maila: #...type=signup
    if (checkSignupHash) {
      const rawHash = window.location.hash || "";
      const hash = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
      if (hash) {
        const hp = new URLSearchParams(hash);
        if (hp.get("type") === "signup") {
          setRegisterUI(false);
          setStatus("Konto aktywowane. Możesz się zalogować.");
          showError("");
          history.replaceState({}, "", window.location.pathname);
        }
      }
    }

    // --- HANDLERY PRZYCISKÓW ---

    // Gość
    if (btnGuest) {
      btnGuest.addEventListener("click", async () => {
        if (window.ArcadeAuth && ArcadeAuth.setGuest) {
          ArcadeAuth.setGuest();
        } else {
          localStorage.setItem("arcade_mode", "guest");
        }
        showError("");
        if (onGuest) {
          onGuest();
        } else {
          await refreshState();
        }
      });
    }

    // Logowanie
    if (btnLogin) {
      btnLogin.addEventListener("click", async () => {
        if (registerMode) return;
        const A = window.ArcadeAuth;
        if (!A || !A.login) {
          showError("Brak połączenia z serwerem logowania.");
          return;
        }

        const email = emailInput ? emailInput.value.trim() : "";
        const pass  = passInput ? passInput.value : "";

        if (!email || !pass) {
          showError("Podaj email i hasło.");
          return;
        }

        const { error } = await A.login(email, pass);
        if (error) {
          console.error("[ArcadeAuthUI] login error:", error);
          showError("Nieprawidłowy email lub hasło.");
          return;
        }

        showError("");
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          await refreshState();
        }
      });
    }

    // Rejestracja (dwuklik)
    if (btnRegister) {
      btnRegister.addEventListener("click", async () => {
        const A = window.ArcadeAuth;
        if (!A || !A.register) {
          showError("Brak połączenia z serwerem rejestracji.");
          return;
        }

        // pierwszy klik → przełącz UI
        if (!registerMode) {
          setRegisterUI(true);
          return;
        }

        // drugi klik → faktyczna rejestracja
        const email = emailInput ? emailInput.value.trim() : "";
        const pass  = passInput ? passInput.value : "";
        const pass2 = pass2Input ? pass2Input.value : "";

        if (!email || !pass || !pass2) {
          showError("Uzupełnij wszystkie pola.");
          return;
        }
        if (pass !== pass2) {
          showError("Hasła muszą być identyczne.");
          return;
        }
        if (pass.length < 6) {
          showError("Hasło musi mieć min. 6 znaków.");
          return;
        }

        const { error } = await A.register(email, pass);
        if (error) {
          console.error("[ArcadeAuthUI] register error:", error);
          const msg = (error.message || "").toLowerCase();
          if (msg.includes("already")) {
            showError("Taki użytkownik już istnieje. Spróbuj się zalogować.");
          } else {
            showError("Błąd rejestracji: " + error.message);
          }
          return;
        }

        alert("Konto utworzone. Sprawdź maila, aktywuj konto i zaloguj się.");
        setRegisterUI(false);
        if (passInput) passInput.value = "";
        if (pass2Input) pass2Input.value = "";
      });
    }

    // Wyloguj
    if (btnLogout) {
      btnLogout.addEventListener("click", async () => {
        const A = window.ArcadeAuth;
        if (A && A.logout) {
          await A.logout();
        } else {
          localStorage.setItem("arcade_mode", "guest");
        }
        await refreshState();
      });
    }

    // Reset hasła
    if (btnForgot) {
      btnForgot.addEventListener("click", async () => {
        const A = window.ArcadeAuth;
        if (!A || !A.resetPassword) {
          showError("Reset hasła niedostępny.");
          return;
        }
        const email = emailInput ? emailInput.value.trim() : "";
        if (!email) {
          showError("Podaj email do resetu hasła.");
          return;
        }
        const redirectBase =
          window.location.origin +
          window.location.pathname.replace(/index\.html$/, "");
        const { error } = await A.resetPassword(
          email,
          redirectBase + "index.html"
        );
        if (error) {
          console.error("[ArcadeAuthUI] reset error:", error);
          showError("Nie udało się wysłać linku resetującego.");
          return;
        }
        alert("Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.");
      });
    }

    // start
    setRegisterUI(false);
    refreshState();
  }
};
