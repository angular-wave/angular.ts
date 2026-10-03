#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const harmonyRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(harmonyRoot, "../..");
const ignoredNames = new Set([
  ".harmony",
  ".hvigor",
  "build",
  "oh_modules",
  "oh-package-lock.json5",
]);

export function projectBuildProfile(profile) {
  const projected = JSON.parse(JSON.stringify(profile));
  if (projected.app === undefined) return projected;
  for (const product of projected.app.products) {
    product.compileSdkVersion = 23;
    product.compatibleSdkVersion = 23;
    product.targetSdkVersion = 23;
    product.runtimeOS = "OpenHarmony";
  }
  if (projected.modules !== undefined) {
    projected.modules = projected.modules.filter(
      (module) => !new Set([
        "./packages/credentials",
        "./packages/maps",
      ]).has(module.srcPath),
    );
  }
  return projected;
}

export function projectModuleManifest(manifest) {
  const projected = JSON.parse(JSON.stringify(manifest));
  projected.module.deviceTypes = ["default"];
  return projected;
}

export function defaultBuildEnvironment(environment = process.env) {
  const cache = environment.XDG_CACHE_HOME ?? join(environment.HOME ?? "", ".cache");
  return {
    hvigorHome: environment.OPENHARMONY_BUILD_HVIGOR_HOME ??
      join(cache, "angularts", "hvigor-6.0.0.868", "extracted-v1"),
    sdkHome: environment.OPENHARMONY_BUILD_SDK_HOME ??
      join(cache, "angularts", "openharmony-sdk-hvigor-6.1.0.31"),
  };
}

async function stageWorkspace(stagingRoot) {
  for (const name of [
    "AppScope",
    "entry",
    "packages",
    "build-profile.json5",
    "hvigor",
    "hvigorfile.ts",
    "oh-package.json5",
    "samples",
  ]) {
    await cp(join(harmonyRoot, name), join(stagingRoot, name), {
      filter: (source) => !ignoredNames.has(basename(source)),
      recursive: true,
    });
  }

  await projectBuildProfiles(stagingRoot);
  await projectManifests(stagingRoot);

  const assets = join(stagingRoot, "entry", "src", "main", "resources", "rawfile", "dist");
  await rm(assets, { force: true, recursive: true });
  await cp(join(repositoryRoot, "dist"), assets, { recursive: true });
}

async function projectBuildProfiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await projectBuildProfiles(path);
    } else if (entry.name === "build-profile.json5") {
      const profile = JSON.parse(await readFile(path, "utf8"));
      await writeJson(path, projectBuildProfile(profile));
    }
  }
}

async function projectManifests(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignoredNames.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await projectManifests(path);
    } else if (entry.name === "module.json5") {
      const manifest = JSON.parse(await readFile(path, "utf8"));
      await writeJson(path, projectModuleManifest(manifest));
    }
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function assertToolchain(hvigorHome, sdkHome) {
  const required = [
    join(hvigorHome, "bin", "hvigorw"),
    join(hvigorHome, "ohpm", "bin", "ohpm"),
    ...["ets", "js", "native", "previewer", "toolchains"].map((component) =>
      join(sdkHome, "23", component, "oh-uni-package.json")
    ),
  ];
  for (const path of required) {
    try {
      await access(path, path.endsWith("hvigorw") || path.endsWith("ohpm")
        ? constants.X_OK
        : constants.R_OK);
    } catch {
      throw new Error(
        `OpenHarmony build dependency is missing: ${path}\n` +
        "Set OPENHARMONY_BUILD_HVIGOR_HOME and OPENHARMONY_BUILD_SDK_HOME to complete installations.",
      );
    }
  }
}

function run(command, arguments_, options) {
  const result = spawnSync(command, arguments_, { ...options, stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${basename(command)} failed with exit code ${result.status ?? "unknown"}`);
  }
}

async function findArtifacts(directory) {
  const artifacts = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) artifacts.push(...await findArtifacts(path));
    else if (entry.name.endsWith(".hap") || entry.name.endsWith(".har")) artifacts.push(path);
  }
  return artifacts;
}

async function retainArtifacts(artifacts, stagingRoot, retainedRoot) {
  await mkdir(retainedRoot, { recursive: true });
  for (const artifact of artifacts) {
    const name = relative(stagingRoot, artifact).replaceAll("/", "-");
    await cp(artifact, join(retainedRoot, name));
  }
}

async function main() {
  const { hvigorHome, sdkHome } = defaultBuildEnvironment();
  await assertToolchain(hvigorHome, sdkHome);
  const stagingRoot = await mkdtemp(join(tmpdir(), "angularts-openharmony-build-"));
  const outputRoot = resolve(
    process.env.OPENHARMONY_BUILD_OUTPUT ?? join(harmonyRoot, "build", "openharmony-api23"),
  );
  const retainedRoot = join(stagingRoot, ".retained");
  try {
    await stageWorkspace(stagingRoot);
    const environment = {
      ...process.env,
      OHOS_BASE_SDK_HOME: sdkHome,
      PATH: [
        join(hvigorHome, "bin"),
        join(hvigorHome, "hvigor", "bin"),
        join(hvigorHome, "ohpm", "bin"),
        join(hvigorHome, "tool", "node", "bin"),
        process.env.PATH ?? "",
      ].join(":"),
    };
    run(join(hvigorHome, "ohpm", "bin", "ohpm"), ["install", "--all"], {
      cwd: stagingRoot,
      env: environment,
    });
    const hvigor = join(hvigorHome, "bin", "hvigorw");
    const buildArguments = ["--mode", "module", "-p", "product=default", "--no-daemon"];
    run(hvigor, ["assembleHar", "assembleHap", ...buildArguments], {
      cwd: stagingRoot,
      env: environment,
    });
    await retainArtifacts(await findArtifacts(stagingRoot), stagingRoot, retainedRoot);
    for (const sample of ["pulse"]) {
      const sampleRoot = join(stagingRoot, "samples", sample);
      run(join(hvigorHome, "ohpm", "bin", "ohpm"), ["install", "--all"], {
        cwd: sampleRoot,
        env: environment,
      });
      run(hvigor, ["assembleHap", ...buildArguments], {
        cwd: sampleRoot,
        env: environment,
      });
      const sampleHaps = (await findArtifacts(sampleRoot))
        .filter((path) => path.endsWith(".hap"));
      await retainArtifacts(sampleHaps, stagingRoot, retainedRoot);
    }

    const artifacts = await findArtifacts(retainedRoot);
    const haps = artifacts.filter((path) => path.endsWith(".hap"));
    const hars = artifacts.filter((path) => path.endsWith(".har"));
    if (haps.length !== 2 || hars.length !== 6) {
      throw new Error(
        `Expected 2 HAPs and 6 API 23-compatible HARs, received ${haps.length} HAPs and ${hars.length} HARs`,
      );
    }
    await rm(outputRoot, { force: true, recursive: true });
    await mkdir(outputRoot, { recursive: true });
    for (const artifact of artifacts) {
      await cp(artifact, join(outputRoot, basename(artifact)));
    }
    console.log(
      `OpenHarmony API 23 build passed; ${haps.length} HAPs and ${hars.length} compatible HARs retained at ${outputRoot}`,
    );
    console.log("Credentials and Map Kit remain API 26 build gates because their kits are unavailable in OpenHarmony API 23.");
  } finally {
    await rm(stagingRoot, { force: true, recursive: true });
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
