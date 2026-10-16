(function (root) {
  "use strict";
  const groups = [
    { id: "garden", name: "Сад", icon: "flowers" },
    { id: "park", name: "Парк", icon: "bench" },
    { id: "picnic", name: "Пікнік", icon: "home" },
    { id: "fences", name: "Огорожі", icon: "build" },
    { id: "classic", name: "Будівлі й ігри", icon: "home" },
  ];
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
  const api = { groups, items, lands, bounds, districts };
  root.ParkCatalog = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
