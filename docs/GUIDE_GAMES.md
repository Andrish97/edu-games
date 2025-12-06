# 🕹️ Neon Arcade -- Kompletny Przewodnik Tworzenia Gier

------------------------------------------------------------------------

## 📌 1. Struktura projektu

    GRY-EDUKACYJNE/
      index.html
      arcade.html
      confirm.html
      reset.html
      games.json

      css/
        theme.css
        arcade.css
        login.css

      js/
        core/
          auth.js
          auth-bar.js
          progress.js
          ui.js
          game-api.js
        pages/
          index.js
          arcade.js

      games/
        <kategoria>/
          <gra>/
            index.html
            game.js
            game.css
            meta.json

Gry istnieją wyłącznie w katalogu `games/`.\
Pliki **core** nie mogą być modyfikowane podczas tworzenia nowych gier.

------------------------------------------------------------------------

## 📌 2. Plik `games.json`

Plik definiuje listę kategorii oraz gier widocznych w Neon Arcade.

Przykład:

``` json
{
  "categories": [
    {
      "id": "classic",
      "name": "Gry klasyczne",
      "icon": "🎮",
      "folder": "games/classic",
      "games": ["2048", "snake"]
    }
  ]
}
```

### Zasady tworzenia kategorii i gier

-   `id` → krótkie, unikalne, bez spacji.
-   `folder` → musi prowadzić do katalogu kategorii.
-   `games` → lista nazw folderów gier.
-   Gra musi być wpisana **dokładnie tak** jak jej folder.

------------------------------------------------------------------------

## 📌 3. Folder gry

Przykład struktury gry:

    games/logic/memory/
      index.html
      game.js
      game.css
      meta.json

------------------------------------------------------------------------

## 📌 4. meta.json -- opis gry

Każda gra ma swój meta plik:

``` json
{
  "id": "memory",
  "name": "Neon Memory",
  "description": "Znajdź wszystkie pary kart.",
  "icon": "🧠",
  "thumb": null,
  "entry": "index.html"
}
```

### Zasady:

-   `id` = nazwa folderu gry.
-   `name` = nazwa wyświetlana w kafelkach.
-   `description` = jednozdaniowy opis.
-   `icon` = emoji (opcjonalnie, ale zalecane).
-   `entry` = zawsze `index.html`.

------------------------------------------------------------------------

## 📌 5. index.html gry -- szablon obowiązkowy

Każda gra musi korzystać z core logiki oraz motywu.

Szablon:

``` html
<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <title>NAZWA GRY – Neon Arcade</title>

    <link rel="stylesheet" href="../../../css/theme.css" />
    <link rel="stylesheet" href="game.css" />

    <script src="../../../js/core/auth.js" defer></script>
    <script src="../../../js/core/auth-bar.js" defer></script>
    <script src="../../../js/core/progress.js" defer></script>
    <script src="../../../js/core/ui.js" defer></script>

    <script src="game.js" defer></script>
  </head>

  <body class="arcade-body">
    <div
      data-arcade-auth-bar
      data-after-login="../../../arcade.html"
      data-after-guest="../../../arcade.html"
    ></div>

    <div class="shell">
      <div class="card">
        <header class="header">
          <div>
            <div class="title">NAZWA GRY</div>
            <div class="subtitle">Krótki opis gry.</div>
          </div>
        </header>

        <div id="game-root"></div>
      </div>
    </div>
  </body>
</html>
```

------------------------------------------------------------------------

## 📌 6. Styl gry (`game.css`)

Zasady:

-   Stylujesz TYLKO elementy gry (`#game-root`, `.game-*`).
-   Nie nadpisujesz globalnych styli `.card`, `.shell`, `.header`.
-   Używasz komponentów motywu:
    -   `.arcade-btn`
    -   `.arcade-input`
    -   `.danger`, `.ghost`, itp.

------------------------------------------------------------------------

## 📌 7. game.js -- logika integracji

Każda gra musi:

-   definiować `GAME_ID`,
-   używać `ArcadeProgress` do zapisu,
-   mieć `hasUnsavedChanges`,
-   używać `ArcadeUI.addBackToArcadeButton`.

Przykład:

``` js
const GAME_ID = "memory";
let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

function initGame() {
  ArcadeUI.addBackToArcadeButton({ backUrl: "../../../arcade.html" });

  loadProgress().then(() => {
    setupButtons();
  });
}
```
### Przycisk „Powrót do Arcade”

Każda gra powinna na końcu `initGame` zawołać:

```js
function initArcadeBackButton() {
  if (window.ArcadeUI && ArcadeUI.addBackToArcadeButton) {
    ArcadeUI.addBackToArcadeButton({
      backUrl: "../../../arcade.html",
    });
  }
}

function initGame() {
  // ...
  initArcadeBackButton();
}
```
### Ładowanie progresu

``` js
function loadProgress() {
  return ArcadeProgress.load(GAME_ID).then((data) => {
    if (!data) return;
    LAST_SAVE_DATA = data;
    hasUnsavedChanges = false;
  });
}
```

### Zapis

``` js
function saveCurrentSession() {
  const payload = { /* dane gry */ };

  return ArcadeProgress.save(GAME_ID, payload).then(() => {
    LAST_SAVE_DATA = payload;
    hasUnsavedChanges = false;
  });
}
```

### Reset

``` js
function clearProgress() {
  return ArcadeProgress.clear(GAME_ID).then(() => {
    LAST_SAVE_DATA = null;
    hasUnsavedChanges = false;
  });
}
```

------------------------------------------------------------------------

## 📌 8. Przyciski gry

Każda gra powinna zawierać:

``` html
<button id="new-game-btn" class="arcade-btn">Nowa gra</button>
<button id="save-game-btn" class="arcade-btn">Zapisz</button>
<button id="reset-record-btn" class="arcade-btn danger">Resetuj rekord</button>
```

Ich logika jest w `game.js`.

------------------------------------------------------------------------

## 📌 9. Ostrzeżenia o niezapisanym stanie

Gdy gra ma zmiany:

``` js
hasUnsavedChanges = true;
```

Ostrzeżenie przy wyjściu:

``` js
window.addEventListener("beforeunload", (e) => {
  if (!hasUnsavedChanges) return;
  e.preventDefault();
  e.returnValue = "";
});
```

------------------------------------------------------------------------

## 📌 10. Checklista nowej gry (dla ChatGPT i developerów)

1.  Nadaj ID gry.

2.  Dodaj ją do odpowiedniej kategorii w `games.json`.

3.  Utwórz folder:

        games/<kategoria>/<id>/

4.  Stwórz pliki:

    -   `meta.json`
    -   `index.html`
    -   `game.js`
    -   `game.css`

5.  Użyj motywu (`theme.css`).

6.  Użyj `ArcadeProgress` do zapisu.

7.  Użyj `data-arcade-auth-bar`.

8.  Użyj `ArcadeUI.addBackToArcadeButton`.
