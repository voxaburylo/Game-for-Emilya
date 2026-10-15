const assert = require("node:assert/strict"),
  vm = require("node:vm"),
  fs = require("node:fs");
const context = {
  window: { SpeechLibrary: require("./speech-manifest.js") },
  setTimeout,
  clearTimeout,
};
vm.runInNewContext(
  fs.readFileSync(__dirname + "/human-audio.js", "utf8"),
  context,
);
const Audio = context.window.HumanAudio;
(async () => {
  const el = {
    src: "",
    pause() {},
    load() {},
    removeAttribute() {
      this.src = "";
    },
    play() {
      return Promise.resolve();
    },
  };
  let status = "";
  const a = new Audio(el, (s) => (status = s));
  for (const l of require("./core.js").LETTERS.filter((l) => l !== "Ь"))
    assert(a.entry("letter", l));
  assert(!a.entry("letter", "Ь"));
  let p = a.play("letter", "А");
  assert.equal(el.src, "audio/410.mp3");
  el.onended();
  assert.equal(await p, true);
  p = a.play("syllable", "МА");
  assert.equal(el.src, context.window.SpeechLibrary.syllables.МА.file);
  a.stop();
  assert.equal(await p, false);
  assert.equal(el.src, "");
  p = a.play("syllable", "МО");
  const stale = el.onended,
    next = a.play("word", "МАМА");
  assert.equal(await p, false);
  stale();
  assert.equal(status, "Слухаємо…");
  el.onended();
  assert.equal(await next, true);
  p = a.play("letter", "О");
  el.onerror();
  assert.equal(await p, false);
  assert(status.includes("Не вдалося"));
  assert.equal(await a.play("letter", "Ь"), false);
  a.enabled = false;
  assert.equal(await a.play("word", "НОРА"), false);
  a.enabled = true;
  el.play = () => Promise.reject(Error("autoplay"));
  assert.equal(await a.play("letter", "У"), false);
  assert(status.includes("Не вдалося"));
  console.log(
    "PASS human audio: all letter mappings, whole syllable/word playback, ended/error, cancellation, stale callbacks, mute, soft sign and autoplay rejection",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
