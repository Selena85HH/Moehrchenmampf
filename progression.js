/* Shared, offline progression. Gameplay scores and settings remain independent. */
(function (root) {
  "use strict";
  const storageKey = "moehrchenmampf-garden-v1";
  const rewards = [
    { id: "classic", slot: "outfit", name: "Wiesenhäschen", points: 0, color: "#fffdf8", body: "#f4f1eb", icon: "🐇", description: "Dein vertrautes Häschen." },
    { id: "bare", slot: "accessory", name: "Ohne Accessoire", points: 0, icon: "○" },
    { id: "quiet", slot: "trail", name: "Ohne Spur", points: 0, icon: "○" },
    { id: "solo", slot: "companion", name: "Ohne Begleiter", points: 0, icon: "○" },
    { id: "scarf", slot: "accessory", name: "Sonnentuch", points: 20, icon: "🧣", description: "Ein orangefarbenes Halstuch für deine Abenteuer." },
    { id: "cocoa", slot: "outfit", name: "Kakaohäschen", points: 75, color: "#c89b78", body: "#dfbfa0", icon: "🐰", description: "Warmes Fell und rosa Ohren." },
    { id: "flowers", slot: "trail", name: "Blütenspur", points: 180, icon: "🌸", description: "Kleine Blüten begleiten deinen Weg." },
    { id: "forest", slot: "outfit", name: "Waldhäschen", points: 350, color: "#afc898", body: "#d1dfb6", icon: "🌿", description: "Moosgrünes Fell mit einem Blatt auf dem Kopf." },
    { id: "butterfly", slot: "companion", name: "Schmetterlingsfreund", points: 650, icon: "🦋", description: "Ein kleiner, rein dekorativer Begleiter." },
    { id: "moon", slot: "outfit", name: "Mondhäschen", points: 1000, color: "#c4c2f2", body: "#e0dffa", icon: "🌙", description: "Mondfarbenes Fell mit einem sanften Sternenglanz." },
    { id: "crown", slot: "accessory", name: "Goldene Möhrchenkrone", points: 1500, icon: "👑", description: "Die Krönung deiner Gartenreise. Mit goldenem Siegesregen." },
    { id: "meadowCape", slot: "accessory", name: "Blütenumhang", world: 0, icon: "🌼", description: "Alle 15 Abzeichen der Wiesenwelt sammeln." },
    { id: "forestCape", slot: "accessory", name: "Waldumhang", world: 1, icon: "🍃", description: "Alle 15 Abzeichen der Waldwelt sammeln." },
    { id: "bronze", slot: "accessory", name: "Bronzene Möhrennadel", milestone: 20, icon: "🥉", description: "20 Möhren in einer Endlosrunde." },
    { id: "silver", slot: "trail", name: "Silberne Sternenspur", milestone: 40, icon: "✨", description: "40 Möhren in einer Endlosrunde." },
    { id: "gold", slot: "companion", name: "Goldenes Glühwürmchen", milestone: 60, icon: "✦", description: "60 Möhren in einer Endlosrunde." }
  ];
  const integer = (value, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;
  function fresh(levelCount) {
    return { version: 1, points: 0, unlockedLevel: 0, selectedLevel: 0,
      levels: Array.from({ length: levelCount }, () => ({ complete: false, discovered: false, mastered: false })),
      milestones: [], equipment: { outfit: "classic", accessory: "bare", trail: "quiet", companion: "solo" } };
  }
  function isUnlocked(reward, state) {
    if (!reward) return false;
    if (reward.world !== undefined) return state.levels.slice(reward.world * 5, reward.world * 5 + 5)
      .filter((level) => level.complete && level.discovered && level.mastered).length === 5;
    if (reward.milestone) return state.milestones.includes(reward.milestone);
    return state.points >= reward.points;
  }
  function decode(raw, count) {
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || !Array.isArray(value.levels)) throw new Error("Invalid garden save");
    const state = fresh(count);
    state.points = integer(value.points);
    state.levels = state.levels.map((level, index) => Object.fromEntries(Object.keys(level).map((key) => [key, value.levels[index]?.[key] === true])));
    // Unlocks follow completed levels, never a possibly damaged stored index.
    while (state.unlockedLevel < count - 1 && state.levels[state.unlockedLevel].complete) state.unlockedLevel++;
    state.selectedLevel = Math.min(integer(value.selectedLevel), state.unlockedLevel);
    state.milestones = [20, 40, 60].filter((mark) => value.milestones?.includes(mark));
    for (const slot of Object.keys(state.equipment)) {
      const reward = rewards.find((item) => item.id === value.equipment?.[slot] && item.slot === slot);
      if (isUnlocked(reward, state)) state.equipment[slot] = reward.id;
    }
    return state;
  }
  function create(storage, levelCount = 10) {
    let state;
    let storageOK = true;
    let recovered = false;
    for (const key of [storageKey, `${storageKey}-backup`]) {
      let raw;
      try { raw = storage.getItem(key); }
      catch { storageOK = false; continue; }
      try {
        state = decode(raw, levelCount);
        if (state) { recovered = key.endsWith("-backup"); break; }
      } catch { recovered = true; }
    }
    state ||= fresh(levelCount);
    // Keep a validated snapshot for recovery, without copying corrupt input.
    let lastSaved = JSON.stringify(state);
    function save() {
      try {
        storage.setItem(`${storageKey}-backup`, lastSaved);
        const snapshot = JSON.stringify(state);
        storage.setItem(storageKey, snapshot);
        lastSaved = snapshot;
        storageOK = true;
      } catch { storageOK = false; }
    }
    function add(amount) { state.points = Math.min(Number.MAX_SAFE_INTEGER, state.points + integer(amount)); }
    return {
      get state() { return state; }, get storageOK() { return storageOK; }, get recovered() { return recovered; },
      unlocked: () => rewards.filter((reward) => isUnlocked(reward, state)),
      next: () => rewards.find((reward) => reward.points > state.points),
      addPoints(amount) { add(amount); save(); },
      awardBadge(index, badge) {
        if (!state.levels[index] || !["complete", "discovered", "mastered"].includes(badge) || state.levels[index][badge]) return false;
        state.levels[index][badge] = true;
        add({ complete: 30, discovered: 10, mastered: 20 }[badge]);
        if (badge === "complete") {
          while (state.unlockedLevel < levelCount - 1 && state.levels[state.unlockedLevel].complete) state.unlockedLevel++;
          state.selectedLevel = Math.min(index + 1, state.unlockedLevel);
        }
        save(); return true;
      },
      awardEndless(carrots) {
        const earned = [20, 40, 60].filter((mark) => carrots >= mark && !state.milestones.includes(mark));
        for (const mark of earned) { state.milestones.push(mark); add(mark * 2); }
        if (earned.length) save();
        return earned;
      },
      selectLevel(index) {
        if (!Number.isInteger(index) || index < 0 || index > state.unlockedLevel) return false;
        state.selectedLevel = index; save(); return true;
      },
      equip(id) {
        const reward = rewards.find((item) => item.id === id);
        if (!isUnlocked(reward, state)) return false;
        state.equipment[reward.slot] = id; save(); return true;
      }
    };
  }
  const api = { create, rewards, storageKey, isUnlocked };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MampfProgress = api;
})(globalThis);
