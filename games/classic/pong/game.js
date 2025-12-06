const GAME_ID = "neon-pong";

const MODE_WALL = "wall"; // Trening: Ściana
const MODE_AI = "ai"; // Pojedynek z AI

let currentMode = MODE_WALL;

let canvas, ctx;

// Paletki poziome
let bottomPaddle, topPaddle;

// Piłka
let ball;

// Wyniki
let playerScore = 0;
let enemyScore = 0;

const paddleWidth = 140;
const paddleHeight = 14;
const paddleMargin = 40;
const ballRadius = 10;

// Klawisze
const keys = {
  a: false,
  d: false,
  w: false,
  s: false,
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false
};

/* ===============================
   ArcadeProgress — szkielet
=============================== */

let hasUnsavedChanges = false;
let LAST_SAVE_DATA = null;

function loadProgress() {
  if (!window.ArcadeProgress) return Promise.resolve();

  return ArcadeProgress.load(GAME_ID)
    .then(data => {
      LAST_SAVE_DATA = data || null;
    })
    .catch(err => console.error(err));
}

function buildSavePayload() {
  return {};
}

function saveCurrentSession() {
  if (!window.ArcadeProgress) return Promise.resolve();

  const payload = buildSavePayload();

  return ArcadeProgress.save(GAME_ID, payload).then(() => {
    LAST_SAVE_DATA = payload;
    hasUnsavedChanges = false;
  });
}

function clearProgress() {
  if (!window.ArcadeProgress) return Promise.resolve();
  return ArcadeProgress.clear(GAME_ID).then(() => {
    LAST_SAVE_DATA = null;
    hasUnsavedChanges = false;
  });
}

/* ===============================
   Guardy (opcjonalne)
=============================== */

function setupBeforeUnloadGuard() {
  window.addEventListener("beforeunload", e => {
    if (!hasUnsavedChanges) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

function setupClickGuard() {
  document.addEventListener("click", e => {
    if (!hasUnsavedChanges) return;

    const target = e.target.closest("a,button");
    if (!target) return;

    const href = target.getAttribute("href");
    const isBack =
      (href && href.includes("arcade.html")) ||
      target.classList.contains("arcade-back-btn");

    if (isBack) {
      const ok = confirm("Masz niezapisany postęp. Wyjść?");
      if (!ok) e.preventDefault();
    }
  });
}

/* ===============================
   Rozmiar canvas
=============================== */

function W() {
  return canvas.width;
}
function H() {
  return canvas.height;
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
}

/* ===============================
   Paletki + piłka
=============================== */

function setupObjects() {
  bottomPaddle = {
    x: W() / 2 - paddleWidth / 2,
    y: H() - paddleMargin,
    width: paddleWidth,
    height: paddleHeight
  };

  topPaddle = {
    x: W() / 2 - paddleWidth / 2,
    y: paddleMargin - paddleHeight,
    width: paddleWidth,
    height: paddleHeight
  };

  resetBall(true);
}

function resetBall(down) {
  ball = {
    x: W() / 2,
    y: H() / 2,
    r: ballRadius,
    dx: (Math.random() > 0.5 ? 1 : -1) * 5,
    dy: (down ? 1 : -1) * (4 + Math.random() * 2)
  };
}

/* ===============================
   Tryby gry
=============================== */

function setMode(mode) {
  currentMode = mode;
  playerScore = 0;
  enemyScore = 0;
  updateScore();

  const wallBtn = document.getElementById("mode-wall-btn");
  const aiBtn = document.getElementById("mode-ai-btn");

  wallBtn.classList.toggle("mode-btn--active", mode === MODE_WALL);
  aiBtn.classList.toggle("mode-btn--active", mode === MODE_AI);

  resetBall(true);
}

function updateScore() {
  const score = document.getElementById("score");
  score.innerText = `${playerScore} : ${enemyScore}`;
}

/* ===============================
   Sterowanie klawiszami
=============================== */

function setupKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.key in keys) keys[e.key] = true;
  });

  document.addEventListener("keyup", e => {
    if (e.key in keys) keys[e.key] = false;
  });
}

function movePlayerKeyboard() {
  const speed = 10;
  const left = keys.a || keys.ArrowLeft || keys.w || keys.ArrowUp;
  const right = keys.d || keys.ArrowRight || keys.s || keys.ArrowDown;

  if (left) bottomPaddle.x -= speed;
  if (right) bottomPaddle.x += speed;

  bottomPaddle.x = Math.max(
    0,
    Math.min(W() - bottomPaddle.width, bottomPaddle.x)
  );
}

/* ===============================
   Sterowanie: ZŁAP I PRZECIĄGNIJ
=============================== */

function setupGrabControls() {
  let dragging = false;
  let grabOffsetX = 0;

  function beginGrab(x, y) {
    if (
      y > bottomPaddle.y &&
      y < bottomPaddle.y + bottomPaddle.height &&
      x > bottomPaddle.x &&
      x < bottomPaddle.x + bottomPaddle.width
    ) {
      dragging = true;
      grabOffsetX = x - bottomPaddle.x;
    }
  }

  function dragTo(x) {
    if (!dragging) return;
    bottomPaddle.x = x - grabOffsetX;

    bottomPaddle.x = Math.max(
      0,
      Math.min(W() - bottomPaddle.width, bottomPaddle.x)
    );
  }

  canvas.addEventListener("mousedown", e => {
    const r = canvas.getBoundingClientRect();
    beginGrab(e.clientX - r.left, e.clientY - r.top);
  });

  canvas.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    dragTo(e.clientX - r.left);
  });

  document.addEventListener("mouseup", () => (dragging = false));

  canvas.addEventListener("touchstart", e => {
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    beginGrab(t.clientX - r.left, t.clientY - r.top);
  });

  canvas.addEventListener("touchmove", e => {
    e.preventDefault();
    const t = e.touches[0];
    const r = canvas.getBoundingClientRect();
    dragTo(t.clientX - r.left);
  });

  canvas.addEventListener("touchend", () => (dragging = false));
}

/* ===============================
   AI
=============================== */

function moveAI() {
  if (currentMode !== MODE_AI) return;

  const target = ball.x - topPaddle.width / 2;
  topPaddle.x += (target - topPaddle.x) * 0.08;

  topPaddle.x = Math.max(
    0,
    Math.min(W() - topPaddle.width, topPaddle.x)
  );
}

/* ===============================
   Fizyczne odbicia i punktacja
=============================== */

function physics() {
  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.x < ball.r) {
    ball.x = ball.r;
    ball.dx *= -1;
  }
  if (ball.x > W() - ball.r) {
    ball.x = W() - ball.r;
    ball.dx *= -1;
  }

  if (
    ball.y + ball.r > bottomPaddle.y &&
    ball.y - ball.r < bottomPaddle.y + bottomPaddle.height &&
    ball.x > bottomPaddle.x &&
    ball.x < bottomPaddle.x + bottomPaddle.width &&
    ball.dy > 0
  ) {
    ball.dy *= -1;
    ball.y = bottomPaddle.y - ball.r;
    ball.dx += (Math.random() - 0.5) * 2;

    if (currentMode === MODE_WALL) {
      playerScore++;
      updateScore();
    }
  }

  if (currentMode === MODE_WALL) {
    if (ball.y < ball.r) {
      ball.y = ball.r;
      ball.dy *= -1;
    }
    if (ball.y > H()) {
      enemyScore++;
      updateScore();
      resetBall(true);
    }
  } else {
    if (
      ball.y - ball.r <
        topPaddle.y + topPaddle.height &&
      ball.x > topPaddle.x &&
      ball.x < topPaddle.x + topPaddle.width &&
      ball.dy < 0
    ) {
      ball.dy *= -1;
      ball.y = topPaddle.y + topPaddle.height + ball.r;
      ball.dx += (Math.random() - 0.5) * 2;
    }

    if (ball.y < 0) {
      playerScore++;
      updateScore();
      resetBall(true);
    }
    if (ball.y > H()) {
      enemyScore++;
      updateScore();
      resetBall(false);
    }
  }
}

/* ===============================
   Render
=============================== */

function draw() {
  ctx.clearRect(0, 0, W(), H());

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(0, H() / 2);
  ctx.lineTo(W(), H() / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#22c55e";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#22c55e";

  ctx.fillRect(
    bottomPaddle.x,
    bottomPaddle.y,
    bottomPaddle.width,
    bottomPaddle.height
  );

  if (currentMode === MODE_AI) {
    ctx.fillRect(
      topPaddle.x,
      topPaddle.y,
      topPaddle.width,
      topPaddle.height
    );
  }

  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

/* ===============================
   Loop
=============================== */

function update() {
  movePlayerKeyboard();
  moveAI();
  physics();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ===============================
   Init
=============================== */

function initGame() {
  canvas = document.getElementById("game");
  ctx = canvas.getContext("2d");

  setupKeyboard();
  setupGrabControls();

  window.addEventListener("resize", () => {
    resizeCanvas();
    setupObjects();
  });

  loadProgress().then(() => {
    resizeCanvas();
    setupObjects();

    setupBeforeUnloadGuard();
    setupClickGuard();

    if (window.ArcadeUI) {
      ArcadeUI.addBackToArcadeButton({
        backUrl: "../../../arcade.html"
      });
    }

    document
      .getElementById("mode-wall-btn")
      .addEventListener("click", () => setMode(MODE_WALL));

    document
      .getElementById("mode-ai-btn")
      .addEventListener("click", () => setMode(MODE_AI));

    updateScore();
    loop();
  });
}

document.addEventListener("DOMContentLoaded", initGame);
