const assert = require("node:assert/strict");
global.window = global;
global.THREE = require("./three.min.js");
require("./pet-rig.js");
global.TownState = require("./town-state.js");
global.Navigation = require("./navigation.js");
global.devicePixelRatio = 1;
global.matchMedia = () => ({ matches: false });
global.addEventListener = () => {};
global.requestAnimationFrame = () => {};
function canvas() {
  return {
    width: 1,
    height: 1,
    style: {},
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    setPointerCapture() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1280, height: 800 };
    },
    getContext() {
      return new Proxy(
        {},
        {
          get: (o, k) => o[k] || (() => {}),
          set: (o, k, v) => ((o[k] = v), true),
        },
      );
    },
  };
}
global.document = {
  hidden: false,
  createElement: canvas,
  addEventListener() {},
};
// Render-independent scene tests use the real Three geometry and real game logic.
THREE.WebGLRenderer = class {
  constructor() {
    this.domElement = canvas();
    this.shadowMap = {};
  }
  setPixelRatio() {}
  setSize() {}
  render() {}
};
const fs = require("node:fs");
const bytes = fs.readFileSync("./models/characters.bin");
const characterAssets = require("./character-assets.js");
characterAssets.install(
  JSON.parse(fs.readFileSync("./models/characters.json", "utf8")),
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const cubeBytes = fs.readFileSync("./models/cube-pets.bin");
characterAssets.installAdditional(
  JSON.parse(fs.readFileSync("./models/cube-pets.json", "utf8")),
  cubeBytes.buffer.slice(
    cubeBytes.byteOffset,
    cubeBytes.byteOffset + cubeBytes.byteLength,
  ),
);
require("./vendor/reflector.js");
require("./vendor/water.js");
require("./surface-art.js");
require("./atmosphere.js");
require("./companion-assets.js");
require("./pet-behavior.js");
require("./art.js");
require("./island-landscape.js");
require("./town-world.js");
const s = TownState.fresh(),
  events = [],
  w = new TownWorld(
    { clientWidth: 1280, clientHeight: 800, append() {} },
    s,
    (e) => events.push(e),
  );
let time = w.last;
function tick(frames) {
  for (let i = 0; i < frames; i++) {
    time += 1000 / 60;
    w.loop(time);
  }
}
for (let dress = 0; dress < 6; dress++)
  for (let shoes = 0; shoes < 4; shoes++)
    for (let hair = 0; hair < 5; hair++) {
      const g = Art.avatar({ dress, shoes, hair, color: 2 }),
        box = new THREE.Box3().setFromObject(g);
      assert(Number.isFinite(box.max.y));
      assert(box.max.y > 2.9 && box.max.y < 4);
      assert(box.min.y > -0.05, "shoes below ground");
      Art.dispose(g);
    }
console.log(
  "PASS 120 outfit combinations: finite complete geometry and shoes above ground",
);
w.setView("wardrobe");
tick(10);
assert(w.mirror.isReflector);
assert(
  w.room.children
    .find((o) => o.userData.doors)
    .userData.doors.every((d) => Math.abs(d.rotation.y) > 1.5),
  "wardrobe doors open",
);
assert(!w.reflection, "no duplicated avatar in mirror");
// A window pass must restore visibility and renderer state even on render errors.
const r = w.renderer,
  initialTarget = {};
let currentTarget = initialTarget;
r.getRenderTarget = () => currentTarget;
r.setRenderTarget = (t) => (currentTarget = t);
r.shadowMap.autoUpdate = true;
r.render = () => {
  assert.equal(w.outside.visible, true);
  assert.equal(w.room.visible, false);
  throw Error("test context loss");
};
assert.throws(() => w.renderWindow(), /test context loss/);
assert.equal(w.outside.visible, false);
assert.equal(w.room.visible, true);
assert.equal(w.hero.visible, true);
assert.equal(currentTarget, initialTarget);
assert.equal(r.shadowMap.autoUpdate, true);
r.render = () => {};
w.renderWindow();
assert(w.windowView.next > w.time);
assert(
  Math.abs(new THREE.Box3().setFromObject(w.hero).min.y - 0.13) < 0.005,
  "shoes rest on wardrobe platform",
);
for (const p of TownState.PETS) {
  w.setView("pets");
  w.setPet(p);
  tick(1);
  assert(
    (w.pet.updateMatrixWorld(true),
    new THREE.Box3().setFromObject(w.pet, true).min.y) >= 0.265,
    `${p} paws above pet platform`,
  );
  w.petReact("ball");
  tick(20);
  assert(w.petProp.parent === w.room);
  assert(w.ballProp);
  w.setView("street");
  w.setView("pets");
  w.petReact("feed");
  assert(w.petProp.parent === w.room);
  assert(w.petProp.children.length);
  tick(160);
  w.setView("street");
  w.paused = false;
  w.hero.position.set(0, 0, 5);
  w.pet.position.set(0, 0, 11);
  tick(1);
  let previousYaw = w.pet.rotation.y,
    previousY = w.pet.position.y,
    maxTurnStep = 0,
    maxHeightStep = 0,
    sawWalk = false,
    minLeg = Infinity,
    maxLeg = -Infinity;
  for (let frame = 1; frame < 180; frame++) {
    tick(1);
    sawWalk ||= w.pet.userData.behavior.name === "walk";
    for (const leg of w.pet.userData.rig?.map((part) => part.hip) || w.pet.userData.legs) {
      minLeg = Math.min(minLeg, leg.rotation.x);
      maxLeg = Math.max(maxLeg, leg.rotation.x);
    }
    maxTurnStep = Math.max(
      maxTurnStep,
      Math.abs(
        Math.atan2(
          Math.sin(w.pet.rotation.y - previousYaw),
          Math.cos(w.pet.rotation.y - previousYaw),
        ),
      ),
    );
    maxHeightStep = Math.max(
      maxHeightStep,
      Math.abs(w.pet.position.y - previousY),
    );
    previousYaw = w.pet.rotation.y;
    previousY = w.pet.position.y;
  }
  assert(maxTurnStep < 0.19, `${p} turns without snapping`);
  assert(maxHeightStep < 0.025, `${p} stays vertically stable`);
  assert(
    Math.hypot(w.pet.position.x, w.pet.position.z - 5) <= 4.4,
    `${p} follows the girl`,
  );
  assert(sawWalk, `${p} enters a real walking state`);
  assert(maxLeg - minLeg > 0.06, `${p} visibly moves its legs while walking`);
}
console.log(
  `PASS ${TownState.PETS.length} pets, reactions, smooth turning, visible gait and natural following`,
);
w.setView("street");
w.paused = false;
w.pet.position.copy(w.hero.position).add(new THREE.Vector3(1, 0, 0));
w.petPath = [{ x: w.hero.position.x, z: w.hero.position.z }];
w.petPathMode = "follow";
tick(1);
assert.equal(w.petPath.length, 0, "clear stale follow path near girl");
assert.notEqual(
  w.pet.userData.behavior.name,
  "walk",
  "stationary pet must not run in place",
);
const wanderStart = w.pet.position.clone();
w.petPath = [];
w.petPathMode = "idle";
w.petWanderNext = w.time;
tick(150);
assert(
  Math.hypot(w.pet.position.x - wanderStart.x, w.pet.position.z - wanderStart.z) >
    0.35,
  "a nearby pet chooses its own short walk",
);
assert(
  Math.hypot(
    w.pet.position.x - w.hero.position.x,
    w.pet.position.z - w.hero.position.z,
  ) < 4.4,
  "independent walk stays near the girl",
);
const street = w.hero.position.clone();
w.setView("room", "home");
assert(
  w.room.children
    .find((o) => o.userData.doors)
    .userData.doors.every((d) => d.rotation.y === 0),
  "room wardrobe closed",
);
w.sit();
assert(w.sitting);
w.navigate(0, 2);
assert(!w.sitting);
assert(!w.roomNav.blocked(w.hero.position.x, w.hero.position.z));
tick(180);
assert(Math.hypot(w.hero.position.x, w.hero.position.z - 2) < 0.2);
w.toggleLamp();
assert.equal(s.rooms.home.lamp, false);
w.setView("room", "studio");
const learningDisplays = w.room.children.filter(
    (group) => group.userData.action?.type === "learn",
  ),
  learningBounds = learningDisplays.map((group) => new THREE.Box3().setFromObject(group));
assert.equal(learningDisplays.length, 4, "one display and three syllable cubes");
for (let i = 0; i < learningBounds.length; i++)
  for (let j = i + 1; j < learningBounds.length; j++)
    assert(!learningBounds[i].intersectsBox(learningBounds[j]), "learning props do not overlap");
w.setView("room", "home");
w.rotate(50);
assert(w.yaw <= 0.55);
w.setView("street");
assert.equal(w.hero.position.x, street.x);
assert.equal(w.hero.position.z, street.z);
console.log(
  "PASS sit, stand, indoor navigation, lamp, safe camera and street return",
);
s.gems = 100;
const o = TownState.place(s, "house", 4, 0, 1);
assert(o);
w.refreshObjects(o.id);
assert.equal(w.animations.length, 1);
const group = w.objectGroup.children.find((g) => g.userData.objectId === o.id);
assert.deepEqual(group.userData.entrance, TownState.entrance(o));
assert(
  group.children.some(
    (child) => child.isMesh && child.material?.color?.getHexString() === "18201f",
  ),
  "an open door reveals a dark interior",
);
tick(70);
assert(w.animations.length);
tick(100);
assert.equal(w.animations.length, 0);
const intersectObjects = w.ray.intersectObjects;
w.ray.intersectObjects = () => [{ object: group }];
w.tap(0, 0);
assert(w.arrive, "a built house immediately starts an entrance walk");
assert.equal(w.selectedObjectId, undefined, "normal play does not select a house for deletion");
tick(360);
assert(events.some((event) => event.type === "enter" && event.id === o.id));
w.ray.intersectObjects = intersectObjects;
assert(events.some((e) => e.type === "built"));
assert(group.children.every((g) => g.visible || g.userData.renderBatched));
assert.equal(s.gems, 90);
for (const kind of ["house-two-story", "house-tower"]) {
  const model = w.houseModel(kind, 0, 0),
    bounds = new THREE.Box3().setFromObject(model),
    size = bounds.getSize(new THREE.Vector3());
  assert(model.userData.door, `${kind} has an opening door`);
  assert(size.y > 6, `${kind} is visibly multi-storey`);
  assert(size.x > 3.5 && size.z > 3.5, `${kind} has a full house silhouette`);
  Art.dispose(model);
}
console.log(
  "PASS staged construction, direct house entry, two multi-storey variants, rotated entrance, completion and single payment",
);
const fixedGroup = w.fixedGroups.get("letters"),
  gemsBeforeFixedRemoval = s.gems;
w.ray.intersectObjects = () => [{ object: fixedGroup }];
w.tap(0, 0);
assert(w.arrive, "learning house starts an entrance walk in normal play");
tick(420);
assert(events.some((event) => event.type === "enter" && event.id === "letters"));
w.setEditor({ type: "demolish" });
w.tap(0, 0);
assert.deepEqual(events.at(-1), {
  type: "demolish-object",
  id: "letters",
  fixed: true,
});
assert(!TownState.removeFixed(s, "home"));
assert(TownState.removeFixed(s, "letters"));
assert.equal(s.gems, gemsBeforeFixedRemoval, "prebuilt house gives no refund");
assert(w.removeFixedBuilding("letters"));
assert(!w.fixedGroups.has("letters"));
assert(w.fixedGroups.has("home"));
w.ray.intersectObjects = () => [{ object: w.fixedGroups.get("home") }];
w.tap(0, 0);
assert.equal(events.at(-1).type, "demolish-protected");
w.setEditor(null);
w.ray.intersectObjects = intersectObjects;
console.log("PASS dedicated demolition tool removes learning houses without refund and protects main home");
w.setView("pets");
w.setPet("zombie");
w.petReact("feed");
assert.equal(w.foodBowl.userData.foodType, "roast-chicken");
assert.equal(w.pet.userData.characterModel, "zombie");
w.setPet(s.pet);
w.setView("street");
console.log("PASS zombie receives a voxel roast-chicken leg instead of dog food");
for (const land of TownState.LANDS) TownState.expand(s, land.id);
w.refreshTerrain();
assert(!w.nav.blocked(18, 0));
assert(w.nav.path({ x: 15, z: 0 }, { x: 24, z: 0 }).length);
w.hero.position.set(15, 0, 0);
w.navigate(24, 0);
tick(250);
assert(Math.hypot(w.hero.position.x - 24, w.hero.position.z) < 0.2);
console.log(
  "PASS expanded terrain is continuously walkable across old boundary",
);

s.gems = 100000;
for (const land of TownState.LANDS)
  if (!s.lands.includes(land.id)) assert(TownState.expand(s, land.id));
w.refreshTerrain();
assert.equal(TownState.landArea(s), 17952);
assert(TownState.landArea(s) > 6 * 56 * 52);
assert(w.nav.path({ x: 24, z: 0 }, { x: 62, z: 50 }).length);
w.hero.position.set(62, 0, 50);
w.navigate(63, 54);
tick(100);
assert(Math.hypot(w.hero.position.x - 63, w.hero.position.z - 54) < 0.2);
w.setEditor({ type: "objects" });
w.preview("house", 62, 54, 0, true);
assert(w.ghost);
w.setEditor(null);
console.log(
  "PASS full city: 136 connected purchases, 6.16x area and distant navigation",
);

// Exercise actual pointer handlers: drag never walks, two fingers never place.
const listeners = w.renderer.domElement.listeners;
const point = w.groundPoint;
w.groundPoint = (x, y) => new THREE.Vector3(x / 20, 0, y / 20);
let taps = 0;
const tap = w.tap;
w.tap = () => taps++;
const pointer = (id, x, y, button = 0) => ({
  pointerId: id,
  clientX: x,
  clientY: y,
  button,
  shiftKey: false,
});
listeners.pointerdown(pointer(1, 100, 100));
listeners.pointermove(pointer(1, 180, 130));
listeners.pointerup(pointer(1, 180, 130));
assert(w.cameraAnchor);
assert.equal(taps, 0);
assert.notEqual(w.cameraAnchor.x, w.hero.position.x);
const yaw = w.yaw,
  zoom = w.zoom;
listeners.pointerdown(pointer(1, 100, 100));
listeners.pointerdown(pointer(2, 200, 100));
listeners.pointermove(pointer(2, 240, 150));
listeners.pointerup(pointer(2, 240, 150));
listeners.pointermove(pointer(1, 110, 110));
listeners.pointerup(pointer(1, 110, 110));
assert.notEqual(w.yaw, yaw);
assert.notEqual(w.zoom, zoom);
assert.equal(taps, 0);
w.setEditor({ type: "road" });
events.length = 0;
listeners.pointerdown(pointer(1, 100, 100));
listeners.pointerdown(pointer(2, 200, 100));
listeners.pointermove(pointer(2, 210, 120));
listeners.pointerup(pointer(2, 210, 120));
listeners.pointerup(pointer(1, 100, 100));
assert(!events.some((e) => e.type === "road-start" || e.type === "road-move"));
listeners.pointerdown(pointer(1, 100, 100));
listeners.pointermove(pointer(1, 150, 120));
listeners.pointerup(pointer(1, 150, 120));
assert(events.some((e) => e.type === "road-start"));
assert(events.some((e) => e.type === "road-move"));
w.setEditor({ type: "line" });
events.length = 0;
listeners.pointerdown(pointer(1, 100, 100));
listeners.pointermove(pointer(1, 180, 140));
listeners.pointerup(pointer(1, 180, 140));
assert.deepEqual(
  events.map((event) => event.type),
  ["line-start", "line-move", "line-end"],
);
const fencePreview = TownState.linePlan(
  s,
  "white-fence",
  { x: 40, z: 40 },
  { x: 48, z: 48 },
);
w.previewLine(fencePreview);
assert.equal(w.ghost.children.length, fencePreview.length);
w.setEditor(null);
w.homeCamera();
assert.equal(w.cameraAnchor, null);
assert.equal(w.zoom, 13);
w.tap = tap;
w.groundPoint = point;
console.log(
  "PASS one-finger pan, two-finger orbit/zoom, road and fence gestures, line preview and camera return",
);

const pickedA = Art.box(w.objectGroup, "#629372", 50, 1, 0, 1, 2, 1),
  pickedB = Art.box(w.objectGroup, "#629372", 54, 1, 0, 1, 2, 1);
w.rebuildStatic();
assert(pickedA.userData.renderBatched && pickedB.userData.renderBatched);
assert(!pickedA.visible && w.staticBatchGroup.children.length);
const pickRay = new THREE.Raycaster(
  new THREE.Vector3(50, 8, 0),
  new THREE.Vector3(0, -1, 0),
);
assert(
  pickRay.intersectObject(pickedA).length,
  "batched objects remain individually selectable",
);
w.restoreStatic();
assert(pickedA.visible && pickedB.visible);
assert.equal(w.staticBatchGroup.children.length, 0);
console.log(
  "PASS static GPU batches retain original picking and restore before edits",
);
