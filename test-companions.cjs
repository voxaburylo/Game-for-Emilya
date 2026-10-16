const assert = require("node:assert/strict");
global.window = global;
global.THREE = require("./three.min.js");
const S = (global.TownState = require("./town-state.js"));
require("./companion-assets.js");
require("./pet-behavior.js");
const s = S.fresh();
delete s.ownedPets;
assert(S.valid(s), "legacy save without collection still valid");
assert(S.buyPet(s, "turtle"));
assert.equal(s.gems, 0);
assert(S.ownsPet(s, "turtle"));
assert(!S.buyPet(s, "turtle"));
assert.equal(s.gems, 0);
assert(!S.buyPet(s, "chicken"));
assert(!S.buyPet(s, "constructor"));
s.pet = "turtle";
assert(S.valid(s));
const restored = JSON.parse(JSON.stringify(s));
assert(S.ownsPet(restored, "turtle"));
for (const bad of [null, {}, "turtle", ["bad"], ["turtle", "turtle"]])
  assert.equal(S.valid({ ...s, ownedPets: bad }), false);
assert(!S.valid({ ...s, ownedPets: [] }));
s.gems = 42;
assert(S.buyPet(s, "chicken"));
assert(S.buyPet(s, "zombie"));
assert.equal(s.gems, 0);
for (const type of CompanionAssets.types) {
  const pet = CompanionAssets.create(type),
    states = new Set();
  for (let i = 0; i < 1800; i++)
    states.add(PetBehavior.update(pet, { time: i / 60, dt: 1 / 60 }).state);
  for (const [state] of CompanionAssets.cycles[type]) assert(states.has(state));
  assert.equal(
    PetBehavior.update(pet, { time: 31, dt: 1 / 60, distance: 0.1 }).state,
    "walk",
  );
  const firstLeg = pet.userData.legs[0],
    rotations = [],
    heights = [];
  for (let i = 0; i < 90; i++) {
    PetBehavior.update(pet, {
      time: 31 + i / 60,
      dt: 1 / 60,
      distance: 0.025,
    });
    rotations.push(firstLeg.rotation.x);
    heights.push(firstLeg.position.y);
  }
  assert(
    Math.max(...rotations) - Math.min(...rotations) > 0.12,
    `${type} visibly swings its legs while walking`,
  );
  assert(
    Math.max(...heights) - Math.min(...heights) > 0.012,
    `${type} visibly lifts its feet while walking`,
  );
  assert.notEqual(
    PetBehavior.update(pet, { time: 32, dt: 1 / 60 }).state,
    "walk",
  );
  const box = new THREE.Box3().setFromObject(pet, true);
  assert(box.min.y > -0.1 && box.max.y < 2.2);
  assert(CompanionAssets.thumb(type).includes("<svg"));
}
console.log(
  "PASS collectible friends: affordable purchase, insufficient funds, repeat protection, legacy/import validation, saved ownership and seven distinct companions",
);
