# 🕹️ Neon Arcade – Szczegółowy przewodnik tworzenia gier

Ten dokument opisuje **jak tworzyć nowe gry** w projekcie `GRY-EDUKACYJNE` tak, aby:

- pasowały do istniejącej architektury,
- korzystały z logiki logowania (Supabase),
- korzystały z paska (`auth-bar`),
- używały systemu progresu (`ArcadeProgress`),
- miały **uniwersalny przycisk powrotu**,
- były dopasowane do **wysokości okna** (bez przewijania w typowych warunkach),
- wykorzystywały motyw (`theme.css`).

Przewodnik jest przeznaczony:
- dla programisty,
- dla ChatGPT (jako instrukcja, co generować).

---

## 0. Struktura projektu

Docelowa struktura:

```text
GRY-EDUKACYJNE/
  index.html          ← ekran logowania
  arcade.html         ← lista gier
  confirm.html        ← strona po aktywacji konta
  reset.html          ← zmiana hasła
  games.json          ← lista kategorii i gier

  css/
    theme.css         ← główny motyw (UI, przyciski, karty, layout gier)
    arcade.css        ← widok kafelków w arcade.html
    login.css         ← widok logowania

  js/
    core/
      auth.js         ← logika Supabase (login, rejestracja, reset)
      auth-bar.js     ← pasek logowania (data-arcade-auth-bar)
      progress.js     ← ArcadeProgress: zapis/odczyt progresu
      ui.js           ← ArcadeUI: przycisk powrotu, helpery UI
      game-api.js     ← ładowanie meta gier z games.json
    pages/
      index.js        ← logika strony logowania
      arcade.js       ← logika strony arcade (lista gier)

  games/
    <kategoria>/
      <gra>/
        index.html    ← strona gry
        game.js       ← logika gry
        game.css      ← style gry
        meta.json     ← opis gry (tytuł, ikona, itp.)
Gry żyją tylko w games/.
Plików w js/core/ i css/theme.css nie modyfikujemy z poziomu gier, tylko je wykorzystujemy.

1. Kategorie i lista gier – games.json
Plik games.json definiuje wszystkie kategorie i gry, które pojawiają się w arcade.html.

Przykład:

json
Skopiuj kod
{
  "categories": [
    {
      "id": "classic",
      "name": "Gry klasyczne",
      "icon": "🎮",
      "folder": "games/classic",
      "games": ["2048", "snake"]
    },
    {
      "id": "language",
      "name": "Języki obce",
      "icon": "🈵",
      "folder": "games/language",
      "games": ["hangul-basics"]
    }
  ]
}
Zasady:
id – krótkie, unikalne, bez spacji ("classic", "logic", "memory").

name – nazwa po polsku.

icon – emoji (opcjonalne, ale fajne).

folder – ścieżka do katalogu kategorii (games/classic, games/language).

games – nazwy folderów gier w tej kategorii (np. games/classic/2048 → "2048").

Dodając nową grę:

Tworzysz katalog gry (np. games/logic/memory/).

Dodajesz jej ID (np. "memory") do listy games w odpowiedniej kategorii, lub tworzysz nową kategorię.

2. Folder gry i meta.json
Nowa gra ma swoją własną przestrzeń:

text
Skopiuj kod
games/<kategoria>/<gra>/
  index.html
  game.js
  game.css
  meta.json
meta.json
Służy do opisu gry (wyświetlanego na kafelku w arcade).

Przykład:

json
Skopiuj kod
{
  "id": "2048",
  "name": "Neon 2048",
  "description": "Łącz kafelki, żeby dojść do 2048.",
  "icon": "🔢",
  "thumb": null,
  "entry": "index.html"
}
Zasady:

id – taki sam jak nazwa folderu gry (np. 2048, memory, snake).

name – nazwa widoczna w UI.

description – krótki opis (1–2 zdania).

icon – emoji, jeśli chcesz wyróżnić grę.

thumb – na razie null.

entry – zawsze "index.html".

3. Uniwersalny layout gier (wysokość = okno)
3.1. Body gry
Każda gra ma taki szkielet:

html
Skopiuj kod
<body class="arcade-body arcade-game-page">
  <div data-arcade-auth-bar
       data-after-login="../../../arcade.html"
       data-after-guest="../../../arcade.html"></div>

  <div class="shell">
    <div class="card game-root">
      <!-- tutaj treść gry -->
    </div>
  </div>
</body>
Kluczowe:

class="arcade-body arcade-game-page" – uruchamia layout pełnoekranowy dla gry.

data-arcade-auth-bar – pasek logowania działa automatycznie.

.shell + .card.game-root – gra jest w karcie, wycentrowanej na ekranie.

3.2. Uniwersalne reguły w theme.css
W css/theme.css mamy (lub dodajemy) coś takiego:

css
Skopiuj kod
/* ===========================
   Uniwersalny pełny widok gry
   =========================== */

/* Każda gra:
   <body class="arcade-body arcade-game-page">
*/

.arcade-game-page {
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden; /* minimalizujemy scroll */
  display: flex;
  flex-direction: column;
}

/* Główny kontener gry: karta wycentrowana */
.arcade-game-page .shell {
  flex: 1 1 auto;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.5rem 1rem;
}

/* Karta gry – wspólne ograniczenia */
.arcade-game-page .card.game-root {
  width: 100%;
  max-width: 720px;
}

/* Przy niższym oknie — mniej paddingu */
@media (max-height: 720px) {
  .arcade-game-page .shell {
    padding-block: 0.75rem;
  }

  .arcade-game-page .card.game-root {
    padding: 1rem 1.2rem;
  }
}
Efekt:

gra „siedzi” w karcie o wysokości dostosowanej do okna,

nie mamy niepotrzebnego scrolla na typowych ekranach,

przy niskich oknach karta sama się trochę „zagęszcza”.

4. Uniwersalny przycisk „Powrót do Arcade”
Przycisk powrotu jest uniwersalny:

nie wpisujemy go w HTML gry,

dodaje go ArcadeUI dla każdej gry, która o niego poprosi,

wygląda tak samo w każdej grze.

4.1. Styl przycisku w theme.css
Dodaj do theme.css:

css
Skopiuj kod
/* Uniwersalny przycisk powrotu do Arcade */

.arcade-back-btn {
  position: fixed;
  top: 3.8rem;         /* trochę poniżej paska logowania */
  left: 1.2rem;
  z-index: 9999;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;

  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
  border: 1px solid rgba(148, 163, 184, 0.4);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);

  cursor: pointer;
  white-space: nowrap;
  transition: 0.15s ease;
}

.arcade-back-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.9);
}

.arcade-back-btn:active {
  transform: translateY(1px);
  opacity: 0.8;
}
4.2. Implementacja w js/core/ui.js
Plik js/core/ui.js powinien zawierać obiekt ArcadeUI i m.in.:

js
Skopiuj kod
// js/core/ui.js

window.ArcadeUI = window.ArcadeUI || {};

/**
 * Uniwersalny przycisk „Powrót do Arcade”
 * Przykład użycia w grze:
 * ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });
 */
ArcadeUI.addBackToArcadeButton = function (options) {
  const backUrl = (options && options.backUrl) || "arcade.html";

  // Nie dodawaj drugiego przycisku, jeśli już istnieje
  if (document.querySelector(".arcade-back-btn")) return;

  const btn = document.createElement("button");
  btn.className = "arcade-btn arcade-back-btn";
  btn.textContent = "← Powrót";

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    window.location.href = backUrl;
  });

  document.body.appendChild(btn);
};

/* + opcjonalne helpery ArcadeUI: showLoading, hideLoading, setError, etc. */
4.3. Jak gra z tego korzysta?
W game.js gry (np. 2048) na końcu funkcji inicjalizującej:

js
Skopiuj kod
function initGame() {
  // ... setup gry, eventy, wczytanie progresu ...

  setupBeforeUnloadGuard();
  setupClickGuard();

  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html"
    });
  }
}

document.addEventListener("DOMContentLoaded", initGame);
Relatywna ścieżka:

gra jest w games/<kat>/<gra>/index.html,

arcade.html jest w root,

więc ścieżka to ../../../arcade.html.

5. Wymagane skrypty w każdej grze (index.html)
Gra znajduje się w:

text
Skopiuj kod
games/<kategoria>/<gra>/index.html
Cele:

pasek logowania działa,

logowanie/reset działa (Supabase),

zapis progresu działa,

UI helpery działają,

logika gry działa.

5.1. Szablon <head> gry
Minimalny, poprawny:

html
Skopiuj kod
<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <title>NAZWA GRY – Neon Arcade</title>

    <!-- Motyw globalny -->
    <link rel="stylesheet" href="../../../css/theme.css" />
    <!-- Styl gry -->
    <link rel="stylesheet" href="game.css" />

    <!-- Supabase – musi być przed auth.js -->
    <script
      src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
      defer
    ></script>

    <!-- Core -->
    <script src="../../../js/core/auth.js" defer></script>
    <script src="../../../js/core/auth-bar.js" defer></script>
    <script src="../../../js/core/progress.js" defer></script>
    <script src="../../../js/core/ui.js" defer></script>

    <!-- Logika gry -->
    <script src="game.js" defer></script>
  </head>
Ścieżki relatywne są kluczowe:

z gry (3 poziomy w dół) do root:

../../../css/theme.css

../../../js/core/auth.js

etc.

Typowe błędy:

../../js/core/... – za mało kropek → 404.

games/js/core/... – nie istnieje taki katalog.

brak Supabase → Brak połączenia z serwerem przy logowaniu w grze.

6. Struktura index.html gry
Przykład pełnego szablonu gry:

html
Skopiuj kod
<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <title>Neon 2048 – Neon Arcade</title>

    <link rel="stylesheet" href="../../../css/theme.css" />
    <link rel="stylesheet" href="game.css" />

    <script
      src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
      defer
    ></script>
    <script src="../../../js/core/auth.js" defer></script>
    <script src="../../../js/core/auth-bar.js" defer></script>
    <script src="../../../js/core/progress.js" defer></script>
    <script src="../../../js/core/ui.js" defer></script>

    <script src="game.js" defer></script>
  </head>
  <body class="arcade-body arcade-game-page">
    <div
      data-arcade-auth-bar
      data-after-login="../../../arcade.html"
      data-after-guest="../../../arcade.html"
    ></div>

    <div class="shell">
      <div class="card game-root">
        <header class="game-header">
          <div>
            <h1 class="game-title">Neon 2048</h1>
            <p class="game-subtitle">
              Łącz kafelki o takich samych wartościach, żeby dojść do 2048.
            </p>
          </div>

          <div class="score-panel">
            <div class="score-box">
              <span class="score-label">Wynik</span>
              <span id="score" class="score-value">0</span>
            </div>
            <div class="score-box">
              <span class="score-label">Rekord</span>
              <span id="best-score" class="score-value">0</span>
            </div>
            <div class="score-box">
              <span class="score-label">Gry</span>
              <span id="total-games" class="score-value">0</span>
            </div>
          </div>

          <div class="score-panel">
            <button id="new-game-btn" class="btn-primary">Nowa gra</button>
            <button id="save-game-btn" class="btn-primary">Zapisz</button>
            <button id="reset-record-btn" class="btn-primary">
              Resetuj rekord
            </button>
          </div>
        </header>

        <div class="board-wrapper">
          <div id="board" class="board"></div>

          <div id="overlay" class="overlay overlay--hidden">
            <div class="overlay-content">
              <h2>Koniec gry</h2>
              <p>Brak ruchów. Spróbuj jeszcze raz!</p>
              <button id="play-again-btn" class="btn-primary">
                Zagraj ponownie
              </button>
            </div>
          </div>
        </div>

        <div class="game-info">
          Sterowanie: strzałki lub WASD.
          <div class="games-played-info">
            Rozegranych gier: <span id="games-played-info">0</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
7. Styl gry – game.css
Każda gra ma własny game.css:

nie ustawia globalnych rzeczy typu body,

korzysta z .game-root, .game-header, .game-title, itp.,

może dodawać swoje klasy, np. .board, .tile, .question, .answers.

Przykład dla 2048 (upraszczając ideę):

css
Skopiuj kod
/* KARTA GRY */

.game-root {
  border-radius: 1rem;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  padding: 1.5rem 1.8rem;
}

/* NAGŁÓWEK */

.game-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.game-title {
  font-size: 2rem;
  margin: 0;
}

.game-subtitle {
  margin: 0.25rem 0 0;
  opacity: 0.8;
  font-size: 0.95rem;
}

/* … reszta: score-panel, board, tile, overlay, game-info … */

/* RWD po szerokości */

@media (max-width: 640px) {
  .game-root {
    padding: 1.1rem 1.1rem 1rem;
  }

  .game-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .game-header > .score-panel:last-of-type {
    margin-left: 0;
  }

  .score-panel {
    align-self: stretch;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .board {
    max-width: 100%;
  }
}

/* RWD po wysokości – dopasowanie do okna */

@media (max-height: 720px) {
  .game-root {
    padding: 1rem 1.2rem 0.9rem;
  }

  .game-title {
    font-size: 1.7rem;
  }

  .game-subtitle {
    font-size: 0.85rem;
  }

  .board {
    max-width: min(360px, 70vh);
    gap: 0.6rem;
    padding: 0.6rem;
  }

  .tile {
    font-size: 1.2rem;
  }

  .game-info {
    font-size: 0.8rem;
  }
}
Dzięki temu gra dostosowuje się do wysokości okna – plansza się minimalnie zmniejsza, ale wszystko mieści się bez obrzydliwego scrolla.

8. Logika gry – game.js
Każda gra powinna:

mieć stałą GAME_ID zgodną z folderem / meta,

integrować się z ArcadeProgress (load/save/clear),

mieć mechanizm hasUnsavedChanges,

ustawiać guard na wyjście (beforeunload + przechwytywanie klików),

dodawać uniwersalny przycisk powrotu.

8.1. Szkielet game.js
js
Skopiuj kod
const GAME_ID = "2048"; // np. "memory", "snake"
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

// Stan gry — dopasuj do konkretnej gry
let score = 0;
let bestScore = 0;
let totalGames = 0;
// ... inne pola stanu (plansza, poziom, itp.)

// DOM
let boardEl;
let scoreEl;
let bestScoreEl;
let totalGamesEl;

function initGame() {
  // referencje DOM
  boardEl = document.getElementById("board");
  scoreEl = document.getElementById("score");
  bestScoreEl = document.getElementById("best-score");
  totalGamesEl = document.getElementById("total-games");

  // wczytaj progres
  loadProgress().then(function () {
    // zainicjuj stan gry, UI, eventy
    initBoard();
    attachEvents();

    setupBeforeUnloadGuard();
    setupClickGuard();

    if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }
  });
}
8.2. Integracja z ArcadeProgress
Ładowanie progresu:
js
Skopiuj kod
function loadProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.load) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.load");
    return Promise.resolve();
  }

  return ArcadeProgress.load(GAME_ID)
    .then(function (data) {
      if (!data) return;

      // przykład:
      if (typeof data.bestScore === "number") bestScore = data.bestScore;
      if (typeof data.totalGames === "number") totalGames = data.totalGames;

      LAST_SAVE_DATA = data;
      hasUnsavedChanges = false;
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd load:", err);
    });
}
Zapis sesji („Zapisz”):
js
Skopiuj kod
function buildSavePayload() {
  return {
    bestScore: bestScore,
    totalGames: totalGames
    // + inne dane, jeśli gra ich potrzebuje
  };
}

function saveCurrentSession() {
  if (!window.ArcadeProgress || !ArcadeProgress.save) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.save");
    return Promise.resolve();
  }

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload)
    .then(function () {
      LAST_SAVE_DATA = payload;
      hasUnsavedChanges = false;
      console.log("[GAME]", GAME_ID, "zapisano:", payload);
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd save:", err);
    });
}
Reset rekordu:
js
Skopiuj kod
function clearProgress() {
  if (!window.ArcadeProgress || !ArcadeProgress.clear) {
    console.warn("[GAME]", GAME_ID, "Brak ArcadeProgress.clear");
    return Promise.resolve();
  }

  return ArcadeProgress.clear(GAME_ID)
    .then(function () {
      LAST_SAVE_DATA = null;
      hasUnsavedChanges = false;
      console.log("[GAME]", GAME_ID, "progress wyczyszczony");
    })
    .catch(function (err) {
      console.error("[GAME]", GAME_ID, "Błąd clear:", err);
    });
}
8.3. Obsługa przycisków
Zakładamy, że gra ma w HTML:

#new-game-btn

#save-game-btn

#reset-record-btn

W initGame():

js
Skopiuj kod
function attachEvents() {
  const newGameBtn = document.getElementById("new-game-btn");
  const saveGameBtn = document.getElementById("save-game-btn");
  const resetRecordBtn = document.getElementById("reset-record-btn");

  if (newGameBtn) {
    newGameBtn.addEventListener("click", function () {
      const ok =
        !hasUnsavedChanges ||
        window.confirm(
          "Rozpocząć nową grę? Aktualny postęp tej rozgrywki nie zostanie zapisany."
        );
      if (!ok) return;
      startNewGame();
    });
  }

  if (saveGameBtn) {
    saveGameBtn.addEventListener("click", function () {
      saveCurrentSession();
    });
  }

  if (resetRecordBtn) {
    resetRecordBtn.addEventListener("click", function () {
      const ok = window.confirm(
        "Na pewno chcesz zresetować rekord i statystyki dla tej gry?"
      );
      if (!ok) return;

      // wyzerowanie stanu lokalnego
      bestScore = 0;
      totalGames = 0;
      updateUI();

      clearProgress();
    });
  }
}
8.4. Niezapisane zmiany – guard
Każda gra:

po zmianach stanu ustawia hasUnsavedChanges = true,

po zapisie/ładowaniu/resetowaniu daje false.

Guardy:

js
Skopiuj kod
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
    const isReturnToArcade =
      (href && href.indexOf("arcade.html") !== -1) ||
      target.classList.contains("arcade-back-btn");

    if (isReturnToArcade) {
      const ok = window.confirm(
        "Masz niezapisany postęp. Wyjść bez zapisywania?"
      );
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });
}
Dzięki temu:

zamknięcie karty / odświeżenie – ostrzeżenie,

kliknięcie „Powrót do Arcade” – ostrzeżenie,

dopiero po „OK” użytkownik wychodzi.

9. Checklista dla nowej gry (dla Ciebie / dla ChatGPT)
Za każdym razem, gdy dodajesz nową grę:

Wybierz ID gry – np. "memory", "snake", "kana-quiz".

Wybierz kategorię – istniejącą lub nową.

Dopisz grę do games.json w odpowiedniej kategorii.

Utwórz folder:

text
Skopiuj kod
games/<kategoria>/<id>/
Dodaj pliki:

meta.json – opis gry,

index.html – wg szablonu (scripts + body.arcade-game-page + data-arcade-auth-bar),

game.js – z GAME_ID, ArcadeProgress, guardami i ArcadeUI.addBackToArcadeButton,

game.css – tylko styl wnętrza gry (.game-root, .game-header, .board, itd.).

Upewnij się, że:

w <head> jest supabase-js@2 przed auth.js,

ścieżki do core mają formę: ../../../js/core/...,

body ma klasy: arcade-body arcade-game-page,

gra nie próbuje korzystać z Supabase bezpośrednio – tylko przez auth.js i ArcadeProgress.

W game.js:

ustaw hasUnsavedChanges tam, gdzie trzeba,

implementuj przyciski („Nowa gra”, „Zapisz”, „Resetuj rekord”),

na koniec initGame() wywołaj:

js
Skopiuj kod
ArcadeUI.addBackToArcadeButton({
  backUrl: "../../../arcade.html"
});
Po spełnieniu tych punktów nowa gra:

pojawi się automatycznie w arcade.html,

będzie miała pasek logowania,

będzie miała przycisk powrotu,

będzie ładnie wyglądać w motywie,

będzie dopasowana do wysokości okna (bez losowego scrolla),

będzie zapamiętywać progres per użytkownik / gość.
