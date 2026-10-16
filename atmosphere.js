(function (root) {
  "use strict";
  const T = root.THREE;
  function cliff(x, z, w, h) {
    const positions = [],
      colors = [],
      indices = [],
      rings = 5,
      n = 32;
    const rock = new T.Color();
    for (let j = 0; j < rings; j++)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2,
          dx = Math.cos(a),
          dz = Math.sin(a),
          edge = 1 / Math.max(Math.abs(dx), Math.abs(dz));
        const taper = [1, 0.997, 0.98, 0.7, 0.08][j],
          noise = j > 2 ? Math.sin(i * 2.31 + j * 1.73) * 0.045 : 0;
        positions.push(
          dx * edge * w * 0.5 * (taper + noise),
          [-0.16, -1.8, -3.9, -6.8, -10][j] +
            (j > 1 ? Math.sin(i * 1.7 + j) * 0.5 : 0),
          dz * edge * h * 0.5 * (taper + noise),
        );
        rock.set(
          j === 0
            ? "#508d38"
            : j === 1
              ? "#9e744b"
              : j === 2
                ? "#997357"
                : j === 3
                  ? "#6c6072"
                  : "#4a506c",
        );
        rock.multiplyScalar(0.86 + 0.18 * (0.5 + 0.5 * Math.sin(i * 2.23 + j)));
        colors.push(rock.r, rock.g, rock.b);
        if (j < rings - 1) {
          const a = j * n + i,
            b = j * n + ((i + 1) % n),
            c = (j + 1) * n + i,
            d = (j + 1) * n + ((i + 1) % n);
          indices.push(a, c, b, b, c, d);
        }
      }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    const m = new T.Mesh(
      g,
      new T.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        side: T.DoubleSide,
      }),
    );
    m.position.set(x, 0, z);
    m.receiveShadow = true;
    return m;
  }
  function cloudGeometry() {
    const positions = [],
      normals = [],
      indices = [];
    for (const [x, y, z, r] of [
      [-2, 0, 0, 1.7],
      [0, 0.45, 0, 2],
      [2, 0, 0, 1.5],
      [-0.8, 1.25, 0.1, 1.5],
      [1, 1, 0.1, 1.3],
      [0, -0.3, 1, 1.5],
    ]) {
      const g = new T.SphereGeometry(1, 16, 10),
        base = positions.length / 3;
      for (let i = 0; i < g.attributes.position.count; i++) {
        const p = g.attributes.position,
          n = g.attributes.normal;
        positions.push(
          x + p.getX(i) * r,
          y + p.getY(i) * r * 0.62,
          z + p.getZ(i) * r * 0.75,
        );
        const v = new T.Vector3(
          n.getX(i),
          n.getY(i) / 0.62,
          n.getZ(i) / 0.75,
        ).normalize();
        normals.push(v.x, v.y, v.z);
      }
      for (const id of g.index.array) indices.push(base + id);
      g.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
    g.setIndex(indices);
    return g;
  }
  function build() {
    const group = new T.Group();
    group.name = "Clouds below the floating island";
    const sky = new T.Mesh(
      new T.SphereGeometry(500, 24, 16),
      new T.ShaderMaterial({
        side: T.BackSide,
        depthWrite: false,
        vertexShader:
          "varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader:
          "varying vec3 p;void main(){float h=clamp((normalize(p).y+.4)*1.2,0.,1.);vec3 color=mix(vec3(.52,.79,.91),vec3(.12,.48,.77),h);gl_FragColor=vec4(color,1.);}",
      }),
    );
    sky.renderOrder = -10;
    group.add(sky);
    const geometry = cloudGeometry(),
      material = new T.MeshStandardMaterial({ color: "#f6fbff", roughness: 1 });
    const clouds = [];
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39996,
        r = 31 + (i % 4) * 10,
        x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const c = new T.Mesh(geometry, material);
      c.position.set(x, -5 - (i % 5) * 3, z);
      c.scale.setScalar(1.2 + (i % 4) * 0.6);
      c.rotation.y = a * 0.3;
      group.add(c);
      clouds.push({ c, x, z, i });
    }
    for (const [i, [x, z]] of [
      [-22, 9],
      [22, 12],
      [8, 23],
      [-12, 22],
      [23, -10],
      [-23, -11],
    ].entries()) {
      const c = new T.Mesh(geometry, material);
      c.position.set(x, -4 - (i % 3) * 1.8, z);
      c.scale.setScalar(1.1 + (i % 2) * 0.3);
      group.add(c);
      clouds.push({ c, x, z, i: i + 24 });
    }
    const birds = [];
    const birdMat = new T.MeshBasicMaterial({
      color: "#325b7a",
      side: T.DoubleSide,
    });
    for (let i = 0; i < 5; i++) {
      const bird = new T.Group(),
        wings = [];
      for (const s of [-1, 1]) {
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [0, 0, 0, s * 0.55, 0.05, -0.12, s * 0.25, 0, 0.12],
            3,
          ),
        );
        g.computeVertexNormals();
        const wing = new T.Mesh(g, birdMat);
        bird.add(wing);
        wings.push(wing);
      }
      group.add(bird);
      birds.push({ bird, wings, i });
    }
    const flags = [],
      rotors = [],
      smoke = [];
    // Small pinwheels and a short festoon beside the garden, clear of entrances.
    for (const [x, z] of [
      [-14, 5],
      [-10, 12],
      [5, -14],
    ]) {
      const post = new T.Mesh(
        new T.CylinderGeometry(0.025, 0.035, 1.2, 8),
        new T.MeshStandardMaterial({ color: "#e7bb69" }),
      );
      post.position.set(x, 0.6, z);
      group.add(post);
      const rotor = new T.Group();
      rotor.position.set(x, 1.25, z);
      group.add(rotor);
      for (let i = 0; i < 4; i++) {
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [0, 0, 0, 0.1, 0.48, 0.035, 0.33, 0.24, -0.04],
            3,
          ),
        );
        g.computeVertexNormals();
        const blade = new T.Mesh(
          g,
          new T.MeshStandardMaterial({
            color: ["#e96247", "#fac43e", "#2aada3", "#9260c6"][i],
            side: T.DoubleSide,
            roughness: 0.6,
          }),
        );
        blade.rotation.z = (i * Math.PI) / 2;
        rotor.add(blade);
      }
      rotors.push(rotor);
    }
    for (const x of [-5, 5]) {
      const p = new T.Mesh(
        new T.CylinderGeometry(0.04, 0.05, 2.8, 8),
        new T.MeshStandardMaterial({ color: "#775b39" }),
      );
      p.position.set(x, 1.4, -5);
      group.add(p);
    }
    const rope = new T.CatmullRomCurve3([
      new T.Vector3(-5, 2.8, -5),
      new T.Vector3(0, 2.2, -5),
      new T.Vector3(5, 2.8, -5),
    ]);
    group.add(
      new T.Mesh(
        new T.TubeGeometry(rope, 32, 0.015, 4, false),
        new T.MeshStandardMaterial({ color: "#d6ad6a" }),
      ),
    );
    for (let i = 0; i < 11; i++) {
      const p = rope.getPoint((i + 0.5) / 11),
        g = new T.BufferGeometry();
      g.setAttribute(
        "position",
        new T.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.4, 0], 3),
      );
      g.computeVertexNormals();
      const flag = new T.Mesh(
        g,
        new T.MeshStandardMaterial({
          color: ["#dc594a", "#efb72a", "#218c8c", "#8455b2"][i % 4],
          side: T.DoubleSide,
        }),
      );
      flag.position.copy(p);
      group.add(flag);
      flags.push(flag);
    }
    const grassPos = [],
      grassColor = [],
      color = new T.Color();
    for (let i = 0; i < 160; i++) {
      const x = Math.sin(i * 12.17) * 17,
        z = Math.cos(i * 7.83) * 15;
      if (
        Math.abs(x) < 2 ||
        Math.abs(z + 6) < 1.6 ||
        root.TownState.water(x, z) ||
        root.TownState.FIXED.some((f) => Math.hypot(f.x - x, f.z - z) < 4)
      )
        continue;
      for (let j = 0; j < 3; j++) {
        const a = j * 2.1 + i,
          dx = Math.cos(a) * 0.09,
          dz = Math.sin(a) * 0.09,
          h = 0.12 + (i % 4) * 0.045;
        grassPos.push(
          x - dx,
          0.06,
          z - dz,
          x + dx,
          0.06,
          z + dz,
          x + 0.08,
          h,
          z + 0.03,
        );
        color.set(i % 3 ? "#438f38" : "#75ae31");
        for (let k = 0; k < 3; k++) grassColor.push(color.r, color.g, color.b);
      }
    }
    const grassGeo = new T.BufferGeometry();
    grassGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(grassPos, 3),
    );
    grassGeo.setAttribute("color", new T.Float32BufferAttribute(grassColor, 3));
    grassGeo.computeVertexNormals();
    group.add(
      new T.Mesh(
        grassGeo,
        new T.MeshStandardMaterial({
          vertexColors: true,
          side: T.DoubleSide,
          roughness: 1,
        }),
      ),
    );
    return {
      group,
      clouds,
      flags,
      rotors,
      birds,
      flightWidth: 160,
      setBounds(x, z) {
        this.flightWidth = Math.max(160, x * 3.7 + 70);
        for (const c of clouds) {
          c.baseX ??= c.x;
          c.baseZ ??= c.z;
          c.x = c.baseX * Math.max(1, x / 18);
          c.z = c.baseZ * Math.max(1, z / 16);
        }
      },
      update(time, reduced) {
        const t = reduced ? 0 : time;
        for (const { c, x, z, i } of clouds) {
          const span = this.flightWidth;
          c.position.x =
            ((((x - t * (1.4 + (i % 4) * 0.25) + span / 2) % span) + span) %
              span) -
            span / 2;
          c.position.z = z + Math.sin(t * 0.06 + i) * 0.6;
        }
        for (const [i, f] of flags.entries())
          f.rotation.x = Math.sin(t * 2.1 + i * 0.6) * 0.16;
        for (const [i, r] of rotors.entries())
          r.rotation.z = t * (0.9 + i * 0.2);
        for (const { bird, wings, i } of birds) {
          const a = t * 0.035 + i * 0.32;
          bird.position.set(
            Math.cos(a) * 39,
            5 + Math.sin(a * 2 + i),
            Math.sin(a) * 34,
          );
          bird.rotation.y = -a;
          wings.forEach(
            (w, j) => (w.rotation.x = Math.sin(t * 4 + i) * 0.3 * (j ? 1 : -1)),
          );
        }
      },
    };
  }
  root.WorldAtmosphere = { build, cliff };
})(typeof window !== "undefined" ? window : globalThis);
