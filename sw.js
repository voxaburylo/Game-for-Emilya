"use strict";
const CACHE = "emilia-living-v4-4";
const ASSETS = [
  "./",
  "index.html",
  "town.css",
  "core.js",
  "navigation.js",
  "town-state.js",
  "art.js",
  "speech-manifest.js",
  "voice-pack.js",
  "human-audio.js",
  "town-world.js",
  "town-app.js",
  "three.min.js",
  "icon.svg",
  "manifest.webmanifest",
  "audio/CREDITS.txt",
  "audio/speech/CREDITS.txt",
  "audio/voice/CREDITS.txt",
  "audio/410.mp3",
  "audio/41e.mp3",
  "audio/423.mp3",
  "audio/41c.mp3",
  "audio/421.mp3",
  "audio/406.mp3",
  "audio/41d.mp3",
  "audio/41b.mp3",
  "audio/418.mp3",
  "audio/420.mp3",
  "audio/422.mp3",
  "audio/415.mp3",
  "audio/41a.mp3",
  "audio/411.mp3",
  "audio/412.mp3",
  "audio/414.mp3",
  "audio/41f.mp3",
  "audio/417.mp3",
  "audio/42f.mp3",
  "audio/42e.mp3",
  "audio/404.mp3",
  "audio/407.mp3",
  "audio/413.mp3",
  "audio/490.mp3",
  "audio/416.mp3",
  "audio/419.mp3",
  "audio/424.mp3",
  "audio/425.mp3",
  "audio/426.mp3",
  "audio/427.mp3",
  "audio/428.mp3",
  "audio/429.mp3",
  "audio/speech/ukr-265a50e4.mp3",
  "audio/speech/ukr-635d0c8d.mp3",
  "audio/speech/ukr-85339f5c.mp3",
  "audio/speech/ukr-aad09ea0.mp3",
  "audio/speech/ukr-84f1f56b.mp3",
  "audio/speech/ukr-17d1e593.mp3",
  "audio/speech/ukr-c1b3af6a.mp3",
  "audio/speech/ukr-f4dd20a7.mp3",
  "audio/speech/ukr-167bc9ac.mp3",
  "audio/voice/l-0404.mp3",
  "audio/voice/l-0406.mp3",
  "audio/voice/l-0407.mp3",
  "audio/voice/l-0410.mp3",
  "audio/voice/l-0411.mp3",
  "audio/voice/l-0412.mp3",
  "audio/voice/l-0413.mp3",
  "audio/voice/l-0414.mp3",
  "audio/voice/l-0415.mp3",
  "audio/voice/l-0416.mp3",
  "audio/voice/l-0417.mp3",
  "audio/voice/l-0418.mp3",
  "audio/voice/l-0419.mp3",
  "audio/voice/l-041a.mp3",
  "audio/voice/l-041b.mp3",
  "audio/voice/l-041c.mp3",
  "audio/voice/l-041d.mp3",
  "audio/voice/l-041e.mp3",
  "audio/voice/l-041f.mp3",
  "audio/voice/l-0420.mp3",
  "audio/voice/l-0421.mp3",
  "audio/voice/l-0422.mp3",
  "audio/voice/l-0423.mp3",
  "audio/voice/l-0424.mp3",
  "audio/voice/l-0425.mp3",
  "audio/voice/l-0426.mp3",
  "audio/voice/l-0427.mp3",
  "audio/voice/l-0428.mp3",
  "audio/voice/l-0429.mp3",
  "audio/voice/l-042e.mp3",
  "audio/voice/l-042f.mp3",
  "audio/voice/l-0490.mp3",
  "audio/voice/p-hint.mp3",
  "audio/voice/p-praise-1.mp3",
  "audio/voice/p-praise-2.mp3",
  "audio/voice/p-praise-3.mp3",
  "audio/voice/p-praise-4.mp3",
  "audio/voice/p-reward.mp3",
  "audio/voice/p-second-part.mp3",
  "audio/voice/p-soft-sign.mp3",
  "audio/voice/p-task-blend.mp3",
  "audio/voice/p-task-discover.mp3",
  "audio/voice/p-task-hear-syllable.mp3",
  "audio/voice/p-task-hear.mp3",
  "audio/voice/p-task-letters.mp3",
  "audio/voice/p-task-pairs.mp3",
  "audio/voice/p-task-words.mp3",
  "audio/voice/p-try-again.mp3",
  "audio/voice/p-welcome.mp3",
  "audio/voice/s-041b-0406.mp3",
  "audio/voice/s-041b-0410.mp3",
  "audio/voice/s-041b-0418.mp3",
  "audio/voice/s-041b-041e.mp3",
  "audio/voice/s-041b-0423.mp3",
  "audio/voice/s-041c-0406.mp3",
  "audio/voice/s-041c-0410.mp3",
  "audio/voice/s-041c-0418.mp3",
  "audio/voice/s-041c-041e.mp3",
  "audio/voice/s-041c-0423.mp3",
  "audio/voice/s-041d-0406.mp3",
  "audio/voice/s-041d-0410.mp3",
  "audio/voice/s-041d-0418.mp3",
  "audio/voice/s-041d-041e.mp3",
  "audio/voice/s-041d-0423.mp3",
  "audio/voice/s-0420-0406.mp3",
  "audio/voice/s-0420-0410.mp3",
  "audio/voice/s-0420-0418.mp3",
  "audio/voice/s-0420-041e.mp3",
  "audio/voice/s-0420-0423.mp3",
  "audio/voice/s-0421-0406.mp3",
  "audio/voice/s-0421-0410.mp3",
  "audio/voice/s-0421-0418.mp3",
  "audio/voice/s-0421-041e.mp3",
  "audio/voice/s-0421-0423.mp3",
  "audio/voice/s-0422-0406.mp3",
  "audio/voice/s-0422-0410.mp3",
  "audio/voice/s-0422-0418.mp3",
  "audio/voice/s-0422-041e.mp3",
  "audio/voice/s-0422-0423.mp3",
];
async function rangeResponse(request, cached) {
  const range = request.headers.get("range");
  if (!range) return cached;
  const bytes = await cached.arrayBuffer(),
    size = bytes.byteLength,
    m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m || (!m[1] && !m[2]))
    return new Response("", {
      status: 416,
      headers: { "Content-Range": "bytes */" + size },
    });
  let start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2])),
    end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start > end ||
    start >= size
  )
    return new Response("", {
      status: 416,
      headers: { "Content-Range": "bytes */" + size },
    });
  return new Response(bytes.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type":
        cached.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": "bytes " + start + "-" + end + "/" + size,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
    },
  });
}
if (typeof self !== "undefined" && self.addEventListener) {
  self.addEventListener("install", (e) =>
    e.waitUntil(
      caches
        .open(CACHE)
        .then((c) => c.addAll(ASSETS))
        .then(() => self.skipWaiting()),
    ),
  );
  self.addEventListener("activate", (e) =>
    e.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => /^(bukvomisto|emilia-)/.test(k) && k !== CACHE)
              .map((k) => caches.delete(k)),
          ),
        )
        .then(() => self.clients.claim()),
    ),
  );
  self.addEventListener("fetch", (e) => {
    if (
      e.request.method !== "GET" ||
      new URL(e.request.url).origin !== self.location.origin
    )
      return;
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE),
          cached = await cache.match(e.request.url);
        if (cached && /\.(mp3|ogg)(\?|$)/.test(e.request.url))
          return rangeResponse(e.request, cached);
        try {
          const response = await fetch(e.request);
          if (response.ok) return response;
          if (cached) return rangeResponse(e.request, cached);
          return response;
        } catch (error) {
          return cached
            ? rangeResponse(e.request, cached)
            : new Response("Offline", { status: 503 });
        }
      })(),
    );
  });
}
if (typeof module !== "undefined")
  module.exports = { rangeResponse, FILES: ASSETS, CACHE };
