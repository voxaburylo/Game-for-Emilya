(function (root) {
  "use strict";
  let library, pending;
  const parts = [],
    materials = [];
  function install(data, buffer, textures = {}) {
    const T = root.THREE;
    library = data;
    parts.length = 0;
    materials.length = 0;
    for (const m of data.materials) {
      const mat = new T.MeshStandardMaterial({
        color: new T.Color().setRGB(...m.color.slice(0, 3)),
        map: textures[m.texture] || null,
        roughness: m.roughness,
        metalness: m.metalness,
        side: m.doubleSide ? T.DoubleSide : T.FrontSide,
      });
      mat.userData.parkShared = true;
      materials.push(mat);
    }
    for (const model of Object.values(data.models))
      for (const p of model.parts) {
        const g = new T.BufferGeometry();
        for (const [name, size] of [
          ["position", 3],
          ["normal", 3],
          ["uv", 2],
        ]) {
          const a = p[name];
          g.setAttribute(
            name,
            new T.BufferAttribute(
              new Float32Array(buffer, a.offset, a.count),
              size,
            ),
          );
        }
        g.setIndex(
          new T.BufferAttribute(
            new Uint32Array(buffer, p.index.offset, p.index.count),
            1,
          ),
        );
        g.computeBoundingSphere();
        g.userData.parkShared = true;
        p.geometry = g;
        p.id = parts.length;
        parts.push(p);
      }
  }
  async function load() {
    if (library) return;
    if (pending) return pending;
    pending = (async () => {
      const [data, buffer] = await Promise.all([
        fetch("models/park/park.json").then((r) => {
          if (!r.ok) throw Error("Park models unavailable");
          return r.json();
        }),
        fetch("models/park/park.bin").then((r) => {
          if (!r.ok) throw Error("Park geometry unavailable");
          return r.arrayBuffer();
        }),
      ]);
      const textures = {};
      await Promise.all(
        [...new Set(data.materials.map((m) => m.texture).filter(Boolean))].map(
          async (name) => {
            const t = await new root.THREE.TextureLoader().loadAsync(
              "models/park/" + name,
            );
            t.flipY = false;
            t.colorSpace = root.THREE.SRGBColorSpace;
            t.userData.parkShared = true;
            textures[name] = t;
          },
        ),
      );
      install(data, buffer, textures);
    })().catch((e) => {
      pending = null;
      throw e;
    });
    return pending;
  }
  function model(name) {
    const T = root.THREE,
      g = new T.Group(),
      m = library?.models[name];
    if (!m) throw Error("Missing park asset " + name);
    for (const p of m.parts) {
      const mesh = new T.Mesh(p.geometry, materials[p.material]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.parkPart = p.id;
      g.add(mesh);
    }
    return g;
  }
  function fit(g, width, depth, height) {
    const T = root.THREE,
      b = new T.Box3().setFromObject(g),
      size = b.getSize(new T.Vector3()),
      scale = Math.min(
        width / Math.max(0.01, size.x),
        depth / Math.max(0.01, size.z),
        height / Math.max(0.01, size.y),
      );
    g.scale.multiplyScalar(scale);
    g.position.set(
      (-(b.min.x + b.max.x) / 2) * scale,
      -b.min.y * scale,
      (-(b.min.z + b.max.z) / 2) * scale,
    );
    return g;
  }
  function create(kind) {
    const def = root.ParkCatalog.items.find((i) => i.id === kind);
    if (!def) return null;
    const T = root.THREE,
      g = new T.Group();
    const add = (name, x, z, height, width = 1, depth = width, y = 0) => {
      const a = fit(model(name), width, depth, height);
      a.position.x += x;
      a.position.z += z;
      a.position.y += y;
      g.add(a);
      return a;
    };
    if (def.model === "meadow") {
      for (let i = 0; i < 7; i++)
        add(
          i % 2 ? "flower_A" : "flower_B",
          ((i % 3) - 1) * 0.65,
          (Math.floor(i / 3) - 1) * 0.55,
          0.75,
          0.6,
          0.6,
        );
    } else if (def.model === "fountain-garden") {
      add("fountain", 0, 0, 3.3, 3.3, 3.3);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        add(
          i % 2 ? "flower_A" : "flower_B",
          Math.cos(a) * 1.8,
          Math.sin(a) * 1.8,
          0.55,
          0.6,
          0.6,
        );
      }
    } else if (
      ["picnic-red", "picnic-blue", "picnic-green", "tea-picnic"].includes(kind)
    ) {
      const color =
        kind === "picnic-blue"
          ? "blue"
          : kind === "picnic-green"
            ? "green"
            : "red";
      add("picnic_picnic_blanket_" + color, 0, 0, 0.2, 3.2, 3.2);
      add("picnic_picnic_basket_round", -0.85, -0.7, 0.8, 0.9, 0.9, 0.08);
      add("picnic_teapot", 0.65, -0.3, 0.45, 0.5, 0.5, 0.08);
      add("picnic_mug", 0.9, 0.3, 0.22, 0.3, 0.3, 0.08);
      add("picnic_apple", -0.6, 0.45, 0.25, 0.3, 0.3, 0.08);
      add("picnic_sandwich", 0.15, 0.3, 0.25, 0.4, 0.4, 0.08);
      if (kind === "tea-picnic") {
        add("picnic_mug", -0.5, -0.1, 0.3, 0.4, 0.4, 0.08);
        add("flower_B", 0.65, 0.8, 0.5, 0.45, 0.45, 0.08);
        add("picnic_sandwich", -0.15, 0.8, 0.25, 0.4, 0.4, 0.08);
      }
    } else if (Array.isArray(def.model)) {
      for (const part of def.model) {
        const [name, x = 0, z = 0, height = def.height, width = def.w * 1.75, depth = def.h * 1.75, y = 0] =
          typeof part === "string" ? [part] : part;
        add(name, x, z, height, width, depth, y);
      }
    } else g.add(fit(model(def.model), def.w * 1.75, def.h * 1.75, def.height));
    if (def.action === "splash") {
      const material = new T.MeshStandardMaterial({
          color: "#73d5e0",
          transparent: true,
          opacity: 0.75,
          roughness: 0.18,
        }),
        water = new T.InstancedMesh(
          new T.SphereGeometry(0.045, 7, 5),
          material,
          18,
        );
      water.frustumCulled = false;
      g.userData.fountainHeight = new T.Box3().setFromObject(g).max.y * 0.92;
      g.add(water);
      g.userData.fountainDrops = water;
    }
    g.userData.parkKind = kind;
    g.userData.parkAction = def.action;
    g.userData.activatedUntil = 0;
    animate(g, 0);
    return g;
  }
  function animate(g, time, reduced = false) {
    const active = g.userData.activatedUntil > time;
    if (g.userData.fountainDrops) {
      const height = g.userData.fountainHeight,
        water = g.userData.fountainDrops,
        matrix = new root.THREE.Matrix4();
      water.visible = !reduced;
      if (!reduced) {
        for (let i = 0; i < 18; i++) {
          const phase = (time * (active ? 0.7 : 0.35) + i / 18) % 1,
            a = i * 2.399;
          matrix.makeTranslation(
            Math.cos(a) * phase * 0.65,
            height + Math.sin(phase * Math.PI) * (active ? 0.9 : 0.45),
            Math.sin(a) * phase * 0.65,
          );
          water.setMatrixAt(i, matrix);
        }
        water.instanceMatrix.needsUpdate = true;
      }
    }
    if (g.userData.parkAction === "light")
      g.children[0].traverse((o) => {
        if (o.isMesh && o.material.userData.parkInstance)
          o.material.emissiveIntensity = active ? 0.45 : 0;
      });
    if (g.userData.parkAction === "gate" && g.children[0])
      g.children[0].rotation.y = active ? Math.PI * 0.42 : 0;
  }
  function react(g, time) {
    g.userData.activatedUntil = time + 4;
    if (g.userData.parkAction === "light")
      g.traverse((o) => {
        if (o.isMesh && !o.material.userData.parkInstance) {
          o.material = o.material.clone();
          o.material.userData = { parkInstance: true };
          o.material.emissive.set("#e9b45c");
        }
      });
  }
  const api = { load, install, create, animate, react, parts, materials };
  root.ParkAssets = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
