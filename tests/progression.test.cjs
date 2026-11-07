const { test } = require("node:test");
const assert = require("node:assert/strict");
const { create, storageKey, rewards, isUnlocked } = require("../progression.js");

function storage() {
  const entries = new Map();
  return { entries, getItem: (key) => entries.get(key) || null, setItem: (key, value) => entries.set(key, value) };
}

test("points, equipment and level selection survive a reload", () => {
  const disk = storage(), garden = create(disk);
  garden.addPoints(350); garden.awardBadge(0, "complete");
  assert.equal(garden.equip("forest"), true);
  const restored = create(disk);
  assert.equal(restored.state.points, 380);
  assert.equal(restored.state.selectedLevel, 1);
  assert.equal(restored.state.equipment.outfit, "forest");
});

test("each badge grants its bonus once across reloads", () => {
  const disk = storage(), garden = create(disk);
  assert.equal(garden.awardBadge(0, "discovered"), true);
  assert.equal(garden.awardBadge(0, "discovered"), false);
  assert.equal(create(disk).awardBadge(0, "discovered"), false);
  assert.equal(create(disk).state.points, 10);
});

test("independent badges do not require completing the level", () => {
  const garden = create(storage());
  garden.awardBadge(0, "mastered");
  assert.equal(garden.state.levels[0].mastered, true);
  assert.equal(garden.state.levels[0].complete, false);
  assert.equal(garden.state.unlockedLevel, 0);
});

test("locked equipment and locked levels cannot be selected", () => {
  const garden = create(storage());
  assert.equal(garden.equip("crown"), false);
  assert.equal(garden.equip("not-an-item"), false);
  assert.equal(garden.selectLevel(9), false);
  assert.equal(garden.selectLevel(-1), false);
  assert.equal(garden.selectLevel(0.5), false);
});

test("outfit, accessory, trail and companion can be combined", () => {
  const garden = create(storage()); garden.addPoints(1500);
  for (const id of ["moon", "crown", "flowers", "butterfly"]) assert.equal(garden.equip(id), true);
  assert.deepEqual(garden.state.equipment, { outfit: "moon", accessory: "crown", trail: "flowers", companion: "butterfly" });
});

test("all 15 world badges are required for its exclusive cape", () => {
  const garden = create(storage()); garden.addPoints(10000);
  for (let index = 0; index < 5; index++) for (const badge of ["complete", "discovered", "mastered"]) {
    if (index !== 4 || badge !== "mastered") garden.awardBadge(index, badge);
  }
  assert.equal(garden.equip("meadowCape"), false);
  garden.awardBadge(4, "mastered");
  assert.equal(garden.equip("meadowCape"), true);
  assert.equal(garden.equip("forestCape"), false);
});

test("endless milestone rewards are awarded exactly once and are separate from points", () => {
  const disk = storage(), garden = create(disk);
  assert.deepEqual(garden.awardEndless(19), []);
  assert.deepEqual(garden.awardEndless(40), [20, 40]);
  assert.equal(garden.state.points, 120);
  assert.equal(garden.equip("silver"), true);
  assert.equal(garden.equip("gold"), false);
  assert.deepEqual(create(disk).awardEndless(40), []);
  assert.deepEqual(create(disk).awardEndless(60), [60]);
});

test("corrupt main save recovers from a validated backup", () => {
  const disk = storage(), garden = create(disk);
  garden.addPoints(75); garden.equip("cocoa");
  disk.entries.set(storageKey, "{broken");
  const recovered = create(disk);
  assert.equal(recovered.state.points, 75);
  assert.equal(recovered.recovered, true);
});

test("corrupt saves do not crash and forged equipment is discarded", () => {
  const disk = storage();
  disk.entries.set(storageKey, JSON.stringify({ version: 1, points: -50, levels: [], unlockedLevel: 9, selectedLevel: 9, equipment: { accessory: "crown" } }));
  const garden = create(disk);
  assert.equal(garden.state.points, 0);
  assert.equal(garden.state.selectedLevel, 0);
  assert.equal(garden.state.equipment.accessory, "bare");
});

test("save failures are reported without discarding current session progress", () => {
  const disk = storage(), garden = create(disk);
  disk.setItem = () => { throw new Error("quota"); };
  assert.doesNotThrow(() => garden.addPoints(20));
  assert.equal(garden.state.points, 20);
  assert.equal(garden.storageOK, false);
  disk.setItem = (key, value) => disk.entries.set(key, value);
  garden.addPoints(1);
  assert.equal(garden.storageOK, true);
  assert.equal(create(disk).state.points, 21);
});

test("unavailable browser storage starts a usable session with an explicit warning", () => {
  const garden = create(null);
  assert.equal(garden.storageOK, false);
  assert.doesNotThrow(() => garden.addPoints(5));
});

test("legacy settings and highscore are left untouched", () => {
  const disk = storage();
  const old = JSON.stringify({ playerOneName: "Hoppel", endlessHighscore: { score: 300, carrots: 30 } });
  disk.entries.set("moehrchenmampf-settings", old);
  create(disk).addPoints(20);
  assert.equal(disk.entries.get("moehrchenmampf-settings"), old);
});

test("all point tiers and all special rewards have attainable requirements", () => {
  const garden = create(storage()); garden.addPoints(1500);
  for (let index = 0; index < 10; index++) for (const badge of ["complete", "discovered", "mastered"]) garden.awardBadge(index, badge);
  garden.awardEndless(60);
  assert.equal(garden.unlocked().length, rewards.length);
  assert.ok(rewards.every((reward) => isUnlocked(reward, garden.state)));
});
