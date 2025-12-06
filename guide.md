Neon Arcade – przewodnik dla ChatGPT jak tworzyć nowe gry

Ten dokument mówi Ci, ChatGPT, jak dokładnie tworzyć nowe gry do
projektu GRY-EDUKACYJNE, tak żeby: - pasowały do istniejącej struktury
katalogów, - używały obecnej logiki JS oraz styli CSS, - korzystały z
ArcadeProgress, auth-bar, auth.js, game-api.js, - pojawiały się
poprawnie w arcade.html.

1. Struktura projektu

GRY-EDUKACYJNE/ index.html arcade.html confirm.html reset.html
games.json css/ js/ core/ pages/ games/// index.html game.js game.css
meta.json

2. games.json

Dodając nową grę dopisujesz ją do odpowiedniej kategorii: { “id”:
“classic”, “name”: “Gry klasyczne”, “icon”: “🎮”, “folder”:
“games/classic”, “games”: [“2048”, “snake”, “nowagra”] }

3. meta.json

{ “id”: “nowagra”, “name”: “Nazwa Gry”, “description”: “Opis gry.”,
“icon”: “🎮”, “thumb”: null, “entry”: “index.html” }

4. index.html gry

-   musi zawierać:
    -   link do motywu: ../../../css/theme.css
    -   link do game.css
    -   core js: auth.js, auth-bar.js, progress.js, ui.js
    -   własny game.js
    -   pasek logowania:

5. game.js

-   każda gra musi mieć: const GAME_ID = “id-gry”; hasUnsavedChanges =
    false;

-   używa ArcadeProgress.load/save/clear(GAME_ID)

-   dodaje: ArcadeUI.addBackToArcadeButton({ backUrl:
    “../../../arcade.html” });

-   logika unsaved changes: gdy plansza / wynik się zmienia →
    hasUnsavedChanges = true przy zapisie → false beforeunload →
    ostrzeżenie

6. Przyciski gry:

-   #new-game-btn
-   #save-game-btn
-   #reset-record-btn

7. game.css

-   lokalny styl gry
-   nie nadpisuje globalnych styli motywu

8. Checklista nowej gry:

-   dodaj folder gry
-   utwórz meta.json
-   dopisz grę do games.json
-   przygotuj index.html na bazie szablonu
-   napisz game.js wykorzystując ArcadeProgress
-   dodaj game.css
