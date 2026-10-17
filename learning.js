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
    // Ь is learned visually; it has no separate sound recording.
    ORDER = C.LETTERS.slice(),
    VOWELS = [..."АОУІИЕЄЇЮЯ"],
    RECALL = ["hear", "hear-syllable", "sound-part", "train"],
    SIMILAR = [
      ["И", "І"], ["І", "Ї"], ["Е", "Є"], ["Ш", "Щ"], ["Б", "В"], ["П", "Н"],
      ["Г", "Ґ"], ["Г", "Т"], ["О", "С"], ["З", "Е"], ["Ц", "Щ"], ["М", "Н"],
      ["Ж", "Х"], ["Ю", "Я"], ["Р", "Ф"], ["Л", "П"], ["К", "Ж"], ["Ч", "У"],
    ],
    PLACEMENT_MAX = 15,
    HISTORY_LIMIT = 120;

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

  // Keep enough recent material to continue between sessions without making
  // old exercises disappear forever. This lives inside the existing v5
  // `seen` field, so the save schema and its learning fields stay unchanged.
  function lessonHistory(s, mode, carry = []) {
    const saved = s.seen?.lessonHistory?.[mode],
      keys = [
        ...(Array.isArray(saved) ? saved : []),
        ...(Array.isArray(carry) ? carry : []),
      ].filter(
        (key) =>
          typeof key === "string" &&
          /^(?:[LS]:[А-ЯҐЄІЇЬ]{1,8}|W:[А-ЯҐЄІЇЬ’']{1,16}|T:[А-ЯҐЄІЇЬ-]{3,32})$/.test(
            key,
          ),
      );
    const newest = [];
    for (const key of keys) {
      const old = newest.indexOf(key);
      if (old >= 0) newest.splice(old, 1);
      newest.push(key);
    }
    return newest.slice(-HISTORY_LIMIT);
  }
  function rememberLesson(s, mode, used) {
    if (!s.seen.lessonHistory || typeof s.seen.lessonHistory !== "object")
      s.seen.lessonHistory = {};
    const history = lessonHistory(s, mode, used);
    s.seen.lessonHistory[mode] = history;
    return history;
  }
  function freshPool(pool, used, prefix, value = (entry) => entry) {
    const untouched = pool.filter(
      (entry) => !used.includes(prefix + value(entry)),
    );
    if (untouched.length) return untouched;
    // Once a small pool is completed, cool down its most recent third. The
    // child gets a new order instead of immediately seeing the same trio.
    const recent = new Set(
        used.slice(-Math.max(1, Math.ceil(pool.length / 3))),
      ),
      cooled = pool.filter(
        (entry) => !recent.has(prefix + value(entry)),
      );
    return cooled.length ? cooled : pool;
  }

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
        : mode === "train"
          ? [...new Set(target.split("-"))].map((part) => "S:" + part)
        : [keyOf(mode, target)];
    for (const key of keys) {
      const it = item(s, key);
      it.seen++;
      it[solo ? "ok" : "miss"]++;
      if (RECALL.includes(mode) || (mode === "letters" && target === "Ь")) {
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
  // Keep a continued game moving forward. Prefer the selected family while it
  // still has unseen syllables, then walk through every other unlocked family.
  function nextFamily(s, index, used = []) {
    const recent = new Set(used),
      count = S.FAMILIES.length;
    for (let step = 0; step < count; step++) {
      const candidate = (index + step) % count;
      if (
        familyOpen(s, candidate) &&
        S.FAMILIES[candidate].some((part) => !recent.has("S:" + part))
      )
        return candidate;
    }
    return index;
  }
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
    const letter = ORDER.find((l) => box(s, "L:" + l) < 0),
      syllable = newSyllables(s)[0],
      openedLetters = introduced(s, "L:").length;
    // Every guided session opens something new. Once a child has enough
    // letters to build a syllable, every third session alternates to reading.
    if (syllable && openedLetters >= 4 && s.runs % 3 === 2)
      return "S:" + syllable;
    if (letter) return "L:" + letter;
    return syllable ? "S:" + syllable : null;
  }
  function readyWords(s) {
    return S.WORDS.filter((w) =>
      s.allLevels ||
      [...w.text]
        .filter((letter) => /[А-ЯҐЄІЇЬ]/.test(letter))
        .every((letter) => box(s, "L:" + letter) >= 1),
    );
  }
  function wordOptions(s, word) {
    const knownLetters = new Set(activeLetters(s)),
      pool = [
        ...readyWords(s).flatMap((entry) => entry.parts),
        ...S.FAMILIES.flat().filter((part) =>
          [...part].every((letter) => knownLetters.has(letter)),
        ),
      ].filter((part) => !word.parts.includes(part)),
      distractors = [...new Set(shuffle(pool))].slice(
        0,
        word.parts.length === 1 ? 2 : 1,
      );
    return shuffle(
      [...word.parts, ...distractors].map((text, id) => ({ text, id })),
    );
  }
  const readySyllables = (s) =>
    (s.allLevels ? S.FAMILIES.flat() : introduced(s, "S:")).filter(
      (part) => s.allLevels || box(s, "S:" + part) >= 1,
    );
  function readyTrains(s) {
    const ready = new Set(readySyllables(s));
    return S.SYLLABLE_TRAINS.filter((parts) =>
      parts.every((part) => ready.has(part)),
    );
  }

  // Answer options: the target plus confusions first, then look-alikes.
  function letterOptions(s, target, n = 3) {
    const pool = activeLetters(s).filter(
        (l) => l !== target && (target === "Ь" || l !== "Ь"),
      ),
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

  // Hear a whole syllable and identify its first consonant or final vowel.
  // This checks whether the child connects a letter with sound, not just shape.
  function soundPartTask(s, random = Math.random, used = []) {
    const pool = readySyllables(s),
      candidates = pool
        .flatMap((syllable) => [
          { syllable, role: "first" },
          { syllable, role: "last" },
        ])
        .filter(
          ({ syllable, role }) =>
            !used.includes("L:" + syllable[role === "first" ? 0 : 1]),
        ),
      picked =
        candidates[Math.floor(random() * candidates.length)] || {
          syllable: pool[0] || S.FAMILIES[0][0],
          role: "first",
        },
      { syllable, role } = picked,
      target = syllable[role === "first" ? 0 : 1];
    return {
      mode: "sound-part",
      target,
      answer: target,
      audioTarget: syllable,
      role,
      key: "L:" + target,
      options: letterOptions(s, target),
    };
  }
  function trainTask(s, used = [], random = Math.random) {
    const available = readyTrains(s),
      unseen = available.filter(
        (parts) => !used.includes("T:" + parts.join("-")),
      ),
      choices = unseen.length ? unseen : available,
      parts =
        choices[Math.floor(random() * choices.length)] ||
        S.SYLLABLE_TRAINS[0],
      pool = readySyllables(s),
      distractor = shuffle(pool.filter((part) => !parts.includes(part)))[0],
      cards = [...parts, ...(distractor ? [distractor] : [])];
    return {
      mode: "train",
      target: parts.join("-"),
      parts: parts.slice(),
      key: "T:" + parts.join("-"),
      options: shuffle(cards.map((text, id) => ({ text, id }))),
    };
  }

  function spec(s, key) {
    const t = key.slice(2),
      b = box(s, key);
    if (key[0] === "L") {
      const mode = b <= 0 || t === "Ь" ? "letters" : "hear";
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
      options: wordOptions(s, w),
    };
  }
  // Next task in a guided ("Грати") session. run: { index, used: [], newDone, pairsDone, wordsDone }.
  function plan(s, run, today = day(), random = Math.random) {
    const used = new Set(run.used),
      met = Object.keys(s.items).filter((k) => k[0] !== "W" && !used.has(k)),
      weak = met
        .filter((k) => s.items[k].box < KNOWN)
        .sort((a, b) => s.items[a].box - s.items[b].box || s.items[a].seen - s.items[b].seen),
      due = met
        .filter((k) => s.items[k].box >= KNOWN && s.items[k].due <= today)
        .sort((a, b) => s.items[a].due - s.items[b].due || s.items[a].box - s.items[b].box),
      fresh = run.newDone ? null : nextNew(s),
      letters = introduced(s, "L:").filter((l) => l !== "Ь"),
      words = readyWords(s).filter((w) => !used.has("W:" + w.text)),
      soundPart = readySyllables(s).length
        ? soundPartTask(s, random, run.used)
        : null,
      train = readyTrains(s).length ? trainTask(s, run.used, random) : null;
    let key = null;
    if (due.length && run.index === 0) key = due[0];
    else if (fresh && (run.index === 1 || (!weak.length && !due.length)))
      key = fresh;
    else if (run.index === 2 && soundPart && !run.soundDone)
      return soundPart;
    else if (run.index === 2 && !run.pairsDone && letters.length >= 3) {
      const byNeed = (a, b) =>
          box(s, "L:" + a) - box(s, "L:" + b) ||
          (s.items["L:" + a]?.seen || 0) - (s.items["L:" + b]?.seen || 0),
        freshLetters = letters
          .filter((letter) => !used.has("L:" + letter))
          .sort(byNeed),
        three = [
          ...freshLetters,
          ...letters.filter((letter) => used.has("L:" + letter)).sort(byNeed),
        ].slice(0, 3);
      return {
        mode: "pairs",
        target: three.join(""),
        keys: three.map((letter) => "L:" + letter),
        options: shuffle([...three, ...three]),
      };
    } else if (
      run.index === 3 &&
      train &&
      !run.trainDone &&
      (s.runs % 2 === 1 || !words.length)
    )
      return train;
    else if (run.index === 3 && !run.wordsDone && words.length)
      key = "W:" + shuffle(words)[0].text;
    else if (run.index === 3 && train && !run.trainDone) return train;
    else if (due.length && (run.index % 2 === 0 || !weak.length)) key = due[0];
    else if (weak.length) key = weak[0];
    else if (fresh) key = fresh;
    else {
      // Everything is mastered and nothing is due: practise the oldest review.
      const all = Object.keys(s.items)
        .filter((k) => k[0] === "L")
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
  function progress(s) {
    const opened = introduced(s, "L:").filter((l) => ORDER.includes(l)),
      known = opened.filter((l) => box(s, "L:" + l) >= KNOWN),
      mastered = opened.filter((l) => box(s, "L:" + l) >= MASTERED),
      syllables = introduced(s, "S:").filter((part) =>
        S.FAMILIES.flat().includes(part),
      );
    return {
      opened,
      known,
      mastered,
      total: ORDER.length,
      next: ORDER.find((l) => !opened.includes(l)) || "",
      syllables: {
        opened: syllables,
        known: syllables.filter((part) => box(s, "S:" + part) >= KNOWN),
        mastered: syllables.filter(
          (part) => box(s, "S:" + part) >= MASTERED,
        ),
        total: S.FAMILIES.flat().length,
      },
      trains: S.SYLLABLE_TRAINS.length,
    };
  }

  const api = {
    INTERVAL, MASTERED, KNOWN, ORDER,
    day, keyOf, record, confuse, box, status,
    activeLetters, familyReady, familyOpen, nextFamily, readyWords, wordOptions, readySyllables,
    readyTrains, progress, letterOptions, syllableOptions, soundPartTask,
    trainTask, plan, placementTask, placementResult,
    lessonHistory, rememberLesson, freshPool,
  };
  if (typeof module !== "undefined") module.exports = api;
  root.Learning = api;
})(typeof window !== "undefined" ? window : globalThis);
