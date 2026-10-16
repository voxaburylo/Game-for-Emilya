const fs = require("node:fs"),
  path = require("node:path"),
  root = path.resolve(__dirname, "..");

function files(dir) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { recursive: true })
    .filter((name) => fs.statSync(path.join(base, name)).isFile())
    .map((name) => (dir + "/" + name).replaceAll("\\", "/"))
    .sort();
}

const swPath = path.join(root, "sw.js"),
  original = fs.readFileSync(swPath, "utf8"),
  current = require(swPath).FILES,
  dynamic = [
    ...files("models/park"),
    ...files("models/ui"),
    ...files("models/thumbs"),
    ...files("models/party-fruit"),
    ...files("models/licenses"),
  ],
  assets = [
    ...current.filter(
      (name) =>
        ![
          "models/park/",
          "models/ui/",
          "models/thumbs/",
          "models/party-fruit/",
          "models/licenses/",
        ].some((prefix) => name.startsWith(prefix)),
    ),
    ...dynamic,
  ],
  block = `const ASSETS = ${JSON.stringify(assets, null, 2)};`;

fs.writeFileSync(
  swPath,
  original.replace(/const ASSETS = \[[\s\S]*?\n\];/, block),
);
console.log(`${assets.length} offline files (${dynamic.length} model files)`);
