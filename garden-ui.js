let knownGardenRewards = new Set();
let gardenTab = "map";

function gardenToast(message) {
  const toast = document.querySelector("#gardenToast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 6500);
}

function updateGardenProgress() {
  const next = garden.next();
  document.querySelector("#gardenPoints").textContent = `${garden.state.points} Gartenpunkte`;
  document.querySelector("#nextReward").textContent = next
    ? `Noch ${next.points - garden.state.points} bis „${next.name}“`
    : "Alle Punktebelohnungen freigespielt! Entdecke die Welt- und Endlos-Auszeichnungen.";
  const meter = document.querySelector("#gardenMeter");
  meter.max = next?.points || 1500;
  meter.value = garden.state.points;
  const fresh = garden.unlocked().filter((reward) => !knownGardenRewards.has(reward.id));
  if (fresh.length) gardenToast(`Freigespielt: ${fresh.map((reward) => reward.name).join(", ")}! In deiner Sammlung kannst du alles anziehen.`);
  knownGardenRewards = new Set(garden.unlocked().map((reward) => reward.id));
  const warning = document.querySelector("#saveWarning");
  warning.classList.toggle("hidden", garden.storageOK);
  warning.textContent = "Dein Browser konnte den Fortschritt nicht speichern. Lass das Spiel geöffnet und prüfe, ob genügend Speicher verfügbar ist.";
}

function renderRoundRewards() {
  const panel = document.querySelector("#roundRewards");
  panel.classList.toggle("hidden", mode === "multiplayer");
  if (mode === "multiplayer") return;
  const earned = garden.state.points - roundStartPoints;
  const unlocked = garden.unlocked().filter((reward) => !roundStartRewards.has(reward.id));
  const next = garden.next();
  panel.textContent = `+${earned} Gartenpunkte bleiben in deiner Sammlung.${goldenCount ? ` ${goldenCount} Goldmöhren entdeckt.` : ""}${unlocked.length ? ` Neu: ${unlocked.map((reward) => reward.name).join(", ")}.` : next ? ` Noch ${next.points - garden.state.points} bis „${next.name}“.` : " Alle Punktebelohnungen freigespielt!"}`;
  if (garden.state.equipment.accessory === "crown" && (players[0]?.alive || messageTitle.textContent === "Neuer Rekord!")) revealFinalSurprise();
  updateGardenProgress();
}

function openGarden(tabName) {
  if (!settingsDialog.classList.contains("hidden")) return;
  if (running && !paused) pauseGame();
  gardenTab = tabName;
  renderGardenDialog();
  if (!gardenDialog.open) gardenDialog.showModal();
}

function renderGardenDialog() {
  const map = gardenTab === "map";
  document.querySelector("#mapTab").setAttribute("aria-pressed", String(map));
  document.querySelector("#collectionTab").setAttribute("aria-pressed", String(!map));
  document.querySelector("#gardenDialogTitle").textContent = map ? "Deine Gartenreise" : "Deine Häschen-Sammlung";
  document.querySelector("#gardenDialogDescription").textContent = map
    ? "Erkunde zehn Gärten. Jedes Abzeichen bleibt erhalten, auch wenn ein Versuch endet."
    : "Alles wird durch Spielen freigeschaltet. Wähle ein Fell, Accessoire, eine Spur und einen Begleiter. Die Sammlung gilt für dieses Gerät.";
  const content = document.querySelector("#gardenDialogContent");
  content.replaceChildren();
  if (map) renderGardenMap(content); else renderGardenCollection(content);
}

function uiElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderGardenMap(content) {
  for (let world = 0; world < 2; world++) {
    const section = uiElement("section", `garden-world world-${world}`);
    section.appendChild(uiElement("p", "world-kicker", world ? "WELT 02 · WALDLEUCHTEN" : "WELT 01 · MÖHRCHENWIESEN"));
    section.appendChild(uiElement("h3", "", world ? "Zwischen Moos & Sternen" : "Ein Garten voller Anfänge"));
    const grid = uiElement("div", "garden-level-grid");
    levels.slice(world * 5, world * 5 + 5).forEach((level, offset) => {
      const index = world * 5 + offset;
      const badges = garden.state.levels[index];
      const locked = index > garden.state.unlockedLevel;
      const button = uiElement("button", "garden-level");
      button.type = "button";
      button.disabled = locked;
      button.setAttribute("aria-label", `${index + 1}. ${level.name}${locked ? ", gesperrt" : ""}. ${Number(badges.complete) + Number(badges.discovered) + Number(badges.mastered)} von 3 Abzeichen`);
      button.appendChild(uiElement("span", "level-map-number", locked ? "🔒" : String(index + 1).padStart(2, "0")));
      button.appendChild(uiElement("strong", "", level.name));
      const symbols = uiElement("span", "map-badges");
      for (const [key, name] of [["complete", "Geschafft"], ["discovered", "Entdeckt"], ["mastered", "Gemeistert"]]) {
        const badge = uiElement("span", badges[key] ? "badge-earned" : "badge-empty", badges[key] ? "★" : "☆");
        badge.title = `${name}${badges[key] ? " erreicht" : " offen"}`;
        symbols.appendChild(badge);
      }
      button.appendChild(symbols);
      button.addEventListener("click", () => {
        if (!garden.selectLevel(index)) return;
        gardenDialog.close();
        mode = "levels"; currentLevelIndex = index; score = 0;
        startMode();
      });
      grid.appendChild(button);
    });
    section.appendChild(grid);
    section.appendChild(uiElement("p", "world-goal", `Weltbelohnung: ${world ? "Waldumhang" : "Blütenumhang"} für alle 15 Abzeichen.`));
    content.appendChild(section);
  }
  content.appendChild(uiElement("p", "garden-help", "Geschafft: Möhrenziel erreichen (+30 einmalig, +10 je Abschluss). Entdeckt: 1 Goldmöhre (+10 einmalig). Gemeistert: 3 Goldmöhren in einem Versuch (+20 einmalig). Goldmöhren erscheinen nach 2, 5, 8 … normalen Möhren und bleiben im Level liegen. Die Abzeichen können in verschiedenen Versuchen verdient werden."));
}

function renderGardenCollection(content) {
  const slots = { outfit: "Häschen-Fell", accessory: "Accessoires", trail: "Spuren", companion: "Begleiter" };
  for (const [slot, name] of Object.entries(slots)) {
    content.appendChild(uiElement("h3", "collection-heading", name));
    const grid = uiElement("div", "reward-grid");
    for (const reward of MampfProgress.rewards.filter((item) => item.slot === slot)) {
      const unlocked = MampfProgress.isUnlocked(reward, garden.state);
      const equipped = garden.state.equipment[slot] === reward.id;
      const card = uiElement("article", `reward-card${unlocked ? "" : " reward-locked"}`);
      const preview = uiElement("div", "reward-preview");
      preview.innerHTML = rewardPreview(reward);
      preview.setAttribute("aria-hidden", "true");
      card.appendChild(preview);
      card.appendChild(uiElement("strong", "", reward.name));
      card.appendChild(uiElement("p", "", reward.description || "Dein schlichter Garten-Look."));
      const button = uiElement("button", "", equipped ? "Angezogen ✓" : unlocked ? "Anziehen" : reward.points ? `${reward.points} Gartenpunkte` : reward.milestone ? `${reward.milestone} Endlos-Möhren` : "15 Welt-Abzeichen");
      button.type = "button";
      button.disabled = !unlocked;
      button.setAttribute("aria-pressed", String(equipped));
      button.setAttribute("aria-label", `${reward.name}: ${button.textContent}`);
      button.addEventListener("click", () => {
        if (!garden.equip(reward.id)) return;
        if (mode !== "multiplayer") players.forEach((player) => { player.colors = getEquippedColors(); });
        // Preserve focus instead of rebuilding a focused card.
        renderGardenDialog();
        const equippedButton = document.querySelector(`#gardenDialogContent button[data-reward="${reward.id}"]`);
        equippedButton?.focus();
        draw(); updateGardenProgress();
      });
      button.dataset.reward = reward.id;
      card.appendChild(button); grid.appendChild(card);
    }
    content.appendChild(grid);
  }
}

function rewardPreview(reward) {
  // All SVG values come from the fixed catalog, never player-supplied text.
  const color = reward.color || "#fffdf8";
  let extra = "";
  if (reward.id === "scarf") extra = '<path d="M35 66h50v9H35zM70 71h10v19H70z" fill="#dc6e37"/>';
  if (reward.id === "crown") extra = '<path d="M40 38l-6-20 17 9 9-20 9 20 17-9-6 20z" fill="#f1c54a" stroke="#a16b2a" stroke-width="2"/>';
  if (reward.id === "forest" || reward.id === "forestCape") extra = '<path d="M34 72L23 92h74L86 72" fill="#4a7a5b"/><ellipse cx="53" cy="30" rx="12" ry="5" fill="#53815a" transform="rotate(-25 53 30)"/>';
  if (reward.id === "meadowCape") extra = '<path d="M34 72L23 92h74L86 72" fill="#df96b4"/>';
  if (reward.id === "bronze") extra = '<circle cx="77" cy="71" r="8" fill="#c18649"/>';
  if (["flowers", "silver", "moon"].includes(reward.id)) extra += `<text x="10" y="55" font-size="18" fill="${reward.id === "flowers" ? "#ce7aa1" : "#6f73ad"}">${reward.id === "flowers" ? "✿" : "✦"}</text><text x="89" y="80" font-size="15" fill="#c78aaf">✦</text>`;
  if (["butterfly", "gold"].includes(reward.id)) extra = `<g fill="${reward.id === "gold" ? "#e2ad34" : "#a780bd"}"><ellipse cx="91" cy="26" rx="7" ry="10"/><ellipse cx="105" cy="26" rx="7" ry="10"/></g><path d="M98 19v17" stroke="#564263" stroke-width="3"/>`;
  return `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="88" rx="34" ry="6" fill="#a9bda0" opacity=".3"/><g stroke="#a9b89e" stroke-width="1.5" fill="${color}"><ellipse cx="45" cy="31" rx="9" ry="24" transform="rotate(-17 45 31)"/><ellipse cx="75" cy="31" rx="9" ry="24" transform="rotate(17 75 31)"/><ellipse cx="60" cy="61" rx="29" ry="26"/></g><g fill="#eeb1bd"><ellipse cx="45" cy="27" rx="4" ry="15" transform="rotate(-17 45 27)"/><ellipse cx="75" cy="27" rx="4" ry="15" transform="rotate(17 75 27)"/><circle cx="60" cy="66" r="4"/></g><g fill="#2d4236"><circle cx="50" cy="57" r="3"/><circle cx="70" cy="57" r="3"/></g>${extra}</svg>`;
}

function initGardenUI() {
  knownGardenRewards = new Set(garden.unlocked().map((reward) => reward.id));
  document.querySelector("#openMapButton").addEventListener("click", () => openGarden("map"));
  document.querySelector("#openCollectionButton").addEventListener("click", () => openGarden("collection"));
  document.querySelector("#mapTab").addEventListener("click", () => { gardenTab = "map"; renderGardenDialog(); });
  document.querySelector("#collectionTab").addEventListener("click", () => { gardenTab = "collection"; renderGardenDialog(); });
  document.querySelector("#closeGardenButton").addEventListener("click", () => gardenDialog.close());
  if (garden.recovered) gardenToast("Ein beschädigter Spielstand wurde erkannt. Falls vorhanden, wurde die letzte gültige Sicherung geladen.");
}
