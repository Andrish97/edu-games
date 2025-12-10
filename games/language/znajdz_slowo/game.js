// -------------------------------------------------------------
// Znajdź Słowo – Neon Arcade 2025
// -------------------------------------------------------------
// Funkcje:
// - minimalny progres (opcje A)
// - monety: +1 poprawna, +5 koniec poziomu, +10 odblokowanie świata
// - podpowiedź za 5 diamentów
// - integracja z ArcadeCoins, ArcadeProgress, ArcadeUI
// -------------------------------------------------------------

const GAME_ID = "znajdz-slowo";

// -------------------------------
// Światy gry + pytania
// -------------------------------
const WORLDS = [
   {
    id: "animals",
    name: "Zwierzęta",
    icon: "🐾",
    hint: "Czytaj nazwy zwierząt i znajdź właściwą.",
    rounds: [
      { emoji: "🐱", correct: "kot", others: ["pies", "mysz"] },
      { emoji: "🐶", correct: "pies", others: ["kot", "ryba"] },
      { emoji: "🐭", correct: "mysz", others: ["kot", "żaba"] },
      { emoji: "🐰", correct: "królik", others: ["pies", "koń"] },
      { emoji: "🐹", correct: "chomik", others: ["mysz", "kot"] },
      { emoji: "🐷", correct: "świnia", others: ["koza", "krowa"] },
      { emoji: "🐮", correct: "krowa", others: ["koza", "owca"] },
      { emoji: "🐴", correct: "koń", others: ["pies", "krowa"] },
      { emoji: "🐑", correct: "owca", others: ["koza", "kura"] },
      { emoji: "🐐", correct: "koza", others: ["owca", "świnia"] },
      { emoji: "🐔", correct: "kura", others: ["kaczka", "gęś"] },
      { emoji: "🦆", correct: "kaczka", others: ["kura", "gęś"] },
      { emoji: "🦢", correct: "łabędź", others: ["kaczka", "gęś"] },
      { emoji: "🦊", correct: "lis", others: ["pies", "kot"] },
      { emoji: "🐻", correct: "miś", others: ["pies", "kot"] },
      { emoji: "🐸", correct: "żaba", others: ["ryba", "mysz"] },
      { emoji: "🐟", correct: "ryba", others: ["pies", "kot"] },
      { emoji: "🐢", correct: "żółw", others: ["żaba", "ryba"] },
      { emoji: "🐝", correct: "pszczoła", others: ["motyl", "biedronka"] },
      { emoji: "🦋", correct: "motyl", others: ["pszczoła", "biedronka"] },
      { emoji: "🐞", correct: "biedronka", others: ["pszczoła", "mrówka"] },
      { emoji: "🐜", correct: "mrówka", others: ["pszczoła", "komar"] }
    ]
  },
  {
    id: "food",
    name: "Jedzenie",
    icon: "🍎",
    hint: "Znajdź nazwę owocu lub jedzenia.",
    rounds: [
      { emoji: "🍎", correct: "jabłko", others: ["gruszka", "banan"] },
      { emoji: "🍌", correct: "banan", others: ["jabłko", "pomidor"] },
      { emoji: "🍐", correct: "gruszka", others: ["jabłko", "marchewka"] },
      { emoji: "🍊", correct: "pomarańcza", others: ["cytryna", "jabłko"] },
      { emoji: "🍋", correct: "cytryna", others: ["pomarańcza", "truskawka"] },
      { emoji: "🍓", correct: "truskawka", others: ["jabłko", "malina"] },
      { emoji: "🍇", correct: "winogrono", others: ["jabłko", "banan"] },
      { emoji: "🍒", correct: "wiśnia", others: ["truskawka", "śliwka"] },
      { emoji: "🥕", correct: "marchewka", others: ["ogórek", "ziemniak"] },
      { emoji: "🥒", correct: "ogórek", others: ["marchewka", "sałata"] },
      { emoji: "🥔", correct: "ziemniak", others: ["marchewka", "ryż"] },
      { emoji: "🍅", correct: "pomidor", others: ["jabłko", "marchewka"] },
      { emoji: "🥬", correct: "sałata", others: ["kapusta", "pomidor"] },
      { emoji: "🍞", correct: "chleb", others: ["ciasto", "lody"] },
      { emoji: "🥐", correct: "rogalik", others: ["chleb", "bułka"] },
      { emoji: "🥖", correct: "bagietka", others: ["bułka", "chleb"] },
      { emoji: "🧀", correct: "ser", others: ["chleb", "masło"] },
      { emoji: "🥚", correct: "jajko", others: ["ser", "masło"] },
      { emoji: "🍕", correct: "pizza", others: ["makaron", "ryż"] },
      { emoji: "🍝", correct: "makaron", others: ["ryż", "zupa"] },
      { emoji: "🍚", correct: "ryż", others: ["makaron", "ziemniak"] },
      { emoji: "🍰", correct: "ciasto", others: ["chleb", "lody"] },
      { emoji: "🧁", correct: "babeczka", others: ["ciasto", "lody"] },
      { emoji: "🍦", correct: "lody", others: ["ciasto", "pizza"] },
      { emoji: "🥛", correct: "mleko", others: ["woda", "sok"] },
      { emoji: "🥤", correct: "sok", others: ["woda", "mleko"] },
      { emoji: "💧", correct: "woda", others: ["sok", "mleko"] }
    ]
  },
  {
    id: "home",
    name: "Dom",
    icon: "🏠",
    hint: "To rzeczy w domu. Jak się nazywają?",
    rounds: [
      { emoji: "🏠", correct: "dom", others: ["szkoła", "sklep"] },
      { emoji: "🛏️", correct: "łóżko", others: ["stół", "krzesło"] },
      { emoji: "🛋️", correct: "sofa", others: ["łóżko", "krzesło"] },
      { emoji: "🪑", correct: "krzesło", others: ["stół", "łóżko"] },
      { emoji: "🪟", correct: "okno", others: ["drzwi", "zegar"] },
      { emoji: "🚪", correct: "drzwi", others: ["okno", "stół"] },
      { emoji: "🧸", correct: "zabawka", others: ["książka", "telefon"] },
      { emoji: "📺", correct: "telewizor", others: ["telefon", "komputer"] },
      { emoji: "📱", correct: "telefon", others: ["telewizor", "zegar"] },
      { emoji: "🕰️", correct: "zegar", others: ["lampa", "okno"] },
      { emoji: "💡", correct: "lampa", others: ["zegar", "okno"] },
      { emoji: "📦", correct: "pudełko", others: ["książka", "plecak"] },
      { emoji: "🧹", correct: "miotła", others: ["zmiotka", "szufelka"] },
      { emoji: "🪣", correct: "wiadro", others: ["pudełko", "krzesło"] }
    ]
  },
  {
    id: "school",
    name: "Szkoła",
    icon: "🏫",
    hint: "Przedmioty i osoby w szkole.",
    rounds: [
      { emoji: "🏫", correct: "szkoła", others: ["dom", "sklep"] },
      { emoji: "📚", correct: "książka", others: ["zeszyt", "zabawka"] },
      { emoji: "📓", correct: "zeszyt", others: ["książka", "gazeta"] },
      { emoji: "✏️", correct: "ołówek", others: ["długopis", "nożyczki"] },
      { emoji: "🖊️", correct: "długopis", others: ["ołówek", "klej"] },
      { emoji: "✂️", correct: "nożyczki", others: ["klej", "linijka"] },
      { emoji: "📐", correct: "linijka", others: ["ołówek", "zeszyt"] },
      { emoji: "🧴", correct: "klej", others: ["nożyczki", "długopis"] },
      { emoji: "🎒", correct: "plecak", others: ["pudełko", "książka"] },
      { emoji: "🧑‍🏫", correct: "nauczyciel", others: ["tata", "kolega"] },
      { emoji: "👩‍🏫", correct: "nauczycielka", others: ["mama", "koleżanka"] },
      { emoji: "🧑‍🎓", correct: "uczeń", others: ["nauczyciel", "brat"] },
      { emoji: "🔤", correct: "litery", others: ["cyfry", "obrazki"] },
      { emoji: "🔢", correct: "cyfry", others: ["litery", "książki"] }
    ]
  },
  {
    id: "actions",
    name: "Czynności",
    icon: "🏃",
    hint: "Co robi dziecko na obrazku?",
    rounds: [
      { emoji: "🏃‍♂️", correct: "biega", others: ["śpi", "siedzi"] },
      { emoji: "😴", correct: "śpi", others: ["biega", "czyta"] },
      { emoji: "📖", correct: "czyta", others: ["pisze", "rysuje"] },
      { emoji: "✍️", correct: "pisze", others: ["czyta", "biega"] },
      { emoji: "🎨", correct: "rysuje", others: ["czyta", "gra"] },
      { emoji: "⚽", correct: "gra", others: ["śpi", "czyta"] },
      { emoji: "🥤", correct: "pije", others: ["je", "śpi"] },
      { emoji: "🍽️", correct: "je", others: ["pije", "rysuje"] },
      { emoji: "👂", correct: "słucha", others: ["czyta", "pisze"] },
      { emoji: "👀", correct: "patrzy", others: ["biega", "śpi"] },
      { emoji: "🧼", correct: "myje ręce", others: ["je", "śpi"] },
      { emoji: "🪥", correct: "myje zęby", others: ["pisze", "je"] }
    ]
  },
  {
    id: "clothes",
    name: "Ubrania",
    icon: "👗",
    hint: "Jak nazywają się części ubrania?",
    rounds: [
      { emoji: "👕", correct: "koszulka", others: ["spodnie", "sukienka"] },
      { emoji: "👖", correct: "spodnie", others: ["buty", "koszulka"] },
      { emoji: "👗", correct: "sukienka", others: ["koszulka", "spódnica"] },
      { emoji: "👟", correct: "buty", others: ["skarpetki", "czapka"] },
      { emoji: "🧦", correct: "skarpetki", others: ["buty", "spodnie"] },
      { emoji: "🧥", correct: "kurtka", others: ["koszulka", "czapka"] },
      { emoji: "🧢", correct: "czapka", others: ["kurtka", "szalik"] },
      { emoji: "🧣", correct: "szalik", others: ["czapka", "koszulka"] },
      { emoji: "🧤", correct: "rękawiczki", others: ["skarpetki", "buty"] }
    ]
  },
  {
    id: "nature",
    name: "Przyroda",
    icon: "🌿",
    hint: "Elementy przyrody i pogody.",
    rounds: [
      { emoji: "☀️", correct: "słońce", others: ["księżyc", "gwiazda"] },
      { emoji: "🌙", correct: "księżyc", others: ["słońce", "gwiazda"] },
      { emoji: "⭐", correct: "gwiazda", others: ["słońce", "chmura"] },
      { emoji: "☁️", correct: "chmura", others: ["słońce", "śnieg"] },
      { emoji: "🌧️", correct: "deszcz", others: ["słońce", "śnieg"] },
      { emoji: "❄️", correct: "śnieg", others: ["deszcz", "słońce"] },
      { emoji: "🌈", correct: "tęcza", others: ["deszcz", "słońce"] },
      { emoji: "🌳", correct: "drzewo", others: ["kwiat", "trawa"] },
      { emoji: "🌸", correct: "kwiat", others: ["drzewo", "liść"] },
      { emoji: "🍂", correct: "liść", others: ["kwiat", "trawa"] },
      { emoji: "🌊", correct: "rzeka", others: ["góra", "drzewo"] },
      { emoji: "⛰️", correct: "góra", others: ["rzeka", "dom"] }
    ]
  },
  {
    id: "transport",
    name: "Pojazdy",
    icon: "🚗",
    hint: "Jakim pojazdem jedziemy lub lecimy?",
    rounds: [
      { emoji: "🚗", correct: "samochód", others: ["rower", "autobus"] },
      { emoji: "🚌", correct: "autobus", others: ["samochód", "tramwaj"] },
      { emoji: "🚋", correct: "tramwaj", others: ["autobus", "pociąg"] },
      { emoji: "🚆", correct: "pociąg", others: ["tramwaj", "samochód"] },
      { emoji: "🚲", correct: "rower", others: ["hulajnoga", "samochód"] },
      { emoji: "🛴", correct: "hulajnoga", others: ["rower", "samochód"] },
      { emoji: "✈️", correct: "samolot", others: ["statek", "samochód"] },
      { emoji: "🚢", correct: "statek", others: ["samolot", "rower"] },
      { emoji: "🚀", correct: "rakieta", others: ["samolot", "statek"] }
    ]
  },
  {
    id: "family",
    name: "Rodzina",
    icon: "👨‍👩‍👧‍👦",
    hint: "Kto jest kim w rodzinie?",
    rounds: [
      { emoji: "👩", correct: "mama", others: ["pani", "siostra"] },
      { emoji: "👨", correct: "tata", others: ["pan", "brat"] },
      { emoji: "👵", correct: "babcia", others: ["mama", "pani"] },
      { emoji: "👴", correct: "dziadek", others: ["tata", "pan"] },
      { emoji: "👦", correct: "brat", others: ["kolega", "chłopiec"] },
      { emoji: "👧", correct: "siostra", others: ["koleżanka", "dziewczynka"] },
      { emoji: "👶", correct: "dziecko", others: ["brat", "siostra"] },
      { emoji: "👨‍👩‍👧‍👦", correct: "rodzina", others: ["klasa", "grupa"] }
    ]
  }
];

let progress = {
  unlockedWorlds: 1,
  currentWorld: 0,
  score: 0
};

let streak = 0;
let currentWorld = 0;
let roundIndex = 0;
let currentRound = null;

// DOM
let emojiEl, choicesEl, messageEl, scoreEl, streakEl;
let nextBtn, resetBtn, hintBtn;
let worldNameLabel, progressBar;

// -------------------------------
// Init
// -------------------------------
document.addEventListener("DOMContentLoaded", initGame);

async function initGame() {
  ArcadeUI.addBackToArcadeButton({
    backUrl: "../../../arcade.html"
  });

  emojiEl = document.getElementById("emoji");
  choicesEl = document.getElementById("choices");
  messageEl = document.getElementById("message");
  scoreEl = document.getElementById("score");
  streakEl = document.getElementById("streak");
  nextBtn = document.getElementById("next");
  resetBtn = document.getElementById("resetProgress");
  hintBtn = document.getElementById("hintBtn");
  worldNameLabel = document.getElementById("worldNameLabel");
  progressBar = document.getElementById("progressBar");

  nextBtn.addEventListener("click", nextRound);
  resetBtn.addEventListener("click", resetAllProgress);

  hintBtn.addEventListener("click", useHint);

  await loadProgress();
  renderWorldButtons();
  startWorld(progress.currentWorld);
}

// -------------------------------
// PROGRES
// -------------------------------
async function loadProgress() {
  const loaded = await ArcadeProgress.load(GAME_ID);
  if (loaded) {
    progress = {
      unlockedWorlds: loaded.unlockedWorlds ?? 1,
      currentWorld: loaded.currentWorld ?? 0,
      score: loaded.score ?? 0
    };
  }
}

async function saveProgress() {
  return ArcadeProgress.save(GAME_ID, {
    unlockedWorlds: progress.unlockedWorlds,
    currentWorld: progress.currentWorld,
    score: progress.score
  });
}

async function resetAllProgress() {
  const ok = confirm("Na pewno chcesz wyczyścić postęp?");
  if (!ok) return;

  progress = {
    unlockedWorlds: 1,
    currentWorld: 0,
    score: 0
  };

  streak = 0;

  await saveProgress();

  renderWorldButtons();
  startWorld(0);
}

// -------------------------------
// LOGIKA GRY
// -------------------------------
function renderWorldButtons() {
  const container = document.getElementById("worldsRow");
  container.innerHTML = "";

  WORLDS.forEach(w => {
    const btn = document.createElement("button");
    btn.textContent = `${w.id + 1}`;
    btn.className = "world-btn";

    if (w.id > progress.unlockedWorlds - 1) {
      btn.disabled = true;
    }

    btn.addEventListener("click", () => {
      startWorld(w.id);
    });

    container.appendChild(btn);
  });
}

function startWorld(worldId) {
  currentWorld = worldId;
  progress.currentWorld = worldId;

  worldNameLabel.textContent = `Świat: ${WORLDS[worldId].name}`;
  roundIndex = 0;
  streak = 0;

  updateUI();
  nextRound();
}

function nextRound() {
  messageEl.textContent = "";
  choicesEl.innerHTML = "";

  const world = WORLDS[currentWorld];
  const items = world.items;

  if (roundIndex >= items.length) {
    finishWorld();
    return;
  }

  const [emoji, word] = items[roundIndex];

  currentRound = {
    emoji,
    correct: word,
    allChoices: shuffle([
      word,
      ...pickOtherWords(word, items, 3)
    ])
  };

  emojiEl.textContent = emoji;
  renderChoices();
  updateProgressBar();

  roundIndex++;
}

function renderChoices() {
  choicesEl.innerHTML = "";

  currentRound.allChoices.forEach(text => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = "choice-btn";

    btn.addEventListener("click", () => handleChoice(btn, text));

    choicesEl.appendChild(btn);
  });
}

async function handleChoice(btn, text) {
  if (text === currentRound.correct) {
    btn.classList.add("correct");
    streak++;
    progress.score++;

    await ArcadeCoins.addForGame(GAME_ID, +1, {
      reason: "correct_answer",
      world: currentWorld,
      round: roundIndex
    });

    messageEl.textContent = "✔ Dobrze!";
  } else {
    btn.classList.add("wrong");
    streak = 0;
    messageEl.textContent = "✖ Spróbuj dalej!";
  }

  updateUI();
  if (window.ArcadeAuthUI?.refreshCoins) {
    ArcadeAuthUI.refreshCoins();
  }
}

// -------------------------------
// Podpowiedź za 5 monet
// -------------------------------
async function useHint() {
  const user = ArcadeAuth.getUser();

  if (!user) {
    messageEl.textContent = "Podpowiedzi są tylko dla zalogowanych.";
    return;
  }

  const balance = ArcadeCoins.getBalance();
  if (balance == null || balance < 5) {
    messageEl.textContent = "Masz za mało diamentów (5💎).";
    return;
  }

  const newBalance = await ArcadeCoins.addForGame(GAME_ID, -5, {
    reason: "hint",
    world: currentWorld,
    correct: currentRound.correct
  });

  if (window.ArcadeAuthUI?.refreshCoins) {
    ArcadeAuthUI.refreshCoins();
  }

  // wizualna podpowiedź
  document.querySelectorAll(".choice-btn").forEach(btn => {
    if (btn.textContent === currentRound.correct) {
      btn.classList.add("correct");
    }
  });

  messageEl.textContent = "Podpowiedź użyta!";
}

// -------------------------------
// Koniec świata
// -------------------------------
async function finishWorld() {
  messageEl.textContent = "Świat ukończony!";

  await ArcadeCoins.addForGame(GAME_ID, +5, {
    reason: "finish_world",
    world: currentWorld
  });

  if (currentWorld + 1 < WORLDS.length) {
    if (progress.unlockedWorlds < currentWorld + 2) {
      progress.unlockedWorlds++;
      await ArcadeCoins.addForGame(GAME_ID, +10, {
        reason: "unlock_world",
        unlocked: currentWorld + 1
      });
    }
  }

  await saveProgress();

  if (window.ArcadeAuthUI?.refreshCoins) {
    ArcadeAuthUI.refreshCoins();
  }

  renderWorldButtons();
}

// -------------------------------
// Pomocnicze
// -------------------------------
function updateUI() {
  scoreEl.textContent = `Punkty: ${progress.score}`;
  streakEl.textContent = streak;
}

function updateProgressBar() {
  const world = WORLDS[currentWorld];
  const pct = Math.floor((roundIndex / world.items.length) * 100);
  progressBar.style.width = pct + "%";
}

function pickOtherWords(correct, items, count) {
  const pool = items
    .map(i => i[1])
    .filter(w => w !== correct);

  shuffle(pool);

  return pool.slice(0, count);
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

