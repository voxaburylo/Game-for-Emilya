// A small, finite celebration. Motor speed never changes the learning record.
(function (root) {
  "use strict";
  const TOTAL = 12,
    PER_GEM = 4,
    DURATIONS = { fruit: 2.5, balloon: 2.8 },
    STAGGER = 0.16;
  const modeBag = [];
  // Shuffle a two-item bag so both rewards appear regularly without asking
  // a child to choose or allowing a long run of just one mode.
  function chooseMode(random = Math.random) {
    if (!modeBag.length)
      modeBag.push(
        ...(random() < 0.5
          ? ["balloon", "fruit"]
          : ["fruit", "balloon"]),
      );
    return modeBag.shift();
  }
  function resetModes() {
    modeBag.length = 0;
  }
  function create() {
    return { popped: [], credited: 0, closed: false };
  }
  function pop(game, id) {
    if (
      game.closed ||
      !Number.isInteger(id) ||
      id < 0 ||
      id >= TOTAL ||
      game.popped.includes(id)
    )
      return null;
    game.popped.push(id);
    const earned = Math.floor(game.popped.length / PER_GEM),
      gems = earned - game.credited;
    game.credited = earned;
    return {
      gems,
      count: game.popped.length,
      complete: game.popped.length === TOTAL,
    };
  }
  function credit(state, game, id) {
    const result = pop(game, id);
    if (result) state.gems += result.gems;
    return result;
  }
  // Segment hit testing also catches balloons between sparse touch events.
  function intersects(a, b, rect) {
    const cx = rect.left + rect.width / 2,
      cy = rect.top + rect.height * 0.43;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((cx - a.x) * dx + (cy - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    return (
      Math.hypot(a.x + t * dx - cx, a.y + t * dy - cy) <
      Math.min(rect.width * 0.48, rect.height * 0.39)
    );
  }
  const colors = ["#ef6583", "#efae38", "#46b6b5", "#8c79d8"],
    fruitAssets = [
      "apple",
      "orange",
      "banana",
      "strawberry",
      "pear",
      "pineapple",
      "mango",
      "pomegranate",
      "lemon",
      "peach",
    ];
  // Normalised one-pass flight: fruits rise and fall; balloons only rise.
  // A miss simply means a smaller bonus and never stalls the celebration.
  function flight(mode, age, slot, width, height, size, calm = false) {
    const duration = DURATIONS[mode] * (calm ? 1.35 : 1);
    const lanes = width < 420 ? 2 : 4;
    const local =
      age - (slot % lanes) * STAGGER - Math.floor(slot / lanes) * 0.4;
    if (local < 0) return { x: 0, y: height + size, angle: 0 };
    if (local > duration)
      return { x: 0, y: height + size, angle: 0 };
    const t = local / duration;
    const x = (((slot % lanes) + 0.5) * width) / lanes - size / 2;
    const bottom = height + size * 0.1,
      top = Math.min(135, height * 0.22);
    return {
      x: Math.max(
        2,
        Math.min(
          width - size - 2,
          x + Math.sin(t * Math.PI * 2 + slot) * Math.min(14, width * 0.02),
        ),
      ),
      y:
        mode === "fruit"
          ? bottom - (bottom - top) * 4 * t * (1 - t)
          : bottom - t * (bottom + size * 1.4),
      angle:
        mode === "fruit" ? -35 + t * 100 : Math.sin(t * Math.PI * 2 + slot) * 7,
    };
  }
  function fruit(id, split = false) {
    const name = fruitAssets[id % fruitAssets.length];
    return `<img src="models/party-fruit/${name}.png" alt="" aria-hidden="true"${split ? ' class="fruit-split"' : ""}>`;
  }
  function balloon(id) {
    const c = colors[id % 4],
      g = "party-shine-" + id;
    return `<svg viewBox="0 0 120 158" aria-hidden="true"><defs><radialGradient id="${g}" cx="32%" cy="25%" r="80%"><stop stop-color="#fff" stop-opacity=".65"/><stop offset=".38" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#3b3159" stop-opacity=".2"/></radialGradient></defs><path d="M60 110Q46 124 60 136T58 156" fill="none" stroke="#697e9080" stroke-width="2"/><path d="m60 100-7 14q7 4 14 0Z" fill="${c}"/><ellipse cx="60" cy="56" rx="49" ry="53" fill="${c}"/><ellipse cx="60" cy="56" rx="49" ry="53" fill="url(#${g})"/><ellipse cx="38" cy="28" rx="9" ry="17" transform="rotate(35 38 28)" fill="#fff" opacity=".6"/><path d="m60 43 4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1Z" fill="#fff" opacity=".9"/></svg>`;
  }
  function mount(host, game, options) {
    const { icon, onPop, onEnd, reduced = false, mode = "balloon" } = options;
    const isFruit = mode === "fruit";
    let disposed = false,
      pointer = null,
      previous = null,
      changing = false;
    let raf = 0,
      last = 0,
      age = 0,
      waveIndex = 0;
    const timers = new Set();
    const later = (fn, delay) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!disposed) fn();
      }, delay);
      timers.add(timer);
    };
    host.innerHTML = `<section class="party ${reduced ? "party-calm" : ""}" aria-labelledby="party-title"><div class="party-confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, i) => `<i style="--x:${(i * 47) % 100}%;--delay:${(i % 7) * 0.055}s;--spin:${i % 2 ? 1 : -1}"></i>`).join("")}</div><header class="party-head"><div><span class="party-eyebrow">ЗАНЯТТЯ ЗАВЕРШЕНО</span><h2 id="party-title">Ти молодець!</h2><p>Лускай кульки — збирай кристали</p></div><div class="party-base">${icon("gem")}<b>+3</b><small>за заняття</small></div></header><div class="party-meter" aria-label="Бонусні кристали">${[0, 1, 2].map((i) => `<div class="party-gem" data-gem="${i}">${icon("gem")}<span>${[0, 1, 2, 3].map((j) => `<i data-pip="${i * 4 + j}"></i>`).join("")}</span></div>`).join("")}</div><div class="party-field" role="group" aria-label="Кульки. Торкайся або проводь пальцем."><div class="party-balloons"></div><div class="party-demo" aria-hidden="true">${icon("hand")}<span>Торкнись!</span></div><div class="party-sparks" aria-hidden="true"></div></div><footer class="party-footer"><span class="party-count" role="status" aria-live="polite">0 / 12</span><button type="button" class="secondary party-finish">${icon("check")}Готово</button></footer></section>`;
    if (isFruit) {
      host.querySelector(".party-head p").textContent =
        "Проведи пальцем через фрукти";
      host.querySelector(".party-demo span").textContent = "Проведи пальцем!";
      host
        .querySelector(".party-field")
        .setAttribute("aria-label", "Фрукти. Проведи пальцем або торкнись.");
      host.querySelector(".party").classList.add("party-fruit");
    }
    const field = host.querySelector(".party-field"),
      rack = host.querySelector(".party-balloons"),
      sparks = host.querySelector(".party-sparks"),
      counter = host.querySelector(".party-count"),
      demo = host.querySelector(".party-demo"),
      finish = host.querySelector(".party-finish");
    function wave() {
      changing = false;
      age = 0;
      const start = waveIndex * 4;
      rack.innerHTML = Array.from(
        { length: 4 },
        (_, i) =>
          `<button type="button" class="party-balloon" data-balloon="${start + i}" aria-label="${isFruit ? "Розрізати фрукт" : "Луснути кульку"} ${start + i + 1}">${isFruit ? fruit(start + i) : balloon(start + i)}</button>`,
      ).join("");
      rack.querySelectorAll("button").forEach((button) => {
        if (game.popped.includes(Number(button.dataset.balloon))) {
          button.disabled = true;
          button.classList.add("popped");
        }
      });
    }
    function advanceWave(keyboard = false) {
      if (disposed || changing || game.closed) return;
      changing = true;
      pointer = null;
      previous = null;
      if (waveIndex >= TOTAL / 4 - 1) {
        if (game.popped.length === TOTAL) {
          counter.textContent = "Усе зібрано! +3 кристали";
          host.querySelector("#party-title").textContent = "Оце так свято!";
        } else {
          counter.textContent = `${game.popped.length} / ${TOTAL}`;
          host.querySelector("#party-title").textContent = "Чудова спроба!";
        }
        later(end, reduced ? 220 : 550);
        return;
      }
      waveIndex += 1;
      later(
        () => {
          wave();
          if (keyboard) rack.querySelector("button")?.focus();
        },
        reduced ? 90 : 180,
      );
    }
    function frame(time) {
      if (disposed) return;
      const dt = last ? Math.min(0.05, (time - last) / 1000) : 0;
      last = time;
      // Pause only in the background. Every visible wave has a finite pass.
      const keyboard = rack.contains(document.activeElement);
      if (!document.hidden) age += dt;
      const w = field.clientWidth,
        h = field.clientHeight,
        size = Math.max(72, Math.min(150, (w - 20) / (w < 420 ? 2 : 4)));
      rack.querySelectorAll("button").forEach((button, i) => {
        const p = flight(mode, age, i, w, h, size, reduced);
        if (keyboard) {
          const lanes = w < 420 ? 2 : 4;
          p.x = (((i % lanes) + 0.5) * w) / lanes - size / 2;
          p.y = ((Math.floor(i / lanes) + 0.5) * h) / (4 / lanes) - size / 2;
          p.angle = 0;
        }
        button.style.width = size + "px";
        button.style.transform = `translate(${p.x}px,${p.y}px) rotate(${p.angle}deg)`;
      });
      const lanes = w < 420 ? 2 : 4,
        lastDelay = (3 % lanes) * STAGGER + Math.floor(3 / lanes) * 0.4,
        waveLife = DURATIONS[mode] * (reduced ? 1.35 : 1) + lastDelay + 0.18;
      if (age >= waveLife) advanceWave(keyboard);
      raf = requestAnimationFrame(frame);
    }
    function end() {
      if (disposed || game.closed) return;
      game.closed = true;
      onEnd();
    }
    function burst(button) {
      const r = button.getBoundingClientRect(),
        f = field.getBoundingClientRect();
      const burst = document.createElement("div");
      burst.className = "party-burst";
      burst.style.left = r.left + r.width / 2 - f.left + "px";
      burst.style.top = r.top + r.height * 0.43 - f.top + "px";
      burst.innerHTML = `${isFruit ? `<span class="fruit-half half-left">${fruit(Number(button.dataset.balloon), true)}</span><span class="fruit-half half-right">${fruit(Number(button.dataset.balloon), true)}</span><em class="fruit-splash"></em>` : "<b>★</b>"}${Array.from({ length: 8 }, (_, i) => `<i style="--dx:${Math.cos((i * Math.PI) / 4) * 65}px;--dy:${Math.sin((i * Math.PI) / 4) * 65}px;--color:${colors[i % 4]}"></i>`).join("")}`;
      sparks.append(burst);
      later(() => burst.remove(), 650);
    }
    function activate(button, keyboard = false) {
      if (!button || disposed || changing || button.disabled) return;
      const result = onPop(Number(button.dataset.balloon));
      if (!result) return;
      button.disabled = true;
      button.classList.add("popped");
      demo.hidden = true;
      burst(button);
      counter.textContent = `${result.count} / ${TOTAL}`;
      host
        .querySelectorAll("[data-pip]")
        .forEach((p) =>
          p.classList.toggle("filled", Number(p.dataset.pip) < result.count),
        );
      host
        .querySelectorAll("[data-gem]")
        .forEach((g) =>
          g.classList.toggle("earned", Number(g.dataset.gem) < game.credited),
        );
      const waveCleared = [...rack.querySelectorAll("button")].every(
        (target) => target.disabled,
      );
      if (result.complete || waveCleared) advanceWave(keyboard);
      else if (keyboard) rack.querySelector("button:not(:disabled)")?.focus();
    }
    function hit(a, b) {
      rack.querySelectorAll("button:not(:disabled)").forEach((button) => {
        if (intersects(a, b, button.getBoundingClientRect())) activate(button);
      });
    }
    function down(e) {
      if (
        pointer !== null ||
        changing ||
        (e.pointerType === "mouse" && e.button !== 0)
      )
        return;
      e.preventDefault();
      pointer = e.pointerId;
      previous = { x: e.clientX, y: e.clientY };
      field.setPointerCapture?.(e.pointerId);
      const button = e.target.closest("[data-balloon]");
      if (button) activate(button);
      else hit(previous, previous);
    }
    function move(e) {
      if (pointer !== e.pointerId || !previous) return;
      const point = { x: e.clientX, y: e.clientY };
      if (isFruit && !reduced) {
        const r = field.getBoundingClientRect(),
          line = document.createElement("i");
        line.className = "party-slice";
        line.style.cssText = `left:${previous.x - r.left}px;top:${previous.y - r.top}px;width:${Math.hypot(point.x - previous.x, point.y - previous.y)}px;transform:rotate(${Math.atan2(point.y - previous.y, point.x - previous.x)}rad)`;
        sparks.append(line);
        later(() => line.remove(), 180);
      }
      hit(previous, point);
      previous = point;
    }
    function up(e) {
      if (pointer === e.pointerId) {
        pointer = null;
        previous = null;
      }
    }
    function click(e) {
      // Native keyboard / assistive clicks have detail=0. Pointer clicks were handled on down.
      if (e.detail === 0) activate(e.target.closest("[data-balloon]"), true);
    }
    field.addEventListener("pointerdown", down);
    field.addEventListener("pointermove", move);
    field.addEventListener("pointerup", up);
    field.addEventListener("pointercancel", up);
    field.addEventListener("lostpointercapture", up);
    field.addEventListener("click", click);
    finish.addEventListener("click", end);
    wave();
    raf = requestAnimationFrame(frame);
    return () => {
      disposed = true;
      pointer = null;
      previous = null;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      timers.clear();
      field.removeEventListener("pointerdown", down);
      field.removeEventListener("pointermove", move);
      field.removeEventListener("pointerup", up);
      field.removeEventListener("pointercancel", up);
      field.removeEventListener("lostpointercapture", up);
      field.removeEventListener("click", click);
      finish.removeEventListener("click", end);
    };
  }
  const api = {
    TOTAL,
    PER_GEM,
    DURATIONS,
    create,
    chooseMode,
    resetModes,
    pop,
    credit,
    intersects,
    flight,
    balloon,
    fruit,
    fruitAssets,
    mount,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LearningParty = api;
})(typeof window !== "undefined" ? window : globalThis);
