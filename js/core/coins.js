// js/core/coins.js
// Prosty system monet Neon Arcade (Supabase + tabela arcade_wallets)
//
// Wymagania:
// - globalny klient Supabase w window.supabase (konfigurowany w auth.js)
// - tabela:
//
//   create table arcade_wallets (
//     user_id uuid primary key references auth.users(id),
//     coins integer not null default 0,
//     updated_at timestamptz not null default now()
//   );
//
// API:
//   ArcadeCoins.load(): Promise<number|null>
//   ArcadeCoins.getBalance(): number|null
//   ArcadeCoins.addForGame(gameId, amount, meta?): Promise<number|null>

(function () {
  const globalObj = (typeof window !== "undefined" ? window : globalThis) || {};
  const ArcadeCoins = {};
  globalObj.ArcadeCoins = ArcadeCoins;

  let supabase = null;
  let _userId = null;
  let _balance = null;
  let _isGuest = false;
  let _hasLoaded = false;
  let _loadPromise = null;

  function getClient() {
    if (supabase) return supabase;
    if (globalObj.supabase) {
      supabase = globalObj.supabase;
      return supabase;
    }
    console.warn("[ArcadeCoins] Brak klienta Supabase (window.supabase).");
    return null;
  }

  function ensureUser() {
    const client = getClient();
    if (!client) return Promise.resolve(null);

    return client.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          console.warn("[ArcadeCoins] getUser error:", error);
          _isGuest = true;
          _userId = null;
          return null;
        }
        if (!data || !data.user) {
          _isGuest = true;
          _userId = null;
          return null;
        }
        _isGuest = false;
        _userId = data.user.id;
        return _userId;
      })
      .catch((err) => {
        console.error("[ArcadeCoins] getUser exception:", err);
        _isGuest = true;
        _userId = null;
        return null;
      });
  }

  // -----------------------------
  // Public: load()
  // -----------------------------
  ArcadeCoins.load = function () {
    const client = getClient();
    if (!client) return Promise.resolve(null);

    if (_hasLoaded && _loadPromise === null) {
      return Promise.resolve(_balance);
    }

    if (_loadPromise) return _loadPromise;

    _loadPromise = ensureUser()
      .then((userId) => {
        if (!userId) {
          // gość – brak monet na serwerze
          _balance = null;
          _hasLoaded = true;
          return null;
        }

        return client
          .from("arcade_wallets")
          .select("coins")
          .eq("user_id", userId)
          .single()
          .then(({ data, error }) => {
            if (error) {
              // PGRST116 = no rows
              if (error.code === "PGRST116") {
                _balance = 0;
                // próbujemy zainicjować portfel w tle
                client
                  .from("arcade_wallets")
                  .insert({ user_id: userId, coins: 0 })
                  .then(() => {
                    // ok
                  })
                  .catch((e) => {
                    console.warn(
                      "[ArcadeCoins] insert wallet failed (może już istnieje):",
                      e
                    );
                  });
                return _balance;
              }

              console.error("[ArcadeCoins] select wallet error:", error);
              _balance = null;
              return null;
            }

            if (!data || typeof data.coins !== "number") {
              _balance = 0;
            } else {
              _balance = data.coins;
            }
            return _balance;
          });
      })
      .finally(() => {
        _hasLoaded = true;
        _loadPromise = null;
      });

    return _loadPromise;
  };

  // -----------------------------
  // Public: getBalance()
  // -----------------------------
  ArcadeCoins.getBalance = function () {
    return _balance;
  };

  // -----------------------------
  // Public: addForGame(gameId, amount, meta?)
  // -----------------------------
  ArcadeCoins.addForGame = function (gameId, amount, meta) {
    const client = getClient();
    if (!client) return Promise.resolve(_balance);

    const n = Math.floor(Number(amount) || 0);
    if (n <= 0) return Promise.resolve(_balance);

    // najpierw upewniamy się, że znamy usera i saldo
    return ArcadeCoins.load().then((currentBalance) => {
      if (_isGuest || !_userId) {
        console.warn(
          "[ArcadeCoins] Użytkownik niezalogowany – monety nie zostaną zapisane."
        );
        return currentBalance;
      }

      const newBalance = (currentBalance || 0) + n;
      _balance = newBalance;

      // upsert portfela
      return client
        .from("arcade_wallets")
        .upsert(
          {
            user_id: _userId,
            coins: newBalance,
          },
          { onConflict: "user_id" }
        )
        .select("coins")
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("[ArcadeCoins] upsert error:", error);
            return _balance;
          }
          if (data && typeof data.coins === "number") {
            _balance = data.coins;
          }

          // (opcjonalnie) można tu logować event do osobnej tabeli:
          // arcade_coin_events (user_id, game_id, delta, meta, created_at)
          // ale na razie zostawiamy to jako TODO.

          return _balance;
        })
        .catch((err) => {
          console.error("[ArcadeCoins] exception during addForGame:", err);
          return _balance;
        });
    });
  };
})();
