const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "models", "cube-pets.json");
const binPath = path.join(root, "models", "cube-pets.bin");
const objFolder = path.join(
  root,
  "tools",
  "imports",
  "kenney",
  "Models",
  "OBJ format",
);
const manifest = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const source = fs.readFileSync(binPath);
const chunks = [];
let byteLength = 0;

function align() {
  const padding = (4 - (byteLength % 4)) % 4;
  if (padding) {
    chunks.push(Buffer.alloc(padding));
    byteLength += padding;
  }
}
function pack(array) {
  align();
  const offset = byteLength;
  const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
  chunks.push(bytes);
  byteLength += bytes.length;
  return { offset, count: array.length };
}
function floats(ref) {
  return new Float32Array(
    source.buffer,
    source.byteOffset + ref.offset,
    ref.count,
  ).slice();
}
function uints(ref) {
  return new Uint32Array(
    source.buffer,
    source.byteOffset + ref.offset,
    ref.count,
  ).slice();
}
function key(x, y, z) {
  return [x, y, z].map((value) => Math.round(value * 10000)).join(",");
}
function boneFor(group) {
  const name = group.toLowerCase().replaceAll("_", "-");
  if (name.includes("leg")) {
    const left = name.includes("left"),
      back = name.includes("back") || name.includes("rear");
    if (back) return left ? 5 : 6;
    return left ? 3 : 4;
  }
  if (/tail|stinger/.test(name)) return 2;
  if (/head|face|eye|ear|nose|snout|mouth|beak|horn|antler|mane/.test(name))
    return 1;
  return 0;
}
function objRig(kind) {
  const lines = fs
    .readFileSync(path.join(objFolder, `animal-${kind}.obj`), "utf8")
    .split(/\r?\n/);
  let group = "body";
  const vertices = [];
  for (const line of lines) {
    if (line.startsWith("g ")) group = line.slice(2).trim();
    else if (line.startsWith("v ")) {
      const [x, y, z] = line.slice(2).trim().split(/\s+/).slice(0, 3).map(Number);
      vertices.push({ x, y, z, bone: boneFor(group) });
    }
  }
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of vertices) {
    for (const [axis, value] of [vertex.x, vertex.y, vertex.z].entries()) {
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  const scale = 1.48 / Math.max(0.001, max[1] - min[1]),
    cx = (min[0] + max[0]) / 2,
    cz = (min[2] + max[2]) / 2,
    lookup = new Map(),
    regions = Array.from({ length: 7 }, () => []);
  for (const vertex of vertices) {
    const point = [
      (vertex.x - cx) * scale,
      (vertex.y - min[1]) * scale,
      (vertex.z - cz) * scale,
    ];
    const id = key(...point),
      previous = lookup.get(id) || 0;
    if (vertex.bone > previous) lookup.set(id, vertex.bone);
    regions[vertex.bone].push(point);
  }
  const pivots = {};
  for (let bone = 1; bone < regions.length; bone++) {
    if (!regions[bone].length) continue;
    const low = [Infinity, Infinity, Infinity],
      high = [-Infinity, -Infinity, -Infinity];
    for (const point of regions[bone])
      for (let axis = 0; axis < 3; axis++) {
        low[axis] = Math.min(low[axis], point[axis]);
        high[axis] = Math.max(high[axis], point[axis]);
      }
    pivots[bone] = [
      (low[0] + high[0]) / 2,
      bone >= 3 ? high[1] : bone === 1 ? low[1] : (low[1] + high[1]) / 2,
      (low[2] + high[2]) / 2,
    ];
  }
  return { lookup, pivots };
}
function richerColors(colors, stage) {
  if (stage === 2) return colors;
  const saturation = stage === 1 ? 1.3 : 1.72,
    contrast = stage === 1 ? 1.12 : 1.1,
    gamma = stage === 1 ? 1.045 : 1.1;
  for (let i = 0; i < colors.length; i += 3) {
    const r = colors[i],
      g = colors[i + 1],
      b = colors[i + 2],
      light = r * 0.2126 + g * 0.7152 + b * 0.0722;
    for (let axis = 0; axis < 3; axis++) {
      const saturated = light + (colors[i + axis] - light) * saturation,
        contrasted = 0.5 + (saturated - 0.5) * contrast;
      colors[i + axis] = Math.min(
        1,
        Math.max(0, Math.pow(Math.max(0, contrasted), gamma)),
      );
    }
  }
  return colors;
}

const names = ["body", "head", "tail", "legL", "legR", "backL", "backR"];
const gradeStage =
  manifest.colorGradeVersion === 2
    ? 2
    : manifest.meshes.every((part) => part.skinIndex)
      ? 1
      : 0;
for (const part of manifest.meshes) {
  const kind = part.model.slice("cube-".length),
    rig = objRig(kind),
    positions = floats(part.position),
    normals = floats(part.normal),
    colors = richerColors(floats(part.color), gradeStage),
    indices = uints(part.index),
    vertexCount = positions.length / 3,
    skinIndices = new Uint16Array(vertexCount * 4),
    skinWeights = new Float32Array(vertexCount * 4),
    counts = Array(7).fill(0);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    const bone = rig.lookup.get(
      key(
        positions[vertex * 3],
        positions[vertex * 3 + 1],
        positions[vertex * 3 + 2],
      ),
    ) || 0;
    skinIndices[vertex * 4] = bone;
    skinWeights[vertex * 4] = 1;
    counts[bone]++;
  }
  part.position = pack(positions);
  part.normal = pack(normals);
  part.color = pack(colors);
  part.skinIndex = pack(skinIndices);
  part.skinWeight = pack(skinWeights);
  part.index = pack(indices);
  const pivots = manifest.pivots[part.model];
  for (let bone = 1; bone < names.length; bone++)
    if (rig.pivots[bone]) pivots[names[bone]] = rig.pivots[bone];
  manifest.materials[part.material].roughness = 0.68;
  console.log(`${part.model}: ${counts.slice(1).join("/")} articulated vertices`);
}

manifest.colorGradeVersion = 2;

fs.writeFileSync(binPath, Buffer.concat(chunks, byteLength));
fs.writeFileSync(jsonPath, JSON.stringify(manifest));
console.log(`CUBE PET RIG COMPLETE: ${byteLength} runtime bytes`);
