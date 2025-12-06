// js/arcade.js
// Render listy gier do #games

(function () {
  function createEl(tag, className, children) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (children) {
      for (const child of children) {
        if (typeof child === "string") {
          el.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          el.appendChild(child);
        }
      }
    }
    return el;
  }

  function renderGames(root, data) {
    root.innerHTML = "";

    if (!data.categories.length) {
      root.textContent = "Brak gier do wyświetlenia.";
      return;
    }

    data.categories.forEach((cat) => {
      const section = createEl("section", "arcade-category");

      const header = createEl("header", "arcade-category-header", [
        createEl("h2", "arcade-category-title", [
          (cat.icon ? cat.icon + " " : "") + cat.name,
        ]),
      ]);

      const grid = createEl("div", "arcade-games-grid");

      cat.games.forEach((game) => {
        const card = createEl("article", "arcade-game-card");

        const title = createEl("h3", "arcade-game-title", [game.name]);
        const desc = createEl("p", "arcade-game-desc", [
          game.description || "",
        ]);

        const footer = createEl("div", "arcade-game-footer");
        const playBtn = createEl(
          "a",
          "arcade-game-play-btn arcade-btn",
          ["Graj"]
        );
        playBtn.href = game.playUrl;

        footer.appendChild(playBtn);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(footer);
        grid.appendChild(card);
      });

      section.appendChild(header);
      section.appendChild(grid);
      root.appendChild(section);
    });
  }

  async function initArcade() {
    const root = document.getElementById("games");
    if (!root) {
      console.error("Brak elementu #games w arcade.html");
      return;
    }

    root.textContent = "Ładowanie gier...";

    try {
      const data = await ArcadeGamesAPI.loadAllGames();
      renderGames(root, data);
    } catch (err) {
      console.error("Błąd podczas ładowania listy gier:", err);
      root.textContent =
        "Nie udało się załadować listy gier. Sprawdź konsolę przeglądarki.";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initArcade().catch((err) => {
      console.error("Krytyczny błąd inicjalizacji arcade:", err);
    });
  });
})();
