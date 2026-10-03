import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const mcpRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(
  await readFile(resolve(mcpRoot, "contracts/v1.json"), "utf8"),
);

const requiredTools = [
  "diagnose_template",
  "explain_directive",
  "find_usages",
  "get_symbol",
  "inspect_dependency",
  "inspect_project",
  "inspect_route",
  "list_symbols",
];
const requiredResources = [
  "angularts://catalog/components",
  "angularts://catalog/directives",
  "angularts://catalog/filters",
  "angularts://catalog/injectables",
  "angularts://catalog/routes",
  "angularts://diagnostics",
  "angularts://project/summary",
];

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function resolveReference(reference) {
  const prefix = "#/$defs/";
  assert.ok(reference.startsWith(prefix), `unsupported schema reference ${reference}`);
  const name = reference.slice(prefix.length);
  assert.ok(contract.$defs[name], `missing schema definition ${name}`);
  return contract.$defs[name];
}

function checkSchema(schema, location, seen = new Set()) {
  assert.equal(typeof schema, "object", `${location} must be a schema object`);
  assert.ok(schema !== null && !Array.isArray(schema), `${location} must be an object`);

  if (schema.$ref) {
    if (seen.has(schema.$ref)) return;
    checkSchema(resolveReference(schema.$ref), schema.$ref, new Set([...seen, schema.$ref]));
    return;
  }

  if (schema.type === "object") {
    assert.equal(
      schema.additionalProperties,
      false,
      `${location} must reject unknown properties`,
    );
    for (const [name, property] of Object.entries(schema.properties ?? {})) {
      checkSchema(property, `${location}.properties.${name}`, seen);
    }
  }

  if (schema.items) checkSchema(schema.items, `${location}.items`, seen);
  for (const keyword of ["allOf", "anyOf", "oneOf"]) {
    for (const [index, child] of (schema[keyword] ?? []).entries()) {
      checkSchema(child, `${location}.${keyword}[${index}]`, seen);
    }
  }
  if (schema.not) checkSchema(schema.not, `${location}.not`, seen);
}

assert.equal(contract.contractVersion, 1);
assert.equal(contract.package, "@angular-wave/mcp-server");
assert.equal(contract.executable, "angular-ts-mcp");
assert.deepEqual(contract.support.nodeMajors, [22, 24]);
assert.deepEqual(contract.support.operatingSystems, ["linux", "darwin", "win32"]);
assert.deepEqual(
  contract.support.protocols.map(({ version }) => version),
  ["2026-07-28", "2025-11-25"],
);
assert.equal(contract.support.access, "read-only");
assert.deepEqual(
  contract.support.transports.map(({ name, status, default: isDefault }) => [
    name,
    status,
    isDefault,
  ]),
  [
    ["stdio", "stable", true],
    ["streamable-http", "experimental", false],
  ],
);

for (const [name, value] of Object.entries(contract.limits)) {
  assert.ok(Number.isSafeInteger(value) && value > 0, `limit ${name} must be positive`);
}
assert.ok(contract.limits.maxResponseBytes <= contract.limits.maxFileBytes);
assert.ok(contract.limits.maxCacheBytes < 150 * 1024 * 1024);

assertUnique(contract.defaultDeniedNames, "default denied names");
assertUnique(contract.errors.map(({ code }) => code), "error codes");
for (const error of contract.errors) {
  assert.match(error.code, /^[A-Z][A-Z0-9_]+$/);
  assert.equal(typeof error.retryable, "boolean");
}

assertUnique(contract.resources.map(({ name }) => name), "resource names");
assertUnique(contract.resources.map(({ uri }) => uri), "resource URIs");
assert.deepEqual(sorted(contract.resources.map(({ uri }) => uri)), requiredResources);
for (const resource of contract.resources) {
  assert.match(resource.uri, /^angularts:\/\/[a-z][a-z/-]+$/);
  assert.equal(resource.mimeType, "application/json");
  assert.ok(resource.description.length >= 20);
  checkSchema(resource.outputSchema, `resource ${resource.name} output`);
}

assertUnique(contract.tools.map(({ name }) => name), "tool names");
assert.deepEqual(sorted(contract.tools.map(({ name }) => name)), requiredTools);
for (const tool of contract.tools) {
  assert.match(tool.name, /^[a-z][a-z0-9_]+$/);
  assert.ok(tool.title.length >= 10);
  assert.ok(tool.description.length >= 20);
  assert.deepEqual(tool.annotations, {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  });
  checkSchema(tool.inputSchema, `tool ${tool.name} input`);
  checkSchema(tool.outputSchema, `tool ${tool.name} output`);
}

for (const [name, schema] of Object.entries(contract.$defs)) {
  checkSchema(schema, `$defs.${name}`);
}

const documentation = (
  await Promise.all(
    ["SECURITY.md", "docs/protocol-support.md", "docs/tool-contracts.md"].map(
      (path) => readFile(resolve(mcpRoot, path), "utf8"),
    ),
  )
).join("\n");

for (const tool of requiredTools) {
  assert.ok(documentation.includes(`\`${tool}\``), `document tool ${tool}`);
}
for (const uri of requiredResources) {
  assert.ok(documentation.includes(`\`${uri}\``), `document resource ${uri}`);
}
for (const { code } of contract.errors) {
  assert.ok(documentation.includes(`\`${code}\``), `document error ${code}`);
}

console.log(
  `MCP v${contract.contractVersion} contract covers ${contract.tools.length} tools, ${contract.resources.length} resources, ${contract.errors.length} errors, and ${Object.keys(contract.$defs).length} schemas.`,
);
