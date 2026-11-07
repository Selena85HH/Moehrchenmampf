const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");

// Run the actual game and its event handlers with a deterministic clock and DOM.
function game(saved = new Map()) {
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
    showModal() { this.open = true; }
    close() { this.open = false; }
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
    localStorage: { getItem: (key) => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) },
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
  for (const file of ["progression.js", "adventure.js", "garden-ui.js", "game.js"]) {
    vm.runInContext(readFileSync(resolve(__dirname, "..", file), "utf8"), sandbox);
  }
  const begin = (mode = "levels") => {
    run(`chooseMode('${mode}')`);
    const countdown = [...intervals.values()][0];
    countdown(); countdown(); countdown();
    timeouts.get(run("countdownFinishTimer"))();
    timeouts.clear();
    run("carrot = { x: 1, y: 1 }");
  };
  return { run, begin, find, document, frames, motion, joysticks, saved,
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

module.exports = game;
