const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");

// Run the actual game and its event handlers with a deterministic clock and DOM.
function game() {
  class Element {
    constructor() {
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle: (name, force = !classes.has(name)) => force ? classes.add(name) : classes.delete(name)
      };
      this.style = { setProperty() {} };
      this.dataset = {};
      this.listeners = {};
      this.children = [];
    }
    addEventListener(name, handler) { (this.listeners[name] ||= []).push(handler); }
    setAttribute() {}
    appendChild(child) { this.children.push(child); }
    replaceChildren() { this.children = []; }
    focus() {}
    querySelector() { return new Element(); }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
    setPointerCapture() {}
    hasPointerCapture() { return true; }
    releasePointerCapture() {}
  }
  const elements = new Map();
  const find = (selector) => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  const buttons = ["levels", "endless", "multiplayer"].map((mode) => {
    const button = new Element();
    button.dataset.mode = mode;
    return button;
  });
  find("#modeButtons").querySelectorAll = () => buttons;
  find("#settingsDialog").classList.add("hidden");
  const joysticks = ["p1", "p2"].map((player) => {
    const joystick = new Element();
    joystick.dataset.player = player;
    return joystick;
  });
  const drawing = new Proxy({}, { get: (_, key) => key === "canvas" ? { width: 640, height: 640 } : () => {} });
  Object.assign(find("#gameCanvas"), { width: 640, height: 640, getContext: () => drawing });
  const document = Object.assign(new Element(), {
    body: new Element(), querySelector: find,
    querySelectorAll: (selector) => selector === ".joystick" ? joysticks : [],
    createElement: () => new Element()
  });
  let now = 0;
  let nextId = 1;
  const frames = new Map();
  const intervals = new Map();
  const timeouts = new Map();
  const motion = { matches: false };
  class Audio {
    pause() {}
    load() {}
    cloneNode() { return new Audio(); }
    play() { return Promise.resolve(); }
  }
  const sandbox = vm.createContext({
    document, Audio, HTMLElement: Element, HTMLInputElement: class {},
    HTMLTextAreaElement: class {}, HTMLSelectElement: class {},
    localStorage: { getItem: () => null, setItem() {} },
    window: { matchMedia: () => motion, addEventListener() {} },
    navigator: {}, performance: { now: () => now },
    requestAnimationFrame: (callback) => { const id = nextId++; frames.set(id, callback); return id; },
    cancelAnimationFrame: (id) => frames.delete(id),
    setInterval: (callback) => { const id = nextId++; intervals.set(id, callback); return id; },
    clearInterval: (id) => intervals.delete(id),
    setTimeout: (callback) => { const id = nextId++; timeouts.set(id, callback); return id; },
    clearTimeout: (id) => timeouts.delete(id)
  });
  const run = (source) => vm.runInContext(source, sandbox);
  vm.runInContext(readFileSync(resolve(__dirname, "../game.js"), "utf8"), sandbox);
  const begin = (mode = "levels") => {
    run(`chooseMode('${mode}')`);
    const countdown = [...intervals.values()][0];
    countdown(); countdown(); countdown();
    [...timeouts.values()][0]();
    timeouts.clear();
    run("carrot = { x: 1, y: 1 }");
  };
  return { run, begin, find, document, frames, motion, joysticks,
    step(time) {
      now = time;
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(time));
    },
    key(code, repeat = false) {
      document.listeners.keydown.forEach((handler) => handler({ code, repeat, target: document.body, preventDefault() {} }));
    }
  };
}

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
  for (const file of ["styles.css", "game.js"]) assert.ok(page.includes(`${file}?v=${version}`));
  const paths = worker.match(/const FILES_TO_CACHE = \[([\s\S]*?)\]/)[1];
  for (const [, path] of paths.matchAll(/"(.+?)"/g)) {
    assert.ok(existsSync(resolve(root, path.split("?")[0])), path);
  }
});
