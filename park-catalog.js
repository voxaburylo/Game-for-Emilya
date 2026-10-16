(function (root) {
  "use strict";
  const groups = [
    {
      id: "garden",
      name: "Сад",
      thumb: "models/park/thumbs/park-tree-large.png",
      categories: ["garden"],
    },
    {
      id: "park",
      name: "Парк",
      thumb: "models/park/thumbs/tier-fountain.png",
      categories: ["park", "classic"],
    },
    {
      id: "picnic",
      name: "Пікнік",
      thumb: "models/park/thumbs/picnic-red.png",
      categories: ["picnic", "food"],
    },
    {
      id: "home",
      name: "Двір",
      thumb: "models/park/thumbs/home-house.png",
      categories: ["home", "fences"],
    },
  ];
  // The first hand-built objects remain valid in old v5 saves. The imported
  // catalog supersedes their duplicate flowers, tree, bench and house cards;
  // only the swing adds a distinct play object to the current shop.
  const classicGroups = {
    flowers: "garden",
    bench: "park",
    tree: "garden",
    swing: "park",
    house: "home",
    fountain: "park",
  };
  function groupFor(item) {
    if (!item) return "garden";
    const category = item.category || "classic";
    if (category === "classic") return classicGroups[item.id] || "park";
    return (
      groups.find((group) => group.categories.includes(category))?.id ||
      "garden"
    );
  }
  function inGroup(item, groupId) {
    if (!item || item.hidden) return false;
    const category = item.category || "classic";
    if (category === "classic") return item.id === "swing" && groupId === "park";
    return !!groups
      .find((group) => group.id === groupId)
      ?.categories.includes(category);
  }
  const rows = [
    ["rose-bed", "Білі квіти", 2, 1, 1, "garden", "flower_A", 1.2],
    ["daisy-bed", "Блакитні квіти", 2, 1, 1, "garden", "flower_B", 1.2],
    ["flower-meadow", "Квіткова галявинка", 4, 1.5, 1.3, "garden", "meadow", 1],
    ["round-bush", "Круглий кущ", 3, 1, 1, "garden", "bush", 1.3],
    ["large-bush", "Пишний кущ", 4, 1.3, 1.1, "garden", "bush_large", 1.5],
    [
      "hedge-short",
      "Жива огорожа",
      3,
      1.1,
      0.55,
      "garden",
      "hedge_straight",
      1.2,
    ],
    [
      "hedge-long",
      "Довга жива огорожа",
      5,
      1.8,
      0.55,
      "garden",
      "hedge_straight_long",
      1.2,
    ],
    [
      "hedge-corner",
      "Зелений куточок",
      4,
      1.1,
      1.1,
      "garden",
      "hedge_corner",
      1.2,
    ],
    ["park-tree", "Паркове деревце", 5, 1.3, 1.3, "garden", "tree", 3.8],
    [
      "park-tree-large",
      "Розлоге дерево",
      7,
      1.7,
      1.7,
      "garden",
      "tree_large",
      5,
    ],
    ["garden-leaves", "Пишне листя", 2, 1, 1, "garden", "home_foliage_A", 1.1],
    [
      "garden-leaves-tall",
      "Високе листя",
      3,
      1,
      1,
      "garden",
      "home_foliage_B",
      1.5,
    ],
    ["park-bench", "Паркова лавочка", 5, 1.4, 0.9, "park", "bench", 1.6, "sit"],
    [
      "garden-bench",
      "Садова лавочка",
      5,
      1.4,
      0.9,
      "park",
      "home_bench_A",
      1.6,
      "sit",
    ],
    [
      "cozy-bench",
      "Затишна лавочка",
      6,
      1.4,
      0.9,
      "park",
      "home_bench_B",
      1.6,
      "sit",
    ],
    [
      "park-lantern",
      "Ліхтарик",
      5,
      0.6,
      0.6,
      "park",
      "street_lantern",
      3.5,
      "light",
    ],
    [
      "tier-fountain",
      "Великий фонтан",
      12,
      2,
      2,
      "park",
      "fountain",
      3.3,
      "splash",
    ],
    [
      "flower-fountain",
      "Квітковий фонтан",
      15,
      2.3,
      2.3,
      "park",
      "fountain-garden",
      3.3,
      "splash",
    ],
    [
      "little-fountain",
      "Маленький фонтан",
      8,
      1.3,
      1.3,
      "park",
      "fountain",
      1.9,
      "splash",
    ],
    [
      "white-fence",
      "Білий паркан",
      3,
      1.3,
      0.4,
      "fences",
      "home_fence_straight",
      1.2,
    ],
    [
      "rail-fence",
      "Дерев’яна огорожа",
      3,
      1.3,
      0.4,
      "fences",
      "home_fence_rails",
      1.1,
    ],
    [
      "corner-fence",
      "Кутовий паркан",
      4,
      1.2,
      1.2,
      "fences",
      "home_fence_corner",
      1.2,
    ],
    [
      "garden-gate",
      "Хвіртка",
      5,
      0.9,
      0.5,
      "fences",
      "home_gate_single",
      1.2,
      "gate",
    ],
    [
      "mailbox",
      "Поштова скринька",
      4,
      0.7,
      0.7,
      "park",
      "home_mailbox",
      1.5,
      "mail",
    ],
    [
      "picnic-red",
      "Полуничний пікнік",
      8,
      1.8,
      1.8,
      "picnic",
      "picnic-red",
      1,
      "picnic",
    ],
    [
      "picnic-blue",
      "Небесний пікнік",
      8,
      1.8,
      1.8,
      "picnic",
      "picnic-blue",
      1,
      "picnic",
    ],
    [
      "picnic-green",
      "Лісовий пікнік",
      8,
      1.8,
      1.8,
      "picnic",
      "picnic-green",
      1,
      "picnic",
    ],
    [
      "tea-picnic",
      "Чаювання в саду",
      10,
      1.8,
      1.8,
      "picnic",
      "tea-picnic",
      1,
      "picnic",
    ],
  ];
  rows.push(
    ["park-bird", "Пташка", 3, 0.5, 0.5, "park", "bird", 0.8],
    ["park-cobbles", "Камінці", 2, 1, 0.8, "park", "cobble_stones", 0.35],
    ["park-cobbles-large", "Великі камінці", 3, 1.3, 1, "park", "cobble_stones_large", 0.55],
    ["grass-island-base", "Трав’яний острівець", 2, 1.5, 1.5, "garden", "floor_grass_sliced_base", 0.3],
    ["grass-island-a", "Кругла галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_A", 0.35],
    ["grass-island-b", "Кутова галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_B", 0.35],
    ["grass-island-c", "Мала галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_C", 0.35],
    ["grass-island-d", "Довга галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_D", 0.35],
    ["grass-island-e", "Хвиляста галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_E", 0.35],
    ["grass-island-f", "Широка галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_F", 0.35],
    ["grass-island-g", "Садова галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_G", 0.35],
    ["grass-island-h", "М’яка галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_H", 0.35],
    ["grass-island-i", "Зелена галявинка", 2, 1.5, 1.5, "garden", "floor_grass_sliced_I", 0.35],
    ["grass-tuft", "Пучок трави", 1, 0.6, 0.6, "garden", "grass_A", 0.65],
    ["grass-tuft-wide", "Пишна трава", 1, 0.8, 0.8, "garden", "grass_B", 0.7],
    ["park-trashcan", "Урна", 4, 0.6, 0.6, "park", "trashcan", 1.25],
    ["home-boots", "Чобітки біля дому", 2, 0.7, 0.6, "home", "home_boots", 0.55],
    ["home-cobbles", "Дворові камінці", 3, 1.1, 0.9, "home", "home_cobblestones", 0.35],
    ["home-doormat", "Килимок біля дверей", 2, 0.8, 0.55, "home", "home_doormat", 0.2],
    ["home-fence-open", "Ажурний паркан", 3, 1.3, 0.4, "fences", "home_fence_open", 1.15],
    ["home-fence-open-long", "Довгий ажурний паркан", 5, 2, 0.4, "fences", "home_fence_open_long", 1.15],
    ["home-fence-open-wide", "Широка ажурна огорожа", 6, 2.4, 0.4, "fences", "home_fence_open_wide_long", 1.2],
    ["home-fence-post", "Стовпчик огорожі", 2, 0.4, 0.4, "fences", "home_fence_post", 1.2],
    ["home-fence-rails-long", "Довга дерев’яна огорожа", 5, 2, 0.4, "fences", "home_fence_rails_long", 1.15],
    ["home-fence-straight-long", "Довгий білий паркан", 5, 2, 0.4, "fences", "home_fence_straight_long", 1.2],
    ["home-fence-wide-long", "Широкий білий паркан", 6, 2.4, 0.4, "fences", "home_fence_wide_long", 1.2],
    ["home-floor-base", "Подвір’я для будинку", 4, 2.2, 2.2, "home", "home_floor_base", 0.25],
    [
      "home-double-gate",
      "Подвійні ворота",
      7,
      1.8,
      0.5,
      "fences",
      [
        ["home_gate_double_left", -0.8, 0, 1.2, 1.6, 0.5],
        ["home_gate_double_right", 0.8, 0, 1.2, 1.6, 0.5],
      ],
      1.2,
      "gate",
    ],
    ["home-house", "Затишний будиночок", 18, 2.8, 2.8, "home", "home_house", 4.5],
    ["home-letter", "Лист", 1, 0.5, 0.5, "home", "home_letter", 0.18],
    ["home-package", "Посилка", 3, 0.7, 0.7, "home", "home_package", 0.75],
    ["home-tree", "Дерево біля дому", 6, 1.4, 1.4, "garden", "home_tree", 4],
    ["home-tree-large", "Велике дерево", 8, 1.8, 1.8, "garden", "home_tree_large", 5.3],
    [
      "picnic-apple-snack",
      "Яблучна тарілочка",
      4,
      1,
      0.8,
      "food",
      [
        ["picnic_bowl", 0, 0, 0.3, 0.8, 0.8],
        ["picnic_apple_cut", -0.25, 0, 0.3, 0.35, 0.35, 0.12],
        ["picnic_apple_piece", 0.25, 0.08, 0.25, 0.3, 0.3, 0.12],
      ],
      0.5,
    ],
    [
      "picnic-cheese-board",
      "Сирна тарілка",
      5,
      1.1,
      0.9,
      "food",
      [
        ["picnic_plate_A", 0, 0, 0.15, 0.9, 0.9],
        ["picnic_cheese_A", -0.25, 0, 0.35, 0.38, 0.38, 0.1],
        ["picnic_cheese_B", 0.2, 0.06, 0.35, 0.38, 0.38, 0.1],
        ["picnic_knife", 0.55, 0.12, 0.12, 0.65, 0.18, 0.08],
      ],
      0.55,
    ],
    ["picnic-cooler", "Сумка-холодильник", 6, 0.9, 0.8, "picnic", "picnic_cooler", 1.1],
    ["picnic-lemonade", "Лимонад", 2, 0.5, 0.5, "food", "picnic_drink_can", 0.65],
    ["picnic-frisbee", "Летюча тарілка", 3, 0.8, 0.8, "picnic", "picnic_frisbee", 0.18],
    [
      "picnic-grapes-bowl",
      "Виноград",
      4,
      0.9,
      0.8,
      "food",
      [
        ["picnic_grapes_bowl", 0, 0, 0.45, 0.85, 0.85],
        ["picnic_grapes", 0.15, 0.05, 0.35, 0.45, 0.45, 0.16],
      ],
      0.65,
    ],
    [
      "picnic-jam-tray",
      "Варення на таці",
      5,
      1,
      0.8,
      "food",
      [
        ["picnic_serving_tray_round", 0, 0, 0.18, 0.95, 0.95],
        ["picnic_jam", -0.15, 0, 0.55, 0.45, 0.45, 0.1],
        ["picnic_spoon", 0.35, 0.1, 0.12, 0.55, 0.2, 0.12],
      ],
      0.7,
    ],
    ["picnic-square-basket", "Кошик для пікніка", 5, 0.9, 0.8, "picnic", "picnic_picnic_basket_square", 1.1],
    [
      "picnic-folded-blankets",
      "Стос пледів",
      5,
      1,
      0.8,
      "picnic",
      [
        ["picnic_picnic_blanket_red_folded", 0, 0, 0.24, 0.9, 0.7],
        ["picnic_picnic_blanket_blue_folded", 0, 0, 0.24, 0.82, 0.64, 0.2],
        ["picnic_picnic_blanket_green_folded", 0, 0, 0.24, 0.74, 0.58, 0.4],
      ],
      0.8,
    ],
    [
      "picnic-pillows-blue",
      "Блакитні подушки",
      3,
      1,
      0.8,
      "picnic",
      [
        ["picnic_pillow_large_blue", -0.22, 0, 0.55, 0.75, 0.65],
        ["picnic_pillow_small_blue", 0.35, 0.1, 0.42, 0.55, 0.5],
      ],
      0.65,
    ],
    [
      "picnic-pillows-green",
      "Зелені подушки",
      3,
      1,
      0.8,
      "picnic",
      [
        ["picnic_pillow_large_green", -0.22, 0, 0.55, 0.75, 0.65],
        ["picnic_pillow_small_green", 0.35, 0.1, 0.42, 0.55, 0.5],
      ],
      0.65,
    ],
    [
      "picnic-pillows-red",
      "Червоні подушки",
      3,
      1,
      0.8,
      "picnic",
      [
        ["picnic_pillow_large_red", -0.22, 0, 0.55, 0.75, 0.65],
        ["picnic_pillow_small_red", 0.35, 0.1, 0.42, 0.55, 0.5],
      ],
      0.65,
    ],
    [
      "picnic-table-set",
      "Посуд для пікніка",
      5,
      1.2,
      0.9,
      "food",
      [
        ["picnic_serving_tray_square_A", -0.25, 0, 0.16, 0.75, 0.75],
        ["picnic_serving_tray_square_B", 0.3, 0.05, 0.16, 0.7, 0.7],
        ["picnic_plate_B", -0.22, 0, 0.16, 0.55, 0.55, 0.1],
        ["picnic_fork", 0.42, 0.1, 0.12, 0.65, 0.18, 0.11],
      ],
      0.5,
    ],
    ["picnic-radio", "Радіо", 5, 0.75, 0.65, "picnic", "picnic_radio", 0.85],
    ["picnic-thermos", "Термос", 3, 0.5, 0.5, "food", "picnic_thermos", 0.8],
    [
      "picnic-juice-set",
      "Сік і склянка",
      4,
      0.8,
      0.65,
      "food",
      [
        ["picnic_wine_bottle", -0.18, 0, 0.85, 0.45, 0.45],
        ["picnic_wine_glass", 0.28, 0.05, 0.6, 0.4, 0.4],
      ],
      0.9,
    ],
  );
  const items = rows.map(
    ([id, name, cost, w, h, category, model, height, action]) => ({
      id,
      name,
      cost,
      w,
      h,
      category,
      model,
      height,
      action,
      // Straight fences and hedges can be painted as one snapped line.
      stretch:
        (/^hedge-(short|long)$/.test(id) || category === "fences") &&
        !/(corner|post|gate)/.test(id),
      thumb: "models/park/thumbs/" + id + ".png",
    }),
  );
  const lands = [
    {
      id: "northeast",
      name: "Сад метеликів",
      x: 23,
      z: -21,
      w: 10,
      h: 10,
      cost: 12,
      requires: ["east", "north"],
    },
    {
      id: "southeast",
      name: "Парк фонтанів",
      x: 23,
      z: 21,
      w: 10,
      h: 10,
      cost: 14,
      requires: ["east", "south"],
    },
    {
      id: "southwest",
      name: "Пікнік у хмарах",
      x: -23,
      z: 21,
      w: 10,
      h: 10,
      cost: 16,
      requires: ["west", "south"],
    },
    {
      id: "northwest",
      name: "Сад пригод",
      x: -23,
      z: -21,
      w: 10,
      h: 10,
      cost: 18,
      requires: ["west", "north"],
    },
  ];
  const bounds = { x: 68, z: 66 };
  function districts(original) {
    const xs = [-68, -58, -48, -38, -28, -14, 0, 14, 28, 38, 48, 58, 68],
      zs = [-66, -56, -46, -36, -26, -13, 0, 13, 26, 36, 46, 56, 66],
      out = [];
    for (let row = 0; row < 12; row++)
      for (let col = 0; col < 12; col++) {
        if (col >= 4 && col <= 7 && row >= 4 && row <= 7) continue;
        const dx = Math.max(4 - col, 0, col - 7),
          dz = Math.max(4 - row, 0, row - 7),
          depth = dx + dz;
        const direction =
          dz >= dx
            ? row < 4
              ? "Північний"
              : "Південний"
            : col < 4
              ? "Західний"
              : "Східний";
        out.push({
          id: `district-${col}-${row}`,
          name: `${direction} квартал ${col + 1}·${row + 1}`,
          x: (xs[col] + xs[col + 1]) / 2,
          z: (zs[row] + zs[row + 1]) / 2,
          w: xs[col + 1] - xs[col],
          h: zs[row + 1] - zs[row],
          cost: 6 + depth * 2,
          depth,
        });
      }
    const all = [...original, ...out];
    for (const l of out)
      l.requires = all
        .filter(
          (b) =>
            b !== l &&
            ((Math.abs(Math.abs(l.x - b.x) - (l.w + b.w) / 2) < 0.01 &&
              Math.abs(l.z - b.z) < (l.h + b.h) / 2 - 0.01) ||
              (Math.abs(Math.abs(l.z - b.z) - (l.h + b.h) / 2) < 0.01 &&
                Math.abs(l.x - b.x) < (l.w + b.w) / 2 - 0.01)),
        )
        .map((b) => b.id);
    return out.sort((a, b) => a.depth - b.depth || a.z - b.z || a.x - b.x);
  }
  const api = { groups, items, lands, bounds, districts, groupFor, inGroup };
  root.ParkCatalog = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
