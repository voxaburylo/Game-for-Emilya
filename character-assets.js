(function (root) {
  "use strict";
  let library, pending;
  const sharedMaterials = new Map();
  function install(data, buffer) {
    if (data.version !== 1)
      throw new Error("Unsupported character asset version");
    const T = root.THREE;
    const meshes = data.meshes.map((part) => {
      const geometry = new T.BufferGeometry();
      for (const name of ["position", "normal", "color"]) {
        if (!part[name]) continue;
        const a = part[name];
        geometry.setAttribute(
          name,
          new T.BufferAttribute(new Float32Array(buffer, a.offset, a.count), 3),
        );
      }
      geometry.setIndex(
        new T.BufferAttribute(
          new Uint32Array(buffer, part.index.offset, part.index.count),
          1,
        ),
      );
      geometry.computeBoundingSphere();
      geometry.userData.characterShared = true;
      return { ...part, geometry };
    });
    library = { ...data, meshes };
  }
  async function load() {
    if (library) return;
    if (!pending)
      pending = Promise.all([
        fetch("models/characters.json").then((r) => {
          if (!r.ok) throw Error("Character manifest: " + r.status);
          return r.json();
        }),
        fetch("models/characters.bin").then((r) => {
          if (!r.ok) throw Error("Character mesh: " + r.status);
          return r.arrayBuffer();
        }),
      ])
        .then(([data, buffer]) => install(data, buffer))
        .catch((error) => {
          pending = null;
          throw error;
        });
    return pending;
  }
  function instantiate(model, look = {}) {
    if (!library)
      throw Error("Character assets must be loaded before creating the world");
    const T = root.THREE,
      group = new T.Group(),
      nodes = { root: group };
    group.name = model + " · Blender model";
    const pivots = library.pivots[model];
    for (const [key, position] of Object.entries(pivots)) {
      if (key === "root") continue;
      const node = new T.Group();
      const parent = library.parents[key] || "root";
      node.name = key;
      node.position
        .fromArray(position)
        .sub(new T.Vector3().fromArray(pivots[parent]));
      nodes[parent].add(node);
      nodes[key] = node;
    }
    const variants = new Set([
      "base",
      "dress" + look.dress,
      "shoes" + look.shoes,
      "hair" + look.hair,
      look.apple ? "apple" : "",
    ]);
    const instanceMaterials = new Map();
    for (const part of library.meshes) {
      if (part.model !== model || !variants.has(part.variant)) continue;
      const definition = library.materials[part.material],
        painted = !!part.color;
      const key = part.material + ":" + painted;
      const override = look.materials?.[part.material];
      const cache =
        definition.tint || override ? instanceMaterials : sharedMaterials;
      if (!cache.has(key)) {
        const material = new T.MeshStandardMaterial({
          color: painted ? 0xffffff : new T.Color().setRGB(...definition.color),
          roughness: definition.roughness,
          metalness: definition.metalness,
          vertexColors: painted,
        });
        if (definition.tint)
          material.color.set(
            root.TownState.COLORS[look.color] || root.TownState.COLORS[0],
          );
        else if (override) material.color.set(override);
        else material.userData.characterShared = true;
        cache.set(key, material);
      }
      const mesh = new T.Mesh(part.geometry, cache.get(key));
      mesh.name = part.variant + " · " + part.material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      nodes[part.node].add(mesh);
    }
    let torso;
    if (model === "girl") {
      const upper = group.children.filter(
        (o) => o !== nodes.legL && o !== nodes.legR,
      );
      torso = new T.Group();
      torso.name = "Relaxed upper body";
      torso.position.y = 1.28;
      group.add(torso);
      group.updateMatrixWorld(true);
      upper.forEach((o) => torso.attach(o));
    } else if (["dog", "cat", "rabbit", "fox"].includes(model)) {
      const legs = [nodes.legL, nodes.legR, nodes.backL, nodes.backR];
      const upper = group.children.filter((o) => !legs.includes(o));
      torso = new T.Group();
      torso.name = "Animal chest and hips";
      torso.position.set(0, 0.55, -0.1);
      group.add(torso);
      group.updateMatrixWorld(true);
      upper.forEach((o) => torso.attach(o));
    }
    const rig = [];
    if (["dog", "cat", "rabbit", "fox"].includes(model))
      for (const leg of [nodes.legL, nodes.legR, nodes.backL, nodes.backR])
        rig.push(root.PetRig.create(leg, group, model));
    group.userData = {
      characterModel: model,
      torso,
      rig,
      ankles: rig.map((r) => r.ankle),
      head: nodes.head,
      tail: nodes.tail,
      legs:
        model === "girl"
          ? [nodes.legL, nodes.legR]
          : [nodes.legL, nodes.legR, nodes.backL, nodes.backR],
      arms: model === "girl" ? [nodes.armL, nodes.armR] : [],
      eyes: [nodes.eyeL, nodes.eyeR].filter(Boolean),
      ears: [nodes.earL, nodes.earR].filter(Boolean),
    };
    return group;
  }
  function animate(group, time, moving, reduced = false) {
    const data = group?.userData;
    if (!data?.characterModel) return;
    const phase = (time + (data.characterModel === "dog" ? 1.8 : 0)) % 4.7;
    const blink = reduced
      ? 1
      : phase < 0.18
        ? Math.max(0.045, Math.abs(phase - 0.09) / 0.09)
        : 1;
    data.eyes.forEach((eye) => (eye.scale.y = blink));
    if (data.characterModel === "girl") {
      const idle = !moving && !reduced;
      data.head.rotation.z = reduced ? 0 : Math.sin(time * 0.7) * 0.028;
      data.head.rotation.x = reduced
        ? 0
        : moving
          ? Math.sin(time * 11) * 0.015
          : -0.012 + Math.sin(time * 0.85) * 0.025;
      data.head.rotation.y = idle ? Math.sin(time * 0.43) * 0.13 : 0;
      data.torso.rotation.z = idle ? Math.sin(time * 0.68) * 0.012 : 0;
      data.torso.rotation.y = idle ? Math.sin(time * 0.52) * 0.022 : 0;
      data.torso.rotation.x = idle ? Math.sin(time * 0.8) * 0.007 : 0;
      data.torso.position.y = 1.28 + (idle ? Math.sin(time * 1.65) * 0.006 : 0);
    }
    if (data.characterModel === "girl")
      data.ears.forEach((ear, i) => {
        ear.rotation.z = reduced
          ? 0
          : Math.sin(time * (moving ? 12 : 2) + i * 0.7) *
            (moving ? 0.11 : 0.018);
      });
  }
  root.CharacterAssets = {
    load,
    install,
    animate,
    girl: (look) => instantiate("girl", look),
    dog: () => instantiate("dog"),
    pet: (type) => instantiate(type),
    tree: (apple) =>
      instantiate("tree", {
        apple,
        materials: { leaf: "#b4ed8b", leafDark: "#43823b" },
      }),
    cottage: (wall, roof) =>
      instantiate("cottage", {
        materials: {
          plaster: wall,
          roof,
          roofLight: new THREE.Color(roof).multiplyScalar(1.12),
          roofDark: new THREE.Color(roof).multiplyScalar(0.85),
        },
      }),
  };
  if (typeof module !== "undefined") module.exports = root.CharacterAssets;
})(typeof window !== "undefined" ? window : globalThis);
