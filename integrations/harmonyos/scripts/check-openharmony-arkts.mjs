import { createRequire } from "node:module";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "6.1.0.31";
const integrationRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function defaultSdkRoot(environment = process.env) {
  if (environment.OPENHARMONY_ETS_SDK_HOME) {
    return resolve(environment.OPENHARMONY_ETS_SDK_HOME);
  }
  const cache = environment.XDG_CACHE_HOME ?? join(homedir(), ".cache");
  return join(cache, "angularts", `openharmony-sdk-${VERSION}`, "ets", "ets");
}

export async function collectArkTSSources(root = integrationRoot) {
  const sources = [];
  await collect(resolve(root, "entry", "src", "main", "ets"), sources);
  await collectModules(resolve(root, "packages"), sources);
  await collectModules(resolve(root, "samples"), sources);
  return sources.sort();
}

async function collectModules(directory, sources) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const source = resolve(directory, entry.name, "src", "main", "ets");
    const applicationSource = resolve(directory, entry.name, "entry", "src", "main", "ets");
    await collect(source, sources);
    await collect(applicationSource, sources);
  }
}

async function collect(directory, sources) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const location = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(location, sources);
    } else if (entry.isFile() && /\.(?:ets|ts)$/u.test(entry.name)) {
      sources.push(location);
    }
  }
}

export async function readSdkIdentity(sdkRoot) {
  const metadata = JSON.parse(await readFile(resolve(sdkRoot, "oh-uni-package.json"), "utf8"));
  return {
    apiVersion: String(metadata.apiVersion ?? ""),
    version: String(metadata.version ?? ""),
  };
}

export async function auditArkTS({
  root = integrationRoot,
  sdkRoot = defaultSdkRoot(),
  write = (message) => process.stderr.write(`${message}\n`),
} = {}) {
  const identity = await readSdkIdentity(sdkRoot);
  if (identity.apiVersion !== "23" || identity.version !== VERSION) {
    throw new Error(
      `Expected OpenHarmony ETS SDK ${VERSION} (API 23), got ${identity.version || "unknown"} ` +
        `(API ${identity.apiVersion || "unknown"})`,
    );
  }

  const checkerPath = resolve(sdkRoot, "build-tools", "ets-loader", "lib", "ets_checker.js");
  const require = createRequire(import.meta.url);
  const checker = require(checkerPath);
  const sources = await collectArkTSSources(root);
  const inputs = Object.fromEntries(sources.map((source) => [source, source]));
  const cachePath = await mkdtemp(join(tmpdir(), "angularts-openharmony-"));
  let errors = 0;
  let warnings = 0;
  const logger = {
    debug() {},
    info() {},
    error(...messages) {
      errors += 1;
      write(messages.map(String).join(" "));
    },
    warn(...messages) {
      warnings += 1;
      write(messages.map(String).join(" "));
    },
  };

  try {
    checker.etsStandaloneChecker(inputs, logger, {
      packageManagerType: "ohpm",
      projectPath: root,
      projectRootPath: root,
      modulePath: resolve(root, "entry"),
      cachePath,
      buildPath: resolve(cachePath, "build"),
      aceModuleJsonPath: resolve(root, "entry", "src", "main", "module.json5"),
      minPlatformVersion: 20,
      compatibleSdkVersion: 20,
      compileSdkVersion: 23,
      projectArkOption: { tscConfig: { targetESVersion: "ES2021" } },
      sdkInfo: `OpenHarmony ${VERSION} API 23 compatibility audit`,
      resolveModulePaths: [root],
    });
  } finally {
    await rm(cachePath, { recursive: true, force: true });
  }

  return { errors, files: sources.length, warnings };
}

async function main() {
  const sdkRoot = defaultSdkRoot();
  let result;
  try {
    result = await auditArkTS({ sdkRoot });
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        `OpenHarmony ETS SDK is missing. Run make -C integrations/harmonyos openharmony-bootstrap ` +
          `or set OPENHARMONY_ETS_SDK_HOME (looked in ${sdkRoot}).`,
        { cause: error },
      );
    }
    throw error;
  }
  const summary = `OpenHarmony API 23 checked ${result.files} ArkTS sources: ` +
    `${result.errors} errors, ${result.warnings} warnings.`;
  if (result.errors > 0) throw new Error(summary);
  console.log(summary);
}

if (basename(process.argv[1] ?? "") === basename(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
