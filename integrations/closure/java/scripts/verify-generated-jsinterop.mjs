import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const [, , generatedSourcesDir] = process.argv;

if (!generatedSourcesDir) {
  console.error("Usage: verify-generated-jsinterop.mjs <generated-sources-dir>");
  process.exit(1);
}

function listJavaFiles(dir) {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stat = statSync(path);

      return stat.isDirectory() ? listJavaFiles(path) : [path];
    })
    .filter((path) => path.endsWith(".java"));
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

const files = listJavaFiles(generatedSourcesDir);
const contents = new Map(
  files.map((path) => [relative(generatedSourcesDir, path), readFileSync(path, "utf8")]),
);
const allSource = [...contents.values()].join("\n");

assert(files.length > 0, `No generated Java files found in ${generatedSourcesDir}`);
assert(allSource.includes("@JsType"), "Generated Java sources do not contain @JsType.");
assert(
  /name\s*=\s*"ng\.[A-Za-z_$][\w$]*"/.test(allSource),
  'Generated Java sources do not contain ng.* native types.',
);

for (const expected of [
  "Angular",
  "NgModule",
  "Scope",
  "HttpService",
  "RestService",
  "PubSubProvider",
  "PubSubService",
]) {
  assert(
    new RegExp(`\\b(?:class|interface)\\s+${expected}\\b`).test(allSource),
    `Missing generated Java type: ${expected}`,
  );
}

for (const [path, content] of contents) {
  assert(!content.includes("TODO Auto-generated"), `Generator TODO marker found in ${path}`);
  assert(!content.includes("Unknown type"), `Generator error marker found in ${path}`);
}
