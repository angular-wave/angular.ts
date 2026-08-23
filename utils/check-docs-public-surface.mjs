import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(root, "docs/content/docs");
const manifest = JSON.parse(
  readFileSync(path.join(root, "docs/public-feature-docs.json"), "utf8"),
);
const errors = [];

function compareSurface(label, actual, entries) {
  const documented = Object.keys(entries).sort();
  for (const name of actual.filter((item) => !documented.includes(item))) {
    errors.push(`${label}: ${name} has no documentation mapping`);
  }
  for (const name of documented.filter((item) => !actual.includes(item))) {
    errors.push(`${label}: ${name} is mapped but is not shipped`);
  }
}

function checkPage(label, page) {
  if (typeof page !== "string" || !page) {
    errors.push(`${label}: documentation page must be a string`);
  } else if (!existsSync(path.join(docsRoot, page))) {
    errors.push(`${label}: documentation page does not exist: ${page}`);
  }
}

function discoverModules(category) {
  const entries = readdirSync(path.join(root, category.root), {
    withFileTypes: true,
  });
  if (category.mode === "directories") {
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  }
  if (category.mode === "source-files") {
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".ts") &&
          !entry.name.endsWith(".spec.ts") &&
          !entry.name.endsWith(".test.ts"),
      )
      .map((entry) => entry.name.slice(0, -3))
      .sort();
  }
  errors.push(`Unknown discovery mode: ${category.mode}`);
  return [];
}

for (const [label, category] of Object.entries(manifest.moduleCategories)) {
  compareSurface(label, discoverModules(category), category.entries);
  for (const [name, mapping] of Object.entries(category.entries)) {
    if (!["canonical", "dedicated"].includes(mapping.coverage)) {
      errors.push(`${label}/${name}: invalid coverage kind`);
    }
    checkPage(`${label}/${name}`, mapping.page);
  }
}

const interfaceSource = readFileSync(
  path.join(root, "src/interface.ts"),
  "utf8",
);
const tokenBlock = interfaceSource.match(
  /export interface InjectionTokenMap\s*{([\s\S]*?)\n}/,
)?.[1];
const tokens = tokenBlock
  ? [...tokenBlock.matchAll(/^\s+(\$[A-Za-z0-9]+)\s*:/gm)]
      .map((match) => match[1])
      .sort()
  : [];
if (!tokenBlock) errors.push("Could not discover InjectionTokenMap");
compareSurface("injection tokens", tokens, manifest.injectionTokens);
for (const [token, page] of Object.entries(manifest.injectionTokens)) {
  checkPage(`injection token ${token}`, page);
}

const moduleSource = readFileSync(
  path.join(root, "src/core/di/ng-module/ng-module.ts"),
  "utf8",
);
const configBlock = moduleSource.match(
  /export interface AngularConfigMap\s*{([\s\S]*?)\n}/,
)?.[1];
const configKeys = configBlock
  ? [
      ...new Set([
        ...[...configBlock.matchAll(/\[_([A-Za-z0-9]+)\]/g)].map(
          (match) => `$${match[1]}`,
        ),
        ...(configBlock.includes("[routerConfigKey]") ? ["$router"] : []),
      ]),
    ].sort()
  : [];
if (!configBlock) errors.push("Could not discover AngularConfigMap");
compareSurface("configuration", configKeys, manifest.configuration);
for (const [key, page] of Object.entries(manifest.configuration)) {
  checkPage(`configuration ${key}`, page);
}

for (const [name, example] of Object.entries(manifest.integrationExamples)) {
  checkPage(`integration ${name}`, example.page);
  if (!Array.isArray(example.artifacts) || example.artifacts.length === 0) {
    errors.push(`integration ${name}: an executable artifact is required`);
    continue;
  }
  for (const artifact of example.artifacts) {
    if (!existsSync(path.join(root, artifact))) {
      errors.push(`integration ${name}: artifact does not exist: ${artifact}`);
    }
  }
}

const tutorialExamples = JSON.parse(
  readFileSync(path.join(root, "docs/tutorial-examples.json"), "utf8"),
);
for (const [name, example] of Object.entries(tutorialExamples)) {
  checkPage(`tutorial ${name}`, example.page);
  if (!Array.isArray(example.artifacts) || example.artifacts.length === 0) {
    errors.push(`tutorial ${name}: an executable artifact is required`);
    continue;
  }
  for (const artifact of example.artifacts) {
    if (!existsSync(path.join(root, artifact))) {
      errors.push(`tutorial ${name}: artifact does not exist: ${artifact}`);
    }
  }
}

if (errors.length) {
  console.error("Public documentation surface parity failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const modules = Object.values(manifest.moduleCategories).reduce(
    (total, category) => total + Object.keys(category.entries).length,
    0,
  );
  console.log(
    `Documentation parity covers ${modules} feature modules, ${tokens.length} injection tokens, ${configKeys.length} configuration keys, ${Object.keys(manifest.integrationExamples).length} integration examples, and ${Object.keys(tutorialExamples).length} executable tutorial.`,
  );
}
