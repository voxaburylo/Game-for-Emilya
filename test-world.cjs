const assert = require("node:assert/strict");
global.window = global;
global.THREE = require("./three.min.js");
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
    addEventListener() {},
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
require("./art.js");
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
for (const p of TownState.PETS) {
  w.setView("pets");
  w.setPet(p);
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
}
console.log("PASS four pets, reactions and repeated room entry");
w.setView("street");
w.paused = false;
const street = w.hero.position.clone();
w.setView("room", "home");
w.sit();
assert(w.sitting);
w.navigate(0, 2);
assert(!w.sitting);
assert(!w.roomNav.blocked(w.hero.position.x, w.hero.position.z));
tick(180);
assert(Math.hypot(w.hero.position.x, w.hero.position.z - 2) < 0.2);
w.toggleLamp();
assert.equal(s.rooms.home.lamp, false);
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
tick(70);
assert(w.animations.length);
tick(100);
assert.equal(w.animations.length, 0);
assert(events.some((e) => e.type === "built"));
assert(group.children.every((g) => g.visible));
assert.equal(s.gems, 90);
console.log(
  "PASS staged construction, rotated entrance, completion and single payment",
);
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
