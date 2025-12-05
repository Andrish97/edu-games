// -------------------------------------------------------
// ArcadeCore – logika wspólna dla wszystkich gier + index
// BEZ stylów, czysty JS
// -------------------------------------------------------

const ArcadeCore = (() => {
  let sb = null;
  let guestMode = false;

  const SUPABASE_URL = "https://zbcpqwugthvizqzkvurw.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3Bxd3VndGh2aXpxemt2dXJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MTk1NDYsImV4cCI6MjA4MDQ5NTU0Nn0.fTZiJjToYxnvhthiSIpAcmJ2wo7gQ2bAko841_dh740";

  function createClient() {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async function getCurrentUser() {
    const { data } = await sb.auth.getUser();
    return data.user || null;
  }

  // -------------------------------
  // Zarządzanie Progresem
  // -------------------------------

  async function saveProgress(gameId, data) {
    if (guestMode) {
      localStorage.setItem("progress_guest_" + gameId, JSON.stringify(data));
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      localStorage.setItem("progress_local_" + gameId, JSON.stringify(data));
      return;
    }

    await sb
      .from("user_progress")
      .upsert({
        user_id: user.id,
        game_id: gameId,
        data: data,
        updated_at: new Date().toISOString()
      });
  }

  async function loadProgress(gameId) {
    if (guestMode) {
      const raw = localStorage.getItem("progress_guest_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    const user = await getCurrentUser();
    if (!user) {
      const raw = localStorage.getItem("progress_local_" + gameId);
      return raw ? JSON.parse(raw) : null;
    }

    const { data } = await sb
      .from("user_progress")
      .select("data")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle();

    return data ? data.data : null;
  }

  // -------------------------------
  // UI – Top Bar (bez stylu)
  // -------------------------------

  function renderTopBar(container, opts = {}) {
    const bar = document.createElement("div");
    bar.className = "arcade-topbar";

    bar.innerHTML = `
      <span class="arcade-user"></span>

      <div class="arcade-auth">
        <input type="email" placeholder="email" class="arcade-input email">
        <input type="password" placeholder="hasło" class="arcade-input pass">
        <button class="arcade-btn login">Zaloguj</button>
        <button class="arcade-btn register">Rejestracja</button>
        <button class="arcade-btn logout" style="display:none;">Wyloguj</button>
        <button class="arcade-btn guest">Gość</button>
      </div>
    `;

    container.prepend(bar);

    // obsługa przycisków
    const email = bar.querySelector(".email");
    const pass = bar.querySelector(".pass");
    const login = bar.querySelector(".login");
    const register = bar.querySelector(".register");
    const logout = bar.querySelector(".logout");
    const guest = bar.querySelector(".guest");
    const userLabel = bar.querySelector(".arcade-user");

    async function refresh() {
      const user = await getCurrentUser();

      if (guestMode) {
        userLabel.textContent = "Tryb gościa";
        email.style.display = "none";
        pass.style.display = "none";
        login.style.display = "none";
        register.style.display = "none";
        logout.style.display = "none";
        return;
      }

      if (user) {
        userLabel.textContent = "Zalogowany: " + user.email;
        email.style.display = "none";
        pass.style.display = "none";
        login.style.display = "none";
        register.style.display = "none";
        logout.style.display = "inline-block";
      } else {
        userLabel.textContent = "Nie zalogowany";
        email.style.display = "inline-block";
        pass.style.display = "inline-block";
        login.style.display = "inline-block";
        register.style.display = "inline-block";
        logout.style.display = "none";
      }
    }

    login.onclick = async () => {
      const { error } = await sb.auth.signInWithPassword({
        email: email.value,
        password: pass.value
      });
      if (error) alert("Błąd logowania: " + error.message);
      refresh();
    };

    register.onclick = async () => {
      const { error } = await sb.auth.signUp({
        email: email.value,
        password: pass.value
      });
      if (error) alert("Błąd rejestracji: " + error.message);
      else alert("Sprawdź email, żeby potwierdzić konto.");
      refresh();
    };

    logout.onclick = async () => {
      await sb.auth.signOut();
      refresh();
    };

    guest.onclick = () => {
      guestMode = true;
      refresh();
    };

    refresh();
  }

  // -------------------------------
  // Powrót do Arcade (bez stylu)
  // -------------------------------

  function injectBackButton(backUrl) {
    const btn = document.createElement("button");
    btn.textContent = "Powrót do Arcade";
    btn.className = "arcade-backbtn"; // styl w CSS
    btn.onclick = () => (window.location.href = backUrl);
    document.body.appendChild(btn);
  }

  // -------------------------------
  // API Publiczne
  // -------------------------------

  return {
    async initIndex({ onReady }) {
      createClient();

      renderTopBar(document.body);

      if (typeof onReady === "function") onReady();
    },

    async initGame({ gameId, backUrl }) {
      createClient();

      const params = new URLSearchParams(window.location.search);
      const isFS = params.get("fullscreen") === "1";

      // topbar nad grą
      renderTopBar(document.body);

      if (isFS) injectBackButton(backUrl);

      return {
        saveProgress: (a, b) => saveProgress(a, b),
        loadProgress: (a) => loadProgress(a)
      };
    }
  };
})();
