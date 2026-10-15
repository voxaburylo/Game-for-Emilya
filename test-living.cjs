const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
global.Core = require("./core.js");
const S = require("./town-state.js"),
  speech = require("./speech-manifest.js");
let checks = 0;
function test(name, fn) {
  fn();
  console.log("PASS " + name);
  checks++;
}
test("fresh save, corruption and identifier validation", () => {
  const s = S.fresh();
  assert(S.valid(s));
  for (const change of [
    (s) => (s.look.hair = 9),
    (s) => (s.gems = -1),
    (s) => (s.pet = "lion"),
    (s) => (s.lands = ["east", "east"]),
    (s) => (s.roads = { "100,0": "sand" }),
    (s) =>
      (s.objects = [
        { id: "b1", kind: "house", x: 0, z: 0, rotation: 0, paid: 10 },
      ]),
  ]) {
    const x = S.fresh();
    change(x);
    assert(!S.valid(x));
  }
});
test("legacy saves migrate without mutating or losing currency and objects", () => {
  const old = Core.fresh();
  old.gems = 27;
  old.buildings = ["flowers", "bench", null, "house", null, null];
  old.letterScores.А = 4;
  const text = JSON.stringify(old),
    s = S.migrate(old);
  assert(S.valid(s));
  assert.equal(JSON.stringify(old), text);
  assert.equal(s.gems, 27);
  assert.equal(s.letterScores.А, 4);
  assert.equal(s.objects.length, 3);
  assert.equal(s.objects[0].paid, 3);
});
test("atomic building, blocked placement, movement and refund", () => {
  const s = S.fresh(),
    o = S.place(s, "house", 4, 0);
  assert(o);
  assert.equal(s.gems, 2);
  const before = JSON.stringify(s);
  assert.equal(S.place(s, "house", 4, 0), false);
  assert.equal(JSON.stringify(s), before);
  assert(S.place(s, "house", 6, 0, 1, o.id));
  assert.equal(s.gems, 2);
  assert(S.remove(s, o.id));
  assert.equal(s.gems, 12);
  assert.equal(S.remove(s, o.id), false);
  assert(S.valid(s));
});
test("all rotated houses reserve real footprint and entrance", () => {
  for (let r = 0; r < 4; r++) {
    const s = S.fresh();
    s.gems = 100;
    const o = S.place(s, "house", 4, 0, r);
    assert(o);
    const p = S.entrance(o);
    assert(S.placement(s, { kind: "flowers", x: p.x, z: p.z, rotation: 0 }));
    assert.equal(
      S.placement(s, { kind: "flowers", x: 4, z: 0, rotation: 0 }),
      "Потрібно трохи більше місця",
    );
  }
});
test("four land expansions, continuous seams and finite boundaries", () => {
  const s = S.fresh();
  s.gems = 100;
  for (const l of S.LANDS) {
    assert(S.expand(s, l.id));
    const balance = s.gems;
    assert(!S.expand(s, l.id));
    assert.equal(s.gems, balance);
    assert(S.inside(s, l.x, l.z, 0.8));
  }
  for (const [x, z] of [
    [18, 0],
    [-18, 0],
    [0, 16],
    [0, -16],
  ])
    assert(S.inside(s, x, z, 0.8));
  assert(!S.inside(s, 29, 0));
  assert(!S.inside(s, 25, 22));
  assert(S.valid(s));
});
test("roads atomic, connected, persistent, erasable; water/house/locked blocked", () => {
  const s = S.fresh(),
    line = S.roadLine({ x: 0, z: 0 }, { x: 3, z: 2 });
  assert.equal(line.length, 6);
  assert(S.road(s, line, "wood"));
  const before = JSON.stringify(s.roads);
  assert(
    !S.road(
      s,
      [
        { x: 0, z: 0 },
        { x: 20, z: 0 },
      ],
      "stone",
    ),
  );
  assert.equal(JSON.stringify(s.roads), before);
  assert(!S.roadOK(s, 0, -5));
  assert(!S.roadOK(s, 6, 5));
  assert(S.road(s, line, "erase"));
  for (const p of line) assert(!s.roads[p.x + "," + p.z]);
  assert.deepEqual(S.roadLine({ x: NaN, z: 0 }, { x: 0, z: 0 }), []);
  assert(S.valid(s));
});
test("learning separates modes, hints, discovery and single reward", () => {
  const s = S.fresh();
  S.skill(s, "discover", "МА", true);
  assert(!s.syllableScores.МА);
  S.skill(s, "hear-syllable", "МА", true);
  assert(!s.syllableScores.МА);
  for (const p of ["МА", "МО", "МУ"]) S.skill(s, "blend", p, false);
  assert(S.familyOpen(s, 1));
  assert.equal(s.skills["blend:МА"].solo, 1);
  assert.equal(s.skills["hear-syllable:МА"].hinted, 1);
  const run = { mode: "blend" };
  assert(S.reward(s, run));
  assert(!S.reward(s, run));
  assert.equal(s.gems, 15);
  assert.equal(s.runs, 1);
  assert(S.valid(s));
});
test("per-house furniture and lamp survive serialization", () => {
  const s = S.fresh();
  S.room(s, "home").lamp = false;
  S.room(s, "home").furniture.table = { x: 2, z: 1 };
  S.room(s, "studio").lamp = true;
  const restored = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(S.room(restored, "home").lamp, false);
  assert.equal(S.room(restored, "studio").lamp, true);
  assert.deepEqual(S.room(restored, "home").furniture.table, { x: 2, z: 1 });
});
test("every letter, 30 syllables and nine words has bundled human audio", () => {
  assert.equal(S.FAMILIES.flat().length, 30);
  assert.equal(S.WORDS.length, 9);
  for (const l of Core.LETTERS.filter((l) => l !== "Ь"))
    assert(
      fs.statSync(
        path.join(__dirname, "audio", l.codePointAt(0).toString(16) + ".mp3"),
      ).size > 100,
    );
  for (const [kind, targets] of [
    ["syllables", S.FAMILIES.flat()],
    ["words", S.WORDS.map((w) => w.text)],
  ])
    for (const target of targets) {
      const entry = speech[kind][target];
      assert(entry?.ready, target);
      assert(fs.statSync(path.join(__dirname, entry.file)).size > 100, target);
    }
});
test("offline shell contains every runtime and speech asset, no minimap or speech synthesis", () => {
  const assets = require("./sw.js").FILES;
  for (const f of assets)
    assert(
      fs.existsSync(path.join(__dirname, f === "./" ? "index.html" : f)),
      f,
    );
  for (const f of ["town-app.js", "town-world.js", "index.html"]) {
    const text = fs.readFileSync(path.join(__dirname, f), "utf8");
    assert(!/speechSynthesis|SpeechSynthesisUtterance|minimap/i.test(text));
  }
  for (const e of [
    ...Object.values(speech.words),
    ...Object.values(speech.syllables),
  ])
    assert(assets.includes(e.file));
});
console.log(checks + " living-island checks passed");
