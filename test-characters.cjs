const assert = require("node:assert/strict");
const fs = require("node:fs");
global.window = global;
global.THREE = require("./three.min.js");
require("./pet-rig.js");
global.TownState = require("./town-state.js");
const pack = JSON.parse(fs.readFileSync("models/characters.json", "utf8"));
const bytes = fs.readFileSync("models/characters.bin");
const cubePack = JSON.parse(fs.readFileSync("models/cube-pets.json", "utf8"));
const cubeBytes = fs.readFileSync("models/cube-pets.bin");
const assets = require("./character-assets.js");
assets.install(
  pack,
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
assets.installAdditional(
  cubePack,
  cubeBytes.buffer.slice(
    cubeBytes.byteOffset,
    cubeBytes.byteOffset + cubeBytes.byteLength,
  ),
);
require("./art.js");
let packTriangles = 0;
for (const mesh of pack.meshes) {
  const n = mesh.position.count / 3;
  assert.equal(mesh.normal.count, mesh.position.count);
  assert.equal(mesh.index.count % 3, 0);
  const pos = new Float32Array(
    bytes.buffer,
    bytes.byteOffset + mesh.position.offset,
    mesh.position.count,
  );
  const normals = new Float32Array(
    bytes.buffer,
    bytes.byteOffset + mesh.normal.offset,
    mesh.normal.count,
  );
  const ids = new Uint32Array(
    bytes.buffer,
    bytes.byteOffset + mesh.index.offset,
    mesh.index.count,
  );
  for (const v of pos) assert(Number.isFinite(v));
  for (const v of normals) assert(Number.isFinite(v));
  for (const id of ids) assert(id < n, "mesh index outside vertex range");
  for (const key of [
    "position",
    "normal",
    "color",
    "skinIndex",
    "skinWeight",
    "index",
  ])
    if (mesh[key])
      assert(
        mesh[key].offset + mesh[key].count * (key === "skinIndex" ? 2 : 4) <=
          bytes.byteLength,
      );
  if (mesh.model === "shiba") {
    assert.equal(mesh.skinIndex.count, (mesh.position.count / 3) * 4);
    assert.equal(mesh.skinWeight.count, (mesh.position.count / 3) * 4);
  }
  packTriangles += ids.length / 3;
}
const girl = assets.girl({ dress: 0, shoes: 0, hair: 0, color: 0 }),
  dog = assets.dog();
for (const model of [
  girl,
  dog,
  ...["cat", "rabbit", "fox", "shiba"].map(assets.pet),
  ...["cube-elephant", "cube-bee", "cube-tiger", "cube-parrot"].map(
    assets.pet,
  ),
]) {
  let triangles = 0,
    draws = 0;
  model.traverse((o) => {
    if (o.isMesh) {
      triangles += o.geometry.index.count / 3;
      draws++;
    }
  });
  assert(triangles < 115000, "per-model triangle budget");
  assert(draws < 80, "per-model draw budget");
  console.log(
    `${model.userData.characterModel}: ${triangles} triangles, ${draws} material batches`,
  );
  const before = new THREE.Box3().setFromObject(model);
  assert(
    before.min.y > -0.05 && before.max.y < 3.8,
    `${model.userData.characterModel} bounds ${before.min.y}..${before.max.y}`,
  );
  const head = model.userData.head;
  assert(model.userData.eyes.every((e) => e.parent === head));
  assets.animate(model, 0.09 - (model === dog ? 1.8 : 0), false);
  assert(
    model.userData.eyes.every((e) => e.scale.y <= 0.05),
    "blink closes both eyes",
  );
  assets.animate(model, 3, false, true);
  assert(
    model.userData.eyes.every((e) => e.scale.y === 1),
    "reduced motion opens eyes",
  );
  head.rotation.x = 0.2;
  model.updateMatrixWorld(true);
  assert(
    model.userData.eyes.every((e) =>
      Number.isFinite(e.matrixWorld.elements[13]),
    ),
  );
}
// Repeated wardrobe replacement must keep shared GPU geometry/materials alive,
// while releasing only materials owned by the removed instance.
let sharedDisposals = 0,
  ownedDisposals = 0;
girl.traverse((o) => {
  if (!o.isMesh) return;
  o.geometry.addEventListener("dispose", () => sharedDisposals++);
  o.material.addEventListener("dispose", () =>
    o.material.userData.characterShared ? sharedDisposals++ : ownedDisposals++,
  );
});
Art.dispose(girl);
assert.equal(sharedDisposals, 0);
assert(ownedDisposals > 0);
const a = assets.girl({ dress: 0, shoes: 0, hair: 0, color: 0 });
const b = assets.girl({ dress: 0, shoes: 0, hair: 0, color: 3 });
assets.animate(a, 2, false);
assert(Math.abs(a.userData.torso.rotation.z) > 0.001, "idle weight shift");
assert(Math.abs(a.userData.head.rotation.y) > 0.01, "idle glance");
assert(
  a.userData.legs.every((leg) => leg.parent === a),
  "idle torso motion keeps feet planted",
);
assets.animate(a, 3, false, true);
assert.equal(a.userData.torso.rotation.z, 0);
assert.equal(a.userData.head.rotation.y, 0);
const tinted = (g) => {
  let result;
  g.traverse((o) => {
    if (o.isMesh && !o.material.userData.characterShared) result = o.material;
  });
  return result;
};
assert.notEqual(tinted(a), tinted(b));
assert.notEqual(tinted(a).color.getHex(), tinted(b).color.getHex());
for (const name of ["girl", "dog", "cat", "rabbit", "fox"]) {
  const glb = fs.readFileSync("models/" + name + ".glb");
  assert.equal(glb.toString("utf8", 0, 4), "glTF");
  assert.equal(glb.readUInt32LE(4), 2);
  assert.equal(glb.readUInt32LE(8), glb.length);
  const json = JSON.parse(glb.toString("utf8", 20, 20 + glb.readUInt32LE(12)));
  assert(json.nodes.some((n) => n.name === name + " · head"));
}
const files = require("./sw.js").FILES;
for (const file of [
  "character-assets.js",
  "models/characters.json",
  "models/characters.bin",
  "models/cube-pets.json",
  "models/cube-pets.bin",
  "models/licenses/shiba.txt",
  "models/licenses/kenney-cube-pets.txt",
  "models/thumbs/shiba-0.png",
  "models/thumbs/cube-elephant.png",
  "surface-art.js",
  "vendor/reflector.js",
  "vendor/water.js",
])
  assert(files.includes(file));
assert.match(fs.readFileSync("models/licenses/shiba.txt", "utf8"), /CC BY 4\.0/);
assert.match(
  fs.readFileSync("models/licenses/kenney-cube-pets.txt", "utf8"),
  /CC0 1\.0/,
);
assert.equal(
  cubePack.meshes.length,
  24,
  "every downloaded Kenney animal is in the runtime pack",
);
for (const model of [assets.tree(true), assets.cottage("#dfcbb2", "#ac7568")]) {
  const box = new THREE.Box3().setFromObject(model);
  assert(box.min.y > -0.3 && box.max.y < 6);
  let draws = 0;
  model.traverse((o) => {
    if (o.isMesh) draws++;
  });
  assert(draws < 25);
}
console.log(
  `PASS ${packTriangles} library triangles, geometry bounds, indices, articulations, blink, color isolation, disposal, GLB pivots and offline assets`,
);
