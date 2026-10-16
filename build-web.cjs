const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const output = path.resolve(root, process.argv[2] || "dist");
if (output === root || !output.startsWith(root + path.sep)) {
  throw new Error("Папка веб-збірки має бути всередині репозиторію.");
}

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const topLevelExtensions = new Set([".html", ".js", ".css", ".png", ".svg", ".webmanifest"]);
for (const name of fs.readdirSync(root)) {
  const source = path.join(root, name);
  if (!fs.statSync(source).isFile() || !topLevelExtensions.has(path.extname(name).toLowerCase())) continue;
  fs.copyFileSync(source, path.join(output, name));
}

copyTree(path.join(root, "audio"), path.join(output, "audio"));
fs.rmSync(path.join(output, "audio", "originals"), { recursive: true, force: true });

const modelOutput = path.join(output, "models");
fs.mkdirSync(modelOutput, { recursive: true });
for (const file of ["characters.bin", "characters.json", "cube-pets.bin", "cube-pets.json"]) {
  fs.copyFileSync(path.join(root, "models", file), path.join(modelOutput, file));
}
for (const directory of ["licenses", "park", "party-fruit", "thumbs", "ui"]) {
  copyTree(path.join(root, "models", directory), path.join(modelOutput, directory));
}
copyTree(path.join(root, "vendor"), path.join(output, "vendor"));

const serviceWorker = fs.readFileSync(path.join(output, "sw.js"), "utf8");
const assetBlock = serviceWorker.match(/const ASSETS\s*=\s*(\[[\s\S]*?\]);/);
if (!assetBlock) throw new Error("Не вдалося прочитати список офлайн-ресурсів із sw.js.");
const offlineAssets = vm.runInNewContext(assetBlock[1]);
const missing = offlineAssets.filter((asset) => !fs.existsSync(path.join(output, asset)));
if (missing.length) throw new Error(`У веб-збірці відсутні ресурси:\n${missing.join("\n")}`);

let files = 0;
let bytes = 0;
function measure(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) measure(file);
    else {
      files += 1;
      bytes += fs.statSync(file).size;
    }
  }
}
measure(output);
console.log(`Web-збірка готова: ${path.relative(root, output)} (${files} файлів, ${(bytes / 1048576).toFixed(1)} МБ)`);
console.log(`Перевірено ${offlineAssets.length} офлайн-ресурсів.`);
