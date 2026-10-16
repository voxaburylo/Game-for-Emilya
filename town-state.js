(function (root) {
  "use strict";
  const Park =
    root.ParkCatalog ||
    (typeof require !== "undefined" ? require("./park-catalog.js") : null);
  const Paths =
    root.GardenPaths ||
    (typeof require !== "undefined" ? require("./garden-paths.js") : null);
  const Content =
    root.LearningContent ||
    (typeof require !== "undefined" ? require("./learning-content.js") : null);
  const ITEMS = [
    {
      id: "flowers",
      name: "Квітник",
      cost: 2,
      w: 1,
      h: 1,
      thumb: "models/park/thumbs/rose-bed.png",
    },
    {
      id: "bench",
      name: "Лавочка",
      cost: 3,
      w: 1,
      h: 1,
      thumb: "models/park/thumbs/park-bench.png",
    },
    {
      id: "tree",
      name: "Яблунька",
      cost: 4,
      w: 1,
      h: 1,
      thumb: "models/thumbs/build-tree.png",
    },
    {
      id: "swing",
      name: "Гойдалка",
      cost: 6,
      w: 2,
      h: 1,
      thumb: "models/park/thumbs/play-swing-b-small.png",
    },
    // Kept for old v5 saves, but hidden from the shop because the Park tab
    // already offers three better fountains with real model previews.
    { id: "fountain", name: "Фонтан", cost: 8, w: 2, h: 2, hidden: true },
    {
      id: "house",
      name: "Будиночок",
      cost: 10,
      w: 2,
      h: 2,
      thumb: "models/park/thumbs/home-house.png",
    },
    {
      id: "house-two-story",
      name: "Двоповерховий дім",
      cost: 20,
      w: 3,
      h: 3,
      thumb: "models/thumbs/house-two-story.svg",
      category: "home",
    },
    {
      id: "house-tower",
      name: "Дім із вежею",
      cost: 24,
      w: 3,
      h: 3,
      thumb: "models/thumbs/house-tower.svg",
      category: "home",
    },
    ...Park.items,
  ];
  const LANDS = [
    { id: "east", name: "Сонячний берег", x: 23, z: 0, w: 10, h: 32, cost: 6 },
    {
      id: "south",
      name: "Квіткова долина",
      x: 0,
      z: 21,
      w: 36,
      h: 10,
      cost: 9,
    },
    { id: "west", name: "Яблуневий сад", x: -23, z: 0, w: 10, h: 32, cost: 12 },
    {
      id: "north",
      name: "Тиха галявина",
      x: 0,
      z: -21,
      w: 36,
      h: 10,
      cost: 15,
    },
  ];
  LANDS.push(...Park.lands);
  LANDS.push(...Park.districts(LANDS));
  const BOUNDS = Park.bounds,
    MAX_OBJECTS = 900;
  const landCache = new WeakMap();
  function ownedLand(s) {
    let cached = landCache.get(s);
    if (cached && cached.ref === s.lands && cached.count === s.lands.length)
      return cached;
    const owned = new Set(s.lands),
      plots = LANDS.filter((l) => owned.has(l.id)),
      cells = new Map();
    for (const l of plots)
      for (
        let x = Math.floor((l.x - l.w / 2) / 8);
        x <= Math.floor((l.x + l.w / 2) / 8);
        x++
      )
        for (
          let z = Math.floor((l.z - l.h / 2) / 8);
          z <= Math.floor((l.z + l.h / 2) / 8);
          z++
        ) {
          const key = x + "," + z;
          if (!cells.has(key)) cells.set(key, []);
          cells.get(key).push(l);
        }
    cached = { ref: s.lands, count: s.lands.length, plots, cells };
    landCache.set(s, cached);
    return cached;
  }
  function availableLands(s) {
    const owned = new Set(s.lands);
    return LANDS.filter(
      (l) =>
        !owned.has(l.id) &&
        (!l.requires || l.requires.some((id) => owned.has(id))),
    );
  }
  function landArea(s) {
    return 36 * 32 + ownedLand(s).plots.reduce((sum, l) => sum + l.w * l.h, 0);
  }
  const NATURAL = [
    [-16, -13],
    [-17, -4],
    [-17, 8],
    [-16, 14],
    [16, 14],
    [17, -3],
    [16, -14],
    [-6, -14],
    [6, -14],
    [-8, 14],
    [4, 14],
  ].map(([x, z]) => ({ x, z, w: 0.5, h: 0.5 }));
  const FIXED = [
    { id: "home", kind: "home", x: -12, z: -9, w: 2.8, h: 2.5 },
    { id: "letters", kind: "letters", x: 0, z: -11, w: 2.8, h: 2.5 },
    { id: "studio", kind: "studio", x: 12, z: -9, w: 2.8, h: 2.5 },
  ];
  const REMOVABLE_FIXED = ["letters", "studio"];
  function activeFixed(s) {
    const removed = new Set(s?.removedFixed || []);
    return FIXED.filter((building) =>
      building.id === "home" ? true : !removed.has(building.id),
    );
  }
  function isHouse(kind) {
    return ["house", "house-two-story", "house-tower"].includes(kind);
  }
  const FAMILIES = Content.FAMILIES;
  // Reading patterns. They are shown as a little train, not presented as
  // made-up words. Sound files are optional and do not limit this library.
  const SYLLABLE_TRAINS = [
    ...FAMILIES.flatMap((family) =>
      family.flatMap((first, i) =>
        family
          .filter((_, j) => i !== j)
          .map((second) => [first, second]),
      ),
    ),
    ...FAMILIES.flatMap((family, familyIndex) =>
      family.map((first, vowelIndex) => [
        first,
        FAMILIES[(familyIndex + 1) % FAMILIES.length][
          (vowelIndex + 2) % family.length
        ],
      ]),
    ),
    ...FAMILIES.flatMap((family) =>
      family.map((first, vowelIndex) => [
        first,
        family[(vowelIndex + 2) % family.length],
        family[(vowelIndex + 4) % family.length],
      ]),
    ),
  ];
  const WORDS = Content.WORDS;
  const PETS = [
      "cat",
      "dog",
      "rabbit",
      "fox",
      "cube-beaver",
      "cube-bee",
      "cube-bunny",
      "cube-cat",
      "cube-caterpillar",
      "cube-chick",
      "cube-cow",
      "cube-crab",
      "cube-deer",
      "cube-dog",
      "cube-elephant",
      "cube-fish",
      "cube-fox",
      "cube-giraffe",
      "cube-hog",
      "cube-koala",
      "cube-lion",
      "cube-monkey",
      "cube-panda",
      "cube-parrot",
      "cube-penguin",
      "cube-pig",
      "cube-polar",
      "cube-tiger",
      "turtle",
      "chicken",
      "zombie",
    ],
    COLORS = ["#be7186", "#7b9ca3", "#d5aa62", "#88a38a", "#8977a6"];
  const PET_PRICES = {
    cat: 0,
    dog: 0,
    rabbit: 0,
    fox: 0,
    "cube-beaver": 14,
    "cube-bee": 10,
    "cube-bunny": 12,
    "cube-cat": 12,
    "cube-caterpillar": 10,
    "cube-chick": 10,
    "cube-cow": 18,
    "cube-crab": 12,
    "cube-deer": 18,
    "cube-dog": 12,
    "cube-elephant": 24,
    "cube-fish": 10,
    "cube-fox": 16,
    "cube-giraffe": 24,
    "cube-hog": 16,
    "cube-koala": 18,
    "cube-lion": 22,
    "cube-monkey": 18,
    "cube-panda": 22,
    "cube-parrot": 16,
    "cube-penguin": 16,
    "cube-pig": 14,
    "cube-polar": 22,
    "cube-tiger": 24,
    turtle: 12,
    chicken: 18,
    zombie: 24,
  };
  function ownsPet(s, type) {
    return (
      PETS.includes(type) &&
      (PET_PRICES[type] === 0 ||
        (Array.isArray(s.ownedPets) && s.ownedPets.includes(type)))
    );
  }
  function buyPet(s, type) {
    if (
      !PETS.includes(type) ||
      ownsPet(s, type) ||
      !Number.isInteger(s.gems) ||
      s.gems < PET_PRICES[type]
    )
      return false;
    s.gems -= PET_PRICES[type];
    s.ownedPets = [...(s.ownedPets || []), type];
    return true;
  }
  function baseRoads() {
    const r = {};
    for (let z = -4; z <= 5; z++) r["0," + z] = "sand";
    for (let x = -6; x <= 6; x++) r[x + ",-3"] = "sand";
    return r;
  }
  function fresh() {
    return {
      version: 5,
      gems: 12,
      runs: 0,
      independent: 0,
      letterScores: {},
      syllableScores: {},
      modeRuns: {},
      skills: {},
      look: { dress: 0, shoes: 0, hair: 0, color: 0 },
      pet: "cat",
      ownedPets: [],
      lands: [],
      removedFixed: [],
      objects: [],
      roads: baseRoads(),
      rooms: {},
      sound: true,
      voice: true,
      volume: 0.8,
      allLevels: false,
      seen: {},
      nextId: 1,
      // Mastery per item ("L:А" letter, "S:МА" syllable, "W:МАМА" word), see learning.js.
      items: {},
      // How often a target was confused with another pick: "А|О" -> count.
      conf: {},
      // The short "what do you already know" check has been played.
      placed: false,
    };
  }
  function migrate(old) {
    // Normalize additive v5 fields without changing the save version. Shiba
    // was retired because its seated source mesh could not walk convincingly.
    if (old && old.version === 5) {
      const cleaned = JSON.parse(JSON.stringify(old));
      if (!Array.isArray(cleaned.removedFixed)) cleaned.removedFixed = [];
      if (cleaned.pet === "shiba") cleaned.pet = "cat";
      cleaned.ownedPets = (cleaned.ownedPets || []).filter(
        (pet) => pet !== "shiba",
      );
      if (valid(cleaned)) return cleaned;
    }
    if (valid(old)) return JSON.parse(JSON.stringify(old));
    if (old && old.version === 4 && validBody(old)) {
      // v4 -> v5: keep everything; old scores came mostly from visual matching,
      // so they only mark an item as introduced and heard (box 1).
      const s = JSON.parse(JSON.stringify(old));
      s.version = 5;
      s.items = {};
      s.conf = {};
      s.placed = false;
      s.removedFixed = [];
      for (const [l, n] of Object.entries(s.letterScores))
        if (n > 0 && /^[А-ЯҐЄІЇЬ]$/.test(l))
          s.items["L:" + l] = {
            box: 1,
            seen: n,
            ok: n,
            miss: 0,
            due: 0,
            lastUp: 0,
          };
      for (const [v, n] of Object.entries(s.syllableScores))
        if (n > 0 && /^[А-ЯҐЄІЇЬ]{2}$/.test(v))
          s.items["S:" + v] = {
            box: 1,
            seen: n,
            ok: n,
            miss: 0,
            due: 0,
            lastUp: 0,
          };
      return valid(s) ? s : null;
    }
    if (!root.Core?.valid(old)) return null;
    const s = fresh();
    for (const k of [
      "gems",
      "runs",
      "independent",
      "letterScores",
      "syllableScores",
      "modeRuns",
      "sound",
      "voice",
      "allLevels",
    ])
      s[k] = JSON.parse(JSON.stringify(old[k]));
    s.look.color = Math.max(0, root.Core.colors.indexOf(old.color)) % 5;
    const plots = [
      [-13, 2],
      [-6, 2],
      [1, 2],
      [-13, 10],
      [-6, 10],
      [1, 10],
    ];
    old.buildings.forEach((kind, i) => {
      if (kind) {
        const [x, z] = plots[i];
        s.objects.push({
          id: "b" + s.nextId++,
          kind,
          x,
          z,
          rotation: 0,
          paid: root.Core.ITEMS.find((v) => v.id === kind).cost,
        });
      }
    });
    return s;
  }
  const integer = (n) => Number.isInteger(n) && n >= 0 && n <= 1e7;
  const validRotation = (n) =>
    Number.isFinite(n) && n >= 0 && n < 4 && Number.isInteger(n * 2);
  const ITEM_KEY = /^(?:[LS]:[А-ЯҐЄІЇЬ]{1,8}|W:[А-ЯҐЄІЇЬ’']{1,16})$/,
    CONF_KEY = /^[А-ЯҐЄІЇЬ]{1,2}\|[А-ЯҐЄІЇЬ]{1,2}$/;
  function valid(s) {
    if (!s || s.version !== 5 || !validBody(s) || !Paths.valid(s.paths))
      return false;
    if (
      !Array.isArray(s.removedFixed) ||
      new Set(s.removedFixed).size !== s.removedFixed.length ||
      s.removedFixed.some((id) => !REMOVABLE_FIXED.includes(id)) ||
      typeof s.placed !== "boolean" ||
      !s.items ||
      typeof s.items !== "object" ||
      Array.isArray(s.items) ||
      Object.keys(s.items).length > 2000 ||
      !s.conf ||
      typeof s.conf !== "object" ||
      Array.isArray(s.conf) ||
      Object.keys(s.conf).length > 1000
    )
      return false;
    for (const [k, v] of Object.entries(s.items))
      if (
        !ITEM_KEY.test(k) ||
        !v ||
        !Number.isInteger(v.box) ||
        v.box < 0 ||
        v.box > 5 ||
        !["seen", "ok", "miss", "due", "lastUp"].every((f) => integer(v[f]))
      )
        return false;
    return Object.entries(s.conf).every(
      ([k, v]) => CONF_KEY.test(k) && integer(v),
    );
  }
  // Everything shared by save versions 4 and 5.
  function validBody(s) {
    if (
      !s ||
      !integer(s.gems) ||
      !integer(s.runs) ||
      !integer(s.independent) ||
      !integer(s.nextId) ||
      (s.volume !== undefined &&
        (!Number.isFinite(s.volume) || s.volume < 0 || s.volume > 1))
    )
      return false;
    if (
      !s.look ||
      !Number.isInteger(s.look.dress) ||
      s.look.dress < 0 ||
      s.look.dress > 5 ||
      !Number.isInteger(s.look.shoes) ||
      s.look.shoes < 0 ||
      s.look.shoes > 3 ||
      !Number.isInteger(s.look.hair) ||
      s.look.hair < 0 ||
      s.look.hair > 4 ||
      !Number.isInteger(s.look.color) ||
      s.look.color < 0 ||
      s.look.color > 4 ||
      !ownsPet(s, s.pet)
    )
      return false;
    if (
      s.ownedPets !== undefined &&
      (!Array.isArray(s.ownedPets) ||
        s.ownedPets.some((p) => !PETS.includes(p)) ||
        new Set(s.ownedPets).size !== s.ownedPets.length)
    )
      return false;
    if (
      !Array.isArray(s.lands) ||
      new Set(s.lands).size !== s.lands.length ||
      s.lands.some((l) => !LANDS.some((v) => v.id === l)) ||
      !Array.isArray(s.objects) ||
      s.objects.length > MAX_OBJECTS
    )
      return false;
    if (
      s.objects.some(
        (o) =>
          !o ||
          typeof o.id !== "string" ||
          !/^b\d+$/.test(o.id) ||
          !ITEMS.some((v) => v.id === o.kind) ||
          !Number.isFinite(o.x) ||
          !Number.isFinite(o.z) ||
          Math.abs(o.x) > BOUNDS.x ||
          Math.abs(o.z) > BOUNDS.z ||
          !validRotation(o.rotation) ||
          !integer(o.paid),
      )
    )
      return false;
    if (
      new Set(s.objects.map((o) => o.id)).size !== s.objects.length ||
      s.objects.some((o) => Number(o.id.slice(1)) >= s.nextId)
    )
      return false;
    if (
      !s.roads ||
      Object.keys(s.roads).length > 900 ||
      Object.entries(s.roads).some(
        ([k, v]) =>
          !/^-?\d+,-?\d+$/.test(k) ||
          k.split(",").some((n) => Math.abs(Number(n)) > 14) ||
          !["sand", "stone", "wood"].includes(v),
      )
    )
      return false;
    for (const key of [
      "letterScores",
      "syllableScores",
      "modeRuns",
      "skills",
      "rooms",
      "seen",
    ])
      if (!s[key] || typeof s[key] !== "object" || Array.isArray(s[key]))
        return false;
    for (const key of ["letterScores", "syllableScores", "modeRuns"])
      if (Object.values(s[key]).some((v) => !integer(v))) return false;
    if (
      Object.values(s.skills).some(
        (v) =>
          !v || !integer(v.solo) || !integer(v.hinted) || !integer(v.tries),
      )
    )
      return false;
    for (const room of Object.values(s.rooms)) {
      if (
        !room ||
        typeof room.lamp !== "boolean" ||
        !room.furniture ||
        Object.keys(room.furniture).some(
          (k) => !["sofa", "table", "rug"].includes(k),
        ) ||
        ["sofa", "table", "rug"].some((k) => !room.furniture[k]) ||
        Object.values(room.furniture).some(
          (p) =>
            !p ||
            !Number.isFinite(p.x) ||
            !Number.isFinite(p.z) ||
            Math.abs(p.x) > 5 ||
            Math.abs(p.z) > 4,
        )
      )
        return false;
    }
    return ["sound", "voice", "allLevels"].every(
      (k) => typeof s[k] === "boolean",
    );
  }
  function inside(s, x, z, margin = 0) {
    const cells = ownedLand(s).cells;
    const point = (a, b) =>
      (Math.abs(a) <= 18 && Math.abs(b) <= 16) ||
      (cells.get(Math.floor(a / 8) + "," + Math.floor(b / 8)) || []).some(
        (l) => Math.abs(a - l.x) <= l.w / 2 && Math.abs(b - l.z) <= l.h / 2,
      );
    if (!margin) return point(x, z);
    return [-margin, 0, margin].every((dx) =>
      [-margin, 0, margin].every((dz) => point(x + dx, z + dz)),
    );
  }
  function water(x, z) {
    return (
      ((x - 12) / 3.5) ** 2 + ((z - 8) / 2.8) ** 2 < 1 && Math.abs(z - 8) > 0.9
    );
  }
  function footprint(o) {
    const i = ITEMS.find((v) => v.id === o.kind),
      w = isHouse(o.kind) ? Math.max(2.8, i.w * 0.94) : i.w * 0.94,
      h = isHouse(o.kind) ? Math.max(2.5, i.h * 0.94) : i.h * 0.94,
      angle = (o.rotation * Math.PI) / 2,
      c = Math.abs(Math.cos(angle)),
      s = Math.abs(Math.sin(angle));
    return {
      x: o.x,
      z: o.z,
      w: w * c + h * s,
      h: w * s + h * c,
    };
  }
  function entrance(o) {
    const f = footprint(o),
      r = o.rotation || 0,
      d = (r % 2 ? f.w : f.h) + 1.4;
    return {
      x: o.x + [0, 1, 0, -1][r] * d,
      z: o.z + [1, 0, -1, 0][r] * d,
      w: 0.7,
      h: 0.7,
    };
  }
  function overlaps(a, b, pad = 0) {
    return (
      Math.abs(a.x - b.x) < a.w + b.w + pad &&
      Math.abs(a.z - b.z) < a.h + b.h + pad
    );
  }
  function placement(s, o, ignore) {
    const f = footprint(o);
    for (const dx of [-f.w, 0, f.w])
      for (const dz of [-f.h, 0, f.h])
        if (!inside(s, o.x + dx, o.z + dz, 0.2) || water(o.x + dx, o.z + dz))
          return "Тут немає вільної землі";
    if (
      [
        ...activeFixed(s),
        ...NATURAL,
        ...s.objects.filter((v) => v.id !== ignore).map(footprint),
      ].some((b) => overlaps(f, b, 0.2))
    )
      return "Потрібно трохи більше місця";
    if (
      [
        ...activeFixed(s),
        ...s.objects.filter((v) => isHouse(v.kind) && v.id !== ignore),
      ].some((b) => overlaps(f, entrance({ ...b, kind: "house" })))
    )
      return "Залишимо вхід вільним";
    if ((s.paths || []).some((p) => Paths.intersectsObject(p, f)))
      return "Тут доріжка. Обери місце поруч або прибери її гумкою";
    const entry = entrance(o);
    if (
      isHouse(o.kind) &&
      (!inside(s, entry.x, entry.z, 0.7) ||
        water(entry.x, entry.z) ||
        [
          ...activeFixed(s),
          ...s.objects.filter((v) => v.id !== ignore).map(footprint),
        ].some((b) => overlaps(entry, b)))
    )
      return "Потрібен вільний підхід до дверей";
    return "";
  }
  function place(s, kind, x, z, rotation = 0, id) {
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      !validRotation(rotation) ||
      (id && !s.objects.some((o) => o.id === id))
    )
      return false;
    const item = ITEMS.find((i) => i.id === kind);
    if (!item || (s.objects.length >= MAX_OBJECTS && !id)) return false;
    const old = s.objects.find((o) => o.id === id),
      o = {
        id: id || "b" + s.nextId,
        kind,
        x,
        z,
        rotation,
        paid: old?.paid ?? item.cost,
      };
    if (placement(s, o, id) || (!old && s.gems < item.cost)) return false;
    if (old) Object.assign(old, o);
    else {
      s.gems -= item.cost;
      s.nextId++;
      s.objects.push(o);
    }
    const f = footprint(o);
    for (const k of Object.keys(s.roads)) {
      const [a, b] = k.split(",").map(Number);
      if (overlaps(f, { x: a * 2, z: b * 2, w: 0.8, h: 0.8 }))
        delete s.roads[k];
    }
    return o;
  }
  function linePlan(s, kind, start, end, rotation = 0) {
    const item = ITEMS.find((i) => i.id === kind);
    if (
      !item?.stretch ||
      !start ||
      !end ||
      !Number.isFinite(start.x) ||
      !Number.isFinite(start.z) ||
      !Number.isFinite(end.x) ||
      !Number.isFinite(end.z) ||
      !validRotation(rotation)
    )
      return [];
    const dx = end.x - start.x,
      dz = end.z - start.z,
      distance = Math.hypot(dx, dz),
      direction = distance > 0.2 ? Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) : null,
      angle = direction === null ? (-rotation * Math.PI) / 2 : direction * (Math.PI / 4),
      snappedRotation =
        direction === null ? rotation : ((-direction * 0.5) % 4 + 4) % 4,
      spacing = Math.max(0.65, item.w * 1.72),
      wanted = distance > 0.2 ? Math.floor(distance / spacing) + 1 : 1,
      affordable = Math.floor(s.gems / item.cost),
      available = Math.max(0, MAX_OBJECTS - s.objects.length),
      count = Math.min(wanted, affordable, available),
      plan = [];
    for (let i = 0; i < count; i++) {
      const o = {
        id: `line-${i}`,
        kind,
        x: Math.round((start.x + Math.cos(angle) * spacing * i) * 20) / 20,
        z: Math.round((start.z + Math.sin(angle) * spacing * i) * 20) / 20,
        rotation: snappedRotation,
        paid: item.cost,
      };
      if (placement(s, o)) break;
      plan.push(o);
    }
    return plan;
  }
  function placeLine(s, kind, start, end, rotation = 0) {
    const plan = linePlan(s, kind, start, end, rotation);
    if (!plan.length) return false;
    const placed = plan.map((draft) => ({
      ...draft,
      id: "b" + s.nextId++,
    }));
    const total = placed.reduce((sum, o) => sum + o.paid, 0);
    s.gems -= total;
    s.objects.push(...placed);
    for (const o of placed) {
      const f = footprint(o);
      for (const k of Object.keys(s.roads)) {
        const [a, b] = k.split(",").map(Number);
        if (overlaps(f, { x: a * 2, z: b * 2, w: 0.8, h: 0.8 }))
          delete s.roads[k];
      }
    }
    return placed;
  }
  function remove(s, id) {
    const i = s.objects.findIndex((o) => o.id === id);
    if (i < 0) return false;
    s.gems += s.objects[i].paid;
    s.objects.splice(i, 1);
    delete s.rooms[id];
    return true;
  }
  function removeFixed(s, id) {
    if (!REMOVABLE_FIXED.includes(id) || s.removedFixed.includes(id)) return false;
    s.removedFixed.push(id);
    delete s.rooms[id];
    return true;
  }
  function expand(s, id) {
    const l = LANDS.find((v) => v.id === id);
    if (
      !l ||
      s.lands.includes(id) ||
      s.gems < l.cost ||
      (l.requires && !l.requires.some((p) => s.lands.includes(p)))
    )
      return false;
    s.gems -= l.cost;
    s.lands.push(id);
    return true;
  }
  function roadOK(s, x, z) {
    return (
      inside(s, x * 2, z * 2, 0.8) &&
      [-0.8, 0, 0.8].every((dx) =>
        [-0.8, 0, 0.8].every((dz) => !water(x * 2 + dx, z * 2 + dz)),
      ) &&
      ![...activeFixed(s), ...NATURAL, ...s.objects.map(footprint)].some((b) =>
        overlaps({ x: x * 2, z: z * 2, w: 0.7, h: 0.7 }, b),
      )
    );
  }
  function road(s, cells, material) {
    if (
      !["sand", "stone", "wood", "erase"].includes(material) ||
      cells.length > 900 ||
      cells.some(
        (p) =>
          !Number.isInteger(p.x) ||
          !Number.isInteger(p.z) ||
          !roadOK(s, p.x, p.z),
      )
    )
      return false;
    for (const p of cells) {
      const key = p.x + "," + p.z;
      if (material === "erase") delete s.roads[key];
      else s.roads[key] = material;
    }
    return true;
  }
  function roadLine(a, b) {
    if (
      ![a.x, a.z, b.x, b.z].every(
        (n) => Number.isInteger(n) && Math.abs(n) <= 30,
      )
    )
      return [];
    const out = [];
    let x = a.x,
      z = a.z;
    out.push({ x, z });
    while (x !== b.x) {
      x += Math.sign(b.x - x);
      out.push({ x, z });
    }
    while (z !== b.z) {
      z += Math.sign(b.z - z);
      out.push({ x, z });
    }
    return out;
  }
  function skill(s, mode, target, hinted) {
    const k = mode + ":" + target,
      v = s.skills[k] || (s.skills[k] = { tries: 0, solo: 0, hinted: 0 });
    v.tries++;
    v[hinted ? "hinted" : "solo"]++;
    if (!hinted) {
      if (["letters", "hear", "sound-part"].includes(mode)) {
        s.letterScores[target] = (s.letterScores[target] || 0) + 1;
        s.independent++;
      }
      if (["blend", "hear-syllable", "syllables"].includes(mode))
        s.syllableScores[target] = (s.syllableScores[target] || 0) + 1;
      if (mode === "train")
        for (const part of target.split("-"))
          s.syllableScores[part] = (s.syllableScores[part] || 0) + 1;
    }
  }
  function reward(s, run) {
    if (run.rewarded) return false;
    run.rewarded = true;
    s.gems += 3;
    s.runs++;
    s.modeRuns[run.mode] = (s.modeRuns[run.mode] || 0) + 1;
    return true;
  }
  function room(s, id) {
    return (
      s.rooms[id] ||
      (s.rooms[id] = {
        lamp: true,
        furniture: {
          sofa: { x: -3, z: -1 },
          table: { x: 1, z: 0 },
          rug: { x: 0, z: 2 },
        },
      })
    );
  }
  const api = {
    ITEMS,
    LANDS,
    BOUNDS,
    MAX_OBJECTS,
    availableLands,
    landArea,
    FIXED,
    REMOVABLE_FIXED,
    activeFixed,
    isHouse,
    NATURAL,
    FAMILIES,
    SYLLABLE_TRAINS,
    WORDS,
    PETS,
    PET_PRICES,
    ownsPet,
    buyPet,
    COLORS,
    fresh,
    migrate,
    valid,
    inside,
    water,
    footprint,
    overlaps,
    entrance,
    placement,
    place,
    linePlan,
    placeLine,
    remove,
    removeFixed,
    expand,
    roadOK,
    road,
    roadLine,
    skill,
    reward,
    room,
  };
  if (typeof module !== "undefined") module.exports = api;
  root.TownState = api;
})(typeof window !== "undefined" ? window : globalThis);
