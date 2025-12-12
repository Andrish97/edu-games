/* =========================
   NEON WORDL PL – GAME JS
   ========================= */

const GAME_ID = "neon-wordl-pl";
const DICT_URL =
  "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pl/pl_full.txt";

const MAX_ROWS = 6;
const HINT_COST = 5;

/* ===== STAN ===== */

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

/* ===== DOM ===== */

let boardEl, statusEl, hintTextEl, wordLenSel;
let btnNew, btnHint, btnReset;
let statGamesEl, statWinsEl, statStreakEl, statMaxStreakEl;
let controlsSlotEl;

/* ===== KEYBOARD ===== */

const KEYBOARD_LAYOUT = [
  ["w","e","r","t","y","u","i","o","p"],
  ["a","s","d","f","g","h","j","k","l"],
  ["z","ź","ż","c","b","n","m","backspace"],
  ["ą","ć","ę","ł","ń","ó","ś","enter"]
];

const KEY_PRIORITY = { absent:0, present:1, correct:2 };

/* ===== HELPERS ===== */

const normalize = w => w.toLowerCase().replace(/[^a-ząćęłńóśżź]/g,"");

const coinsReady = () =>
  window.ArcadeCoins &&
  ArcadeCoins.addForGame &&
  ArcadeCoins.getBalance;

/* ===== INIT ===== */

function cacheDom() {
  boardEl = document.getElementById("board");
  statusEl = document.getElementById("status");
  hintTextEl = document.getElementById("hint-text");
  wordLenSel = document.getElementById("word-len");

  btnNew = document.getElementById("btn-new");
  btnHint = document.getElementById("btn-hint");
  btnReset = document.getElementById("btn-reset-best");

  statGamesEl = document.getElementById("stat-games");
  statWinsEl = document.getElementById("stat-wins");
  statStreakEl = document.getElementById("stat-streak");
  statMaxStreakEl = document.getElementById("stat-max-streak");

  controlsSlotEl = document.getElementById("controls-slot");
}

function updateStatsUI() {
  statGamesEl.textContent = gamesPlayed;
  statWinsEl.textContent = wins;
  statStreakEl.textContent = currentStreak;
  statMaxStreakEl.textContent = maxStreak;
}

/* ===== PROGRESS ===== */

async function loadProgress() {
  if (!window.ArcadeProgress) return;
  const s = await ArcadeProgress.load(GAME_ID);
  gamesPlayed = s?.gamesPlayed ?? 0;
  wins = s?.wins ?? 0;
  currentStreak = s?.currentStreak ?? 0;
  maxStreak = s?.maxStreak ?? 0;
  updateStatsUI();
}

async function saveProgress() {
  if (!window.ArcadeProgress) return;
  await ArcadeProgress.save(GAME_ID,{
    gamesPlayed,wins,currentStreak,maxStreak
  });
}

/* ===== DICTIONARY ===== */

async function loadDictionary() {
  statusEl.textContent = "Pobieram słownik...";
  const r = await fetch(DICT_URL);
  const t = await r.text();
  allWords = [...new Set(
    t.split("\n")
     .map(x=>normalize(x.split(" ")[0]))
     .filter(w=>w.length>=4 && w.length<=7)
  )];
  statusEl.textContent = "";
}

/* ===== GAME ===== */

function chooseSecret() {
  validWords = allWords.filter(w=>w.length===wordLength);
  let w;
  do {
    w = validWords[Math.random()*validWords.length|0];
  } while(usedWords.has(w));
  usedWords.add(w);
  return w;
}

function initBoard() {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${wordLength},42px)`;
  board = [];

  for(let r=0;r<MAX_ROWS;r++){
    const rowArr=[];
    for(let c=0;c<wordLength;c++){
      const d=document.createElement("div");
      d.className="tile";
      boardEl.appendChild(d);
      rowArr.push(d);
    }
    board.push(rowArr);
  }
}

function resetBoard() {
  row=0; col=0;
  usedHintPositions.clear();
  hintTextEl.textContent="";

  board.flat().forEach(t=>{
    t.textContent="";
    t.className="tile";
  });

  Object.keys(keyboardState).forEach(k=>delete keyboardState[k]);
  document.querySelectorAll(".key-btn")
    .forEach(b=>b.classList.remove("key-correct","key-present","key-absent"));
}

function startGame() {
  secret = chooseSecret();
  initBoard();
  resetBoard();
  buildKeyboard();
  statusEl.textContent="Zgadnij słowo!";
}

/* ===== KEYBOARD ===== */

function buildKeyboard() {
  controlsSlotEl.innerHTML="";
  const kbd=document.createElement("div");
  kbd.className="keyboard";
  const inner=document.createElement("div");
  inner.className="keyboard-inner";
  kbd.appendChild(inner);

  KEYBOARD_LAYOUT.forEach(row=>{
    const r=document.createElement("div");
    r.className="keyboard-row";
    row.forEach(k=>{
      const b=document.createElement("button");
      b.className="key-btn";
      b.dataset.key=k;
      b.textContent = k==="enter"?"ENTER":k==="backspace"?"⌫":k;
      if(k==="enter"||k==="backspace") b.classList.add("key-wide");
      b.onclick=()=>handleKey(k);
      r.appendChild(b);
    });
    inner.appendChild(r);
  });

  controlsSlotEl.appendChild(kbd);
}

function updateKey(letter,state){
  const cur=keyboardState[letter];
  if(cur && KEY_PRIORITY[state]<=KEY_PRIORITY[cur]) return;
  keyboardState[letter]=state;
  document.querySelectorAll(`.key-btn[data-key="${letter}"]`)
    .forEach(b=>{
      b.classList.remove("key-correct","key-present","key-absent");
      b.classList.add("key-"+state);
    });
}

/* ===== INPUT ===== */

function handleKey(k){
  if(k==="enter") return submit();
  if(k==="backspace") return erase();
  addLetter(k);
}

function addLetter(ch){
  if(col>=wordLength||row>=MAX_ROWS) return;
  const t=board[row][col];
  t.textContent=ch.toUpperCase();
  t.classList.add("filled");
  col++;
}

function erase(){
  if(col<=0) return;
  col--;
  const t=board[row][col];
  t.textContent="";
  t.classList.remove("filled");
}

/* ===== CHECK ===== */

function colorRow(r){
  const guess=board[r].map(t=>t.textContent.toLowerCase());
  const s=secret.split("");
  const cnt={};
  s.forEach(c=>cnt[c]=(cnt[c]||0)+1);

  guess.forEach((c,i)=>{
    if(c===s[i]){
      board[r][i].classList.add("correct");
      updateKey(c,"correct");
      cnt[c]--;
    }
  });

  guess.forEach((c,i)=>{
    const t=board[r][i];
    if(t.classList.contains("correct")) return;
    if(cnt[c]>0){
      t.classList.add("present");
      updateKey(c,"present");
      cnt[c]--;
    }else{
      t.classList.add("absent");
      updateKey(c,"absent");
    }
  });
}

async function finish(win){
  gamesPlayed++;
  if(win){
    wins++; currentStreak++;
    maxStreak=Math.max(maxStreak,currentStreak);
  }else currentStreak=0;

  updateStatsUI();
  await saveProgress();

  if(coinsReady()){
    await ArcadeCoins.addForGame(GAME_ID, win?5:1,{reason:win?"win":"loss"});
    ArcadeAuthUI?.refreshCoins();
  }
}

function submit(){
  if(col<wordLength){
    statusEl.textContent="Wpisz pełne słowo.";
    return;
  }

  const guess=board[row].map(t=>t.textContent.toLowerCase()).join("");
  if(!validWords.includes(guess)){
    statusEl.textContent="Nie ma takiego słowa.";
    return;
  }

  colorRow(row);

  if(guess===secret){
    statusEl.textContent="Brawo!";
    finish(true);
    row=MAX_ROWS;
    return;
  }

  row++; col=0;
  if(row>=MAX_ROWS){
    statusEl.textContent="Koniec! "+secret.toUpperCase();
    finish(false);
  }
}

/* ===== HINT ===== */

async function useHint(){
  if(!coinsReady()) return;
  const bal=await ArcadeCoins.getBalance();
  if(bal<HINT_COST) return;

  const free=[...Array(wordLength).keys()].filter(i=>!usedHintPositions.has(i));
  if(!free.length) return;

  const pos=free[Math.random()*free.length|0];
  usedHintPositions.add(pos);

  await ArcadeCoins.addForGame(GAME_ID,-HINT_COST,{reason:"hint"});
  ArcadeAuthUI?.refreshCoins();

  hintTextEl.textContent=`Podpowiedź: ${pos+1} = ${secret[pos].toUpperCase()}`;
}

/* ===== START ===== */

document.addEventListener("DOMContentLoaded",async()=>{
  cacheDom();
  await loadProgress();
  await loadDictionary();

  btnNew.onclick=startGame;
  btnHint.onclick=useHint;
  btnReset.onclick=async()=>{
    gamesPlayed=wins=currentStreak=maxStreak=0;
    updateStatsUI();
    await saveProgress();
  };

  wordLenSel.onchange=()=>{
    wordLength=+wordLenSel.value;
    startGame();
  };

  document.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(k==="enter") submit();
    else if(k==="backspace") erase();
    else if(/^[a-ząćęłńóśżź]$/.test(k)) addLetter(k);
  });

  startGame();
});
