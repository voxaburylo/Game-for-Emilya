// Builds the bundled "teacher" voice pack (letters, syllables, prompts) offline.
// Needs tools/ (gitignored): Piper 2023.11.14-2 Windows build in tools/piper/piper,
// uk_UA-tetiana-high model in tools/voice, lamejs in tools/enc/node_modules.
// Usage: node build-voice.cjs
"use strict";
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto"),
  { spawnSync } = require("child_process");
const root = __dirname,
  tools = path.join(root, "tools"),
  gen = path.join(tools, "gen"),
  out = path.join(root, "audio", "voice"),
  // The CommonJS entry of lamejs 1.2.1 is broken under Node; the bundle works.
  lame = new Function(
    fs.readFileSync(path.join(tools, "enc", "node_modules", "lamejs", "lame.all.js"), "utf8") +
      ";return lamejs;",
  )();

const LETTER_NAMES = {
  А: "а", Б: "бе", В: "ве", Г: "ге", Ґ: "ґе", Д: "де", Е: "е", Є: "є",
  Ж: "же", З: "зе", И: "и", І: "і", Ї: "ї", Й: "йот", К: "ка", Л: "ел",
  М: "ем", Н: "ен", О: "о", П: "пе", Р: "ер", С: "ес", Т: "те", У: "у",
  Ф: "еф", Х: "ха", Ц: "це", Ч: "че", Ш: "ша", Щ: "ща", Ю: "ю", Я: "я",
};
// Gender-neutral wording: the game is for every child.
const PHRASES = {
  "task-letters": "Знайди таку саму літеру.",
  "task-hear": "Послухай і знайди літеру.",
  "task-pairs": "Знайди дві однакові літери.",
  "task-discover": "Послухай склад.",
  "task-blend": "Склади літери разом.",
  "task-hear-syllable": "Послухай і знайди склад.",
  "task-words": "Збери слово.",
  "praise-1": "Молодець!",
  "praise-2": "Чудово!",
  "praise-3": "Правильно!",
  "praise-4": "Так тримати!",
  "try-again": "Спробуй ще раз.",
  hint: "Подивись на картку, що рухається.",
  "second-part": "А тепер друга частинка.",
  "soft-sign": "М'який знак не має свого звуку.",
  reward: "Ура! Ось кристали для твого острова.",
  welcome: "Привіт! Давай грати.",
};
const code = (t) =>
  [...t].map((c) => c.codePointAt(0).toString(16).padStart(4, "0")).join("-");
const items = [
  ...Object.entries(LETTER_NAMES).map(([l, text]) => ({
    kind: "letters", key: l, text, id: "l-" + code(l),
  })),
  ...["М", "С", "Н", "Л", "Р", "Т"].flatMap((c) =>
    [..."АОУІИ"].map((v) => ({
      kind: "syllables", key: c + v, text: (c + v).toLowerCase() + ".",
      id: "s-" + code(c + v),
    })),
  ),
  ...Object.entries(PHRASES).map(([key, text]) => ({
    kind: "phrases", key, text, id: "p-" + key,
  })),
];

// eSpeak's Ukrainian dictionary misplaces stress in these words; the model
// itself follows whatever stress mark it is given, so we correct the phonemes.
const STRESS_FIX = {
  "znˈajdɪ": "znajdˈɪ", "molˈodɛts": "molodˈɛts", "praβˈɪʎno": "prˈaβɪʎno",
  "ˈura": "urˈa", "dˈaβaj": "daβˈaj", "sklˈadɪ": "skladˈɪ", "zbˈɛrɪ": "zbɛrˈɪ",
  "podˈɪβɪs": "podɪβˈɪs", "ruxˈajɛtsja": "rˈuxajɛtsja", "d̪βˈoho": "t̪βohˈo",
  "zβˈoho": "sβohˈo", "ʎiːt̪ˈɛru": "ʎˈiːt̪ɛru", "ʎiːt̪ˈɛrɪ": "ʎˈiːt̪ɛrɪ",
  "mjˈakɪj": "mjakˈɪj", "ost̪rˈoβa": "ˈost̪roβa",
};
const fixWord = (w) => {
  const m = /^(.*?)([!.,?]*)$/.exec(w);
  return (STRESS_FIX[m[1]] ?? m[1]) + m[2];
};

fs.mkdirSync(gen, { recursive: true });
fs.mkdirSync(out, { recursive: true });

// 1. Phonemize every text with Piper's own eSpeak (read from its debug log).
const log = spawnSync(
  path.join(tools, "piper", "piper", "piper.exe"),
  ["-m", path.join(tools, "voice", "tetiana.onnx"), "--json-input", "--debug"],
  {
    input: items
      .map((i) => JSON.stringify({ text: i.text, output_file: path.join(gen, "_probe.wav") }))
      .join("\n") + "\n",
    stdio: ["pipe", "ignore", "pipe"],
    encoding: "utf8",
    maxBuffer: 1 << 26,
  },
).stderr;
const phon = [];
for (const line of log.split(/\r?\n/)) {
  if (/Phonemizing text: /.test(line)) phon.push([]);
  const m = / to ids: (.*)$/.exec(line);
  if (m) phon[phon.length - 1].push(m[1].trim());
}
if (phon.length !== items.length) throw Error("phoneme count " + phon.length);
items.forEach((it, n) => {
  it.phonemes = phon[n].join(" ").split(" ").filter(Boolean).map(fixWord).join(" ");
});

// 2. Run the model directly on the corrected phonemes (same id layout as Piper).
const ort = require(path.join(tools, "enc", "node_modules", "onnxruntime-node")),
  config = require(path.join(tools, "voice", "tetiana.onnx.json")),
  idMap = config.phoneme_id_map;
async function synth(phonemes) {
  const ids = [...idMap["^"], ...idMap["_"]];
  for (const ch of phonemes) {
    if (!idMap[ch]) throw Error("unknown phoneme " + ch + " in " + phonemes);
    ids.push(...idMap[ch], ...idMap["_"]);
  }
  ids.push(...idMap["$"]);
  const res = await session.run({
    input: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor("float32", Float32Array.from([0.667, 1.12, 0.8]), [3]),
  });
  const f = res.output.data, samples = new Int16Array(f.length);
  let peak = 0.01;
  for (const v of f) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < f.length; i++) samples[i] = Math.round((f[i] / peak) * 29000);
  return { rate: config.audio.sample_rate, samples };
}
let session;
function trim({ rate, samples }) {
  const loud = (i) => Math.abs(samples[i]) > 400, pad = Math.round(rate * 0.06);
  let a = 0, z = samples.length - 1;
  while (a < z && !loud(a)) a++;
  while (z > a && !loud(z)) z--;
  return samples.subarray(Math.max(0, a - pad), Math.min(samples.length, z + pad));
}
function mp3(samples, rate) {
  const enc = new lame.Mp3Encoder(1, rate, 64), parts = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const chunk = enc.encodeBuffer(samples.subarray(i, i + 1152));
    if (chunk.length) parts.push(Buffer.from(chunk));
  }
  parts.push(Buffer.from(enc.flush()));
  return Buffer.concat(parts);
}

const pack = {
  version: 1,
  speaker: "Tetiana (uk_UA-tetiana-high, synthetic)",
  gender: "female",
  source: "https://huggingface.co/RomanStasyshyn/uk_UA-tetiana-high",
  license: "Apache-2.0 (model and dataset); Piper engine MIT",
  letters: {}, syllables: {}, phrases: {},
};
(async () => {
session = await ort.InferenceSession.create(path.join(tools, "voice", "tetiana.onnx"));
for (const i of items) {
  const w = await synth(i.phonemes), s = trim(w), bytes = mp3(s, w.rate),
    file = "audio/voice/" + i.id + ".mp3";
  fs.writeFileSync(path.join(root, file), bytes);
  pack[i.kind][i.key] = {
    file, text: i.text, phonemes: i.phonemes,
    seconds: +(s.length / w.rate).toFixed(3), bytes: bytes.length,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  };
}
fs.writeFileSync(
  path.join(root, "voice-pack.js"),
  "// Generated by build-voice.cjs. Replace this file and audio/voice/ to change the voice.\n" +
    "(function (root) {\n\"use strict\";\nconst pack = " + JSON.stringify(pack, null, 1) +
    ";\nif (typeof module !== \"undefined\") module.exports = pack;\nroot.VoicePack = pack;\n" +
    "})(typeof window !== \"undefined\" ? window : globalThis);\n",
);
console.log("voice pack:", items.length, "recordings");
for (const k of ["letters", "syllables", "phrases"])
  for (const [key, v] of Object.entries(pack[k]))
    if (v.seconds < 0.15 || v.seconds > 6) console.log("CHECK LENGTH", k, key, v.seconds);
})();
