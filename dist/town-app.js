(async function () {
  "use strict";
  const S = TownState,
    L = Learning,
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
    learnSection = null,
    run = null,
    task = null,
    roadStart = null,
    roadCells = [],
    material = "sand",
    edit = null,
    gateAnswer = 0,
    toastTimer,
    offlineReady = false;
  let viewportFrame = 0;
  function syncViewportHeight() {
    cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(() => {
      const viewport = window.visualViewport,
        height = Math.round(viewport?.height || window.innerHeight);
      if (height > 0)
        document.documentElement.style.setProperty(
          "--app-height",
          height + "px",
        );
    });
  }
  syncViewportHeight();
  window.addEventListener("resize", syncViewportHeight, { passive: true });
  window.addEventListener("orientationchange", syncViewportHeight, {
    passive: true,
  });
  window.visualViewport?.addEventListener("resize", syncViewportHeight, {
    passive: true,
  });
  window.visualViewport?.addEventListener("scroll", syncViewportHeight, {
    passive: true,
  });
  function crystals(n) {
    const t = n % 100,
      u = n % 10;
    return `${n} ${t >= 11 && t <= 14 ? "кристалів" : u === 1 ? "кристал" : u >= 2 && u <= 4 ? "кристали" : "кристалів"}`;
  }
  let disposeParty = null;
  let buildCategory = "garden",
    pathBorder = "stone",
    lastGardenPath = null,
    lineStart = null,
    lineEnd = null;
  try {
    const raw = localStorage.getItem(KEY),
      legacy = localStorage.getItem(OLD);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 4) {
        // One-time upgrade to v5; the original stays as a backup.
        if (!localStorage.getItem(KEY + "-v4-backup"))
          localStorage.setItem(KEY + "-v4-backup", raw);
      }
      // v5 also has safe migrations for retired assets. Always migrate a
      // cloned value so the original localStorage entry remains recoverable.
      const s = S.migrate(parsed);
      if (!s || !S.valid(s)) throw Error("save");
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
  if (!Number.isFinite(state.volume)) state.volume = 0.8;
  const audio = new HumanAudio($("voice"), (text) => {
    if ($("audio-status")) $("audio-status").textContent = text;
  });
  $("voice").volume = state.volume;
  try {
    await CharacterAssets.load();
    await ParkAssets.load();
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
  const names = {
      cat: "Киця",
      dog: "Песик",
      rabbit: "Кролик",
      fox: "Лисичка",
      "cube-beaver": "Бобер",
      "cube-bee": "Бджілка",
      "cube-bunny": "Кубічний зайчик",
      "cube-cat": "Кубічна киця",
      "cube-caterpillar": "Гусінь",
      "cube-chick": "Курчатко",
      "cube-cow": "Корівка",
      "cube-crab": "Крабик",
      "cube-deer": "Оленятко",
      "cube-dog": "Кубічний песик",
      "cube-elephant": "Слоненя",
      "cube-fish": "Рибка",
      "cube-fox": "Кубічна лисичка",
      "cube-giraffe": "Жирафеня",
      "cube-hog": "Кабанчик",
      "cube-koala": "Коала",
      "cube-lion": "Левеня",
      "cube-monkey": "Мавпеня",
      "cube-panda": "Панда",
      "cube-parrot": "Папужка",
      "cube-penguin": "Пінгвіненя",
      "cube-pig": "Поросятко",
      "cube-polar": "Біле ведмежа",
      "cube-tiger": "Тигреня",
      turtle: "Черепашка",
      chicken: "Курочка",
      zombie: "Зомбі-садівник",
    },
    modes = {
      letters: ["Знайди таку саму", "book"],
      hear: ["Послухай літеру", "ear"],
      pairs: ["Знайди пару", "flowers"],
      discover: ["Знайомство зі складами", "book"],
      blend: ["Склади разом", "plus"],
      "hear-syllable": ["Послухай склад", "ear"],
      "sound-part": ["Літера у складі", "ear"],
      train: ["Складовий потяг", "play"],
      words: ["Маленькі слова", "home"],
    },
    modeMarks = {
      letters: "А → А",
      hear: icon("ear") + "А",
      pairs: "А · А",
      discover: "МА",
      blend: "М + А",
      "hear-syllable": icon("ear") + "МА",
      "sound-part": "МА → М",
      train: "МА · ЛИ · НА",
      words: "МАМА",
    },
    learnSections = [
      {
        id: "letters",
        title: "Літери",
        note: "Дивись, знаходь пари та запам’ятовуй",
        visual: "<b>А</b><span>Б</span><span>В</span>",
        modes: ["letters", "pairs"],
        album: true,
      },
      {
        id: "syllables",
        title: "Склади",
        note: "З’єднуй літери й будуй складові потяги",
        visual: "<b>М</b><i>+</i><b>А</b>",
        modes: ["discover", "blend", "train"],
        families: true,
      },
      {
        id: "listen",
        title: "Слухай",
        note: "Упізнавай літери та склади на слух",
        visual: icon("ear") + "<b>А</b><span>МА</span>",
        modes: ["hear", "hear-syllable", "sound-part"],
        families: true,
      },
      {
        id: "words",
        title: "Слова",
        note: "Складай перші слова з відомих складів",
        visual: "<span>МА</span><span>МА</span>",
        modes: ["words"],
      },
    ];
  function btn(action, ico, label, cls = "round", extra = "") {
    return `<button class="${cls}" data-action="${action}" aria-label="${label}" title="${label}" ${extra}>${ico === "gem" ? gemImage() : icon(ico)}${cls.includes("primary") || cls.includes("secondary") ? label : ""}</button>`;
  }
  const objectImage = (src, cls = "object-image") =>
      `<img class="${cls}" src="${src}" alt="" aria-hidden="true">`,
    gemImage = () => objectImage("models/ui/gem.png", "gem-object"),
    objectButton = (action, src, label) =>
      `<button class="round object-button" data-action="${action}" aria-label="${label}" title="${label}">${objectImage(src)}<span>${label}</span></button>`;
  let sfxCtx;
  function sfx(freqs, dur, type) {
    if (!state.sound) return;
    try {
      sfxCtx =
        sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (sfxCtx.state === "suspended") sfxCtx.resume();
      const t0 = sfxCtx.currentTime;
      freqs.forEach((f, i) => {
        const start = t0 + i * 0.09,
          end = start + dur,
          osc = sfxCtx.createOscillator(),
          gain = sfxCtx.createGain();
        osc.type = type;
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.16 * state.volume, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        osc.connect(gain).connect(sfxCtx.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      });
    } catch (e) {}
  }
  const chimeCorrect = () => sfx([523.25, 659.25, 783.99], 0.22, "sine");
  const chimeWrong = () => sfx([196, 164.81], 0.26, "sine");
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
    return `<div class="scene-bar">${btn("back", "back", "Назад")}<div class="scene-caption"><div class="eyebrow">ОСТРІВ ЕМІЛІЇ</div><h2>${title}</h2></div></div>`;
  }
  function modal(title, body, compact = false) {
    return `<div class="cover"><section class="modal ${compact ? "compact" : ""}"><div class="modal-head">${btn("back", "back", "Назад")}<h2>${title}</h2></div>${body}</section></div>`;
  }
  function open(view) {
    resetAudio();
    if (view !== "street") {
      world.selectObject?.(null);
    }
    if (view === "learn") learnSection = null;
    if (
      [
        "wardrobe",
        "pets",
        "learn",
        "parents",
        "build",
        "demolish",
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
      "demolish",
      "land",
      "roads",
      "furniture",
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
    if (["build", "demolish", "land", "roads"].includes(view)) {
      if (world.view !== "street") world.setView("street");
      world.setEditor({
        type: view === "build" ? "objects" : view === "roads" ? "road" : view,
      });
      if (view === "build") {
        edit = {
          kind: "rose-bed",
          x: Math.round((world.editFocus.x + 3) / 2) * 2,
          z: Math.round((world.editFocus.z - 4) / 2) * 2,
          rotation: 0,
        };
        lineStart = null;
        lineEnd = null;
        buildCategory = "garden";
        preview();
      }
      if (view === "demolish") world.setEditor({ type: "demolish" });
      if (view === "roads") {
        roadStart = null;
        roadCells = [];
      }
      if (view === "land") {
        draft = S.availableLands(state)[0]?.id || null;
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
    if (route === "learn" && learnSection) {
      learnSection = null;
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
        "demolish",
        "land",
        "roads",
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
    disposeParty?.();
    disposeParty = null;
    hud();
    let html = "";
    const learningProgress = L.progress(state),
      recentLetters = learningProgress.opened.slice(-7),
      journey = `<div class="learning-journey" aria-label="Відкрито ${learningProgress.opened.length} з ${learningProgress.total} літер і ${learningProgress.syllables.opened.length} з ${learningProgress.syllables.total} складів"><div class="journey-top"><b>Твоя абетка</b><span>${learningProgress.opened.length} / ${learningProgress.total}</span></div><div class="journey-track"><i style="width:${(learningProgress.opened.length / learningProgress.total) * 100}%"></i></div><div class="journey-letters">${recentLetters.map((l) => `<span>${l}</span>`).join("")}${learningProgress.next ? `<span class="next-letter">?</span>` : ""}</div><div class="journey-stats"><span><b>${learningProgress.syllables.opened.length} / ${learningProgress.syllables.total}</b><small>складів</small></span><span><b>${learningProgress.trains}</b><small>різних потягів</small></span></div></div>`;
    if (route === "welcome")
      html = `<div class="cover"><section class="welcome"><div class="emblem">${icon("home")}</div><div class="eyebrow">МАЛЕНЬКІ ВІДКРИТТЯ ЩОДНЯ</div><h1>Острів Емілії</h1><p>Твій дім. Твої друзі. Твої перші слова.</p><div class="how"><span>${icon("hand")}Торкнись</span><span>${icon("ear")}Послухай</span><span>${icon("build")}Створи</span></div>${btn("start", "play", "Грати", "primary")}<button class="quiet" data-action="parents">Для батьків</button>${saveBlocked ? '<p class="note">Збереження потребує перевірки. Оригінал не змінено — відкрийте меню батьків.</p>' : ""}</section><a class="legal-link" href="licenses.html" target="_blank" rel="noopener">Ліцензії</a></div>`;
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
        `<section class="side-panel pet-panel"><div class="row"><h3>${names[draft]}</h3></div><div class="choice-grid">${S.PETS.map((p, i) => `<button class="choice ${draft === p ? "active" : ""}" data-action="pet-choice" data-value="${p}" aria-label="${names[p]}">${A.thumb("pet", i)}<span>${names[p]}</span>${S.ownsPet(state, p) ? "" : `<small class="pet-price">${gemImage()}${S.PET_PRICES[p]}</small>`}</button>`).join("")}</div><div class="row">${btn("rotate-left", "rotate", "Повернути ліворуч")}${btn("rotate-right", "rotate", "Повернути праворуч")}</div><div class="actions">${btn("back", "close", "Скасувати", "secondary")}${S.ownsPet(state, draft) ? btn("apply-pet", "check", "Готово", "primary") : btn("buy-pet", "gem", `${S.PET_PRICES[draft]} · Відкрити`, "primary")}</div></section><div class="scene-actions pet-actions">${[
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
        bar("Майстерня") +
        `<section class="side-panel build-panel"><div class="row build-tools">${objectButton("roads", "models/ui/path-stone.png", "Доріжки")}${objectButton("land", "models/ui/land.png", "Нова земля")}${objectButton("demolish", "models/park/thumbs/park-trashcan.png", "Розібрати")}</div><div class="park-tabs" role="group" aria-label="Види прикрас">${ParkCatalog.groups.map((c) => `<button class="${buildCategory === c.id ? "active" : ""}" data-action="build-category" data-value="${c.id}" aria-label="${c.name}">${objectImage(c.thumb, "category-thumb")}<span>${c.name}</span></button>`).join("")}</div><div class="choice-grid park-catalog">${S.ITEMS.filter(
          (i) => ParkCatalog.inGroup(i, buildCategory),
        )
          .map(
            (i) =>
              `<button class="choice object-only ${edit.kind === i.id ? "active" : ""}" data-action="build-kind" data-value="${i.id}" aria-label="${i.name}, ${crystals(i.cost)}">${i.thumb ? `<img src="${i.thumb}" alt="" width="112" height="96" />` : icon(i.id === "house" ? "home" : i.id)}<b class="park-price">${gemImage()}${i.cost}</b></button>`,
          )
          .join(
            "",
          )}</div><p class="note" id="placement-note"></p><div class="actions">${btn("build-rotate", "rotate", S.ITEMS.find((item) => item.id === edit.kind)?.stretch ? "Поворот 45°" : "Повернути", "secondary")}${S.ITEMS.find((item) => item.id === edit.kind)?.stretch ? "" : btn("build-apply", "check", "Будувати", "primary")}</div></section>`;
    if (route === "demolish")
      html = `${bar("Розібрати")}<div class="demolish-mode" aria-live="polite">${objectImage("models/park/thumbs/park-trashcan.png", "demolish-object")}<b>Торкнись споруди</b></div>`;
    if (route === "land")
      html =
        bar("Більше місця") +
        `<section class="side-panel land-panel"><div class="row"><h3>Розширюй своє місто</h3></div><p class="note">Відкрито ${state.lands.length} із ${S.LANDS.length} ділянок.</p><div class="land-list" style="display:grid;gap:10px">${
          S.availableLands(state)
            .map(
              (l) =>
                `<button class="land-card ${draft === l.id ? "active" : ""}" data-action="land-choice" data-value="${l.id}">${objectImage("models/ui/land.png", "land-object")}<span>${l.name}<small>${gemImage()}${l.cost}</small></span></button>`,
            )
            .join("") || "Усі ділянки вже твої!"
        }</div><div class="actions">${btn("expand", "plus", "Відкрити", "primary", !draft ? "disabled" : "")}</div></section>`;
    if (route === "roads")
      html =
        bar("Доріжки") +
        `<section class="side-panel path-panel"><h3>Обери покриття</h3><div class="path-materials">${[
          ["sand", "Пісочок"],
          ["stone", "Камінь"],
          ["brick", "Цегла"],
          ["wood", "Дерево"],
          ["stepping", "Садові плити"],
        ]
          .map(
            ([v, t]) =>
              `<button class="choice ${material === v ? "active" : ""}" data-action="road-material" data-value="${v}" aria-label="${t}">${v === "erase" ? `<span class="path-swatch swatch-erase">${icon("undo")}</span>` : objectImage(`models/ui/path-${v}.png`, "path-object")}<span>${t}</span></button>`,
          )
          .join("")}</div><h3>Краї доріжки</h3><div class="path-borders">${[
          ["none", "Без країв"],
          ["stone", "Кам’яні"],
          ["brick", "Цегляні"],
          ["flowers", "Квіткові"],
        ]
          .map(
            ([v, t]) =>
              `<button class="choice ${pathBorder === v ? "active" : ""}" data-action="path-border" data-value="${v}" aria-label="${t}"><span class="edge-swatch edge-${v}" aria-hidden="true"></span><span>${t}</span></button>`,
          )
          .join(
            "",
          )}</div><p class="path-quote" id="path-quote"></p><div class="actions">${btn("road-apply", "check", "Побудувати", "primary")}${btn("path-undo", "undo", "Скасувати останню доріжку", "secondary", lastGardenPath === null ? "disabled" : "")}</div></section>`;
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
              `<button class="choice ${edit.kind === k ? "active" : ""}" data-action="furniture-kind" data-value="${k}">${objectImage(`models/ui/furniture-${k}.png`, "furniture-object")}<span>${t}</span></button>`,
          )
          .join(
            "",
          )}</div><div class="actions">${btn("back", "close", "Скасувати", "secondary")}${btn("furniture-apply", "check", "Готово", "primary")}</div></section>`;
    if (route === "learn") {
      const section = learnSections.find((entry) => entry.id === learnSection);
      if (!section)
        html = modal(
          "Маленькі відкриття",
          `<div class="learn-home">${journey}<button class="play-big" data-action="lesson" data-value="auto" aria-label="Продовжити навчальну пригоду">${icon("play")}<span><b>Грати</b><small>Гра сама обере наступне завдання</small></span></button><div class="learn-sections">${learnSections
            .map(
              (entry) =>
                `<button class="learn-section section-${entry.id}" data-action="learn-section" data-value="${entry.id}" aria-label="${entry.title}"><div class="section-visual">${entry.visual}</div><span><b>${entry.title}</b></span></button>`,
            )
            .join("")}</div></div>`,
        );
      else
        html = modal(
          section.title,
          `<div class="section-banner section-${section.id}"><div class="section-visual">${section.visual}</div><p>${section.note}</p></div><div class="menu-grid section-games">${section.modes
            .map(
              (key) =>
                `<button class="menu-card" data-action="lesson" data-value="${key}"><div class="lesson-mark">${modeMarks[key]}</div><b>${modes[key][0]}</b></button>`,
            )
            .join("")}${section.album ? `<button class="menu-card" data-action="album">${icon("book")}<b>Моя абетка</b><small>Усі 33 літери</small></button>` : ""}</div>${section.families ? `<div class="family-caption">Обери друга для складів</div><div class="families">${S.FAMILIES.map((f, i) => `<button data-action="family" data-value="${i}" class="${family === i ? "active" : ""}" ${L.familyOpen(state, i) ? "" : "disabled"}>${f[0]}</button>`).join("")}</div>` : ""}`,
        );
    }
    if (route === "lesson") html = lessonHTML();
    if (route === "reward") {
      if (!run.party.closed)
        // Keep the final solved letter/syllable visible under the celebration.
        html = `${lessonHTML()}<div id="learning-party" aria-label="Свято після заняття"></div>`;
      else
        html = `<div class="cover"><section class="modal reward"><div class="big-gem">${icon("check")}</div><h2>У тебе вийшло!</h2>${run.newItems?.length ? `<div class="new-discovery"><small>НОВЕ ВІДКРИТТЯ</small><div>${run.newItems.map((t) => `<span>${t}</span>`).join("")}</div></div>` : ""}<div class="reward-discoveries" aria-label="Сьогодні грали з">${[
          ...new Set(run.discoveries || []),
        ]
          .slice(0, 5)
          .map((t) => `<span>${t}</span>`)
          .join(
            "",
          )}</div><div class="reward-total">${gemImage()} +${3 + run.party.credited}</div><p>3 за заняття${run.party.credited ? ` + ${run.party.credited} за свято` : ""}. Можна повертатися до друзів!</p>${btn("reward-home", "home", "На острів", "primary")}${btn("again", "play", "Ще пограти", "secondary")}</section></div>`;
    }
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
        `<div class="alphabet">${[..."АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"].map((l) => `<button data-action="letter-audio" data-value="${l}" class="${{ mastered: "learned", known: "learning", learning: "learning" }[L.status(state, "L:" + l)] || ""}">${l}</button>`).join("")}</div><div class="letter-detail" id="letter-detail">Торкнись літери, щоб послухати.</div><div class="audio-status" id="audio-status"></div>`,
      );
    $("ui").innerHTML = html;
    if ($("learning-party")) {
      const current = run;
      disposeParty = LearningParty.mount($("learning-party"), run.party, {
        icon,
        mode: run.partyMode,
        reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onPop(id) {
          if (route !== "reward" || run !== current) return null;
          const result = LearningParty.credit(state, current.party, id);
          if (result) {
            sfx(
              [run.partyMode === "fruit" ? 520 : 700, 900 + result.count * 35],
              0.07,
              "sine",
            );
            if (result.gems) {
              save();
              hud();
            }
          }
          return result;
        },
        onEnd() {
          if (route !== "reward" || run !== current) return;
          render();
          document.querySelector('[data-action="reward-home"]')?.focus();
        },
      });
    }
    if (route === "build") preview();
    if (route === "roads") pathPreview();
  }
  function pathPreview() {
    world.previewRoad(roadCells, material, pathBorder);
    if (!$("path-quote")) return;
    const reason =
      material === "erase"
        ? ""
        : GardenPaths.error(state, roadCells, material, pathBorder);
    $("path-quote").textContent =
      roadCells.length < 2
        ? ""
        : material === "erase"
          ? `Доріжок для прибирання: ${GardenPaths.near(state, roadCells).length}`
          : reason ||
            `Вартість: ${crystals(GardenPaths.price(GardenPaths.smooth(roadCells), pathBorder))}`;
  }
  function preview() {
    if (!edit) return;
    const item = S.ITEMS.find((entry) => entry.id === edit.kind);
    if (item?.stretch) {
      world.setEditor({ type: "line" });
      const start = lineStart || { x: edit.x, z: edit.z },
        end = lineEnd || start,
        plan = S.linePlan(state, edit.kind, start, end, edit.rotation);
      world.previewLine(plan);
      if ($("placement-note"))
        $("placement-note").textContent = plan.length
          ? `${plan.length} шт. · ${crystals(plan.length * item.cost)}`
          : state.gems < item.cost
            ? "Не вистачає кристалів"
            : "Обери вільне місце";
      return;
    }
    if (world.editor?.type !== "objects") world.setEditor({ type: "objects" });
    const error = S.placement(state, edit, edit.id);
    world.preview(edit.kind, edit.x, edit.z, edit.rotation, !error);
    if ($("placement-note")) $("placement-note").textContent = error || "";
  }
  // mode "auto" is the guided game ("Грати"); other modes are free play from the menu.
  function begin(mode, carry = []) {
    resetAudio();
    route = "lesson";
    world.paused = true;
    run = {
      mode,
      index: 0,
      total: 3,
      rewarded: false,
      previous: null,
      // A continued game remembers recent material, so "Ще пограти" really
      // continues the learning path instead of replaying the same three cards.
      used: L.lessonHistory(state, mode, carry),
      discoveries: [],
      newItems: [],
    };
    if (mode === "auto") {
      run.total = 5;
      // The very first guided game finds out which letters the child already knows.
      if (
        !state.placed &&
        !state.allLevels &&
        (state.runs === 0 || state.seen.recheck)
      )
        run.place = { k: 0, misses: 0, streak: 0 };
      else if (!state.placed) {
        // Saves created before the placement flag was introduced may already
        // contain real learning history. Do not restart them at the alphabet.
        state.placed = true;
        save();
      }
    }
    nextTask();
  }
  // Free play: the child picked the exercise, the game picks the content.
  function freeTask(mode) {
    const letters = L.activeLetters(state),
      audibleLetters = letters.filter((letter) => letter !== "Ь");
    if (mode === "sound-part")
      return L.soundPartTask(state, Math.random, run.used);
    if (mode === "train") return L.trainTask(state, run.used);
    if (["letters", "hear"].includes(mode)) {
      const pool = mode === "hear" ? audibleLetters : letters,
        unused = L.freshPool(pool, run.used, "L:"),
        target = Core.choose(
          unused.length ? unused : pool,
          state.letterScores,
          run.previous,
        );
      return {
        mode,
        target,
        key: "L:" + target,
        options: L.letterOptions(state, target),
      };
    }
    if (mode === "pairs") {
      const unused = L.freshPool(letters, run.used, "L:"),
        p = [
          ...Core.shuffle(unused),
          ...Core.shuffle(letters.filter((letter) => !unused.includes(letter))),
        ].slice(0, 3);
      return {
        mode,
        target: p.join(""),
        keys: p.map((letter) => "L:" + letter),
        options: Core.shuffle([...p, ...p]),
      };
    }
    if (mode === "words") {
      let words = L.readyWords(state);
      if (!words.length) words = [S.WORDS[0]];
      const fresh = L
          .freshPool(words, run.used, "W:", (word) => word.text)
          .filter((word) => word.text !== run.previous),
        w = Core.shuffle(fresh.length ? fresh : words)[0];
      return {
        mode,
        target: w.text,
        key: "W:" + w.text,
        word: w,
        options: L.wordOptions(state, w),
      };
    }
    family = L.nextFamily(state, family, run.used);
    const pool = S.FAMILIES[family],
      unused = L.freshPool(pool, run.used, "S:"),
      target = Core.choose(
        unused.length ? unused : pool,
        state.syllableScores,
        run.previous,
      );
    if (mode === "blend" || mode === "discover")
      return {
        mode,
        target,
        key: "S:" + target,
        options: Core.shuffle([...target].map((text, id) => ({ text, id }))),
      };
    return {
      mode,
      target,
      key: "S:" + target,
      options: Core.shuffle([
        target,
        ...Core.shuffle(pool.filter((x) => x !== target)).slice(
          0,
          (state.modeRuns["hear-syllable"] || 0) < 2 ? 1 : 2,
        ),
      ]),
    };
  }
  function nextTask() {
    audio.stop();
    let t;
    if (run.place) {
      t = L.placementTask(state, run);
      if (!t) return finishRun();
    } else t = run.mode === "auto" ? L.plan(state, run) : freeTask(run.mode);
    const mode = t.mode,
      before = task?.mode;
    task = {
      mode,
      target: t.target,
      answer: t.answer,
      audioTarget: t.audioTarget,
      role: t.role,
      parts: t.parts,
      options: t.options,
      placement: !!t.placement,
      isNew: !!t.isNew,
      hinted: false,
      done: false,
      heard: false,
      selected: [],
      matched: [],
      picked: [],
      failures: 0,
    };
    if (t.word) Object.assign(task, t.word, { target: t.word.text });
    if (t.key) run.used.push(t.key);
    if (t.keys) run.used.push(...t.keys);
    run.used = L.rememberLesson(state, run.mode, run.used);
    if (t.isNew) run.newDone = true;
    if (mode === "pairs") run.pairsDone = true;
    if (mode === "sound-part") run.soundDone = true;
    if (mode === "train") run.trainDone = true;
    if (mode === "words") run.wordsDone = true;
    run.previous = task.target;
    render();
    // The spoken instruction comes whenever the kind of task changes; repeats only say the target.
    const promptMode = mode === "sound-part" ? "hear" : mode === "train" ? null : mode,
      intro =
        (run.index === 0 || mode !== before) && promptMode
          ? "task-" + promptMode
          : null;
    if (mode !== "pairs") playTask(intro);
    else if (intro) audio.play("phrase", intro);
  }
  function finishRun() {
    if (!S.reward(state, run)) return;
    run.party = LearningParty.create();
    run.partyMode = LearningParty.chooseMode();
    if (run.place) {
      state.placed = true;
      delete state.seen.recheck;
    }
    save();
    audio.stop();
    route = "reward";
    render();
    chimeCorrect();
    audio.play("phrase", "reward");
  }
  function picture(kind, emoji) {
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
    if (!kind && emoji)
      return `<div class="word-emoji" aria-hidden="true">${emoji}</div>`;
    return `<svg class="word-picture" viewBox="0 0 100 100" aria-hidden="true">${paths[kind] || paths.frame}</svg>`;
  }
  function lessonHTML() {
    const m = task.mode,
      hearing = ["hear", "hear-syllable", "sound-part", "train"].includes(m),
      finalAnswer = !task.placement && run.index + 1 >= run.total;
    let board = "",
      answers = "";
    if (m === "train")
      board = `<div class="train-board"><div class="train-engine">${icon("play")}</div><div class="slots ${task.done ? "joined" : ""}">${task.parts.map((part, i) => `<div class="slot ${task.picked.length > i ? "filled" : ""}">${task.picked.length > i ? part : "·"}</div>`).join("")}</div></div>`;
    else if (m === "sound-part" && task.done)
      board = `<button class="letter-block sound-part-result" data-action="play-task">${[...task.audioTarget].map((letter, i) => `<span class="${(task.role === "first" ? i === 0 : i === 1) ? "focus" : ""}">${letter}</span>`).join("")}</button>`;
    else if (hearing) board = btn("play-task", "sound", "Послухати", "primary");
    else if (m === "pairs") board = icon("flowers");
    else if (m === "discover")
      board = `<button class="letter-block syllable-card" data-action="play-task">${[...task.target].map((l) => "<span>" + l + "</span>").join("")}</button>`;
    else if (m === "blend" || m === "words") {
      board = `${m === "words" ? picture(task.picture, task.emoji) : ""}<div><div class="syllable-display">${task.target}</div><div class="slots ${task.done ? "joined" : ""}">${(m === "words" ? task.parts : [...task.target]).map((v, i) => `<div class="slot ${task.picked.length > i ? "filled" : ""}">${task.picked.length > i ? v : "·"}</div>`).join("")}</div></div>`;
    } else
      board = `<button class="letter-block" data-action="play-task">${task.target}</button>`;
    if (m !== "discover")
      answers = task.options
        .map((v, i) => {
          const text = typeof v === "string" ? v : v.text,
            used = task.picked.includes(i) || task.matched.includes(i);
          const correct =
            task.done &&
            !task.placement &&
            (text === (task.answer || task.target) || used);
          return `<button class="answer ${correct ? "correct" : ""} ${text.length > 1 ? "long" : ""} ${task.selected.includes(i) ? "selected" : ""} ${task.matched.includes(i) ? "matched" : ""} ${task.hintIndex === i ? "hint" : ""}" data-action="answer" data-value="${i}" ${task.done || used || (hearing && !task.heard) ? "disabled" : ""}>${text}</button>`;
        })
        .join("");
    return `<div class="cover"><section class="lesson-shell"><div class="lesson-head">${btn("back", "back", "Назад")}<div><b>${modes[m][0]}</b><div class="dots">${run.place ? "" : Array.from({ length: run.total }, (_, i) => `<i class="${i < run.index ? "done" : i === run.index ? "current" : ""}"></i>`).join("")}</div></div><div class="spacer"></div><div class="lesson-total"><b>${L.progress(state).opened.length}</b><small>літер</small></div>${btn("play-task", "sound", "Послухати ще раз")}${task.placement ? "" : btn("help", "hand", "Підказка")}</div><h3 class="lesson-title">${task.isNew && !task.done ? (task.target.length > 1 ? "Новий склад!" : "Нова літера!") : task.done && !task.placement ? "Чудово!" : m === "train" ? "Послухай і склади потяг" : m === "sound-part" ? (task.role === "first" ? "Яка літера на початку?" : "Яка літера в кінці?") : hearing ? "Послухай і знайди" : m === "pairs" ? "Знайди дві однакові" : m === "blend" ? "З’єднай літери" : m === "words" ? "Збери слово зі складів" : m === "discover" ? "Торкнись і послухай" : "Знайди таку саму"}</h3><div class="lesson-board">${board}</div><div class="answers">${answers}</div><div class="audio-status" id="audio-status"></div><div class="lesson-feedback">${task.feedback || ""}</div>${((task.done && !task.placement && !finalAnswer) || m === "discover") ? btn("next", "check", "Далі", "primary lesson-next", m === "discover" && !task.heard ? "disabled" : "") : ""}</section></div>`;
  }
  async function playLearningUnit(kind, value) {
    if (audio.entry(kind, value)) return audio.play(kind, value);
    let played = false;
    for (const letter of [...value].filter((v) => /[А-ЯҐЄІЇ]/.test(v))) {
      if (!audio.entry("letter", letter)) continue;
      if (!(await audio.play("letter", letter))) return false;
      played = true;
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    return played;
  }
  async function playWord(word) {
    if (audio.entry("word", word.text)) return audio.play("word", word.text);
    let played = false;
    for (const part of word.parts) {
      if (!(await playLearningUnit("syllable", part))) continue;
      played = true;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return played;
  }
  // intro: optional spoken prompt (voice-pack phrase key) said before the target.
  async function playTask(intro) {
    if (!task || route !== "lesson") return;
    const t = task;
    if (typeof intro === "string") {
      await audio.play("phrase", intro);
      if (task !== t || route !== "lesson") return;
    }
    if (task.mode === "train") {
      let ok = true;
      document.querySelector(".slots")?.classList.add("reading");
      for (const part of task.parts) {
        if (task !== t || route !== "lesson") return;
        ok = (await playLearningUnit("syllable", part)) && ok;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      if (task === t && route === "lesson" && ok) {
        task.heard = true;
        render();
      }
      return;
    }
    const kind = ["letters", "hear", "pairs"].includes(task.mode)
        ? "letter"
        : task.mode === "words"
          ? "word"
          : "syllable",
      target =
        task.mode === "pairs"
          ? task.options[task.selected[0] ?? 0]
          : task.audioTarget || task.target;
    document.querySelector(".syllable-card")?.classList.add("reading");
    document.querySelector(".slots")?.classList.add("reading");
    const ok =
      task.mode === "words"
        ? await playWord(task)
        : await playLearningUnit(kind, target);
    if (task !== t || route !== "lesson") return;
    if (ok) {
      task.heard = true;
      render();
    } else if (target === "Ь") {
      task.heard = true;
      task.feedback = "М’який знак не має власного звука.";
      render();
      audio.play("phrase", "soft-sign");
    }
  }
  function complete() {
    task.done = true;
    if (task.isNew && !run.newItems.includes(task.target))
      run.newItems.push(task.target);
    run.discoveries.push(
      ...(task.mode === "pairs"
        ? [...task.target]
        : task.mode === "train"
          ? task.parts
          : [task.target]),
    );
    task.feedback = task.hinted ? "Разом вийшло!" : "У тебе вийшло!";
    chimeCorrect();
    S.skill(state, task.mode, task.target, task.hinted);
    L.record(state, task.mode, task.target, !task.hinted);
    save();
    render();
    const t = task,
      praise = "praise-" + (1 + Math.floor(Math.random() * 4));
    if (run.index + 1 >= run.total)
      setTimeout(
        () => task === t && route === "lesson" && finishRun(),
        850,
      );
    setTimeout(async () => {
      if (task !== t || route !== "lesson") return;
      await audio.play("phrase", praise);
      if (task === t && route === "lesson" && task.mode !== "pairs") playTask();
    }, 450);
  }
  // Wrong pick: let the child hear what they chose, then the target again.
  async function sayWrong(value, hint) {
    const t = task,
      kind = ["hear-syllable", "words", "train"].includes(task.mode)
        ? "syllable"
        : "letter";
    await new Promise((r) => setTimeout(r, 380));
    if (task !== t || route !== "lesson") return;
    const ok = await playLearningUnit(kind, value);
    if (!ok || task !== t) return;
    if (task.mode === "pairs") {
      if (hint) audio.play("phrase", "hint");
    } else playTask(hint ? "hint" : null);
  }
  function shake(i) {
    document
      .querySelector(`.answer[data-value="${i}"]`)
      ?.classList.add("wrong");
  }
  function miss(i, value) {
    task.hinted = true;
    task.failures++;
    if (!["pairs", "blend", "words", "train"].includes(task.mode))
      L.confuse(state, task.target, value);
    task.feedback = "Спробуй ще. Ми нікуди не поспішаємо.";
    chimeWrong();
    if (task.failures >= 2) help(true);
    else render();
    shake(i);
    sayWrong(value, task.failures >= 2);
  }
  function answer(i) {
    if (!task || task.done) return;
    const m = task.mode;
    if (["hear", "hear-syllable", "sound-part", "train"].includes(m) && !task.heard)
      return;
    if (task.placement) {
      // The check only listens: no hints, no corrections, straight on.
      const ok = task.options[i] === task.target,
        t = task;
      task.done = true;
      L.placementResult(state, run, task.target, ok);
      if (!ok) L.confuse(state, task.target, task.options[i]);
      save();
      render();
      if (ok) chimeCorrect();
      else chimeWrong();
      setTimeout(() => task === t && route === "lesson" && nextTask(), 1100);
      return;
    }
    if (m === "pairs") {
      if (task.matched.includes(i) || task.selected.includes(i)) return;
      task.selected.push(i);
      if (task.selected.length === 2) {
        const [a, b] = task.selected;
        if (task.options[a] === task.options[b]) {
          task.matched.push(a, b);
          task.selected = [];
          task.hintIndex = undefined;
          if (task.matched.length === task.options.length) {
            complete();
            return;
          }
          chimeCorrect();
        } else {
          task.selected = [i];
          miss(i, task.options[i]);
          return;
        }
      } else audio.play("letter", task.options[i]);
      render();
      return;
    }
    if (["blend", "words", "train"].includes(m)) {
      if (task.picked.includes(i)) return;
      const expected = (["words", "train"].includes(m) ? task.parts : [...task.target])[
        task.picked.length
      ];
      if (task.options[i].text === expected) {
        task.picked.push(i);
        if (
          task.picked.length ===
          (["words", "train"].includes(m) ? task.parts.length : [...task.target].length)
        ) {
          complete();
          return;
        }
        task.feedback = "А тепер друга частинка";
        task.hintIndex = undefined;
        render();
        audio.play("phrase", "second-part");
        return;
      }
    } else if (task.options[i] === (task.answer || task.target)) {
      complete();
      return;
    }
    const v = task.options[i];
    miss(i, typeof v === "string" ? v : v.text);
  }
  function help(quiet) {
    if (!task || task.done) return;
    task.hinted = true;
    const m = task.mode;
    if (m === "pairs") {
      const left = task.options
        .map((_, i) => i)
        .filter((i) => !task.matched.includes(i));
      task.selected = [left[0]];
      task.hintIndex = left.find(
        (i) => i !== left[0] && task.options[i] === task.options[left[0]],
      );
    } else if (["blend", "words", "train"].includes(m)) {
      const expected = (["words", "train"].includes(m) ? task.parts : [...task.target])[
        task.picked.length
      ];
      task.hintIndex = task.options.findIndex(
        (v, i) => v.text === expected && !task.picked.includes(i),
      );
    } else task.hintIndex = task.options.indexOf(task.answer || task.target);
    task.feedback = "Подивись на картку, що рухається.";
    render();
    if (quiet) return;
    if (m === "pairs") audio.play("phrase", "hint");
    else playTask("hint");
  }
  function parentsHTML() {
    const entries = Object.entries(state.skills),
      solo = entries.reduce((a, [, v]) => a + v.solo, 0),
      hinted = entries.reduce((a, [, v]) => a + v.hinted, 0);
    return modal(
      "Для батьків",
      `${saveBlocked ? "<p>Збереження пошкоджене. Можна безпечно почати заново.</p>" : ""}<div class="stats"><div><b>${state.runs}</b><small>ігор</small></div><div><b>${solo}</b><small>самостійно</small></div><div><b>${hinted}</b><small>з допомогою</small></div></div>${[
        ["sound", "Звуки"],
        ["voice", "Голос учительки"],
      ]
        .map(
          ([k, t]) =>
            `<label class="setting"><input type="checkbox" data-setting="${k}" ${state[k] ? "checked" : ""}>${t}</label>`,
        )
        .join(
          "",
        )}<label class="setting volume-setting"><span>Гучність</span><input id="volume-setting" type="range" min="0" max="1" step="0.1" value="${state.volume}" aria-label="Гучність"></label><div class="parent-actions">${btn("reset-ask", "undo", "Почати заново", "secondary danger")}</div>`,
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
    }
    if (e.type === "place-position") {
      edit.x = e.x;
      edit.z = e.z;
      preview();
    }
    if (e.type === "line-start") {
      lineStart = {
        x: Math.round(e.x * 2) / 2,
        z: Math.round(e.z * 2) / 2,
      };
      lineEnd = { ...lineStart };
      preview();
    }
    if (e.type === "line-move" && lineStart) {
      lineEnd = { x: e.x, z: e.z };
      preview();
    }
    if (e.type === "line-end" && lineStart) {
      lineEnd = { x: e.x, z: e.z };
      const item = S.ITEMS.find((entry) => entry.id === edit.kind),
        placed = S.placeLine(
          state,
          edit.kind,
          lineStart,
          lineEnd,
          edit.rotation,
        );
      lineStart = null;
      lineEnd = null;
      if (!placed) {
        preview();
        toast(
          state.gems < (item?.cost || Infinity)
            ? "Потрібно ще трохи кристалів"
            : "Тут огорожа не поміститься",
        );
        return;
      }
      save();
      world.refreshObjects(placed.at(-1).id);
      preview();
      toast(`Побудовано: ${placed.length}`);
    }
    if (e.type === "demolish-protected") {
      toast("Це дім Емілії — він залишається");
      return;
    }
    if (e.type === "demolish-object") {
      if (e.fixed) {
        if (!S.removeFixed(state, e.id)) return;
        save();
        world.removeFixedBuilding(e.id);
        toast("Споруду прибрано");
      } else {
        const object = state.objects.find((entry) => entry.id === e.id),
          refund = object?.paid || 0;
        if (!object || !S.remove(state, e.id)) return;
        save();
        world.getUp?.();
        world.refreshObjects();
        toast(`Повернуто ${crystals(refund)}`);
      }
      return;
    }
    if (e.type === "object") {
      const o = state.objects.find((o) => o.id === e.id);
      const def = ParkCatalog.items.find((i) => i.id === o?.kind);
      if (def) {
        const g = world.objectGroup.children.find(
          (g) => g.userData.objectId === o.id,
        );
        if (g) ParkAssets.react(g, world.time);
        if (def.action === "sit" || def.action === "picnic") {
          world.stop();
          world.hero.position.set(
            o.x,
            def.action === "sit" ? -0.18 : -0.65,
            o.z,
          );
          world.hero.rotation.y = (o.rotation * Math.PI) / 2;
          world.sitY = world.hero.position.y;
          world.sitting = true;
        }
        return;
      }
      if (o?.kind === "house") {
        world.roomId = e.id;
        open("room");
      } else {
        if (o?.kind === "bench") {
          world.hero.position.set(o.x, -0.1, o.z);
          world.sitY = -0.1;
          world.sitting = true;
        }
        if (o?.kind === "swing") world.rideSwing(o.id);
      }
    }
    if (e.type === "road-start") {
      roadStart = { x: e.x, z: e.z };
      if (roadCells.length < 240) roadCells.push(roadStart);
      pathPreview();
    }
    if (e.type === "road-move" && roadStart) {
      const last = roadCells.at(-1);
      if (
        roadCells.length < 240 &&
        Math.hypot(last.x - e.x, last.z - e.z) > 0.45
      ) {
        roadCells.push({ x: e.x, z: e.z });
        pathPreview();
      }
    }
    if (e.type === "furniture-position") {
      edit.x = e.x;
      edit.z = e.z;
      world.moveFurniture(edit.kind, e.x, e.z);
    }
    if (e.type === "built") $("build-progress")?.remove();
    if (e.type === "graphics-lost")
      toast("Відновлюємо графіку. Зачекай кілька секунд…");
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

      audio.play("phrase", "welcome");
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
        "demolish",
        "land",
        "roads",
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
    if (act === "buy-pet") {
      if (S.buyPet(state, draft)) {
        save();
        world.petReact("stroke");
        render();
      } else
        toast("Потрібно ще трохи кристалів. Пограй з літерами чи складами!");
    }
    if (act === "apply-pet" && S.ownsPet(state, draft)) {
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
      lineStart = null;
      lineEnd = null;
      render();
    }
    if (act === "build-category" && !edit.id) {
      buildCategory = v;
      const first = S.ITEMS.find((i) => ParkCatalog.inGroup(i, v));
      if (first) edit.kind = first.id;
      lineStart = null;
      lineEnd = null;
      render();
    }
    if (act === "build-rotate") {
      const item = S.ITEMS.find((entry) => entry.id === edit.kind);
      edit.rotation = (edit.rotation + (item?.stretch ? 0.5 : 1)) % 4;
      lineStart = null;
      lineEnd = null;
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
    if (act === "land-choice") {
      draft = v;
      world.previewLand(v);
      render();
    }
    if (act === "expand") {
      if (!S.expand(state, draft)) {
        toast(
          S.LANDS.find((l) => l.id === draft)?.requires?.some((id) =>
            state.lands.includes(id),
          ) === false
            ? "Спочатку відкрий сусідній берег"
            : "Потрібно ще трохи кристалів. Пограй зі складами!",
        );
        return;
      }
      save();
      world.refreshTerrain();
      world.setEditor(null);
      route = "street";
      world.homeCamera();
      const land = S.LANDS.find((l) => l.id === draft);
      if (land) world.cameraAnchor = new THREE.Vector3(land.x, 0, land.z);
      render();
    }
    if (act === "road-material") {
      material = v;
      render();
    }
    if (act === "path-border") {
      pathBorder = v;
      render();
    }
    if (act === "path-undo" && lastGardenPath !== null) {
      if (GardenPaths.remove(state, lastGardenPath)) {
        save();
        world.refreshRoads();
      }
      lastGardenPath = null;
      render();
    }
    if (act === "road-clear") {
      roadStart = null;
      roadCells = [];
      pathPreview();
    }
    if (act === "road-apply") {
      if (!roadCells.length) {
        toast("Обери початок і кінець доріжки");
        return;
      }
      if (material === "erase") {
        const ids = GardenPaths.near(state, roadCells);
        ids.forEach((id) => GardenPaths.remove(state, id));
        const samples = GardenPaths.smooth(roadCells);
        for (const k of Object.keys(state.roads)) {
          const [x, z] = k.split(",").map(Number);
          if (samples.some((p) => Math.hypot(p.x - x * 2, p.z - z * 2) < 1.5))
            delete state.roads[k];
        }
        if (ids.includes(lastGardenPath)) lastGardenPath = null;
      } else {
        const reason = GardenPaths.error(
          state,
          roadCells,
          material,
          pathBorder,
        );
        if (reason) {
          toast(reason);
          return;
        }
        const path = GardenPaths.add(state, roadCells, material, pathBorder);
        if (!path) {
          toast("Обери інше місце для доріжки");
          return;
        }
        lastGardenPath = path.id;
      }
      save();
      world.refreshRoads();
      roadStart = null;
      roadCells = [];
      render();
    }
    if (act === "family") {
      family = Number(v);
      render();
    }
    if (act === "learn-section") {
      learnSection = v;
      render();
    }
    if (act === "lesson") begin(v);
    if (act === "again") begin(run.mode, run.used);
    if (act === "answer") answer(Number(v));
    if (act === "help") help();
    if (act === "play-task") playTask();
    if (act === "next") {
      if (task.placement) return;
      if (!task.done && !(task.mode === "discover" && task.heard)) return;
      if (task.mode === "discover") {
        run.discoveries.push(task.target);
        S.skill(state, "discover", task.target, true);
        L.record(state, "discover", task.target, true);
        save();
      }
      if (++run.index >= run.total) finishRun();
      else nextTask();
    }
    if (act === "letter-audio") {
      if (v === "Ь") {
        $("letter-detail").textContent =
          "М’який знак не має власного звука. Він позначає м’якість приголосного.";
        audio.play("phrase", "soft-sign");
      } else {
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
        "Зникнуть споруди, одяг і навчальний прогрес.",
      );
    if (act === "replace") {
      state.placed = false;
      state.seen.recheck = true;
      save();
      toast("Наступна гра «Грати» почнеться з короткої перевірки.");
      return;
    }
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
    if (e.target.id === "volume-setting") {
      state.volume = Math.max(0, Math.min(1, Number(e.target.value)));
      $("voice").volume = state.volume;
      save();
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
            const cache = await caches.open(
              "emilia-living-v5-34-learning-viewport",
            );
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
