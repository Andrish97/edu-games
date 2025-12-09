// ===============================
// Neon Wordl PL – game.js
// ===============================

"use strict";

// URL do Twojej Edge Function wordgen (Supabase)
const EDGE_URL = "https://zbcpqwugthvizqzkvurw.functions.supabase.co/wordgen";

// Ile prób
const MAX_ROWS = 6;

// Dozwolone długości słów
const ALLOWED_LENGTHS = [4, 5, 6, 7];

// DOM
let boardEl;
let statusEl;
let lenSel;
let newGameBtn;
let resetDictBtn;
let keyboardEl;

// Stan gry
let board = [];
let row = 0;
let col = 0;
let wordLength = 5;
let secret = "";

// Układ klawiatury – bez Q, V, X
const KEYBOARD = [
  "A","Ą","B","C","Ć","D","E","Ę","F","G",
  "H","I","J","K","L","Ł","M","N","Ń","O",
  "Ó","P","R","S","Ś","T","U","W","Y","Z",
  "Ż","Ź"
];

// ===============================
//   POMOCNICZE – SŁOWNIKI GOŚCIA
// ===============================

function loadGuestDict(len) {
  const key = "guest_dict_" + len;
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    console.warn("[NeonWordl] Nieprawidłowy słownik gościa, resetuję:", e);
  }

  // jeśli dotarliśmy tutaj – w storage był syf
  localStorage.removeItem(key);
  return [];
}

function saveGuestDict(len, words) {
  const key = "guest_dict_" + len;
  localStorage.setItem(key, JSON.stringify(words));
}

// ===============================
//   POBIERANIE SŁÓW Z EDGE FUNCTION
// ===============================

async function generateWordsFromAI(len) {
  const resp = await fetch(EDGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ len })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("[NeonWordl] Błąd wordgen:", resp.status, text);
    throw new Error("Wordgen zwrócił błąd " + resp.status);
  }

  let data;
  try {
    data = await resp.json();
  } catch (e) {
    console.error("[NeonWordl] Niepoprawny JSON z wordgen:", e);
    throw new Error("Nie udało się odczytać JSON z wordgen");
  }

  if (!data || !Array.isArray(data.words) || !data.words.length) {
    console.error("[NeonWordl] Niepoprawna struktura odpowiedzi z wordgen:", data);
    throw new Error("Wordgen zwrócił złą strukturę");
  }

  return data.words;
}

// ===============================
//   SŁOWNIK – GOŚĆ (localStorage)
// ===============================

async function getGuestSecret(len) {
  let words = loadGuestDict(len);

  if (!words.length) {
    words = await generateWordsFromAI(len);
    if (!Array.isArray(words) || !words.length) {
      throw new Error("Brak poprawnych słów z AI dla gościa");
    }
    saveGuestDict(len, words);
  }

  const secret = words.shift();
  saveGuestDict(len, words);
  return secret;
}

function resetGuestDict(len) {
  const key = "guest_dict_" + len;
  localStorage.removeItem(key);
}

// ===============================
//   SŁOWNIK – UŻYTKOWNIK (Supabase)
// ===============================

async function loadUserDict(user_id, len) {
  if (!window.supabaseClient) return null;

  const { data, error } = await supabaseClient
    .from("user_dicts")
    .select("words")
    .eq("user_id", user_id)
    .eq("len", len)
    .maybeSingle();

  if (error) {
    console.error("[NeonWordl] loadUserDict error:", error);
    return null;
  }

  return (data && Array.isArray(data.words)) ? data.words : null;
}

async function saveUserDict(user_id, len, words) {
  if (!window.supabaseClient) return;

  const { error } = await supabaseClient
    .from("user_dicts")
    .upsert({
      user_id,
      len,
      words,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[NeonWordl] saveUserDict error:", error);
  }
}

async function clearUserDict(user_id, len) {
  if (!window.supabaseClient) return;

  const { error } = await supabaseClient
    .from("user_dicts")
    .delete()
    .eq("user_id", user_id)
    .eq("len", len);

  if (error) {
    console.error("[NeonWordl] clearUserDict error:", error);
  }
}

async function getSecretWord(len) {
  // próba zalogowanego usera
  if (!window.ArcadeAuth || !ArcadeAuth.getUser) {
    // brak auth – traktujemy jak gościa
    return getGuestSecret(len);
  }

  const user = await ArcadeAuth.getUser();
  if (!user || !user.id) {
    // gość
    return getGuestSecret(len);
  }

  let words = await loadUserDict(user.id, len);

  if (!words || !words.length) {
    words = await generateWordsFromAI(len);
  }

  const secret = words.shift();

  if (!words.length) {
    const refill = await generateWordsFromAI(len);
    await saveUserDict(user.id, len, refill);
  } else {
    await saveUserDict(user.id, len, words);
  }

  return secret;
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

  // priorytet: correct > present > absent
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
//   BOARD / LOGIKA LITER
// ===============================

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength}, 50px)`;
  board = [];

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

  row = 0;
  col = 0;
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
  const guessArr = [];
  for (let c = 0; c < wordLength; c++) {
    guessArr[c] = board[r][c].textContent.toLowerCase();
  }

  // kolory klawiatury
  updateKeyboardColors(guessArr, secret);

  // kolory pól
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
  if (row >= MAX_ROWS) return;
  if (col < wordLength) return; // niedopisane słowo

  let guess = "";
  const guessArr = [];
  for (let c = 0; c < wordLength; c++) {
    const ch = board[row][c].textContent.toLowerCase();
    guess += ch;
    guessArr.push(ch);
  }

  colorRow(row);

  if (guess === secret) {
    statusEl.textContent = "Brawo! Zgadłeś słowo.";
    row = MAX_ROWS;
    return;
  }

  row++;
  col = 0;

  if (row >= MAX_ROWS) {
    statusEl.textContent = "Koniec prób. Słowo: " + secret.toUpperCase();
  }
}

// ===============================
//   NOWA GRA / RESET SŁOWNIKA
// ===============================

async function newGame() {
  try {
    newGameBtn.disabled = true;
    resetDictBtn.disabled = true;
    statusEl.textContent = "Losuję słowo...";

    wordLength = parseInt(lenSel.value, 10);
    if (!ALLOWED_LENGTHS.includes(wordLength)) {
      wordLength = 5;
    }

    secret = await getSecretWord(wordLength);

    initBoard();
    resetKeyboardColors();
    initKeyboard();

    statusEl.textContent = "Zgadnij słowo!";
  } catch (e) {
    console.error("[NeonWordl] newGame error:", e);
    statusEl.textContent = "Błąd ładowania słownika. Spróbuj ponownie później.";
  } finally {
    newGameBtn.disabled = false;
    resetDictBtn.disabled = false;
  }
}

async function resetDictionaryForCurrentLength() {
  try {
    resetDictBtn.disabled = true;
    statusEl.textContent = "Czyszczę słownik...";

    const len = parseInt(lenSel.value, 10) || 5;

    let user = null;
    if (window.ArcadeAuth && ArcadeAuth.getUser) {
      user = await ArcadeAuth.getUser();
    }

    if (user && user.id) {
      await clearUserDict(user.id, len);
    } else {
      resetGuestDict(len);
    }

    statusEl.textContent = "Słownik wyczyszczony. Losuję nowe słowo...";
    await newGame();
  } catch (e) {
    console.error("[NeonWordl] resetDictionary error:", e);
    statusEl.textContent = "Błąd czyszczenia słownika.";
  } finally {
    resetDictBtn.disabled = false;
  }
}

// ===============================
//   INICJALIZACJA
// ===============================

function initGame() {
  boardEl = document.getElementById("board");
  statusEl = document.getElementById("status");
  lenSel = document.getElementById("word-len");
  newGameBtn = document.getElementById("new-game-btn");
  resetDictBtn = document.getElementById("reset-dict-btn");
  keyboardEl = document.getElementById("keyboard");

  if (!boardEl || !statusEl || !lenSel || !newGameBtn || !resetDictBtn || !keyboardEl) {
    console.error("[NeonWordl] Brak wymaganych elementów DOM.");
    return;
  }

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

  newGameBtn.addEventListener("click", function () {
    newGame();
  });

  resetDictBtn.addEventListener("click", function () {
    resetDictionaryForCurrentLength();
  });

  lenSel.addEventListener("change", function () {
    // zmiana długości słowa = nowa gra
    newGame();
  });

  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }

  // start pierwszej gry
  newGame();
}

document.addEventListener("DOMContentLoaded", initGame);
