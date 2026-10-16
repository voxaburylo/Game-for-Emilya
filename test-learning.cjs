const assert = require("node:assert/strict");
global.Core = require("./core.js");
global.TownState = require("./town-state.js");
const S = global.TownState,
  L = require("./learning.js");
let checks = 0;
function test(name, fn) {
  fn();
  console.log("PASS " + name);
  checks++;
}
const D = 20000; // a fixed day number

test("recognition promotes, mastery needs two different days, misses demote", () => {
  const s = S.fresh();
  L.record(s, "hear", "А", true, D);
  L.record(s, "hear", "А", true, D);
  assert.equal(L.box(s, "L:А"), 2);
  L.record(s, "hear", "А", true, D);
  assert.equal(L.box(s, "L:А"), 2, "same day cannot master");
  assert.equal(s.items["L:А"].due, D + 1);
  L.record(s, "hear", "А", true, D + 1);
  assert.equal(L.box(s, "L:А"), 3);
  assert.equal(L.status(s, "L:А"), "mastered");
  assert.equal(s.items["L:А"].due, D + 1 + L.INTERVAL[3]);
  L.record(s, "hear", "А", false, D + 3);
  assert.equal(L.box(s, "L:А"), 2);
  assert.equal(s.items["L:А"].due, D + 3);
  assert.equal(s.items["L:А"].miss, 1);
  assert(S.valid(s));
});

test("matching, pairs and copying never count as knowing", () => {
  const s = S.fresh();
  for (let i = 0; i < 5; i++) {
    L.record(s, "letters", "О", true, D + i);
    L.record(s, "blend", "МА", true, D + i);
    L.record(s, "pairs", "АОУ", true, D + i);
  }
  assert.equal(L.box(s, "L:О"), 1);
  assert.equal(L.box(s, "S:МА"), 1);
  assert.equal(L.box(s, "L:У"), 1);
  L.record(s, "letters", "К", false, D);
  assert.equal(L.box(s, "L:К"), 0, "a hinted first meeting stays new");
});

test("each guided session opens a new item while earlier letters stay in practice", () => {
  const s = S.fresh(),
    run = { index: 0, used: [] };
  let t = L.plan(s, run, D);
  assert.equal(t.key, "L:А");
  assert(t.isNew);
  assert.equal(t.mode, "letters");
  L.record(s, "letters", "А", true, D);
  L.record(s, "letters", "О", true, D);
  t = L.plan(s, { index: 1, used: [] }, D);
  assert.equal(t.key, "L:У");
  assert(t.isNew);
  t = L.plan(s, { index: 1, used: [], newDone: true }, D);
  assert(!t.isNew, "only one new item opens in a session");
  for (const l of ["А", "О", "У", "М"]) {
    L.record(s, "hear", l, true, D);
    L.record(s, "hear", l, true, D);
  }
  s.runs = 2;
  t = L.plan(s, { index: 1, used: [] }, D);
  assert.equal(t.key, "S:МА", "reading alternates with new letters");
  assert.equal(t.mode, "blend");
  assert.equal(L.progress(s).opened.length, 4);
});

test("planner: valid options, no repeats in a run, due reviews come back", () => {
  const s = S.fresh();
  for (const l of ["А", "О", "У", "М", "С"]) {
    L.record(s, "hear", l, true, D);
    L.record(s, "hear", l, true, D);
  }
  const run = { index: 0, used: [], newDone: false };
  for (let i = 0; i < 5; i++) {
    run.index = i;
    const t = L.plan(s, run, D + 1, () => 0.9);
    if (["blend", "words"].includes(t.mode))
      assert.equal(
        t.options.map((o) => o.text).sort().join(""),
        [...(t.mode === "words" ? t.word.parts : [...t.target])].sort().join(""),
      );
    if (["letters", "hear", "hear-syllable"].includes(t.mode)) {
      assert.equal(new Set(t.options).size, 3);
      assert(t.options.includes(t.target));
      assert(!t.options.includes("Ь"));
    }
    assert(!run.used.includes(t.key), "repeated " + t.key);
    run.used.push(t.key);
    if (t.isNew) run.newDone = true;
  }
  // A brand-new child starts with the first letter.
  assert.equal(L.plan(S.fresh(), { index: 0, used: [] }, D).key, "L:А");
  // A mastered letter is left alone until its review day, then it comes back.
  const m = S.fresh();
  for (const l of L.ORDER) m.items["L:" + l] = { box: 3, seen: 3, ok: 3, miss: 0, due: D + 9, lastUp: D };
  m.items["L:Ж"].due = D + 4;
  assert.notEqual(L.plan(m, { index: 0, used: [] }, D, () => 0.9).mode, "letters");
  const back = L.plan(m, { index: 0, used: [] }, D + 4, () => 0.9);
  assert.equal(back.key, "L:Ж");
  assert.equal(back.mode, "hear");
});

test("confusions and look-alikes become distractors", () => {
  const s = S.fresh();
  for (const l of L.ORDER.slice(0, 12)) L.record(s, "hear", l, true, D);
  for (let i = 0; i < 4; i++) L.confuse(s, "И", "Н");
  for (let i = 0; i < 50; i++) assert(L.letterOptions(s, "И").includes("Н"));
  s.items["L:И"].box = 2;
  delete s.conf["И|Н"];
  for (let i = 0; i < 50; i++) assert(L.letterOptions(s, "И").includes("І"));
  L.confuse(s, "А", "А");
  assert(!s.conf["А|А"]);
  assert(S.valid(s));
});

test("syllable families open with known letters; words with heard syllables", () => {
  const s = S.fresh();
  assert(L.familyOpen(s, 0));
  assert(!L.familyReady(s, 0));
  for (const l of ["М", "А", "О", "У"]) {
    L.record(s, "hear", l, true, D);
    L.record(s, "hear", l, true, D);
  }
  assert(L.familyReady(s, 0));
  assert(!L.familyOpen(s, 1));
  s.runs = 2;
  const t = L.plan(s, { index: 1, used: [] }, D);
  assert.equal(t.key, "S:МА");
  assert.equal(t.mode, "blend");
  assert.deepEqual(L.readyWords(s), []);
  L.record(s, "blend", "МА", true, D);
  assert.deepEqual(L.readyWords(s).map((w) => w.text), ["МАМА"]);
  assert.equal(L.plan(s, { index: 0, used: [] }, D).mode, "hear-syllable");
});

test("continued games prefer new letters and advance to another syllable family", () => {
  const s = S.fresh();
  s.allLevels = true;
  assert.equal(
    L.nextFamily(s, 0, ["S:МА", "S:МО", "S:МУ"]),
    0,
    "the current family stays selected while it has new cards",
  );
  assert.equal(
    L.nextFamily(s, 0, S.FAMILIES[0].map((part) => "S:" + part)),
    1,
    "an exhausted family advances",
  );
  const lettersState = S.fresh();
  for (const letter of ["А", "О", "У", "І", "И", "М"])
    L.record(lettersState, "letters", letter, true, D);
  const repeated = new Set(["L:А", "L:О", "L:У"]),
    pair = L.plan(
      lettersState,
      { index: 2, used: [...repeated], newDone: true },
      D,
      () => 0,
    );
  assert.equal(pair.mode, "pairs");
  assert.equal(pair.keys.length, 3);
  assert(pair.keys.every((key) => !repeated.has(key)));
});

test("large syllable library is voiced, varied and has no duplicate trains", () => {
  assert.equal(S.FAMILIES.flat().length, 30);
  assert.equal(S.SYLLABLE_TRAINS.length, 180);
  assert.equal(
    new Set(S.SYLLABLE_TRAINS.map((parts) => parts.join("-"))).size,
    180,
  );
  const voiced = new Set(S.FAMILIES.flat());
  assert(
    S.SYLLABLE_TRAINS.every(
      (parts) =>
        [2, 3].includes(parts.length) && parts.every((part) => voiced.has(part)),
    ),
  );
});

test("sound-in-syllable and train tasks measure recall instead of copying", () => {
  const s = S.fresh();
  for (const part of ["МА", "МО", "МУ"]) L.record(s, "blend", part, true, D);
  const sound = L.soundPartTask(s, () => 0);
  assert.equal(sound.audioTarget, "МА");
  assert.equal(sound.role, "first");
  assert.equal(sound.target, "М");
  assert(sound.options.includes("М"));
  L.record(s, sound.mode, sound.target, true, D);
  assert.equal(L.box(s, "L:М"), 1);

  const train = L.trainTask(s, [], () => 0);
  assert.equal(train.mode, "train");
  assert.equal(train.parts.length, 2);
  assert(train.parts.every((part) => ["МА", "МО", "МУ"].includes(part)));
  assert(train.options.every((card) => voicedSyllable(card.text)));
  L.record(s, "train", train.target, true, D);
  assert(train.parts.every((part) => L.box(s, "S:" + part) >= 2));
  assert.equal(L.progress(s).syllables.opened.length, 3);
});

function voicedSyllable(part) {
  return S.FAMILIES.flat().includes(part);
}

test("placement stops early and marks known letters for confirmation", () => {
  const s = S.fresh(),
    run = { place: { k: 0, misses: 0, streak: 0 } },
    answers = [true, true, true, false, true, false, false];
  let n = 0,
    t;
  while ((t = L.placementTask(s, run))) {
    assert(t.placement && t.options.includes(t.target));
    assert.equal(new Set(t.options).size, 3);
    L.placementResult(s, run, t.target, answers[n++], D);
  }
  assert.equal(n, 7, "two misses in a row end the check");
  assert.equal(L.box(s, "L:А"), 2);
  assert.equal(s.items["L:А"].due, D + 1);
  assert.equal(L.box(s, "L:М"), 0);
  assert.equal(L.status(s, "L:С"), "known");
  const all = { place: { k: 0, misses: 0, streak: 0 } };
  let count = 0;
  while ((t = L.placementTask(S.fresh(), all))) {
    L.placementResult(s, all, t.target, true, D);
    count++;
  }
  assert.equal(count, 15, "the check is capped");
  assert(S.valid(s));
});

test("v4 saves upgrade to v5 without losing progress", () => {
  const v4 = S.fresh();
  v4.version = 4;
  delete v4.items;
  delete v4.conf;
  delete v4.placed;
  v4.gems = 31;
  v4.letterScores = { А: 2, О: 1 };
  v4.syllableScores = { МА: 1 };
  const before = JSON.stringify(v4),
    s = S.migrate(v4);
  assert.equal(JSON.stringify(v4), before);
  assert(S.valid(s));
  assert.equal(s.gems, 31);
  assert.equal(L.box(s, "L:А"), 1);
  assert.equal(L.box(s, "S:МА"), 1);
  assert.equal(s.placed, false);
  for (const bad of [
    (x) => (x.items = { "L:A": { box: 1, seen: 0, ok: 0, miss: 0, due: 0, lastUp: 0 } }),
    (x) => (x.items = { "L:А": { box: 9, seen: 0, ok: 0, miss: 0, due: 0, lastUp: 0 } }),
    (x) => (x.conf = { "А|<b>": 1 }),
    (x) => (x.placed = "yes"),
  ]) {
    const x = S.fresh();
    bad(x);
    assert(!S.valid(x));
  }
});
console.log(checks + " learning checks passed");
