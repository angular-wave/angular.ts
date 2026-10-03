#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function toolVersion(name, arguments_) {
  const result = spawnSync(name, arguments_, { encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(`${name} version check failed`);
  return `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/u)[0];
}

async function filesBelow(directory, current = directory) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(directory, path));
    else if (entry.isFile()) files.push(relative(directory, path).replaceAll("\\", "/"));
    else throw new Error(`Unsupported evidence entry: ${path}`);
  }
  return files;
}

export async function captureReleaseEvidence({
  source = resolve(root, "build/device-results"),
  release = resolve(root, "release"),
  output = resolve(root, "build/release-evidence"),
  commit,
  runId,
  deviceName,
  commandLineToolsSha256,
  versions = {
    ohpm: toolVersion("ohpm", ["--version"]),
    hvigor: toolVersion("hvigorw", ["--version"]),
    codelinter: toolVersion("codelinter", ["-v"]),
  },
}) {
  if (!/^[0-9a-f]{40}$/u.test(commit ?? "")) throw new Error("Invalid evidence commit");
  if (!/^[1-9][0-9]*$/u.test(String(runId ?? ""))) throw new Error("Invalid workflow run ID");
  if (!/^[A-Za-z0-9_.-]+$/u.test(deviceName ?? "")) throw new Error("Invalid device name");
  if (!/^[0-9a-f]{64}$/u.test(commandLineToolsSha256 ?? "")) {
    throw new Error("Invalid command-line tools checksum");
  }
  if (Object.values(versions).some((version) => typeof version !== "string" || !version)) {
    throw new Error("Incomplete HarmonyOS toolchain versions");
  }

  const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(source, output, { recursive: true });
  await cp(release, resolve(output, "release"), { recursive: true });
  await writeFile(resolve(output, "evidence.json"), `${JSON.stringify({
    schemaVersion: 1,
    platform: "harmonyos",
    commit,
    runId: Number(runId),
    deviceName,
    version: repository.version,
    commandLineToolsSha256,
    tools: versions,
  }, null, 2)}\n`);

  const records = [];
  for (const file of (await filesBelow(output)).sort()) {
    if (file === "SHA256SUMS") continue;
    const content = await readFile(resolve(output, file));
    records.push(`${createHash("sha256").update(content).digest("hex")}  ${file}\n`);
  }
  await writeFile(resolve(output, "SHA256SUMS"), records.join(""));
  return { files: records.length, output };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await captureReleaseEvidence({
    release: process.env.HARMONY_RELEASE_ARTIFACT_DIR === undefined
      ? undefined
      : resolve(process.env.HARMONY_RELEASE_ARTIFACT_DIR),
    commit: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    deviceName: process.env.DEVICE_NAME,
    commandLineToolsSha256: process.env.HARMONY_COMMAND_LINE_TOOLS_SHA256,
  });
  console.log(`Captured ${result.files} checksummed HarmonyOS evidence files.`);
}
