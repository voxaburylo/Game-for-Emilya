(function (root) {
  "use strict";
  const MATERIALS = ["sand", "stone", "brick", "wood", "stepping"],
    BORDERS = ["none", "stone", "brick", "flowers"];
  const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  function smooth(raw) {
    const clean = [];
    for (const p of raw) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return [];
      if (!clean.length || distance(p, clean.at(-1)) > 0.15)
        clean.push({ x: p.x, z: p.z });
    }
    if (clean.length < 2) return clean;
    let points = clean;
    for (let k = 0; k < 2; k++) {
      const next = [points[0]];
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1];
        next.push(
          { x: 0.75 * a.x + 0.25 * b.x, z: 0.75 * a.z + 0.25 * b.z },
          { x: 0.25 * a.x + 0.75 * b.x, z: 0.25 * a.z + 0.75 * b.z },
        );
      }
      next.push(points.at(-1));
      points = next;
    }
    const sampled = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        n = Math.max(1, Math.ceil(distance(a, b) / 0.35));
      for (let j = 1; j <= n; j++)
        sampled.push({
          x: a.x + ((b.x - a.x) * j) / n,
          z: a.z + ((b.z - a.z) * j) / n,
        });
    }
    return sampled;
  }
  function length(points) {
    return points.slice(1).reduce((v, p, i) => v + distance(p, points[i]), 0);
  }
  function price(points, border) {
    return (
      Math.max(1, Math.ceil(length(points) / 6)) + (border === "none" ? 0 : 1)
    );
  }
  function valid(paths) {
    return (
      paths === undefined ||
      (Array.isArray(paths) &&
        paths.length <= 400 &&
        new Set(paths.map((p) => p?.id)).size === paths.length &&
        paths.every(
          (p) =>
            p &&
            Number.isInteger(p.id) &&
            p.id > 0 &&
            MATERIALS.includes(p.material) &&
            BORDERS.includes(p.border) &&
            Number.isInteger(p.paid) &&
            p.paid >= 0 &&
            p.paid <= 100 &&
            Array.isArray(p.points) &&
            p.points.length >= 2 &&
            p.points.length <= 240 &&
            p.points.every(
              (q) =>
                q &&
                Number.isFinite(q.x) &&
                Number.isFinite(q.z) &&
                Math.abs(q.x) <= root.ParkCatalog.bounds.x &&
                Math.abs(q.z) <= root.ParkCatalog.bounds.z,
            ),
        ))
    );
  }
  function pointOK(s, p, r = 0.9) {
    const S = root.TownState;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        x = p.x + Math.cos(a) * r,
        z = p.z + Math.sin(a) * r;
      if (!S.inside(s, x, z, 0.08) || S.water(x, z)) return false;
    }
    return ![...S.FIXED, ...S.NATURAL, ...s.objects.map(S.footprint)].some(
      (b) => S.overlaps({ x: p.x, z: p.z, w: r, h: r }, b),
    );
  }
  function error(s, raw, material, border) {
    if (!MATERIALS.includes(material) || !BORDERS.includes(border))
      return "Обери покриття";
    if (!Array.isArray(raw) || raw.length < 2)
      return "Проведи пальцем по землі";
    if (
      raw.length > 240 ||
      raw.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.z))
    )
      return "Доріжка надто довга";
    if (length(raw) > 500) return "Поділи довгу доріжку на декілька частин";
    const points = smooth(raw);
    if (length(points) < 0.7) return "Проведи трохи довшу доріжку";
    if (points.some((p) => !pointOK(s, p, border === "none" ? 0.78 : 0.98)))
      return "Проведи по вільній землі, оминаючи споруди";
    if ((s.paths || []).length >= 400) return "Спочатку прибери одну доріжку";
    if (s.gems < price(points, border)) return "Потрібно ще трохи кристалів";
    return "";
  }
  function add(s, raw, material, border) {
    if (error(s, raw, material, border)) return null;
    const points = raw.map((p) => ({
      x: Math.round(p.x * 100) / 100,
      z: Math.round(p.z * 100) / 100,
    }));
    if (error(s, points, material, border)) return null;
    const paid = price(smooth(points), border),
      id = Math.max(0, ...(s.paths || []).map((p) => p.id)) + 1,
      path = { id, points, material, border, paid };
    s.paths = s.paths || [];
    s.paths.push(path);
    s.gems -= paid;
    return path;
  }
  function remove(s, id) {
    const index = (s.paths || []).findIndex((p) => p.id === id);
    if (index < 0) return false;
    s.gems += s.paths[index].paid;
    s.paths.splice(index, 1);
    return true;
  }
  function near(s, raw) {
    const stroke = smooth(raw);
    return (s.paths || [])
      .filter((p) =>
        smooth(p.points).some((a) => stroke.some((b) => distance(a, b) < 1.3)),
      )
      .map((p) => p.id);
  }
  function intersectsObject(path, box) {
    return smooth(path.points).some((p) =>
      root.TownState.overlaps({ x: p.x, z: p.z, w: 1, h: 1 }, box),
    );
  }
  // Raised ribbons follow the drawn centre line; edges are actual curb geometry.
  function mesh(raw, material, border, preview) {
    const T = root.THREE,
      A = root.Art,
      g = new T.Group(),
      p = smooth(raw);
    if (!p.length) return g;
    const colors = {
      sand: "#d8be89",
      stone: "#bac2c2",
      brick: "#c57c5c",
      wood: "#b38b58",
      stepping: "#d2c7ad",
    };
    function strip(from, to, y, color) {
      const verts = [],
        indices = [];
      p.forEach((v, i) => {
        const a = p[Math.max(0, i - 1)],
          b = p[Math.min(p.length - 1, i + 1)],
          len = Math.hypot(b.x - a.x, b.z - a.z) || 1,
          nx = -(b.z - a.z) / len,
          nz = (b.x - a.x) / len;
        verts.push(
          v.x + nx * from,
          y,
          v.z + nz * from,
          v.x + nx * to,
          y,
          v.z + nz * to,
          v.x + nx * from,
          0.09,
          v.z + nz * from,
          v.x + nx * to,
          0.09,
          v.z + nz * to,
        );
        if (i) {
          const k = i * 4,
            q = k - 4;
          indices.push(
            q,
            k,
            q + 1,
            q + 1,
            k,
            k + 1,
            q,
            q + 2,
            k,
            q + 2,
            k + 2,
            k,
            q + 1,
            k + 1,
            q + 3,
            q + 3,
            k + 1,
            k + 3,
          );
        }
      });
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mat = new T.MeshStandardMaterial({
        color,
        roughness: 0.9,
        side: T.DoubleSide,
        transparent: !!preview,
        opacity: preview ? 0.65 : 1,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });
      const m = new T.Mesh(geo, mat);
      m.receiveShadow = true;
      g.add(m);
    }
    strip(-0.73, 0.73, 0.18, preview || colors[material]);
    if (preview) return g;
    for (const v of [p[0], p.at(-1)]) {
      const geo = new T.CircleGeometry(0.73, 20);
      geo.rotateX(-Math.PI / 2);
      const m = new T.Mesh(
        geo,
        new T.MeshStandardMaterial({
          color: colors[material],
          roughness: 0.95,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
      );
      m.position.set(v.x, 0.181, v.z);
      m.receiveShadow = true;
      g.add(m);
    }
    let travelled = 0,
      next = 0;
    p.forEach((v, i) => {
      if (i) travelled += distance(v, p[i - 1]);
      if (travelled < next) return;
      next = travelled + (material === "wood" ? 0.38 : 0.9);
      const a = p[Math.max(0, i - 1)],
        b = p[Math.min(p.length - 1, i + 1)],
        angle = Math.atan2(b.x - a.x, b.z - a.z);
      if (material !== "sand") {
        const detail = new T.Group();
        detail.position.set(v.x, 0.215, v.z);
        detail.rotation.y = angle;
        if (material === "wood")
          A.box(detail, "#d3ab75", 0, 0, 0, 1.4, 0.06, 0.3);
        else if (material === "stepping") {
          const m = A.cyl(detail, "#e0d7bd", 0, 0, 0, 0.55, 0.07);
          m.scale.z = 0.75;
        } else
          for (const side of [-1, 1])
            A.box(
              detail,
              material === "brick" ? "#dfac84" : "#d2d4c9",
              side * 0.35,
              0,
              0,
              0.61,
              0.035,
              0.7,
            );
        g.add(detail);
      }
      if (border === "flowers" && i % 2 === 0) {
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        for (const s of [-1, 1]) {
          const f = new T.Group();
          f.position.set(
            v.x - ((b.z - a.z) / len) * 0.92 * s,
            0.14,
            v.z + ((b.x - a.x) / len) * 0.92 * s,
          );
          A.flower?.(f, 0, 0, i % 3 ? "#f2c861" : "#ed97a9");
          if (!f.children.length) {
            A.ball(f, "#5f9650", 0, 0.1, 0, 0.18);
            A.ball(f, "#e7a0af", 0, 0.25, 0, 0.12);
          }
          g.add(f);
        }
      }
    });
    if (["stone", "brick"].includes(border))
      for (const sign of [-1, 1])
        strip(
          sign * 0.74,
          sign * 0.94,
          0.28,
          border === "brick" ? "#a96d52" : "#e1d6bc",
        );
    // Reuse repeated paving stones and flowers in a handful of GPU draw calls.
    g.updateMatrixWorld(true);
    const batches = new Map();
    g.traverse((o) => {
      if (o.isMesh) {
        const key = o.geometry.uuid + o.material.uuid;
        if (!batches.has(key)) batches.set(key, []);
        batches.get(key).push(o);
      }
    });
    for (const meshes of batches.values()) {
      if (meshes.length < 2) continue;
      const first = meshes[0],
        batch = new T.InstancedMesh(
          first.geometry,
          first.material,
          meshes.length,
        );
      batch.castShadow = first.castShadow;
      batch.receiveShadow = true;
      meshes.forEach((m, i) => {
        batch.setMatrixAt(i, m.matrixWorld);
        m.removeFromParent();
      });
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
      g.add(batch);
    }
    return g;
  }
  const api = {
    MATERIALS,
    BORDERS,
    smooth,
    length,
    price,
    valid,
    error,
    add,
    remove,
    near,
    pointOK,
    intersectsObject,
    mesh,
  };
  root.GardenPaths = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
