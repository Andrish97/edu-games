// games/language/znajdz_slowo/game.js

// ----- Konfiguracja gry -----

const GAME_ID = "znajdz_slowo";

// Jeden „świat” – możesz potem dorzucać kolejne
const WORLDS = [
  {
    id: "animals",
    name: "Zwierzęta",
    icon: "🐾",
    items: [
      {
        emoji: "🐶",
        correct: "pies",
        options: ["pies", "kot", "krowa", "lama"],
      },
      {
        emoji: "🐱",
        correct: "kot",
        options: ["koń", "kot", "świnia", "kura"],
      },
      {
        emoji: "🐮",
        correct: "krowa",
        options: ["krowa", "wilk", "zebra", "lis"],
      },
      {
        emoji: "🦊",
        correct: "lis",
        options: ["bóbr", "lis", "jeż", "koza"],
      },
      {
        emoji: "🐷",
        correct: "świnia",
        options: ["świnia", "owca", "koń", "pies"],
      },
    ],
  },
];

// ----- Stan gry -----

let world = WORLDS[0];
let currentIndex = 0;
let score = 0;
let streak = 0;
let questionsPlayed = 0;

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// ----- Referencje DOM -----

let worldNameEl;
let imageAreaEl;
let optionsEl;
let feedbackEl;
let scoreEl;
let streakEl;
let nextBtn;
let clearProgressBtn;

// ----- Pomocnicze -----

function shuffleArray(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function getCurrentItem() {
  const items = world.items;
  if (!items.length) return null;
  if (currentIndex < 0 || currentIndex >= items.length) {
    currentIndex = 0;
  }
  return items[currentIndex];
}

// ----- UI -----

function setFeedback(message, type) {
  if (!feedbackEl) return;
  feedbackEl.textContent = message || "";

  feedbackEl.classList.remove("feedback--good", "feedback--bad");
  if (type === "good") {
    feedbackEl.classList.add("feedback--good");
  } else if (type === "bad") {
    feedbackEl.classList.add("feedback--bad");
  }
}

function renderCurrentQuestion() {
  const item = getCurrentItem();
  if (!item) {
    setFeedback("Brak pytań w tym świecie.", "bad");
    return;
  }

  if (worldNameEl) {
    worldNameEl.textContent = world.name;
  }

  if (imageAreaEl) {
    imageAreaEl.textContent = item.emoji || "❓";
  }

  // opcje odpowiedzi
  if (optionsEl) {
    optionsEl.innerHTML = "";
    const shuffledOptions = shuffleArray(item.options || [item.correct]);

    shuffledOptions.forEach((word) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = word;
      btn.dataset.value = word;
      optionsEl.appendChild(btn);
    });
  }

  if (scoreEl) scoreEl.textContent = String(score);
  if (streakEl) streakEl.textContent = String(streak);

  setFeedback("", null);
}

function setOptionsDisabled(disabled) {
  if (!optionsEl) return;
  const buttons = optionsEl.querySelectorAll(".option-btn");
  buttons.forEach((btn) => {
    btn.disabled = disabled;
  });
}

// ----- Zapis progresu -----

function buildSavePayload() {
  return {
    worldId: world.id,
    score,
    streak,
    questionsPlayed,
    currentIndex,
  };
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[ZnajdzSlowo] Brak ArcadeProgress – zapis nieaktywny.");
    return Promise.resolve();
  }

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[ZnajdzSlowo] Progres zapisany:", payload);
    })
    .catch(function (err) {
      console.error("[ZnajdzSlowo] Nie udało się zapisać progresu:", err);
    });
}

function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[ZnajdzSlowo] Brak ArcadeProgress.load – wczytywanie pominięte.");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) {
        console.log("[ZnajdzSlowo] Brak zapisanego progresu – start od zera.");
        return;
      }

      if (typeof data.score === "number") score = data.score;
      if (typeof data.streak === "number") streak = data.streak;
      if (typeof data.questionsPlayed === "number") {
        questionsPlayed = data.questionsPlayed;
      }
      if (typeof data.currentIndex === "number") {
        currentIndex = data.currentIndex;
      }

      // świat – na razie tylko animals, ale struktura jest gotowa
      if (data.worldId) {
        const found = WORLDS.find((w) => w.id === data.worldId);
        if (found) world = found;
      }

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
      console.log("[ZnajdzSlowo] Wczytano progres:", data);
    })
    .catch(function (err) {
      console.error("[ZnajdzSlowo] Błąd wczytywania progresu:", err);
    });
}

function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[ZnajdzSlowo] Brak ArcadeProgress.clear – czyszczenie pominięte.");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID).catch(function (err) {
    console.error("[ZnajdzSlowo] Błąd czyszczenia progresu:", err);
  });
}

// ----- Sterowanie -----

function goToNextQuestion() {
  if (!world.items.length) return;

  questionsPlayed += 1;
  currentIndex = (currentIndex + 1) % world.items.length;

  hasUnsavedChanges = true;
  renderCurrentQuestion();
  // auto-zapis przy przejściu dalej
  saveCurrentSession();
}

function handleOptionClick(value) {
  const item = getCurrentItem();
  if (!item) return;

  const isCorrect = value === item.correct;

  setOptionsDisabled(true);

  if (isCorrect) {
    score += 1;
    streak += 1;
    setFeedback("Dobrze! ✨", "good");
  } else {
    streak = 0;
    setFeedback(`Nie tym razem. Szukaliśmy: "${item.correct}".`, "bad");
  }

  if (scoreEl) scoreEl.textContent = String(score);
  if (streakEl) streakEl.textContent = String(streak);

  hasUnsavedChanges = true;
}

function setupEvents() {
  if (optionsEl) {
    optionsEl.addEventListener("click", function (e) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains("option-btn")) return;

      const value = target.dataset.value;
      if (!value) return;
      if (target.disabled) return;

      // najpierw czy poprawne
      const item = getCurrentItem();
      if (!item) return;

      // od razu podbijamy klasy na przyciskach
      const buttons = optionsEl.querySelectorAll(".option-btn");
      buttons.forEach((btn) => {
        const v = btn.dataset.value;
        btn.disabled = true;
        if (!v) return;
        if (v === item.correct) {
          btn.classList.add("option-btn--correct");
        } else if (v === value && v !== item.correct) {
          btn.classList.add("option-btn--wrong");
        }
      });

      handleOptionClick(value);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      goToNextQuestion();
    });
  }

  if (clearProgressBtn) {
    clearProgressBtn.addEventListener("click", function () {
      const ok = window.confirm(
        "Na pewno chcesz wyczyścić postęp w grze „Znajdź słowo”?"
      );
      if (!ok) return;

      score = 0;
      streak = 0;
      questionsPlayed = 0;
      currentIndex = 0;
      hasUnsavedChanges = true;

      clearProgress().then(function () {
        LAST_SAVE_DATA = null;
        renderCurrentQuestion();
      });
    });
  }
}

// ----- Guardy jak w 2048 -----

function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", function (e) {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = "";
    return "";
  });
}

function setupClickGuard() {
  document.addEventListener("click", function (e) {
    if (!hasUnsavedChanges) return;

    const target = e.target.closest("a,button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isBackToArcade =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.dataset.arcadeBack === "1";

    if (isBackToArcade) {
      const ok = window.confirm(
        "Masz niezapisany postęp.\nWyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}

function initArcadeBackButton() {
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../arcade.html",
    });
  }
}

// ----- Inicjalizacja gry -----

function initFindWordGame() {
  worldNameEl = document.getElementById("world-name");
  imageAreaEl = document.getElementById("image-area");
  optionsEl = document.getElementById("options");
  feedbackEl = document.getElementById("feedback");
  scoreEl = document.getElementById("score");
  streakEl = document.getElementById("streak");
  nextBtn = document.getElementById("next-btn");
  clearProgressBtn = document.getElementById("clear-progress-btn");

  if (!imageAreaEl || !optionsEl) {
    console.error(
      "[ZnajdzSlowo] Brak wymaganych elementów DOM – sprawdź index.html gry."
    );
    return;
  }

  loadProgress().then(function () {
    if (!world || !world.items || !world.items.length) {
      world = WORLDS[0];
      currentIndex = 0;
      score = 0;
      streak = 0;
      questionsPlayed = 0;
    }

    renderCurrentQuestion();
  });

  setupEvents();
  setupBeforeUnloadGuard();
  setupClickGuard();
  initArcadeBackButton();
}

document.addEventListener("DOMContentLoaded", function () {
  try {
    initFindWordGame();
  } catch (e) {
    console.error("[ZnajdzSlowo] Krytyczny błąd inicjalizacji gry:", e);
  }
});

