// Neon Wordl PL (2025) – ta sama logika, odchudzona integracja z Arcade

const GAME_ID = "neon-wordl-pl";
const DICT_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt";

const MAX_ROWS = 6;
const HINT_COST = 5;

let allWords = [];
let validWords = [];
let usedWords = new Set();

let secret = "";
let wordLength = 5;

let board = [];
let row = 0;
let col = 0;

let usedHintPositions = new Set();
const keyboardState = {};

let gamesPlayed = 0;
let wins = 0;
let currentStreak = 0;
let maxStreak = 0;

let statusEl, hintTextEl, boardEl, wordLenSel;
let statGamesEl, statWinsEl, statStreakEl, statMaxStreakEl;
let btnNew, btnReset, hintBtn;
let controlsSlotEl;

const KEYBOARD_LAYOUT = [
  ["w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "ź", "ż", "c", "b", "n", "m", "backspace"],
  ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "enter"],
];

const KEY_STATE_PRIORITY = { absent: 0, present: 1, correct: 2 };

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-ząćęłńóśżź]/g, "");
}

function isLoggedInCoinsAvailable() {
  return (
    typeof window !== "undefined" &&
    window.ArcadeCoins &&
    typeof ArcadeCoins.addForGame === "function" &&
    typeof ArcadeCoins.getBalance === "function"
  );
}

function cacheDom() {
  statusEl = document.getElementById("status");
  hintTextEl = document.getElementById("hint-text");
  boardEl = document.getElementById("board");
  wordLenSel = document.getElementById("word-len");

  statGamesEl = document.getElementById("stat-games");
  statWinsEl = document.getElementById("stat-wins");
  statStreakEl = document.getElementById("stat-streak");
  statMaxStreakEl = document.getElementById("stat-max-streak");

  btnNew = document.getElementById("btn-new");
  btnReset = document.getElementById("btn-reset");
  hintBtn = document.getElementById("hint-btn");

  controlsSlotEl = document.getElementById("controls-slot");
}

function updateStatsUI() {
  statGamesEl.textContent = gamesPlayed;
  statWinsEl.textContent = wins;
  statStreakEl.textContent = currentStreak;
  statMaxStreakEl.textContent = maxStreak;
}

async function loadProgress() {
  if (!window.ArcadeProgress || typeof ArcadeProgress.load !== "function") return;

  const save = await ArcadeProgress.load(GAME_ID);
  gamesPlayed = save?.gamesPlayed ?? 0;
  wins = save?.wins ?? 0;
  currentStreak = save?.currentStreak ?? 0;
  maxStreak = save?.maxStreak ?? 0;

  updateStatsUI();
}

async function saveProgress() {
  if (!window.ArcadeProgress || typeof ArcadeProgress.save !== "function") return;

  await ArcadeProgress.save(GAME_ID, {
    gamesPlayed,
    wins,
    currentStreak,
    maxStreak,
  });
}

async function loadDictionary() {
  statusEl.textContent = "Pobieram słownik...";
  try {
    const resp = await fetch(DICT_URL);
    const text = await resp.text();
    const lines = text
      .split("\n")
      .map((x) => normalizeWord(x.split(" ")[0]))
      .filter(Boolean);

    allWords = [...new Set(lines)].filter((w) => w.length >= 4 && w.length <= 7);
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
  hintTextEl.textContent = "";

  for (let r = 0; r < MAX_ROWS; r++) {
    for (let c = 0; c < wordLength; c++) {
      const t = board[r][c];
      t.textContent = "";
      t.className = "tile";
    }
  }

  // reset kolorów klawiatury
  for (const k of Object.keys(keyboardState)) delete keyboardState[k];
  const btns = document.querySelectorAll(".key-btn");
  btns.forEach((b) => b.classList.remove("key-correct", "key-present", "key-absent"));
}

function buildKeyboard() {
  controlsSlotEl.innerHTML = "";

  const keyboardEl = document.createElement("div");
  keyboardEl.className = "keyboard";

  const inner = document.createElement("div");
  inner.className = "keyboard-inner";
  keyboardEl.appendChild(inner);

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

    inner.appendChild(rowDiv);
  });

  controlsSlotEl.appendChild(keyboardEl);
}

function updateKeyColor(letter, newState) {
  const cur = keyboardState[letter];
  if (cur && KEY_STATE_PRIORITY[newState] <= KEY_STATE_PRIORITY[cur]) return;

  keyboardState[letter] = newState;

  const btns = document.querySelectorAll(".key-btn");
  for (const b of btns) {
    if (b.dataset.key === letter) {
      b.classList.remove("key-correct", "key-present", "key-absent");
      b.classList.add("key-" + newState);
    }
  }
}

function pressLetter(ch) {
  if (row >= MAX_ROWS) return;
  if (col >= wordLength) return;

  const tile = board[row][col];
  tile.textContent = ch.toUpperCase();
  tile.classList.add("filled");
  col++;
}

function erase() {
  if (col <= 0) return;
  col--;
  const tile = board[row][col];
  tile.textContent = "";
  tile.classList.remove("filled");
}

function colorRow(r) {
  const guess = [];
  for (let c = 0; c < wordLength; c++) {
    guess[c] = board[r][c].textContent.toLowerCase();
  }

  const secretArr = secret.split("");
  const counts = {};
  for (const ch of secretArr) counts[ch] = (counts[ch] || 0) + 1;

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

async function registerGameFinished(win) {
  gamesPlayed++;

  if (win) {
    wins++;
    currentStreak++;
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  } else {
    currentStreak = 0;
  }

  updateStatsUI();
  await saveProgress();

  // monety: tylko zalogowany
  if (isLoggedInCoinsAvailable()) {
    try {
      // (jeśli coins.js wymaga load — bezpiecznie wywołać)
      if (typeof ArcadeCoins.load === "function") await ArcadeCoins.load();

      await ArcadeCoins.addForGame(GAME_ID, win ? 5 : 1, {
        reason: win ? "win" : "loss",
        secret,
        length: wordLength,
      });

      if (window.ArcadeAuthUI?.refreshCoins) await ArcadeAuthUI.refreshCoins();
    } catch (e) {
      console.warn("Nie udało się dodać monet:", e);
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
  for (let c = 0; c < wordLength; c++) guess += board[row][c].textContent.toLowerCase();

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

function handleVirtualKey(k) {
  statusEl.textContent = "";

  if (k === "enter") return submitRow();
  if (k === "backspace") return erase();
  pressLetter(k);
}

function setupKeyboardListener() {
  document.addEventListener("keydown", (e) => {
    statusEl.textContent = "";

    const k = e.key.toLowerCase();
    if (k === "enter") return submitRow();
    if (k === "backspace") return erase();

    if (/^[a-ząćęłńóśżź]$/i.test(k)) pressLetter(k);
  });
}

async function useHint() {
  if (!secret) {
    statusEl.textContent = "Najpierw rozpocznij grę.";
    return;
  }

  if (!isLoggedInCoinsAvailable()) {
    statusEl.textContent = "Podpowiedzi są dostępne tylko dla zalogowanych.";
    return;
  }

  hintBtn.disabled = true;
  statusEl.textContent = "";

  try {
    if (typeof ArcadeCoins.load === "function") await ArcadeCoins.load();

    // getBalance bywa async w nowych implementacjach — obsłuż oba przypadki
    const balMaybe = ArcadeCoins.getBalance();
    const bal = balMaybe?.then ? await balMaybe : balMaybe;

    if (bal == null) {
      statusEl.textContent = "Nie udało się pobrać salda.";
      return;
    }

    if (bal < HINT_COST) {
      statusEl.textContent = "Za mało diamentów.";
      return;
    }

    const candidates = [];
    for (let i = 0; i < wordLength; i++) if (!usedHintPositions.has(i)) candidates.push(i);

    if (!candidates.length) {
      statusEl.textContent = "Brak dostępnych podpowiedzi.";
      return;
    }

    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    usedHintPositions.add(pos);

    const letter = secret[pos].toUpperCase();

    await ArcadeCoins.addForGame(GAME_ID, -HINT_COST, {
      reason: "hint",
      letter,
      position: pos,
      length: wordLength,
    });

    if (window.ArcadeAuthUI?.refreshCoins) await ArcadeAuthUI.refreshCoins();

    hintTextEl.textContent = `Podpowiedź: miejsce ${pos + 1} = ${letter}. (-${HINT_COST}💎)`;
  } catch (e) {
    console.error("Błąd podpowiedzi:", e);
    statusEl.textContent = "Błąd podpowiedzi.";
  } finally {
    hintBtn.disabled = false;
  }
}

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

async function initGame() {
  cacheDom();
  setupKeyboardListener();

  btnNew?.addEventListener("click", startNewGame);

  btnReset?.addEventListener("click", async () => {
    gamesPlayed = 0;
    wins = 0;
    currentStreak = 0;
    maxStreak = 0;
    updateStatsUI();
    await saveProgress();
    statusEl.textContent = "Rekordy wyczyszczone.";
  });

  wordLenSel?.addEventListener("change", () => {
    wordLength = parseInt(wordLenSel.value, 10);
    startNewGame();
  });

  hintBtn?.addEventListener("click", useHint);

  await loadProgress();
  await loadDictionary();
  startNewGame();
}

document.addEventListener("DOMContentLoaded", initGame);
