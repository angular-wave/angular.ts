#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const evidenceArtifactPrefix = "android-native-physical-";
const physicalWorkflow = ".github/workflows/android-physical.yml";

function requireArray(value, member) {
  if (!Array.isArray(value)) {
    throw new Error(`GitHub response member ${member} is not an array`);
  }
  return value;
}

export function selectSuccessfulPhysicalRun(payload, sha) {
  const runs = requireArray(payload?.workflow_runs, "workflow_runs");
  const run = runs.find(
    (candidate) =>
      candidate?.head_sha === sha &&
      candidate?.path === physicalWorkflow &&
      candidate?.event === "workflow_dispatch" &&
      candidate?.status === "completed" &&
      candidate?.conclusion === "success" &&
      (typeof candidate?.id === "number" || typeof candidate?.id === "string"),
  );

  if (!run) {
    throw new Error(
      `No successful Android Physical Device workflow run exists for commit ${sha}`,
    );
  }
  return run;
}

export function selectPhysicalEvidenceArtifact(payload) {
  const artifacts = requireArray(payload?.artifacts, "artifacts");
  const artifact = artifacts.find(
    (candidate) =>
      typeof candidate?.name === "string" &&
      candidate.name.startsWith(evidenceArtifactPrefix) &&
      candidate.expired === false &&
      Number.isFinite(candidate.size_in_bytes) &&
      candidate.size_in_bytes > 0,
  );

  if (!artifact) {
    throw new Error(
      "The successful physical-device run has no non-empty, unexpired evidence artifact",
    );
  }
  return artifact;
}

function commandOutput(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function inferRepository() {
  const remote = commandOutput("git", ["remote", "get-url", "origin"]);
  const match = remote.match(/github\.com[/:]([^/]+)\/(.+)$/u);
  if (!match) {
    throw new Error("Set GITHUB_REPOSITORY to the GitHub owner/repository name");
  }
  return `${match[1]}/${match[2].replace(/\.git$/u, "")}`;
}

function resolveToken() {
  const environmentToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (environmentToken) return environmentToken;

  try {
    return commandOutput("gh", ["auth", "token"]);
  } catch {
    throw new Error(
      "Set GITHUB_TOKEN or GH_TOKEN, or authenticate the GitHub CLI with `gh auth login`",
    );
  }
}

async function fetchJson(url, token) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API request failed with HTTP ${response.status}: ${url}`);
  }
  return response.json();
}

export async function verifyPhysicalReleaseEvidence({
  apiUrl = process.env.GITHUB_API_URL || "https://api.github.com",
  repository = process.env.GITHUB_REPOSITORY || inferRepository(),
  sha = process.env.GITHUB_SHA || commandOutput("git", ["rev-parse", "HEAD"]),
  token = resolveToken(),
  request = fetchJson,
} = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) {
    throw new Error(`Invalid GitHub repository: ${repository}`);
  }
  if (!/^[0-9a-f]{40}$/iu.test(sha)) {
    throw new Error(`Invalid Git commit SHA: ${sha}`);
  }

  const runsUrl = new URL(`/repos/${repository}/actions/runs`, apiUrl);
  runsUrl.searchParams.set("event", "workflow_dispatch");
  runsUrl.searchParams.set("head_sha", sha);
  runsUrl.searchParams.set("status", "success");
  runsUrl.searchParams.set("per_page", "100");

  const run = selectSuccessfulPhysicalRun(await request(runsUrl, token), sha);
  const artifactsUrl = new URL(
    `/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`,
    apiUrl,
  );
  const artifact = selectPhysicalEvidenceArtifact(
    await request(artifactsUrl, token),
  );

  return { artifact, run };
}

async function main() {
  const { artifact, run } = await verifyPhysicalReleaseEvidence();
  console.log(
    `Physical Android release evidence verified: ${run.html_url ?? `run ${run.id}`} (${artifact.name})`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[android-physical-evidence] ${error.message}`);
    process.exitCode = 1;
  });
}
