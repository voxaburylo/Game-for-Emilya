(function (root) {
  "use strict";
  const T = root.THREE;
  const cycles = {
    dog: [
      ["look", 3],
      ["sniff", 3],
      ["sit", 5],
      ["look", 2],
      ["shake", 1.6],
      ["lie", 6],
      ["stretch", 2.5],
    ],
    shiba: [
      ["look", 2.6],
      ["sniff", 3.4],
      ["sit", 4.5],
      ["shake", 1.4],
      ["look", 2],
      ["lie", 5.5],
      ["stretch", 2.3],
    ],
    kenney: [
      ["look", 2.4],
      ["sniff", 2.6],
      ["sit", 3.2],
      ["look", 2.2],
      ["stretch", 2.1],
      ["lie", 3.8],
    ],
    cat: [
      ["look", 2],
      ["groom", 6],
      ["sit", 3],
      ["lie", 6],
      ["stretch", 3],
      ["look", 3],
    ],
    rabbit: [
      ["look", 2.5],
      ["sit", 3],
      ["stamp", 2],
      ["groom", 4],
      ["lie", 4],
      ["look", 3],
    ],
    fox: [
      ["look", 3],
      ["listen", 3],
      ["sit", 5],
      ["sniff", 3],
      ["lie", 6],
      ["stretch", 2.5],
    ],
  };
  const names = {
    look: "розглядається",
    sniff: "нюхає",
    sit: "сидить",
    shake: "обтрушується",
    lie: "лежить",
    stretch: "потягується",
    groom: "вмивається",
    stamp: "тупотить",
    listen: "прислухається",
    walk: "іде",
    feed: "їсть",
    stroke: "радіє",
    ball: "стежить за м’ячиком",
  };
  function init(pet) {
    const d = pet.userData,
      parts = { body: d.torso, head: d.head, tail: d.tail };
    d.legs.forEach((n, i) => (parts["leg" + i] = n));
    d.ears.forEach((n, i) => (parts["ear" + i] = n));
    const rest = {};
    for (const [key, node] of Object.entries(parts))
      rest[key] = node.position.clone();
    const b = { parts, rest, idle: 0, distance: 0, name: "look" };
    if (d.characterModel === "cat") {
      const tongue = new T.Mesh(
        new T.SphereGeometry(1, 12, 8),
        new T.MeshStandardMaterial({ color: "#d49291", roughness: 0.65 }),
      );
      tongue.position.set(0, -0.15, 0.4);
      tongue.scale.set(0.025, 0.009, 0.035);
      tongue.visible = false;
      d.head.add(tongue);
      b.tongue = tongue;
    }
    d.behavior = b;
    return b;
  }
  function update(
    pet,
    { time, dt, distance = 0, action = "", reduced = false },
  ) {
    if (pet.userData.companion)
      return root.CompanionAssets.animate(pet, {
        time,
        dt,
        distance,
        action,
        reduced,
      });
    const d = pet.userData,
      type = d.characterModel,
      canine = type === "dog" || type === "shiba",
      b = d.behavior || init(pet),
      moving = distance > 0.0005;
    b.distance += distance;
    if (moving || action) b.idle = 0;
    else b.idle += dt;
    let state = "look",
      phase = 0;
    if (moving) state = "walk";
    else if (action) state = action;
    else if (!reduced) {
      const cycle = cycles[type] || cycles.kenney,
        length = cycle.reduce((n, a) => n + a[1], 0);
      phase = b.idle % length;
      for (const [name, duration] of cycle) {
        if (phase < duration) {
          state = name;
          break;
        }
        phase -= duration;
      }
    }
    b.name = state;
    const poses = {};
    for (const key of Object.keys(b.parts))
      poses[key] = { p: [0, 0, 0], r: [0, 0, 0] };
    const body = poses.body,
      head = poses.head,
      tail = poses.tail;
    const wave = reduced ? 0 : Math.sin(time * 1.8),
      breath = reduced ? 0 : Math.sin(time * 1.7) * 0.002;
    body.p[1] = breath;
    head.r[1] = reduced ? 0 : Math.sin(time * 0.65) * 0.22;
    head.r[2] = reduced ? 0 : Math.sin(time * 0.9) * 0.035;
    tail.r[2] = reduced
      ? 0
      : Math.sin(time * (canine ? 5 : 1.7)) * (canine ? 0.16 : 0.1);
    if (type === "cat") tail.r[1] = reduced ? 0 : Math.sin(time * 2.4) * 0.18;
    for (let i = 0; i < d.ears.length; i++) {
      poses["ear" + i].r[2] = reduced
        ? 0
        : Math.sin(time * (type === "rabbit" ? 2.7 : 1.8) + i * 2) *
          (type === "rabbit" ? 0.11 : 0.035);
      poses["ear" + i].r[0] = reduced ? 0 : Math.sin(time * 1.1 + i) * 0.045;
    }
    function sit() {
      body.r[0] = -0.4;
      body.p[1] = -0.2 + breath;
      if (type === "cat" || type === "fox") body.p[1] = -0.14 + breath;
      head.r[0] = 0.16;

      if (type === "rabbit") {
        body.r[0] = -0.12;
        body.p[1] = -0.09 + breath;
      }
    }
    function lie() {
      body.p[1] = (canine ? -0.29 : -0.24) + breath;
      body.r[0] = 0.03;
      head.r[0] = 0.22;
      head.r[1] *= 0.4;
      head.p[1] = -0.035;

      tail.r[0] = 0.65;
      tail.r[2] = 0.15 + wave * 0.04;
      if (type === "fox") {
        tail.r[1] = 1.0;
        head.r[2] = -0.13;
      }
      if (type === "rabbit") {
        body.p[1] = -0.24;
        head.r[0] = 0.15;
        poses.ear0.r[0] = -0.4;
        poses.ear1.r[0] = -0.5;
      }
    }
    let bounce = 0;
    if (state === "walk") {
      const a = b.distance * (type === "rabbit" ? 13 : 10);
      head.r[1] = 0;
      head.r[0] = reduced ? 0 : Math.sin(a) * 0.025;

      bounce = reduced
        ? 0
        : Math.abs(Math.sin(a)) * (type === "rabbit" ? 0.045 : 0.006);
      // A stable horizon reads better on a tablet; leg motion and the small
      // vertical bounce already communicate walking without rocking the pet.
      body.r[2] = 0;
      for (let i = 0; i < d.ears.length; i++)
        poses["ear" + i].r[0] = reduced
          ? 0
          : Math.sin(a + i * 0.4) * (canine ? 0.22 : 0.09);
    } else if (state === "sit") sit();
    else if (state === "lie") lie();
    else if (state === "groom") {
      sit();
      head.r[0] = 0.62 + (reduced ? 0 : Math.sin(time * 7) * 0.08);
      head.r[1] = type === "rabbit" ? 0 : -0.22;
      head.p[1] = -0.1;

      if (type === "cat") {
        head.r[1] = -0.35;
      }
      if (type === "rabbit") {
        poses.ear0.r[0] = -0.18;
        poses.ear1.r[0] = -0.1;
      }
    } else if (state === "stamp") {
      sit();
      head.r[1] = -0.18;
      if (poses.ear0) poses.ear0.r[2] = -0.18;
      if (poses.ear1) poses.ear1.r[2] = 0.1;
    } else if (state === "sniff" || state === "feed") {
      body.r[0] = 0.13;
      body.p[1] = -0.07;
      head.r[0] = 0.78 + (reduced ? 0 : Math.sin(time * 6) * 0.04);
      head.p[1] = -0.13;
      head.r[1] = reduced ? 0 : Math.sin(time * 2.5) * 0.12;
      if (type === "rabbit") {
        head.r[0] = 0.45;
        body.r[0] = 0.06;
      }
    } else if (state === "shake") {
      const shake = reduced ? 0 : Math.sin(time * 23);
      body.r[2] = shake * 0.08;
      head.r[2] = shake * 0.19;
      head.r[1] = shake * 0.13;
      if (poses.ear0) poses.ear0.r[2] = shake * 0.3;
      if (poses.ear1) poses.ear1.r[2] = shake * 0.3;
    } else if (state === "stretch") {
      body.r[0] = 0.2;
      body.p[1] = -0.13;
      head.r[0] = 0.35;
      head.p[1] = -0.09;

      tail.r[0] = -0.18;
    } else if (state === "listen") {
      head.r[2] = 0.14;
      head.r[1] = reduced ? 0.2 : 0.22 + Math.sin(time) * 0.12;
      poses.ear0.r[2] = -0.15;
      poses.ear1.r[0] = -0.18;
    } else if (state === "stroke") {
      sit();
      head.r[2] = 0.13;
      head.r[0] = -0.12;
      tail.r[2] = reduced ? 0 : Math.sin(time * 11) * 0.35;
    } else if (state === "ball") {
      head.r[1] = reduced ? 0 : Math.sin(time * 2) * 0.35;
      head.r[0] = 0.12;
      tail.r[2] = reduced ? 0 : Math.sin(time * 8) * 0.24;
    }
    if (d.staticPet) {
      // This CC model was supplied without a skeleton. Keep its sculpt and
      // collar intact, while giving it readable whole-body motions.
      // The source Shiba was sculpted in a deep crouch. Lift its torso while
      // PetRig keeps the paws planted, giving it a natural standing height.
      body.p = [0, breath + (type === "shiba" ? 0.18 : 0), 0];
      body.r = [0, 0, 0];
      // Static imports animate their complete sculpt through the body/leg
      // bones. Do not add a second root bounce: it made every foot contact
      // move vertically and looked like rapid trembling.
      bounce = 0;
      if (state === "walk") {
        const hop = reduced ? 0 : Math.abs(Math.sin(b.distance * 10));
        body.p[1] += hop * (d.hoverPet ? 0.012 : type === "shiba" ? 0.008 : 0.016);
        body.r[0] = d.hoverPet ? 0 : type === "shiba" ? 0 : -0.025;
        body.r[2] =
          reduced || type === "shiba" ? 0 : Math.sin(b.distance * 10) * 0.035;
      } else if (state === "sniff" || state === "feed") {
        body.p[1] += state === "feed" ? 0.02 : 0;
        body.r[0] = state === "feed" && type !== "shiba" ? -0.22 : -0.075;
      } else if (state === "shake") {
        body.r[2] = reduced ? 0 : Math.sin(time * 23) * 0.045;
      } else if (state === "lie") {
        body.p[1] -= 0.07;
        body.r[0] = 0.045;
      } else if (state === "stretch") {
        body.p[1] -= 0.035;
        body.r[0] = 0.065;
      } else if (state === "stroke") {
        body.r[2] = reduced ? 0 : Math.sin(time * 3) * 0.025;
      } else if (state === "ball") {
        body.r[1] = reduced ? 0 : Math.sin(time * 2) * 0.045;
      }
      if (type === "shiba" && head) {
        head.p = [0, 0, 0];
        head.r = [0, 0, 0];
        if (state === "walk" && !reduced)
          head.r[0] = Math.sin(b.distance * 10) * 0.045;
        else if (state === "feed") head.r[0] = -0.18;
        else if (state === "sniff") head.r[0] = -0.09;
        else if (state === "stroke") head.r[2] = 0.09;
        else if (!reduced) head.r[1] = Math.sin(time * 0.7) * 0.065;
      } else if (head) {
        head.p = [0, 0, 0];
        head.r = [0, 0, 0];
      }
      if (tail) {
        tail.p = [0, 0, 0];
        tail.r = [0, 0, 0];
      }
    }
    const blend = reduced ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) * 7);
    for (const [key, node] of Object.entries(b.parts)) {
      if (key.startsWith("leg")) continue;
      const p = poses[key],
        rest = b.rest[key];
      for (let i = 0; i < 3; i++) {
        const axis = ["x", "y", "z"][i];
        node.position[axis] +=
          (rest[axis] + p.p[i] - node.position[axis]) * blend;
        node.rotation[axis] += (p.r[i] - node.rotation[axis]) * blend;
      }
    }
    root.PetRig.pose(pet, b, state, time, dt, reduced);
    if (b.tongue) {
      b.tongue.visible = state === "groom";
      b.tongue.scale.z = reduced
        ? 0.025
        : 0.025 + Math.max(0, Math.sin(time * 7)) * 0.035;
    }
    return { state, bounce, moving, label: names[state] || state };
  }
  root.PetBehavior = { update, cycles, names };
  if (typeof module !== "undefined") module.exports = root.PetBehavior;
})(typeof window !== "undefined" ? window : globalThis);
