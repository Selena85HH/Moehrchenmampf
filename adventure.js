// Garden mechanics and canvas cosmetics share the game's deterministic step clock.
function freeGardenCell(extra = []) {
  const level = mode === "levels" ? levels[currentLevelIndex] : {};
  const blocked = [...getObstacles(), ...(level.gates || []), ...(level.tunnels || []),
    ...players.flatMap((player) => player.body), ...extra];
  const cells = [];
  for (let y = 0; y < tileCount; y++) for (let x = 0; x < tileCount; x++) {
    const cell = { x, y };
    if (!blocked.some((entry) => sameCell(entry, cell))) cells.push(cell);
  }
  return cells[Math.floor(Math.random() * cells.length)] || null;
}

function advanceGardenEvents() {
  const gates = mode === "levels" ? levels[currentLevelIndex].gates || [] : [];
  // Open 70 steps, announce the last 15, then close 30 steps. Occupied gates stay open.
  closedGates = roundSteps % 100 >= 70 ? gates.filter((gate) => !players.some((player) =>
    player.body.some((cell) => sameCell(cell, gate)) || (!closedGates.some((closed) => sameCell(closed, gate)) && sameCell(getNextHead(player), gate)))) : [];
  if (mode === "endless" && goldenCarrot && roundSteps >= goldenCarrot.expiresAt) goldenCarrot = null;
  if (activeEndlessEvent && roundSteps >= activeEndlessEvent.until) activeEndlessEvent = null;
}

function spawnLevelGold() {
  if (mode !== "levels" || goldenCarrot || players[0].carrots < nextGoldenAt) return;
  const cell = freeGardenCell(carrot ? [carrot] : []);
  if (cell) { goldenCarrot = { ...cell }; nextGoldenAt += 3; }
}

function collectGardenCarrot(player) {
  garden.addPoints(1);
  collectFlash = roundSteps;
  if (mode === "levels") spawnLevelGold();
  if (mode === "endless") {
    const milestones = garden.awardEndless(player.carrots);
    if (milestones.length) gardenToast(`Endlos-Meilenstein: ${milestones.join(" / ")} Möhren!`);
    if (player.carrots % 10 === 0) {
      const phase = (player.carrots / 10 - 1) % 3;
      activeEndlessEvent = { name: ["Goldrausch", "Abendglanz", "Sternenstunde"][phase], phase, until: roundSteps + 60 };
      const cell = freeGardenCell(carrot ? [carrot] : []);
      goldenCarrot = cell ? { ...cell, expiresAt: roundSteps + 60, value: [8, 10, 12][phase] } : null;
      gardenToast(`${activeEndlessEvent.name}! Eine Goldmöhre wartet für 60 Schritte. Der Umweg ist freiwillig.`);
    }
  }
  updateGardenProgress();
}

function collectGoldenCarrot() {
  const value = goldenCarrot.value || 5;
  goldenCarrot = null;
  goldenCount++;
  garden.addPoints(value);
  if (mode === "levels") {
    if (garden.awardBadge(currentLevelIndex, "discovered")) gardenToast("Abzeichen entdeckt: Deine erste Goldmöhre in diesem Garten!");
    if (goldenCount >= 3 && garden.awardBadge(currentLevelIndex, "mastered")) gardenToast("Garten gemeistert: Drei Goldmöhren in einem Versuch!");
    spawnLevelGold();
  }
  collectFlash = roundSteps;
  playSound("carrot");
  updateGardenProgress();
}

function getAdventurePalette() {
  const theme = getLevelVisualTheme();
  const phase = mode === "endless" ? Math.floor((players[0]?.carrots || 0) / 10) % 3 : 0;
  if (theme === "dusk" || (mode === "endless" && phase === 2)) return {
    fieldLight: "#293d55", fieldDark: "#30475d", decorationPrimary: "#91c9ad", decorationSecondary: "#f5df91",
    obstacle: "#9a7899", obstacleLight: "#d6b6c6", obstacleDark: "#453953", bunnyOutline: "#93b9c5"
  };
  if (theme === "forest" || (mode === "endless" && phase === 1)) return {
    fieldLight: "#9ec6a1", fieldDark: "#94bd97", decorationPrimary: "#466e50", decorationSecondary: "#ebcd82",
    obstacle: "#72553f", obstacleLight: "#b49368", obstacleDark: "#493e31"
  };
  return null;
}

function updateAdventureStatus() {
  const label = document.querySelector("#adventureStatus");
  if (mode === "multiplayer") { label.textContent = "Lokales Duell · Die gemeinsame Sammlung verdient Punkte im Einzelspiel."; return; }
  if (mode === "levels") {
    const gates = levels[currentLevelIndex].gates;
    if (gates && roundSteps % 100 >= 55 && roundSteps % 100 < 70) {
      label.textContent = `Pforten schließen in ${70 - roundSteps % 100} Schritten · Abstand halten!`; return;
    }
    const badges = garden.state.levels[currentLevelIndex];
    label.textContent = `Goldmöhren: ${goldenCount}/3 · ${badges.discovered ? "Entdeckt ✓" : "1 Goldmöhre: Entdecker-Abzeichen"} · 3 in einem Versuch: Meister-Abzeichen`;
  } else if (goldenCarrot) {
    label.textContent = `${activeEndlessEvent?.name || "Goldmöhre"} · +${goldenCarrot.value} Gartenpunkte · noch ${Math.max(0, goldenCarrot.expiresAt - roundSteps)} Schritte`;
  } else {
    const carrots = players[0]?.carrots || 0;
    const mark = [20, 40, 60].find((value) => value > carrots);
    label.textContent = `Nächstes Ereignis bei ${Math.floor(carrots / 10 + 1) * 10} Möhren${mark ? ` · Auszeichnung bei ${mark}` : " · Alle Endlos-Meilensteine geschafft!"}`;
  }
}

function getEquippedColors() {
  const reward = MampfProgress.rewards.find((item) => item.id === garden.state.equipment.outfit);
  return { head: reward.color, body: reward.body, ear: "#eea9b8", nose: "#ef8aa5" };
}

function drawAdventureScenery() {
  const level = mode === "levels" ? levels[currentLevelIndex] : {};
  for (const cell of level.tunnels || []) {
    const x = (cell.x + 0.5) * tileSize, y = (cell.y + 0.5) * tileSize;
    context.fillStyle = "#174b4d";
    context.beginPath(); context.ellipse(x, y, 14, 11, 0, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#8de2d4"; context.lineWidth = 3; context.stroke();
    context.fillStyle = "#ddfff2"; context.font = "bold 18px sans-serif"; context.textAlign = "center";
    context.fillText("↔", x, y + 6);
  }
  for (const cell of level.gates || []) {
    if (closedGates.some((gate) => sameCell(gate, cell))) continue;
    const warning = roundSteps % 100 >= 55 && roundSteps % 100 < 70;
    context.strokeStyle = warning ? "#b94d23" : "#edf6df";
    context.lineWidth = warning ? 4 : 2;
    context.strokeRect(cell.x * tileSize + 4, cell.y * tileSize + 4, tileSize - 8, tileSize - 8);
  }
  // Decorative perimeter stays off the paths and never resembles a collision cell.
  context.fillStyle = "rgba(33, 66, 45, 0.12)";
  context.fillRect(0, 0, canvas.width, 3); context.fillRect(0, canvas.height - 3, canvas.width, 3);
}

function drawGoldenCarrot() {
  const x = (goldenCarrot.x + 0.5) * tileSize, y = (goldenCarrot.y + 0.5) * tileSize;
  context.fillStyle = "rgba(255, 224, 96, 0.24)";
  context.beginPath(); context.arc(x, y, 18, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#ffdb5c"; context.strokeStyle = "#886015"; context.lineWidth = 2;
  context.beginPath(); context.moveTo(x - 9, y - 5); context.lineTo(x + 9, y - 5); context.lineTo(x, y + 14); context.closePath(); context.fill(); context.stroke();
  context.strokeStyle = "#fff5ba"; context.lineWidth = 3;
  context.beginPath(); context.moveTo(x, y - 6); context.lineTo(x - 5, y - 14); context.moveTo(x, y - 6); context.lineTo(x + 5, y - 14); context.stroke();
  context.fillStyle = "#fff5ba"; context.font = "bold 13px sans-serif"; context.textAlign = "center"; context.fillText("✦", x + 13, y - 9);
}

function drawClosedGardenGate(cell) {
  const x = cell.x * tileSize, y = cell.y * tileSize;
  context.fillStyle = "#795c3d";
  roundRect(x + 3, y + 3, tileSize - 6, tileSize - 6, 4); context.fill();
  context.strokeStyle = "#edd59d"; context.lineWidth = 2;
  context.beginPath();
  for (let offset = 8; offset < tileSize - 4; offset += 8) { context.moveTo(x + offset, y + 6); context.lineTo(x + offset, y + tileSize - 6); }
  context.moveTo(x + 5, y + 11); context.lineTo(x + tileSize - 5, y + 11);
  context.moveTo(x + 5, y + 23); context.lineTo(x + tileSize - 5, y + 23); context.stroke();
}

function drawForestDecoration(x, y, dusk) {
  const cx = x * tileSize + 22, cy = y * tileSize + 10;
  context.fillStyle = dusk ? "#f5df91" : "#4c7c56";
  context.beginPath();
  if (dusk) {
    context.arc(cx, cy, 1.5, 0, Math.PI * 2); context.fill();
  } else {
    context.ellipse(cx - 3, cy, 4, 2, -0.5, 0, Math.PI * 2);
    context.ellipse(cx + 3, cy - 3, 4, 2, 0.5, 0, Math.PI * 2); context.fill();
    context.strokeStyle = "#6c9462"; context.lineWidth = 1;
    context.beginPath(); context.moveTo(cx, cy + 5); context.lineTo(cx, cy - 6); context.stroke();
  }
}

function drawGardenAccessories(x, y) {
  const equipment = garden.state.equipment;
  if (equipment.accessory === "scarf") {
    context.fillStyle = "#dc6e37"; roundRect(x - 12, y + 7, 24, 5, 2); context.fill();
    context.fillRect(x + 6, y + 9, 5, 9);
  } else if (equipment.accessory === "crown") {
    context.fillStyle = "#f6c748"; context.strokeStyle = "#92601d"; context.lineWidth = 1;
    context.beginPath(); context.moveTo(x - 12, y - 13); context.lineTo(x - 15, y - 24); context.lineTo(x - 5, y - 19);
    context.lineTo(x, y - 29); context.lineTo(x + 5, y - 19); context.lineTo(x + 15, y - 24); context.lineTo(x + 12, y - 13); context.closePath(); context.fill(); context.stroke();
  } else if (equipment.accessory.endsWith("Cape")) {
    context.fillStyle = equipment.accessory === "forestCape" ? "#386e57" : "#df96b4";
    context.beginPath(); context.moveTo(x - 11, y + 6); context.lineTo(x - 17, y + 19); context.lineTo(x + 17, y + 19); context.lineTo(x + 11, y + 6); context.closePath(); context.fill();
    context.fillStyle = "#f5d97b"; context.beginPath(); context.arc(x, y + 9, 3, 0, Math.PI * 2); context.fill();
  } else if (equipment.accessory === "bronze") {
    context.fillStyle = "#c18649"; context.beginPath(); context.arc(x + 8, y + 8, 5, 0, Math.PI * 2); context.fill();
  }
  if (equipment.outfit === "forest") {
    context.fillStyle = "#4b8255"; context.beginPath(); context.ellipse(x - 5, y - 17, 8, 4, -0.7, 0, Math.PI * 2); context.fill();
  }
  if (equipment.outfit === "moon") {
    context.fillStyle = "#fff4bf"; context.font = "12px sans-serif"; context.textAlign = "center"; context.fillText("✦", x, y - 13);
  }
  if (!reducedMotion.matches && roundSteps - collectFlash < 2 && collectFlash > 0) {
    context.strokeStyle = "#e9b74d"; context.lineWidth = 1.5;
    context.beginPath(); context.arc(x, y, 18, 0, Math.PI * 2); context.stroke();
  }
}

function drawGardenTrail(x, y, index) {
  const trail = garden.state.equipment.trail;
  if (trail === "quiet" || index % 2 === 0) return;
  context.fillStyle = trail === "silver" ? "#e5f4ff" : "#f5a7c9";
  context.font = "12px sans-serif"; context.textAlign = "center";
  context.fillText(trail === "silver" ? "✦" : "✿", x, y + 4);
}

function drawGardenCompanion(head) {
  if (mode === "multiplayer" || !players[0] || garden.state.equipment.companion === "solo") return;
  head ||= players[0].body[0];
  const sway = reducedMotion.matches || !running || paused ? 0 : Math.sin(performance.now() / 280) * 3;
  const x = Math.min(canvas.width - 12, Math.max(12, (head.x + 0.5) * tileSize + 23));
  const y = Math.max(12, (head.y + 0.5) * tileSize - 25 + sway);
  context.fillStyle = garden.state.equipment.companion === "gold" ? "#ffdc67" : "#ba86d0";
  context.beginPath(); context.ellipse(x - 4, y, 5, 7 + sway * 0.4, -0.3, 0, Math.PI * 2);
  context.ellipse(x + 4, y, 5, 7 + sway * 0.4, 0.3, 0, Math.PI * 2); context.fill();
  context.fillStyle = "#524366"; context.fillRect(x - 1, y - 4, 2, 9);
}
