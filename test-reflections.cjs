const assert = require("node:assert/strict");
global.THREE = require("./three.min.js");
require("./vendor/reflector.js");
require("./vendor/water.js");
const T = THREE;
for (const Camera of [T.PerspectiveCamera, T.OrthographicCamera])
  for (const Type of [T.Reflector, T.Water]) {
    const c =
      Camera === T.PerspectiveCamera
        ? new Camera(50, 1, 0.1, 100)
        : new Camera(-5, 5, 5, -5, 0.1, 100);
    c.position.set(1, 2, 6);
    c.lookAt(0, 1, 0);
    c.updateMatrixWorld();
    const m = new Type(new T.PlaneGeometry(3, 4), { multisample: 0 });
    m.updateMatrixWorld();
    const initial = {},
      scene = new T.Scene();
    scene.add(m);
    let target = initial,
      captured;
    const renderer = {
      xr: { enabled: true },
      shadowMap: { autoUpdate: true },
      state: { buffers: { depth: { setMask() {} } }, viewport() {} },
      getRenderTarget: () => target,
      setRenderTarget: (t) => (target = t),
      render(s, cam) {
        captured = cam;
        assert.equal(m.visible, false);
        assert.equal(this.xr.enabled, false);
      },
      autoClear: true,
    };
    m.onBeforeRender(renderer, scene, c);
    assert(captured);
    assert.equal(captured.type, c.type);
    assert(
      Math.abs(captured.position.z + 6) < 1e-7,
      "camera reflected behind plane",
    );
    assert(Math.abs(captured.position.x - 1) < 1e-7);
    assert(captured.projectionMatrix.elements.every(Number.isFinite));
    assert(Math.abs(captured.projectionMatrix.determinant()) > 1e-9);
    // The mirror plane becomes the near plane under either projection type.
    const onPlane = new T.Vector3(0, 1, 0)
      .applyMatrix4(captured.matrixWorldInverse)
      .applyMatrix4(captured.projectionMatrix);
    assert(Math.abs(onPlane.z + 1) < 1e-6, "oblique near plane");
    assert.equal(target, initial);
    assert.equal(renderer.xr.enabled, true);
    assert.equal(renderer.shadowMap.autoUpdate, true);
    assert.equal(m.visible, true);
    captured = null;
    c.position.z = -6;
    c.updateMatrixWorld();
    m.onBeforeRender(renderer, scene, c);
    assert.equal(captured, null, "opaque back does not reflect");
    m.dispose();
  }
console.log(
  "PASS mirror/water: perspective and orthographic reflection, clipping plane, opaque back, renderer restoration",
);
