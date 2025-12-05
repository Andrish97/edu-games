// js/core/progress.js
// Wspólny zapis/odczyt progresu gier.
// Wymaga: window.ArcadeAuth (auth.js)

(function () {
  const LOCAL_PREFIX_GUEST = "progress_guest_";
  const LOCAL_PREFIX_USER  = "progress_local_";

  function getSupabaseClient() {
    return window.ArcadeAuth && ArcadeAuth._client
      ? ArcadeAuth._client
      : null;
  }

  async function getCurrentUserSafe() {
    if (!window.ArcadeAuth || !ArcadeAuth.getCurrentUser) return null;
    try {
      return await ArcadeAuth.getCurrentUser();
    } catch {
      return null;
    }
  }

  async function save(gameId, data) {
    const sb   = getSupabaseClient();
    const user = await getCurrentUserSafe();
    const mode = window.ArcadeAuth && ArcadeAuth.getMode
      ? ArcadeAuth.getMode()
      : (localStorage.getItem("arcade_mode") || "guest");

    // Gość albo brak supabase → localStorage (tryb gość)
    if (!sb || !user || mode === "guest") {
      const key = mode === "guest"
        ? LOCAL_PREFIX_GUEST + gameId
        : LOCAL_PREFIX_USER + gameId;
      localStorage.setItem(key, JSON.stringify(data));
      return;
    }

    // Zalogowany, mamy supabase → tabela user_progress
    const { error } = await sb
      .from("user_progress")
      .upsert({
        user_id: user.id,
        game_id: gameId,
        data,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("[ArcadeProgress] Błąd zapisu do Supabase, fallback localStorage:", error);
      const fallbackKey = LOCAL_PREFIX_USER + gameId;
      localStorage.setItem(fallbackKey, JSON.stringify(data));
    }
  }

  async function load(gameId) {
    const sb   = getSupabaseClient();
    const user = await getCurrentUserSafe();
    const mode = window.ArcadeAuth && ArcadeAuth.getMode
      ? ArcadeAuth.getMode()
      : (localStorage.getItem("arcade_mode") || "guest");

    // Gość albo brak supabase → localStorage
    if (!sb || !user || mode === "guest") {
      const keyGuest = LOCAL_PREFIX_GUEST + gameId;
      const keyUser  = LOCAL_PREFIX_USER + gameId;
      const raw = localStorage.getItem(keyGuest) || localStorage.getItem(keyUser);
      return raw ? JSON.parse(raw) : null;
    }

    // Zalogowany → próba z Supabase
    const { data, error } = await sb
      .from("user_progress")
      .select("data")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle();

    if (error) {
      console.error("[ArcadeProgress] Błąd odczytu z Supabase, fallback localStorage:", error);
      const fallbackKey = LOCAL_PREFIX_USER + gameId;
      const raw = localStorage.getItem(fallbackKey);
      return raw ? JSON.parse(raw) : null;
    }

    return data ? data.data : null;
  }

  window.ArcadeProgress = {
    save,
    load
  };
})();
