const fs = require("node:fs");
const Core = require("../core.js");
const Content = require("../learning-content.js");
const voice = require("../voice-pack.js");
const speech = require("../speech-manifest.js");

const hex = (text) =>
  [...text]
    .map((letter) => letter.codePointAt(0).toString(16).toUpperCase())
    .join("-");
const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [["type", "text", "stable_id", "suggested_file", "recorded_now"]];

for (const text of Core.LETTERS)
  rows.push([
    "letter",
    text,
    "letter:" + text,
    `audio/future/letters/${hex(text)}.mp3`,
    voice.letters[text] ? "yes" : "no",
  ]);
for (const text of Content.FAMILIES.flat())
  rows.push([
    "syllable",
    text,
    "syllable:" + text,
    `audio/future/syllables/${hex(text)}.mp3`,
    voice.syllables[text] ? "yes" : "no",
  ]);
for (const word of Content.WORDS)
  rows.push([
    "word",
    word.text,
    "word:" + word.text,
    `audio/future/words/${hex(word.text)}.mp3`,
    speech.words[word.text]?.ready ? "yes" : "no",
  ]);

fs.writeFileSync(
  "audio/RECORDING-PLAN.csv",
  "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\n") + "\n",
);
console.log(`Wrote ${rows.length - 1} stable recording rows`);
