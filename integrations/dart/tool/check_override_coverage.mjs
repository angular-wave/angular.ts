#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  collectBindingMetadata,
  collectReferencedTypeNames
} from "./generate_dart_bindings.mjs";

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), "../../..");
const overridesPath = resolve(
  repoRoot,
  "integrations/dart/tool/generator-overrides.json"
);
const overrides = JSON.parse(readFileSync(overridesPath, "utf8"));
const metadata = collectBindingMetadata({ repoRoot });
const memberKeys = new Set(
  metadata.flatMap((type) => type.members.map((member) => `${type.typeName}.${member.name}`))
);
const referencedTypeNames = collectReferencedTypeNames({ repoRoot });
const problems = [
  ...manualCoverageProblems(),
  ...unsupportedCoverageProblems(),
  ...memberKeyProblems("callableProperties", overrides.callableProperties ?? []),
  ...memberKeyProblems(
    "methodTypeParameters",
    Object.keys(overrides.methodTypeParameters ?? {})
  ),
  ...memberKeyProblems("renames", Object.keys(overrides.renames ?? {})),
  ...memberKeyProblems("returnTypes", Object.keys(overrides.returnTypes ?? {})),
  ...referencedTypeProblems("parameterTypes", Object.keys(overrides.parameterTypes ?? {})),
  ...referencedTypeProblems("types", Object.keys(overrides.types ?? {}))
];

if (problems.length > 0) {
  console.error("Dart generator override coverage is incomplete:");

  for (const problem of problems) {
    console.error(`- ${problem}`);
  }

  process.exit(1);
}

console.log(
  [
    "Dart generator override coverage is complete",
    `${memberKeys.size} generated namespace members checked`,
    `${referencedTypeNames.size} referenced type names checked`
  ].join("; ") + "."
);

function manualCoverageProblems() {
  const manual = overrides.manual ?? [];

  return manual.length === 0
    ? []
    : manual.map((entry) => `manual.${entry} must move to generated or ergonomic Dart code`);
}

function unsupportedCoverageProblems() {
  const unsupported = overrides.unsupported ?? [];

  return unsupported.length === 0
    ? []
    : unsupported.map((entry) => `unsupported.${entry} must have a generated or explicit API decision`);
}

function memberKeyProblems(sectionName, values) {
  return values
    .filter((entry) => !memberKeys.has(entry))
    .map((entry) => `${sectionName}.${entry} does not match a generated member`);
}

function referencedTypeProblems(sectionName, values) {
  return values
    .filter((entry) => !referencedTypeNames.has(entry))
    .map((entry) => `${sectionName}.${entry} does not match a referenced namespace type`);
}
