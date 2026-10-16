(async function () {
  "use strict";
  const S = TownState,
    A = Art,
    $ = (id) => document.getElementById(id),
    icon = A.icon,
    KEY = "bukvomisto-living-v4",
    OLD = "bukvomisto-island-v2";
  let state = S.fresh(),
    saveBlocked = false,
    route = "welcome",
    returnView = { view: "street", id: "home" },
    draft = null,
    category = "dress",
    family = 0,
    run = null,
    task = null,
    roadStart = null,
    roadCells = [],
    material = "sand",
    edit = null,
    gateAnswer = 0,
    toastTimer,
    offlineReady = false;
  try {
    const raw = localStorage.getItem(KEY),
      legacy = localStorage.getItem(OLD);
    if (raw) {
      const s = JSON.parse(raw);
      if (!S.valid(s)) throw Error("save");
      state = s;
    } else if (legacy) {
      const s = S.migrate(JSON.parse(legacy));
      if (!s) throw Error("legacy");
      localStorage.setItem(OLD + "-backup", legacy);
      state = s;
    }
  } catch (e) {
    saveBlocked = true;
  }
  const audio = new HumanAudio($("voice"), (text) => {
    if ($("audio-status")) $("audio-status").textContent = text;
  });
  try {
    await CharacterAssets.load();
  } catch (error) {
    console.error(error);
    $("boot").innerHTML =
      "<div><h2>Не вдалося завантажити друзів</h2><p>Перевірте з’єднання та спробуйте ще раз.</p><button id=retry-models class=primary>Спробувати ще</button></div>";
    $("retry-models").onclick = () => location.reload();
    return;
  }
  let world;
  try {
    world = new TownWorld($("world"), state, onWorld);
  } catch (e) {
    $("boot").innerHTML =
      "<h2>Не вдалося запустити 3D</h2><p>Відкрийте гру в Chrome або Edge з увімкненим WebGL.</p>";
    console.error(e);
    return;
  }
  const names = { cat: "Киця", dog: "Песик", rabbit: "Кролик", fox: "Лисичка" },
    modes = {
      letters: ["Знайди таку саму", "book"],
      hear: ["Послухай літеру", "ear"],
      pairs: ["Знайди пару", "flowers"],
      discover: ["Знайомство зі складами", "book"],
      blend: ["Склади разом", "plus"],
      "hear-syllable": ["Послухай склад", "ear"],
      words: ["Маленькі слова", "home"],
    };
  function btn(action, ico, label, cls = "round", extra = "") {
    return `<button class="${cls}" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${icon(ico)}${cls.includes("primary") || cls.includes("secondary") ? label : ""}</button>`;
  }
  function toast(t) {
    $("toast").textContent = t;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").textContent = ""), 3200);
  }
  function save() {
    if (saveBlocked) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      toast(
        "Не вистачає місця для збереження. Експортуйте гру в меню батьків.",
      );
    }
    hud();
  }
  function hud() {
    const free = ["street", "room"].includes(route);
    $("hud").classList.toggle("hidden", !free);
    $("dock").classList.toggle("hidden", !free);
    $("controls").classList.toggle("hidden", !free);
    $("gems").textContent = state.gems;
    $("sound-button").innerHTML = icon(state.sound ? "sound" : "mute");
    audio.enabled = state.sound && state.voice;
    $("location").textContent =
      world.view === "room" ? "Затишна кімната" : "Острів Емілії";
  }
  function resetAudio() {
    audio.stop();
    world.stop();
    $("hint").textContent = "";
  }
  function bar(title) {
    return `<div class="scene-bar">${btn("back", "back", "Назад")}<div class="scene-caption"><div class="eyebrow">ОСТРІВ ЕМІЛІЇ</div><h2>${title}</h2></div>${["build", "roads", "land", "select"].includes(route) ? btn("zoom-in", "plus", "Наблизити", "round small") + btn("zoom-out", "minus", "Віддалити", "round small") : ""}</div>`;
  }
  function modal(title, body, compact = false) {
    return `<div class="cover"><section class="modal ${compact ? "compact" : ""}"><div class="modal-head">${btn("back", "back", "Назад")}<h2>${title}</h2></div>${body}</section></div>`;
  }
  function open(view) {
    resetAudio();
    if (
      [
        "wardrobe",
        "pets",
        "learn",
        "parents",
        "build",
        "land",
        "roads",
        "album",
      ].includes(view) &&
      ["street", "room"].includes(route)
    )
      returnView = { view: world.view, id: world.roomId };
    route = view;
    world.paused = ![
      "street",
      "room",
      "wardrobe",
      "pets",
      "build",
      "land",
      "roads",
      "furniture",
      "select",
    ].includes(view);
    if (view === "street") world.setView("street");
    if (view === "room") world.setView("room", world.roomId);
    if (view === "wardrobe") {
      draft = { ...state.look };
      category = "dress";
      world.setView("wardrobe");
    }
    if (view === "pets") {
      draft = state.pet;
      world.setView("pets");
      world.setPet(draft);
    }
    if (["build", "land", "roads", "select"].includes(view)) {
      if (world.view !== "street") world.setView("street");
      world.setEditor({
        type: view === "build" ? "objects" : view === "roads" ? "road" : view,
      });
      if (view === "build") {
        edit = { kind: "flowers", x: 4, z: 2, rotation: 0 };
        preview();
      }
      if (view === "roads") {
        roadStart = null;
        roadCells = [];
      }
      if (view === "land") {
        draft = S.LANDS.find((l) => !state.lands.includes(l.id))?.id || "east";
        world.previewLand(draft);
      }
    }
    render();
  }
  function back() {
    resetAudio();
    if (route === "lesson" || route === "reward") {
      run = null;
      task = null;
      route = "learn";
      world.paused = true;
      render();
      return;
    }
    if (route === "wardrobe") world.setLook(state.look);
    if (route === "pets") world.setPet(state.pet);
    if (route === "furniture") {
      const p = S.room(state, world.roomId).furniture[edit.kind];
      world.moveFurniture(edit.kind, p.x, p.z);
    }
    world.setEditor(null);
    if (
      [
        "welcome",
        "gate",
        "parents",
        "album",
        "learn",
        "wardrobe",
        "pets",
        "build",
        "land",
        "roads",
        "select",
        "furniture",
      ].includes(route)
    ) {
      route = returnView.view;
      world.setView(route, returnView.id);
    } else {
      route = "street";
      world.setView("street");
    }
    world.paused = false;
    render();
  }
  function render() {
    hud();
    let html = "";
    if (route === "welcome")
      html = `<div class="cover"><section class="welcome"><div class="emblem">${icon("home")}</div><div class="eyebrow">МАЛЕНЬКІ ВІДКРИТТЯ ЩОДНЯ</div><h1>Острів Емілії</h1><p>Твій дім. Твої друзі. Твої перші слова.</p><div class="how"><span>${icon("hand")}Торкнись</span><span>${icon("ear")}Послухай</span><span>${icon("build")}Створи</span></div>${btn("start", "play", "Грати", "primary")}<button class="quiet" data-action="parents">Для батьків</button>${saveBlocked ? '<p class="note">Збереження потребує перевірки. Оригінал не змінено — відкрийте меню батьків.</p>' : ""}</section></div>`;
    document.body.classList.toggle("in-room", route === "room");
    if (route === "room")
      html = `<div class="scene-actions">${[
        ["sit", "home", "Сісти"],
        ["lamp", "lamp", "Світло"],
        ["wardrobe", "dress", "Гардероб"],
        ["furniture", "move", "Меблі"],
        ["learn", "book", "Грати"],
        ["exit", "back", "Надвір"],
      ]
        .map(
          ([a, i, t]) =>
            `<button data-action="${a}" aria-label="${t}">${icon(i)}<small>${t}</small></button>`,
        )
        .join("")}</div>`;
    if (route === "wardrobe") {
      const n = { dress: 6, shoes: 4, hair: 5 }[category];
      html =
        bar("Гардероб") +
        `<section class="side-panel wardrobe-panel"><h3>Приміряй</h3><div class="swatches">${S.COLORS.map((c, i) => `<button aria-label="Колір ${i + 1}" data-action="color" data-value="${i}" class="${draft.color === i ? "active" : ""}" style="background:${c}"></button>`).join("")}</div><div class="tabs">${[
          ["dress", "dress", "Сукні"],
          ["shoes", "shoe", "Взуття"],
          ["hair", "hair", "Зачіски"],
        ]
          .map(([v, i, t]) =>
            btn(
              "category",
              i,
              t,
              category === v ? "active" : "",
              `data-value="${v}"`,
            ),
          )
          .join(
            "",
          )}</div><div class="choice-grid">${Array.from({ length: n }, (_, i) => `<button class="choice ${draft[category] === i ? "active" : ""}" data-action="look" data-value="${i}" aria-label="${{ dress: "Сукня", shoes: "Взуття", hair: "Зачіска" }[category]} ${i + 1}">${A.thumb(category, i, S.COLORS[draft.color])}</button>`).join("")}</div><div class="row">${btn("rotate-left", "rotate", "Повернути ліворуч")}${btn("rotate-right", "rotate", "Повернути праворуч")}</div><div class="actions">${btn("back", "close", "Скасувати", "secondary")}${btn("apply-look", "check", "Готово", "primary")}</div></section>`;
    }
    if (route === "pets")
      html =
        bar("Маленький друг") +
        `<section class="side-panel pet-panel"><h3>${names[draft]}</h3><div class="choice-grid">${S.PETS.map((p, i) => `<button class="choice ${draft === p ? "active" : ""}" data-action="pet-choice" data-value="${p}" aria-label="${names[p]}">${A.thumb("pet", i)}<span>${names[p]}</span></button>`).join("")}</div><div class="row">${btn("rotate-left", "rotate", "Повернути ліворуч")}${btn("rotate-right", "rotate", "Повернути праворуч")}</div><p class="note">Торкнись друга, щоб погладити.</p><div class="actions">${btn("back", "close", "Скасувати", "secondary")}${btn("apply-pet", "check", "Готово", "primary")}</div></section><div class="scene-actions pet-actions">${[
          ["stroke", "hand", "Погладити"],
          ["feed", "food", "Погодувати"],
          ["ball", "ball", "М’ячик"],
        ]
          .map(
            ([v, i, t]) =>
              `<button data-action="pet-react" data-value="${v}" aria-label="${t}">${icon(i)}<small>${t}</small></button>`,
          )
          .join("")}</div>`;
    if (route === "build")
      html =
        bar(edit.id ? "Переставити" : "Майстерня") +
        `<section class="side-panel build-panel"><div class="row">${btn("roads", "road", "Доріжки")}${btn("land", "land", "Нова земля")}${btn("select", "move", "Переставити споруду")}<span class="wallet">${icon("gem")}${state.gems}</span></div><div class="choice-grid">${S.ITEMS.map((i) => `<button class="choice ${edit.kind === i.id ? "active" : ""}" data-action="build-kind" data-value="${i.id}" ${edit.id ? "disabled" : ""}>${icon(i.id === "house" ? "home" : i.id)}<span>${i.name} · ${i.cost}</span></button>`).join("")}</div><p class="note" id="placement-note">Торкнись вільного місця на землі.</p><div class="actions">${btn("build-rotate", "rotate", "Повернути", "secondary")}${btn("build-apply", "check", edit.id ? "Готово" : "Будувати", "primary")}</div>${edit.id ? btn("remove-ask", "close", "Прибрати", "secondary danger") : ""}</section>`;
    if (route === "select")
      html =
        bar("Торкнись споруди") +
        `<div class="scene-actions">${btn("build", "build", "Нова споруда", "primary")}</div>`;
    if (route === "land")
      html =
        bar("Більше місця") +
        `<section class="side-panel land-panel"><h3>Нові куточки острова</h3><div class="land-list" style="display:grid;gap:10px">${S.LANDS.map((l) => `<button class="land-card ${draft === l.id ? "active" : ""}" data-action="land-choice" data-value="${l.id}" ${state.lands.includes(l.id) ? "disabled" : ""}>${icon("land")}<span>${l.name}<small>${state.lands.includes(l.id) ? "Вже твоя" : l.cost + " кристалів"}</small></span></button>`).join("")}</div><div class="actions">${btn("expand", "plus", "Відкрити", "primary", state.lands.includes(draft) ? "disabled" : "")}</div></section>`;
    if (route === "roads")
      html =
        bar("Доріжки") +
        `<section class="side-panel"><h3>Обери матеріал</h3><div class="choice-grid">${[
          ["sand", "Пісочок"],
          ["stone", "Камінь"],
          ["wood", "Дерево"],
          ["erase", "Гумка"],
        ]
          .map(
            ([v, t]) =>
              `<button class="choice ${material === v ? "active" : ""}" data-action="road-material" data-value="${v}">${icon(v === "erase" ? "undo" : "road")}<span>${t}</span></button>`,
          )
          .join(
            "",
          )}</div><p class="note">Торкнись початку і кінця доріжки. Або проведи пальцем. Зелений колір — можна будувати.</p><div class="actions">${btn("road-clear", "undo", "Очистити", "secondary")}${btn("road-apply", "check", "Готово", "primary")}</div></section>`;
    if (route === "furniture")
      html =
        bar("Облаштуй кімнату") +
        `<section class="side-panel"><h3>Пересунь улюблені речі</h3><div class="choice-grid">${[
          ["sofa", "Диван"],
          ["table", "Столик"],
          ["rug", "Килимок"],
        ]
          .map(
            ([k, t]) =>
              `<button class="choice ${edit.kind === k ? "active" : ""}" data-action="furniture-kind" data-value="${k}">${icon("home")}<span>${t}</span></button>`,
          )
          .join(
            "",
          )}</div><p class="note">Обери річ, а потім місце на підлозі.</p><div class="actions">${btn("back", "close", "Скасувати", "secondary")}${btn("furniture-apply", "check", "Готово", "primary")}</div></section>`;
    if (route === "learn")
      html = modal(
        "Маленькі відкриття",
        `<div class="menu-grid">${Object.entries(modes)
          .map(
            ([k, [name, i]]) =>
              `<button class="menu-card" data-action="lesson" data-value="${k}"><div class="lesson-mark">${{ letters: "А → А", hear: icon("ear") + "А", pairs: "А · А", discover: "МА", blend: "М + А", "hear-syllable": icon("ear") + "МА", words: "МАМА" }[k]}</div><b>${name}</b><small>${["letters", "hear", "pairs"].includes(k) ? "Літери" : k === "words" ? "Слова" : "Склади"}</small></button>`,
          )
          .join(
            "",
          )}<button class="menu-card" data-action="album">${icon("book")}<b>Моя абетка</b><small>Усі 33 літери</small></button></div><div class="families">${S.FAMILIES.map((f, i) => `<button data-action="family" data-value="${i}" class="${family === i ? "active" : ""}" ${S.familyOpen(state, i) ? "" : "disabled"}>${f[0]}</button>`).join("")}</div><p class="note">Новий ряд складів відкривається після трьох самостійно зібраних або впізнаних складів попереднього ряду. У меню батьків можна відкрити всі.</p>`,
      );
    if (route === "lesson") html = lessonHTML();
    if (route === "reward")
      html = `<div class="cover"><section class="modal reward"><div class="big-gem">${icon("gem")}</div><h2>У тебе вийшло!</h2><p>Ще три кристали для твого острова.</p>${btn("again", "play", "Ще пограти", "primary")}${btn("reward-home", "home", "На острів", "secondary")}</section></div>`;
    if (route === "gate")
      html = modal(
        "Для дорослих",
        `<p>Скільки буде ${gateAnswer - 4} + 4?</p><input id="gate-value" type="number" inputmode="numeric" aria-label="Відповідь">${btn("gate-submit", "check", "Відкрити", "primary")}`,
        true,
      );
    if (route === "parents") html = parentsHTML();
    if (route === "album")
      html = modal(
        "Моя абетка",
        `<div class="alphabet">${[..."АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"].map((l) => `<button data-action="letter-audio" data-value="${l}" class="${state.letterScores[l] ? "learned" : ""}">${l}</button>`).join("")}</div><div class="letter-detail" id="letter-detail">Торкнись літери, щоб послухати.</div><div class="audio-status" id="audio-status"></div>`,
      );
    $("ui").innerHTML = html;
    if (route === "build") preview();
  }
  function preview() {
    if (!edit) return;
    const error = S.placement(state, edit, edit.id);
    world.preview(edit.kind, edit.x, edit.z, edit.rotation, !error);
    if ($("placement-note"))
      $("placement-note").textContent =
        error || "Місце підходить. Натисни галочку.";
  }
  function begin(mode) {
    resetAudio();
    route = "lesson";
    world.paused = true;
    run = { mode, index: 0, rewarded: false, previous: null };
    nextTask();
  }
  function nextTask() {
    audio.stop();
    const mode = run.mode,
      pool = S.FAMILIES[family];
    task = {
      hinted: false,
      done: false,
      heard: false,
      selected: [],
      matched: [],
      picked: [],
      failures: 0,
    };
    if (["letters", "hear"].includes(mode)) {
      const p = (state.allLevels ? Core.LETTERS : Core.active(state)).filter(
        (x) => mode !== "hear" || x !== "Ь",
      );
      task.target = Core.choose(p, state.letterScores, run.previous);
      task.options = Core.shuffle([
        task.target,
        ...Core.shuffle(p.filter((x) => x !== task.target)).slice(0, 2),
      ]);
    } else if (mode === "pairs") {
      const p = Core.shuffle(
        state.allLevels ? Core.LETTERS : Core.active(state),
      ).slice(0, 3);
      task.options = Core.shuffle([...p, ...p]);
      task.target = p.join("");
    } else if (mode === "words") {
      let words = S.WORDS.filter(
        (w) =>
          state.allLevels ||
          w.parts.every((p) => (state.syllableScores[p] || 0) > 0),
      );
      if (!words.length) words = [S.WORDS[0]];
      const w = Core.shuffle(
        words.filter((w) => w.text !== run.previous).length
          ? words.filter((w) => w.text !== run.previous)
          : words,
      )[0];
      Object.assign(task, w);
      task.target = w.text;
      task.options = Core.shuffle(w.parts.map((text, id) => ({ text, id })));
    } else {
      task.target = Core.choose(pool, state.syllableScores, run.previous);
      task.options =
        mode === "blend"
          ? Core.shuffle([...task.target].map((text, id) => ({ text, id })))
          : Core.shuffle([
              task.target,
              ...Core.shuffle(pool.filter((x) => x !== task.target)).slice(
                0,
                run.mode === "hear-syllable" &&
                  (state.modeRuns["hear-syllable"] || 0) < 2
                  ? 1
                  : 2,
              ),
            ]);
    }
    run.previous = task.target;
    render();
  }
  function picture(kind) {
    const paths = {
      mother:
        '<circle cx="50" cy="34" r="20" fill="#d7aa8b"/><path d="M26 35Q22 5 50 8Q79 7 76 40L67 29Q40 35 32 23L31 46" fill="#745d4b"/><path d="M17 94Q17 58 50 58Q83 58 83 94" fill="#b78291"/>',
      father:
        '<circle cx="50" cy="34" r="20" fill="#d7aa8b"/><path d="M29 28Q23 8 48 9Q77 6 72 29L62 20L33 28" fill="#695647"/><path d="M17 94Q17 58 50 58Q83 58 83 94" fill="#7d9da0"/>',
      frame:
        '<rect x="10" y="13" width="80" height="74" rx="7" fill="#be9565"/><rect x="23" y="26" width="54" height="48" fill="#f6ecd2"/><path d="M23 67L42 44L60 60L71 47L77 74H23" fill="#9caf89"/>',
      burrow:
        '<path d="M5 88Q8 30 50 30Q92 30 95 88" fill="#a8b88d"/><path d="M28 88V66a22 22 0 0 1 44 0V88" fill="#776351"/><ellipse cx="50" cy="78" rx="22" ry="10" fill="#735b49"/>',
      wound:
        '<rect x="12" y="33" width="76" height="34" rx="13" fill="#d6b894" transform="rotate(-35 50 50)"/><rect x="36" y="34" width="28" height="32" rx="5" fill="#f1dfbe" transform="rotate(-35 50 50)"/>',
      sun: '<circle cx="50" cy="45" r="23" fill="#dfb45e"/><path d="M50 7V15M50 75V83M12 45H20M80 45H88M23 18L29 25M72 68L78 75M22 73L29 66M72 24L78 17" stroke="#dfb45e" stroke-width="6"/><path d="M5 95Q25 65 51 88Q75 63 95 95" fill="#90ac85"/>',
      food: '<path d="M12 65L32 28H86L69 65Z" fill="#eee3cc"/><path d="M12 65H69V79H12Z" fill="#cfad87"/><path d="M69 65L86 28V43L69 79" fill="#dac6a4"/>',
      soap: '<rect x="16" y="39" width="68" height="42" rx="20" fill="#b79ab0"/><ellipse cx="49" cy="49" rx="24" ry="9" fill="#d9bfd2"/><circle cx="24" cy="24" r="10" fill="#c5dfdf"/><circle cx="74" cy="20" r="14" fill="#c5dfdf"/>',
      strong:
        '<path d="M23 75V43L35 25L49 34L40 47L45 61Q70 38 83 63L79 83H36Z" fill="#cfad8d"/>',
    };
    return `<svg class="word-picture" viewBox="0 0 100 100" aria-hidden="true">${paths[kind] || paths.frame}</svg>`;
  }
  function lessonHTML() {
    const m = run.mode,
      hearing = ["hear", "hear-syllable"].includes(m);
    let board = "",
      answers = "";
    if (hearing) board = btn("play-task", "sound", "Послухати", "primary");
    else if (m === "pairs") board = icon("flowers");
    else if (m === "discover")
      board = `<button class="letter-block syllable-card" data-action="play-task">${[...task.target].map((l) => "<span>" + l + "</span>").join("")}</button>`;
    else if (m === "blend" || m === "words") {
      board = `${m === "words" ? picture(task.picture) : ""}<div><div class="syllable-display">${task.target}</div><div class="slots ${task.done ? "joined" : ""}">${(m === "words" ? task.parts : [...task.target]).map((v, i) => `<div class="slot ${task.picked.length > i ? "filled" : ""}">${task.picked.length > i ? v : "·"}</div>`).join("")}</div></div>`;
    } else
      board = `<button class="letter-block" data-action="play-task">${task.target}</button>`;
    if (m !== "discover")
      answers = task.options
        .map((v, i) => {
          const text = typeof v === "string" ? v : v.text,
            used = task.picked.includes(i) || task.matched.includes(i);
          return `<button class="answer ${text.length > 1 ? "long" : ""} ${task.selected.includes(i) ? "selected" : ""} ${task.matched.includes(i) ? "matched" : ""} ${task.hintIndex === i ? "hint" : ""}" data-action="answer" data-value="${i}" ${task.done || used || (hearing && !task.heard) ? "disabled" : ""}>${text}</button>`;
        })
        .join("");
    return `<div class="cover"><section class="lesson-shell"><div class="lesson-head">${btn("back", "back", "Назад")}<div><b>${modes[m][0]}</b><div class="dots">${[0, 1, 2].map((i) => `<i class="${i < run.index ? "done" : i === run.index ? "current" : ""}"></i>`).join("")}</div></div><div class="spacer"></div>${btn("play-task", "sound", "Послухати ще раз")}${btn("help", "hand", "Підказка")}</div><h3 class="lesson-title">${task.done ? "Чудово!" : hearing ? "Послухай і знайди" : m === "pairs" ? "Знайди дві однакові" : m === "blend" ? "З’єднай літери" : m === "words" ? "Збери слово зі складів" : m === "discover" ? "Торкнись і послухай" : "Знайди таку саму"}</h3><div class="lesson-board">${board}</div><div class="answers">${answers}</div><div class="audio-status" id="audio-status"></div><div class="lesson-feedback">${task.feedback || ""}</div>${task.done || m === "discover" ? btn("next", "check", "Далі", "primary lesson-next", m === "discover" && !task.heard ? "disabled" : "") : ""}</section></div>`;
  }
  async function playTask() {
    if (!task || route !== "lesson") return;
    const t = task,
      kind = ["letters", "hear", "pairs"].includes(run.mode)
        ? "letter"
        : run.mode === "words"
          ? "word"
          : "syllable",
      target =
        run.mode === "pairs"
          ? task.options[task.selected[0] ?? 0]
          : task.target;
    document.querySelector(".syllable-card")?.classList.add("reading");
    document.querySelector(".slots")?.classList.add("reading");
    const ok = await audio.play(kind, target);
    if (task !== t || route !== "lesson") return;
    if (ok) {
      task.heard = true;
      render();
    } else if (target === "Ь") {
      task.heard = true;
      task.feedback = "М’який знак не має власного звука.";
      render();
    }
  }
  function complete() {
    task.done = true;
    task.feedback = task.hinted
      ? "Разом вийшло! Наступного разу спробуй сама."
      : "У тебе вийшло!";
    S.skill(state, run.mode, task.target, task.hinted);
    save();
    render();
    if (run.mode === "blend" || run.mode === "words") playTask();
  }
  function answer(i) {
    if (!task || task.done) return;
    const m = run.mode;
    if (["hear", "hear-syllable"].includes(m) && !task.heard) return;
    if (m === "pairs") {
      if (task.matched.includes(i) || task.selected.includes(i)) return;
      task.selected.push(i);
      if (task.selected.length === 2) {
        const [a, b] = task.selected;
        if (task.options[a] === task.options[b]) {
          task.matched.push(a, b);
          task.selected = [];
          if (task.matched.length === task.options.length) {
            complete();
            return;
          }
        } else {
          task.hinted = true;
          task.selected = [i];
        }
      }
      render();
      return;
    }
    if (m === "blend" || m === "words") {
      if (task.picked.includes(i)) return;
      const expected = (m === "words" ? task.parts : [...task.target])[
        task.picked.length
      ];
      if (task.options[i].text === expected) {
        task.picked.push(i);
        if (task.picked.length === 2) {
          complete();
          return;
        }
        task.feedback = "А тепер друга частинка";
        render();
        return;
      }
    } else if (task.options[i] === task.target) {
      complete();
      return;
    }
    task.hinted = true;
    task.failures++;
    task.feedback = "Спробуй ще. Ми нікуди не поспішаємо.";
    render();
  }
  function help() {
    if (!task || task.done) return;
    task.hinted = true;
    const m = run.mode;
    if (m === "pairs") {
      const left = task.options
        .map((_, i) => i)
        .filter((i) => !task.matched.includes(i));
      task.selected = [left[0]];
      task.hintIndex = left.find(
        (i) => i !== left[0] && task.options[i] === task.options[left[0]],
      );
    } else if (m === "blend" || m === "words") {
      const expected = (m === "words" ? task.parts : [...task.target])[
        task.picked.length
      ];
      task.hintIndex = task.options.findIndex(
        (v, i) => v.text === expected && !task.picked.includes(i),
      );
    } else task.hintIndex = task.options.indexOf(task.target);
    task.feedback = "Подивись на картку, що рухається.";
    render();
    if (["hear", "hear-syllable"].includes(m)) playTask();
  }
  function parentsHTML() {
    const entries = Object.entries(state.skills),
      solo = entries.reduce((a, [, v]) => a + v.solo, 0),
      hinted = entries.reduce((a, [, v]) => a + v.hinted, 0);
    return modal(
      "Для батьків",
      `${saveBlocked ? "<p>Пошкоджене збереження залишене без змін. Експортуйте його перед імпортом або скиданням.</p>" : ""}<div class="stats"><div><b>${state.runs}</b><small>завершених ігор</small></div><div><b>${solo}</b><small>без підказок</small></div><div><b>${hinted}</b><small>з допомогою</small></div></div>${[
        ["sound", "Звуки"],
        ["voice", "Готові голосові записи"],
        ["allLevels", "Відкрити всі літери та склади"],
      ]
        .map(
          ([k, t]) =>
            `<label class="setting"><input type="checkbox" data-setting="${k}" ${state[k] ? "checked" : ""}>${t}</label>`,
        )
        .join(
          "",
        )}<p class="note">Зіставлення, складання за зразком і розпізнавання на слух обліковуються окремо. Помилка або підказка позначає завдання як виконане з допомогою. Це ігровий прогрес, а не оцінка навички читання.</p><div class="parent-actions">${btn("export", "save", "Експорт", "secondary")}<label class="secondary">Імпорт<input id="import-save" type="file" accept="application/json,.json"></label>${btn("reset-ask", "undo", "Почати заново", "secondary danger")}</div><details><summary>Результати за вправами</summary><div class="score-row"><b>Вправа</b><b>Сама</b><b>З допом.</b></div>${entries.map(([k, v]) => `<div class="score-row"><span>${escapeHTML((modes[k.split(":")[0]]?.[0] || k.split(":")[0]) + ": " + k.split(":").slice(1).join(":"))}</span><span>${v.solo}</span><span>${v.hinted}</span></div>`).join("") || '<p class="note">Ще немає завершених завдань.</p>'}</details><p class="note" id="offline-state" style="margin-top:18px">${offlineReady ? "Офлайн-пакет готовий: гра та всі 71 записи доступні без мережі." : "Офлайн-пакет готується. Для встановлення потрібен localhost або HTTPS."}</p><p class="credits" style="margin-top:20px">Слова озвучені жіночим голосом: Galja Raptova, Shtooka (CC BY 2.0 France). Склади — фрагменти готових записів OpenLearn (CC BY-NC-SA 4.0). Літери — Tabrus (CC BY-SA 4.0). У цій збірці є матеріали лише для некомерційного використання. <a href="audio/speech/CREDITS.txt" target="_blank" rel="noopener">Джерела слів і складів</a> · <a href="audio/CREDITS.txt" target="_blank" rel="noopener">Джерела літер</a>.</p>`,
    );
  }
  function escapeHTML(t) {
    return String(t).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  function confirmUI(title, action, text) {
    $("ui").innerHTML = modal(
      title,
      `<p style="margin-bottom:18px">${text}</p>${btn(action, "check", "Так", "primary")}${btn("cancel-confirm", "back", "Скасувати", "secondary")}`,
      true,
    );
  }
  function onWorld(e) {
    if (e.type === "walk") {
      $("hint").textContent = "";
      if (!state.seen.walk) {
        state.seen.walk = true;
        save();
      }
    }
    if (e.type === "enter") {
      returnView = { view: "street", id: "home" };
      world.roomId = e.id;
      open("room");
      S.room(state, e.id);
      save();
    }
    if (e.type === "exit") open("street");
    if (e.type === "wardrobe") open("wardrobe");
    if (e.type === "pet") open("pets");
    if (e.type === "learn") open("learn");
    if (e.type === "lamp") {
      world.toggleLamp();
      save();
    }
    if (e.type === "furniture") {
      if (e.kind === "sofa") world.sit();
      else
        toast(
          e.kind === "table"
            ? "На столику можна грати зі складами"
            : "М’який куточок для відпочинку",
        );
    }
    if (e.type === "place-position") {
      edit.x = e.x;
      edit.z = e.z;
      preview();
    }
    if (e.type === "edit-object") {
      edit = { ...state.objects.find((o) => o.id === e.id) };
      route = "build";
      world.setEditor({ type: "objects" });
      render();
    }
    if (e.type === "object") {
      const o = state.objects.find((o) => o.id === e.id);
      if (o?.kind === "house") {
        world.roomId = e.id;
        open("room");
      } else {
        toast(
          o?.kind === "bench"
            ? "Приємно відпочити!"
            : o?.kind === "swing"
              ? "Гойдаємось!"
              : "Твоя маленька окраса острова",
        );
        if (o?.kind === "bench") {
          world.hero.position.set(o.x, -0.1, o.z);
          world.sitY = -0.1;
          world.sitting = true;
        }
        if (o?.kind === "swing") world.rideSwing(o.id);
      }
    }
    if (e.type === "road-start") {
      if (!roadStart) roadStart = { x: e.x, z: e.z };
      roadCells = S.roadLine(roadStart, e);
      world.previewRoad(roadCells, material);
    }
    if (e.type === "road-move" && roadStart) {
      roadCells = S.roadLine(roadStart, e);
      world.previewRoad(roadCells, material);
    }
    if (e.type === "furniture-position") {
      edit.x = e.x;
      edit.z = e.z;
      world.moveFurniture(edit.kind, e.x, e.z);
    }
    if (e.type === "built") $("build-progress")?.remove();
  }
  function furnitureStart(kind = "sofa") {
    route = "furniture";
    world.paused = false;
    const p = S.room(state, world.roomId).furniture[kind];
    edit = { kind, ...p };
    world.setEditor({ type: "furniture" });
    render();
  }
  function furnitureValid() {
    if (
      Math.abs(edit.x) > (edit.kind === "sofa" ? 3.4 : 4) ||
      Math.abs(edit.z) > 2.8
    )
      return false;
    if (edit.kind === "rug") return true;
    return (
      !Object.entries(S.room(state, world.roomId).furniture).some(
        ([k, p]) =>
          k !== edit.kind &&
          k !== "rug" &&
          Math.abs(p.x - edit.x) < 2.6 &&
          Math.abs(p.z - edit.z) < 1.5,
      ) && !(edit.x > 2 && edit.z < -2)
    );
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-action]");
    if (!b || b.disabled) return;
    const act = b.dataset.action,
      v = b.dataset.value;
    if (act === "start") {
      world.paused = false;
      route = "street";
      save();
      render();
      $("hint").innerHTML = icon("hand") + "Торкнись землі, щоб піти";
      return;
    }
    if (act === "back") {
      back();
      return;
    }
    if (act === "cancel-confirm") {
      render();
      return;
    }
    if (act === "sound") {
      state.sound = !state.sound;
      audio.stop();
      save();
      return;
    }
    if (act === "parents") {
      resetAudio();
      if (["street", "room"].includes(route))
        returnView = { view: world.view, id: world.roomId };
      route = "gate";
      world.paused = true;
      gateAnswer = 8 + Math.floor(Math.random() * 8);
      render();
      return;
    }
    if (act === "gate-submit") {
      if (Number($("gate-value").value) === gateAnswer) {
        route = "parents";
        render();
      } else toast("Спробуйте ще раз");
      return;
    }
    if (
      [
        "wardrobe",
        "pets",
        "learn",
        "build",
        "land",
        "roads",
        "select",
        "album",
      ].includes(act)
    ) {
      open(act);
      return;
    }
    if (act === "home") {
      world.roomId = "home";
      open("room");
      return;
    }
    if (act === "exit" || act === "reward-home") {
      returnView = { view: "street", id: "home" };
      open("street");
      return;
    }
    if (act === "zoom-in") world.changeZoom(-1);
    if (act === "zoom-out") world.changeZoom(1);
    if (act === "camera") world.homeCamera();
    if (act === "jump") world.jump();
    if (act === "interact") world.nearestInteraction();
    if (act === "rotate-left") world.rotate(-0.5);
    if (act === "rotate-right") world.rotate(0.5);
    if (act === "category") {
      category = v;
      render();
    }
    if (act === "look") {
      draft[category] = Number(v);
      world.setLook(draft);
      render();
    }
    if (act === "color") {
      draft.color = Number(v);
      world.setLook(draft);
      render();
    }
    if (act === "apply-look") {
      state.look = { ...draft };
      save();
      back();
    }
    if (act === "pet-choice") {
      draft = v;
      world.setPet(v);
      render();
    }
    if (act === "pet-react") world.petReact(v);
    if (act === "apply-pet") {
      state.pet = draft;
      save();
      back();
    }
    if (act === "sit") world.sit();
    if (act === "lamp") {
      world.toggleLamp();
      save();
    }
    if (act === "furniture") {
      returnView = { view: "room", id: world.roomId };
      furnitureStart();
    }
    if (act === "furniture-kind") {
      const p = S.room(state, world.roomId).furniture[edit.kind];
      world.moveFurniture(edit.kind, p.x, p.z);
      furnitureStart(v);
    }
    if (act === "furniture-apply") {
      if (!furnitureValid()) {
        toast("Залишимо вільний прохід. Обери інше місце.");
        return;
      }
      S.room(state, world.roomId).furniture[edit.kind] = {
        x: edit.x,
        z: edit.z,
      };
      save();
      back();
    }
    if (act === "build-kind") {
      edit.kind = v;
      render();
    }
    if (act === "build-rotate") {
      edit.rotation = (edit.rotation + 1) % 4;
      preview();
    }
    if (act === "build-apply") {
      const o = S.place(
        state,
        edit.kind,
        edit.x,
        edit.z,
        edit.rotation,
        edit.id,
      );
      if (!o) {
        toast(
          S.placement(state, edit, edit.id) ||
            "Потрібно ще трохи кристалів. Пограй з літерами!",
        );
        return;
      }
      save();
      world.setEditor(null);
      world.refreshObjects(o.id);
      route = "street";
      render();
      $("ui").insertAdjacentHTML(
        "beforeend",
        '<div class="progress-build" id="build-progress">Будуємо…<i></i></div>',
      );
    }
    if (act === "remove-ask")
      confirmUI(
        "Прибрати споруду?",
        "remove-confirm",
        "Кристали повернуться. Кімната цього будиночка також буде прибрана.",
      );
    if (act === "remove-confirm") {
      S.remove(state, edit.id);
      save();
      world.refreshObjects();
      open("select");
    }
    if (act === "land-choice") {
      draft = v;
      world.previewLand(v);
      render();
    }
    if (act === "expand") {
      if (!S.expand(state, draft)) {
        toast("Потрібно ще трохи кристалів. Пограй зі складами!");
        return;
      }
      save();
      world.refreshTerrain();
      world.setEditor(null);
      route = "street";
      world.homeCamera();
      render();
      toast("Нова земля вже твоя!");
    }
    if (act === "road-material") {
      material = v;
      world.previewRoad(roadCells, material);
      render();
    }
    if (act === "road-clear") {
      roadStart = null;
      roadCells = [];
      world.previewRoad([], material);
    }
    if (act === "road-apply") {
      if (!roadCells.length) {
        toast("Обери початок і кінець доріжки");
        return;
      }
      if (!S.road(state, roadCells, material)) {
        toast("Доріжка має пройти по вільній землі");
        return;
      }
      save();
      world.refreshRoads();
      roadStart = null;
      roadCells = [];
      world.previewRoad([], material);
      toast("Доріжка готова!");
    }
    if (act === "family") {
      family = Number(v);
      render();
    }
    if (act === "lesson") begin(v);
    if (act === "again") begin(run.mode);
    if (act === "answer") answer(Number(v));
    if (act === "help") help();
    if (act === "play-task") playTask();
    if (act === "next") {
      if (!task.done && !(run.mode === "discover" && task.heard)) return;
      if (run.mode === "discover") {
        S.skill(state, "discover", task.target, true);
        save();
      }
      if (++run.index === 3) {
        S.reward(state, run);
        save();
        audio.stop();
        route = "reward";
        render();
      } else nextTask();
    }
    if (act === "letter-audio") {
      if (v === "Ь")
        $("letter-detail").textContent =
          "М’який знак не має власного звука. Він позначає м’якість приголосного.";
      else {
        $("letter-detail").textContent = v;
        audio.play("letter", v);
      }
    }
    if (act === "export") {
      let raw = saveBlocked
        ? localStorage.getItem(KEY) || localStorage.getItem(OLD)
        : JSON.stringify(state, null, 2);
      const url = URL.createObjectURL(
          new Blob([raw || "{}"], { type: "application/json" }),
        ),
        a = document.createElement("a");
      a.href = url;
      a.download = "emilia-island-save.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (act === "reset-ask")
      confirmUI(
        "Почати заново?",
        "reset-confirm",
        "Зникнуть споруди, одяг і навчальний прогрес. Спочатку можна зберегти їх кнопкою «Експорт».",
      );
    if (act === "reset-confirm") {
      state = S.fresh();
      world.state = state;
      saveBlocked = false;
      save();
      location.reload();
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.dataset.setting) {
      state[e.target.dataset.setting] = e.target.checked;
      save();
      audio.stop();
    }
    if (e.target.id === "import-save") {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (file.size > 500000) throw Error();
        const data = JSON.parse(await file.text()),
          s = S.migrate(data);
        if (!s || !S.valid(s)) throw Error();
        if (localStorage.getItem(KEY))
          localStorage.setItem(
            KEY + "-before-import",
            localStorage.getItem(KEY),
          );
        state = s;
        world.state = state;
        saveBlocked = false;
        save();
        location.reload();
      } catch (err) {
        toast("Файл не підходить. Поточна гра залишилась без змін.");
      }
    }
  });
  const joy = $("joystick");
  let joyId = null;
  function joyMove(e) {
    if (e.pointerId !== joyId) return;
    const r = joy.getBoundingClientRect(),
      dx = e.clientX - r.left - r.width / 2,
      dy = e.clientY - r.top - r.height / 2,
      n = Math.max(1, Math.hypot(dx, dy) / 32);
    world.joy = { x: dx / n / 32, y: dy / n / 32 };
    $("stick").style.transform = `translate(${dx / n}px,${dy / n}px)`;
  }
  joy.addEventListener("pointerdown", (e) => {
    joyId = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    joyMove(e);
  });
  joy.addEventListener("pointermove", joyMove);
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    joy.addEventListener(event, () => {
      joyId = null;
      world.joy = { x: 0, y: 0 };
      $("stick").style.transform = "";
    });
  $("boot").remove();
  render();
  if ("serviceWorker" in navigator && location.protocol !== "file:")
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => {
        const check = async () => {
          if (reg.active?.state === "activated") {
            const cache = await caches.open("emilia-living-v4-7");
            offlineReady = (
              await Promise.all(
                [
                  "town-app.js",
                  "models/characters.json",
                  "models/characters.bin",
                ].map((file) => cache.match(file)),
              )
            ).every(Boolean);
            if (route === "parents") render();
          }
        };
        check();
        navigator.serviceWorker.ready.then(check);
        const watch = (worker) =>
          worker?.addEventListener("statechange", check);
        watch(reg.installing);
        watch(reg.active);
        reg.addEventListener("updatefound", () => watch(reg.installing));
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          watch(reg.active);
          check();
        });
      })
      .catch(() => {});
})();
