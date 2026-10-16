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
      this.petActionStart = 0;
      this.petShowcaseStart = 0;
      this.jumpY = 0;
      this.jumpV = 0;
      this.lowPower = !!window.EmiliaCompatibility?.lowPower;
      this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.scene = new T.Scene();
      this.scene.background = new T.Color("#8ccde7");
      this.scene.fog = new T.Fog("#8ccde7", 180, 330);
      this.renderer = new T.WebGLRenderer({
        antialias: !this.lowPower,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(
        Math.min(devicePixelRatio || 1, this.lowPower ? 1 : 1.5),
      );
      this.renderer.shadowMap.enabled = !this.lowPower;
      this.renderer.shadowMap.type = this.lowPower
        ? T.BasicShadowMap
        : T.PCFSoftShadowMap;
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      container.append(this.renderer.domElement);
      this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        this.paused = true;
        this.emit({ type: "graphics-lost" });
      });
      this.renderer.domElement.addEventListener("webglcontextrestored", () =>
        location.reload(),
      );
      this.camera = new T.OrthographicCamera(-20, 20, 13, -13, 0.1, 900);
      this.focus = new T.Vector3();
      this.skyLight = new T.HemisphereLight("#fff6e7", "#aaa28f", 2);
      this.scene.add(this.skyLight);
      this.portraitLight = new T.DirectionalLight("#fff5ec", 1.4);
      this.portraitLight.position.set(2, 4, 8);
      this.portraitLight.visible = false;
      this.scene.add(this.portraitLight);
      this.sun = new T.DirectionalLight("#fff0d7", 2.6);
      this.sun.position.set(-15, 28, 18);
      this.sun.castShadow = !this.lowPower;
      this.sun.shadow.mapSize.set(
        this.lowPower ? 768 : 1536,
        this.lowPower ? 768 : 1536,
      );
      Object.assign(this.sun.shadow.camera, {
        left: -35,
        right: 35,
        top: 32,
        bottom: -32,
        far: 90,
      });
      this.sun.shadow.normalBias = 0.025;
      this.sun.shadow.bias = -0.0003;
      this.scene.add(this.sun, this.sun.target);
      this.outside = new T.Group();
      this.scene.add(this.outside);
      this.room = new T.Group();
      this.scene.add(this.room);
      this.room.visible = false;
      this.scene.add(this.previewGroup);
      this.roadGroup = new T.Group();
      this.objectGroup = new T.Group();
      this.groundGroup = new T.Group();
      this.staticBatchGroup = new T.Group();
      this.batchedSources = [];
      this.outside.add(
        this.groundGroup,
        this.roadGroup,
        this.objectGroup,
        this.staticBatchGroup,
      );
      this.fixedGroups = new Map();
      this.nav = new Navigation([], S.BOUNDS);
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
      this.heroSole = new T.Box3().setFromObject(this.hero).min.y;
      this.hero.position.copy(pos);
      this.hero.rotation.y = rot;
      this.scene.add(this.hero);

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
      this.petSole = new T.Box3().setFromObject(this.pet).min.y;
      this.petGroundBounce = 0;
      this.pet.position.copy(pos);
      this.pet.userData.action = { type: "pet" };
      this.scene.add(this.pet);
      if (this.view === "pets") {
        this.pet.position.set(0, 0, 0);
        this.pet.scale.setScalar(2);
        this.petShowcaseStart = this.time;
        this.petAction = "";
        this.petUntil = 0;
        if (this.petProp) this.clear(this.petProp);
        this.ballProp = null;
        this.foodBowl = null;
      }
      this.petPath = [];
    }
    makeOutside() {
      this.atmosphere = WorldAtmosphere.build();
      this.outside.add(this.atmosphere.group);
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
            ? "#bb4837"
            : f.id === "letters"
              ? "#218c87"
              : "#7956a5",
          f.id === "home" ? "ДІМ" : f.id === "letters" ? "А" : "МА",
        );
        g.userData.action = { type: "enter", id: f.id };
        g.userData.entrance = { x: f.x, z: f.z + 4 };
        this.fixedGroups.set(f.id, g);
        this.outside.add(g);
      }
      this.lake = SurfaceArt.lake();
      const reflectWater = this.lake.onBeforeRender;
      this.waterNextUpdate = 0;
      this.lake.onBeforeRender = (...args) => {
        if (this.time < this.waterNextUpdate) return;
        reflectWater.apply(this.lake, args);
        this.waterNextUpdate =
          this.time +
          (this.lowPower ? 1 / 4 : this.zoom > 32 ? 1 / 6 : 1 / 15);
      };
      this.outside.add(this.lake);
      this.outside.add(SurfaceArt.lakePlants());
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
      for (let i = 0; i < (this.lowPower ? 38 : 65); i++) {
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
        A.flower(this.outside, x, z, ["#e95585", "#f7ba24", "#fff1ae"][i % 3]);
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
      const butterflyColors = [
        ["#f8b84e", "#db674e"],
        ["#65c4c0", "#5078bf"],
        ["#eb80ad", "#955eb8"],
        ["#ffe071", "#ef8f43"],
        ["#ddd6ff", "#7469b6"],
      ];
      for (let i = 0; i < (this.lowPower ? 6 : 10); i++) {
        const angle = i * 2.399,
          radius = 5 + (i % 4) * 3.1,
          x = Math.cos(angle) * radius,
          z = Math.sin(angle) * radius,
          g = A.group(this.outside, x, 1.2 + (i % 3) * 0.35, z),
          palette = butterflyColors[i % butterflyColors.length],
          wings = [
            A.ball(g, palette[0], -0.105, 0.025, 0, 0.17, 0.028, 0.11),
            A.ball(g, palette[0], 0.105, 0.025, 0, 0.17, 0.028, 0.11),
            A.ball(g, palette[1], -0.075, -0.075, 0.015, 0.11, 0.024, 0.075),
            A.ball(g, palette[1], 0.075, -0.075, 0.015, 0.11, 0.024, 0.075),
          ];
        A.cyl(g, "#49372b", 0, 0, 0.015, 0.022, 0.23).rotation.x = Math.PI / 2;
        this.butterflies.push({
          g,
          wings,
          i,
          phase: angle,
          speed: 0.18 + (i % 4) * 0.025,
          spanX: 8 + (i % 5) * 2.5,
          spanZ: 7 + ((i * 3) % 5) * 2.2,
          height: 1.05 + (i % 4) * 0.28,
          lastX: x,
          lastZ: z,
        });
      }
    }
    house(x, z, wall, roof, sign) {
      const g = A.group(null, x, 0, z);
      g.add(CharacterAssets.cottage(wall, roof));
      const door = A.group(g, -0.61, 0.14, 2.27);
      A.box(door, "#527b72", 0.61, 1.15, 0, 1.22, 2.3, 0.13);
      A.box(door, "#a7c4bd", 0.61, 1.65, 0.08, 0.8, 0.7, 0.03);
      A.ball(door, "#dbb46e", 1.02, 1, 0.1, 0.06);
      g.userData.door = door;
      [-1.65, 1.65].forEach((xx) => {
        for (let i = 0; i < 3; i++) {
          const flower = A.group(g, xx - 0.3 + i * 0.3, 0.7, 2.4);
          A.flower(flower, 0, 0, "#de4777");
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
      this.restoreStatic();
      this.clear(this.groundGroup);
      const plots = [
        { x: 0, z: 0, w: 36, h: 32 },
        ...S.LANDS.filter((l) => this.state.lands.includes(l.id)),
      ];
      if (window.IslandLandscape)
        this.groundGroup.add(IslandLandscape.build(plots));
      const land = (x, z, w, h) => {
        if (!window.IslandLandscape) {
          this.groundGroup.add(WorldAtmosphere.cliff(x, z, w, h));
          A.box(this.groundGroup, "#478c3b", x, -0.09, z, w, 0.2, h);
          A.box(this.groundGroup, "#70aa3e", x, 0.01, z, w, 0.08, h);
        }
      };
      land(0, 0, 36, 32);
      S.LANDS.filter((l) => this.state.lands.includes(l.id)).forEach((l) =>
        land(l.x, l.z, l.w, l.h),
      );
      this.atmosphere.setBounds?.(
        Math.max(...plots.map((l) => Math.abs(l.x) + l.w / 2)),
        Math.max(...plots.map((l) => Math.abs(l.z) + l.h / 2)),
      );
      this.updateNav();
      this.rebuildStatic();
    }
    refreshRoads() {
      this.restoreStatic();
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
      for (const p of this.state.paths || [])
        this.roadGroup.add(GardenPaths.mesh(p.points, p.material, p.border));
      this.rebuildStatic();
    }
    refreshObjects(animateId) {
      this.restoreStatic();
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
    restoreStatic() {
      for (const o of this.batchedSources || []) {
        o.visible = true;
        delete o.userData.renderBatched;
      }
      this.batchedSources = [];
      if (this.staticBatchGroup) this.clear(this.staticBatchGroup);
    }
    rebuildStatic() {
      if (!this.staticBatchGroup) return;
      this.restoreStatic();
      this.outside.updateMatrixWorld(true);
      const skip = new Set([
        this.staticBatchGroup,
        this.atmosphere?.group,
        this.lake,
        ...(this.butterflies || []).map((b) => b.g),
        ...(this.animations || []).map((a) => a.g),
      ]);
      for (const g of [
        ...this.fixedGroups.values(),
        ...this.objectGroup.children,
      ]) {
        if (g.userData.door) skip.add(g.userData.door);
        if (g.userData.swing) skip.add(g.userData.swing);
        if (["gate", "light"].includes(g.userData.parkAction)) skip.add(g);
        if (g.userData.fountainDrops) skip.add(g.userData.fountainDrops);
      }
      const batches = new Map();
      function visit(o) {
        if (skip.has(o) || !o.visible) return;
        if (
          o.isMesh &&
          !o.isSkinnedMesh &&
          !o.isInstancedMesh &&
          !Array.isArray(o.material)
        ) {
          const key = o.geometry.uuid + o.material.uuid;
          if (!batches.has(key)) batches.set(key, []);
          batches.get(key).push(o);
        }
        for (const c of o.children) visit(c);
      }
      visit(this.outside);
      for (const meshes of batches.values()) {
        if (meshes.length < 2) continue;
        const first = meshes[0],
          batch = new T.InstancedMesh(
            first.geometry,
            first.material,
            meshes.length,
          );
        batch.userData.batchOnly = true;
        batch.castShadow = meshes.some((o) => o.castShadow);
        batch.receiveShadow = meshes.some((o) => o.receiveShadow);
        meshes.forEach((o, i) => {
          batch.setMatrixAt(i, o.matrixWorld);
          o.visible = false;
          o.userData.renderBatched = true;
          this.batchedSources.push(o);
        });
        batch.instanceMatrix.needsUpdate = true;
        batch.computeBoundingSphere();
        this.staticBatchGroup.add(batch);
      }
    }
    updateNav() {
      if (!this.nav) return;
      const rects = [...S.FIXED, ...this.state.objects.map(S.footprint)];
      const buckets = new Map();
      for (const r of rects)
        for (
          let x = Math.floor((r.x - r.w - 0.3) / 8);
          x <= Math.floor((r.x + r.w + 0.3) / 8);
          x++
        )
          for (
            let z = Math.floor((r.z - r.h - 0.3) / 8);
            z <= Math.floor((r.z + r.h + 0.3) / 8);
            z++
          ) {
            const key = x + "," + z;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(r);
          }
      this.nav.blocked = (x, z) =>
        !S.inside(this.state, x, z, 0.15) ||
        S.water(x, z) ||
        (buckets.get(Math.floor(x / 8) + "," + Math.floor(z / 8)) || []).some(
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
      let pinch = 0,
        angle = 0,
        midpoint = null,
        multi = false;
      canvas.addEventListener("pointerdown", (e) => {
        if (this.paused) return;
        canvas.setPointerCapture(e.pointerId);
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (points.size === 1) {
          multi = false;
          down = {
            x: e.clientX,
            y: e.clientY,
            lastX: e.clientX,
            lastY: e.clientY,
            moved: false,
            rotate: e.button === 2 || e.shiftKey,
          };
        }
        if (points.size === 2) {
          const p = [...points.values()];
          pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          angle = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
          midpoint = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
          multi = true;
          down.moved = true;
          return;
        }
      });
      canvas.addEventListener("pointermove", (e) => {
        if (this.paused || !points.has(e.pointerId) || !down) return;
        points.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (points.size === 2) {
          const p = [...points.values()],
            d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          const a = Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x),
            mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
          if (this.view === "street") {
            this.panCamera(midpoint.x, midpoint.y, mid.x, mid.y);
            this.rotate(-Math.atan2(Math.sin(a - angle), Math.cos(a - angle)));
          }
          if (d > 10 && pinch > 10)
            this.changeZoom(this.zoom * (pinch / d - 1));
          angle = a;
          midpoint = mid;
          pinch = d;
          down.moved = true;
          return;
        }
        if (multi) return;
        if (this.editor?.type === "road" && !down.rotate) {
          if (!down.roadStarted) {
            const start = this.groundPoint(down.x, down.y);
            if (start)
              this.emit({ type: "road-start", x: start.x, z: start.z });
            down.roadStarted = true;
          }
          const p = this.groundPoint(e.clientX, e.clientY);
          if (p)
            this.emit({
              type: "road-move",
              x: p.x,
              z: p.z,
            });
          down.moved = true;
          return;
        }
        if (
          Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10 ||
          down.moved
        ) {
          if (this.view === "street" && !down.rotate)
            this.panCamera(down.lastX, down.lastY, e.clientX, e.clientY);
          else this.rotate(-(e.clientX - down.lastX) * 0.008);
          down.moved = true;
        }
        down.lastY = e.clientY;
        down.lastX = e.clientX;
      });
      canvas.addEventListener("pointerup", (e) => {
        points.delete(e.pointerId);
        if (down && !down.moved && !multi && !down.rotate && !this.paused) {
          if (this.editor?.type === "road") {
            const p = this.groundPoint(e.clientX, e.clientY);
            if (p) this.emit({ type: "road-start", x: p.x, z: p.z });
          } else this.tap(e.clientX, e.clientY);
        }
        const remaining = [...points.values()][0];
        down = remaining
          ? {
              x: remaining.x,
              y: remaining.y,
              lastX: remaining.x,
              lastY: remaining.y,
              moved: true,
              rotate: false,
            }
          : null;
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
        this.followHero();
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
        Math.min(this.view === "street" ? 90 : 24, this.zoom + d),
      );
      this.updateProjection();
    }
    rotate(d) {
      this.yaw += d;
      if (this.view === "room")
        this.yaw = Math.max(-0.55, Math.min(0.55, this.yaw));
    }
    followHero() {
      this.cameraAnchor = null;
    }
    panCamera(fromX, fromY, toX, toY) {
      if (this.view !== "street") return;
      const a = this.groundPoint(fromX, fromY),
        b = this.groundPoint(toX, toY);
      if (!a || !b) return;
      let anchor;
      if (this.editor?.type === "land") anchor = this.landFocus;
      else if (this.editor) anchor = this.editFocus;
      else {
        if (!this.cameraAnchor) this.cameraAnchor = this.hero.position.clone();
        anchor = this.cameraAnchor;
      }
      if (!anchor) return;
      const plots = S.LANDS.filter((l) => this.state.lands.includes(l.id));
      const minX = Math.min(-18, ...plots.map((l) => l.x - l.w / 2)) - 8,
        maxX = Math.max(18, ...plots.map((l) => l.x + l.w / 2)) + 8;
      const minZ = Math.min(-16, ...plots.map((l) => l.z - l.h / 2)) - 8,
        maxZ = Math.max(16, ...plots.map((l) => l.z + l.h / 2)) + 8;
      anchor.x = Math.max(minX, Math.min(maxX, anchor.x + a.x - b.x));
      anchor.z = Math.max(minZ, Math.min(maxZ, anchor.z + a.z - b.z));
    }
    homeCamera() {
      this.followHero();
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
      if (view === "pets") this.petShowcaseStart = this.time;
      this.portraitLight.visible = ["wardrobe", "pets"].includes(view);
      this.skyLight.groundColor.set(view === "street" ? "#aaa28f" : "#d3c1b6");
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
        this.windowView?.target.dispose();
        this.windowView = null;
        this.mirror = null;
        this.hero.position.set(this.streetPose.x, 0, this.streetPose.z);
        this.pet.position.set(this.streetPose.x + 1, 0, this.streetPose.z + 1);
        this.yaw = this.streetYaw ?? 0.53;
        this.zoom = this.streetZoom || 13;
        this.scene.background.set("#8ccde7");
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
    surfaceHeight(position) {
      if (this.view === "room") {
        const rug = this.furnitureGroups?.rug;
        return rug &&
          Math.abs(position.x - rug.position.x) < 1.98 &&
          Math.abs(position.z - rug.position.z) < 1.43
          ? 0.128
          : 0.045;
      }
      return this.view === "street" &&
        Math.abs(position.x - 12) < 4.2 &&
        Math.abs(position.z - 8) < 1
        ? 0.28
        : 0;
    }
    makeRoom(mode) {
      this.mirror = null;
      this.petProp = null;
      this.ballProp = null;
      this.reflection = null;
      this.clear(this.room);
      A.box(this.room, "#c9a77d", 0, -0.14, 0, 12, 0.25, 10);
      this.room.add(SurfaceArt.floor());
      A.box(this.room, "#dfd8c1", 0, 2.5, -4.9, 12, 5, 0.2);
      A.box(this.room, "#d1d9c6", -5.9, 2.5, 0, 0.2, 5, 10);
      A.box(this.room, "#eee4d0", 0, 0.24, -4.72, 12, 0.35, 0.13);
      A.box(this.room, "#eee4d0", -5.72, 0.24, 0, 0.13, 0.35, 10);
      A.box(this.room, "#f5ebd6", -2, 2.9, -4.73, 2.8, 2.5, 0.12);
      this.makeWindow();
      A.box(this.room, "#f9efd9", -2, 2.9, -4.58, 0.1, 2.3, 0.05);
      A.box(this.room, "#f9efd9", -2, 2.9, -4.58, 2.6, 0.1, 0.05);
      [-3.7, -0.3].forEach((x) =>
        A.box(this.room, "#b4bc9c", x, 2.9, -4.5, 0.5, 2.8, 0.15),
      );
      const closet = A.group(this.room, 3.5, 0, -3.8);
      // A hollow carcass: shelves sit behind the door plane, not on the doors.
      A.box(closet, "#ad8765", 0, 1.65, -0.51, 2.6, 3.3, 0.14);
      for (const x of [-1.24, 1.24])
        A.box(closet, "#c9a480", x, 1.65, 0, 0.15, 3.3, 1.15);
      for (const y of [0.12, 3.25])
        A.box(closet, "#d2b38e", 0, y, 0, 2.6, 0.16, 1.15);
      const doors = [];
      for (const side of [-1, 1]) {
        const hinge = A.group(closet, side * 1.23, 0, 0.62);
        A.box(hinge, "#d4b391", -side * 0.59, 1.7, 0, 1.18, 2.98, 0.12);
        A.box(hinge, "#c7a27d", -side * 0.59, 1.72, 0.07, 0.94, 2.65, 0.045);
        A.ball(hinge, "#806747", -side * 1.02, 1.6, 0.13, 0.055);
        hinge.rotation.y = mode === "wardrobe" ? side * 1.9 : 0;
        doors.push(hinge);
      }
      closet.userData.doors = doors;
      for (let i = 0; i < 3; i++) {
        const y = 0.48 + i * 0.48;
        A.box(closet, "#c7a17b", 0, y, 0, 2.32, 0.075, 1.02);
        for (let j = 0; j < 2; j++) {
          const x = j ? 0.56 : -0.56;
          A.box(
            closet,
            ["#ad7b8d", "#8ba3a6", "#e3d2b6"][(i + j) % 3],
            x,
            y + 0.13,
            0.1,
            0.85,
            0.18,
            0.67,
          );
          A.box(
            closet,
            ["#c49aaa", "#a6babc", "#f0e3ca"][(i + j) % 3],
            x,
            y + 0.235,
            0.1,
            0.81,
            0.055,
            0.64,
          );
        }
      }
      A.tube(
        closet,
        "#a98b62",
        new T.Vector3(-1.1, 2.86, 0),
        new T.Vector3(1.1, 2.86, 0),
        0.028,
      );
      for (let i = 0; i < 3; i++) {
        const x = -0.72 + i * 0.72;
        A.tube(
          closet,
          "#a5805b",
          new T.Vector3(x - 0.28, 2.55, 0.02),
          new T.Vector3(x, 2.73, 0.02),
          0.018,
        );
        A.tube(
          closet,
          "#a5805b",
          new T.Vector3(x, 2.73, 0.02),
          new T.Vector3(x + 0.28, 2.55, 0.02),
          0.018,
        );
        A.tube(
          closet,
          "#a5805b",
          new T.Vector3(x - 0.28, 2.55, 0.02),
          new T.Vector3(x + 0.28, 2.55, 0.02),
          0.018,
        );
        A.tube(
          closet,
          "#a5805b",
          new T.Vector3(x, 2.73, 0.02),
          new T.Vector3(x, 2.87, 0),
          0.014,
        );
        A.box(
          closet,
          ["#bd8599", "#89a39a", "#e1c58f"][i],
          x,
          2.22,
          0.1,
          0.49,
          0.65,
          0.13,
        );
      }
      closet.userData.action = { type: "wardrobe" };
      if (mode === "wardrobe") {
        const dressingRug = SurfaceArt.rug();
        dressingRug.position.x = -0.5;
        dressingRug.scale.set(0.85, 1, 0.9);
        this.room.add(dressingRug);
        const mirror = A.group(this.room, -3, 0, -2.7);
        A.box(mirror, "#bda174", 0, 2.1, 0, 1.9, 3.8, 0.16);
        mirror.rotation.y = 0.38;
        const glass = new T.Reflector(new T.PlaneGeometry(1.65, 3.55), {
          textureWidth: 768,
          textureHeight: 1024,
          color: 0x919191,
          multisample: 0,
          clipBias: 0,
        });
        glass.position.set(0, 2.1, 0.13);
        mirror.add(glass);
        this.mirror = glass;
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
    makeWindow() {
      this.windowView?.target.dispose();
      const target = new T.WebGLRenderTarget(640, 560),
        camera = new T.PerspectiveCamera(59, 640 / 560, 0.1, 180);
      const home =
        S.FIXED.find((f) => f.id === this.roomId) ||
        this.state.objects.find((f) => f.id === this.roomId) ||
        S.FIXED[0];
      camera.position.set(home.x - 1.65, 2.1, home.z + 2.65);
      camera.lookAt(home.x + 1, 1.8, home.z + 17);
      camera.updateMatrixWorld();
      const pane = new T.Mesh(
        new T.PlaneGeometry(2.5, 2.2),
        new T.MeshBasicMaterial({ map: target.texture, toneMapped: false }),
      );
      pane.position.set(-2, 2.9, -4.61);
      this.room.add(pane);
      this.windowView = { target, camera, next: 0 };
    }
    renderWindow() {
      const w = this.windowView,
        r = this.renderer;
      if (
        !w ||
        this.view === "street" ||
        this.time < w.next ||
        !r.getRenderTarget
      )
        return;
      const saved = {
        target: r.getRenderTarget(),
        outside: this.outside.visible,
        room: this.room.visible,
        hero: this.hero.visible,
        pet: this.pet.visible,
        light: this.portraitLight.visible,
        shadow: r.shadowMap.autoUpdate,
        background: this.scene.background,
      };
      try {
        this.outside.visible = true;
        this.room.visible = false;
        this.hero.visible = false;
        this.pet.visible = false;
        this.portraitLight.visible = false;
        r.shadowMap.autoUpdate = false;
        this.scene.background = new T.Color("#8ccde7");
        r.setRenderTarget(w.target);
        r.render(this.scene, w.camera);
        w.next = this.time + 0.25;
      } finally {
        r.setRenderTarget(saved.target);
        this.outside.visible = saved.outside;
        this.room.visible = saved.room;
        this.hero.visible = saved.hero;
        this.pet.visible = saved.pet;
        this.portraitLight.visible = saved.light;
        r.shadowMap.autoUpdate = saved.shadow;
        this.scene.background = saved.background;
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
      this.petActionStart = this.time;
      this.petUntil = this.time + ({ feed: 5.2, ball: 6.2, stroke: 2.8 }[action] || 2.8);
      if (this.view === "pets" && !this.petProp) {
        this.petProp = new T.Group();
        this.room.add(this.petProp);
      }
      if (this.petProp) {
        this.clear(this.petProp);
        this.ballProp = null;
        if (action === "feed") {
          const bowl = new T.Group(),
            shell = new T.Mesh(
              new T.CylinderGeometry(0.5, 0.38, 0.24, 28, 1, true),
              A.mat("#b85f4f"),
            ),
            base = new T.Mesh(
              new T.CylinderGeometry(0.37, 0.37, 0.08, 28),
              A.mat("#93473f"),
            ),
            rim = new T.Mesh(
              new T.TorusGeometry(0.5, 0.065, 8, 28),
              A.mat("#d98267"),
            );
          shell.position.y = 0.18;
          base.position.y = 0.06;
          rim.position.y = 0.31;
          rim.rotation.x = Math.PI / 2;
          bowl.add(shell, base, rim);
          for (let i = 0; i < 9; i++)
            A.ball(
              bowl,
              i % 3 ? "#7b4d31" : "#9b653d",
              Math.cos(i * 2.4) * (0.12 + (i % 2) * 0.13),
              0.33 + (i % 3) * 0.018,
              Math.sin(i * 2.4) * (0.12 + (i % 2) * 0.13),
              0.075,
              0.045,
              0.075,
            );
          bowl.position.set(0, 0, 1.55);
          this.petProp.add(bowl);
          this.foodBowl = bowl;
        }
        if (action === "ball") {
          this.ballProp = A.ball(this.petProp, "#daa95f", 0, 0.25, 1.5, 0.22);
        }
      }
      this.emit({ type: "pet-react", action });
    }
    setEditor(editor) {
      this.stop();
      this.editor = editor;
      this.editFocus = (this.cameraAnchor || this.hero.position).clone();
      this.clear(this.previewGroup);
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
          o.material.userData = {};
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
    previewRoad(cells, material, border = "none") {
      if (this.ghost) {
        A.dispose(this.ghost);
        this.previewGroup.remove(this.ghost);
      }
      const g = new T.Group();
      if (window.GardenPaths) {
        if (cells.length) {
          const valid =
            material === "erase" ||
            !GardenPaths.error(this.state, cells, material, border);
          g.add(
            GardenPaths.mesh(
              cells,
              material,
              border,
              material === "erase" ? "#d99383" : valid ? "#a8e1a2" : "#d9796e",
            ),
          );
          if (cells.length === 1)
            A.cyl(g, "#a8e1a2", cells[0].x, 0.18, cells[0].z, 0.75, 0.06);
        }
        this.previewGroup.add(g);
        this.ghost = g;
        return;
      }
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
      this.landFocus = new T.Vector3(l.x, 0, l.z);
      this.zoom = Math.max(15, Math.max(l.w, l.h) * 0.75);
      this.updateProjection();
    }
    loop(now) {
      requestAnimationFrame(this.loop);
      if (document.hidden) {
        this.last = now;
        return;
      }
      if (this.lowPower && now - this.last < 30) return;
      const elapsed = (now - this.last) / 1000;
      this.last = now;
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
          this.followHero();
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
        CharacterAssets.animate(this.hero, this.time, moving, this.reduced);
        this.hero.position.y = this.sitting
          ? (this.sitY ?? 0.45)
          : this.surfaceHeight(this.hero.position) -
            (this.view === "room" ? this.heroSole : 0) +
            this.jumpY;
        this.hero.userData.legs.forEach(
          (m, i) =>
            (m.rotation.x = this.sitting
              ? -Math.PI / 2
              : moving
                ? Math.sin(this.time * 11 + i * Math.PI) * 0.45
                : 0),
        );
        this.hero.userData.arms.forEach((m, i) => {
          const idle = !moving && !this.reduced;
          m.rotation.x = moving
            ? -Math.sin(this.time * 11 + i * Math.PI) * 0.35
            : idle
              ? Math.sin(this.time * 1.3 + i * 1.4) * 0.045
              : 0;
          m.rotation.z =
            !this.reduced && this.time < this.poseUntil
              ? (i ? 1 : -1) *
                (0.055 +
                  Math.max(0, Math.sin((this.poseUntil - this.time) * 4)) *
                    0.24)
              : (i ? 1 : -1) *
                (0.045 + (idle ? Math.sin(this.time * 0.9 + i) * 0.018 : 0));
          m.rotation.y = idle ? Math.sin(this.time * 0.8 + i) * 0.025 : 0;
          if (this.jumpY > 0.05)
            m.rotation.z += (i ? 1 : -1) * Math.min(0.65, this.jumpY * 0.6);
        });
        if (this.view === "wardrobe") {
          this.hero.position.y = 0.13 - this.heroSole;
          this.hero.rotation.y = this.yaw;
        }
      }
      if (this.pet) {
        const previousX = this.pet.position.x,
          previousZ = this.pet.position.z;
        if (this.view === "pets") {
          const active = this.petUntil > this.time,
            actionTime = Math.max(0, this.time - this.petActionStart),
            phase = (this.time - this.petShowcaseStart) % 14;
          let targetX = 0,
            targetZ = 0,
            targetRotation = this.yaw + (this.pet.userData.headingOffset || 0);
          if (active && this.petAction === "feed") {
            const approach = T.MathUtils.smoothstep(actionTime, 0.15, 1.45);
            targetZ = approach * 0.82;
            targetRotation = this.pet.userData.headingOffset || 0;
          } else if (active && this.petAction === "ball") {
            const ballX = Math.sin(Math.max(0, actionTime - 0.25) * 2.25) * 1.45;
            targetX = ballX * 0.72;
            targetZ = 0.42 + Math.abs(Math.sin(actionTime * 1.7)) * 0.16;
            targetRotation =
              Math.atan2(ballX - this.pet.position.x, 1.45 - this.pet.position.z) +
              (this.pet.userData.headingOffset || 0);
          } else if (!active) {
            if (phase >= 2 && phase < 7) targetX = -1.05;
            else if (phase >= 7 && phase < 12) targetX = 0.8;
            else targetX = 0;
            targetZ = 0;
          }
          const dx = targetX - this.pet.position.x,
            dz = targetZ - this.pet.position.z,
            remaining = Math.hypot(dx, dz),
            speed = active && this.petAction === "ball" ? 2.35 : 1.15;
          if (remaining > 0.008) {
            const step = Math.min(remaining, dt * speed);
            this.pet.position.x += (dx / remaining) * step;
            this.pet.position.z += (dz / remaining) * step;
            if (!(active && this.petAction === "feed"))
              targetRotation =
                Math.atan2(dx, dz) + (this.pet.userData.headingOffset || 0);
          }
          const turn = Math.atan2(
            Math.sin(targetRotation - this.pet.rotation.y),
            Math.cos(targetRotation - this.pet.rotation.y),
          );
          this.pet.rotation.y += turn * (1 - Math.exp(-dt * 4));
        }
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
                // Keep imported pets moving continuously. The previous
                // on/off stride changed their velocity every few frames,
                // which made their whole body jerk at each turn.
                const oldX = this.pet.position.x,
                  oldZ = this.pet.position.z;
                const next = nav.move(
                  this.pet.position,
                  (dx / len) * Math.min(dt * 6.5, len),
                  (dz / len) * Math.min(dt * 6.5, len),
                );
                this.pet.position.x = next.x;
                this.pet.position.z = next.z;
                const movedX = next.x - oldX,
                  movedZ = next.z - oldZ;
                // Face the direction the navigator actually accepted. Grid
                // corrections can differ from the next waypoint direction;
                // steering toward the rejected direction made pets flick
                // left and right at corners.
                if (Math.hypot(movedX, movedZ) > 0.00005) {
                  const angle =
                      Math.atan2(movedX, movedZ) +
                      (this.pet.userData.headingOffset || 0),
                    delta = Math.atan2(
                      Math.sin(angle - this.pet.rotation.y),
                      Math.cos(angle - this.pet.rotation.y),
                    );
                  this.pet.rotation.y += delta * (1 - Math.exp(-dt * 3.5));
                }
              }
            }
          } else this.petPath = [];
        }
        const distance = Math.hypot(
          this.pet.position.x - previousX,
          this.pet.position.z - previousZ,
        );
        CharacterAssets.animate(
          this.pet,
          this.time,
          distance > 0.0005,
          this.reduced,
        );
        const active = this.petUntil > this.time;
        const behavior = PetBehavior.update(this.pet, {
          time: this.time,
          dt,
          distance,
          action: active ? this.petAction : "",
          reduced: this.reduced,
        });
        this.petGroundBounce +=
          (behavior.bounce - this.petGroundBounce) *
          (this.reduced ? 1 : 1 - Math.exp(-dt * 12));
        this.pet.rotation.z = 0;
        this.pet.position.y = 0;
        this.pet.updateMatrixWorld(true);
        // Keep a stable floor anchor. Recomputing the animated bounding box on
        // every frame made the whole animal jump whenever a paw rotated.
        const sole = this.petSole * this.pet.scale.y;
        const floor =
          this.view === "pets"
            ? 0.27
            : this.view === "wardrobe"
              ? 0.045
              : this.surfaceHeight(this.pet.position);
        this.pet.position.y =
          floor -
          sole +
          this.petGroundBounce +
          (this.pet.userData.hoverPet
            ? 0.42 + (this.reduced ? 0 : Math.sin(this.time * 3.1) * 0.08)
            : 0);
        if (this.ballProp) {
          const ballTime = Math.max(0, this.time - this.petActionStart);
          this.ballProp.position.set(
            Math.sin(Math.max(0, ballTime - 0.25) * 2.25) * 1.45,
            0.24 + Math.abs(Math.sin(ballTime * 4.5)) * 0.72,
            1.45,
          );
          this.ballProp.rotation.x += dt * 7;
          this.ballProp.rotation.z += dt * 4;
        }
        if (!active && this.petProp) {
          this.clear(this.petProp);
          this.ballProp = null;
          this.foodBowl = null;
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
          this.batchNeedsUpdate = true;
          return false;
        }
        return true;
      });
      if (this.batchNeedsUpdate) {
        this.batchNeedsUpdate = false;
        this.rebuildStatic();
      }
      if (!this.reduced) {
        this.butterflies.forEach((b) => {
          const t = this.time * b.speed + b.phase,
            drift = this.time * 0.037 + b.i * 1.73,
            candidateX = Math.sin(t * 1.13) * b.spanX + Math.sin(drift) * 7,
            candidateZ = Math.sin(t * 0.71 + b.i) * b.spanZ + Math.cos(drift * 0.83) * 6;
          if (S.inside(this.state, candidateX, candidateZ, 0.8) && !S.water(candidateX, candidateZ)) {
            b.g.position.x += (candidateX - b.g.position.x) * 0.025;
            b.g.position.z += (candidateZ - b.g.position.z) * 0.025;
          } else {
            b.g.position.x += (Math.sin(b.phase) * 4 - b.g.position.x) * 0.018;
            b.g.position.z += (Math.cos(b.phase) * 4 - b.g.position.z) * 0.018;
          }
          const dx = b.g.position.x - b.lastX,
            dz = b.g.position.z - b.lastZ;
          if (Math.abs(dx) + Math.abs(dz) > 0.0001) b.g.rotation.y = Math.atan2(dx, dz);
          b.lastX = b.g.position.x;
          b.lastZ = b.g.position.z;
          b.g.position.y = b.height + Math.sin(this.time * (1.6 + (b.i % 3) * 0.18) + b.phase) * 0.3;
          const flap = Math.sin(this.time * (10 + (b.i % 4)) + b.phase) * 0.95;
          b.wings.forEach((w, j) => (w.rotation.z = flap * (j % 2 ? -1 : 1)));
        });
        for (const g of this.objectGroup.children) {
          if (g.userData.swing)
            g.userData.swing.rotation.x = Math.sin(this.time * 1.4) * 0.15;
        }
      }
      for (const g of this.objectGroup.children)
        window.ParkAssets?.animate(g, this.time, this.reduced);
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
              : this.cameraAnchor || this.hero.position,
        );
        dist = Math.max(35, this.zoom * 1.7);
        height = dist * 0.8;
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
      if (this.view === "street") {
        this.sun.position.set(this.focus.x - 15, 28, this.focus.z + 18);
        this.sun.target.position.set(this.focus.x, 0, this.focus.z);
      } else {
        this.sun.position.set(-15, 28, 18);
        this.sun.target.position.set(0, 0, 0);
      }
      this.renderWindow();
      this.lake.material.uniforms.time.value = this.reduced
        ? 0
        : this.time * 0.35;
      this.atmosphere.update(this.time, this.reduced);
      this.renderer.render(this.scene, this.camera);
    }
  }
  window.TownWorld = TownWorld;
})();
