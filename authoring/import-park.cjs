// Convert the author's static glTF assets into one small shared mesh library.
// Sources are CC0; no character files are read or modified.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const T = require("../three.min.js");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "models/park");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(out, "licenses"), { recursive: true });
const sources = [
  [
    "pretty-park",
    "tiny_treats_pretty_park_set",
    "",
    [
      "bench",
      "bush",
      "bush_large",
      "flower_A",
      "flower_B",
      "hedge_straight",
      "hedge_straight_long",
      "hedge_corner",
      "tree",
      "tree_large",
      "street_lantern",
      "fountain",
    ],
  ],
  [
    "homely-house",
    "tiny_treats_homely_house_set",
    "home_",
    [
      "bench_A",
      "bench_B",
      "foliage_A",
      "foliage_B",
      "fence_straight",
      "fence_rails",
      "fence_corner",
      "gate_single",
      "mailbox",
    ],
  ],
  [
    "pleasant-picnic",
    "tiny_treats_pleasant_picnic_set",
    "picnic_",
    [
      "picnic_blanket_red",
      "picnic_blanket_blue",
      "picnic_blanket_green",
      "picnic_basket_round",
      "teapot",
      "mug",
      "apple",
      "sandwich",
    ],
  ],
];
const output = { version: 1, models: {}, materials: [], sources: [] },
  chunks = [];
let offset = 0;
function write(array) {
  const b = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  const a = { offset, count: array.length };
  chunks.push(b);
  offset += b.length;
  return a;
}
const mats = new Map();
for (const [pack, folder, prefix, names] of sources) {
  const repo = path.join(root, "tools/assets-" + pack),
    dir = path.join(repo, "addons", folder, "Assets/gltf");
  const license = fs.readFileSync(path.join(repo, "LICENSE.txt"), "utf8");
  if (!/CC0/.test(license) || !/commercial/.test(license))
    throw Error("Unverified license: " + pack);
  fs.writeFileSync(path.join(out, "licenses", pack + ".txt"), license);
  output.sources.push({
    pack,
    author: "Isa Lousberg / Tiny Treats",
    license: "CC0-1.0",
    url: "https://tinytreats.itch.io/" + pack,
  });
  for (const name of names) {
    const g = JSON.parse(
      fs.readFileSync(path.join(dir, name + ".gltf"), "utf8"),
    );
    const buffers = g.buffers.map((b) =>
      fs.readFileSync(path.join(dir, b.uri)),
    );
    function access(id) {
      const a = g.accessors[id],
        v = g.bufferViews[a.bufferView],
        buf = buffers[v.buffer],
        n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type],
        bytes = { 5126: 4, 5125: 4, 5123: 2 }[a.componentType];
      if (!n || !bytes || a.sparse) throw Error("unsupported accessor");
      const result = [];
      for (let i = 0; i < a.count; i++)
        for (let j = 0; j < n; j++) {
          const o =
            (v.byteOffset || 0) +
            (a.byteOffset || 0) +
            i * (v.byteStride || n * bytes) +
            j * bytes;
          result.push(
            a.componentType === 5126
              ? buf.readFloatLE(o)
              : bytes === 2
                ? buf.readUInt16LE(o)
                : buf.readUInt32LE(o),
          );
        }
      return result;
    }
    const parts = [],
      box = new T.Box3();
    function visit(id, parent) {
      const node = g.nodes[id],
        local = new T.Matrix4();
      if (node.matrix) local.fromArray(node.matrix);
      else
        local.compose(
          new T.Vector3().fromArray(node.translation || [0, 0, 0]),
          new T.Quaternion().fromArray(node.rotation || [0, 0, 0, 1]),
          new T.Vector3().fromArray(node.scale || [1, 1, 1]),
        );
      const mat = parent.clone().multiply(local),
        normalMat = new T.Matrix3().getNormalMatrix(mat);
      if (node.mesh !== undefined)
        for (const p of g.meshes[node.mesh].primitives) {
          if (p.mode !== undefined && p.mode !== 4)
            throw Error("triangles required");
          const pos = access(p.attributes.POSITION),
            normal = access(p.attributes.NORMAL),
            uv = access(p.attributes.TEXCOORD_0),
            indices = access(p.indices);
          for (let i = 0; i < pos.length; i += 3) {
            const v = new T.Vector3().fromArray(pos, i).applyMatrix4(mat);
            v.toArray(pos, i);
            box.expandByPoint(v);
            new T.Vector3()
              .fromArray(normal, i)
              .applyMatrix3(normalMat)
              .normalize()
              .toArray(normal, i);
          }
          const sourceMat = g.materials[p.material],
            pbr = sourceMat.pbrMetallicRoughness || {},
            img = pbr.baseColorTexture
              ? g.images[g.textures[pbr.baseColorTexture.index].source]
              : null;
          let texture = null;
          if (img) {
            const bytes = fs.readFileSync(path.join(dir, img.uri)),
              hash = crypto
                .createHash("sha256")
                .update(bytes)
                .digest("hex")
                .slice(0, 12);
            texture = "atlas-" + hash + ".png";
            fs.writeFileSync(path.join(out, texture), bytes);
          }
          const def = {
              texture,
              color: pbr.baseColorFactor || [1, 1, 1, 1],
              roughness: Math.max(0.55, pbr.roughnessFactor ?? 0.8),
              metalness: pbr.metallicFactor || 0,
              doubleSide: !!sourceMat.doubleSided,
            },
            key = JSON.stringify(def);
          if (!mats.has(key)) {
            mats.set(key, output.materials.length);
            output.materials.push(def);
          }
          parts.push({
            position: write(new Float32Array(pos)),
            normal: write(new Float32Array(normal)),
            uv: write(new Float32Array(uv)),
            index: write(new Uint32Array(indices)),
            material: mats.get(key),
          });
        }
      for (const c of node.children || []) visit(c, mat);
    }
    for (const id of g.scenes[g.scene || 0].nodes) visit(id, new T.Matrix4());
    output.models[prefix + name] = {
      parts,
      min: box.min.toArray(),
      max: box.max.toArray(),
    };
  }
}
fs.writeFileSync(path.join(out, "park.bin"), Buffer.concat(chunks));
fs.writeFileSync(path.join(out, "park.json"), JSON.stringify(output));
fs.writeFileSync(
  path.join(out, "CREDITS.txt"),
  output.sources
    .map(
      (s) =>
        `${s.pack}\nAuthor: ${s.author}\nLicense: ${s.license}\n${s.url}\n`,
    )
    .join("\n") +
    "\nOriginal glTF meshes repacked for this game. Placement, scale and combined picnic/flower arrangements by this project. Original license notices are in licenses/.\n",
);
console.log(
  Object.keys(output.models).length +
    " models; " +
    offset +
    " geometry bytes; " +
    output.materials.length +
    " materials",
);
