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
    group.name =
      model === "girl" ? "Емілія · Blender model" : "Песик · Blender model";
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
    ]);
    const instanceMaterials = new Map();
    for (const part of library.meshes) {
      if (part.model !== model || !variants.has(part.variant)) continue;
      const definition = library.materials[part.material],
        painted = !!part.color;
      const key = part.material + ":" + painted;
      const cache = definition.tint ? instanceMaterials : sharedMaterials;
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
        else material.userData.characterShared = true;
        cache.set(key, material);
      }
      const mesh = new T.Mesh(part.geometry, cache.get(key));
      mesh.name = part.variant + " · " + part.material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      nodes[part.node].add(mesh);
    }
    group.userData = {
      characterModel: model,
      head: nodes.head,
      tail: nodes.tail,
      legs:
        model === "girl"
          ? [nodes.legL, nodes.legR]
          : [nodes.legL, nodes.legR, nodes.backL, nodes.backR],
      arms: model === "girl" ? [nodes.armL, nodes.armR] : [],
      eyes: [nodes.eyeL, nodes.eyeR],
      ears: model === "dog" ? [nodes.earL, nodes.earR] : [],
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
      data.head.rotation.z = reduced ? 0 : Math.sin(time * 1.1) * 0.018;
      data.head.rotation.x = moving ? Math.sin(time * 11) * 0.015 : 0;
    }
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
  };
  if (typeof module !== "undefined") module.exports = root.CharacterAssets;
})(typeof window !== "undefined" ? window : globalThis);
