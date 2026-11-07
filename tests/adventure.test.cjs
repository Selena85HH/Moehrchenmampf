const { test } = require("node:test");
const assert = require("node:assert/strict");
const game = require("./game-harness.cjs");

test("points earned in a lost round survive closing and reopening the game", () => {
  const g = game(); g.begin();
  g.run("carrot = { x: 10, y: 10 }"); g.step(160);
  g.run("players[0].body = [{ x: 19, y: 10 }]"); g.step(320);
  assert.equal(g.run("garden.state.points"), 1);
  assert.equal(game(g.saved).run("garden.state.points"), 1);
});

test("level rewards settle once, while a new successful replay still earns its base bonus", () => {
  const g = game(); g.begin();
  g.run("players[0].carrots = 10; evaluateLevelMode()");
  assert.equal(g.run("garden.state.points"), 40);
  g.run("evaluateLevelMode()");
  assert.equal(g.run("garden.state.points"), 40);
  assert.equal(game(g.saved).run("garden.state.selectedLevel"), 1);
  g.run("currentLevelIndex = 0; startMode(); players[0].carrots = 10; evaluateLevelMode()");
  assert.equal(g.run("garden.state.points"), 50);
});

test("gold badges persist on defeat and repeat pickups do not award the badge again", () => {
  const g = game(); g.begin();
  g.run("goldenCarrot = { x: 1, y: 1 }; collectGoldenCarrot()");
  assert.equal(g.run("garden.state.points"), 15);
  g.run("goldenCarrot = { x: 1, y: 1 }; collectGoldenCarrot(); goldenCarrot = { x: 2, y: 2 }; collectGoldenCarrot()");
  assert.equal(g.run("garden.state.points"), 45);
  assert.equal(game(g.saved).run("garden.state.levels[0].mastered"), true);
});

test("level gold stays indefinitely; endless gold expires on the game step clock", () => {
  const g = game(); g.begin();
  g.run("goldenCarrot = { x: 1, y: 1 }; roundSteps = 999; advanceGardenEvents()");
  assert.equal(g.run("Boolean(goldenCarrot)"), true);
  g.run("mode = 'endless'; goldenCarrot.expiresAt = 1000; roundSteps = 1000; advanceGardenEvents()");
  assert.equal(g.run("goldenCarrot"), null);
});

test("endless events begin at ten carrots, and only one milestone bonus is granted", () => {
  const g = game(); g.begin("endless");
  g.run("players[0].carrots = 10; collectGardenCarrot(players[0])");
  assert.equal(g.run("activeEndlessEvent.name"), "Goldrausch");
  assert.equal(g.run("goldenCarrot.expiresAt - roundSteps"), 60);
  g.run("players[0].carrots = 20; collectGardenCarrot(players[0])");
  assert.equal(g.run("garden.state.milestones.includes(20)"), true);
  assert.equal(g.run("garden.state.points"), 42);
});

test("pause stops bonus expiry and collecting continues after resume", () => {
  const g = game(); g.begin("endless");
  g.run("goldenCarrot = { x: 1, y: 1, expiresAt: 60, value: 8 }");
  g.key("Space"); g.step(100000);
  assert.equal(g.run("goldenCarrot.expiresAt - roundSteps"), 60);
});

test("multiplayer does not contribute garden points or change either player's appearance", () => {
  const g = game(); g.begin("multiplayer");
  g.run("carrot = { x: 5, y: 10 }"); g.step(135);
  assert.equal(g.run("garden.state.points"), 0);
  assert.equal(g.run("players[1].colors.head"), "#dff5ff");
});

test("gates announce closure, stay open under bodies and stay closed when approached later", () => {
  const g = game(); g.begin();
  g.run("currentLevelIndex = 6; roundSteps = 55; advanceGardenEvents(); updateAdventureStatus()");
  assert.match(g.find("#adventureStatus").textContent, /schließen/);
  g.run("players[0].body = [{ x: 10, y: 6 }]; roundSteps = 70; advanceGardenEvents()");
  assert.equal(g.run("closedGates.some(cell => cell.x === 10 && cell.y === 6)"), false);
  g.run("players[0].body = [{ x: 2, y: 2 }]; advanceGardenEvents()");
  assert.equal(g.run("closedGates.length"), 2);
  g.run("players[0].body = [{ x: 9, y: 6 }]; players[0].direction = { x: 1, y: 0 }; advanceGardenEvents()");
  assert.equal(g.run("closedGates.length"), 2);
});

test("a tunnel transports the head, and an occupied exit still causes a collision", () => {
  const g = game(); g.begin();
  g.run("currentLevelIndex = 7; players[0].body = [{ x: 2, y: 3 }, { x: 1, y: 3 }]");
  assert.equal(g.run("JSON.stringify(getNextHead(players[0]))"), '{"x":16,"y":16}');
  g.run("players[0].body = [{ x: 2, y: 3 }, { x: 16, y: 16 }, { x: 1, y: 3 }]");
  g.step(160);
  assert.equal(g.run("players[0].alive"), false);
});

test("map and collection open a modal, pause the game and ignore gameplay keys", () => {
  const g = game(); g.begin();
  g.run("openGarden('map')");
  assert.equal(g.find("#gardenDialog").open, true);
  assert.equal(g.run("paused"), true);
  assert.equal(g.find("#gardenDialogContent").children.length, 3);
  g.key("Space");
  assert.equal(g.run("paused"), true);
  g.run("gardenTab = 'collection'; renderGardenDialog()");
  assert.equal(g.find("#gardenDialogContent").children.length, 8);
});

test("all ten levels have valid geometry, clear spawn cells and reachable play areas", () => {
  const g = game();
  const layouts = JSON.parse(g.run("JSON.stringify(levels)"));
  assert.equal(layouts.length, 10);
  for (const level of layouts) {
    const obstacles = new Set(level.obstacles.map((cell) => `${cell.x},${cell.y}`));
    assert.equal(obstacles.size, level.obstacles.length);
    for (const cell of [...level.obstacles, ...(level.gates || []), ...(level.tunnels || [])]) {
      assert.ok(cell.x >= 0 && cell.y >= 0 && cell.x < 20 && cell.y < 20, level.name);
      assert.ok(!["7,10", "8,10", "9,10"].includes(`${cell.x},${cell.y}`), level.name);
    }
    const reached = new Set(["9,10"]), queue = [[9, 10]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y] = queue[i];
      for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        const key = `${nx},${ny}`;
        if (nx >= 0 && ny >= 0 && nx < 20 && ny < 20 && !obstacles.has(key) && !reached.has(key)) { reached.add(key); queue.push([nx,ny]); }
      }
    }
    assert.equal(reached.size, 400 - obstacles.size, level.name);
  }
});

test("carrot placement excludes all gates, tunnels, bodies and the golden carrot", () => {
  const g = game(); g.begin();
  g.run("currentLevelIndex = 7; goldenCarrot = { x: 1, y: 1 }");
  assert.equal(g.run(`Array.from({length: 100}, () => placeCarrot()).every(cell =>
    !levels[7].tunnels.some(tunnel => sameCell(tunnel, cell)) && !sameCell(cell, goldenCarrot) &&
    !players[0].body.some(part => sameCell(part, cell)) && !getObstacles().some(part => sameCell(part, cell)))`), true);
});
