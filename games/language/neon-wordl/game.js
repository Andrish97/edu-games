// ===============================
// Neon Wordl PL – gra bez zapisywanych słowników
// ===============================

"use strict";

// Publiczny słownik PL do Wordle (GitHub, JSON array)
const WORDS_URL =
  "https://raw.githubusercontent.com/alexadam/wordle-list/main/wordlist_pl.json";

// Dozwolone długości słów
const ALLOWED_LENGTHS = [4, 5, 6, 7];
const MAX_ROWS = 6;

// Słownik w pamięci
let ALL_WORDS = null;
let WORDS_BY_LEN = {};
let WORD_SETS_BY_LEN = {};

// DOM
let boardEl;
let statusEl;
let lenSel;
let newGameBtn;
let keyboardEl;

// Stan gry
let board = [];
let row = 0;
let col = 0;
let wordLength = 5;
let secret = "";
let gameOver = false;

// Układ klawiatury (bez Q, V, X)
const KEYBOARD = [
  "A", "Ą", "B", "C", "Ć", "D", "E", "Ę", "F", "G",
  "H", "I", "J", "K", "L", "Ł", "M", "N", "Ń", "O",
  "Ó", "P", "R", "S", "Ś", "T", "U", "W", "Y", "Z",
  "Ż", "Ź"
];

// ===============================
//   SŁOWNIK Z INTERNETU
// ===============================

async function loadInternetDictionary() {
  if (ALL_WORDS) return ALL_WORDS;

  statusEl.textContent = "Pobieram słownik z internetu...";
  const resp = await fetch(WORDS_URL);

  if (!resp.ok) {
    throw new Error("Nie udało się pobrać słownika: " + resp.status);
  }

  const data = await resp.json();
  if (!Array.isArray(data)) {
    throw new Error("Niepoprawny format słownika (nie jest tablicą).");
  }

  ALL_WORDS = data;
  prepareWordsByLength();
  return ALL_WORDS;
}

function normalizeWord(w) {
  return (w || "")
    .toLowerCase()
    .replace(/[^a-ząćęłńóśżź]/g, "");
}

function prepareWordsByLength() {
  WORDS_BY_LEN = {};
  WORD_SETS_BY_LEN = {};
  ALLOWED_LENGTHS.forEach((len) => {
    WORDS_BY_LEN[len] = [];
    WORD_SETS_BY_LEN[len] = new Set();
  });

  for (const raw of ALL_WORDS) {
    const w = normalizeWord(raw);
    const l = w.length;
    if (!ALLOWED_LENGTHS.includes(l)) continue;
    // Bez liter q, v, x – rzadko używane w Wordle PL
    if (/[qvx]/.test(w)) continue;

    WORDS_BY_LEN[l].push(w);
    WORD_SETS_BY_LEN[l].add(w);
  }

  // Na wszelki wypadek tasujemy trochę słownik,
  // żeby kolejne sekrety były bardziej losowe.
  for (const len of ALLOWED_LENGTHS) {
    shuffleArray(WORDS_BY_LEN[len]);
  }
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function getSecretWord(len) {
  await loadInternetDictionary();

  const list = WORDS_BY_LEN[len] || [];
  if (!list.length) {
    throw new Error("Brak słów o długości " + len);
  }

  const idx = (Math.random() * list.length) | 0;
  return list[idx];
}

function isValidWord(len, word) {
  const set = WORD_SETS_BY_LEN[len];
  if (!set) return false;
  return set.has(word);
}

// ===============================
//   KLAWIATURA EKRANOWA
// ===============================

function initKeyboard() {
  keyboardEl.innerHTML = "";

  KEYBOARD.forEach((letter) => {
    const btn = document.createElement("button");
    btn.className = "arcade-btn word-key";
    btn.textContent = letter;
    btn.type = "button";
    btn.addEventListener("click", function () {
      pressLetter(letter.toLowerCase());
    });
    keyboardEl.appendChild(btn);
  });
}

function resetKeyboardColors() {
  const keys = keyboardEl.querySelectorAll(".word-key");
  keys.forEach((k) => {
    k.classList.remove("correct", "present", "absent");
  });
}

function markKey(letter, state) {
  const upper = letter.toUpperCase();
  const idx = KEYBOARD.indexOf(upper);
  if (idx === -1) return;
  const keyEl = keyboardEl.querySelector(`.word-key:nth-child(${idx + 1})`);
  if (!keyEl) return;

  if (state === "correct") {
    keyEl.classList.remove("present", "absent");
    keyEl.classList.add("correct");
  } else if (state === "present") {
    if (!keyEl.classList.contains("correct")) {
      keyEl.classList.remove("absent");
      keyEl.classList.add("present");
    }
  } else if (state === "absent") {
    if (
      !keyEl.classList.contains("correct") &&
      !keyEl.classList.contains("present")
    ) {
      keyEl.classList.add("absent");
    }
  }
}

function updateKeyboardColors(guessArr, secretWord) {
  for (let i = 0; i < guessArr.length; i++) {
    const ch = guessArr[i];
    if (secretWord[i] === ch) {
      markKey(ch, "correct");
    } else if (secretWord.includes(ch)) {
      markKey(ch, "present");
    } else {
      markKey(ch, "absent");
    }
  }
}

// ===============================
//   BOARD / LOGIKA WPROWADZANIA
// ===============================

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 50px)`;
  board = [];
  row = 0;
  col = 0;
  gameOver = false;

  for (let r = 0; r < MAX_ROWS; r++) {
    const rowArr = [];
    for (let c = 0; c < wordLength; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      boardEl.appendChild(tile);
      rowArr.push(tile);
    }
    board.push(rowArr);
  }
}

function pressLetter(ch) {
  if (gameOver) return;
  if (row >= MAX_ROWS) return;
  if (col >= wordLength) return;

  const tile = board[row][col];
  tile.textContent = ch.toUpperCase();
  tile.classList.add("filled");
  col++;
}

function erase() {
  if (gameOver) return;
  if (col <= 0) return;

  col--;
  const tile = board[row][col];
  tile.textContent = "";
  tile.classList.remove("filled");
}

function colorRow(r) {
  const guessArr = [];
  for (let c = 0; c < wordLength; c++) {
    guessArr[c] = board[r][c].textContent.toLowerCase();
  }

  updateKeyboardColors(guessArr, secret);

  for (let c = 0; c < wordLength; c++) {
    const tile = board[r][c];
    const ch = guessArr[c];
    if (secret[c] === ch) {
      tile.classList.add("correct");
    } else if (secret.includes(ch)) {
      tile.classList.add("present");
    } else {
      tile.classList.add("absent");
    }
  }
}

async function submitRow() {
  if (gameOver) return;
  if (row >= MAX_ROWS) return;
  if (col < wordLength) return; // niepełne słowo

  let guess = "";
  const guessArr = [];
  for (let c = 0; c < wordLength; c++) {
    const ch = board[row][c].textContent.toLowerCase();
    guess += ch;
    guessArr.push(ch);
  }

  // Sprawdź, czy słowo istnieje w słowniku
  if (!isValidWord(wordLength, guess)) {
    statusEl.textContent = "Nie znam takiego słowa w słowniku.";
    return;
  }

  colorRow(row);

  if (guess === secret) {
    statusEl.textContent = "Brawo! Zgadłeś słowo.";
    gameOver = true;
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_ROWS) {
    statusEl.textContent = "Koniec prób. Słowo: " + secret.toUpperCase();
    gameOver = true;
  } else {
    statusEl.textContent = "";
  }
}

// ===============================
//   NOWA GRA
// ===============================

async function newGame() {
  try {
    newGameBtn.disabled = true;
    statusEl.textContent = "Losuję słowo...";

    wordLength = parseInt(lenSel.value, 10);
    if (!ALLOWED_LENGTHS.includes(wordLength)) {
      wordLength = 5;
      lenSel.value = "5";
    }

    secret = await getSecretWord(wordLength);

    initBoard();
    resetKeyboardColors();
    initKeyboard();

    statusEl.textContent = "Zgadnij słowo!";
  } catch (e) {
    console.error("[NeonWordl] newGame error:", e);
    statusEl.textContent =
      "Błąd ładowania słów z internetu. Spróbuj odświeżyć stronę później.";
  } finally {
    newGameBtn.disabled = false;
  }
}

// ===============================
//   INICJALIZACJA GRY
// ===============================

function initGame() {
  boardEl = document.getElementById("board");
  statusEl = document.getElementById("status");
  lenSel = document.getElementById("word-len");
  newGameBtn = document.getElementById("new-game-btn");
  keyboardEl = document.getElementById("keyboard");

  if (!boardEl || !statusEl || !lenSel || !newGameBtn || !keyboardEl) {
    console.error("[NeonWordl] Brak wymaganych elementów DOM.");
    return;
  }

  // Klawiatura fizyczna
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      submitRow();
      return;
    }
    if (e.key === "Backspace") {
      erase();
      return;
    }
    if (/^[a-ząćęłńóśżź]$/i.test(e.key)) {
      pressLetter(e.key.toLowerCase());
      return;
    }
  });

  // Przyciski
  newGameBtn.addEventListener("click", function () {
    newGame();
  });

  lenSel.addEventListener("change", function () {
    newGame();
  });

  // Przyciski powrotu
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }

  // Start
  newGame();
}

document.addEventListener("DOMContentLoaded", initGame);
