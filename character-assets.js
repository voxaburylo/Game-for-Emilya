(function (root) {
  "use strict";
  let library, pending;
  const sharedMaterials = new Map();
  function decode(data, buffer) {
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
      if (part.skinIndex)
        geometry.setAttribute(
          "skinIndex",
          new T.Uint16BufferAttribute(
            new Uint16Array(buffer, part.skinIndex.offset, part.skinIndex.count),
            4,
          ),
        );
      if (part.skinWeight)
        geometry.setAttribute(
          "skinWeight",
          new T.Float32BufferAttribute(
            new Float32Array(
              buffer,
              part.skinWeight.offset,
              part.skinWeight.count,
            ),
            4,
          ),
        );
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
    return { ...data, meshes };
  }
  function install(data, buffer) {
    library = decode(data, buffer);
  }
  function installAdditional(data, buffer) {
    const extra = decode(data, buffer);
    library.meshes.push(...extra.meshes);
    Object.assign(library.materials, extra.materials);
    Object.assign(library.pivots, extra.pivots);
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
        fetch("models/cube-pets.json").then((r) => {
          if (!r.ok) throw Error("Cube pets manifest: " + r.status);
          return r.json();
        }),
        fetch("models/cube-pets.bin").then((r) => {
          if (!r.ok) throw Error("Cube pets mesh: " + r.status);
          return r.arrayBuffer();
        }),
      ])
        .then(([data, buffer, pets, petBuffer]) => {
          install(data, buffer);
          installAdditional(pets, petBuffer);
        })
        .catch((error) => {
          pending = null;
          throw error;
        });
    return pending;
  }
  function articulateLimb(limb, cut, label) {
    const T = root.THREE,
      upper = new T.Bone(),
      lower = new T.Bone(),
      meshes = limb.children.filter((child) => child.isMesh);
    upper.name = label + " upper";
    lower.name = label + " joint";
    lower.position.y = cut;
    upper.add(lower);
    limb.add(upper);
    const skeleton = new T.Skeleton([upper, lower]),
      skinned = [];
    for (const source of meshes) {
      const geometry = source.geometry.clone(),
        position = geometry.getAttribute("position"),
        indices = new Uint16Array(position.count * 4),
        weights = new Float32Array(position.count * 4),
        blend = Math.max(0.08, Math.abs(cut) * 0.18);
      geometry.userData.characterShared = false;
      for (let i = 0; i < position.count; i++) {
        const lowerWeight = T.MathUtils.clamp(
          (cut + blend - position.getY(i)) / (blend * 2),
          0,
          1,
        );
        indices[i * 4] = 0;
        indices[i * 4 + 1] = 1;
        weights[i * 4] = 1 - lowerWeight;
        weights[i * 4 + 1] = lowerWeight;
      }
      geometry.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
      geometry.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
      const mesh = new T.SkinnedMesh(geometry, source.material);
      mesh.name = source.name;
      mesh.castShadow = source.castShadow;
      mesh.receiveShadow = source.receiveShadow;
      mesh.frustumCulled = false;
      limb.remove(source);
      limb.add(mesh);
      skinned.push(mesh);
    }
    limb.updateMatrixWorld(true);
    skeleton.calculateInverses();
    for (const mesh of skinned) mesh.bind(skeleton, mesh.matrixWorld);
    return { upper: limb, joint: lower, skeleton, cut };
  }
  function instantiate(model, look = {}) {
    if (!library)
      throw Error("Character assets must be loaded before creating the world");
    const T = root.THREE,
      group = new T.Group(),
      staticPet = model.startsWith("cube-"),
      skinnedModel = model.startsWith("cube-"),
      nodes = { root: group };
    group.name = model + " · Blender model";
    const pivots = library.pivots[model];
    for (const [key, position] of Object.entries(pivots)) {
      if (key === "root") continue;
      const node = skinnedModel ? new T.Bone() : new T.Group();
      const parent =
        skinnedModel && key !== "body"
          ? "body"
          : library.parents[key] || "root";
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
      // The overalls fully cover the legs down to the socks. Keeping the bare
      // leg mesh under the close-fitting trousers lets the knee break through
      // the cloth when it bends, so omit only that hidden skin layer.
      if (
        model === "girl" &&
        look.dress === 3 &&
        part.variant === "base" &&
        part.material === "skin" &&
        (part.node === "legL" || part.node === "legR")
      )
        continue;
      const definition = library.materials[part.material],
        painted = !!part.color,
        cubePaint = painted && model.startsWith("cube-");
      const key = part.material + ":" + painted;
      const override = look.materials?.[part.material];
      const cache =
        definition.tint || override ? instanceMaterials : sharedMaterials;
      if (!cache.has(key)) {
        const material = new T.MeshStandardMaterial({
          // Vertex colors from the CC0 cube pack are lit by a bright outdoor
          // rig. A warm multiplier keeps them solid instead of chalky at the
          // normal play-camera distance while preserving white face details.
          color: painted
            ? cubePaint
              ? new T.Color("#beb7ad")
              : 0xffffff
            : new T.Color().setRGB(...definition.color),
          roughness: cubePaint ? 0.62 : definition.roughness,
          metalness: definition.metalness,
          vertexColors: painted,
          transparent: false,
          opacity: 1,
          depthWrite: true,
        });
        if (cubePaint) material.userData.cubeColorCompensation = true;
        if (definition.tint)
          material.color.set(
            root.TownState.COLORS[look.color] || root.TownState.COLORS[0],
          );
        else if (override) material.color.set(override);
        else material.userData.characterShared = true;
        cache.set(key, material);
      }
      const skinned = !!part.skinIndex;
      const mesh = skinned
        ? new T.SkinnedMesh(part.geometry, cache.get(key))
        : new T.Mesh(part.geometry, cache.get(key));
      mesh.name = part.variant + " · " + part.material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      nodes[skinned ? "root" : part.node].add(mesh);
      if (skinned) {
        group.updateMatrixWorld(true);
        mesh.bind(
          new T.Skeleton(
            ["body", "head", "tail", "legL", "legR", "backL", "backR"].map(
              (name) => nodes[name],
            ),
          ),
        );
        mesh.frustumCulled = false;
      }
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
    } else if (staticPet) {
      torso = nodes.body;
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
    const armRig =
        model === "girl"
          ? [
              articulateLimb(nodes.armL, -0.43, "left elbow"),
              articulateLimb(nodes.armR, -0.43, "right elbow"),
            ]
          : [],
      legRig =
        model === "girl"
          ? [
              articulateLimb(nodes.legL, -0.35, "left knee"),
              articulateLimb(nodes.legR, -0.35, "right knee"),
            ]
          : [];
    const rig = [];
    if (["dog", "cat", "rabbit", "fox"].includes(model))
      for (const leg of [nodes.legL, nodes.legR, nodes.backL, nodes.backR])
        rig.push(root.PetRig.create(leg, group, model));
    if (staticPet)
      for (const leg of [nodes.legL, nodes.legR, nodes.backL, nodes.backR]) {
        const knee = new T.Object3D(),
          ankle = new T.Object3D();
        rig.push({
          hip: leg,
          knee,
          ankle,
          rest: leg.position.clone(),
          foot: new T.Vector3(leg.position.x, 0.18, leg.position.z),
        });
      }
    group.userData = {
      characterModel: model,
      staticPet,
      headingOffset: 0,
      hoverPet: ["cube-bee", "cube-fish", "cube-parrot"].includes(model),
      torso,
      rig,
      armRig,
      legRig,
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
    installAdditional,
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
