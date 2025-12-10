# 🕹️ NEON ARCADE – Kompletny przewodnik tworzenia gier (2025)

## **Wprowadzenie**

Neon Arcade to modularna platforma webowa służąca do tworzenia, uruchamiania i zarządzania mini-grami edukacyjnymi i rozrywkowymi.  
Każda gra to osobna mała aplikacja HTML/JS/CSS, a platforma zapewnia:

- wspólne logowanie,
- wspólny system monet 💎,
- automatyczny zapis progresu,
- jednolity pasek logowania dostępny wszędzie,
- uniwersalny przycisk powrotu,
- automatyczne ładowanie gier i kategorii,
- globalny theme i responsywny layout.

Neon Arcade jest zaprojektowane tak, aby **dodanie nowej gry zajmowało mniej niż 5 minut**.

---

## **Cele projektu**

- łatwe dodawanie gier bez ingerencji w główny kod,
- pełna separacja gier od logiki platformy,
- minimalna ilość wymagań technicznych dla twórców gier,
- responsywne działanie na ekranach dotykowych,
- progres zapisywany automatycznie,
- monety motywujące graczy do powrotu,
- kompatybilność z GitHub Pages (hostowanie statyczne).

---

## **Architektura Neon Arcade**

Platforma dzieli się na trzy główne warstwy:

### **1. Warstwa systemowa**
Kod wspólny dla wszystkich gier:

- `auth.js` — logowanie, rejestracja, reset hasła (Supabase)
- `auth-bar.js` — pasek logowania + monety 💎
- `coins.js` — ekonomia monet
- `progress.js` — zapis progresu gry
- `ui.js` — uniwersalny UI (back button, overlay)
- `game-api.js` — ładowanie list gier i metadanych
- `arcade.js` — logika launchera gier (arcade.html)
- globalne style — `css/theme.css`, `css/arcade.css`, `css/login.css`

### **2. Warstwa gier**
Każda gra to oddzielny mini-projekt ze swoją logiką i UI:

`index.html`
`game.js`
`game.css`
`meta.json`

Każda gra jest autonomiczna — platforma dostarcza tylko:

- logowanie,
- monety,
- zapis progresu,
- przycisk powrotu.

### **3. Warstwa backendu (Supabase)**
Supabase przechowuje:

- dane użytkowników,
- progres gier,
- monety 💎.

Relacyjna baza obsługuje:

- `arcade_wallets` — portfele graczy,
- `arcade_progress` — zapisy stanu gry.

---

## **Filozofia projektu**

1. **Żadna gra nie używa Supabase bezpośrednio.**  
   Dostęp do zapisów i monet realizują tylko:  
   `ArcadeProgress` i `ArcadeCoins`.

2. **Każda gra ma być pojedynczym folderem.**  
   Twórca gry nie musi znać struktury platformy.

3. **Centralny launcher ładuje wszystko automatycznie.**  
   Na podstawie `games.json`.

4. **Wszystko działa statycznie.**  
   Zero backendu — GitHub Pages wystarcza.

---

## **Podstawowe pojęcia**

### **Gra**
Autonomiczna aplikacja z własnym HTML, JS, CSS.

### **Kategoria**
Grupy gier, konfigurowane w `games.json`.

### **Portfel**
Każdy zalogowany użytkownik ma konto monet 💎.

### **Progres gry**
Dowolny JSON zapisany w Supabase lub localStorage.

### **Gość**
Może grać, ale progres zapisuje tylko lokalnie i nie zdobywa monet.

---

## **Co dalej?**

W następnych częściach pojawią się:

- dokładna struktura katalogów,
- pełny opis wszystkich plików systemowych,
- jak dodać nową grę,
- jak używać progresu,
- jak przydzielać monety,
- template szkieletu nowej gry,
- troubleshooting.
