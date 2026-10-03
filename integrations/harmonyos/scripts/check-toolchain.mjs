#!/usr/bin/env node

import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { spawnSync } from "node:child_process";

const home = process.env.HARMONY_COMMAND_LINE_TOOLS_HOME;
const missing = [];

const tools = new Map([
  ["ohpm", ["--version"]],
  ["hvigorw", ["--version"]],
  ["codelinter", ["-v"]],
]);

for (const [tool, versionArguments] of tools) {
  const executable = findExecutable(tool);
  if (!executable) {
    missing.push(tool);
    continue;
  }
  const result = spawnSync(executable, versionArguments, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${tool} exists at ${executable} but failed: ${result.error?.message ?? result.stderr.trim()}`,
    );
  }
  console.log(`${tool}: ${`${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/u)[0]}`);
}

if (missing.length > 0) {
  console.error(`Missing HarmonyOS command-line tools: ${missing.join(", ")}`);
  console.error("Set HARMONY_COMMAND_LINE_TOOLS_HOME or run the HarmonyOS bootstrap target.");
  process.exit(1);
}

function findExecutable(name) {
  const candidates = [
    home ? join(home, "bin", name) : undefined,
    ...String(process.env.PATH ?? "").split(delimiter).filter(Boolean)
      .map((directory) => join(directory, name)),
  ].filter(Boolean);

  return candidates.find((candidate) => {
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}
