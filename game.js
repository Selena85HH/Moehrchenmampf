const canvas = document.querySelector("#gameCanvas");
const context = canvas.getContext("2d");

const modeLabel = document.querySelector("#modeLabel");
const levelBadge = document.querySelector("#levelBadge");
const levelNumber = document.querySelector("#levelNumber");
const carrotScoreLine = document.querySelector("#carrotScoreLine");
const carrotCount = document.querySelector("#carrotCount");
const targetCount = document.querySelector("#targetCount");
const scoreElement = document.querySelector("#score");
const levelName = document.querySelector("#levelName");
const levelDescription = document.querySelector("#levelDescription");
const levelList = document.querySelector("#levelList");
const levelCard = document.querySelector(".level-card");
const messageOverlay = document.querySelector("#messageOverlay");
const messageTitle = document.querySelector("#messageTitle");
const messageText = document.querySelector("#messageText");
const modeButtons = document.querySelector("#modeButtons");
const primaryButton = document.querySelector("#primaryButton");
const pauseButton = document.querySelector("#pauseButton");
const scoreboard = document.querySelector(".scoreboard");
const playerTwoJoystick = document.querySelector('[data-player-pad="p2"]');
const highscoreSummary = document.querySelector("#highscoreSummary");
const settingsButton = document.querySelector("#settingsButton");
const settingsDialog = document.querySelector("#settingsDialog");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const settingsForm = document.querySelector("#settingsForm");
const playerOneNameInput = document.querySelector("#playerOneName");
const playerTwoNameInput = document.querySelector("#playerTwoName");
const themeSelect = document.querySelector("#themeSelect");
const joystickSizeSelect = document.querySelector("#joystickSizeSelect");
const soundEnabledInput = document.querySelector("#soundEnabledInput");
const soundVolumeInput = document.querySelector("#soundVolumeInput");
const settingsHighscore = document.querySelector("#settingsHighscore");
const resetHighscoreButton = document.querySelector("#resetHighscoreButton");

const tileCount = 20;
const tileSize = canvas.width / tileCount;
const multiplayerTarget = 10;
const settingsStorageKey = "moehrchenmampf-settings";
const modeOrder = ["levels", "endless", "multiplayer"];
const defaultSettings = {
  playerOneName: "Spieler 1",
  playerTwoName: "Spieler 2",
  theme: "standard",
  joystickSize: "medium",
  soundEnabled: true,
  soundVolume: 0.65,
  endlessHighscore: {
    name: "",
    score: 0,
    carrots: 0
  }
};

let settings = loadSettings();

const levels = [
  {
    name: "Sonnige Wiese",
    description: "Ein offenes Feld zum Eingewoehnen.",
    target: 10,
    speed: 160,
    obstacles: []
  },
  {
    name: "Gartenbeete",
    description: "Kleine Beete machen die Wege spannender.",
    target: 15,
    speed: 145,
    obstacles: [
      { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 },
      { x: 13, y: 14 }, { x: 14, y: 14 }, { x: 15, y: 14 }
    ]
  },
  {
    name: "Schmetterlingsfeld",
    description: "Mehr Hindernisse und ein flotteres Hoppeln.",
    target: 20,
    speed: 130,
    obstacles: [
      { x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 },
      { x: 15, y: 12 }, { x: 15, y: 13 }, { x: 15, y: 14 },
      { x: 9, y: 9 }, { x: 10, y: 9 }
    ]
  },
  {
    name: "Enger Gemuesegarten",
    description: "Schmale Wege fordern gutes Vorausdenken.",
    target: 25,
    speed: 118,
    obstacles: [
      { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 6, y: 6 },
      { x: 13, y: 13 }, { x: 13, y: 14 }, { x: 13, y: 15 }, { x: 13, y: 16 },
      { x: 9, y: 7 }, { x: 10, y: 7 }, { x: 11, y: 7 },
      { x: 8, y: 12 }, { x: 9, y: 12 }, { x: 10, y: 12 }
    ]
  },
  {
    name: "Das große Möhrchenfest",
    description: "Das Finale ist bunt, schnell und ziemlich eng.",
    target: 30,
    speed: 105,
    obstacles: [
      { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 },
      { x: 13, y: 3 }, { x: 14, y: 3 }, { x: 15, y: 3 },
      { x: 4, y: 16 }, { x: 5, y: 16 }, { x: 6, y: 16 },
      { x: 13, y: 16 }, { x: 14, y: 16 }, { x: 15, y: 16 },
      { x: 9, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 11 }, { x: 10, y: 11 }
    ]
  }
];

const endlessObstacles = [
  { x: 4, y: 4 }, { x: 15, y: 4 }, { x: 4, y: 15 }, { x: 15, y: 15 },
  { x: 9, y: 8 }, { x: 10, y: 12 }
];

const multiplayerObstacles = [
  { x: 9, y: 5 }, { x: 10, y: 5 },
  { x: 9, y: 14 }, { x: 10, y: 14 },
  { x: 5, y: 8 }, { x: 5, y: 11 },
  { x: 14, y: 8 }, { x: 14, y: 11 }
];

let mode = "levels";
let currentLevelIndex = 0;
let players = [];
let carrot;
let score = 0;
let levelStartScore = 0;
let gameTimer;
let countdownTimer;
let countdownFinishTimer;
let running = false;
let paused = false;
let countdownActive = false;
let menuOpen = true;
let currentSpeed = levels[0].speed;
let selectedModeIndex = 0;
let lastGamepadDirectionKey = "";
let lastGamepadMenuMove = 0;
let audioUnlocked = false;
let gamepadButtonState = {
  action: false,
  back: false,
  pause: false
};

const sounds = {
  carrot: new Audio("assets/sounds/carrot.wav"),
  levelComplete: new Audio("assets/sounds/level-complete.wav"),
  gameOver: new Audio("assets/sounds/game-over.wav"),
  countdown: new Audio("assets/sounds/countdown.wav"),
  click: new Audio("assets/sounds/click.wav"),
  start: new Audio("assets/sounds/start.wav"),
  pause: new Audio("assets/sounds/pause.wav")
};
const backgroundMusic = new Audio("assets/sounds/background-loop.mp3");
backgroundMusic.loop = true;

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(settingsStorageKey));
    return {
      ...defaultSettings,
      ...savedSettings,
      soundEnabled: savedSettings?.soundEnabled ?? defaultSettings.soundEnabled,
      soundVolume: Number.isFinite(Number(savedSettings?.soundVolume))
        ? Math.min(1, Math.max(0, Number(savedSettings.soundVolume)))
        : defaultSettings.soundVolume,
      endlessHighscore: {
        ...defaultSettings.endlessHighscore,
        ...(savedSettings?.endlessHighscore || {})
      }
    };
  } catch {
    return { ...defaultSettings, endlessHighscore: { ...defaultSettings.endlessHighscore } };
  }
}

function saveSettings() {
  localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
}

function applySettings() {
  applyVisualSettings();
  playerOneNameInput.value = settings.playerOneName;
  playerTwoNameInput.value = settings.playerTwoName;
  themeSelect.value = settings.theme;
  joystickSizeSelect.value = settings.joystickSize;
  soundEnabledInput.checked = settings.soundEnabled;
  soundVolumeInput.value = String(Math.round(settings.soundVolume * 100));
  updateSoundVolumes();
  updateJoystickLabels();
  updateHighscoreText();
}

function updateSoundVolumes() {
  Object.values(sounds).forEach((sound) => {
    sound.volume = settings.soundVolume;
  });
  backgroundMusic.volume = settings.soundVolume * 0.28;
}

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  audioUnlocked = true;
  Object.values(sounds).forEach((sound) => {
    sound.load();
  });
  backgroundMusic.load();
}

function playSound(name) {
  if (!settings.soundEnabled || !audioUnlocked || !sounds[name]) {
    return;
  }

  const sound = sounds[name].cloneNode();
  sound.volume = settings.soundVolume;
  sound.play().catch(() => {});
}

function startBackgroundMusic() {
  if (!settings.soundEnabled || !audioUnlocked) {
    return;
  }

  backgroundMusic.volume = settings.soundVolume * 0.28;
  backgroundMusic.play().catch(() => {});
}

function pauseBackgroundMusic() {
  backgroundMusic.pause();
}

function stopBackgroundMusic() {
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

function applyVisualSettings() {
  document.body.classList.remove("theme-standard", "theme-pastel", "theme-contrast", "joystick-small", "joystick-medium", "joystick-large");
  document.body.classList.add(`theme-${settings.theme}`, `joystick-${settings.joystickSize}`);
}

function updateJoystickLabels() {
  document.querySelector('[data-player-pad="p1"] span').textContent = settings.playerOneName;
  document.querySelector('[data-player-pad="p2"] span').textContent = settings.playerTwoName;
}

function updateHighscoreText() {
  const highscore = settings.endlessHighscore;
  const text = highscore.score > 0
    ? `Rekord: ${highscore.name} mit ${highscore.score} Punkten und ${highscore.carrots} Möhrchen`
    : "Noch kein Endlos-Rekord.";

  settingsHighscore.textContent = text;
  highscoreSummary.textContent = text;
  updateHighscoreSummaryVisibility();
}

function updateHighscoreSummaryVisibility() {
  const isEndlessMode = mode === "endless";
  highscoreSummary.classList.toggle("hidden", !isEndlessMode);
  highscoreSummary.setAttribute("aria-hidden", String(!isEndlessMode));
}

function createPlayer(options) {
  return {
    id: options.id,
    name: options.name,
    body: options.body,
    direction: options.direction,
    nextDirection: options.direction,
    colors: options.colors,
    carrots: 0,
    alive: true
  };
}

function createLevelPlayer() {
  return createPlayer({
    id: "p1",
    name: settings.playerOneName,
    body: [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 }
    ],
    direction: { x: 1, y: 0 },
    colors: { head: "#fffdf8", body: "#f4f1eb", ear: "#ffb6c8", nose: "#ff9ab4" }
  });
}

function createMultiplayerPlayers() {
  return [
    createPlayer({
      id: "p1",
      name: settings.playerOneName,
      body: [
        { x: 4, y: 10 },
        { x: 3, y: 10 },
        { x: 2, y: 10 }
      ],
      direction: { x: 1, y: 0 },
      colors: { head: "#fffdf8", body: "#f4f1eb", ear: "#ffb6c8", nose: "#ff9ab4" }
    }),
    createPlayer({
      id: "p2",
      name: settings.playerTwoName,
      body: [
        { x: 15, y: 9 },
        { x: 16, y: 9 },
        { x: 17, y: 9 }
      ],
      direction: { x: -1, y: 0 },
      colors: { head: "#dff5ff", body: "#bdeaff", ear: "#ffd46b", nose: "#ff7a9d" }
    })
  ];
}

function getObstacles() {
  if (mode === "levels") {
    return levels[currentLevelIndex].obstacles;
  }
  if (mode === "endless") {
    return endlessObstacles;
  }
  return multiplayerObstacles;
}

function chooseMode(nextMode) {
  mode = nextMode;
  selectedModeIndex = Math.max(0, modeOrder.indexOf(nextMode));
  currentLevelIndex = 0;
  score = 0;
  startMode();
}

function startMode() {
  clearInterval(gameTimer);
  clearCountdown();
  playSound("start");
  startBackgroundMusic();
  menuOpen = false;
  running = true;
  paused = false;
  levelStartScore = score;
  scoreboard.classList.remove("hidden");
  pauseButton.classList.remove("hidden");
  levelCard.classList.remove("hidden");

  if (mode === "multiplayer") {
    players = createMultiplayerPlayers();
    currentSpeed = 135;
  } else {
    players = [createLevelPlayer()];
    currentSpeed = mode === "levels" ? levels[currentLevelIndex].speed : 145;
  }

  carrot = placeCarrot();
  updateHud();
  renderInfoPanel();
  updateTouchControls();
  updatePauseButton();
  draw();
  beginCountdown(() => {
    gameTimer = setInterval(tick, currentSpeed);
  });
}

function pauseGame() {
  if (!running || paused || countdownActive) {
    return;
  }

  paused = true;
  playSound("pause");
  pauseBackgroundMusic();
  clearInterval(gameTimer);
  setOverlayMode("pause");
  messageTitle.textContent = "Pause";
  messageText.textContent = "Das Häschen wartet kurz. Weiter geht es, wenn du bereit bist.";
  primaryButton.textContent = "Weiter";
  primaryButton.classList.remove("hidden");
  setModeButtonsVisible(false);
  messageOverlay.classList.remove("hidden");
  updatePauseButton();
}

function resumeGame() {
  if (!running || !paused) {
    return;
  }

  paused = false;
  playSound("start");
  startBackgroundMusic();
  updatePauseButton();
  beginCountdown(() => {
    gameTimer = setInterval(tick, currentSpeed);
  });
}

function togglePause() {
  if (!running) {
    return;
  }

  if (paused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function updatePauseButton() {
  pauseButton.textContent = paused ? "▶" : "Ⅱ";
  pauseButton.setAttribute("aria-label", paused ? "Spiel fortsetzen" : "Spiel pausieren");
  pauseButton.disabled = !running || countdownActive;
}

function beginCountdown(onComplete) {
  clearCountdown();
  countdownActive = true;
  setOverlayMode("countdown");
  primaryButton.classList.add("hidden");
  modeButtons.classList.add("hidden");
  messageOverlay.classList.remove("hidden");
  updatePauseButton();

  let count = 3;
  renderCountdown(count);
  countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      renderCountdown(count);
      return;
    }

    clearInterval(countdownTimer);
    countdownTimer = null;
    messageTitle.textContent = "Los!";
    messageText.textContent = "";
    countdownFinishTimer = setTimeout(() => {
      countdownFinishTimer = null;
      countdownActive = false;
      messageOverlay.classList.add("hidden");
      setOverlayMode("");
      updatePauseButton();
      onComplete();
    }, 450);
  }, 1000);
}

function renderCountdown(count) {
  playSound("countdown");
  messageTitle.textContent = String(count);
  messageText.textContent = "Bereit machen...";
}

function clearCountdown() {
  clearInterval(countdownTimer);
  clearTimeout(countdownFinishTimer);
  countdownTimer = null;
  countdownFinishTimer = null;
  countdownActive = false;
  setOverlayMode("");
}

function setOverlayMode(modeName) {
  messageOverlay.classList.remove("pause-overlay", "countdown-overlay");
  if (modeName) {
    messageOverlay.classList.add(`${modeName}-overlay`);
  }
}

function tick() {
  if (paused) {
    return;
  }

  players.forEach((player) => {
    if (player.alive) {
      player.direction = player.nextDirection;
    }
  });

  const moves = players.map((player) => ({
    player,
    head: player.alive ? getNextHead(player) : player.body[0],
    eats: player.alive ? sameCell(getNextHead(player), carrot) : false,
    crashed: false
  }));

  moves.forEach((move) => {
    move.crashed = hasCollision(move.player, move.head);
  });
  markHeadOnCollisions(moves);

  moves.forEach((move) => {
    if (move.crashed) {
      move.player.alive = false;
      return;
    }

    move.player.body.unshift(move.head);
    if (move.eats) {
      move.player.carrots += 1;
      score += mode === "levels" ? 10 + currentLevelIndex * 5 : 10;
      playSound("carrot");
    } else {
      move.player.body.pop();
    }
  });

  const carrotWasEaten = moves.some((move) => move.eats && !move.crashed);
  if (carrotWasEaten) {
    carrot = placeCarrot();
  }

  updateHud();
  draw();
  evaluateRound();
}

function getNextHead(player) {
  const head = player.body[0];
  return { x: head.x + player.direction.x, y: head.y + player.direction.y };
}

function hasCollision(player, cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= tileCount || cell.y >= tileCount) {
    return true;
  }

  if (getObstacles().some((obstacle) => sameCell(obstacle, cell))) {
    return true;
  }

  return players.some((otherPlayer) =>
    otherPlayer.body.some((part, index) => {
      const isOwnHead = otherPlayer.id === player.id && index === 0;
      return !isOwnHead && sameCell(part, cell);
    })
  );
}

function markHeadOnCollisions(moves) {
  moves.forEach((move, index) => {
    moves.forEach((otherMove, otherIndex) => {
      if (index !== otherIndex && move.player.alive && otherMove.player.alive && sameCell(move.head, otherMove.head)) {
        move.crashed = true;
        otherMove.crashed = true;
      }
    });
  });
}

function evaluateRound() {
  if (mode === "levels") {
    evaluateLevelMode();
  } else if (mode === "endless") {
    evaluateEndlessMode();
  } else {
    evaluateMultiplayerMode();
  }
}

function evaluateLevelMode() {
  const player = players[0];
  if (!player.alive) {
    playSound("gameOver");
    score = levelStartScore;
    updateHud();
    endGame("Verheddert!", "Das Häschen braucht noch einen Versuch.", "Level neu starten");
    return;
  }

  if (player.carrots < levels[currentLevelIndex].target) {
    return;
  }

  clearInterval(gameTimer);
  running = false;

  if (currentLevelIndex === levels.length - 1) {
    playSound("levelComplete");
    currentLevelIndex = 0;
    score = 0;
    showOverlay("Gewonnen!", "Das Häschen hat das große Möhrchenfest gemeistert.", "Nochmal spielen");
    updateHud();
    renderInfoPanel();
    return;
  }

  currentLevelIndex += 1;
  playSound("levelComplete");
  showOverlay("Level geschafft!", "Das nächste Feld wartet schon.", "Weiterhoppeln");
  updateHud();
  renderInfoPanel();
}

function evaluateEndlessMode() {
  const player = players[0];
  if (!player.alive) {
    playSound("gameOver");
    const isNewHighscore = score > settings.endlessHighscore.score;
    if (isNewHighscore) {
      settings.endlessHighscore = {
        name: settings.playerOneName,
        score,
        carrots: player.carrots
      };
      saveSettings();
      updateHighscoreText();
    }
    endGame(
      isNewHighscore ? "Neuer Rekord!" : "Ende der Runde!",
      `${settings.playerOneName} hat ${player.carrots} Möhrchen gesammelt und ${score} Punkte erreicht.`,
      "Nochmal endlos"
    );
    return;
  }

  const nextSpeed = Math.max(78, 145 - Math.floor(player.carrots / 5) * 9);
  if (nextSpeed !== currentSpeed) {
    currentSpeed = nextSpeed;
    clearInterval(gameTimer);
    gameTimer = setInterval(tick, currentSpeed);
  }
}

function evaluateMultiplayerMode() {
  const winnerByCarrots = players.find((player) => player.carrots >= multiplayerTarget);
  if (winnerByCarrots) {
    playSound("levelComplete");
    endGame(`${winnerByCarrots.name} gewinnt!`, `${winnerByCarrots.name} hat zuerst ${multiplayerTarget} Möhrchen gesammelt.`, "Revanche");
    return;
  }

  const alivePlayers = players.filter((player) => player.alive);
  if (alivePlayers.length === 1) {
    playSound("gameOver");
    endGame(`${alivePlayers[0].name} gewinnt!`, "Das andere Häschen hat sich verheddert.", "Revanche");
  } else if (alivePlayers.length === 0) {
    playSound("gameOver");
    endGame("Unentschieden!", "Beide Häschen sind gleichzeitig gestolpert.", "Revanche");
  }
}

function endGame(title, text, buttonText) {
  clearInterval(gameTimer);
  clearCountdown();
  stopBackgroundMusic();
  running = false;
  paused = false;
  draw();
  updatePauseButton();
  showOverlay(title, text, buttonText);
}

function showOverlay(title, text, buttonText) {
  setOverlayMode("");
  messageTitle.textContent = title;
  messageText.textContent = text;
  primaryButton.textContent = buttonText;
  primaryButton.classList.remove("hidden");
  setModeButtonsVisible(true);
  messageOverlay.classList.remove("hidden");
  updateSelectedModeButton();
}

function showMenu() {
  clearInterval(gameTimer);
  clearCountdown();
  stopBackgroundMusic();
  menuOpen = true;
  running = false;
  paused = false;
  mode = "levels";
  currentLevelIndex = 0;
  score = 0;
  players = [createLevelPlayer()];
  carrot = placeCarrot();
  primaryButton.classList.add("hidden");
  setModeButtonsVisible(true);
  modeLabel.textContent = "Willkommen";
  levelBadge.classList.add("hidden");
  scoreboard.classList.add("hidden");
  pauseButton.classList.add("hidden");
  levelCard.classList.add("hidden");
  highscoreSummary.classList.add("hidden");
  messageTitle.textContent = "Willkommen bei Möhrchenmampf";
  messageText.textContent = "Wähle einen Spielmodus und hopp dann los.";
  messageOverlay.classList.remove("hidden");
  selectedModeIndex = 0;
  updateSelectedModeButton();
  updateTouchControls();
  updatePauseButton();
  draw();
}

function setModeButtonsVisible(isVisible) {
  modeButtons.classList.toggle("hidden", !isVisible);
  modeButtons.setAttribute("aria-hidden", String(!isVisible));
}

function updateSelectedModeButton() {
  modeButtons.querySelectorAll("button").forEach((button, index) => {
    button.classList.toggle("selected", index === selectedModeIndex);
  });
}

function moveSelectedMode(step) {
  if (modeButtons.classList.contains("hidden")) {
    return;
  }

  selectedModeIndex = (selectedModeIndex + step + modeOrder.length) % modeOrder.length;
  updateSelectedModeButton();
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

function placeCarrot() {
  const blocked = [...getObstacles(), ...players.flatMap((player) => player.body)];
  let candidate;

  do {
    candidate = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
  } while (blocked.some((cell) => sameCell(cell, candidate)));

  return candidate;
}

function updateHud() {
  const playerOne = players[0];
  modeLabel.textContent = mode === "levels" ? `Level ${currentLevelIndex + 1} von ${levels.length}` : getModeName();
  levelBadge.classList.add("hidden");
  levelNumber.textContent = String(currentLevelIndex + 1);
  updateHighscoreSummaryVisibility();

  if (mode === "multiplayer") {
    carrotScoreLine.innerHTML = `${shortName(players[0].name)}: <strong>${players[0].carrots}</strong>/${multiplayerTarget} ${shortName(players[1].name)}: <strong>${players[1].carrots}</strong>/${multiplayerTarget}`;
    scoreElement.textContent = `${players[0].carrots}:${players[1].carrots}`;
  } else {
    const target = mode === "levels" ? levels[currentLevelIndex].target : "∞";
    carrotCount.textContent = String(playerOne.carrots);
    targetCount.textContent = String(target);
    scoreElement.textContent = String(score);
  }
}

function shortName(name) {
  return name.length > 8 ? `${name.slice(0, 8)}…` : name;
}

function updateTouchControls() {
  playerTwoJoystick.classList.toggle("hidden", mode !== "multiplayer");
}

function getModeName() {
  if (mode === "endless") {
    return "Endlos-Spiel";
  }
  if (mode === "multiplayer") {
    return "2 Spieler";
  }
  return "Level-Spiel";
}

function renderInfoPanel() {
  levelList.innerHTML = "";

  if (mode === "levels") {
    const level = levels[currentLevelIndex];
    levelName.textContent = level.name;
    levelDescription.textContent = level.description;
    levels.forEach((entry, index) => {
      addInfoItem(`${index + 1}. ${entry.name}: ${entry.target} Möhrchen`, index === currentLevelIndex);
    });
    return;
  }

  if (mode === "endless") {
    levelName.textContent = "Endlos-Spiel";
    levelDescription.textContent = `${settings.playerOneName} sammelt so viele Möhrchen wie möglich. Alle 5 Möhrchen wird das Hoppeln schneller.`;
    addInfoItem("Ziel: So lange wie möglich durchhalten", true);
    addInfoItem("Steuerung: Pfeiltasten oder WASD", false);
    addInfoItem("Kollision beendet die Runde", false);
    return;
  }

  levelName.textContent = "Lokaler Multiplayer";
  levelDescription.textContent = "Zwei Häschen spielen auf demselben Feld. Wer zuerst 10 Möhrchen sammelt, gewinnt.";
  addInfoItem(`${settings.playerOneName}: WASD oder Joystick`, true);
  addInfoItem(`${settings.playerTwoName}: Pfeiltasten oder Joystick`, false);
  addInfoItem("Wand, Hindernis oder anderes Häschen bedeutet Aus", false);
}

function addInfoItem(text, current) {
  const item = document.createElement("li");
  item.textContent = text;
  if (current) {
    item.classList.add("current");
  }
  levelList.appendChild(item);
}

function draw() {
  drawField();
  getObstacles().forEach(drawObstacle);
  drawCarrot(carrot);
  players.forEach((player) => {
    player.body.forEach((part, index) => drawBunnyPart(part, index, player));
  });
}

function drawField() {
  context.fillStyle = "#c9f18d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? "#c9f18d" : "#bdea7d";
      context.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

      if ((x * 3 + y * 5) % 17 === 0) {
        drawTinyFlower(x, y);
      }
    }
  }
}

function drawTinyFlower(x, y) {
  const centerX = x * tileSize + tileSize * 0.72;
  const centerY = y * tileSize + tileSize * 0.28;

  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.beginPath();
  context.arc(centerX - 2, centerY, 2.2, 0, Math.PI * 2);
  context.arc(centerX + 2, centerY, 2.2, 0, Math.PI * 2);
  context.arc(centerX, centerY - 2, 2.2, 0, Math.PI * 2);
  context.arc(centerX, centerY + 2, 2.2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffd45e";
  context.beginPath();
  context.arc(centerX, centerY, 1.7, 0, Math.PI * 2);
  context.fill();
}

function drawObstacle(cell) {
  const x = cell.x * tileSize;
  const y = cell.y * tileSize;

  context.fillStyle = "#a7673a";
  roundRect(x + 4, y + 7, tileSize - 8, tileSize - 13, 7);
  context.fill();

  context.fillStyle = "#c88a54";
  roundRect(x + 8, y + 11, tileSize - 16, 5, 3);
  context.fill();

  context.fillStyle = "#714326";
  roundRect(x + 8, y + 21, tileSize - 16, 4, 3);
  context.fill();
}

function drawCarrot(cell) {
  const centerX = cell.x * tileSize + tileSize / 2;
  const centerY = cell.y * tileSize + tileSize / 2;

  context.fillStyle = "#3f9f4c";
  context.beginPath();
  context.ellipse(centerX - 7, centerY - 9, 4, 11, -0.75, 0, Math.PI * 2);
  context.ellipse(centerX, centerY - 11, 4, 12, 0, 0, Math.PI * 2);
  context.ellipse(centerX + 7, centerY - 9, 4, 11, 0.75, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ff8b2c";
  context.beginPath();
  context.moveTo(centerX - 10, centerY - 1);
  context.quadraticCurveTo(centerX, centerY - 7, centerX + 10, centerY - 1);
  context.lineTo(centerX + 2, centerY + 14);
  context.quadraticCurveTo(centerX, centerY + 17, centerX - 2, centerY + 14);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(179, 83, 25, 0.45)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(centerX - 5, centerY + 3);
  context.lineTo(centerX + 4, centerY + 1);
  context.moveTo(centerX - 3, centerY + 9);
  context.lineTo(centerX + 2, centerY + 8);
  context.stroke();
}

function drawBunnyPart(cell, index, player) {
  const centerX = cell.x * tileSize + tileSize / 2;
  const centerY = cell.y * tileSize + tileSize / 2;

  context.fillStyle = "rgba(78, 111, 42, 0.16)";
  context.beginPath();
  context.ellipse(centerX + 2, centerY + 8, tileSize * 0.33, tileSize * 0.17, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = index === 0 ? player.colors.head : player.colors.body;
  context.beginPath();
  context.arc(centerX, centerY, tileSize * 0.38, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = index === 0 ? "#7aa46d" : "#e8ded2";
  context.lineWidth = 2;
  context.stroke();

  if (index === 0) {
    drawBunnyFace(centerX, centerY, player.colors);
  }
}

function drawBunnyFace(centerX, centerY, colors) {
  context.fillStyle = colors.head;
  context.beginPath();
  context.ellipse(centerX - 8, centerY - 16, 5, 14, -0.35, 0, Math.PI * 2);
  context.ellipse(centerX + 8, centerY - 16, 5, 14, 0.35, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = colors.ear;
  context.beginPath();
  context.ellipse(centerX - 8, centerY - 16, 2, 8, -0.35, 0, Math.PI * 2);
  context.ellipse(centerX + 8, centerY - 16, 2, 8, 0.35, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#263526";
  context.beginPath();
  context.arc(centerX - 5, centerY - 2, 2, 0, Math.PI * 2);
  context.arc(centerX + 5, centerY - 2, 2, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = colors.nose;
  context.beginPath();
  context.arc(centerX, centerY + 4, 2.5, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#7d6656";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(centerX - 11, centerY + 5);
  context.lineTo(centerX - 20, centerY + 2);
  context.moveTo(centerX - 11, centerY + 8);
  context.lineTo(centerX - 20, centerY + 10);
  context.moveTo(centerX + 11, centerY + 5);
  context.lineTo(centerX + 20, centerY + 2);
  context.moveTo(centerX + 11, centerY + 8);
  context.lineTo(centerX + 20, centerY + 10);
  context.stroke();
}

function roundRect(x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function setDirection(playerId, newDirection) {
  if (!running) {
    return;
  }

  const player = players.find((entry) => entry.id === playerId);
  if (!player || !player.alive) {
    return;
  }

  const isOpposite = newDirection.x + player.direction.x === 0 && newDirection.y + player.direction.y === 0;
  if (!isOpposite) {
    player.nextDirection = newDirection;
  }
}

document.addEventListener("keydown", (event) => {
  if (isTypingTarget(event.target)) {
    return;
  }

  if (event.code === "KeyP" || event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

  const directionMap = {
    KeyW: ["p1", { x: 0, y: -1 }],
    KeyS: ["p1", { x: 0, y: 1 }],
    KeyA: ["p1", { x: -1, y: 0 }],
    KeyD: ["p1", { x: 1, y: 0 }],
    ArrowUp: [mode === "multiplayer" ? "p2" : "p1", { x: 0, y: -1 }],
    ArrowDown: [mode === "multiplayer" ? "p2" : "p1", { x: 0, y: 1 }],
    ArrowLeft: [mode === "multiplayer" ? "p2" : "p1", { x: -1, y: 0 }],
    ArrowRight: [mode === "multiplayer" ? "p2" : "p1", { x: 1, y: 0 }]
  };

  if (directionMap[event.code]) {
    event.preventDefault();
    setDirection(directionMap[event.code][0], directionMap[event.code][1]);
  }
});

function isTypingTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

document.querySelectorAll(".joystick").forEach(setupJoystick);

function setupJoystick(joystick) {
  const knob = joystick.querySelector(".joystick-knob");
  const maxDistance = 34;
  let activePointerId = null;
  let lastDirectionKey = "";

  function moveKnob(event) {
    if (activePointerId !== event.pointerId) {
      return;
    }

    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.min(Math.hypot(deltaX, deltaY), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    if (distance < 16) {
      return;
    }

    const direction = Math.abs(deltaX) > Math.abs(deltaY)
      ? { key: deltaX > 0 ? "right" : "left", value: { x: deltaX > 0 ? 1 : -1, y: 0 } }
      : { key: deltaY > 0 ? "down" : "up", value: { x: 0, y: deltaY > 0 ? 1 : -1 } };

    if (direction.key !== lastDirectionKey) {
      lastDirectionKey = direction.key;
      setDirection(joystick.dataset.player, direction.value);
    }
  }

  function resetJoystick(event) {
    if (activePointerId !== event.pointerId) {
      return;
    }

    activePointerId = null;
    lastDirectionKey = "";
    joystick.classList.remove("active");
    knob.style.transform = "translate(-50%, -50%)";
    joystick.releasePointerCapture(event.pointerId);
  }

  joystick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    activePointerId = event.pointerId;
    joystick.classList.add("active");
    joystick.setPointerCapture(event.pointerId);
    moveKnob(event);
  });

  joystick.addEventListener("pointermove", (event) => {
    event.preventDefault();
    moveKnob(event);
  });

  joystick.addEventListener("pointerup", resetJoystick);
  joystick.addEventListener("pointercancel", resetJoystick);
}

function readGamepads() {
  const gamepads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  if (gamepads[0]) {
    handleGamepad(gamepads[0], "p1");
  }
  if (gamepads[1] && mode === "multiplayer") {
    handleGamepad(gamepads[1], "p2");
  }
  requestAnimationFrame(readGamepads);
}

function handleGamepad(gamepad, playerId) {
  const axisX = gamepad.axes[0] || 0;
  const axisY = gamepad.axes[1] || 0;
  const dpadUp = gamepad.buttons[12]?.pressed;
  const dpadDown = gamepad.buttons[13]?.pressed;
  const dpadLeft = gamepad.buttons[14]?.pressed;
  const dpadRight = gamepad.buttons[15]?.pressed;
  const actionPressed = Boolean(gamepad.buttons[0]?.pressed);
  const backPressed = Boolean(gamepad.buttons[1]?.pressed);
  const pausePressed = Boolean(gamepad.buttons[9]?.pressed || gamepad.buttons[8]?.pressed);

  const direction = getGamepadDirection(axisX, axisY, dpadUp, dpadDown, dpadLeft, dpadRight);
  if (direction) {
    if (running) {
      if (direction.key !== lastGamepadDirectionKey || playerId === "p2") {
        setDirection(playerId, direction.value);
      }
      if (playerId === "p1") {
        lastGamepadDirectionKey = direction.key;
      }
    } else if (playerId === "p1") {
      moveMenuWithGamepad(direction.key);
    }
  } else if (playerId === "p1") {
    lastGamepadDirectionKey = "";
    lastGamepadMenuMove = 0;
  }

  if (playerId === "p1") {
    if (actionPressed && !gamepadButtonState.action) {
      activateGamepadAction();
    }
    if (backPressed && !gamepadButtonState.back) {
      toggleSettingsWithGamepad();
    }
    if (pausePressed && !gamepadButtonState.pause) {
      togglePause();
    }
    gamepadButtonState.action = actionPressed;
    gamepadButtonState.back = backPressed;
    gamepadButtonState.pause = pausePressed;
  }
}

function getGamepadDirection(axisX, axisY, dpadUp, dpadDown, dpadLeft, dpadRight) {
  const threshold = 0.45;

  if (dpadUp || axisY < -threshold) {
    return { key: "up", value: { x: 0, y: -1 } };
  }
  if (dpadDown || axisY > threshold) {
    return { key: "down", value: { x: 0, y: 1 } };
  }
  if (dpadLeft || axisX < -threshold) {
    return { key: "left", value: { x: -1, y: 0 } };
  }
  if (dpadRight || axisX > threshold) {
    return { key: "right", value: { x: 1, y: 0 } };
  }

  return null;
}

function moveMenuWithGamepad(directionKey) {
  const now = performance.now();
  if (now - lastGamepadMenuMove < 220) {
    return;
  }

  if (directionKey === "up" || directionKey === "left") {
    moveSelectedMode(-1);
    lastGamepadMenuMove = now;
  }
  if (directionKey === "down" || directionKey === "right") {
    moveSelectedMode(1);
    lastGamepadMenuMove = now;
  }
}

function activateGamepadAction() {
  if (!settingsDialog.classList.contains("hidden")) {
    settingsForm.requestSubmit();
    return;
  }

  if (paused) {
    resumeGame();
    return;
  }

  if (!messageOverlay.classList.contains("hidden") && !primaryButton.classList.contains("hidden")) {
    startMode();
    return;
  }

  if (!messageOverlay.classList.contains("hidden")) {
    chooseMode(modeOrder[selectedModeIndex]);
  }
}

function toggleSettingsWithGamepad() {
  if (settingsDialog.classList.contains("hidden")) {
    applySettings();
    settingsDialog.classList.remove("hidden");
  } else {
    settingsDialog.classList.add("hidden");
  }
}

modeButtons.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => chooseMode(button.dataset.mode));
  button.addEventListener("focus", () => {
    selectedModeIndex = Math.max(0, modeOrder.indexOf(button.dataset.mode));
    updateSelectedModeButton();
  });
});

primaryButton.addEventListener("click", () => {
  if (paused) {
    resumeGame();
  } else {
    startMode();
  }
});

pauseButton.addEventListener("click", togglePause);

document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });
document.addEventListener("click", (event) => {
  if (event.target.closest("button")) {
    playSound("click");
  }
});

settingsButton.addEventListener("click", () => {
  applySettings();
  settingsDialog.classList.remove("hidden");
});

closeSettingsButton.addEventListener("click", () => {
  settingsDialog.classList.add("hidden");
});

settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) {
    settingsDialog.classList.add("hidden");
  }
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  settings = {
    ...settings,
    playerOneName: playerOneNameInput.value.trim() || defaultSettings.playerOneName,
    playerTwoName: playerTwoNameInput.value.trim() || defaultSettings.playerTwoName,
    theme: themeSelect.value,
    joystickSize: joystickSizeSelect.value,
    soundEnabled: soundEnabledInput.checked,
    soundVolume: Number(soundVolumeInput.value) / 100
  };
  saveSettings();
  applySettings();
  players.forEach((player) => {
    if (player.id === "p1") {
      player.name = settings.playerOneName;
    }
    if (player.id === "p2") {
      player.name = settings.playerTwoName;
    }
  });
  if (menuOpen) {
    modeLabel.textContent = "Willkommen";
  } else {
    updateHud();
    renderInfoPanel();
  }
  settingsDialog.classList.add("hidden");
});

resetHighscoreButton.addEventListener("click", () => {
  settings.endlessHighscore = { ...defaultSettings.endlessHighscore };
  saveSettings();
  updateHighscoreText();
});

themeSelect.addEventListener("change", () => {
  settings.theme = themeSelect.value;
  applyVisualSettings();
});

joystickSizeSelect.addEventListener("change", () => {
  settings.joystickSize = joystickSizeSelect.value;
  applyVisualSettings();
});

soundEnabledInput.addEventListener("change", () => {
  settings.soundEnabled = soundEnabledInput.checked;
  saveSettings();
  if (settings.soundEnabled) {
    playSound("click");
    if (running && !paused && !countdownActive) {
      startBackgroundMusic();
    }
  } else {
    pauseBackgroundMusic();
  }
});

soundVolumeInput.addEventListener("input", () => {
  settings.soundVolume = Number(soundVolumeInput.value) / 100;
  updateSoundVolumes();
  saveSettings();
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && !settingsDialog.classList.contains("hidden")) {
    settingsDialog.classList.add("hidden");
  }
});

applySettings();
showMenu();
requestAnimationFrame(readGamepads);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}
