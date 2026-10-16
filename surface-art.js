(function () {
  "use strict";
  const T = THREE,
    cache = new Map();
  let seed = 193;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  function texture(kind) {
    if (cache.has(kind)) return cache.get(kind);
    const c = document.createElement("canvas");
    c.width = 1536;
    c.height = kind === "wood" ? 1280 : 1024;
    const x = c.getContext("2d"),
      w = c.width,
      h = c.height;
    if (kind === "wood") {
      x.fillStyle = "#84694d";
      x.fillRect(0, 0, w, h);
      const row = 80,
        len = 384;
      for (let y = 0; y < h; y += row)
        for (let bx = -len; bx < w; bx += len) {
          const left = bx + ((y / row) % 3) * 128,
            tone = random() * 15;
          x.fillStyle = `rgb(${191 + tone},${157 + tone},${113 + tone})`;
          x.fillRect(left + 2, y + 2, len - 3, row - 3);
          x.save();
          x.beginPath();
          x.rect(left + 3, y + 3, len - 5, row - 5);
          x.clip();
          for (let j = 0; j < 85; j++) {
            const yy = y + random() * row,
              phase = random() * 6;
            x.strokeStyle =
              j % 3 ? "rgba(102,66,35,.075)" : "rgba(255,236,197,.15)";
            x.lineWidth = 0.4 + random();
            x.beginPath();
            for (let a = 0; a <= len; a += 8) {
              const b =
                yy +
                Math.sin(a * 0.018 + phase) * 2 +
                Math.sin(a * 0.041 + phase) * 0.65;
              a ? x.lineTo(left + a, b) : x.moveTo(left + a, b);
            }
            x.stroke();
          }
          if (random() < 0.32) {
            const kx = left + 80 + random() * 210,
              ky = y + 20 + random() * 40;
            for (let r = 2; r < 20; r += 2) {
              x.beginPath();
              x.ellipse(kx, ky, r * 2.4, r * 0.28, 0, 0, Math.PI * 2);
              x.strokeStyle = "rgba(102,66,35,.10)";
              x.stroke();
            }
          }
          x.restore();
          x.fillStyle = "rgba(255,240,211,.3)";
          x.fillRect(left + 3, y + 2, len - 5, 1);
        }
    } else {
      x.fillStyle = "#e5d7bb";
      x.fillRect(0, 0, w, h);
      for (const [inset, color, width] of [
        [55, "#9caca0", 58],
        [111, "#b88774", 9],
        [143, "#b9bca6", 6],
      ]) {
        x.strokeStyle = color;
        x.lineWidth = width;
        x.beginPath();
        x.roundRect(inset, inset, w - inset * 2, h - inset * 2, 100);
        x.stroke();
      }
      x.strokeStyle = "#a4b3a3";
      x.lineWidth = 10;
      for (let i = 0; i < 5; i++) {
        const cx = 340 + i * 210,
          cy = h / 2;
        x.beginPath();
        x.moveTo(cx, cy - 90);
        x.lineTo(cx + 65, cy);
        x.lineTo(cx, cy + 90);
        x.lineTo(cx - 65, cy);
        x.closePath();
        x.stroke();
        x.fillStyle = "#be927c";
        x.beginPath();
        x.arc(cx, cy, 12, 0, Math.PI * 2);
        x.fill();
      }
      for (let yy = 0; yy < h; yy += 3) {
        x.strokeStyle = yy % 6 ? "rgba(255,252,231,.22)" : "rgba(97,76,53,.12)";
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(0, yy);
        x.lineTo(w, yy);
        x.stroke();
      }
      for (let xx = 0; xx < w; xx += 4) {
        x.strokeStyle = "rgba(255,250,228,.16)";
        x.beginPath();
        x.moveTo(xx, 0);
        x.lineTo(xx, h);
        x.stroke();
      }
      for (let i = 0; i < 12000; i++) {
        x.fillStyle =
          random() > 0.5 ? "rgba(255,251,233,.16)" : "rgba(99,79,56,.08)";
        x.fillRect(random() * w, random() * h, 1, 2);
      }
    }
    const map = new T.CanvasTexture(c);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    const bump = new T.CanvasTexture(c);
    bump.anisotropy = 4;
    const material = new T.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: kind === "wood" ? 0.018 : 0.025,
      roughness: kind === "wood" ? 0.62 : 1,
    });
    material.userData.characterShared = true;
    cache.set(kind, material);
    return material;
  }
  function floor() {
    const m = new T.Mesh(new T.PlaneGeometry(12, 10), texture("wood"));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.045;
    m.receiveShadow = true;
    return m;
  }
  function rug() {
    const g = new T.Group(),
      shape = new T.Shape(),
      w = 2,
      h = 1.45,
      r = 0.25;
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.quadraticCurveTo(w, -h, w, -h + r);
    shape.lineTo(w, h - r);
    shape.quadraticCurveTo(w, h, w - r, h);
    shape.lineTo(-w + r, h);
    shape.quadraticCurveTo(-w, h, -w, h - r);
    shape.lineTo(-w, -h + r);
    shape.quadraticCurveTo(-w, -h, -w + r, -h);
    const geo = new T.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.018,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 12,
    });
    const pos = geo.attributes.position,
      uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++)
      uv.setXY(i, (pos.getX(i) + w) / (w * 2), (pos.getY(i) + h) / (h * 2));
    const m = new T.Mesh(geo, texture("rug"));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.075;
    m.receiveShadow = true;
    m.castShadow = true;
    g.add(m);
    const strands = [];
    for (let side of [-1, 1])
      for (let i = 0; i < 68; i++) {
        const z = -1.25 + (i * 2.5) / 67;
        strands.push(
          side * 1.98,
          0.078,
          z,
          side * (2.15 + random() * 0.04),
          0.065,
          z + Math.sin(i) * 0.012,
        );
      }
    const fg = new T.BufferGeometry();
    fg.setAttribute("position", new T.Float32BufferAttribute(strands, 3));
    g.add(
      new T.LineSegments(fg, new T.LineBasicMaterial({ color: "#d7c7a5" })),
    );
    return g;
  }
  function normals() {
    const n = 128,
      data = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const a = (x / n) * Math.PI * 2,
          b = (y / n) * Math.PI * 2,
          i = (y * n + x) * 4;
        const v = new T.Vector3(
          Math.cos(a * 4 + b * 3) * 0.22 + Math.cos(a * 9 - b * 5) * 0.1,
          Math.sin(b * 5 + a * 2) * 0.25,
          1,
        ).normalize();
        data[i] = (v.x * 0.5 + 0.5) * 255;
        data[i + 1] = (v.y * 0.5 + 0.5) * 255;
        data[i + 2] = (v.z * 0.5 + 0.5) * 255;
        data[i + 3] = 255;
      }
    const t = new T.DataTexture(data, n, n);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.magFilter = T.LinearFilter;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  function lake() {
    const normal = normals(),
      m = new T.Water(new T.CircleGeometry(1, 96), {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: normal,
        sunDirection: new T.Vector3(-15, 28, 18).normalize(),
        sunColor: 0xffeed5,
        waterColor: 0x398c81,
        distortionScale: 0.85,
        alpha: 1,
      });
    m.rotation.x = -Math.PI / 2;
    m.scale.set(3.6, 2.8, 1);
    m.position.set(12, 0.13, 8);
    m.material.uniforms.size.value = 38;
    m.material.vertexShader = m.material.vertexShader
      .replace(
        "uniform float time;",
        "uniform float time; varying vec2 pondUv;",
      )
      .replace(
        "mirrorCoord = modelMatrix",
        "pondUv = uv; mirrorCoord = modelMatrix",
      );
    m.material.fragmentShader = m.material.fragmentShader
      .replace(
        "uniform float time;",
        "uniform float time; varying vec2 pondUv;",
      )
      .replace("float rf0 = 0.3;", "float rf0 = 0.16;")
      .replace(
        "vec3 outgoingLight = albedo;",
        `float radius=length(pondUv-.5)*2.;
      float shallows=smoothstep(.65,1.,radius);
      float ripple=sin(worldPosition.x*6.+worldPosition.z*3.+time*2.)*sin(worldPosition.z*7.-worldPosition.x*2.-time);
      float caustic=pow(max(0.,ripple),8.)*.035;
      vec3 outgoingLight=mix(albedo,vec3(.16,.37,.29),shallows*.38)+caustic;
      float foam=smoothstep(.975,1.,radius)*(.65+.35*sin(worldPosition.x*8.+worldPosition.z*9.+time));
      outgoingLight=mix(outgoingLight,vec3(.60,.72,.58),foam*.48);`,
      );
    const dispose = m.dispose;
    m.dispose = () => {
      dispose();
      normal.dispose();
    };
    return m;
  }
  function lakePlants() {
    const g = new T.Group(),
      green = new T.MeshStandardMaterial({
        color: "#728f54",
        roughness: 0.8,
        side: T.DoubleSide,
      });
    for (const [x, z, r] of [
      [10.5, 9.8, 0.33],
      [10.9, 10.1, 0.22],
      [13, 6, 0.3],
      [13.6, 6.1, 0.23],
    ]) {
      const s = new T.Shape();
      s.moveTo(0, 0);
      s.absarc(0, 0, r, 0.2, Math.PI * 2 - 0.2, false);
      s.lineTo(0, 0);
      const leaf = new T.Mesh(new T.ShapeGeometry(s, 28), green);
      leaf.rotation.x = -Math.PI / 2;
      leaf.rotation.z = x;
      leaf.position.set(x, 0.155, z);
      g.add(leaf);
      const vein = new T.BufferGeometry().setFromPoints([
        new T.Vector3(x, 0.16, z),
        new T.Vector3(x + r * 0.75, 0.16, z),
      ]);
      g.add(new T.Line(vein, new T.LineBasicMaterial({ color: "#a1b77b" })));
    }
    const stem = new T.MeshStandardMaterial({ color: "#6e8755", roughness: 1 });
    for (const [x, z] of [
      [9.4, 6],
      [14.8, 6.4],
      [10.4, 10.7],
    ])
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4,
          h = 0.35 + random() * 0.4,
          dx = Math.cos(a) * 0.14,
          dz = Math.sin(a) * 0.14;
        const curve = new T.CatmullRomCurve3([
          new T.Vector3(x + dx, 0.11, z + dz),
          new T.Vector3(x + dx * 1.2, h * 0.6, z + dz),
          new T.Vector3(x + dx * 1.8, h, z + dz * 1.5),
        ]);
        g.add(new T.Mesh(new T.TubeGeometry(curve, 5, 0.012, 4, false), stem));
        const shape = new T.Shape();
        shape.moveTo(0, 0);
        shape.quadraticCurveTo(0.08, h * 0.5, 0.015, h);
        shape.quadraticCurveTo(-0.04, h * 0.4, 0, 0);
        const leaf = new T.Mesh(new T.ShapeGeometry(shape, 5), green);
        leaf.position.set(x + dx, 0.1, z + dz);
        leaf.rotation.y = a;
        leaf.rotation.z = Math.cos(a) * 0.3;
        g.add(leaf);
      }
    return g;
  }
  function ocean() {
    const mat = new T.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:
        `varying vec2 p;uniform float time;void main(){float a=sin(p.x*.8+p.y*.37+time*.5);float b=sin(p.x*1.7-p.y*.9-time*.3);float v=a*.55+b*.2;vec3 c=mix(vec3(.24,.48,.53),vec3(.43,.65,.65),v*.5+.5);c+=pow(max(0.,a*b),18.)*.12;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(
          ";#include",
          ";\n#include",
        ),
    });
    const m = new T.Mesh(new T.PlaneGeometry(160, 160), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = -1.2;
    return m;
  }
  window.SurfaceArt = { floor, rug, lake, lakePlants, ocean };
})();
