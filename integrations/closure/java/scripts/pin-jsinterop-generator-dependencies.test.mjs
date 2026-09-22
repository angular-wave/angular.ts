import assert from "node:assert/strict";
import test from "node:test";

import { pinJsInteropGeneratorDependencies } from "./pin-jsinterop-generator-dependencies.mjs";

const moduleFile = `module(name = "jsinterop_generator")

bazel_dep(name = "j2cl", version = "20250630")

# Use head j2cl for testing purposes.
archive_override(
    module_name = "j2cl",
    urls = ["https://example.test/j2cl-master.zip"],
)

bazel_dep(name = "jsinterop_base", version = "1.1.1")

# Use head jsinterop-base for testing purposes.
archive_override(
    module_name = "jsinterop_base",
    urls = ["https://example.test/jsinterop-base-master.zip"],
)

archive_override(
    module_name = "retained",
    urls = ["https://example.test/retained.zip"],
)
`;

test("pins released jsinterop-generator dependencies", () => {
  const result = pinJsInteropGeneratorDependencies(moduleFile);

  assert.match(result, /bazel_dep\(name = "j2cl", version = "20250630"\)/u);
  assert.match(result, /bazel_dep\(name = "jsinterop_base", version = "1\.1\.1"\)/u);
  assert.doesNotMatch(result, /j2cl-master|jsinterop-base-master|Use head/u);
  assert.match(result, /module_name = "retained"/u);
});

test("rejects a release that no longer exposes both expected overrides", () => {
  assert.throws(
    () => pinJsInteropGeneratorDependencies(moduleFile.replace(/archive_override\(\n    module_name = "j2cl",[\s\S]*?\n\)\n/u, "")),
    /Missing unpinned jsinterop-generator overrides: j2cl/u,
  );
});
