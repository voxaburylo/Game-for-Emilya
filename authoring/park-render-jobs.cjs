const fs = require("node:fs");
global.window = global;
global.THREE = require("../three.min.js");
global.ParkCatalog = require("../park-catalog.js");
const P = require("../park-assets.js"),
  bytes = fs.readFileSync("models/park/park.bin"),
  data = JSON.parse(fs.readFileSync("models/park/park.json", "utf8"));
P.install(
  data,
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
);
const jobs = [];
for (const item of ParkCatalog.items) {
  const g = P.create(item.id);
  g.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(g),
    parts = [];
  g.traverse((o) => {
    if (o.userData.parkPart !== undefined)
      parts.push({
        part: o.userData.parkPart,
        matrix: o.matrixWorld.toArray(),
      });
  });
  jobs.push({
    id: item.id,
    parts,
    min: bounds.min.toArray(),
    max: bounds.max.toArray(),
  });
}
fs.writeFileSync("tools/park-render-jobs.json", JSON.stringify(jobs));
console.log(jobs.length + " thumbnail jobs");
