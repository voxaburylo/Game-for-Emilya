const assert = require("node:assert/strict");
global.window = global;
global.THREE = require("./three.min.js");
global.Core = require("./core.js");
const S = require("./town-state.js");
require("./art.js");
const I = require("./island-landscape.js");
require("./atmosphere.js");
const demolition = S.fresh(),
  startingGems = demolition.gems;
assert.equal(S.activeFixed(demolition).length, 3);
assert(!S.removeFixed(demolition, "home"), "main home cannot be demolished");
assert(S.removeFixed(demolition, "letters"));
assert.equal(demolition.gems, startingGems, "prebuilt house gives no refund");
assert.deepEqual(demolition.removedFixed, ["letters"]);
assert.equal(S.activeFixed(demolition).length, 2);
assert(S.valid(demolition));
const oldV5 = S.fresh();
delete oldV5.removedFixed;
const normalizedV5 = S.migrate(oldV5);
assert.deepEqual(normalizedV5.removedFixed, []);
for (const field of ["items", "conf", "placed"])
  assert.deepEqual(normalizedV5[field], oldV5[field], `v5 keeps ${field}`);
const homes = S.fresh();
homes.gems = 100;
assert(S.place(homes, "house-two-story", -6, 5));
assert(S.place(homes, "house-tower", 4, 4));
assert.equal(homes.objects.filter((o) => S.isHouse(o.kind)).length, 2);
const s = S.fresh();
s.gems = 100000;
assert.equal(S.availableLands(s).length, 4);
assert(!S.inside(s, 62, 55));
for (const l of S.LANDS) {
  assert(
    S.availableLands(s).some((p) => p.id === l.id),
    l.id,
  );
  assert(S.expand(s, l.id));
}
assert.equal(s.lands.length, 136);
assert.equal(S.availableLands(s).length, 0);
assert.equal(S.landArea(s), 17952);
assert(S.landArea(s) > 6 * 56 * 52);
for (let x = -67; x < 68; x += 4)
  for (let z = -65; z < 66; z += 4) assert(S.inside(s, x, z, 0.5), `${x},${z}`);
assert(!S.inside(s, 69, 0));
assert(!S.inside(s, 0, 67));
const plots = [{ x: 0, z: 0, w: 36, h: 32 }, ...S.LANDS],
  edges = I.shoreline(plots);
for (const [a, b] of edges)
  assert(
    (Math.abs(a.x) === 68 && a.x === b.x) ||
      (Math.abs(a.z) === 66 && a.z === b.z),
    "no internal cliffs",
  );
for (const rects of [[plots[0]], plots.slice(0, 2), plots]) {
  const g = I.build(rects);
  assert(g.userData.grassCount > 0);
  assert(g.userData.grassCount <= 360, "grass density stays bounded as city grows");
  assert(g.children.some((child) => child.isInstancedMesh));
  assert.equal(typeof g.children[0].material.onBeforeCompile, "function");
  g.traverse((o) => {
    if (o.geometry) {
      assert([...o.geometry.attributes.position.array].every(Number.isFinite));
      if (o.geometry.index)
        assert(
          [...o.geometry.index.array].every(
            (i) => i < o.geometry.attributes.position.count,
          ),
        );
    }
  });
  const box = new THREE.Box3().setFromObject(g);
  assert(box.min.y < -15);
  Art.dispose(g);
}
const clouds = WorldAtmosphere.build();
clouds.setBounds(68, 66);
clouds.update(1, false);
const x = clouds.clouds[0].c.position.x;
clouds.update(2, false);
assert(clouds.clouds[0].c.position.x < x);
clouds.update(100000, false);
assert(
  clouds.clouds.every(
    (c) => Math.abs(c.c.position.x) <= clouds.flightWidth / 2,
  ),
);
clouds.update(4, true);
const pos = clouds.clouds[0].c.position.clone();
clouds.update(40, true);
assert.deepEqual(clouds.clouds[0].c.position, pos);
// A real large save, including buildings outside the former +/-28 boundary.
for (let z = -61; z <= 61 && s.objects.length < 900; z += 4)
  for (let x = -63; x <= 63 && s.objects.length < 900; x += 4)
    S.place(s, "rose-bed", x, z);
assert.equal(s.objects.length, 900);
assert(S.valid(s));
const roundtrip = S.migrate(JSON.parse(JSON.stringify(s)));
assert.deepEqual(roundtrip, s);
assert(!S.place(s, "flowers", 65, 63));
console.log(
  "PASS 136 plots, 17,952 area, continuous outer cliff, directional clouds, reduced motion, 900-object v5 roundtrip",
);
