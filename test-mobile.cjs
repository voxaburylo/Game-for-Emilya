"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const manifest = JSON.parse(read("manifest.webmanifest"));
assert.equal(manifest.display, "standalone");
assert.equal(manifest.orientation, "any");
for (const size of [192, 512]) {
  const icon = manifest.icons.find((entry) => entry.src === `icon-${size}.png`);
  assert(icon && icon.purpose.includes("maskable"), `maskable ${size}px icon`);
  const png = fs.readFileSync(path.join(root, icon.src));
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), size);
  assert.equal(png.readUInt32BE(20), size);
}

const index = read("index.html");
assert(index.includes("viewport-fit=cover"));
assert(index.includes("mobile-web-app-capable"));
assert(index.indexOf('src="compatibility.js"') < index.indexOf('src="three.min.js"'));

const css = read("town.css");
assert(css.includes("env(safe-area-inset-top"));
assert(css.includes("env(safe-area-inset-bottom"));
assert(css.includes("@media (max-width: 430px)"));
assert(css.includes(".learn-sections"));
assert(css.includes("touch-action: manipulation"));

const app = read("town-app.js");
for (const section of ["letters", "syllables", "listen", "words"])
  assert(app.includes(`id: "${section}"`), `learning section ${section}`);
for (const mode of [
  "letters", "pairs", "discover", "blend", "train",
  "hear", "hear-syllable", "sound-part", "words",
]) assert(app.includes(`"${mode}"`), `learning mode ${mode}`);

const world = read("town-world.js");
assert(world.includes("EmiliaCompatibility?.lowPower"));
assert(world.includes('addEventListener("webglcontextlost"'));
assert(world.includes("this.lowPower ? 1 : 1.5"));
assert(world.includes("this.lowPower && now - this.last < 30"));

const compat = read("compatibility.js");
new Function(compat);
for (const api of ["roundRect", "closest", "allSettled", "flatMap", "fromEntries"])
  assert(compat.includes(api), `compatibility fallback ${api}`);

const { FILES, CACHE } = require("./sw");
for (const file of ["compatibility.js", "icon-192.png", "icon-512.png"])
  assert(FILES.includes(file), `offline ${file}`);
assert.equal(CACHE, "emilia-living-v5-22-android-learning-menu");
assert(app.includes(CACHE));

const state = read("town-state.js");
assert(/version:\s*5/.test(state), "save remains version 5");
for (const field of ["items", "conf", "placed"])
  assert(state.includes(field), `save preserves ${field}`);

console.log("PASS: Android/PWA install assets, phone and tablet layout, learning menu, low-power renderer, compatibility fallbacks and v5 save contract.");
