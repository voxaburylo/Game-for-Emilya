const { execFileSync } = require("node:child_process");
const tests = [
  "test.cjs",
  "test-hearing.cjs",
  "test-human-audio.cjs",
  "test-living.cjs",
  "test-world.cjs",
  "test-characters.cjs",
  "test-navigation.cjs",
  "test-offline.cjs",
  "test-assets.cjs",
  "test-server.cjs",
];
for (const test of tests) {
  console.log("\n" + test);
  execFileSync(process.execPath, [test], {
    cwd: __dirname,
    stdio: "inherit",
    windowsHide: true,
  });
}
console.log("\nALL " + tests.length + " TEST SUITES PASSED");
