#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstat, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyArtifactBundle } from "./harmony-release.mjs";
import { validateDeviceResults } from "./validate-device-results.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workflowPath = ".github/workflows/harmonyos.yml";
const artifactPrefix = "harmonyos-native-evidence-";

function command(commandName, argumentsValue) {
  return execFileSync(commandName, argumentsValue, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function repositoryFromRemote() {
  const remote = command("git", ["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[/:]([^/]+)\/(.+)$/u);
  if (!match) throw new Error("Set GITHUB_REPOSITORY to owner/repository");
  return `${match[1]}/${match[2].replace(/\.git$/u, "")}`;
}

function tokenFromEnvironment() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) return token;
  try {
    return command("gh", ["auth", "token"]);
  } catch {
    throw new Error("Set GITHUB_TOKEN or GH_TOKEN, or authenticate gh");
  }
}

async function requestJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status}`);
  return response.json();
}

async function downloadArchive(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`GitHub artifact download returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function safeArchivePath(path) {
  return path && !isAbsolute(path) && !path.split(/[\\/]/u).includes("..");
}

function extractArchive(archive, directory) {
  const listing = spawnSync("unzip", ["-Z1", archive], { encoding: "utf8" });
  if (listing.error || listing.status !== 0) throw new Error("Cannot inspect HarmonyOS evidence archive");
  const entries = listing.stdout.split(/\r?\n/u).filter(Boolean);
  if (entries.length === 0 || entries.some((entry) => !safeArchivePath(entry))) {
    throw new Error("HarmonyOS evidence archive contains an unsafe path");
  }
  const extracted = spawnSync("unzip", ["-q", archive, "-d", directory], { encoding: "utf8" });
  if (extracted.error || extracted.status !== 0) throw new Error("Cannot extract HarmonyOS evidence archive");
}

async function filesBelow(directory, current = directory) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = resolve(current, entry.name);
    const details = await lstat(path);
    if (details.isSymbolicLink()) throw new Error("HarmonyOS evidence contains a symbolic link");
    if (details.isDirectory()) files.push(...await filesBelow(directory, path));
    else if (details.isFile()) files.push(relative(directory, path).replaceAll("\\", "/"));
    else throw new Error("HarmonyOS evidence contains an unsupported file");
  }
  return files;
}

export async function verifyChecksums(directory) {
  const lines = (await readFile(resolve(directory, "SHA256SUMS"), "utf8"))
    .split(/\r?\n/u).filter(Boolean);
  const records = new Map();
  for (const line of lines) {
    const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
    if (!match || !safeArchivePath(match[2]) || records.has(match[2])) {
      throw new Error("Invalid HarmonyOS evidence checksum manifest");
    }
    records.set(match[2], match[1]);
  }
  const files = (await filesBelow(directory)).filter((file) => file !== "SHA256SUMS").sort();
  if (records.size !== files.length || files.some((file) => !records.has(file))) {
    throw new Error("HarmonyOS evidence checksum manifest is incomplete");
  }
  for (const file of files) {
    const checksum = createHash("sha256").update(await readFile(resolve(directory, file))).digest("hex");
    if (records.get(file) !== checksum) throw new Error(`HarmonyOS evidence was modified: ${file}`);
  }
}

export function selectHarmonyRun(payload, sha) {
  const runs = payload?.workflow_runs;
  if (!Array.isArray(runs)) throw new Error("GitHub workflow_runs is not an array");
  const run = runs.find((candidate) =>
    candidate?.head_sha === sha &&
    candidate?.path === workflowPath &&
    candidate?.event === "workflow_dispatch" &&
    candidate?.status === "completed" &&
    candidate?.conclusion === "success"
  );
  if (!run) throw new Error(`No successful HarmonyOS device workflow exists for ${sha}`);
  return run;
}

export function selectHarmonyEvidence(payload) {
  const artifacts = payload?.artifacts;
  if (!Array.isArray(artifacts)) throw new Error("GitHub artifacts is not an array");
  const matches = artifacts.filter((candidate) =>
    Number.isInteger(candidate?.id) && candidate.id > 0 &&
    typeof candidate?.name === "string" &&
    /^harmonyos-native-evidence-[A-Za-z0-9_.-]+$/u.test(candidate.name) &&
    candidate.expired === false &&
    Number.isFinite(candidate.size_in_bytes) &&
    candidate.size_in_bytes > 0
  );
  if (matches.length !== 1) {
    throw new Error("HarmonyOS run must have exactly one usable native evidence artifact");
  }
  return matches[0];
}

export async function verifyEvidenceDirectory({ directory, sha, run, artifact }) {
  await verifyChecksums(directory);
  const metadata = JSON.parse(await readFile(resolve(directory, "evidence.json"), "utf8"));
  const deviceName = artifact.name.slice(artifactPrefix.length);
  if (
    metadata.schemaVersion !== 1 || metadata.platform !== "harmonyos" ||
    metadata.commit !== sha || metadata.runId !== run.id || metadata.deviceName !== deviceName ||
    !/^[0-9a-f]{64}$/u.test(metadata.commandLineToolsSha256 ?? "") ||
    [metadata.tools?.ohpm, metadata.tools?.hvigor, metadata.tools?.codelinter]
      .some((version) => typeof version !== "string" || !version)
  ) {
    throw new Error("HarmonyOS evidence identity or toolchain metadata is invalid");
  }
  const repository = JSON.parse(await readFile(resolve(root, "../../package.json"), "utf8"));
  const artifacts = JSON.parse(await readFile(resolve(root, "harmony-artifacts.json"), "utf8"));
  if (metadata.version !== repository.version) throw new Error("HarmonyOS evidence version is stale");
  const results = await validateDeviceResults({ directory, commit: sha, deviceName });
  await verifyArtifactBundle({
    artifacts,
    version: repository.version,
    directory: resolve(directory, "release"),
  });
  return { metadata, results };
}

export async function verifyHarmonyEvidence(options = {}) {
  const apiUrl = options.apiUrl ?? process.env.GITHUB_API_URL ?? "https://api.github.com";
  const repository = options.repository ?? process.env.GITHUB_REPOSITORY ?? repositoryFromRemote();
  const sha = options.sha ?? process.env.GITHUB_SHA ?? command("git", ["rev-parse", "HEAD"]);
  const token = options.token ?? tokenFromEnvironment();
  const request = options.request ?? requestJson;
  const download = options.download ?? downloadArchive;
  const extract = options.extract ?? extractArchive;
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) throw new Error("Invalid GitHub repository");
  if (!/^[0-9a-f]{40}$/iu.test(sha)) throw new Error("Invalid Git commit SHA");
  const runsUrl = new URL(`/repos/${repository}/actions/runs`, apiUrl);
  runsUrl.searchParams.set("head_sha", sha);
  runsUrl.searchParams.set("status", "success");
  runsUrl.searchParams.set("event", "workflow_dispatch");
  runsUrl.searchParams.set("per_page", "100");
  const run = selectHarmonyRun(await request(runsUrl, token), sha);
  const artifactsUrl = new URL(`/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`, apiUrl);
  const artifact = selectHarmonyEvidence(await request(artifactsUrl, token));
  const temporary = await mkdtemp(resolve(tmpdir(), "harmony-evidence-"));
  try {
    const archive = resolve(temporary, "evidence.zip");
    const directory = resolve(temporary, "contents");
    await writeFile(archive, await download(
      new URL(`/repos/${repository}/actions/artifacts/${artifact.id}/zip`, apiUrl),
      token,
    ));
    await extract(archive, directory);
    const evidence = await verifyEvidenceDirectory({ directory, sha, run, artifact });
    return { run, artifact, ...evidence };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  verifyHarmonyEvidence().then(({ run, artifact }) => {
    console.log(`HarmonyOS evidence verified: ${run.html_url ?? run.id} (${artifact.name})`);
  }).catch((error) => {
    console.error(`[harmonyos-evidence] ${error.message}`);
    process.exitCode = 1;
  });
}
