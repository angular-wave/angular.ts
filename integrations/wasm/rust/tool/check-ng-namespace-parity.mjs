import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("../../../", import.meta.url).pathname);
const namespacePath = resolve(root, "@types/namespace.d.ts");
const parityPath = resolve(
  root,
  "integrations/wasm/rust/NG_NAMESPACE_PARITY.md",
);

const allowedStatuses = new Set([
  "covered",
  "started",
  "alias",
  "unsafe",
  "deferred",
  "not-applicable",
]);

const namespaceSource = readFileSync(namespacePath, "utf8");
const paritySource = readFileSync(parityPath, "utf8");

const namespaceBody =
  namespaceSource.match(/export namespace ng \{([\s\S]*?)\n    \}/)?.[1] ?? "";
const namespaceTypes = new Set(
  [...namespaceBody.matchAll(/\n\s*type\s+([A-Za-z0-9_]+)/g)].map(
    ([, name]) => name,
  ),
);

const parityEntries = new Map();

for (const [, name, status] of paritySource.matchAll(
  /^\|\s*`([^`]+)`\s*\|\s*([^|\s]+)\s*\|/gm,
)) {
  parityEntries.set(name, status);
}

const missing = [...namespaceTypes].filter((name) => !parityEntries.has(name));
const stale = [...parityEntries.keys()].filter(
  (name) => !namespaceTypes.has(name),
);
const invalidStatuses = [...parityEntries].filter(
  ([, status]) => !allowedStatuses.has(status),
);

if (missing.length || stale.length || invalidStatuses.length) {
  if (missing.length) {
    console.error("Missing Rust parity entries:");
    for (const name of missing) console.error(`- ${name}`);
  }

  if (stale.length) {
    console.error("Stale Rust parity entries:");
    for (const name of stale) console.error(`- ${name}`);
  }

  if (invalidStatuses.length) {
    console.error("Invalid Rust parity statuses:");
    for (const [name, status] of invalidStatuses) {
      console.error(`- ${name}: ${status}`);
    }
  }

  process.exit(1);
}

console.log(`Rust namespace parity covers ${namespaceTypes.size} ng types.`);
