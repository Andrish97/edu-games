// js/game-api.js
// Wczytywanie listy gier i meta

const ArcadeGamesAPI = (() => {
  async function loadConfig() {
    const res = await fetch("games.json");
    if (!res.ok) {
      throw new Error(`Nie udało się wczytać games.json (status ${res.status})`);
    }
    const json = await res.json();
    if (!json || !Array.isArray(json.categories)) {
      throw new Error("Niepoprawny format games.json – brak pola categories.");
    }
    return json;
  }

  async function loadAllGames() {
    const config = await loadConfig();

    const categories = await Promise.all(
      config.categories.map(async (cat) => {
        const games = await Promise.all(
          (cat.games || []).map(async (gameId) => {
            const basePath = `${cat.folder}/${gameId}`;
            const metaPath = `${basePath}/meta.json`;

            const res = await fetch(metaPath);
            if (!res.ok) {
              console.warn(
                `Nie udało się wczytać meta.json dla gry "${gameId}" (kategoria "${cat.id}", status ${res.status})`
              );
              return null;
            }

            const meta = await res.json();

            return {
              ...meta,
              id: meta.id || gameId,
              categoryId: cat.id,
              categoryName: cat.name,
              playUrl: `${basePath}/${meta.entry || "index.html"}`,
            };
          })
        );

        return {
          ...cat,
          games: games.filter(Boolean),
        };
      })
    );

    return { categories };
  }

  return {
    loadConfig,
    loadAllGames,
  };
})();
