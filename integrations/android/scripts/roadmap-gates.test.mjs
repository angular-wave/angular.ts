import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const androidRoot = `${repoRoot}/integrations/android`;
const roadmap = readFileSync(`${androidRoot}/ROADMAP.md`, "utf8");

function shellBlocks(source) {
  return [...source.matchAll(/```sh\n([\s\S]*?)```/g)].map((match) => match[1]);
}

function gradleModules(source) {
  return new Set(
    [...source.matchAll(/include\("(:[^"]+)"\)/g)].map((match) =>
      match[1].slice(1),
    ),
  );
}

function makeTargets(source) {
  return new Set(
    [...source.matchAll(/^([A-Za-z0-9_.-]+(?:\s+[A-Za-z0-9_.-]+)*):/gm)].flatMap(
      (match) => match[1].split(/\s+/),
    ),
  );
}

function makeCommands(source) {
  return shellBlocks(source)
    .flatMap((block) => block.replace(/\\\n\s*/g, " ").split("\n"))
    .map((line) => line.trim())
    .filter((line) => line.startsWith("make "));
}

function parseMakeCommand(command) {
  const tokens = command.split(/\s+/).slice(1);
  let directory = ".";
  const directoryOption = tokens.indexOf("-C");
  if (directoryOption >= 0) {
    directory = tokens[directoryOption + 1];
    tokens.splice(directoryOption, 2);
  }
  return {
    directory,
    targets: tokens.filter((token) => !token.startsWith("-") && !token.includes("=")),
  };
}

test("roadmap Gradle gates reference included Android modules", () => {
  const settings = readFileSync(`${androidRoot}/settings.gradle.kts`, "utf8");
  const modules = gradleModules(settings);
  const referenced = new Set(
    shellBlocks(roadmap).flatMap((block) =>
      [...block.matchAll(/\b([a-z][a-z0-9-]*):[A-Za-z][A-Za-z0-9]*\b/g)].map(
        (match) => match[1],
      ),
    ),
  );

  assert.deepEqual(
    [...referenced].filter((module) => !modules.has(module)),
    [],
    "roadmap references unknown Gradle modules",
  );
});

test("roadmap make gates reference declared targets", () => {
  for (const command of makeCommands(roadmap)) {
    const { directory, targets } = parseMakeCommand(command);
    const makefile = `${repoRoot}/${directory === "." ? "Makefile" : `${directory}/Makefile`}`;
    const declared = makeTargets(readFileSync(makefile, "utf8"));
    assert.deepEqual(
      targets.filter((target) => !declared.has(target)),
      [],
      `${command} references unknown Make targets`,
    );
  }
});
