#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cp, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { entryCopyFilter, validateInstalledArtifacts } from "./harmony-consumer.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifacts = JSON.parse(
  await readFile(resolve(root, "harmony-artifacts.json"), "utf8"),
);
const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
const registry = process.argv[2] === "--registry";

async function dependencies() {
  const result = {};
  for (const artifact of artifacts) {
    if (registry) {
      result[artifact.package] = repository.version;
      continue;
    }
    const path = resolve(
      root,
      "packages",
      artifact.module,
      "build/default/outputs/default",
      `${artifact.module}.${artifact.extension}`,
    );
    const details = await stat(path);
    if (details.size > artifact.maximumBytes) {
      throw new Error(`${artifact.module}.har exceeds ${artifact.maximumBytes} bytes`);
    }
    result[artifact.package] = `file:${path}`;
  }
  return result;
}

function run(command, arguments_, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(command, arguments_, { cwd, env: process.env, stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? accept() : reject(new Error(`${command} exited with ${code}`)),
    );
  });
}

async function installedManifests(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await installedManifests(path)));
    else if (entry.name === "oh-package.json5") {
      result.push(JSON.parse(await readFile(path, "utf8")));
    }
  }
  return result;
}

const temporary = await mkdtemp(resolve(tmpdir(), "angular-ts-harmony-consumer-"));
try {
  await Promise.all([
    cp(resolve(root, "AppScope"), resolve(temporary, "AppScope"), { recursive: true }),
    cp(resolve(root, "entry"), resolve(temporary, "entry"), {
      recursive: true,
      filter: (path) => entryCopyFilter(resolve(root, "entry"), path),
    }),
    cp(resolve(root, "hvigor"), resolve(temporary, "hvigor"), { recursive: true }),
    cp(resolve(root, "hvigorfile.ts"), resolve(temporary, "hvigorfile.ts")),
    cp(resolve(root, "oh-package.json5"), resolve(temporary, "oh-package.json5")),
  ]);
  const buildProfile = JSON.parse(await readFile(resolve(root, "build-profile.json5"), "utf8"));
  buildProfile.modules = buildProfile.modules.filter(({ name }) => name === "entry");
  await writeFile(
    resolve(temporary, "build-profile.json5"),
    `${JSON.stringify(buildProfile, null, 2)}\n`,
  );
  const entryMetadata = JSON.parse(
    await readFile(resolve(temporary, "entry/oh-package.json5"), "utf8"),
  );
  entryMetadata.dependencies = await dependencies();
  await writeFile(
    resolve(temporary, "entry/oh-package.json5"),
    `${JSON.stringify(entryMetadata, null, 2)}\n`,
  );
  await run("ohpm", ["install", "--all"], temporary);
  const installed = await installedManifests(resolve(temporary, "oh_modules"));
  validateInstalledArtifacts(artifacts, repository.version, installed);
  await run(
    "hvigorw",
    ["--mode", "project", "-p", "product=default", "-p", "buildMode=release", "assembleHap"],
    temporary,
  );
  console.log(
    `${artifacts.length} HarmonyOS packages compiled in an isolated ${
      registry ? "registry" : "HAR"
    } consumer.`,
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
