const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "models", "characters.json");
const binPath = path.join(root, "models", "characters.bin");
const manifest = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const removed = manifest.meshes.filter((mesh) => mesh.model === "shiba");
if (removed.length) {
  const firstOffset = Math.min(
    ...removed.flatMap((mesh) =>
      ["position", "normal", "color", "skinIndex", "skinWeight", "index"]
        .filter((name) => mesh[name])
        .map((name) => mesh[name].offset),
    ),
  );
  const laterAsset = manifest.meshes.some(
    (mesh) =>
      mesh.model !== "shiba" &&
      ["position", "normal", "color", "skinIndex", "skinWeight", "index"]
        .filter((name) => mesh[name])
        .some((name) => mesh[name].offset >= firstOffset),
  );
  if (laterAsset) throw Error("Shiba is not the final binary asset");
  manifest.meshes = manifest.meshes.filter((mesh) => mesh.model !== "shiba");
  delete manifest.pivots.shiba;
  delete manifest.materials.shibaFur;
  fs.writeFileSync(binPath, fs.readFileSync(binPath).subarray(0, firstOffset));
  fs.writeFileSync(jsonPath, JSON.stringify(manifest));
}
for (const file of [
  path.join(root, "models", "thumbs", "shiba-0.png"),
  path.join(root, "models", "licenses", "shiba.txt"),
]) {
  if (fs.existsSync(file)) {
    fs.chmodSync(file, 0o666);
    fs.unlinkSync(file);
  }
}
const appPath = path.join(root, "town-app.js"),
  app = fs
    .readFileSync(appPath, "utf8")
    .replace(
      '3D-моделі Shiba та фруктів — CC BY 4.0, дозволені для комерційного використання з атрибуцією: <a href="models/licenses/shiba.txt" target="_blank" rel="noopener">Shiba</a> · <a href="models/party-fruit/CREDITS.txt" target="_blank" rel="noopener">фрукти</a>.',
      '3D-моделі фруктів — CC BY 4.0, дозволені для комерційного використання з атрибуцією: <a href="models/party-fruit/CREDITS.txt" target="_blank" rel="noopener">автори моделей</a>.',
    );
fs.writeFileSync(appPath, app);
console.log(`SHIBA REMOVED: ${removed.length} mesh batch`);
