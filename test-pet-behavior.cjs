const assert = require("node:assert/strict"),
  fs = require("node:fs");
global.window = global;
global.THREE = require("./three.min.js");
require("./pet-rig.js");
global.TownState = require("./town-state.js");
const assets = require("./character-assets.js"),
  behavior = require("./pet-behavior.js");
const bytes = fs.readFileSync("models/characters.bin");
assets.install(
  JSON.parse(fs.readFileSync("models/characters.json")),
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
require("./art.js");
for (const type of ["dog", "cat", "rabbit", "fox", "shiba"]) {
  const pet = assets.pet(type),
    states = new Set();
  let t = 0;
  const step = (action = "", distance = 0, reduced = false) =>
    behavior.update(pet, {
      time: (t += 1 / 60),
      dt: 1 / 60,
      action,
      distance,
      reduced,
    });
  for (let i = 0; i < 2100; i++) states.add(step().state);
  for (const [state] of behavior.cycles[type])
    assert(states.has(state), `${type}: missing ${state}`);
  step("", 0.1);
  assert.equal(pet.userData.behavior.name, "walk");
  const phase = pet.userData.behavior.distance;
  step();
  assert.notEqual(pet.userData.behavior.name, "walk");
  assert.equal(
    pet.userData.behavior.distance,
    phase,
    "stationary gait phase must not advance",
  );
  for (const action of [
    "sit",
    "lie",
    "groom",
    "stamp",
    "sniff",
    "stretch",
    "stroke",
    "ball",
  ]) {
    for (let i = 0; i < 90; i++) step(action);
    pet.position.y = 0;
    pet.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(pet, true);
    assert(
      Number.isFinite(bounds.min.y) && bounds.max.y - bounds.min.y < 3,
      `${type}/${action}: finite articulated pose ${bounds.min.y}..${bounds.max.y}`,
    );
    pet.position.y = 0.27 - bounds.min.y;
    pet.updateMatrixWorld(true);
    assert(
      Math.abs(new THREE.Box3().setFromObject(pet, true).min.y - 0.27) < 1e-5,
      "precise ground contact",
    );
    if (action === "lie")
      assert(pet.userData.torso.position.y < 0.33, "resting torso lowered");
    if (type === "cat" && action === "groom") {
      assert(pet.userData.behavior.tongue.visible);
      assert(
        pet.userData.rig[0].foot.y > 0.6,
        "grooming paw curls up to muzzle",
      );
    }
    if (type === "rabbit" && action === "stamp") {
      const positions = [];
      for (let i = 0; i < 60; i++) {
        step(action);
        positions.push(pet.userData.rig[3].foot.y);
      }
      assert(
        Math.max(...positions) - Math.min(...positions) > 0.015,
        "rabbit stamps hind foot",
      );
    }
    assert(
      pet.userData.ankles.every(
        (a, i) =>
          Math.abs(
            a.rotation.x +
              pet.userData.rig[i].hip.rotation.x +
              pet.userData.rig[i].knee.rotation.x,
          ) < 1e-5,
      ),
      "feet counter-rotate",
    );
  }
  step("", 0, true);
  const before = pet.userData.head.rotation.toArray();
  for (let i = 0; i < 120; i++) step("", 0, true);
  assert.deepEqual(
    pet.userData.head.rotation.toArray(),
    before,
    "reduced motion has no idle oscillation",
  );
  let ownedDisposed = 0;
  pet.traverse((n) => {
    if (n.isSkinnedMesh)
      n.geometry.addEventListener("dispose", () => ownedDisposed++);
  });
  Art.dispose(pet);
  if (type === "shiba")
    assert.equal(ownedDisposed, 0, "shared Shiba geometry stays reusable");
  else assert(ownedDisposed >= 4, "owned skin geometry is released");
  console.log(
    `PASS ${type}: species cycle, displacement gait, articulated poses, ground contact, reduced motion and disposal`,
  );
}
