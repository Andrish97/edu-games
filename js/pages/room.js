// js/pages/room.js
// Neon Room – wirtualny pokój nagród (dekoracje za 💎)

(function () {
  const GAME_ID = "neon_room"; // do logów monet
  const ROOM_PROGRESS_ID = "room";

  // Prosta definicja przedmiotów – w przyszłości możesz to wynieść do rewards.json
  const SHOP_ITEMS = [
    {
      id: "poster_neon_city",
      name: "Plakat: Neon City",
      icon: "🌆",
      type: "wall",
      category: "Dekoracje ścienne",
      baseCost: 15,
      maxLevel: 3,
    },
    {
      id: "lamp_cyan",
      name: "Lampa neonowa",
      icon: "💡",
      type: "light",
      category: "Światła",
      baseCost: 10,
      maxLevel: 3,
    },
    {
      id: "sofa_pink",
      name: "Sofa gamingowa",
      icon: "🛋️",
      type: "furniture",
      category: "Meble",
      baseCost: 20,
      maxLevel: 2,
    },
    {
      id: "plant_glow",
      name: "Roślina neonowa",
      icon: "🌴",
      type: "decor",
      category: "Dekoracje",
      baseCost: 8,
      maxLevel: 2,
    },
    {
      id: "trophy_gold",
      name: "Trofeum gracza",
      icon: "🏆",
      type: "trophy",
      category: "Trofea",
      baseCost: 25,
      maxLevel: 3,
    },
    {
      id: "cat_neon",
      name: "Neonowy kot",
      icon: "😼",
      type: "pet",
      category: "Maskotki",
      baseCost: 18,
      maxLevel: 3,
    },
  ];

  const GRID_COLS = 8;
  const GRID_ROWS = 5;

  let gridEl = null;
  let shopListEl = null;
  let balanceEl = null;
  let btnReset = null;
  let btnSave = null;

  // Stan:
  // items: { [itemId]: { level: number, x: number, y: number } }
  let roomState = {
    items: {},
  };

  let selectedItemId = null;

  function getItemDef(id) {
    return SHOP_ITEMS.find((i) => i.id === id) || null;
  }

  function init() {
    gridEl = document.getElementById("room-grid");
    shopListEl = document.getElementById("shop-list");
    balanceEl = document.getElementById("room-balance");
    btnReset = document.getElementById("btn-room-reset");
    btnSave = document.getElementById("btn-room-save");

    if (!gridEl || !shopListEl) {
      console.warn("[NeonRoom] Brak podstawowych elementów HTML.");
      return;
    }

    // przycisk powrotu
    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({ backUrl: "arcade.html" });
    }

    // zbuduj siatkę pokoju
    renderGrid();

    // eventy
    btnReset?.addEventListener("click", handleResetRoom);
    btnSave?.addEventListener("click", handleSaveRoom);

    // załaduj 💎 i stan pokoju
    loadBalance();
    loadRoomState();
  }

  // Ładowanie stanu pokoju
  async function loadRoomState() {
    if (!window.ArcadeProgress || !ArcadeProgress.load) {
      console.warn("[NeonRoom] Brak ArcadeProgress – pokój tylko tymczasowy.");
      renderShop();
      renderRoomItems();
      return;
    }

    try {
      const save = (await ArcadeProgress.load(ROOM_PROGRESS_ID)) || {};
      if (save.items && typeof save.items === "object") {
        roomState.items = save.items;
      } else {
        roomState.items = {};
      }
    } catch (e) {
      console.error("[NeonRoom] Błąd ładowania pokoju:", e);
      roomState.items = {};
    }

    renderShop();
    renderRoomItems();
  }

  async function handleSaveRoom() {
    if (!window.ArcadeProgress || !ArcadeProgress.save) return;

    try {
      await ArcadeProgress.save(ROOM_PROGRESS_ID, roomState);
      console.log("[NeonRoom] Pokój zapisany.");
    } catch (e) {
      console.error("[NeonRoom] Błąd zapisu pokoju:", e);
    }
  }

  async function handleResetRoom() {
    if (!confirm("Na pewno wyczyścić pokój? (Ozdoby zostaną na koncie, ale znikną z siatki)")) {
      return;
    }
    roomState.items = {};
    renderRoomItems();
    await handleSaveRoom();
  }

  // Ładowanie balansu 💎
  async function loadBalance() {
    if (!window.ArcadeCoins || !ArcadeCoins.load) {
      if (balanceEl) balanceEl.textContent = "–";
      return;
    }

    try {
      const balance = await ArcadeCoins.load();
      updateBalanceDisplay(balance);
    } catch (e) {
      console.error("[NeonRoom] Błąd ładowania 💎:", e);
      updateBalanceDisplay(null);
    }
  }

  function updateBalanceDisplay(value) {
    if (!balanceEl) return;
    if (typeof value === "number" && !Number.isNaN(value)) {
      balanceEl.textContent = String(value);
    } else {
      balanceEl.textContent = "–";
    }
  }

  function getCurrentBalance() {
    if (!window.ArcadeCoins || !ArcadeCoins.getBalance) return null;
    const bal = ArcadeCoins.getBalance();
    return typeof bal === "number" && !Number.isNaN(bal) ? bal : null;
  }

  // GRID

  function renderGrid() {
    gridEl.innerHTML = "";
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const cell = document.createElement("div");
        cell.className = "room-cell";
        cell.dataset.x = String(x);
        cell.dataset.y = String(y);

        cell.addEventListener("click", () => {
          handleCellClick(x, y);
        });

        gridEl.appendChild(cell);
      }
    }
  }

  function renderRoomItems() {
    if (!gridEl) return;

    // wyczyść zawartość komórek
    const cells = gridEl.querySelectorAll(".room-cell");
    cells.forEach((cell) => {
      const itemEl = cell.querySelector(".room-item");
      if (itemEl) {
        itemEl.remove();
      }
    });

    Object.keys(roomState.items).forEach((itemId) => {
      const data = roomState.items[itemId];
      const def = getItemDef(itemId);
      if (!def) return;

      const { x, y, level } = data;
      const selector = `.room-cell[data-x="${x}"][data-y="${y}"]`;
      const cell = gridEl.querySelector(selector);
      if (!cell) return;

      const wrapper = document.createElement("div");
      wrapper.className = "room-item level-" + (level || 1);

      const inner = document.createElement("div");
      inner.className = "room-item-inner";
      inner.textContent = def.icon || "⬜";

      wrapper.appendChild(inner);
      cell.appendChild(wrapper);
    });
  }

  function handleCellClick(x, y) {
    if (!selectedItemId) return; // nic nie wybrane w sklepie

    // jeśli ten item już jest w pokoju – przenieś go
    const current = roomState.items[selectedItemId];
    if (current) {
      roomState.items[selectedItemId] = {
        ...current,
        x,
        y,
      };
    } else {
      // item kupiony, ale nie ma go w pokoju – wstaw domyślnie na poziomie 1
      roomState.items[selectedItemId] = {
        level: 1,
        x,
        y,
      };
    }

    renderRoomItems();
  }

  // SKLEP

  function renderShop() {
    shopListEl.innerHTML = "";

    const items = SHOP_ITEMS;

    items.forEach((item) => {
      const owned = !!roomState.items[item.id];
      const level = owned ? roomState.items[item.id].level || 1 : 0;
      const maxed = level >= item.maxLevel;

      const card = document.createElement("div");
      card.className = "shop-item";
      card.dataset.itemId = item.id;

      if (item.id === selectedItemId) {
        card.classList.add("selected");
      }

      const iconWrap = document.createElement("div");
      iconWrap.className = "shop-icon-wrap";
      const icon = document.createElement("div");
      icon.className = "shop-icon";
      icon.textContent = item.icon || "⬜";
      iconWrap.appendChild(icon);

      const main = document.createElement("div");
      main.className = "shop-main";

      const nameEl = document.createElement("div");
      nameEl.className = "shop-name";
      nameEl.textContent = item.name;

      const meta = document.createElement("div");
      meta.className = "shop-meta";

      const tag = document.createElement("span");
      tag.className = "shop-tag";
      tag.textContent = item.category;

      const levelInfo = document.createElement("span");
      levelInfo.className = "shop-level";
      levelInfo.textContent = owned
        ? `Poziom: ${level}/${item.maxLevel}`
        : `Nieposiadane`;

      meta.appendChild(tag);
      meta.appendChild(document.createTextNode(" · "));
      meta.appendChild(levelInfo);

      main.appendChild(nameEl);
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "shop-actions";

      const priceEl = document.createElement("div");
      priceEl.className = "shop-price";

      let nextCost = null;
      if (!owned) {
        nextCost = item.baseCost;
      } else if (!maxed) {
        nextCost = item.baseCost * (level + 1);
      }

      if (nextCost !== null) {
        priceEl.innerHTML = `<span>Koszt:</span> <strong>💎 ${nextCost}</strong>`;
      } else {
        priceEl.innerHTML = `<span>Maks. poziom</span>`;
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-btn";

      if (!owned) {
        btn.textContent = "Kup i wstaw";
      } else if (!maxed) {
        btn.textContent = "Ulepsz";
      } else {
        btn.textContent = "Max";
        btn.classList.add("disabled");
      }

      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handlePurchaseOrUpgrade(item, level);
      });

      actions.appendChild(priceEl);
      actions.appendChild(btn);

      card.appendChild(iconWrap);
      card.appendChild(main);
      card.appendChild(actions);

      card.addEventListener("click", () => {
        // zaznacz przedmiot do ustawiania w pokoju
        if (selectedItemId === item.id) {
          selectedItemId = null;
        } else {
          selectedItemId = item.id;
        }
        highlightSelectedItem();
      });

      shopListEl.appendChild(card);
    });
  }

  function highlightSelectedItem() {
    const cards = shopListEl.querySelectorAll(".shop-item");
    cards.forEach((card) => {
      const id = card.dataset.itemId;
      if (id === selectedItemId) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
    });
  }

  async function handlePurchaseOrUpgrade(item, currentLevel) {
    const owned = currentLevel > 0;
    const maxed = currentLevel >= item.maxLevel;

    if (maxed) return;

    const nextLevel = owned ? currentLevel + 1 : 1;
    const cost = owned ? item.baseCost * nextLevel : item.baseCost;

    const balance = getCurrentBalance();
    if (balance === null) {
      alert("Brak informacji o 💎. Upewnij się, że jesteś zalogowany.");
      return;
    }

    if (balance < cost) {
      alert("Za mało 💎. Zagraj w gry, aby zdobyć więcej!");
      return;
    }

    // potwierdzenie
    const actionLabel = owned ? "ulepszyć" : "kupić";
    if (
      !confirm(
        `Czy na pewno chcesz ${actionLabel} "${item.name}" do poziomu ${nextLevel} za 💎 ${cost}?`
      )
    ) {
      return;
    }

    // zabierz 💎 – używamy ujemnej wartości
    try {
      if (window.ArcadeCoins && ArcadeCoins.addForGame) {
        await ArcadeCoins.addForGame(GAME_ID, -cost, {
          itemId: item.id,
          newLevel: nextLevel,
        });
      }
    } catch (e) {
      console.error("[NeonRoom] Błąd odejmowania 💎:", e);
    }

    // odśwież balance w UI
    const newBalance = getCurrentBalance();
    updateBalanceDisplay(newBalance);

    // odśwież pasek globalny
    if (window.ArcadeAuthUI && typeof ArcadeAuthUI.refreshCoins === "function") {
      ArcadeAuthUI.refreshCoins();
    }

    // zaktualizuj poziom w stanie
    if (!roomState.items[item.id]) {
      // nowy przedmiot – ustaw w pierwszej wolnej komórce
      const pos = findFirstFreeCell();
      roomState.items[item.id] = {
        level: nextLevel,
        x: pos.x,
        y: pos.y,
      };
    } else {
      roomState.items[item.id].level = nextLevel;
    }

    renderRoomItems();
    renderShop();
    await handleSaveRoom();
  }

  function findFirstFreeCell() {
    const occupied = {};
    Object.values(roomState.items).forEach((item) => {
      const key = `${item.x},${item.y}`;
      occupied[key] = true;
    });

    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const key = `${x},${y}`;
        if (!occupied[key]) {
          return { x, y };
        }
      }
    }

    // jeżeli brak miejsca – wpychamy w (0,0)
    return { x: 0, y: 0 };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
