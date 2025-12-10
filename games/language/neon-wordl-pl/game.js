// ===== KONFIGURACJA GRY =====
const GAME_ID = "neon-wordl-pl";
const DICT_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt";
const MAX_ROWS = 6;
const HINT_COST = 5; // koszt jednej podpowiedzi

let allWords = [];
let validWords = [];
let usedWords = new Set();
let secret = "";
let wordLength = 5;

let board = [];
let row = 0;
let col = 0;

let usedHintPositions = new Set();

let gamesPlayed = 0;
let wins = 0;
let currentStreak = 0;
let maxStreak = 0;

let keyboardEl;
let keyboardInnerEl;
const keyboardState = {};

let statusEl;
let boardEl;
let wordLenSel;
let newGameBtn;
let resetRecordBtn;
let statGamesEl;
let statWinsEl;
let statStreakEl;
let statMaxStreakEl;

let hintBtn;
let hintTextEl;

// ===== POMOCNICZE =====

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-ząćęłńóśżź]/g, "");
}

function canUseCoins() {
  return (
    typeof window !== "undefined" &&
    window.ArcadeCoins &&
    typeof ArcadeCoins.getBalance === "function" &&
    typeof ArcadeCoins.addForGame === "function"
  );
}

// ===== SŁOWNIK =====

async function loadDictionary() {
  statusEl.textContent = "Pobieram słownik...";
  try {
    const resp = await fetch(DICT_URL);
    const text = await resp.text();
    const lines = text.split("\n").map((x) => normalizeWord(x.split(" ")[0]));

    allWords = [...new Set(lines)].filter(
      (w) => w.length >= 4 && w.length <= 7
    );

    statusEl.textContent = "Słownik załadowany.";
  } catch (err) {
    console.error("Błąd ładowania słownika:", err);
    statusEl.textContent = "Błąd ładowania słownika.";
  }
}

function chooseSecret() {
  validWords = allWords.filter((w) => w.length === wordLength);
  if (!validWords.length) return "";

  let w;
  let safety = 0;
  do {
    w = validWords[Math.floor(Math.random() * validWords.length)];
    safety++;
  } while (usedWords.has(w) && safety < 1000);

  usedWords.add(w);
  return w;
}

// ===== PLANSZA =====

function initBoardStructure() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 42px)`;
  board = [];

  for (let r = 0; r < MAX_ROWS; r++) {
    const rowArr = [];
    for (let c = 0; c < wordLength; c++) {
      const div = document.createElement("div");
      div.className = "tile";
      boardEl.appendChild(div);
      rowArr.push(div);
    }
    board.push(rowArr);
  }
}

function resetBoard() {
  row = 0;
  col = 0;
  usedHintPositions = new Set();
  if (hintTextEl) hintTextEl.textContent = "";

  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < wordLength; c++) {
      const t = board[r][c];
      t.textContent = "";
      t.className = "tile";
    }
  }
}

// ===== KLAWIATURA DOTYKOWA =====

const KEYBOARD_LAYOUT = [
  ["w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "ź", "ż", "c", "b", "n", "m", "backspace"],
  ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "enter"],
];

function buildKeyboard() {
  keyboardEl.innerHTML = "";
  keyboardInnerEl = document.createElement("div");
  keyboardInnerEl.className = "keyboard-inner";
  keyboardEl.appendChild(keyboardInnerEl);

  KEYBOARD_LAYOUT.forEach((rowKeys) => {
    const rowDiv = document.createElement("div");
    rowDiv.className = "keyboard-row";

    rowKeys.forEach((k) => {
      const btn = document.createElement("button");
      btn.className = "key-btn";
      btn.dataset.key = k;

      if (k === "enter") {
        btn.textContent = "ENTER";
        btn.classList.add("key-wide");
      } else if (k === "backspace") {
        btn.textContent = "⌫";
        btn.classList.add("key-wide");
      } else {
        btn.textContent = k;
      }

      btn.addEventListener("click", () => handleVirtualKey(k));
      rowDiv.appendChild(btn);
    });

    keyboardInnerEl.appendChild(rowDiv);
  });

  Object.keys(keyboardState).forEach((k) => delete keyboardState[k]);
}

function handleVirtualKey(k) {
  statusEl.textContent = "";

  if (k === "enter") return submitRow();
  if (k === "backspace") return erase();
  pressLetter(k);
}

// ===== STATYSTYKI =====

function updateStatsUI() {
  if (statGamesEl) statGamesEl.textContent = gamesPlayed;
  if (statWinsEl) statWinsEl.textContent = wins;
  if (statStreakEl) statStreakEl.textContent = currentStreak;
  if (statMaxStreakEl) statMaxStreakEl.textContent = maxStreak;
}

function registerGameFinished(win) {
  gamesPlayed++;
  if (win) {
    wins++;
    currentStreak++;
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  } else {
    currentStreak = 0;
  }

  updateStatsUI();

  // nagrody monet
  if (canUseCoins()) {
    ArcadeCoins.addForGame(GAME_ID, win ? 5 : 1, {
      reason: win ? "win" : "loss",
      secret,
    }).then(() => {
      if (window.ArcadeAuthUI) ArcadeAuthUI.refreshCoins();
    });
  }
}

// ===== PODPOWIEDZI (odejmowanie 5 monet) =====

async function useHint() {
  if (!hintBtn) return;

  if (!secret) {
    statusEl.textContent = "Najpierw rozpocznij grę.";
    return;
  }

  if (!canUseCoins()) {
    statusEl.textContent = "Podpowiedzi dostępne tylko dla zalogowanych.";
    return;
  }

  hintBtn.disabled = true;
  statusEl.textContent = "";

  try {
    const bal = ArcadeCoins.getBalance();

    if (bal == null) {
      statusEl.textContent = "Nie udało się pobrać salda.";
      return;
    }

    if (bal < HINT_COST) {
      statusEl.textContent = "Za mało diamentów.";
      return;
    }

    // znajdź literę do odsłonięcia
    const candidates = [];
    for (let i = 0; i < wordLength; i++) {
      if (!usedHintPositions.has(i)) candidates.push(i);
    }

    if (!candidates.length) {
      statusEl.textContent = "Brak dostępnych podpowiedzi.";
      return;
    }

    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    usedHintPositions.add(pos);

    const letter = secret[pos].toUpperCase();

    // odejmij monety (teraz działa!)
    await ArcadeCoins.addForGame(GAME_ID, -HINT_COST, {
      reason: "hint",
      letter,
      position: pos,
    });

    if (window.ArcadeAuthUI) ArcadeAuthUI.refreshCoins();

    hintTextEl.textContent = `Podpowiedź: miejsce ${pos + 1} = ${letter}. (-${HINT_COST}💎)`;

  } catch (e) {
    console.error("Błąd podpowiedzi:", e);
    statusEl.textContent = "Błąd podpowiedzi.";
  } finally {
    hintBtn.disabled = false;
  }
}
// ===== OBSŁUGA WPISYWANIA =====

function pressLetter(ch) {
  if (row >= MAX_ROWS) return;
  if (col >= wordLength) return;

  const tile = board[row][col];
  tile.textContent = ch.toUpperCase();
  tile.classList.add("filled");

  col++;
}

function erase() {
  if (col > 0) {
    col--;
    const tile = board[row][col];
    tile.textContent = "";
    tile.classList.remove("filled");
  }
}

const KEY_STATE_PRIORITY = {
  absent: 0,
  present: 1,
  correct: 2,
};

function updateKeyColor(letter, newState) {
  const cur = keyboardState[letter];
  if (cur && KEY_STATE_PRIORITY[newState] <= KEY_STATE_PRIORITY[cur]) return;

  keyboardState[letter] = newState;

  const btns = keyboardEl.querySelectorAll(".key-btn");
  for (const b of btns) {
    if (b.dataset.key === letter) {
      b.classList.remove("key-correct", "key-present", "key-absent");
      b.classList.add("key-" + newState);
    }
  }
}

// ===== KOLOROWANIE =====

function colorRow(r) {
  const guess = [];
  for (let c = 0; c < wordLength; c++) {
    guess[c] = board[r][c].textContent.toLowerCase();
  }

  const secretArr = secret.split("");
  const counts = {};

  for (const ch of secretArr) {
    counts[ch] = (counts[ch] || 0) + 1;
  }

  // zielone
  for (let c = 0; c < wordLength; c++) {
    if (guess[c] === secretArr[c]) {
      board[r][c].classList.add("correct");
      updateKeyColor(guess[c], "correct");
      counts[guess[c]]--;
    }
  }

  // żółte / szare
  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    const ch = guess[c];

    if (tile.classList.contains("correct")) continue;

    if (counts[ch] > 0) {
      tile.classList.add("present");
      updateKeyColor(ch, "present");
      counts[ch]--;
    } else {
      tile.classList.add("absent");
      updateKeyColor(ch, "absent");
    }
  }
}

function submitRow() {
  if (row >= MAX_ROWS) return;
  if (col < wordLength) {
    statusEl.textContent = "Wpisz pełne słowo.";
    return;
  }

  let guess = "";
  for (let c = 0; c < wordLength; c++) {
    guess += board[row][c].textContent.toLowerCase();
  }

  if (!validWords.includes(guess)) {
    statusEl.textContent = "Nie ma takiego słowa.";
    return;
  }

  colorRow(row);

  if (guess === secret) {
    statusEl.textContent = "Brawo! Trafione!";
    registerGameFinished(true);
    row = MAX_ROWS;
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_ROWS) {
    statusEl.textContent = "Koniec! Słowo: " + secret.toUpperCase();
    registerGameFinished(false);
  } else {
    statusEl.textContent = "";
  }
}

// ===== NOWA GRA =====

function startNewGame() {
  secret = chooseSecret();
  if (!secret) {
    statusEl.textContent = "Brak słów o tej długości.";
    return;
  }

  initBoardStructure();
  resetBoard();
  buildKeyboard();

  statusEl.textContent = "Zgadnij słowo!";
}

// ===== KLAWIATURA FIZYCZNA =====

function setupKeyboardListener() {
  document.addEventListener("keydown", (e) => {
    statusEl.textContent = "";

    const k = e.key.toLowerCase();

    if (k === "enter") {
      submitRow();
      return;
    }

    if (k === "backspace") {
      erase();
      return;
    }

    if (/^[a-ząćęłńóśżź]$/i.test(k)) {
      pressLetter(k);
      return;
    }
  });
}

// ===== DOM CACHE =====

function cacheDom() {
  statusEl = document.getElementById("status");
  boardEl = document.getElementById("board");
  wordLenSel = document.getElementById("word-len");
  keyboardEl = document.getElementById("keyboard");

  newGameBtn = document.getElementById("new-game-btn");
  resetRecordBtn = document.getElementById("reset-record-btn");

  statGamesEl = document.getElementById("stat-games");
  statWinsEl = document.getElementById("stat-wins");
  statStreakEl = document.getElementById("stat-streak");
  statMaxStreakEl = document.getElementById("stat-max-streak");

  hintBtn = document.getElementById("hint-btn");
  hintTextEl = document.getElementById("hint-text");
}

// ===== START =====

function initGame() {
  cacheDom();
  setupKeyboardListener();

  // przycisk nowej gry
  if (newGameBtn)
    newGameBtn.addEventListener("click", () => startNewGame());

  // reset rekordów
  if (resetRecordBtn)
    resetRecordBtn.addEventListener("click", () => {
      gamesPlayed = 0;
      wins = 0;
      currentStreak = 0;
      maxStreak = 0;
      updateStatsUI();
      statusEl.textContent = "Rekordy wyczyszczone.";
    });

  // zmiana długości słowa
  if (wordLenSel)
    wordLenSel.addEventListener("change", () => {
      wordLength = parseInt(wordLenSel.value, 10);
      startNewGame();
    });

  // podpowiedź
  if (hintBtn)
    hintBtn.addEventListener("click", () => useHint());

  Promise.all([loadDictionary()]).then(() => {
    startNewGame();
  });

  updateStatsUI();

  // przycisk powrotu (Arcade)
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }
}

document.addEventListener("DOMContentLoaded", initGame);

