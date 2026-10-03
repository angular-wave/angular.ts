#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

export function orderArtifacts(artifacts) {
  const rank = new Map([
    ["core", 0],
    ["native-elements-compiler", 1],
  ]);
  return [...artifacts].sort(
    (left, right) =>
      (rank.get(left.module) ?? 2) - (rank.get(right.module) ?? 2) ||
      left.module.localeCompare(right.module),
  );
}

export function parseSkippedPackages(value = "") {
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function classifyPackageLookup(result) {
  if (result.code === 0) return "published";
  const output = `${result.stdout}\n${result.stderr}`;
  if (/404|E404|not[ -]?found|does not exist|no matching version/iu.test(output)) {
    return "missing";
  }
  throw new Error(`OHPM lookup failed:\n${output.trim()}`);
}

export async function publishArtifacts({
  artifacts,
  version,
  skipped = new Set(),
  lookup,
  locate,
  publish,
  log = () => {},
}) {
  const submitted = [];
  for (const artifact of orderArtifacts(artifacts)) {
    if (skipped.has(artifact.module) || skipped.has(artifact.package)) {
      log(`Skipping ${artifact.package}@${version} by request.`);
      continue;
    }
    if ((await lookup(artifact, version)) === "published") {
      log(`${artifact.package}@${version} is already public.`);
      continue;
    }
    const path = await locate(artifact);
    await publish(path, artifact, version);
    submitted.push(artifact.package);
  }
  return submitted;
}

export async function verifyArtifacts({ artifacts, version, lookup }) {
  const missing = [];
  for (const artifact of orderArtifacts(artifacts)) {
    if ((await lookup(artifact, version)) !== "published") missing.push(artifact.package);
  }
  if (missing.length > 0) {
    throw new Error(`HarmonyOS packages are not public at ${version}: ${missing.join(", ")}`);
  }
}

export function verifyArtifactRecord(artifact, version, record, content) {
  const expectedFile = `${artifact.module}.${artifact.extension}`;
  const checksum = createHash("sha256").update(content).digest("hex");
  if (
    record.module !== artifact.module ||
    record.package !== artifact.package ||
    record.version !== version ||
    record.file !== expectedFile ||
    record.bytes !== content.byteLength ||
    record.sha256 !== checksum
  ) {
    throw new Error(`HarmonyOS release artifact failed verification: ${expectedFile}`);
  }
}

async function run(command, arguments_, capture = false) {
  return new Promise((accept, reject) => {
    const child = spawn(command, arguments_, {
      cwd: root,
      env: process.env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (value) => (stdout += value));
    child.stderr?.on("data", (value) => (stderr += value));
    child.on("error", reject);
    child.on("close", (code) => accept({ code: code ?? 1, stdout, stderr }));
  });
}

async function loadRelease() {
  const artifacts = JSON.parse(
    await readFile(resolve(root, "harmony-artifacts.json"), "utf8"),
  );
  const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
  for (const artifact of artifacts) {
    const metadata = JSON.parse(
      await readFile(resolve(root, "packages", artifact.module, "oh-package.json5"), "utf8"),
    );
    if (metadata.name !== artifact.package || metadata.version !== repository.version) {
      throw new Error(`${artifact.module} metadata does not match ${repository.version}`);
    }
  }
  return { artifacts, version: repository.version };
}

export async function verifyArtifactBundle({
  artifacts,
  version,
  directory = process.env.HARMONY_OHPM_ARTIFACT_DIR,
}) {
  if (!directory) throw new Error("HarmonyOS release bundle directory is required");
  directory = resolve(directory);
  const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
  if (manifest.version !== version || manifest.artifacts?.length !== artifacts.length) {
    throw new Error(`HarmonyOS release bundle does not match ${version}`);
  }
  const sums = await readFile(resolve(directory, "SHA256SUMS"), "utf8");
  for (const artifact of artifacts) {
    const record = manifest.artifacts.find(({ module }) => module === artifact.module);
    if (!record) throw new Error(`HarmonyOS release bundle lacks ${artifact.module}`);
    const content = await readFile(resolve(directory, `${artifact.module}.${artifact.extension}`));
    verifyArtifactRecord(artifact, version, record, content);
    if (!sums.includes(`${record.sha256}  ${record.file}\n`)) {
      throw new Error(`SHA256SUMS lacks ${record.file}`);
    }
  }
}

export async function locateHar(artifact) {
  const directory = process.env.HARMONY_OHPM_ARTIFACT_DIR;
  const path = directory
    ? resolve(directory, `${artifact.module}.${artifact.extension}`)
    : resolve(
        root,
        "packages",
        artifact.module,
        "build/default/outputs/default",
        `${artifact.module}.${artifact.extension}`,
      );
  await access(path);
  return path;
}

async function lookup(artifact, version) {
  return classifyPackageLookup(
    await run("ohpm", ["info", `${artifact.package}@${version}`, "--json"], true),
  );
}

async function publish(path, artifact, version) {
  console.log(`Submitting ${artifact.package}@${version} from ${basename(path)}.`);
  const result = await run("ohpm", ["publish", path]);
  if (result.code !== 0) throw new Error(`OHPM rejected ${artifact.package}@${version}`);
}

async function main() {
  const command = process.argv[2];
  if (!new Set(["publish", "verify"]).has(command)) {
    throw new Error("Usage: harmony-release.mjs <publish|verify>");
  }
  const release = await loadRelease();
  if (command === "publish") {
    if (process.env.HARMONY_OHPM_ARTIFACT_DIR) await verifyArtifactBundle(release);
    const submitted = await publishArtifacts({
      ...release,
      skipped: parseSkippedPackages(process.env.HARMONY_OHPM_SKIP_PACKAGES),
      lookup,
      locate: locateHar,
      publish,
      log: console.log,
    });
    console.log(
      submitted.length === 0
        ? "All HarmonyOS packages were already public or explicitly skipped."
        : `Submitted ${submitted.length} HarmonyOS packages for OHPM review.`,
    );
    return;
  }
  await verifyArtifacts({ ...release, lookup });
  const result = await run("node", [
    resolve(root, "scripts/check-clean-consumer.mjs"),
    "--registry",
  ]);
  if (result.code !== 0) throw new Error("Published HarmonyOS consumer failed to compile");
  console.log(`All HarmonyOS packages at ${release.version} are public and consumable.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
