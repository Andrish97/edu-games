// js/pages/arcade.js

(function () {
  const CATEGORIES_CONTAINER_SELECTOR = "#categories";
  const GAMES_SECTION_SELECTOR = "#games-section";
  const GAMES_CONTAINER_SELECTOR = "#games";
  const GAMES_SECTION_TITLE_SELECTOR = "#games-section-title";
  const BACK_BTN_SELECTOR = "#back-to-categories";

  let categories = [];
  const gameMetaCache = new Map(); // cache meta.json

  function $(sel) {
    return document.querySelector(sel);
  }

  function showLoading() {
    const loader = document.querySelector("[data-arcade-wait]");
    if (loader) loader.style.display = "block";
  }

  function hideLoading() {
    const loader = document.querySelector("[data-arcade-wait]");
    if (loader) loader.style.display = "none";
  }

  function setError(msg) {
    const el = document.querySelector("[data-arcade-error]");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }

  function clearError() {
    const el = document.querySelector("[data-arcade-error]");
    if (!el) return;
    el.textContent = "";
    el.style.display = "none";
  }

  // ------------------------------
  // Ładowanie games.json
  // ------------------------------

  function loadCategories() {
    showLoading();
    clearError();

    return fetch("games.json", {
      headers: {
        "Cache-Control": "no-cache",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Nie udało się wczytać games.json");
        }
        return res.json();
      })
      .then((data) => {
        categories = (data && data.categories) || [];
        renderCategoryCards();
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania kategorii:", err);
        setError("Nie udało się wczytać listy kategorii.");
      })
      .finally(() => {
        hideLoading();
      });
  }

  // ------------------------------
  // Render kategorii
  // ------------------------------

  function renderCategoryCards() {
    const container = $(CATEGORIES_CONTAINER_SELECTOR);
    const gamesSection = $(GAMES_SECTION_SELECTOR);

    if (!container) {
      console.warn("[arcade] Brak #categories w DOM.");
      return;
    }

    // pokazujemy sekcję kategorii, ukrywamy listę gier
    container.innerHTML = "";
    if (gamesSection) {
      gamesSection.hidden = true;
    }

    if (!categories.length) {
      container.innerHTML =
        '<p class="arcade-empty">Brak zdefiniowanych kategorii w games.json.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    categories.forEach((cat) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "arcade-card arcade-category-card";

      const icon = cat.icon || "🎮";
      const count = (cat.games && cat.games.length) || 0;

      el.innerHTML = `
        <div class="arcade-card-icon">${icon}</div>
        <div class="arcade-card-body">
          <div class="arcade-card-title">${cat.name || cat.id}</div>
          <div class="arcade-card-subtitle">
            ${count === 1 ? "1 gra" : count + " gier"}
          </div>
        </div>
      `;

      el.addEventListener("click", function () {
        onCategoryClick(cat);
      });

      frag.appendChild(el);
    });

    container.appendChild(frag);
  }

  // ------------------------------
  // Kliknięcie kategorii
  // ------------------------------

  function onCategoryClick(category) {
    const gamesSection = $(GAMES_SECTION_SELECTOR);
    const gamesContainer = $(GAMES_CONTAINER_SELECTOR);
    const titleEl = $(GAMES_SECTION_TITLE_SELECTOR);

    if (!gamesSection || !gamesContainer || !titleEl) {
      console.warn("[arcade] Brak elementów sekcji gier.");
      return;
    }

    titleEl.textContent = category.name || category.id;
    gamesContainer.innerHTML = "";
    gamesSection.hidden = false;
    clearError();
    showLoading();

    const folder = category.folder;
    const gameIds = category.games || [];

    if (!folder || !gameIds.length) {
      gamesContainer.innerHTML =
        '<p class="arcade-empty">Ta kategoria nie ma jeszcze gier.</p>';
      hideLoading();
      return;
    }

    // Ładujemy meta każdej gry
    const promises = gameIds.map((id) => loadGameMeta(folder, id));

    Promise.all(promises)
      .then((allMeta) => {
        const valid = allMeta.filter(Boolean);
        renderGameTiles(valid, gamesContainer);
      })
      .catch((err) => {
        console.error("[arcade] Błąd ładowania gier kategorii:", err);
        setError("Nie udało się wczytać gier dla tej kategorii.");
      })
      .finally(() => {
        hideLoading();
      });
  }

  function loadGameMeta(folder, gameId) {
    const cacheKey = folder + "/" + gameId;
    if (gameMetaCache.has(cacheKey)) {
      return Promise.resolve(gameMetaCache.get(cacheKey));
    }

    const url = `${folder}/${gameId}/meta.json`;

    return fetch(url, { headers: { "Cache-Control": "no-cache" } })
      .then((res) => {
        if (!res.ok) {
          console.warn("[arcade] meta.json nie wczytane dla", gameId);
          return null;
        }
        return res.json();
      })
      .then((meta) => {
        if (!meta) return null;
        gameMetaCache.set(cacheKey, {
          ...meta,
          _folder: folder,
          _id: gameId,
        });
        return gameMetaCache.get(cacheKey);
      })
      .catch((err) => {
        console.error("[arcade] Błąd meta.json dla", gameId, err);
        return null;
      });
  }

  // ------------------------------
  // Render kafelków gier
  // ------------------------------

  function renderGameTiles(metas, container) {
    if (!metas.length) {
      container.innerHTML =
        '<p class="arcade-empty">Ta kategoria ma 0 gier do wyświetlenia.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    metas.forEach((meta) => {
      const entry = meta.entry || "index.html";
      const href = `${meta._folder}/${meta._id}/${entry}`;
      const icon = meta.icon || "🎮";

      const card = document.createElement("a");
      card.href = href;
      card.className = "arcade-card arcade-game-card";

      card.innerHTML = `
        <div class="arcade-card-icon">${icon}</div>
        <div class="arcade-card-body">
          <div class="arcade-card-title">${meta.name || meta.id}</div>
          <div class="arcade-card-subtitle">
            ${meta.description || ""}
          </div>
        </div>
      `;

      frag.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(frag);
  }

  // ------------------------------
  // Powrót do listy kategorii
  // ------------------------------

  function setupBackButton() {
    const backBtn = $(BACK_BTN_SELECTOR);
    const gamesSection = $(GAMES_SECTION_SELECTOR);

    if (!backBtn || !gamesSection) return;

    backBtn.addEventListener("click", function () {
      gamesSection.hidden = true;
      clearError();
      renderCategoryCards();
    });
  }

  // ------------------------------
  // Inicjalizacja
  // ------------------------------

  document.addEventListener("DOMContentLoaded", function () {
    setupBackButton();
    loadCategories();
  });
})();
