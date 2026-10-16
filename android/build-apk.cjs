const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const androidDir = __dirname;
const root = path.resolve(androidDir, "..");
// Some Android command-line tools still fail on non-ASCII Windows paths.
const out = process.env.EMILIA_ANDROID_BUILD || "D:\\BukhAndroidBuild\\emilia";
const sdk = process.env.ANDROID_HOME || "D:\\BukhAndroidTools";
const buildTools = path.join(sdk, "build-tools", "35.0.0");
const androidJar = path.join(sdk, "platforms", "android-35", "android.jar");

function findJdk() {
  if (process.env.JAVA_HOME && fs.existsSync(path.join(process.env.JAVA_HOME, "bin", "javac.exe"))) {
    return process.env.JAVA_HOME;
  }
  const extensionRoot = path.join(os.homedir(), ".antigravity", "extensions");
  if (fs.existsSync(extensionRoot)) {
    for (const extension of fs.readdirSync(extensionRoot)) {
      if (!extension.startsWith("redhat.java-")) continue;
      const jreRoot = path.join(extensionRoot, extension, "jre");
      if (!fs.existsSync(jreRoot)) continue;
      for (const version of fs.readdirSync(jreRoot).reverse()) {
        const candidate = path.join(jreRoot, version);
        if (fs.existsSync(path.join(candidate, "bin", "javac.exe"))) return candidate;
      }
    }
  }
  throw new Error("JDK не знайдено. Встановіть JDK 17 або новіший.");
}

const jdk = findJdk();
const exe = (name) => path.join(jdk, "bin", `${name}.exe`);

function run(command, args, options = {}) {
  console.log(`> ${path.basename(command)} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || androidDir,
    encoding: "utf8",
    stdio: options.quiet ? "pipe" : "inherit",
    env: { ...process.env, JAVA_HOME: jdk },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (options.quiet) process.stderr.write(result.stderr || result.stdout || "");
    throw new Error(`${path.basename(command)} завершився з кодом ${result.status}`);
  }
  return result;
}

function resetDir(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
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

for (const required of [androidJar, path.join(buildTools, "aapt2.exe"), path.join(buildTools, "zipalign.exe")]) {
  if (!fs.existsSync(required)) throw new Error(`Не знайдено Android SDK: ${required}`);
}

resetDir(out);
const assets = path.join(out, "assets");
fs.mkdirSync(assets, { recursive: true });

const assetExtensions = new Set([".html", ".js", ".css", ".png", ".svg", ".webmanifest"]);
for (const name of fs.readdirSync(root)) {
  const source = path.join(root, name);
  if (!fs.statSync(source).isFile() || !assetExtensions.has(path.extname(name).toLowerCase())) continue;
  fs.copyFileSync(source, path.join(assets, name));
}
console.log("Копіюємо audio…");
copyTree(path.join(root, "audio"), path.join(assets, "audio"));
fs.rmSync(path.join(assets, "audio", "originals"), { recursive: true, force: true });

console.log("Копіюємо models…");
const modelAssets = ["characters.bin", "characters.json", "cube-pets.bin", "cube-pets.json"];
fs.mkdirSync(path.join(assets, "models"), { recursive: true });
for (const file of modelAssets) {
  fs.copyFileSync(path.join(root, "models", file), path.join(assets, "models", file));
}
for (const directory of ["licenses", "park", "party-fruit", "thumbs", "ui"]) {
  copyTree(path.join(root, "models", directory), path.join(assets, "models", directory));
}

console.log("Копіюємо vendor…");
copyTree(path.join(root, "vendor"), path.join(assets, "vendor"));

const res = path.join(out, "res");
copyTree(path.join(androidDir, "res"), res);
const iconDir = path.join(res, "drawable-nodpi");
fs.mkdirSync(iconDir, { recursive: true });
fs.copyFileSync(path.join(root, "icon-512.png"), path.join(iconDir, "icon.png"));
const manifest = path.join(out, "AndroidManifest.xml");
fs.copyFileSync(path.join(androidDir, "AndroidManifest.xml"), manifest);
const javaSource = path.join(out, "src", "com", "voxaburylo", "emiliaisland", "MainActivity.java");
fs.mkdirSync(path.dirname(javaSource), { recursive: true });
fs.copyFileSync(
  path.join(androidDir, "src", "com", "voxaburylo", "emiliaisland", "MainActivity.java"),
  javaSource,
);

const compiledResources = path.join(out, "resources.zip");
run(path.join(buildTools, "aapt2.exe"), ["compile", "--dir", res, "-o", compiledResources]);

const unsignedApk = path.join(out, "emilia-unsigned.apk");
run(path.join(buildTools, "aapt2.exe"), [
  "link",
  "-o", unsignedApk,
  "-I", androidJar,
  "--manifest", manifest,
  "--min-sdk-version", "23",
  "--target-sdk-version", "35",
  "--version-code", "1",
  "--version-name", "0.1-test",
  "--auto-add-overlay",
  compiledResources,
]);
// Add the web tree with jar so nested ZIP paths always use '/', including on Windows.
run(exe("jar"), ["uf", unsignedApk, "-C", out, "assets"]);

const classes = path.join(out, "classes");
fs.mkdirSync(classes, { recursive: true });
run(exe("javac"), [
  "-encoding", "UTF-8",
  "-source", "8",
  "-target", "8",
  "-classpath", androidJar,
  "-d", classes,
  javaSource,
]);

function filesBelow(directory, extension) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const current = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(current, extension) : entry.name.endsWith(extension) ? [current] : [];
  });
}

const dex = path.join(out, "dex");
fs.mkdirSync(dex, { recursive: true });
run(exe("java"), [
  "-cp", path.join(buildTools, "lib", "d8.jar"),
  "com.android.tools.r8.D8",
  "--min-api", "23",
  "--lib", androidJar,
  "--output", dex,
  ...filesBelow(classes, ".class"),
]);
run(exe("jar"), ["uf", unsignedApk, "-C", dex, "classes.dex"]);

const alignedApk = path.join(out, "emilia-aligned.apk");
run(path.join(buildTools, "zipalign.exe"), ["-f", "-p", "4", unsignedApk, alignedApk]);

const keyStore = path.join(path.dirname(out), "emilia-test.keystore");
if (!fs.existsSync(keyStore)) {
  run(exe("keytool"), [
    "-genkeypair",
    "-keystore", keyStore,
    "-storepass", "emilia-test",
    "-keypass", "emilia-test",
    "-alias", "emilia",
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-dname", "CN=Emilia Test, O=Voxaburylo, C=UA",
  ]);
}

const desktop = fs.existsSync(path.join(os.homedir(), "Desktop"))
  ? path.join(os.homedir(), "Desktop")
  : root;
const finalApk = path.join(desktop, "Ostriv-Emilii-test.apk");
fs.rmSync(finalApk, { force: true });
const signerJar = path.join(buildTools, "lib", "apksigner.jar");
run(exe("java"), [
  "-jar", signerJar,
  "sign",
  "--ks", keyStore,
  "--ks-key-alias", "emilia",
  "--ks-pass", "pass:emilia-test",
  "--key-pass", "pass:emilia-test",
  "--out", finalApk,
  alignedApk,
]);
run(exe("java"), ["-jar", signerJar, "verify", "--verbose", "--print-certs", finalApk]);

const stat = fs.statSync(finalApk);
console.log(`\nAPK готовий: ${finalApk}`);
console.log(`Розмір: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
