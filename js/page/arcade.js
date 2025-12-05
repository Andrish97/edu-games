// js/pages/arcade.js
document.addEventListener("DOMContentLoaded", async () => {
  ArcadeUI.initArcadePage();

  const { config, grouped } = await ArcadeGames.getGamesGroupedByCategory();
  const catContainer = document.getElementById("categories");

  function createGameCard(game) {
    // dokładnie jak wcześniej - thumb-placeholder, opis itd.
  }

  async function showCategory(catId) {
    const gamesContainer = document.getElementById("games");
    gamesContainer.innerHTML = "";
    const games = grouped[catId] || [];
    games
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "pl"))
      .forEach(game => gamesContainer.appendChild(createGameCard(game)));
  }

  config.categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-btn";
    btn.innerHTML = `<span class="icon">${cat.icon}</span><span>${cat.name}</span>`;
    btn.onclick = () => {
      document.querySelectorAll(".cat-btn").forEach(b =>
        b.classList.toggle("active", b === btn)
      );
      showCategory(cat.id);
    };
    catContainer.appendChild(btn);
  });

  const first = catContainer.querySelector(".cat-btn");
  if (first) {
    first.classList.add("active");
    const catId = config.categories[0].id;
    showCategory(catId);
  }
});
