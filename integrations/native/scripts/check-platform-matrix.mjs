#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateNativeCapabilityCatalog } from "./native-capabilities-schema.mjs";
import { validateNativeElementCatalog } from "./native-elements-schema.mjs";

const nativeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [elements, capabilities, matrix] = await Promise.all(
  ["native-elements.json", "native-capabilities.json", "platform-matrix.json"].map(
    async (name) => JSON.parse(await readFile(resolve(nativeRoot, name), "utf8")),
  ),
);

validateNativeElementCatalog(elements);
validateNativeCapabilityCatalog(capabilities);

if (matrix.schemaVersion !== 1 || matrix.protocolVersion !== 1) {
  throw new Error("platform-matrix.json must use schema version 1 and protocol version 1");
}

const validStatuses = new Set(["planned", "implemented", "unavailable"]);
const requiredImplementation = process.argv
  .find((argument) => argument.startsWith("--require-implemented="))
  ?.split("=")[1];

for (const platform of ["android", "harmonyos"]) {
  const definition = matrix.platforms?.[platform];
  if (!definition) throw new Error(`Missing ${platform} platform definition`);
  if (!Number.isInteger(definition.targetApi) || definition.targetApi < 1) {
    throw new Error(`${platform} targetApi must be a positive integer`);
  }
  validateProviders("element", platform, elements.elements, matrix.elementProviders?.[platform]);
  validateProviders(
    "capability",
    platform,
    capabilities.capabilities,
    matrix.capabilityProviders?.[platform],
  );
}

const summary = ["android", "harmonyos"].map((platform) => {
  const providers = [
    ...resolvedProviders(elements.elements, matrix.elementProviders[platform]),
    ...resolvedProviders(capabilities.capabilities, matrix.capabilityProviders[platform]),
  ];
  const counts = Object.fromEntries(
    [...validStatuses].map((status) => [status, providers.filter((entry) => entry.status === status).length]),
  );
  return `${platform}: ${counts.implemented} implemented, ${counts.planned} planned, ${counts.unavailable} unavailable`;
});
console.log(
  `${elements.elements.length} native elements and ${capabilities.capabilities.length} capabilities have provider declarations (${summary.join("; ")}).`,
);

function validateProviders(kind, platform, contracts, providers) {
  if (!providers?.default) throw new Error(`Missing default ${platform} ${kind} provider`);

  for (const contract of contracts) {
    const provider =
      providers.overrides?.[contract.name] ??
      providers.artifacts?.[contract.artifact] ??
      providers.default;
    if (!validStatuses.has(provider.status)) {
      throw new Error(`${platform} ${kind} '${contract.name}' has invalid status`);
    }
    if (typeof provider.module !== "string" || provider.module.length === 0) {
      throw new Error(`${platform} ${kind} '${contract.name}' has no provider module`);
    }
    if (requiredImplementation === platform && provider.status !== "implemented") {
      throw new Error(`${platform} ${kind} '${contract.name}' is ${provider.status}`);
    }
  }
}

function resolvedProviders(contracts, providers) {
  return contracts.map((contract) =>
    providers.overrides?.[contract.name] ??
    providers.artifacts?.[contract.artifact] ??
    providers.default
  );
}
