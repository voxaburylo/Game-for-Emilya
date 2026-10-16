(function (root) {
  "use strict";
  // Extract the outer shoreline of the union of owned rectangles. Adjacent plots
  // share one rocky underside instead of becoming separate floating boxes.
  function shoreline(rects) {
    const xs = [
        ...new Set(rects.flatMap((r) => [r.x - r.w / 2, r.x + r.w / 2])),
      ].sort((a, b) => a - b),
      zs = [
        ...new Set(rects.flatMap((r) => [r.z - r.h / 2, r.z + r.h / 2])),
      ].sort((a, b) => a - b);
    const cells = new Set();
    for (let x = 0; x < xs.length - 1; x++)
      for (let z = 0; z < zs.length - 1; z++) {
        const cx = (xs[x] + xs[x + 1]) / 2,
          cz = (zs[z] + zs[z + 1]) / 2;
        if (
          rects.some(
            (r) => Math.abs(cx - r.x) < r.w / 2 && Math.abs(cz - r.z) < r.h / 2,
          )
        )
          cells.add(x + "," + z);
      }
    const edges = [];
    for (const key of cells) {
      const [x, z] = key.split(",").map(Number),
        a = xs[x],
        b = xs[x + 1],
        c = zs[z],
        d = zs[z + 1];
      if (!cells.has(x - 1 + "," + z))
        edges.push([
          { x: a, z: d },
          { x: a, z: c },
        ]);
      if (!cells.has(x + 1 + "," + z))
        edges.push([
          { x: b, z: c },
          { x: b, z: d },
        ]);
      if (!cells.has(x + "," + (z - 1)))
        edges.push([
          { x: a, z: c },
          { x: b, z: c },
        ]);
      if (!cells.has(x + "," + (z + 1)))
        edges.push([
          { x: b, z: d },
          { x: a, z: d },
        ]);
    }
    return edges;
  }
  function build(rects, options = {}) {
    const T = root.THREE,
      A = root.Art,
      g = new T.Group(),
      edges = shoreline(rects),
      positions = [],
      colors = [],
      indices = [],
      color = new T.Color();
    g.name = "One torn floating island";
    // Render all owned plots as one top mesh. Separate beveled boxes overlap at
    // their borders and make the invisible placement cells look like a grid.
    const xs = [
        ...new Set(rects.flatMap((r) => [r.x - r.w / 2, r.x + r.w / 2])),
      ].sort((a, b) => a - b),
      zs = [
        ...new Set(rects.flatMap((r) => [r.z - r.h / 2, r.z + r.h / 2])),
      ].sort((a, b) => a - b),
      topPositions = [],
      topIndices = [];
    for (let ix = 0; ix < xs.length - 1; ix++)
      for (let iz = 0; iz < zs.length - 1; iz++) {
        const x0 = xs[ix],
          x1 = xs[ix + 1],
          z0 = zs[iz],
          z1 = zs[iz + 1],
          cx = (x0 + x1) / 2,
          cz = (z0 + z1) / 2;
        if (
          !rects.some(
            (r) => Math.abs(cx - r.x) < r.w / 2 && Math.abs(cz - r.z) < r.h / 2,
          )
        )
          continue;
        const base = topPositions.length / 3;
        topPositions.push(
          x0, 0.055, z0,
          x0, 0.055, z1,
          x1, 0.055, z0,
          x1, 0.055, z1,
        );
        topIndices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
      }
    const topGeometry = new T.BufferGeometry();
    topGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(topPositions, 3),
    );
    topGeometry.setIndex(topIndices);
    topGeometry.computeVertexNormals();
    const grassMaterial = new T.MeshStandardMaterial({
        color: "#69a649",
        roughness: 0.96,
      }),
      hash = (n) => {
        const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return value - Math.floor(value);
      };
    // Broad overlapping colour fields read as real ground from a distance.
    // There is deliberately no high-frequency grain: it crawled and sparkled
    // when the camera moved on a phone screen.
    grassMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = "varying vec2 islandGrassP;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nislandGrassP=position.xz;",
      );
      shader.fragmentShader = "varying vec2 islandGrassP;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float broad=sin(islandGrassP.x*.095+sin(islandGrassP.y*.071)*1.9)*.5+.5;
        float crossing=sin(islandGrassP.y*.145-islandGrassP.x*.052)*.5+.5;
        float meadow=sin((islandGrassP.x+islandGrassP.y)*.29+sin(islandGrassP.x*.08))* .5+.5;
        float field=clamp(broad*.52+crossing*.31+meadow*.17,0.,1.);
        vec3 shade=mix(vec3(.70,.87,.64),vec3(1.10,1.055,.79),field);
        diffuseColor.rgb*=shade;`,
      );
    };
    grassMaterial.customProgramCacheKey = () => "emilia-organic-grass-v2";
    const top = new T.Mesh(topGeometry, grassMaterial);
    top.receiveShadow = true;
    g.add(top);
    // A single instanced draw adds sparse real blades. Density is capped, so a
    // six-times larger city remains cheap on phones and older tablets.
    const tuftGeometry = new T.BufferGeometry();
    tuftGeometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(
        [
          -0.06, 0, 0, 0.06, 0, 0, 0.012, 0.22, 0,
          0, 0, -0.06, 0, 0, 0.06, -0.012, 0.2, 0.015,
          -0.05, 0, -0.032, 0.05, 0, 0.032, -0.018, 0.26, 0.012,
          -0.04, 0, 0.045, 0.04, 0, -0.045, 0.025, 0.17, -0.012,
        ],
        3,
      ),
    );
    tuftGeometry.computeVertexNormals();
    const requested = rects.reduce(
        (sum, rect) => sum + Math.max(3, Math.floor((rect.w * rect.h) / 24)),
        0,
      ),
      tuftLimit = options.lowPower ? 180 : 360,
      points = [];
    for (let r = 0; r < rects.length && points.length < tuftLimit; r++) {
      const rect = rects[r],
        count = Math.max(3, Math.floor((rect.w * rect.h) / 24));
      for (let i = 0; i < count && points.length < tuftLimit; i++) {
        const seed = r * 977 + i * 37 + 19,
          x = rect.x + (hash(seed) - 0.5) * Math.max(0, rect.w - 1),
          z = rect.z + (hash(seed + 11) - 0.5) * Math.max(0, rect.h - 1);
        const meadow =
          Math.sin(x * 0.27 + Math.sin(z * 0.11)) +
          Math.sin(z * 0.31 - x * 0.08);
        if (!options.blocked?.(x, z) && meadow > -0.5)
          points.push({ x, z, scale: 0.75 + hash(seed + 23) * 0.65, seed });
      }
    }
    if (points.length && root.ParkAssets?.instances) {
      const tufts = new T.Group(),
        transforms = points.map((point) => ({
          x: point.x,
          y: 0.105,
          z: point.z,
          scale: point.scale,
          height: 0.85 + hash(point.seed + 41) * 0.3,
          rotation: hash(point.seed + 31) * Math.PI * 2,
        }));
      tufts.add(
        root.ParkAssets.instances(
          "grass_A",
          transforms.filter((_, index) => index % 2 === 0),
        ),
        root.ParkAssets.instances(
          "grass_B",
          transforms.filter((_, index) => index % 2 === 1),
        ),
      );
      tufts.name = "Tiny Treats instanced meadow grass";
      g.add(tufts);
    } else if (points.length) {
      const tufts = new T.InstancedMesh(
          tuftGeometry,
          new T.MeshBasicMaterial({
            color: "#ffffff",
            side: T.DoubleSide,
            vertexColors: true,
            toneMapped: false,
          }),
          points.length,
        ),
        helper = new T.Object3D(),
        tuftColors = ["#4c8d3d", "#5b9b43", "#6ba74b", "#79b354", "#568f39"];
      points.forEach((point, i) => {
        helper.position.set(point.x, 0.063, point.z);
        helper.rotation.y = hash(point.seed + 31) * Math.PI;
        helper.scale.set(point.scale, point.scale, point.scale);
        helper.updateMatrix();
        tufts.setMatrixAt(i, helper.matrix);
        tufts.setColorAt(i, new T.Color(tuftColors[i % tuftColors.length]));
      });
      tufts.name = "Fallback instanced grass tufts";
      tufts.frustumCulled = true;
      tufts.receiveShadow = false;
      tufts.castShadow = false;
      g.add(tufts);
    }
    g.userData.grassCount = points.length;
    g.userData.grassRequested = requested;
    const noise = (x, z) =>
      Math.sin(x * 1.73 + z * 0.43) * 0.55 +
      Math.sin(z * 1.13 - x * 0.37) * 0.45;
    const palette = ["#527e34", "#947043", "#8b6549", "#686171", "#41485d"];
    const maxRadius = Math.max(
      ...rects.map((r) => Math.hypot(r.x, r.z) + Math.max(r.w, r.h) / 2),
    );
    const depth = Math.min(80, 14 + maxRadius * 0.65);
    const outward = new Map(),
      key = (p) => p.x.toFixed(4) + "," + p.z.toFixed(4);
    for (const [a, b] of edges) {
      const d = Math.hypot(b.x - a.x, b.z - a.z),
        count = Math.ceil(d / 2);
      for (let i = 0; i <= count; i++) {
        const p = {
            x: a.x + ((b.x - a.x) * i) / count,
            z: a.z + ((b.z - a.z) * i) / count,
          },
          k = key(p),
          v = outward.get(k) || { x: 0, z: 0 };
        v.x += (b.z - a.z) / d;
        v.z -= (b.x - a.x) / d;
        outward.set(k, v);
      }
    }
    for (const v of outward.values()) {
      const d = Math.hypot(v.x, v.z) || 1;
      v.x /= d;
      v.z /= d;
    }
    function point(p, layer) {
      const n = noise(p.x, p.z),
        scale = [1, 1.005, 0.97, 0.8, 0.3][layer],
        j = layer > 1 ? n * 0.85 : 0,
        v = outward.get(key(p)),
        rim = layer < 2 ? 0.55 + n * 0.35 : 0;
      return [
        p.x * scale + j + v.x * rim,
        [0.045, -1.3, -4.6, -depth * 0.66, -depth][layer] +
          (layer > 0 ? n * (layer * 0.65) : 0),
        p.z * scale + j + v.z * rim,
      ];
    }
    const edgePoints = [];
    for (const [a, b] of edges) {
      const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 2);
      for (let i = 0; i < n; i++) {
        const p = {
            x: a.x + ((b.x - a.x) * i) / n,
            z: a.z + ((b.z - a.z) * i) / n,
          },
          q = {
            x: a.x + ((b.x - a.x) * (i + 1)) / n,
            z: a.z + ((b.z - a.z) * (i + 1)) / n,
          };
        edgePoints.push(p);
        for (let layer = 0; layer < 4; layer++) {
          const base = positions.length / 3;
          for (const [v, k] of [
            [p, layer],
            [q, layer],
            [p, layer + 1],
            [q, layer + 1],
          ]) {
            positions.push(...point(v, k));
            color.set(palette[k]).multiplyScalar(0.93 + noise(v.x, v.z) * 0.13);
            colors.push(color.r, color.g, color.b);
          }
          indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
        }
        const rim = positions.length / 3;
        positions.push(
          p.x,
          0.052,
          p.z,
          q.x,
          0.052,
          q.z,
          ...point(p, 0),
          ...point(q, 0),
        );
        color.set("#70aa3e");
        for (let j = 0; j < 4; j++) colors.push(color.r, color.g, color.b);
        indices.push(rim, rim + 2, rim + 1, rim + 1, rim + 2, rim + 3);
        const base = positions.length / 3;
        positions.push(...point(p, 4), ...point(q, 4), 0, -depth - 3, 0);
        color.set(palette[4]);
        for (let j = 0; j < 3; j++) colors.push(color.r, color.g, color.b);
        indices.push(base, base + 1, base + 2);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const rock = new T.Mesh(
      geometry,
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        flatShading: true,
        side: T.DoubleSide,
      }),
    );
    rock.receiveShadow = true;
    g.add(rock);
    const step = Math.max(1, Math.floor(edgePoints.length / 18));
    for (let i = 0; i < edgePoints.length; i += step) {
      const p = edgePoints[i],
        len = 3 + (i % 5) * 0.7;
      for (const side of [-1, 1]) {
        const curve = new T.CatmullRomCurve3([
          new T.Vector3(p.x, -0.3, p.z),
          new T.Vector3(p.x * 0.995 + side * 0.25, -1.8, p.z * 0.995),
          new T.Vector3(p.x * 0.98 + side * 0.45, -len, p.z * 0.98),
          new T.Vector3(
            p.x * 0.96 + side * 0.7,
            -len - 1,
            p.z * 0.96 + side * 0.4,
          ),
        ]);
        const rootMesh = new T.Mesh(
          new T.TubeGeometry(curve, 7, 0.055, 4, false),
          A.mat("#624735"),
        );
        g.add(rootMesh);
      }
      for (let j = 0; j < 3; j++)
        A.ball(
          g,
          j % 2 ? "#5b8c3a" : "#3d7139",
          p.x * 0.998,
          -0.35 - j * 0.42,
          p.z * 0.998,
          0.23,
          0.35,
          0.16,
        );
      if (i % 3 === 0) {
        const pebble = new T.Mesh(
          new T.IcosahedronGeometry(1, 0),
          A.mat("#6b6170"),
        );
        pebble.position.set(p.x * 1.04, -depth * 0.6 - (i % 5), p.z * 1.04);
        pebble.scale.set(1.1, 0.7 + (i % 3) * 0.4, 0.9);
        pebble.rotation.set(i * 0.2, i * 0.6, i * 0.3);
        g.add(pebble);
      }
    }
    g.userData.shoreline = edges;
    return g;
  }
  root.IslandLandscape = { shoreline, build };
  if (typeof module !== "undefined") module.exports = root.IslandLandscape;
})(typeof window !== "undefined" ? window : globalThis);
