(function (root) {
  "use strict";
  const T = root.THREE;
  function create(leg, group, model) {
    const meshes = leg.children.filter((n) => n.isMesh),
      hip = new T.Bone(),
      knee = new T.Bone(),
      ankle = new T.Bone();
    const upper = leg.position.y - 0.43,
      lower = 0.25;
    leg.add(hip);
    hip.add(knee);
    knee.add(ankle);
    knee.position.y = -upper;
    ankle.position.y = -lower;
    const anchor = new T.Bone();
    leg.add(anchor);
    group.updateMatrixWorld(true);
    const skeleton = new T.Skeleton([hip, knee, ankle, anchor]);
    for (const old of meshes) {
      const g = old.geometry.clone(),
        p = g.attributes.position,
        indices = new Uint16Array(p.count * 4),
        weights = new Float32Array(p.count * 4);
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) + leg.position.y,
          top = T.MathUtils.smoothstep(y, 0.39, 0.6),
          foot = 1 - T.MathUtils.smoothstep(y, 0.17, 0.3);
        indices[i * 4] = 0;
        indices[i * 4 + 1] = 1;
        indices[i * 4 + 2] = 2;
        weights[i * 4] = top;
        weights[i * 4 + 1] = (1 - top) * (1 - foot);
        weights[i * 4 + 2] = (1 - top) * foot;
        if (model === "rabbit" && leg.name.startsWith("back")) {
          const fixed = T.MathUtils.smoothstep(y, 0.17, 0.36);
          weights[i * 4] *= 1 - fixed;
          weights[i * 4 + 1] *= 1 - fixed;
          weights[i * 4 + 2] *= 1 - fixed;
          indices[i * 4 + 3] = 3;
          weights[i * 4 + 3] = fixed;
        }
      }
      g.setAttribute("skinIndex", new T.Uint16BufferAttribute(indices, 4));
      g.setAttribute("skinWeight", new T.Float32BufferAttribute(weights, 4));
      g.userData.characterShared = false;
      const mesh = new T.SkinnedMesh(g, old.material);
      mesh.name = old.name;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      leg.add(mesh);
      group.updateMatrixWorld(true);
      mesh.bind(skeleton, mesh.matrixWorld);
      leg.remove(old);
    }
    return {
      hip,
      knee,
      ankle,
      upper,
      lower,
      rest: leg.position.clone(),
      foot: new T.Vector3(leg.position.x, 0.18, leg.position.z),
    };
  }
  const rotation = new T.Quaternion(),
    hipTarget = new T.Vector3(),
    footTarget = new T.Vector3();
  function pose(pet, b, state, time, dt, reduced) {
    const d = pet.userData,
      type = d.characterModel,
      blend = reduced ? 1 : 1 - Math.exp(-dt * 10);
    if (type === "shiba") {
      for (let i = 0; i < 4; i++) {
        const r = d.rig[i],
          phase = b.distance * 10 + (i % 2 ? Math.PI : 0);
        let target = state === "walk" && !reduced ? Math.sin(phase) * .28 : 0;
        if (state === "sit") target = i < 2 ? -.08 : .32;
        if (state === "lie") target = i < 2 ? .42 : -.2;
        if (state === "stretch" && i < 2) target = .35;
        r.hip.rotation.x += (target - r.hip.rotation.x) * blend;
        r.knee.rotation.x = -r.hip.rotation.x * .35;
        r.ankle.rotation.x = -r.hip.rotation.x - r.knee.rotation.x;
      }
      return;
    }
    rotation.setFromEuler(d.torso.rotation);
    for (let i = 0; i < 4; i++) {
      const r = d.rig[i],
        leg = d.legs[i];
      hipTarget
        .copy(r.rest)
        .sub(b.rest.body)
        .applyQuaternion(rotation)
        .add(d.torso.position);
      // Hips follow the torso; planted feet stay in ground coordinates.
      leg.position.copy(hipTarget);
      leg.rotation.set(0, 0, 0);
      footTarget.set(r.rest.x, 0.18, r.rest.z);
      if (["sit", "stroke", "groom", "stamp"].includes(state) && i >= 2)
        footTarget.z += type === "rabbit" ? 0.18 : 0.22;
      if (state === "lie") {
        footTarget.z += i < 2 ? 0.32 : 0.13;
      }
      if (state === "stretch" && i < 2) footTarget.z += 0.22;
      if (state === "groom" && (i === 0 || (type === "rabbit" && i === 1))) {
        footTarget.y = type === "rabbit" ? 0.62 : 0.68;
        footTarget.z = type === "rabbit" ? 0.57 : 0.66;
        if (!reduced) footTarget.y += Math.sin(time * 7) * 0.02;
      }
      if (state === "stamp" && i === 3 && !reduced)
        footTarget.y += Math.max(0, Math.sin(time * 19)) * 0.09;
      if (state === "walk" && !reduced) {
        const offsets =
          type === "rabbit"
            ? [0, 0, Math.PI, Math.PI]
            : type === "cat"
              ? [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5]
              : [0, Math.PI, Math.PI, 0];
        const phase = b.distance * (type === "rabbit" ? 13 : 10) + offsets[i];
        footTarget.z += Math.sin(phase) * (type === "rabbit" ? 0.15 : 0.18);
        footTarget.y +=
          Math.max(0, Math.cos(phase)) * (type === "rabbit" ? 0.08 : 0.07);
      }
      r.foot.lerp(footTarget, blend);
      const y = r.foot.y - leg.position.y,
        z = r.foot.z - leg.position.z;
      const distance = Math.max(
        0.045,
        Math.min(Math.hypot(y, z), r.upper + r.lower - 0.002),
      );
      const bend = i < 2 ? -1 : 1;
      const a = Math.atan2(z, -y),
        h = Math.acos(
          T.MathUtils.clamp(
            (r.upper * r.upper + distance * distance - r.lower * r.lower) /
              (2 * r.upper * distance),
            -1,
            1,
          ),
        );
      const k = Math.acos(
        T.MathUtils.clamp(
          (distance * distance - r.upper * r.upper - r.lower * r.lower) /
            (2 * r.upper * r.lower),
          -1,
          1,
        ),
      );
      r.hip.rotation.x = -(a + bend * h);
      r.knee.rotation.x = bend * k;
      r.ankle.rotation.x = -r.hip.rotation.x - r.knee.rotation.x;
      r.ankle.rotation.z = state === "groom" && i === 0 ? -0.12 : 0;
    }
  }
  root.PetRig = { create, pose };
  if (typeof module !== "undefined") module.exports = root.PetRig;
})(typeof window !== "undefined" ? window : globalThis);
