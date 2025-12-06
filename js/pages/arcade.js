// js/pages/arcade.js

(function () {
  const CATEGORIES_CONTAINER_SELECTOR = "#categories";
  const GAMES_SECTION_SELECTOR = "#games-section";
  const GAMES_CONTAINER_SELECTOR = "#games";
  const GAMES_SECTION_TITLE_SELECTOR = "#games-section-title";
  const BACK_BTN_SELECTOR = "#back-to-categories";

  let categories = [];
  const gameMetaCache = new Map();

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
  // Render kategorii jako kart
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
      const icon = cat.icon || "🎮";
      const count = (cat.games && cat.games.length) || 0;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "game-card category-card";

      btn.innerHTML = `
        <div class="game-headline">
          <span class="game-icon">${icon}</span>
          <span class="game-name">${cat.name || cat.id}</span>
        </div>
        <div class="game-desc">
          ${count === 1 ? "1 gra w kategorii" : count + " gier w kategorii"}
        </div>
        <div class="game-footer">
          <span class="pill">KATEGORIA</span>
        </div>
      `;

      btn.addEventListener("click", function () {
        onCategoryClick(cat);
      });

      frag.appendChild(btn);
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

    const promises = gameIds.map((id) => loadGameMeta(folder, id));

    Promise.all(promises)
      .then((allMeta) => {
        const valid = allMeta.filter(Boolean);
        renderGameCards(valid, gamesContainer, category);
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
        const full = {
          ...meta,
          _folder: folder,
          _id: gameId,
        };
        gameMetaCache.set(cacheKey, full);
        return full;
      })
      .catch((err) => {
        console.error("[arcade] Błąd meta.json dla", gameId, err);
        return null;
      });
  }

  // ------------------------------
  // Render kafelków gier
  // ------------------------------

  function renderGameCards(metas, container, category) {
    if (!metas.length) {
      container.innerHTML =
        '<p class="arcade-empty">Ta kategoria ma 0 gier do wyświetlenia.</p>';
      return;
    }

    const frag = document.createDocumentFragment();

    metas.forEach((meta) => {
      const entry = meta.entry || "index.html";
      const href = `${meta._folder}/${meta._id}/${entry}`;
      const icon = meta.icon || category.icon || "🎮";
      const desc = meta.description || "";

      const card = document.createElement("a");
      card.href = href;
      card.className = "game-card";

      card.innerHTML = `
        <div class="thumb-wrap">
          <div class="thumb-placeholder">${icon}</div>
        </div>
        <div class="game-headline">
          <span class="game-icon">${icon}</span>
          <span class="game-name">${meta.name || meta.id}</span>
        </div>
        <div class="game-desc">${desc}</div>
        <div class="game-footer">
          <span class="pill">${category.name || category.id}</span>
          <button class="play-btn" type="button">Graj</button>
        </div>
      `;

      // kliknięcie w przycisk "Graj" nie powinno otwierać nowej karty,
      // tylko po prostu wejść w href
      const playBtn = card.querySelector(".play-btn");
      if (playBtn) {
        playBtn.addEventListener("click", function (e) {
          e.preventDefault();
          card.click();
        });
      }

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
