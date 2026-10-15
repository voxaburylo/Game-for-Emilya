(function () {
  "use strict";
  const T = THREE,
    A = Art,
    S = TownState;
  class TownWorld {
    constructor(container, state, emit) {
      this.container = container;
      this.state = state;
      this.emit = emit;
      this.view = "street";
      this.time = 0;
      this.keys = {};
      this.joy = { x: 0, y: 0 };
      this.path = [];
      this.yaw = 0.53;
      this.zoom = 13;
      this.paused = true;
      this.editor = null;
      this.targets = [];
      this.previewGroup = new T.Group();
      this.animations = [];
      this.roomId = "home";
      this.streetPose = { x: 0, z: 5 };
      this.petAction = "";
      this.petUntil = 0;
      this.jumpY = 0;
      this.jumpV = 0;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.scene = new T.Scene();
      this.scene.background = new T.Color("#c7e0df");
      this.scene.fog = new T.Fog("#c7e0df", 90, 170);
      this.renderer = new T.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = T.PCFSoftShadowMap;
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      container.append(this.renderer.domElement);
      this.camera = new T.OrthographicCamera(-20, 20, 13, -13, 0.1, 180);
      this.focus = new T.Vector3();
      this.scene.add(new T.HemisphereLight("#fff6e7", "#809b82", 2));
      this.sun = new T.DirectionalLight("#fff0d7", 2.6);
      this.sun.position.set(-15, 28, 18);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1536, 1536);
      Object.assign(this.sun.shadow.camera, {
        left: -35,
        right: 35,
        top: 32,
        bottom: -32,
        far: 90,
      });
      this.sun.shadow.normalBias = 0.025;
      this.sun.shadow.bias = -0.0003;
      this.scene.add(this.sun);
      this.outside = new T.Group();
      this.scene.add(this.outside);
      this.room = new T.Group();
      this.scene.add(this.room);
      this.room.visible = false;
      this.scene.add(this.previewGroup);
      this.roadGroup = new T.Group();
      this.objectGroup = new T.Group();
      this.groundGroup = new T.Group();
      this.outside.add(this.groundGroup, this.roadGroup, this.objectGroup);
      this.fixedGroups = new Map();
      this.nav = new Navigation([], { x: 28, z: 26 });
      this.treeObstacles = [];
      this.makeOutside();
      this.refreshTerrain();
      this.refreshObjects();
      this.refreshRoads();
      this.setLook(state.look);
      this.setPet(state.pet);
      const spawn = this.nav.nearest(0, 5) || { x: 0, z: 0 };
      this.hero.position.set(spawn.x, 0, spawn.z);
      this.pet.position.set(spawn.x + 1.2, 0, spawn.z + 1);
      this.focus.set(0, 0, 3);
      this.ray = new T.Raycaster();
      this.pointer = new T.Vector2();
      this.plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
      this.resize = () => {
        const w = container.clientWidth,
          h = container.clientHeight;
        this.renderer.setSize(w, h);
        this.aspect = w / h;
        this.updateProjection();
      };
      addEventListener("resize", this.resize);
      this.resize();
      this.bindInput();
      this.last = performance.now();
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    clear(g) {
      while (g.children.length) {
        const child = g.children[0];
        A.dispose(child);
        g.remove(child);
      }
    }
    setLook(look) {
      const pos = this.hero?.position.clone() || new T.Vector3(),
        rot = this.hero?.rotation.y || 0;
      if (this.hero) {
        A.dispose(this.hero);
        this.scene.remove(this.hero);
      }
      this.hero = A.avatar(look);
      this.hero.position.copy(pos);
      this.hero.rotation.y = rot;
      this.scene.add(this.hero);
      if (this.reflection && this.view === "wardrobe") {
        A.dispose(this.reflection);
        this.room.remove(this.reflection);
        this.reflection = A.avatar(look);
        this.reflection.position.set(-3, 0.5, -2.55);
        this.reflection.scale.setScalar(0.7);
        this.room.add(this.reflection);
      }
      this.poseUntil = this.time + 0.9;
      this.hero.visible = this.view !== "pets";
    }
    setPet(type) {
      const pos = this.pet?.position.clone() || new T.Vector3(1, 0, 6);
      if (this.pet) {
        A.dispose(this.pet);
        this.scene.remove(this.pet);
      }
      this.pet = A.pet(type);
      this.pet.position.copy(pos);
      this.pet.userData.action = { type: "pet" };
      this.scene.add(this.pet);
      if (this.view === "pets") {
        this.pet.position.set(0, 0, 0);
        this.pet.scale.setScalar(2);
      }
      this.petPath = [];
    }
    makeOutside() {
      A.box(this.outside, "#91bac2", 0, -1.5, 0, 160, 0.5, 160);
      this.water = [];
      for (let i = 0; i < 25; i++) {
        const line = A.box(
          this.outside,
          "#b9d6d5",
          Math.sin(i * 8.6) * 45,
          -1.2,
          Math.cos(i * 4.2) * 37,
          1.7 + (i % 4),
          0.02,
          0.06,
        );
        this.water.push(line);
      }
      for (const f of S.FIXED) {
        const g = this.house(
          f.x,
          f.z,
          f.id === "home"
            ? "#e9c1a5"
            : f.id === "letters"
              ? "#e9d8af"
              : "#c6d8cb",
          f.id === "home"
            ? "#a86e68"
            : f.id === "letters"
              ? "#71958c"
              : "#ab8297",
          f.id === "home" ? "ДІМ" : f.id === "letters" ? "А" : "МА",
        );
        g.userData.action = { type: "enter", id: f.id };
        g.userData.entrance = { x: f.x, z: f.z + 4 };
        this.fixedGroups.set(f.id, g);
        this.outside.add(g);
      }
      const ring = A.cyl(this.outside, "#729fa6", 12, 0.08, 8, 3.6, 0.06, 2.8);
      ring.castShadow = false;
      for (let i = 0; i < 15; i++) {
        const a = (i / 15) * Math.PI * 2;
        A.ball(
          this.outside,
          "#c5c4ac",
          12 + Math.cos(a) * 3.8,
          0.2,
          8 + Math.sin(a) * 2.95,
          0.36,
          0.22,
          0.3,
        );
      }
      for (let i = 0; i < 13; i++)
        A.box(this.outside, "#b79368", 8 + i * 0.67, 0.28, 8, 0.62, 0.2, 1.9);
      for (const z of [7, 9]) {
        A.box(this.outside, "#917252", 12, 0.95, z, 8.4, 0.1, 0.12);
        for (const x of [8, 10, 12, 14, 16])
          A.cyl(this.outside, "#917252", x, 0.62, z, 0.07, 1.2);
      }
      S.NATURAL.forEach(({ x, z }, i) => {
        const tr = A.tree(this.outside, x, z, i % 3 === 0);
        tr.scale.setScalar(0.8 + (i % 3) * 0.12);
        this.treeObstacles.push({ x, z, r: 0.38 });
      });
      for (let i = 0; i < 65; i++) {
        const x = Math.sin(i * 12.17) * 16,
          z = Math.cos(i * 7.83) * 14;
        if (
          S.FIXED.some((f) => Math.hypot(x - f.x, z - f.z) < 4) ||
          Math.abs(x) < 2 ||
          Math.abs(z + 6) < 2 ||
          S.water(x, z) ||
          (z > 1 && x < 4)
        )
          continue;
        A.flower(this.outside, x, z, ["#cc8c9a", "#e4bd6d", "#eee0ba"][i % 3]);
      }
      for (const [x, z] of [
        [-8, -4],
        [8, -4],
        [-15, 1],
        [4, 10],
      ]) {
        A.cyl(this.outside, "#5a7663", x, 1.3, z, 0.06, 2.6);
        A.box(this.outside, "#e6c57e", x, 2.6, z, 0.35, 0.5, 0.35);
        A.box(this.outside, "#5a7663", x, 2.9, z, 0.5, 0.1, 0.5);
      }
      this.butterflies = [];
      for (let i = 0; i < 9; i++) {
        const g = A.group(
          this.outside,
          Math.sin(i * 4.3) * 15,
          1.4,
          Math.cos(i * 2.3) * 13,
        );
        const wings = [
          A.ball(g, "#d8ad73", -0.1, 0, 0, 0.16, 0.025, 0.1),
          A.ball(g, "#b889ab", 0.1, 0, 0, 0.16, 0.025, 0.1),
        ];
        this.butterflies.push({
          g,
          wings,
          x: g.position.x,
          z: g.position.z,
          i,
        });
      }
    }
    house(x, z, wall, roof, sign) {
      const g = A.group(null, x, 0, z);
      A.box(g, "#c9b89a", 0, 0.14, 0, 5.3, 0.28, 4.7);
      A.box(g, wall, 0, 1.6, 0, 4.8, 3, 4.1);
      A.box(g, "#f4e7cf", 0, 0.4, 2.1, 4.8, 0.25, 0.12);
      const shape = new T.Shape();
      shape.moveTo(-2.8, 0);
      shape.lineTo(0, 1.8);
      shape.lineTo(2.8, 0);
      shape.closePath();
      const rg = new T.ExtrudeGeometry(shape, {
        depth: 4.8,
        bevelEnabled: true,
        bevelSize: 0.07,
        bevelThickness: 0.07,
        bevelSegments: 2,
        steps: 1,
      });
      rg.translate(0, 3.1, -2.4);
      const m = new T.Mesh(rg, A.mat(roof));
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
      for (let i = 0; i < 6; i++)
        A.box(g, roof, 0, 3.16, 2.4 - i * 0.87, 5.7, 0.15, 0.08);
      A.box(g, "#f3e5cb", 0, 1.4, 2.13, 1.45, 2.7, 0.18);
      const door = A.group(g, -0.61, 0.14, 2.27);
      A.box(door, "#527b72", 0.61, 1.15, 0, 1.22, 2.3, 0.13);
      A.box(door, "#a7c4bd", 0.61, 1.65, 0.08, 0.8, 0.7, 0.03);
      A.ball(door, "#dbb46e", 1.02, 1, 0.1, 0.06);
      g.userData.door = door;
      [-1.65, 1.65].forEach((xx) => {
        A.box(g, "#f9edda", xx, 1.85, 2.14, 0.96, 1.3, 0.14);
        A.box(g, "#87b3bd", xx, 1.85, 2.23, 0.73, 1.06, 0.05);
        A.box(g, "#fff2d8", xx, 1.85, 2.28, 0.06, 1.06, 0.03);
        A.box(g, "#fff2d8", xx, 1.85, 2.28, 0.73, 0.06, 0.03);
        A.box(g, "#ad845d", xx, 1.14, 2.35, 1.1, 0.23, 0.45);
        for (let i = 0; i < 3; i++) {
          const flower = A.group(g, xx - 0.3 + i * 0.3, 0.7, 2.4);
          A.flower(flower, 0, 0, "#cf8593");
        }
      });
      A.box(g, "#c8b495", 0, 0.12, 2.8, 2, 0.22, 1.1);
      A.cyl(g, "#957856", -0.65, 5.15, 0, 0.04, 0.9);
      A.cyl(g, "#957856", 0.65, 5.15, 0, 0.04, 0.9);
      const canvas = document.createElement("canvas");
      canvas.width = 384;
      canvas.height = 192;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff4db";
      ctx.strokeStyle = "#b99c75";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(5, 5, 374, 182, 35);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#426f64";
      ctx.font =
        "700 " + (sign.length > 2 ? 82 : 106) + "px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sign, 192, 104);
      const tex = new T.CanvasTexture(canvas);
      tex.colorSpace = T.SRGBColorSpace;
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: tex }));
      sprite.position.set(0, 5.85, 0);
      sprite.scale.set(2.8, 1.4, 1);
      g.add(sprite);
      return g;
    }
    refreshTerrain() {
      this.clear(this.groundGroup);
      const land = (x, z, w, h) => {
        A.box(this.groundGroup, "#b7a88a", x, -0.65, z, w, 1.2, h);
        A.box(this.groundGroup, "#8eac7d", x, -0.09, z, w, 0.2, h);
        A.box(
          this.groundGroup,
          "#adc48c",
          x,
          0.01,
          z,
          w - 0.08,
          0.08,
          h - 0.08,
        );
      };
      land(0, 0, 36, 32);
      S.LANDS.filter((l) => this.state.lands.includes(l.id)).forEach((l) =>
        land(l.x, l.z, l.w, l.h),
      );
      this.updateNav();
    }
    refreshRoads() {
      this.clear(this.roadGroup);
      for (const [key, material] of Object.entries(this.state.roads)) {
        const [ix, iz] = key.split(",").map(Number),
          x = ix * 2,
          z = iz * 2;
        if (!S.roadOK(this.state, ix, iz)) continue;
        const c = { sand: "#dec7a0", stone: "#c2c5b6", wood: "#bd9c74" }[
          material
        ];
        A.box(this.roadGroup, c, x, 0.095, z, 2.01, 0.075, 2.01);
        if (material === "wood")
          for (let j = 0; j < 4; j++)
            A.box(
              this.roadGroup,
              j % 2 ? "#c9aa81" : "#b9966e",
              x,
              0.145,
              z - 0.75 + j * 0.5,
              1.9,
              0.04,
              0.43,
            );
        if (material === "stone")
          for (let j = 0; j < 4; j++)
            A.box(
              this.roadGroup,
              j % 2 ? "#d3d2bf" : "#b8bcae",
              x + ((j % 2) - 0.5) * 0.96,
              0.15,
              z + (Math.floor(j / 2) - 0.5) * 0.96,
              0.89,
              0.04,
              0.89,
            );
      }
    }
    refreshObjects(animateId) {
      this.clear(this.objectGroup);
      this.animations = [];
      for (const o of this.state.objects) {
        const g =
          o.kind === "house"
            ? this.house(o.x, o.z, "#e6ceaf", "#a9859c", "ДІМ")
            : A.item(o.kind);
        if (o.kind !== "house") g.position.set(o.x, 0, o.z);
        g.rotation.y = (o.rotation * Math.PI) / 2;
        g.userData.objectId = o.id;
        g.userData.action = { type: "object", id: o.id };
        g.userData.entrance =
          o.kind === "house" ? S.entrance(o) : { x: o.x, z: o.z + 2 };
        this.objectGroup.add(g);
        if (o.id === animateId) {
          const parts = g.children.map((child) => {
            const center = new T.Box3()
              .setFromObject(child)
              .getCenter(new T.Vector3());
            return {
              child,
              pos: child.position.clone(),
              scale: child.scale.clone(),
              delay: Math.min(0.78, Math.max(0, center.y / 7)),
            };
          });
          parts.forEach((p) => (p.child.visible = false));
          this.animations.push({
            g,
            parts,
            start: this.time,
            duration: this.reduced ? 0.4 : 2.5,
          });
        }
      }
      this.updateNav();
      this.refreshRoads();
      if (
        this.hero &&
        this.view === "street" &&
        this.nav.blocked(this.hero.position.x, this.hero.position.z)
      ) {
        const p = this.nav.nearest(this.hero.position.x, this.hero.position.z);
        if (p) this.hero.position.set(p.x, 0, p.z);
      }
    }
    updateNav() {
      if (!this.nav) return;
      const rects = [...S.FIXED, ...this.state.objects.map(S.footprint)];
      this.nav.blocked = (x, z) =>
        !S.inside(this.state, x, z, 0.15) ||
        S.water(x, z) ||
        rects.some(
          (r) => Math.abs(x - r.x) < r.w + 0.3 && Math.abs(z - r.z) < r.h + 0.3,
        ) ||
        this.treeObstacles.some(
          (r) => Math.hypot(x - r.x, z - r.z) < r.r + 0.25,
        );
    }
    bindInput() {
      const canvas = this.renderer.domElement;
      let down = null;
      const points = new Map();
      let pinch = 0;
      canvas.addEventListener("pointerdown", (e) => {
        if (this.paused) return;
        canvas.setPointerCapture(e.pointerId);
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        down = { x: e.clientX, y: e.clientY, lastX: e.clientX, moved: false };
        if (points.size === 2) {
          const p = [...points.values()];
          pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        }
        if (this.editor?.type === "road") {
          const p = this.groundPoint(e.clientX, e.clientY);
          if (p)
            this.emit({
              type: "road-start",
              x: Math.round(p.x / 2),
              z: Math.round(p.z / 2),
            });
        }
      });
      canvas.addEventListener("pointermove", (e) => {
        if (this.paused || !points.has(e.pointerId) || !down) return;
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (points.size === 2) {
          const p = [...points.values()],
            d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          this.changeZoom((pinch - d) * 0.035);
          pinch = d;
          down.moved = true;
          return;
        }
        if (this.editor?.type === "road") {
          const p = this.groundPoint(e.clientX, e.clientY);
          if (p)
            this.emit({
              type: "road-move",
              x: Math.round(p.x / 2),
              z: Math.round(p.z / 2),
            });
          down.moved = true;
          return;
        }
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) {
          if (!this.editor) this.rotate(-(e.clientX - down.lastX) * 0.008);
          else if (["objects", "select"].includes(this.editor.type)) {
            this.editFocus.x -= ((e.clientX - down.lastX) * this.zoom) / 250;
            this.editFocus.z -=
              ((e.clientY - (down.lastY ?? down.y)) * this.zoom) / 220;
            down.lastY = e.clientY;
          }
          down.moved = true;
        }
        down.lastX = e.clientX;
      });
      canvas.addEventListener("pointerup", (e) => {
        points.delete(e.pointerId);
        if (down && !down.moved && !this.paused) this.tap(e.clientX, e.clientY);
        down = null;
      });
      canvas.addEventListener("pointercancel", () => {
        down = null;
        points.clear();
      });
      canvas.addEventListener(
        "wheel",
        (e) => {
          if (this.paused) return;
          e.preventDefault();
          this.changeZoom(Math.sign(e.deltaY));
        },
        { passive: false },
      );
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      addEventListener("keydown", (e) => {
        if (
          this.paused ||
          this.editor ||
          /INPUT|TEXTAREA/.test(e.target.tagName)
        )
          return;
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
            e.code,
          )
        )
          e.preventDefault();
        this.keys[e.code] = true;
        if (e.code === "Space" && !e.repeat) this.jump();
        if (e.code === "KeyE" && !e.repeat) this.nearestInteraction();
      });
      addEventListener("keyup", (e) => (this.keys[e.code] = false));
      addEventListener("blur", () => this.stop());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.stop();
      });
    }
    groundPoint(x, y) {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(
        ((x - r.left) / r.width) * 2 - 1,
        (-(y - r.top) / r.height) * 2 + 1,
      );
      this.ray.setFromCamera(this.pointer, this.camera);
      return this.ray.ray.intersectPlane(this.plane, new T.Vector3());
    }
    tap(x, y) {
      const p = this.groundPoint(x, y);
      if (this.editor) {
        if (this.editor.type === "land") return;
        if (this.editor.type === "furniture") {
          if (p)
            this.emit({
              type: "furniture-position",
              x: Math.round(p.x * 2) / 2,
              z: Math.round(p.z * 2) / 2,
            });
          return;
        }
        if (this.editor.type === "objects" && p) {
          this.emit({
            type: "place-position",
            x: Math.round(p.x / 2) * 2,
            z: Math.round(p.z / 2) * 2,
          });
          return;
        }
        if (this.editor.type === "select") {
          const hits = this.ray.intersectObjects(
            this.objectGroup.children,
            true,
          );
          if (hits.length) {
            let obj = hits[0].object;
            while (obj && !obj.userData.objectId) obj = obj.parent;
            if (obj)
              this.emit({ type: "edit-object", id: obj.userData.objectId });
          }
          return;
        }
        return;
      }
      if (["wardrobe", "pets"].includes(this.view)) {
        if (this.view === "pets") this.petReact("stroke");
        return;
      }
      const targets =
        this.view === "street"
          ? [
              ...this.fixedGroups.values(),
              ...this.objectGroup.children,
              this.pet,
            ]
          : this.room.children;
      const hits = this.ray.intersectObjects(targets, true);
      for (const hit of hits) {
        let g = hit.object;
        while (g && !g.userData.action) g = g.parent;
        if (g?.userData.action && !this.animations.some((a) => a.g === g)) {
          const a = g.userData.action;
          if (this.view === "street" && ["enter", "object"].includes(a.type)) {
            const e = g.userData.entrance;
            this.navigate(e.x, e.z, () => {
              if (
                a.type === "enter" ||
                this.state.objects.find((o) => o.id === a.id)?.kind === "house"
              ) {
                this.openDoor(g, () => this.emit({ type: "enter", id: a.id }));
              } else this.emit(a);
            });
            return;
          }
          this.emit(a);
          return;
        }
      }
      if (p) this.navigate(p.x, p.z);
    }
    openDoor(g, fn) {
      this.stop();
      if (g.userData.door) {
        g.userData.door.rotation.y = -Math.PI / 2;
        this.doorPending = { at: this.time + 0.4, fn };
      } else fn();
    }
    nearestInteraction() {
      if (this.paused || this.editor) return;
      let best = null,
        d = 4;
      const all =
        this.view === "street"
          ? [...this.fixedGroups.values(), ...this.objectGroup.children]
          : this.room.children;
      for (const g of all) {
        if (!g.userData.action || this.animations.some((a) => a.g === g))
          continue;
        const p = g.userData.entrance || g.position,
          n = Math.hypot(
            p.x - this.hero.position.x,
            p.z - this.hero.position.z,
          );
        if (n < d) {
          best = g;
          d = n;
        }
      }
      if (best) {
        const a = best.userData.action;
        if (
          a.type === "enter" ||
          this.state.objects.find((o) => o.id === a.id)?.kind === "house"
        )
          this.openDoor(best, () => this.emit({ type: "enter", id: a.id }));
        else this.emit(a);
      }
    }
    getUp() {
      this.riding = null;
      if (this.sitting) {
        const nav = this.view === "room" ? this.roomNav : this.nav,
          p = nav.nearest(this.hero.position.x, this.hero.position.z + 1.2);
        if (p) this.hero.position.set(p.x, 0, p.z);
        this.sitting = false;
      }
    }
    navigate(x, z, callback) {
      this.getUp();
      if (this.view === "street") {
        this.path = this.nav.path(this.hero.position, { x, z });
      } else if (this.view === "room") {
        const p = {
          x: Math.max(-4.5, Math.min(4.5, x)),
          z: Math.max(-3.4, Math.min(3.4, z)),
        };
        this.path = this.roomNav.path(this.hero.position, p);
      } else return;
      this.arrive = callback;
      if (!this.path.length) this.arrive = null;
      this.sitting = false;
      this.emit({ type: "walk" });
    }
    stop() {
      this.keys = {};
      this.joy = { x: 0, y: 0 };
      this.path = [];
      this.arrive = null;
      this.doorPending = null;
    }
    jump() {
      if (!this.paused && !this.editor && this.view === "street" && !this.jumpY)
        this.jumpV = 5;
    }
    changeZoom(d) {
      if (["wardrobe", "pets"].includes(this.view)) return;
      this.zoom = Math.max(
        this.view === "room" ? 6 : 8,
        Math.min(24, this.zoom + d),
      );
      this.updateProjection();
    }
    rotate(d) {
      this.yaw += d;
      if (this.view === "room")
        this.yaw = Math.max(-0.55, Math.min(0.55, this.yaw));
    }
    homeCamera() {
      this.yaw = 0.53;
      this.zoom = this.view === "street" ? 13 : 8;
      this.updateProjection();
    }
    updateProjection() {
      let size = this.zoom;
      if (this.view === "wardrobe") size = this.aspect < 0.85 ? 4.4 : 3.05;
      if (this.view === "pets") size = this.aspect < 0.85 ? 4.2 : 3;
      if (this.view === "room")
        size = this.zoom * (this.aspect < 0.85 ? 1.25 : 1);
      this.camera.left = -size * this.aspect;
      this.camera.right = size * this.aspect;
      this.camera.top = size;
      this.camera.bottom = -size;
      this.camera.updateProjectionMatrix();
    }
    setView(view, id) {
      this.stop();
      this.editor = null;
      this.clear(this.previewGroup);
      if (this.view === "street") {
        this.streetPose = { x: this.hero.position.x, z: this.hero.position.z };
        this.streetYaw = this.yaw;
        this.streetZoom = this.zoom;
      }
      this.riding = null;
      this.view = view;
      this.outside.visible = view === "street";
      this.room.visible = view !== "street";
      this.hero.visible = view !== "pets";
      this.hero.scale.setScalar(1);
      this.pet.scale.setScalar(view === "pets" ? 2 : 1);
      this.sitting = false;
      this.hero.rotation.y = 0;
      this.jumpY = 0;
      this.jumpV = 0;
      if (view === "street") {
        this.hero.position.set(this.streetPose.x, 0, this.streetPose.z);
        this.pet.position.set(this.streetPose.x + 1, 0, this.streetPose.z + 1);
        this.yaw = this.streetYaw ?? 0.53;
        this.zoom = this.streetZoom || 13;
        this.scene.background.set("#c7e0df");
        this.clear(this.room);
        this.updateNav();
      } else {
        this.roomId = id || this.roomId;
        this.makeRoom(view);
        this.hero.position.set(
          view === "room" ? 0 : -0.5,
          0,
          view === "room" ? 2.6 : 0,
        );
        this.pet.position.set(
          view === "pets" ? 0 : 2,
          0,
          view === "pets" ? 0 : 2,
        );
        this.yaw = view === "room" ? 0.12 : 0;
        this.scene.background.set("#e6dbca");
        this.zoom = 8;
      }
      this.updateProjection();
      this.petPath = [];
    }
    makeRoom(mode) {
      this.petProp = null;
      this.ballProp = null;
      this.reflection = null;
      this.clear(this.room);
      A.box(this.room, "#c9a77d", 0, -0.14, 0, 12, 0.25, 10);
      for (let i = 0; i < 12; i++)
        A.box(
          this.room,
          i % 2 ? "#d8bd94" : "#d1b28a",
          -5.5 + i,
          0.025,
          0,
          0.96,
          0.05,
          10,
        );
      A.box(this.room, "#dfd8c1", 0, 2.5, -4.9, 12, 5, 0.2);
      A.box(this.room, "#d1d9c6", -5.9, 2.5, 0, 0.2, 5, 10);
      A.box(this.room, "#eee4d0", 0, 0.24, -4.72, 12, 0.35, 0.13);
      A.box(this.room, "#eee4d0", -5.72, 0.24, 0, 0.13, 0.35, 10);
      A.box(this.room, "#f5ebd6", -2, 2.9, -4.73, 2.8, 2.5, 0.12);
      A.box(this.room, "#98bec5", -2, 2.9, -4.64, 2.5, 2.2, 0.04);
      A.box(this.room, "#f9efd9", -2, 2.9, -4.58, 0.1, 2.3, 0.05);
      A.box(this.room, "#f9efd9", -2, 2.9, -4.58, 2.6, 0.1, 0.05);
      [-3.7, -0.3].forEach((x) =>
        A.box(this.room, "#b4bc9c", x, 2.9, -4.5, 0.5, 2.8, 0.15),
      );
      const closet = A.group(this.room, 3.5, 0, -3.8);
      A.box(closet, "#be9676", 0, 1.65, 0, 2.6, 3.3, 1.1);
      [-0.65, 0.65].forEach((x) => {
        A.box(closet, "#d4b391", x, 1.7, 0.6, 1.18, 2.9, 0.12);
        A.ball(closet, "#705e4b", x * 0.4, 1.6, 0.73, 0.065);
      });
      closet.userData.action = { type: "wardrobe" };
      if (mode === "wardrobe") {
        A.cyl(this.room, "#bc8e8e", -0.5, 0.1, 0, 1.6, 0.06, 1.3);
        const mirror = A.group(this.room, -3, 0, -2.7);
        A.box(mirror, "#bda174", 0, 2.1, 0, 1.9, 3.8, 0.16);
        A.box(mirror, "#b9d2d0", 0, 2.1, 0.11, 1.65, 3.55, 0.04);
        const reflection = A.avatar(this.state.look);
        reflection.position.set(-3, 0.5, -2.55);
        reflection.scale.setScalar(0.7);
        reflection.rotation.y = 0.2;
        reflection.traverse((o) => {
          if (o.isMesh) o.castShadow = false;
        });
        this.room.add(reflection);
        this.reflection = reflection;
        for (let i = 0; i < 3; i++) {
          A.box(
            this.room,
            "#9d7c5c",
            3.5,
            0.5 + i * 0.52,
            -2.8,
            2.4,
            0.08,
            0.6,
          );
          A.box(
            this.room,
            ["#ae7586", "#8ba3a6", "#e8d7bb"][i],
            3.2,
            0.65 + i * 0.52,
            -2.8,
            0.7,
            0.23,
            0.45,
          );
        }
      }
      if (mode === "pets") {
        A.cyl(this.room, "#8ca99b", 0, 0.12, 0, 1.65, 0.16, 1.3);
        A.cyl(this.room, "#d8d6b8", 0, 0.22, 0, 1.45, 0.1, 1.15);
        A.cyl(this.room, "#be8d7a", 2.5, 0.25, 1.5, 0.4, 0.35);
        A.ball(this.room, "#d9b46a", -2, 0.25, 0.9, 0.23);
        A.box(this.room, "#ae8d6b", 3, 1, -3, 1.7, 1.8, 1.2);
        A.mesh(
          this.room,
          "cone",
          "#9d7b62",
          3,
          2.3,
          -3,
          1.4,
          1,
          1.2,
        ).rotation.y = Math.PI / 4;
      }
      if (mode === "room") {
        const data = S.room(this.state, this.roomId);
        this.furnitureGroups = {};
        for (const [kind, p] of Object.entries(data.furniture)) {
          const g = A.furniture(kind);
          g.position.set(p.x, 0, p.z);
          g.userData.action = { type: "furniture", kind };
          this.room.add(g);
          this.furnitureGroups[kind] = g;
        }
        const lamp = A.group(this.room, -4.5, 0, -3.5);
        A.cyl(lamp, "#a28a65", 0, 1.2, 0, 0.04, 2.4);
        A.cyl(lamp, "#9a7b59", 0, 0.1, 0, 0.35, 0.1);
        const shade = new T.Mesh(
          new T.CylinderGeometry(0.36, 0.6, 0.65, 20),
          A.mat(data.lamp ? "#f0cf88" : "#b9b3a1"),
        );
        shade.position.y = 2.5;
        lamp.add(shade);
        lamp.userData.action = { type: "lamp" };
        this.lampShade = shade;
        this.lampLight = new T.PointLight("#ffcb78", data.lamp ? 1.8 : 0, 8, 2);
        this.lampLight.position.set(-4.5, 2.4, -3.2);
        this.room.add(this.lampLight);
        const bed = A.group(this.room, 3.7, 0, 1.7);
        A.cyl(bed, "#9da98d", 0, 0.14, 0, 0.85, 0.2, 0.7);
        A.cyl(bed, "#e2d3b5", 0, 0.28, 0, 0.68, 0.1, 0.55);
        bed.userData.action = { type: "pet" };
        const exit = A.group(this.room, 4.4, 0, 4);
        A.box(exit, "#648a7e", 0, 0.08, 0, 1.7, 0.08, 0.7);
        exit.userData.action = { type: "exit" };
        const stand = A.group(this.room, 0.8, 0, -3.7);
        A.box(stand, "#ae916e", 0, 1, 0, 2.3, 1.6, 0.7);
        A.box(stand, "#f9eed7", 0, 2, 0, 2.1, 1.1, 0.15);
        this.addText(
          stand,
          this.roomId === "letters" ? "А Б В" : "МА · МО",
          0,
          2.02,
          0.1,
          1.9,
          0.8,
        );
        stand.userData.action = { type: "learn" };
        if (this.roomId === "letters" || this.roomId === "studio") {
          const blocks =
            this.roomId === "letters" ? ["А", "О", "У"] : ["МА", "МО", "МУ"];
          blocks.forEach((text, i) => {
            const block = A.group(this.room, -2 + i * 1.35, 0, -3.7);
            A.box(
              block,
              ["#d9aa9f", "#b1c5a0", "#c5b5ce"][i],
              0,
              1.1,
              0,
              1.05,
              1.1,
              0.7,
            );
            this.addText(block, text, 0, 1.12, 0.4, 0.9, 0.65);
            block.userData.action = { type: "learn" };
          });
        }
        this.updateRoomNav();
      }
    }
    addText(g, text, x, y, z, w, h) {
      const c = document.createElement("canvas");
      c.width = 512;
      c.height = 192;
      const cx = c.getContext("2d");
      cx.fillStyle = "#faf1dc";
      cx.fillRect(0, 0, 512, 192);
      cx.fillStyle = "#426f64";
      cx.font = "bold 82px Trebuchet MS";
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(text, 256, 100);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(
        new T.PlaneGeometry(w, h),
        new T.MeshBasicMaterial({ map: tex }),
      );
      m.position.set(x, y, z);
      g.add(m);
    }
    updateRoomNav() {
      this.roomNav = new Navigation([], { x: 4.7, z: 3.6 });
      const f = S.room(this.state, this.roomId).furniture;
      this.roomNav.blocked = (x, z) =>
        Math.abs(x) > 4.7 ||
        Math.abs(z) > 3.6 ||
        Object.entries(f).some(
          ([k, p]) =>
            k !== "rug" &&
            Math.abs(x - p.x) < (k === "sofa" ? 1.65 : 1.25) &&
            Math.abs(z - p.z) < 0.9,
        ) ||
        (x > 2.1 && z < -2.6) ||
        (x > -0.6 && x < 2.2 && z < -3);
    }
    moveFurniture(kind, x, z) {
      const g = this.furnitureGroups?.[kind];
      if (g) g.position.set(x, 0, z);
    }
    toggleLamp() {
      const r = S.room(this.state, this.roomId);
      r.lamp = !r.lamp;
      this.lampShade.material = A.mat(r.lamp ? "#f0cf88" : "#b9b3a1");
      if (this.lampLight) this.lampLight.intensity = r.lamp ? 1.8 : 0;
      return r.lamp;
    }
    sit() {
      if (this.view !== "room") return;
      this.stop();
      const p = S.room(this.state, this.roomId).furniture.sofa;
      this.hero.position.set(p.x, 0.45, p.z + 0.2);
      this.hero.rotation.y = 0;
      this.sitY = 0.45;
      this.sitting = true;
    }
    rideSwing(id) {
      const g = this.objectGroup.children.find(
        (g) => g.userData.objectId === id,
      );
      if (!g?.userData.swing) return;
      this.stop();
      this.riding = g;
      this.sitting = true;
      this.sitY = 0.3;
    }
    petReact(action) {
      this.petAction = action;
      this.petUntil = this.time + 2.2;
      if (this.view === "pets" && !this.petProp) {
        this.petProp = new T.Group();
        this.room.add(this.petProp);
      }
      if (this.petProp) {
        this.clear(this.petProp);
        if (action === "feed")
          A.cyl(this.petProp, "#b77f6b", 0, 0.18, 1.4, 0.45, 0.3);
        if (action === "ball") {
          this.ballProp = A.ball(this.petProp, "#daa95f", 0, 0.25, 1.5, 0.22);
        }
      }
      this.emit({ type: "pet-react", action });
    }
    setEditor(editor) {
      this.stop();
      this.editor = editor;
      this.editFocus = this.hero.position.clone();
      this.clear(this.previewGroup);
      if (editor && ["objects", "road", "select"].includes(editor.type)) {
        const verts = [];
        for (let x = -28; x < 28; x += 2)
          for (let z = -26; z < 26; z += 2)
            if (S.inside(this.state, x + 1, z + 1)) {
              verts.push(
                x,
                0.18,
                z,
                x + 2,
                0.18,
                z,
                x,
                0.18,
                z,
                x,
                0.18,
                z + 2,
              );
            }
        const geo = new T.BufferGeometry();
        geo.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
        this.grid = new T.LineSegments(
          geo,
          new T.LineBasicMaterial({
            color: "#f9f3d9",
            transparent: true,
            opacity: 0.35,
          }),
        );
        this.previewGroup.add(this.grid);
      }
      this.ghost = null;
    }
    preview(kind, x, z, rotation, valid) {
      if (this.ghost) {
        A.dispose(this.ghost);
        this.previewGroup.remove(this.ghost);
      }
      const g =
        kind === "house"
          ? this.house(0, 0, "#dfc4a0", "#ab8490", "ДІМ")
          : A.item(kind);
      g.position.set(x, 0.1, z);
      g.rotation.y = (rotation * Math.PI) / 2;
      g.traverse((o) => {
        if (o.isMesh || o.isSprite) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = 0.48;
          if (o.material.color)
            o.material.color.set(valid ? "#a1c9a3" : "#d8847d");
          o.castShadow = false;
        }
      });
      this.previewGroup.add(g);
      this.ghost = g;
      const mark = A.cyl(g, valid ? "#6f9f77" : "#c77c70", 0, 0.03, 0, 1, 0.04);
      mark.material = mark.material.clone();
      mark.material.transparent = true;
      mark.material.opacity = 0.4;
    }
    previewRoad(cells, material) {
      if (this.ghost) {
        A.dispose(this.ghost);
        this.previewGroup.remove(this.ghost);
      }
      const g = new T.Group();
      for (const p of cells) {
        const valid = S.roadOK(this.state, p.x, p.z);
        A.box(
          g,
          valid ? (material === "erase" ? "#d99383" : "#dce4b2") : "#cb6e6d",
          p.x * 2,
          0.2,
          p.z * 2,
          1.8,
          0.07,
          1.8,
        );
      }
      this.previewGroup.add(g);
      this.ghost = g;
    }
    previewLand(id) {
      this.clear(this.previewGroup);
      const l = S.LANDS.find((v) => v.id === id);
      if (!l) return;
      const m = A.box(
        this.previewGroup,
        "#c5dca3",
        l.x,
        0.15,
        l.z,
        l.w - 0.2,
        0.15,
        l.h - 0.2,
      );
      m.material = m.material.clone();
      m.material.transparent = true;
      m.material.opacity = 0.6;
      this.landFocus = new T.Vector3(l.x / 2, 0, l.z / 2);
      this.zoom = 22;
      this.updateProjection();
    }
    loop(now) {
      requestAnimationFrame(this.loop);
      const elapsed = (now - this.last) / 1000;
      this.last = now;
      if (document.hidden) return;
      const dt = Math.min(0.08, elapsed);
      this.time += dt;
      let moving = false;
      if (
        !this.paused &&
        !this.editor &&
        ["street", "room"].includes(this.view)
      ) {
        const sx =
            (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) -
            (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) +
            this.joy.x,
          sz =
            (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0) -
            (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) +
            this.joy.y;
        let dx = 0,
          dz = 0,
          travel = dt * (this.keys.ShiftLeft ? 7 : 5.5);
        if (Math.hypot(sx, sz) > 0.12) {
          this.path = [];
          this.arrive = null;
          this.getUp();
          const n = Math.max(1, Math.hypot(sx, sz));
          dx = (sx * Math.cos(this.yaw) + sz * Math.sin(this.yaw)) / n;
          dz = (-sx * Math.sin(this.yaw) + sz * Math.cos(this.yaw)) / n;
        } else if (this.path.length) {
          const p = this.path[0],
            len = Math.hypot(
              p.x - this.hero.position.x,
              p.z - this.hero.position.z,
            );
          if (len < 0.08) {
            this.path.shift();
            if (!this.path.length) {
              const fn = this.arrive;
              this.arrive = null;
              if (fn) fn();
            }
          } else {
            dx = (p.x - this.hero.position.x) / len;
            dz = (p.z - this.hero.position.z) / len;
            travel = Math.min(travel, len);
          }
        }
        if (Math.hypot(dx, dz) > 0.01) {
          const nav = this.view === "room" ? this.roomNav : this.nav,
            p = this.hero.position,
            next = nav.move(p, dx * travel, dz * travel);
          moving = Math.hypot(next.x - p.x, next.z - p.z) > 0.001;
          p.x = next.x;
          p.z = next.z;
          const a = Math.atan2(dx, dz),
            diff = Math.atan2(
              Math.sin(a - this.hero.rotation.y),
              Math.cos(a - this.hero.rotation.y),
            );
          this.hero.rotation.y += diff * Math.min(1, dt * 14);
        }
        if (this.jumpV || this.jumpY) {
          this.jumpV -= 14 * dt;
          this.jumpY = Math.max(0, this.jumpY + this.jumpV * dt);
          if (!this.jumpY) this.jumpV = 0;
        }
      }
      if (this.hero) {
        this.hero.position.y = this.sitting
          ? (this.sitY ?? 0.45)
          : (this.view === "street" &&
            Math.abs(this.hero.position.x - 12) < 4.2 &&
            Math.abs(this.hero.position.z - 8) < 1
              ? 0.28
              : 0) + this.jumpY;
        this.hero.userData.legs.forEach(
          (m, i) =>
            (m.rotation.x = this.sitting
              ? -Math.PI / 2
              : moving
                ? Math.sin(this.time * 11 + i * Math.PI) * 0.45
                : 0),
        );
        this.hero.userData.arms.forEach((m, i) => {
          m.rotation.x = moving
            ? -Math.sin(this.time * 11 + i * Math.PI) * 0.35
            : 0;
          m.rotation.z =
            this.time < this.poseUntil
              ? (i ? 1 : -1) * Math.sin((this.poseUntil - this.time) * 4) * 0.35
              : 0;
        });
        if (this.view === "wardrobe") {
          this.hero.rotation.y = this.yaw;
          if (this.reflection) this.reflection.rotation.y = -this.yaw;
        }
      }
      if (this.pet) {
        if (["street", "room"].includes(this.view) && !this.paused) {
          const p = this.hero.position,
            d = Math.hypot(
              p.x - this.pet.position.x,
              p.z - this.pet.position.z,
            );
          if (d > 2) {
            const nav = this.view === "street" ? this.nav : this.roomNav;
            if (!this.petPath?.length || this.time > (this.petNext || 0)) {
              this.petPath = nav.path(this.pet.position, p);
              this.petNext = this.time + 0.7;
            }
            const goal = this.petPath[0];
            if (goal) {
              const dx = goal.x - this.pet.position.x,
                dz = goal.z - this.pet.position.z,
                len = Math.hypot(dx, dz);
              if (len < 0.15) this.petPath.shift();
              else {
                const next = nav.move(
                  this.pet.position,
                  (dx / len) * Math.min(dt * 6.5, len),
                  (dz / len) * Math.min(dt * 6.5, len),
                );
                this.pet.position.x = next.x;
                this.pet.position.z = next.z;
                this.pet.rotation.y = Math.atan2(dx, dz);
              }
            }
          }
        }
        if (this.view === "pets") this.pet.rotation.y = this.yaw;
        const petMoving =
          this.petPath?.length > 0 &&
          !this.paused &&
          ["street", "room"].includes(this.view);
        this.pet.rotation.z = petMoving
          ? Math.sin(this.time * (this.state.pet === "rabbit" ? 13 : 9)) * 0.045
          : 0;
        const active = this.petUntil > this.time;
        this.pet.userData.tail.rotation.z =
          Math.sin(this.time * (active ? 14 : 4)) * (active ? 0.5 : 0.1);
        this.pet.userData.head.rotation.x =
          active && this.petAction === "feed"
            ? Math.sin(this.time * 8) * 0.2 + 0.2
            : Math.sin(this.time * 1.7) * 0.035;
        this.pet.position.y =
          active && this.petAction === "stroke"
            ? Math.abs(Math.sin(this.time * 5)) * 0.12
            : petMoving
              ? Math.abs(
                  Math.sin(this.time * (this.state.pet === "rabbit" ? 9 : 12)),
                ) * (this.state.pet === "rabbit" ? 0.18 : 0.035)
              : 0;
        if (this.ballProp)
          this.ballProp.position.set(
            Math.sin(this.time * 2) * 1.3,
            0.25 + Math.abs(Math.sin(this.time * 4)) * 0.7,
            1.5,
          );
        if (!active && this.petProp) {
          this.clear(this.petProp);
          this.ballProp = null;
        }
      }
      if (this.doorPending && this.time >= this.doorPending.at) {
        const fn = this.doorPending.fn;
        this.doorPending = null;
        fn();
      }
      this.animations = this.animations.filter((a) => {
        const f = Math.min(1, (this.time - a.start) / a.duration);
        for (const p of a.parts) {
          const progress = Math.max(0, Math.min(1, (f - p.delay) / 0.22));
          p.child.visible = progress > 0;
          p.child.scale.copy(p.scale);
          p.child.scale.y *= Math.max(0.001, progress);
          p.child.position.copy(p.pos);
          p.child.position.y += (1 - progress) * 0.45;
        }
        if (f >= 1) {
          for (const p of a.parts) {
            p.child.visible = true;
            p.child.scale.copy(p.scale);
            p.child.position.copy(p.pos);
          }
          this.emit({ type: "built" });
          return false;
        }
        return true;
      });
      if (!this.reduced) {
        this.butterflies.forEach(({ g, wings, x, z, i }) => {
          g.position.x = x + Math.sin(this.time * 0.7 + i) * 0.8;
          g.position.z = z + Math.cos(this.time * 0.6 + i) * 0.5;
          g.position.y = 1.4 + Math.sin(this.time * 2 + i) * 0.25;
          wings.forEach(
            (w, j) =>
              (w.rotation.z = Math.sin(this.time * 11 + i) * (j ? 1 : -1)),
          );
        });
        for (const g of this.objectGroup.children)
          if (g.userData.swing)
            g.userData.swing.rotation.x = Math.sin(this.time * 1.4) * 0.15;
      }
      if (this.riding) {
        const seat = this.riding.userData.swing;
        this.riding.updateMatrixWorld(true);
        const pos = seat.localToWorld(new T.Vector3(0, -1.55, 0.08));
        this.hero.position.copy(pos);
        this.hero.position.y -= 0.8;
        this.hero.rotation.y = this.riding.rotation.y;
      }
      let target = new T.Vector3(),
        dist = 35,
        height = 28;
      if (this.view === "street") {
        target.copy(
          this.editor?.type === "land" && this.landFocus
            ? this.landFocus
            : this.editor && this.editFocus
              ? this.editFocus
              : this.hero.position,
        );
        target.z -= 1;
        target.y = 0.5;
      } else if (this.view === "room") {
        target.set(this.aspect < 0.85 ? 0 : 1, 1, 0);
        dist = 24;
        height = 19;
      } else {
        const portrait = this.aspect < 0.85;
        target.set(portrait ? 0 : 1.1, portrait ? -0.25 : 1.55, 0);
        dist = 22;
        height = 4.2;
      }
      this.focus.lerp(target, this.reduced ? 1 : 1 - Math.exp(-dt * 6));
      const camYaw = ["wardrobe", "pets"].includes(this.view) ? 0 : this.yaw;
      this.camera.position
        .copy(this.focus)
        .add(
          new T.Vector3(
            Math.sin(camYaw) * dist,
            height,
            Math.cos(camYaw) * dist,
          ),
        );
      this.camera.lookAt(this.focus);
      this.renderer.render(this.scene, this.camera);
    }
  }
  window.TownWorld = TownWorld;
})();
