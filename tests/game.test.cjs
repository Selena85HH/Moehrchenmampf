const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const game = require("./game-harness.cjs");

test("two quick corners are preserved and executed on consecutive cells", () => {
  const g = game(); g.begin();
  g.key("ArrowUp"); g.key("ArrowLeft");
  g.step(160);
  assert.equal(g.run("JSON.stringify(players[0].body[0])"), '{"x":9,"y":9}');
  g.step(320);
  assert.equal(g.run("JSON.stringify(players[0].body[0])"), '{"x":8,"y":9}');
});

test("reversals and duplicate directions cannot overwrite a valid turn", () => {
  const g = game(); g.begin();
  g.key("ArrowLeft");
  assert.equal(g.run("players[0].directionQueue.length"), 0);
  g.key("ArrowUp"); g.key("ArrowUp"); g.key("ArrowDown");
  g.step(160);
  assert.equal(g.run("players[0].body[0].y"), 9);
  assert.equal(g.run("players[0].directionQueue.length"), 0);
});

test("key repeats do not add turns or repeatedly toggle pause", () => {
  const g = game(); g.begin();
  g.key("ArrowUp", true);
  assert.equal(g.run("players[0].directionQueue.length"), 0);
  g.key("Space"); g.key("Space", true);
  assert.equal(g.run("paused"), true);
});

test("buffer stays bounded when more than two turns arrive before a step", () => {
  const g = game(); g.begin();
  ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].forEach((key) => g.key(key));
  assert.equal(g.run("players[0].directionQueue.length"), 2);
});

test("pause clears queued turns, freezes movement and ignores new input", () => {
  const g = game(); g.begin();
  g.key("ArrowUp"); g.key("Space"); g.key("ArrowDown");
  g.step(5000);
  assert.equal(g.run("players[0].body[0].x"), 9);
  assert.equal(g.run("players[0].directionQueue.length"), 0);
  assert.equal(g.run("gameFrame"), null);
});

test("resuming starts a fresh clock without catching up paused time", () => {
  const g = game(); g.begin(); g.key("Space"); g.step(5000);
  g.run("paused = false; startGameLoop()");
  g.step(5080);
  assert.equal(g.run("players[0].body[0].x"), 9);
  g.step(5160);
  assert.equal(g.run("players[0].body[0].x"), 10);
});

test("a stalled frame performs only one step", () => {
  const g = game(); g.begin(); g.step(2000);
  assert.equal(g.run("players[0].body[0].x"), 10);
});

test("animation draws positions between cells while preserving level speed", () => {
  const g = game(); g.begin();
  g.run("var renderedHead; drawBunnyPart = (cell, index) => { if (!index) renderedHead = cell; }");
  g.step(160); g.step(240);
  assert.equal(g.run("renderedHead.x"), 9.5);
  assert.equal(g.run("players[0].body[0].x"), 10);
  assert.equal(g.run("currentSpeed"), 160);
});

test("reduced motion renders exact grid positions", () => {
  const g = game(); g.begin(); g.motion.matches = true;
  g.run("var renderedHead; drawBunnyPart = (cell, index) => { if (!index) renderedHead = cell; }");
  g.step(160); g.step(240);
  assert.equal(g.run("renderedHead.x"), 10);
});

test("WASD and arrows control independent players", () => {
  const g = game(); g.begin("multiplayer");
  g.key("KeyW"); g.key("ArrowDown"); g.step(135);
  assert.equal(g.run("players[0].body[0].y"), 9);
  assert.equal(g.run("players[1].body[0].y"), 10);
});

test("held controller directions do not refill either player's buffer", () => {
  const g = game(); g.begin("multiplayer");
  g.run(`var pad = { axes: [0, -1], buttons: [] };
    handleGamepad(pad, 'p1'); handleGamepad(pad, 'p2');`);
  g.step(135);
  g.run("handleGamepad(pad, 'p1'); handleGamepad(pad, 'p2')");
  assert.equal(g.run("players[0].directionQueue.length + players[1].directionQueue.length"), 0);
});

test("touch accepts a small movement and recovers after pointer cancellation", () => {
  const g = game(); g.begin();
  const joystick = g.joysticks[0];
  joystick.listeners.pointerdown[0]({ pointerId: 1, clientX: 50, clientY: 40, preventDefault() {} });
  assert.equal(g.run("players[0].directionQueue[0].y"), -1);
  joystick.listeners.pointercancel[0]({ pointerId: 1 });
  assert.equal(joystick.classList.contains("active"), false);
});

test("wall collision still ends the round and stops its animation", () => {
  const g = game(); g.begin();
  g.run("players[0].body = [{ x: 19, y: 10 }, { x: 18, y: 10 }]");
  g.step(160);
  assert.equal(g.run("running"), false);
  assert.equal(g.run("gameFrame"), null);
  assert.equal(g.find("#messageTitle").textContent, "Verheddert!");
});

test("finishing a level stops animation and the next level starts cleanly", () => {
  const g = game(); g.begin();
  g.run("players[0].carrots = 9; carrot = { x: 10, y: 10 }");
  g.step(160);
  assert.equal(g.run("currentLevelIndex"), 1);
  assert.equal(g.run("running"), false);
  g.run("startMode()");
  assert.equal(g.run("previousBodies.size"), 0);
  assert.equal(g.run("players[0].directionQueue.length"), 0);
  assert.equal(g.run("currentSpeed"), 145);
});

test("PWA cache assets exist and use the same version as the page", () => {
  const root = resolve(__dirname, "..");
  const worker = readFileSync(resolve(root, "service-worker.js"), "utf8");
  const page = readFileSync(resolve(root, "index.html"), "utf8");
  const version = worker.match(/moehrchenmampf-v(\d+)/)[1];
  for (const file of ["styles.css", "progression.js", "adventure.js", "garden-ui.js", "game.js"]) assert.ok(page.includes(`${file}?v=${version}`));
  const paths = worker.match(/const FILES_TO_CACHE = \[([\s\S]*?)\]/)[1];
  for (const [, path] of paths.matchAll(/"(.+?)"/g)) {
    assert.ok(existsSync(resolve(root, path.split("?")[0])), path);
  }
});
