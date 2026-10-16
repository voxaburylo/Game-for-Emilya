(function () {
  "use strict";
  const T = THREE;
  const paths = {
    home: "M4 12 12 5l8 7M6 11v10h12V11M10 21v-7h4v7",
    dress: "m9 3-2 5 3 3-5 10h14l-5-10 3-3-2-5M9 3c0 4 6 4 6 0",
    shoe: "M4 10v8h16v-4l-8-2-3-5M4 18v3h16v-3",
    hair: "M5 17V9C5 0 19 0 19 9v8M5 10c5 0 7-5 7-5s1 5 7 5M8 18c2 4 6 4 8 0",
    paw: "M8 13c-6 6-2 10 4 7 6 3 10-1 4-7-2-3-6-3-8 0M5 5v4M10 3v4M15 3v4M20 6v3",
    build: "m3 21 10-10M10 5l4-3 7 7-4 4-7-8M12 12l-3-3",
    book: "M12 6C7 3 3 5 3 5v15s5-2 9 1c4-3 9-1 9-1V5s-4-2-9 1v15",
    sound: "M4 9h4l5-5v16l-5-5H4zM17 8c3 2 3 6 0 8M20 5c5 5 5 9 0 14",
    mute: "M4 9h4l5-5v16l-5-5H4zM17 9l5 6m0-6-5 6",
    back: "m14 5-7 7 7 7M7 12h14",
    check: "m4 12 5 5L20 6",
    close: "m6 6 12 12M6 18 18 6",
    rotate: "M5 9a8 8 0 1 1 0 7M5 3v6h6",
    plus: "M12 4v16M4 12h16",
    minus: "M4 12h16",
    gem: "m3 9 4-5h10l4 5-9 12zM3 9h18M7 4l5 17 5-17",
    gear: "m9 3 6 0 1 4 4 1 1 6-4 2-1 4H9l-1-4-4-1-1-6 4-2zM9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
    play: "m8 4 12 8-12 8z",
    road: "M5 3 2 21M19 3l3 18M12 3v3m0 4v4m0 4v3",
    land: "m3 15 9 6 9-6-9-6zM12 2v9M8 6h8",
    flowers:
      "M12 21v-9M7 17l5 4 5-4M9 6c-6-6-7 6-1 5-2 7 10 7 8 0 6 1 5-11-1-5 2-7-8-7-6 0",
    bench: "M4 5h16v8H4zM2 15h20M5 15v6M19 15v6M8 6v6m8-6v6",
    tree: "M12 21v-7M12 3c-4-4-8 1-6 5-8 6 1 11 6 6 5 5 14 0 6-6 2-4-2-9-6-5",
    swing: "M3 21 6 3h12l3 18M8 3v13m8-13v13M7 16h10v3H7z",
    fountain: "M3 16h18l-3 5H6zM12 16V6M12 8C4-2 3 11 7 11M12 8c8-10 9 3 5 3",
    lamp: "m9 3-4 10h14L15 3zM12 13v7M8 21h8",
    move: "M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4",
    hand: "M7 13V6a2 2 0 0 1 4 0v6-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v8c0 10-10 10-13 5l-3-5c-2-4 1-5 4-1",
    food: "M3 12h18c0 11-18 11-18 0M7 7c-3-4 3-4 0-7M13 7c-3-4 3-4 0-7",
    ball: "M21 12a9 9 0 1 1-18 0 9 9 0 1 1 18 0M7 5l5 7 8-4M12 12l-1 9",
    jump: "M5 15 12 8l7 7M12 8v14M5 3h14",
    ear: "M8 18c0 5 8 5 8-1 0-3 5-4 5-9C21-2 5-2 5 8M10 8c0-5 7-5 7 0 0 3-5 3-5 6",
    save: "M4 3h14l3 3v15H3V3zM7 3v6h10V3M7 21v-8h10v8",
    undo: "m8 4-5 5 5 5M3 9h11c9 0 9 12 0 12",
    moon: "M18 3A9 9 0 1 0 21 17C12 21 5 8 18 3",
    sun: "M12 7a5 5 0 1 1 0 10 5 5 0 1 1 0-10M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  };
  function icon(name, cls = "") {
    return (
      '<svg class="ico ' +
      cls +
      '" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      (paths[name] || paths.home) +
      '"/></svg>'
    );
  }
  function thumb(kind, index = 0, color = "#be7186") {
    if (
      ["dress", "shoes", "hair"].includes(kind) ||
      (kind === "pet" && index === 1)
    ) {
      const file = kind === "pet" ? "dog-0" : kind + "-" + index;
      return `<img class="model-thumb" src="models/thumbs/${file}.png" alt="" draggable="false">`;
    }
    if (kind === "pet") {
      const ears =
        index === 2
          ? '<path d="M29 32C13-8 33-8 35 29M43 29C45-8 65-8 49 32"/>'
          : index === 1
            ? '<ellipse cx="19" cy="37" rx="9" ry="18"/><ellipse cx="59" cy="37" rx="9" ry="18"/>'
            : '<path d="m19 35-1-24 19 17m4 0 18-17-1 24"/>';
      return (
        '<svg viewBox="0 0 80 80" aria-hidden="true"><g fill="' +
        ["#c49a71", "#bd8a60", "#d8c9b8", "#d38d62"][index] +
        '" stroke="#715e50" stroke-width="2">' +
        ears +
        '<ellipse cx="39" cy="44" rx="25" ry="23"/></g><ellipse cx="39" cy="53" rx="12" ry="9" fill="#fff4dc"/><g fill="#3d4543"><circle cx="29" cy="42" r="3"/><circle cx="49" cy="42" r="3"/><path d="m35 50 4 5 4-5z"/></g></svg>'
      );
    }
    return "";
  }
  const mats = new Map(),
    geos = {
      box: new T.BoxGeometry(1, 1, 1),
      ball: new T.SphereGeometry(1, 16, 12),
      cylinder: new T.CylinderGeometry(1, 1, 1, 16),
      cone: new T.ConeGeometry(1, 1, 4),
    };
  const shape = new T.Shape(),
    r = 0.11;
  shape.moveTo(-0.5 + r, -0.5);
  shape.lineTo(0.5 - r, -0.5);
  shape.quadraticCurveTo(0.5, -0.5, 0.5, -0.5 + r);
  shape.lineTo(0.5, 0.5 - r);
  shape.quadraticCurveTo(0.5, 0.5, 0.5 - r, 0.5);
  shape.lineTo(-0.5 + r, 0.5);
  shape.quadraticCurveTo(-0.5, 0.5, -0.5, 0.5 - r);
  shape.lineTo(-0.5, -0.5 + r);
  shape.quadraticCurveTo(-0.5, -0.5, -0.5 + r, -0.5);
  geos.round = new T.ExtrudeGeometry(shape, {
    depth: 0.82,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.04,
    bevelThickness: 0.09,
    curveSegments: 4,
  });
  geos.round.translate(0, 0, -0.41);
  function mat(c) {
    if (!mats.has(c))
      mats.set(c, new T.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    return mats.get(c);
  }
  function mesh(g, type, c, x, y, z, a, b = a, d = a) {
    const m = new T.Mesh(geos[type], mat(c));
    m.position.set(x, y, z);
    m.scale.set(a, b, d);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  const box = (g, c, x, y, z, a, b, d) => mesh(g, "round", c, x, y, z, a, b, d),
    ball = (g, c, x, y, z, a, b = a, d = a) =>
      mesh(g, "ball", c, x, y, z, a, b, d),
    cyl = (g, c, x, y, z, a, b, d = a) =>
      mesh(g, "cylinder", c, x, y, z, a, b, d);
  function group(g, x = 0, y = 0, z = 0) {
    const n = new T.Group();
    n.position.set(x, y, z);
    if (g) g.add(n);
    return n;
  }
  function tube(g, c, a, b, r) {
    const d = new T.Vector3().subVectors(b, a),
      m = cyl(
        g,
        c,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        (a.z + b.z) / 2,
        r,
        d.length(),
        r,
      );
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function avatar(look) {
    return CharacterAssets.girl(look);
  }
  function pet(type) {
    if (type === "dog") return CharacterAssets.dog();
    const g = new T.Group(),
      fur = {
        cat: "#c6a078",
        dog: "#ac805c",
        rabbit: "#ded0bf",
        fox: "#d68e5a",
      }[type],
      cream = "#fff0d8";
    ball(g, fur, 0, 0.49, -0.1, 0.4, 0.43, 0.61);
    const head = group(g, 0, 0.87, 0.4);
    ball(head, fur, 0, 0, 0, 0.43, 0.4, 0.38);
    ball(head, cream, 0, -0.12, 0.29, 0.27, 0.18, 0.14);
    [-1, 1].forEach((s) => {
      if (type === "dog")
        ball(head, "#795c46", s * 0.4, -0.05, -0.02, 0.15, 0.34, 0.2);
      else if (type === "rabbit") {
        const ear = ball(head, fur, s * 0.2, 0.48, -0.05, 0.12, 0.47, 0.11);
        ear.rotation.z = s * -0.12;
        ball(head, "#dcaea9", s * 0.2, 0.51, 0.025, 0.055, 0.33, 0.035);
      } else {
        const ear = mesh(
          head,
          "cone",
          fur,
          s * 0.29,
          0.36,
          0,
          0.22,
          0.45,
          0.18,
        );
        ear.rotation.y = Math.PI / 4;
        mesh(
          head,
          "cone",
          "#dca49a",
          s * 0.29,
          0.37,
          0.12,
          0.11,
          0.25,
          0.045,
        ).rotation.y = Math.PI / 4;
      }
      ball(head, "#35463f", s * 0.16, 0.03, 0.33, 0.046, 0.065, 0.025);
      ball(head, "#ffffff", s * 0.15, 0.05, 0.35, 0.013);
      for (const z of [-0.45, 0.27])
        box(g, fur, s * 0.25, 0.14, z, 0.22, 0.27, 0.3);
    });
    ball(head, "#674a43", 0, -0.07, 0.43, 0.07, 0.045, 0.04);
    const tail = group(g, 0, 0.5, -0.62);
    if (type === "rabbit") ball(tail, cream, 0, 0, 0, 0.2);
    else if (type === "cat") {
      tube(tail, fur, new T.Vector3(), new T.Vector3(0.1, 0.65, -0.2), 0.08);
      ball(tail, "#886548", 0.1, 0.65, -0.2, 0.085);
    } else {
      ball(tail, fur, 0, 0.13, -0.18, 0.2, 0.22, 0.45);
      ball(tail, cream, 0, 0.2, -0.48, 0.16, 0.16, 0.18);
    }
    g.userData = { head, tail };
    return g;
  }
  function flower(g, x, z, color) {
    cyl(g, "#6b926c", x, 0.32, z, 0.025, 0.5);
    for (let i = 0; i < 5; i++)
      ball(
        g,
        color,
        x + Math.cos(i * 1.256) * 0.1,
        0.6,
        z + Math.sin(i * 1.256) * 0.1,
        0.09,
        0.055,
        0.09,
      );
    ball(g, "#eacb74", x, 0.65, z, 0.055);
  }
  function tree(g, x, z, apple = false) {
    const n = group(g, x, 0, z);
    cyl(n, "#9c7657", 0, 1, 0, 0.2, 2);
    ball(n, "#769c79", 0, 2.4, 0, 1.05, 1.2, 0.95);
    ball(n, "#8bac80", -0.45, 2.9, 0.1, 0.7, 0.8, 0.7);
    ball(n, "#94b88b", 0.55, 2.5, 0.2, 0.7, 0.75, 0.7);
    if (apple)
      for (let i = 0; i < 6; i++)
        ball(
          n,
          "#c97a66",
          Math.sin(i * 2.3) * 0.7,
          2.1 + (i % 3) * 0.4,
          Math.cos(i * 2.3) * 0.75,
          0.12,
        );
    return n;
  }
  function furniture(kind) {
    const g = new T.Group();
    if (kind === "sofa") {
      box(g, "#94aca0", 0, 0.72, 0, 2.8, 0.7, 1.2);
      box(g, "#78988b", 0, 1.2, -0.5, 2.8, 0.9, 0.26);
      [-1.3, 1.3].forEach((x) => box(g, "#78988b", x, 1, 0, 0.3, 0.75, 1.3));
      [-0.65, 0.65].forEach((x) =>
        box(g, "#bfd0b2", x, 1.03, 0.08, 1.1, 0.15, 0.8),
      );
      for (const x of [-1, 1])
        for (const z of [-0.4, 0.4]) cyl(g, "#9b7858", x, 0.25, z, 0.08, 0.5);
    }
    if (kind === "table") {
      cyl(g, "#caa77c", 0, 0.95, 0, 1.05, 0.14, 0.75);
      for (let i = 0; i < 3; i++)
        cyl(
          g,
          "#9b7858",
          Math.cos(i * 2.094) * 0.6,
          0.48,
          Math.sin(i * 2.094) * 0.45,
          0.065,
          0.95,
        );
      cyl(g, "#af8290", 0.15, 1.15, 0, 0.14, 0.3);
      flower(g, -0.2, 0, "#eac6a6");
    }
    if (kind === "rug") {
      cyl(g, "#d9b49b", 0, 0.025, 0, 2, 0.05, 1.5);
      cyl(g, "#e7d4b4", 0, 0.06, 0, 1.78, 0.025, 1.3);
      cyl(g, "#b68b7e", 0, 0.08, 0, 0.45, 0.02, 0.45);
    }
    return g;
  }
  function item(kind) {
    const g = new T.Group();
    if (kind === "flowers") {
      box(g, "#b68e65", 0, 0.28, 0, 1.7, 0.5, 1.4);
      box(g, "#6c5945", 0, 0.55, 0, 1.5, 0.05, 1.2);
      for (let i = 0; i < 8; i++) {
        const f = group(
          g,
          (i % 4) * 0.36 - 0.55,
          0.4,
          Math.floor(i / 4) * 0.5 - 0.25,
        );
        flower(f, 0, 0, ["#e0a1ac", "#ead19a", "#b8a7c8"][i % 3]);
      }
    }
    if (kind === "tree") g.add(tree(null, 0, 0, true));
    if (kind === "bench") {
      const m = furniture("sofa");
      m.traverse((o) => {
        if (o.isMesh && o.position.y > 0.7) o.material = mat("#c7a077");
      });
      m.scale.setScalar(0.65);
      g.add(m);
    }
    if (kind === "swing") {
      for (const x of [-1.5, 1.5]) {
        tube(
          g,
          "#aa825d",
          new T.Vector3(x, 0, -0.6),
          new T.Vector3(x, 2.8, 0),
          0.08,
        );
        tube(
          g,
          "#aa825d",
          new T.Vector3(x, 0, 0.6),
          new T.Vector3(x, 2.8, 0),
          0.08,
        );
      }
      box(g, "#aa825d", 0, 2.8, 0, 3.3, 0.18, 0.2);
      const seat = group(g, 0, 2.7, 0);
      for (const x of [-0.5, 0.5]) cyl(seat, "#e7d5b7", x, -0.8, 0, 0.025, 1.6);
      box(seat, "#be8192", 0, -1.6, 0, 1.5, 0.15, 0.7);
      g.userData.swing = seat;
    }
    if (kind === "fountain") {
      cyl(g, "#cec5ad", 0, 0.2, 0, 1.65, 0.4);
      cyl(g, "#7eafb4", 0, 0.44, 0, 1.4, 0.05);
      cyl(g, "#e1d5bc", 0, 0.9, 0, 0.22, 1.1);
      ball(g, "#afd6d0", 0, 1.5, 0, 0.23, 0.55, 0.23);
    }
    return g;
  }
  function dispose(g) {
    const sharedG = new Set(Object.values(geos)),
      sharedM = new Set(mats.values());
    g.traverse((o) => {
      if (
        o.geometry &&
        !o.geometry.userData.characterShared &&
        !sharedG.has(o.geometry)
      )
        o.geometry.dispose();
      for (const m of o.material
        ? Array.isArray(o.material)
          ? o.material
          : [o.material]
        : []) {
        if (!m.userData.characterShared && !sharedM.has(m)) {
          if (m.map) m.map.dispose();
          m.dispose();
        }
      }
    });
  }
  window.Art = {
    dispose,
    icon,
    thumb,
    mat,
    mesh,
    box,
    ball,
    cyl,
    group,
    tube,
    avatar,
    pet,
    tree,
    flower,
    furniture,
    item,
  };
})();
