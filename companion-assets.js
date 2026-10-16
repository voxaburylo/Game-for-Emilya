(function (root) {
  "use strict";
  const T = root.THREE,
    types = ["turtle", "chicken", "zombie"];
  function create(type) {
    const g = new T.Group(),
      body = new T.Group(),
      head = new T.Group(),
      tail = new T.Group(),
      legs = [],
      arms = [],
      eyes = [];
    g.add(body, head, tail);
    const mats = new Map();
    function material(color) {
      if (!mats.has(color))
        mats.set(color, new T.MeshStandardMaterial({ color, roughness: 0.78 }));
      return mats.get(color);
    }
    function mesh(parent, geo, color, x, y, z) {
      const m = new T.Mesh(geo, material(color));
      m.position.set(x, y, z);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
      return m;
    }
    function oval(parent, color, x, y, z, rx, ry, rz) {
      const m = mesh(parent, new T.SphereGeometry(1, 24, 16), color, x, y, z);
      m.scale.set(rx, ry, rz);
      return m;
    }
    function box(parent, color, x, y, z, w, h, d) {
      return mesh(parent, new T.BoxGeometry(w, h, d), color, x, y, z);
    }
    function eye(x, y, z, size) {
      const e = new T.Group();
      e.position.set(x, y, z);
      head.add(e);
      oval(e, "#fffdf2", 0, 0, 0, size, size * 1.1, 0.035);
      oval(e, "#263c35", 0, 0, 0.029, size * 0.64, size * 0.75, 0.022);
      oval(
        e,
        "#ffffff",
        -size * 0.2,
        size * 0.23,
        0.048,
        size * 0.18,
        size * 0.18,
        0.009,
      );
      eyes.push(e);
    }
    if (type === "turtle") {
      // Continuous shell; scute seams follow its surface without overlapping plates.
      body.position.y = 0.3;
      oval(body, "#d6b76b", 0, -0.08, 0, 0.57, 0.13, 0.7);
      const shell = oval(body, "#ffffff", 0, 0.15, -0.03, 0.6, 0.4, 0.73);
      shell.material = new T.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.8,
      });
      shell.material.onBeforeCompile = (shader) => {
        shader.vertexShader = "varying vec3 shellP;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nshellP=position;",
        );
        shader.fragmentShader =
          "varying vec3 shellP;\n" + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          vec2 p=shellP.xz;float first=length(p),second=10.,cell=0.;
          for(int i=0;i<8;i++){float a=float(i)*.785398;float d=length(p-vec2(cos(a),sin(a))*.66);
            if(d<first){second=first;first=d;cell=float(i)+1.;}else{second=min(second,d);}}
          float seam=smoothstep(.012,.043,second-first);
          vec3 scute=mix(vec3(.10,.24,.055),vec3(.24,.36,.075),.5+.5*sin(cell*2.2));
          scute*=.92+.08*cos(first*25.);
          diffuseColor.rgb*=mix(vec3(.035,.10,.045),scute,seam);`,
        );
      };
      const rim = new T.Mesh(
        new T.TorusGeometry(1, 0.055, 8, 48),
        material("#a9b64a"),
      );
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(0.57, 0.7, 0.65);
      rim.position.y = 0.03;
      body.add(rim);
      head.position.set(0, 0.39, 0.63);
      oval(head, "#86aa58", 0, 0, 0.08, 0.24, 0.2, 0.29);
      oval(head, "#b9c874", 0, -0.09, 0.23, 0.18, 0.09, 0.15);
      eye(-0.13, 0.065, 0.27, 0.068);
      eye(0.13, 0.065, 0.27, 0.068);
      for (const x of [-0.055, 0.055])
        oval(head, "#577841", x, 0.005, 0.366, 0.016, 0.012, 0.01);
      for (let i = 0; i < 4; i++) {
        const l = new T.Group(),
          s = i % 2 ? 1 : -1;
        l.position.set(s * 0.43, 0.2, i < 2 ? 0.43 : -0.43);
        g.add(l);
        legs.push(l);
        oval(l, "#7c9f4b", s * 0.06, -0.04, 0, 0.17, 0.13, 0.23);
        for (let j = 0; j < 3; j++)
          oval(
            l,
            "#e4d49a",
            s * 0.06 + (j - 1) * 0.055,
            -0.09,
            0.18,
            0.025,
            0.026,
            0.05,
          );
      }
      tail.position.set(0, 0.23, -0.69);
      const t = mesh(
        tail,
        new T.ConeGeometry(0.085, 0.28, 12),
        "#8baa53",
        0,
        0,
        -0.08,
      );
      t.rotation.x = -Math.PI / 2;
    } else if (type === "chicken") {
      body.position.y = 0.65;
      box(body, "#f5f0dc", 0, 0, 0, 0.62, 0.65, 0.66);
      box(body, "#e7e4cf", 0, -0.28, 0.02, 0.5, 0.12, 0.53);
      head.position.set(0, 1.03, 0.26);
      box(head, "#fffbee", 0, 0, 0, 0.47, 0.47, 0.43);
      for (const x of [-0.25, 0.25]) {
        box(head, "#fff8db", x, 0.05, 0.05, 0.025, 0.13, 0.13);
        box(head, "#263b37", x * 1.02, 0.05, 0.085, 0.03, 0.08, 0.065);
      }
      box(head, "#edaa31", 0, -0.08, 0.3, 0.27, 0.12, 0.22);
      box(head, "#df5b43", 0, -0.24, 0.25, 0.14, 0.2, 0.1);
      for (let i = 0; i < 3; i++)
        box(
          head,
          "#e54c43",
          0,
          0.28 + (i % 2) * 0.05,
          (i - 1) * 0.12,
          0.1,
          0.17,
          0.13,
        );
      for (const s of [-1, 1]) {
        const wing = new T.Group();
        wing.position.set(s * 0.31, 0.77, -0.03);
        g.add(wing);
        box(wing, "#dedac4", s * 0.08, -0.13, 0, 0.16, 0.36, 0.43);
        arms.push(wing);
      }
      for (const s of [-1, 1]) {
        const leg = new T.Group();
        leg.position.set(s * 0.16, 0.36, 0);
        g.add(leg);
        box(leg, "#dca239", 0, -0.1, 0, 0.065, 0.24, 0.065);
        box(leg, "#edb747", 0, -0.23, 0.1, 0.21, 0.055, 0.28);
        legs.push(leg);
      }
      tail.position.set(0, 0.72, -0.4);
      box(tail, "#e4ddc9", 0, 0.08, -0.06, 0.34, 0.3, 0.13);
      tail.rotation.x = -0.35;
    } else {
      body.position.y = 0.85;
      box(body, "#32a49d", 0, 0, 0, 0.48, 0.63, 0.28);
      box(body, "#25857e", 0, -0.25, 0.16, 0.49, 0.12, 0.035);
      box(body, "#efd175", 0.13, 0.09, 0.16, 0.13, 0.14, 0.025);
      box(body, "#f1e7bb", 0.13, 0.09, 0.178, 0.025, 0.11, 0.018);
      head.position.set(0, 1.35, 0);
      box(head, "#83b764", 0, 0, 0, 0.53, 0.49, 0.46);
      box(head, "#639246", 0, 0.235, -0.04, 0.55, 0.09, 0.41);
      for (const s of [-1, 1]) {
        box(head, "#f4f3d6", s * 0.14, 0.03, 0.24, 0.13, 0.14, 0.025);
        box(head, "#304735", s * 0.14, 0.02, 0.257, 0.052, 0.075, 0.014);
        box(head, "#accb7e", s * 0.21, -0.09, 0.24, 0.09, 0.055, 0.015);
      }
      box(head, "#3e6841", 0, -0.13, 0.243, 0.16, 0.025, 0.015);
      box(head, "#f9f0cf", 0.035, -0.115, 0.256, 0.04, 0.035, 0.012);
      for (const s of [-1, 1]) {
        const arm = new T.Group();
        arm.position.set(s * 0.32, 1.1, 0);
        g.add(arm);
        box(arm, "#32a49d", 0, -0.12, 0, 0.16, 0.28, 0.2);
        box(arm, "#87b76b", 0, -0.36, 0, 0.15, 0.25, 0.18);
        arms.push(arm);
        const leg = new T.Group();
        leg.position.set(s * 0.135, 0.57, 0);
        g.add(leg);
        box(leg, "#6b65a2", 0, -0.2, 0, 0.2, 0.4, 0.24);
        box(leg, "#c7ad77", 0, -0.44, 0.06, 0.23, 0.11, 0.34);
        legs.push(leg);
      }
      // A crooked little sprout makes this a friendly garden zombie.
      const sprout = mesh(
        head,
        new T.CylinderGeometry(0.013, 0.02, 0.19, 6),
        "#407b3f",
        0.13,
        0.34,
        0,
      );
      sprout.rotation.z = -0.3;
      oval(head, "#88bb4a", 0.22, 0.43, 0, 0.09, 0.035, 0.045);
    }
    g.userData = {
      characterModel: type,
      companion: true,
      torso: body,
      head,
      tail,
      legs,
      arms,
      eyes,
      ears: [],
      baseHead: head.position.clone(),
      baseBody: body.position.clone(),
    };
    return g;
  }
  const cycles = {
    turtle: [
      ["look", 4],
      ["stretch", 3],
      ["hide", 4],
      ["look", 5],
    ],
    chicken: [
      ["look", 3],
      ["peck", 4],
      ["flap", 2.5],
      ["look", 4],
      ["shake", 2],
    ],
    zombie: [
      ["look", 3],
      ["wave", 3],
      ["scratch", 4],
      ["dance", 4],
      ["look", 4],
    ],
  };
  const names = {
    hide: "ховається в панцир",
    peck: "клює зернятка",
    flap: "махає крильцями",
    wave: "вітається",
    scratch: "чухає потилицю",
    dance: "кумедно танцює",
  };
  function animate(
    pet,
    { time, dt, distance = 0, action = "", reduced = false },
  ) {
    const d = pet.userData,
      type = d.characterModel,
      b = d.behavior || (d.behavior = { idle: 0, distance: 0, name: "look" }),
      moving = distance > 0.0005;
    b.distance += distance;
    if (moving || action) b.idle = 0;
    else b.idle += dt;
    let state = moving ? "walk" : action || "look";
    if (!moving && !action && !reduced) {
      const seq = cycles[type];
      let t = b.idle % seq.reduce((n, a) => n + a[1], 0);
      for (const [name, len] of seq) {
        if (t < len) {
          state = name;
          break;
        }
        t -= len;
      }
    }
    if (state === "feed") state = type === "chicken" ? "peck" : "sniff";
    if (state === "stroke") state = type === "zombie" ? "wave" : "look";
    const blend = reduced ? 1 : 1 - Math.exp(-dt * 7),
      w = reduced ? 0 : Math.sin(time * 2),
      gait = b.distance * (type === "turtle" ? 15 : 12);
    const hx =
      state === "peck"
        ? 0.7 + Math.max(0, Math.sin(time * 7)) * 0.3
        : state === "sniff"
          ? 0.3
          : state === "scratch"
            ? -0.12
            : 0;
    d.head.rotation.x += (hx - d.head.rotation.x) * blend;
    d.head.rotation.y +=
      ((moving || reduced ? 0 : Math.sin(time * 0.8) * 0.23) -
        d.head.rotation.y) *
      blend;
    const desired = b.headTarget || (b.headTarget = new T.Vector3());
    desired.copy(d.baseHead);
    if (type === "turtle") {
      b.retract =
        (b.retract || 0) +
        ((state === "hide" ? 1 : 0) - (b.retract || 0)) * blend;
      desired.z -= b.retract * 0.35;
      d.head.scale.setScalar(1 - b.retract * 0.35);
      if (state === "stretch") desired.z += 0.07;
    }
    if (type === "chicken" && state === "peck") {
      desired.y -= 0.45;
      desired.z += 0.35;
    }
    d.head.position.lerp(desired, blend);
    d.legs.forEach((l, i) => {
      const angle =
        moving && !reduced
          ? Math.sin(gait + i * Math.PI) * (type === "turtle" ? 0.18 : 0.3)
          : state === "dance" && !reduced
            ? Math.sin(time * 5 + i * Math.PI) * 0.26
            : 0;
      l.rotation.x += (angle - l.rotation.x) * blend;
    });
    d.arms.forEach((a, i) => {
      const side = i ? 1 : -1;
      let x = 0,
        z = 0;
      if (type === "chicken") {
        z =
          state === "flap" && !reduced
            ? side * (0.6 + Math.sin(time * 14) * 0.4)
            : side * 0.08;
      } else {
        x = moving ? -0.75 : 0;
        if (state === "wave" && i === 1) {
          z = 1.8 + (reduced ? 0 : Math.sin(time * 5) * 0.3);
        }
        if (state === "scratch" && i === 0) {
          z = 2.8;
          x = -0.55 + (reduced ? 0 : Math.sin(time * 8) * 0.08);
        }
        if (state === "dance") {
          z = side * 0.8;
          x = reduced ? 0 : Math.sin(time * 4 + i);
        }
      }
      a.rotation.x += (x - a.rotation.x) * blend;
      a.rotation.z += (z - a.rotation.z) * blend;
    });
    d.torso.rotation.z = reduced
      ? 0
      : state === "dance"
        ? Math.sin(time * 5) * 0.08
        : state === "shake"
          ? Math.sin(time * 18) * 0.06
          : w * 0.008;
    b.name = state;
    return {
      state,
      moving,
      bounce: reduced
        ? 0
        : moving
          ? Math.abs(Math.sin(gait)) * (type === "turtle" ? 0.005 : 0.025)
          : state === "flap"
            ? Math.max(0, Math.sin(time * 4)) * 0.08
            : 0,
      label: names[state] || state,
    };
  }
  function thumb(type) {
    const shape =
      type === "turtle"
        ? '<ellipse cx="40" cy="45" rx="25" ry="19" fill="#447a46"/><path d="M20 42 31 30 47 30 60 43 50 56 30 57Z" fill="#83a64a" stroke="#315f3e" stroke-width="3"/><ellipse cx="64" cy="48" rx="11" ry="10" fill="#a5bb66"/><circle cx="67" cy="44" r="2.5" fill="#263d30"/>'
        : type === "chicken"
          ? '<path d="M23 30h34v31H23Z" fill="#eee6cd"/><path d="M32 16h26v27H32Z" fill="#fffbee"/><path d="M40 10h8v9h-8Z" fill="#e75942"/><path d="M50 31h15v8H50Z" fill="#efb436"/><circle cx="48" cy="27" r="3" fill="#263d30"/><path d="M31 61v10m18-10v10" stroke="#dda234" stroke-width="5"/>'
          : '<path d="M23 40h34v28H23Z" fill="#329e98"/><path d="M22 12h36v32H22Z" fill="#83b764"/><path d="M28 23h9v9h-9m15-9h9v9h-9" fill="#f7f1d8"/><path d="M32 26h4v5h-4m11-5h4v5h-4" fill="#304735"/><path d="M34 37h12" stroke="#304735" stroke-width="2"/><path d="M23 68h13v8H23m21-8h13v8H44" fill="#6b65a2"/>';
    return (
      '<svg class="model-thumb" viewBox="0 0 80 80" aria-hidden="true">' +
      shape +
      "</svg>"
    );
  }
  root.CompanionAssets = { types, create, animate, names, cycles, thumb };
})(typeof window !== "undefined" ? window : globalThis);
