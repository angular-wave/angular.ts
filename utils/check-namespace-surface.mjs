import { readFileSync } from "node:fs";

const namespaceSource = readFileSync("src/namespace.ts", "utf8");
const failures = [];
const namespaceExports = [
  ...namespaceSource.matchAll(/export type ([A-Za-z0-9_]+)/g),
].map((match) => match[1]);
const duplicateExports = namespaceExports.filter(
  (name, index) => namespaceExports.indexOf(name) !== index,
);
const providerExports = namespaceExports.filter((name) =>
  name.endsWith("Provider"),
);

if (/@internal\b/.test(namespaceSource)) {
  failures.push(
    "src/namespace.ts must not use @internal because declaration emit strips those exports.",
  );
}

if (duplicateExports.length > 0) {
  failures.push(
    `Duplicate ng exports: ${[...new Set(duplicateExports)].join(", ")}`,
  );
}

if (providerExports.length > 0) {
  failures.push(
    `Provider-shaped ng exports are not allowed: ${providerExports.join(", ")}`,
  );
}

if (failures.length > 0) {
  console.error("Namespace surface check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Namespace surface check passed for ${namespaceExports.length} ng exports with no provider aliases.`,
);
