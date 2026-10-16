// Learning model: what the child knows, when to repeat it and what to play next.
// Pure functions over the save state (see town-state.js items/conf/placed).
(function (root) {
  "use strict";
  const S = root.TownState,
    C = root.Core;
  // Leitner boxes. 0 new, 1 heard, 2 recognised once, 3+ recognised on
  // different days (mastered). Days until the next review per box:
  const INTERVAL = [0, 0, 1, 2, 4, 7],
    MASTERED = 3,
    KNOWN = 2,
    // Ь has no sound of its own; the album explains it instead of lessons.
    ORDER = C.LETTERS.filter((l) => l !== "Ь"),
    VOWELS = [..."АОУІИ"],
    RECALL = ["hear", "hear-syllable"],
    SIMILAR = [
      ["И", "І"], ["І", "Ї"], ["Е", "Є"], ["Ш", "Щ"], ["Б", "В"], ["П", "Н"],
      ["Г", "Ґ"], ["Г", "Т"], ["О", "С"], ["З", "Е"], ["Ц", "Щ"], ["М", "Н"],
      ["Ж", "Х"], ["Ю", "Я"], ["Р", "Ф"], ["Л", "П"], ["К", "Ж"], ["Ч", "У"],
    ],
    PLACEMENT_MAX = 15;

  function day(now = Date.now()) {
    return Math.floor(
      (now - new Date(now).getTimezoneOffset() * 60000) / 86400000,
    );
  }
  const keyOf = (mode, target) =>
    (mode === "words" ? "W:" : ["discover", "blend", "hear-syllable"].includes(mode) ? "S:" : "L:") +
    target;
  function item(s, key) {
    return (
      s.items[key] ||
      (s.items[key] = { box: 0, seen: 0, ok: 0, miss: 0, due: 0, lastUp: 0 })
    );
  }
  const box = (s, key) => (s.items[key] ? s.items[key].box : -1);
  const shuffle = C.shuffle;

  function promote(it, today) {
    // Mastery needs success on more than one day.
    if (it.box >= KNOWN && it.lastUp === today) {
      it.due = Math.max(it.due, today + 1);
      return;
    }
    it.box = Math.min(5, it.box + 1);
    it.lastUp = today;
    it.due = today + INTERVAL[it.box];
  }
  // One finished task. solo: no misses and no hint.
  function record(s, mode, target, solo, today = day()) {
    const keys =
      mode === "pairs"
        ? [...new Set([...target])].map((l) => "L:" + l)
        : [keyOf(mode, target)];
    for (const key of keys) {
      const it = item(s, key);
      it.seen++;
      it[solo ? "ok" : "miss"]++;
      if (RECALL.includes(mode)) {
        if (solo) promote(it, today);
        else {
          it.box = Math.max(0, it.box - 1);
          it.due = today;
        }
      } else if (solo && it.box < 1) {
        // Matching and copying only show that the item was met and heard.
        it.box = 1;
        it.lastUp = today;
        it.due = today;
      }
    }
  }
  function confuse(s, target, picked) {
    if (!target || !picked || target === picked) return;
    const k = target + "|" + picked;
    if (Object.keys(s.conf).length < 1000 || s.conf[k])
      s.conf[k] = (s.conf[k] || 0) + 1;
  }

  const introduced = (s, prefix) =>
    Object.keys(s.items)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(2));
  const learning = (s, prefix) =>
    introduced(s, prefix).filter((t) => box(s, prefix + t) < KNOWN);
  function activeLetters(s) {
    if (s.allLevels) return ORDER.slice();
    const known = ORDER.filter((l) => box(s, "L:" + l) >= 0);
    for (const l of ORDER) {
      if (known.length >= 3) break;
      if (!known.includes(l)) known.push(l);
    }
    return known;
  }
  // A syllable family opens once its consonant and three vowels are recognised.
  function familyReady(s, index) {
    if (s.allLevels) return true;
    const c = S.FAMILIES[index][0][0];
    return (
      box(s, "L:" + c) >= KNOWN &&
      VOWELS.filter((v) => box(s, "L:" + v) >= KNOWN).length >= 3
    );
  }
  // Free-play tabs: the first family is always open to explore.
  const familyOpen = (s, index) => index === 0 || familyReady(s, index);
  function newSyllables(s) {
    const out = [];
    S.FAMILIES.forEach((f, i) => {
      if (familyReady(s, i))
        for (const v of f)
          if (box(s, "S:" + v) < 0 && (s.allLevels || box(s, "L:" + v[1]) >= KNOWN))
            out.push(v);
    });
    return out;
  }
  function nextNew(s) {
    if (learning(s, "S:").length < 2) {
      const v = newSyllables(s)[0];
      if (v) return "S:" + v;
    }
    if (learning(s, "L:").length < 2) {
      const l = ORDER.find((l) => box(s, "L:" + l) < 0);
      if (l) return "L:" + l;
    }
    return null;
  }
  function readyWords(s) {
    return S.WORDS.filter(
      (w) => s.allLevels || w.parts.every((p) => box(s, "S:" + p) >= 1),
    );
  }

  // Answer options: the target plus confusions first, then look-alikes.
  function letterOptions(s, target, n = 3) {
    const pool = activeLetters(s).filter((l) => l !== target),
      confused = Object.entries(s.conf)
        .filter(([k]) => k.startsWith(target + "|"))
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k.split("|")[1])
        .filter((l) => pool.includes(l)),
      similar =
        box(s, "L:" + target) >= KNOWN
          ? SIMILAR.filter((p) => p.includes(target))
              .map((p) => p.find((x) => x !== target))
              .filter((l) => pool.includes(l))
          : [];
    const picks = [...new Set([...confused, ...shuffle(similar)])].slice(0, 1);
    for (const l of [...shuffle(pool), ...ORDER])
      if (picks.length < n - 1 && l !== target && !picks.includes(l)) picks.push(l);
    return shuffle([target, ...picks]);
  }
  function syllableOptions(s, target) {
    const family = S.FAMILIES.find((f) => f.includes(target)) || [],
      met = introduced(s, "S:").filter((v) => v !== target),
      picks = [];
    for (const v of [...shuffle(met.filter((v) => family.includes(v))), ...shuffle(met), ...shuffle(family)])
      if (picks.length < 2 && v !== target && !picks.includes(v)) picks.push(v);
    return shuffle([target, ...picks]);
  }

  function spec(s, key) {
    const t = key.slice(2),
      b = box(s, key);
    if (key[0] === "L") {
      const mode = b <= 0 ? "letters" : "hear";
      return { mode, target: t, options: letterOptions(s, t) };
    }
    if (key[0] === "S") {
      if (b <= 0)
        return { mode: "blend", target: t, options: shuffle([...t].map((text, id) => ({ text, id }))) };
      return { mode: "hear-syllable", target: t, options: syllableOptions(s, t) };
    }
    const w = S.WORDS.find((w) => w.text === t);
    return {
      mode: "words", target: t, word: w,
      options: shuffle(w.parts.map((text, id) => ({ text, id }))),
    };
  }
  // Next task in a guided ("Грати") session. run: { index, used: [], newDone, pairsDone, wordsDone }.
  function plan(s, run, today = day(), random = Math.random) {
    const used = new Set(run.used),
      met = Object.keys(s.items).filter((k) => k[0] !== "W" && k !== "L:Ь" && !used.has(k)),
      weak = met
        .filter((k) => s.items[k].box < KNOWN)
        .sort((a, b) => s.items[a].box - s.items[b].box || s.items[a].seen - s.items[b].seen),
      due = met
        .filter((k) => s.items[k].box >= KNOWN && s.items[k].due <= today)
        .sort((a, b) => s.items[a].due - s.items[b].due || s.items[a].box - s.items[b].box),
      fresh = run.newDone ? null : nextNew(s),
      letters = introduced(s, "L:").filter((l) => l !== "Ь"),
      words = readyWords(s).filter((w) => !used.has("W:" + w.text));
    let key = null;
    if (fresh && (run.index === 1 || (!weak.length && !due.length))) key = fresh;
    else if (run.index === 2 && !run.pairsDone && letters.length >= 3 && random() < 0.35) {
      const three = letters
        .sort((a, b) => box(s, "L:" + a) - box(s, "L:" + b))
        .slice(0, 3);
      return { mode: "pairs", target: three.join(""), options: shuffle([...three, ...three]) };
    } else if (run.index === 3 && !run.wordsDone && words.length && random() < 0.5)
      key = "W:" + shuffle(words)[0].text;
    else if (due.length && (run.index % 2 === 0 || !weak.length)) key = due[0];
    else if (weak.length) key = weak[0];
    else if (fresh) key = fresh;
    else {
      // Everything is mastered and nothing is due: practise the oldest review.
      const all = Object.keys(s.items)
        .filter((k) => k[0] === "L" && k !== "L:Ь")
        .sort((a, b) => s.items[a].due - s.items[b].due);
      key = all.find((k) => !used.has(k)) || all[0] || "L:" + ORDER[0];
    }
    return { ...spec(s, key), key, isNew: key === fresh };
  }

  // The first "Грати" asks for letters by sound, in teaching order, and stops
  // early once the child stops knowing them — nobody sits through the alphabet.
  function placementTask(s, run) {
    const p = run.place;
    if (p.misses >= 3 || p.streak >= 2 || p.k >= PLACEMENT_MAX || p.k >= ORDER.length) return null;
    const target = ORDER[p.k],
      pool = ORDER.slice(0, Math.max(p.k + 3, 6)).filter((l) => l !== target);
    return {
      mode: "hear",
      target,
      placement: true,
      options: shuffle([target, ...shuffle(pool).slice(0, 2)]),
    };
  }
  function placementResult(s, run, target, correct, today = day()) {
    const p = run.place,
      it = item(s, "L:" + target);
    it.seen++;
    p.k++;
    if (correct) {
      it.ok++;
      it.box = Math.max(it.box, KNOWN);
      it.lastUp = today;
      it.due = today + 1;
      p.streak = 0;
    } else {
      it.miss++;
      it.box = 0;
      it.due = today;
      p.misses++;
      p.streak++;
    }
  }

  // For the parents' view and the album.
  function status(s, key) {
    const b = box(s, key);
    return b < 0 ? "new" : b < KNOWN ? "learning" : b < MASTERED ? "known" : "mastered";
  }

  const api = {
    INTERVAL, MASTERED, KNOWN, ORDER,
    day, keyOf, record, confuse, box, status,
    activeLetters, familyReady, familyOpen, readyWords,
    letterOptions, syllableOptions, plan, placementTask, placementResult,
  };
  if (typeof module !== "undefined") module.exports = api;
  root.Learning = api;
})(typeof window !== "undefined" ? window : globalThis);
