const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

function profile({ userAgent, platform, width, height, cores, memory }) {
  const window = {};
  const context = {
    window,
    navigator: {
      userAgent,
      platform,
      maxTouchPoints: 5,
      hardwareConcurrency: cores,
      deviceMemory: memory,
    },
    screen: { width, height },
    document: { documentElement: { classList: { toggle() {} } } },
    Promise,
    Array,
    Number,
    String,
    isFinite,
  };
  vm.runInNewContext(fs.readFileSync("compatibility.js", "utf8"), context);
  return window.EmiliaCompatibility;
}

const iphone = profile({
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  platform: "iPhone",
  width: 390,
  height: 844,
  cores: 4,
});
assert(iphone.mobileSafari);
assert(iphone.lowPower, "scene complexity may still be reduced");
assert(iphone.antialias, "Safari keeps MSAA even on the reduced scene");
assert.equal(iphone.pixelRatioCap, 2);

const ipad = profile({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  platform: "MacIntel",
  width: 1024,
  height: 1366,
  cores: 8,
});
assert(ipad.mobileSafari);
assert.equal(ipad.pixelRatioCap, 1.5);

const android = profile({
  userAgent: "Mozilla/5.0 (Linux; Android 8.0) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
  platform: "Linux armv8l",
  width: 360,
  height: 640,
  cores: 4,
  memory: 4,
});
assert(!android.mobileSafari);
assert.equal(android.antialias, false);
assert.equal(android.pixelRatioCap, 1.25);

console.log("PASS iPhone Safari uses a 2x antialiased canvas, iPad stays bounded, and low-end Android keeps its lighter profile");
