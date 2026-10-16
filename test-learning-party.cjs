const assert = require("node:assert/strict");
const fs = require("node:fs");
global.Core = require("./core.js");
const S = require("./town-state.js"),
  P = require("./learning-party.js");
P.resetModes();
assert.deepEqual(
  [P.chooseMode(() => 0), P.chooseMode(() => 0)],
  ["balloon", "fruit"],
);
P.resetModes();
assert.deepEqual(
  [P.chooseMode(() => 0.9), P.chooseMode(() => 0.9)],
  ["fruit", "balloon"],
);
// Reward accounting: touch duplication, invalid IDs, missed targets, partial exit.
const s = S.fresh(),
  initial = s.gems,
  run = { mode: "letters" };
s.items["L:А"] = { box: 1, seen: 1, ok: 1, miss: 0, due: 20000, lastUp: 20000 };
s.conf["А|О"] = 2;
s.placed = true;
const learning = JSON.stringify([s.items, s.conf, s.placed]);
assert(S.reward(s, run));
assert(!S.reward(s, run));
const game = P.create();
for (const id of [-1, 12, 1.2, NaN, undefined])
  assert.equal(P.credit(s, game, id), null);
for (let id = 0; id < 12; id++) {
  const before = s.gems,
    result = P.credit(s, game, id);
  assert(result);
  assert.equal(result.gems, id % 4 === 3 ? 1 : 0);
  assert.equal(s.gems - before, result.gems);
  assert.equal(P.credit(s, game, id), null, "duplicate gesture awarded twice");
}
assert.equal(s.gems, initial + 6);
assert.equal(game.credited, 3);
assert.equal(JSON.stringify([s.items, s.conf, s.placed]), learning);
assert.equal(s.version, 5);
assert(S.valid(s));
const partial = P.create();
for (let i = 0; i < 5; i++) P.credit(s, partial, i);
partial.closed = true;
assert.equal(P.credit(s, partial, 5), null);
assert.equal(partial.credited, 1);
assert.equal(s.gems, initial + 7);
const missed = P.create();
assert(P.credit(s, missed, 0));
assert(P.credit(s, missed, 4), "a missed target must not block later waves");
// Trajectories: balloons strictly rise, fruit has both upward and falling legs.
for (const width of [260, 360, 600, 760])
  for (const mode of ["fruit", "balloon"]) {
    let rising = false,
      falling = false,
      visible = false,
      old;
    for (let age = 0; age < P.DURATIONS[mode] - 0.1; age += 0.05) {
      const p = P.flight(mode, age, 0, width, 390, 100);
      assert(p.x >= 0 && p.x + 100 <= width);
      assert(Number.isFinite(p.y) && Number.isFinite(p.angle));
      if (old) {
        rising ||= p.y < old.y;
        falling ||= p.y > old.y;
      }
      visible ||= p.y > 0 && p.y < 290;
      old = p;
    }
    assert(rising && visible);
    assert.equal(falling, mode === "fruit");
    for (let slot = 0; slot < 4; slot++) {
      let appearances = 0,
        wasVisible = false;
      for (let age = 0; age < 40; age += 0.1) {
        const p = P.flight(mode, age, slot, width, 390, 100);
        const nowVisible = p.y > 0 && p.y < 290;
        if (nowVisible && !wasVisible) appearances++;
        wasVisible = nowVisible;
      }
      assert.equal(appearances, 1, "each target must cross the screen once");
    }
  }
assert(P.DURATIONS.balloon <= 2.8, "balloons cross the screen quickly");
// A quick swipe cannot skip a fruit just because pointer events were sparse.
const rect = { left: 100, top: 100, width: 100, height: 100 };
assert(P.intersects({ x: 20, y: 143 }, { x: 300, y: 143 }, rect));
assert(P.intersects({ x: 150, y: 143 }, { x: 150, y: 143 }, rect));
assert(!P.intersects({ x: 20, y: 20 }, { x: 300, y: 20 }, rect));
const { FILES } = require("./sw.js");
for (const file of ["learning-party.js", "learning-party.css"]) {
  assert(FILES.includes(file));
  assert(fs.readFileSync("index.html", "utf8").includes(file));
}
const appSource = fs.readFileSync("town-app.js", "utf8"),
  partyCSS = fs.readFileSync("learning-party.css", "utf8"),
  partySource = fs.readFileSync("learning-party.js", "utf8");
assert(
  appSource.includes("${lessonHTML()}<div id=\"learning-party\""),
  "the solved task stays visible behind the celebration",
);
assert(partyCSS.includes("#learning-party") && partyCSS.includes("background: transparent"));
assert(partySource.includes("party-confetti") && partySource.includes("Ти молодець!"));
assert.equal(P.fruitAssets.length, 10);
for (const name of P.fruitAssets) {
  const file = `models/party-fruit/${name}.png`;
  assert(FILES.includes(file), `${file} must work offline`);
  assert(fs.statSync(file).size > 1000, `${file} must be a rendered asset`);
}
assert(P.fruit(0).includes("models/party-fruit/apple.png"));
assert(FILES.includes("models/party-fruit/CREDITS.txt"));
console.log(
  "PASS party: alternating random rewards, bounded/idempotent scoring, missed targets, v5 learning preservation, single-pass trajectories, swipe collision and offline assets.",
);
