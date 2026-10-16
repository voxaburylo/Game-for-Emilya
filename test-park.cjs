const assert = require("node:assert/strict"),
  fs = require("node:fs");
global.window = global;
global.THREE = require("./three.min.js");
global.Core = require("./core.js");
const S = require("./town-state.js"),
  P = require("./garden-paths.js"),
  C = require("./park-catalog.js"),
  A = require("./park-assets.js");
require("./art.js");
const data = JSON.parse(fs.readFileSync("models/park/park.json")),
  buffer = fs.readFileSync("models/park/park.bin");
A.install(
  data,
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
);
let count = 0;
function test(name, f) {
  f();
  count++;
  console.log("PASS " + name);
}
test("159 purchases fit their placement footprints and use all 175 valid models", () => {
  assert.equal(C.items.length, 159);
  assert.equal(Object.keys(data.models).length, 175);
  const usedParts = new Set();
  for (const d of C.items) {
    const g = A.create(d.id);
    A.animate(g, 1);
    const b = new THREE.Box3().setFromObject(g);
    assert(b.min.x >= -d.w - 0.15 && b.max.x <= d.w + 0.15, d.id + " width");
    assert(b.min.z >= -d.h - 0.15 && b.max.z <= d.h + 0.15, d.id + " depth");
    g.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.parkPart !== undefined) usedParts.add(o.userData.parkPart);
      const p = o.geometry.attributes.position;
      assert([...p.array].every(Number.isFinite));
      if (o.geometry.index)
        assert([...o.geometry.index.array].every((i) => i < p.count));
    });
    assert(fs.statSync(d.thumb).size > 1000);
  }
  for (const [name, model] of Object.entries(data.models))
    for (const part of model.parts)
      assert(usedParts.has(part.id), `${name} is not used by the catalog`);
});
test("pack details are available as individual affordable decorations", () => {
  for (const id of [
    "picnic-apple",
    "picnic-mug",
    "picnic-teapot",
    "picnic-sandwich",
    "picnic-basket-round",
    "picnic-blanket-blue",
    "picnic-blanket-green",
    "picnic-blanket-red",
    "play-bucket-a",
    "play-bucket-b",
    "play-shovel-a",
    "play-shovel-b",
    "play-sandcastle-a",
    "play-sandcastle-b",
    "play-sandcastle-c",
    "play-tire-blue",
    "play-tire-pink",
    "play-tire-yellow",
    "play-tree-large",
    "play-tree-small",
  ]) {
    const item = C.items.find((candidate) => candidate.id === id);
    assert(item, id + " is purchasable");
    assert(item.cost > 0 && item.cost <= 7, id + " has a child-sized price");
    assert(!Array.isArray(item.model), id + " uses its own source model");
  }
});
test("five clear shop groups hide classic duplicates without breaking old saves", () => {
  assert.deepEqual(
    ParkCatalog.groups.map((group) => group.id),
    ["garden", "park", "picnic", "home", "city"],
  );
  const visible = S.ITEMS.filter((item) =>
    ParkCatalog.groups.some((group) => ParkCatalog.inGroup(item, group.id)),
  );
  for (const item of visible)
    assert.equal(
      ParkCatalog.groups.filter((group) => ParkCatalog.inGroup(item, group.id))
        .length,
      1,
      item.id + " belongs to one shop group",
    );
  for (const id of ["flowers", "bench", "tree", "house", "fountain"])
    assert(!visible.some((item) => item.id === id), id + " duplicate is hidden");
  assert(visible.some((item) => item.id === "swing"));
  for (const id of ["home-house", "house-two-story", "house-tower"]) {
    const building = S.ITEMS.find((item) => item.id === id);
    assert(building, id + " exists");
    assert(ParkCatalog.inGroup(building, "city"), id + " belongs to City");
    assert(!ParkCatalog.inGroup(building, "home"), id + " is absent from Yard");
  }
  for (const id of ["flowers", "bench", "tree", "house", "fountain"]) {
    const old = S.fresh();
    old.gems = 100;
    assert(S.place(old, id, 4, 0), id + " remains loadable");
    assert(S.valid(old));
  }
});
test("fences and hedges drag in affordable 45 degree snapped lines", () => {
  const stretch = C.items.filter((item) => item.stretch);
  assert(stretch.some((item) => item.id === "hedge-short"));
  assert(stretch.some((item) => item.id === "white-fence"));
  assert(!C.items.find((item) => item.id === "corner-fence").stretch);
  const s = S.fresh();
  s.gems = 9;
  const plan = S.linePlan(
    s,
    "white-fence",
    { x: -12, z: 4 },
    { x: 12, z: 4 },
  );
  assert.equal(plan.length, 3, "preview stops at the affordable length");
  assert(plan.every((object) => object.rotation === 0));
  const placed = S.placeLine(
    s,
    "white-fence",
    { x: -12, z: 4 },
    { x: 12, z: 4 },
  );
  assert.equal(placed.length, 3);
  assert.equal(s.gems, 0);
  assert(S.valid(s));
  const diagonal = S.fresh();
  diagonal.gems = 30;
  const diagonalPlan = S.linePlan(
    diagonal,
    "hedge-short",
    { x: -12, z: 3 },
    { x: -4, z: 11 },
  );
  assert(diagonalPlan.length > 2);
  assert(diagonalPlan.every((object) => object.rotation === 3.5));
  const poor = S.fresh();
  poor.gems = 2;
  const before = JSON.stringify(poor);
  assert.equal(
    S.placeLine(poor, "white-fence", { x: 4, z: 4 }, { x: 14, z: 4 }),
    false,
  );
  assert.equal(JSON.stringify(poor), before, "an unaffordable line does not mutate");
});
test("model reuse survives preview disposal and interaction", () => {
  let disposed = 0;
  A.parts.forEach((p) =>
    p.geometry.addEventListener("dispose", () => disposed++),
  );
  A.materials.forEach((m) => m.addEventListener("dispose", () => disposed++));
  for (const d of C.items) {
    const g = A.create(d.id);
    A.react(g, 0);
    A.animate(g, 1);
    A.animate(g, 6, true);
    Art.dispose(g);
  }
  assert.equal(disposed, 0);
  const light = A.create("park-lantern");
  A.react(light, 0);
  A.animate(light, 1);
  assert(light.children[0].children[0].material.emissiveIntensity > 0);
  A.animate(light, 5, true);
  assert.equal(light.children[0].children[0].material.emissiveIntensity, 0);
});
test("all catalog purchases charge once, persist and refund once", () => {
  for (const d of C.items) {
    const s = S.fresh();
    s.gems = 50;
    const o = S.place(s, d.id, 4, 0);
    assert(o, d.id);
    assert.equal(s.gems, 50 - d.cost);
    assert(S.valid(s));
    const copy = S.migrate(JSON.parse(JSON.stringify(s)));
    assert.equal(copy.version, 5);
    assert.equal(copy.objects[0].kind, d.id);
    assert(S.remove(copy, o.id));
    assert.equal(copy.gems, 50);
    assert(!S.remove(copy, o.id));
  }
});
test("corner land requires an adjoining owned plot and remains connected", () => {
  for (const l of C.lands) {
    const s = S.fresh();
    s.gems = 200;
    const before = JSON.stringify(s);
    assert(!S.expand(s, l.id));
    assert.equal(JSON.stringify(s), before);
    assert(S.expand(s, l.requires[0]));
    assert(S.expand(s, l.id));
    assert(S.inside(s, l.x, l.z, 0.8));
    assert(S.inside(s, l.x, Math.sign(l.z) * 16, 0.5));
    assert(!S.inside(s, 29, 27));
    assert(S.valid(s));
  }
});
const curve = [
  { x: 3, z: 0 },
  { x: 7, z: 0 },
  { x: 9, z: 3 },
  { x: 11, z: 3 },
];
test("curves keep endpoints, round corners and serialize without losing v5 learning", () => {
  const smooth = P.smooth(curve);
  assert.deepEqual(smooth[0], curve[0]);
  assert.deepEqual(smooth.at(-1), curve.at(-1));
  assert(smooth.some((p) => p.x > 6 && p.x < 8 && p.z > 0 && p.z < 1));
  const s = S.fresh();
  s.items = { "L:А": { box: 2, seen: 3, ok: 2, miss: 1, due: 5, lastUp: 2 } };
  s.conf = { "А|О": 1 };
  s.placed = true;
  const original = JSON.stringify([s.items, s.conf, s.placed]);
  const gems = s.gems;
  const road = P.add(s, curve, "brick", "stone");
  assert(road, P.error(s, curve, "brick", "stone"));
  assert.equal(s.gems, gems - road.paid);
  assert.deepEqual(JSON.parse(JSON.stringify(s)).paths, s.paths);
  assert.equal(JSON.stringify([s.items, s.conf, s.placed]), original);
  assert.equal(s.version, 5);
  assert(S.valid(s));
  const restored = S.migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored, s);
  assert(S.placement(s, { kind: "flowers", x: 5, z: 0, rotation: 0 }));
  assert(P.remove(s, road.id));
  assert.equal(s.gems, gems);
  assert(!P.remove(s, road.id));
});
test("blocked and unaffordable curves never charge or partly build", () => {
  for (const [raw, gems] of [
    [curve, 0],
    [
      [
        { x: 0, z: -11 },
        { x: 2, z: -11 },
      ],
      100,
    ],
    [
      [
        { x: 23, z: 0 },
        { x: 25, z: 0 },
      ],
      100,
    ],
    [
      [
        { x: 11, z: 10 },
        { x: 13, z: 10 },
      ],
      100,
    ],
  ]) {
    const s = S.fresh();
    s.gems = gems;
    const before = JSON.stringify(s);
    assert(!P.add(s, raw, "stone", "stone"));
    assert.equal(JSON.stringify(s), before);
  }
  const s = S.fresh();
  assert(S.place(s, "house", 4, 0));
  assert(!P.add(s, curve, "sand", "none"));
  assert(
    !P.add(
      s,
      [
        { x: NaN, z: 0 },
        { x: 2, z: 0 },
      ],
      "sand",
      "none",
    ),
  );
});
test("eraser detects crossings between input points and refunds only selected paths", () => {
  const s = S.fresh();
  const path = P.add(s, curve, "wood", "none");
  assert(path);
  assert.deepEqual(
    P.near(s, [
      { x: 5, z: -3 },
      { x: 5, z: 3 },
    ]),
    [path.id],
  );
  assert.deepEqual(
    P.near(s, [
      { x: -5, z: 0 },
      { x: -3, z: 0 },
    ]),
    [],
  );
  assert(P.valid(undefined));
  assert(P.valid(s.paths));
  const copy = structuredClone(s.paths);
  copy[0].paid = -2;
  assert(!P.valid(copy));
  assert(!P.valid([...s.paths, ...s.paths]));
  copy[0].paid = 1;
  copy[0].points[0].x = 70;
  assert(!P.valid(copy));
});
test("five surfaces and four borders generate finite renderable geometry", () => {
  for (const m of P.MATERIALS)
    for (const border of P.BORDERS) {
      const g = P.mesh(curve, m, border);
      assert(g.children.length);
      g.traverse((o) => {
        if (o.geometry)
          for (const a of Object.values(o.geometry.attributes))
            assert([...a.array].every(Number.isFinite));
      });
      Art.dispose(g);
    }
});
test("CC0 commercial licenses, thumbnails, atlases and runtime are cached offline", () => {
  const files = require("./sw.js").FILES;
  for (const f of fs
    .readdirSync("models/park", { recursive: true })
    .filter((f) => fs.statSync("models/park/" + f).isFile()))
    assert(files.includes("models/park/" + f.replaceAll("\\", "/")), f);
  for (const f of [
    "park-assets.js",
    "park-catalog.js",
    "garden-paths.js",
    "park.css",
  ])
    assert(files.includes(f));
  for (const name of [
    "pretty-park",
    "homely-house",
    "pleasant-picnic",
    "fun-playground",
    "city-builder-bits",
  ]) {
    const license = fs.readFileSync(
      "models/park/licenses/" + name + ".txt",
      "utf8",
    );
    assert(license.includes("CC0"));
    assert(license.includes("commercial"));
  }
});
console.log(count + " park checks passed");
