// js/pages/arcade.js
document.addEventListener("DOMContentLoaded", async () => {
  const catContainer = document.getElementById("categories");
  const gamesContainer = document.getElementById("games");

  let categories = [];

  function renderCategoryButtons() {
    catContainer.innerHTML = "";
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "cat-btn";
      btn.innerHTML = `
        <span class="icon">${cat.icon}</span>
        <span>${cat.name}</span>
      `;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".cat-btn").forEach(b =>
          b.classList.toggle("active", b === btn)
        );
        renderGames(cat);
      });
      catContainer.appendChild(btn);
    });

    const first = catContainer.querySelector(".cat-btn");
    if (first && categories[0]) {
      first.classList.add("active");
      renderGames(categories[0]);
    }
  }

  function renderGames(cat) {
    gamesContainer.innerHTML = "";
    cat.games.forEach(game => {
      const card = document.createElement("div");
      card.className = "game-card";
      card.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        window.location.href = game.url + "?fullscreen=1";
      });

      const thumbWrap = document.createElement("div");
      thumbWrap.className = "thumb-wrap";
      if (game.thumb) {
        const img = document.createElement("img");
        img.src = game.thumb;
        img.alt = game.name;
        img.onerror = () => {
          thumbWrap.innerHTML = `<div class="thumb-placeholder">${game.icon}</div>`;
        };
        thumbWrap.appendChild(img);
      } else {
        thumbWrap.innerHTML = `<div class="thumb-placeholder">${game.icon}</div>`;
      }

      const headline = document.createElement("div");
      headline.className = "game-headline";
      headline.innerHTML = `
        <span class="game-icon">${game.icon}</span>
        <span class="game-name">${game.name}</span>
      `;

      const desc = document.createElement("div");
      desc.className = "game-desc";
      desc.textContent = game.description || "";

      const footer = document.createElement("div");
      footer.className = "game-footer";
      footer.innerHTML = `<span class="pill">HTML / Canvas</span>`;
      const play = document.createElement("button");
      play.className = "play-btn";
      play.textContent = "Graj";
      play.addEventListener("click", (e) => {
        e.stopPropagation();
        window.location.href = game.url + "?fullscreen=1";
      });
      footer.appendChild(play);

      card.appendChild(thumbWrap);
      card.appendChild(headline);
      card.appendChild(desc);
      card.appendChild(footer);

      gamesContainer.appendChild(card);
    });
  }

  // start
  try {
    categories = await ArcadeGameAPI.loadCategoriesWithGames();
    renderCategoryButtons();
  } catch (e) {
    console.error(e);
    gamesContainer.textContent = "Nie udało się załadować listy gier.";
  }
});
