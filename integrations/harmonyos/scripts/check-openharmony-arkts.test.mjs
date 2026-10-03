import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectArkTSSources,
  defaultSdkRoot,
  readSdkIdentity,
} from "./check-openharmony-arkts.mjs";

const integration = resolve(fileURLToPath(new URL("..", import.meta.url)));

test("discovers only application and package ArkTS source roots", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "harmony-arkts-sources-"));
  try {
    const expected = [
      resolve(root, "entry/src/main/ets/Index.ets"),
      resolve(root, "packages/core/src/main/ets/Core.ts"),
      resolve(root, "samples/demo/entry/src/main/ets/Demo.ets"),
    ];
    const ignored = [
      resolve(root, "entry/src/test/Index.test.ets"),
      resolve(root, "samples/demo/hvigorfile.ts"),
    ];
    for (const file of [...expected, ...ignored]) {
      await mkdir(resolve(file, ".."), { recursive: true });
      await writeFile(file, "export {};\n");
    }
    assert.deepEqual(await collectArkTSSources(root), expected.sort());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("supports an explicit ETS SDK without changing the default cache", () => {
  assert.equal(
    defaultSdkRoot({ OPENHARMONY_ETS_SDK_HOME: "/opt/openharmony/ets" }),
    "/opt/openharmony/ets",
  );
  assert.match(
    defaultSdkRoot({ HOME: "/unused", XDG_CACHE_HOME: "/cache" }),
    /\/cache\/angularts\/openharmony-sdk-6\.1\.0\.31\/ets\/ets$/u,
  );
});

test("reads and normalizes the SDK identity", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "harmony-arkts-sdk-"));
  try {
    await writeFile(resolve(root, "oh-uni-package.json"), '{"apiVersion":23,"version":"6.1.0.31"}');
    assert.deepEqual(await readSdkIdentity(root), { apiVersion: "23", version: "6.1.0.31" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pins the official archive and the extracted ETS member", async () => {
  const bootstrap = await readFile(resolve(integration, "scripts/bootstrap-openharmony-sdk.sh"), "utf8");
  assert.match(bootstrap, /repo\.huaweicloud\.com\/openharmony\/os\/6\.1-Release/u);
  assert.match(bootstrap, /b833b75a64ee46bbd7880921abbb49b733ec5c8171b6684c9b524d57f624cee0/u);
  assert.match(bootstrap, /f32fc652fe3fc122e166a6b426695394610bd001a76b669396436b8cff6b03ac/u);
  assert.match(
    bootstrap,
    /ETS_MEMBER="linux\/ets-linux-x64-\$\{VERSION\}-Release\.zip"/u,
  );
});

test("keeps the compatibility audit separate from the API 26 release gate", async () => {
  const makefile = await readFile(resolve(integration, "Makefile"), "utf8");
  assert.match(makefile, /^openharmony-bootstrap:/mu);
  assert.match(makefile, /^openharmony-audit: openharmony-bootstrap$/mu);
  assert.match(makefile, /^openharmony-build: generate-check proof-assets-check$/mu);
  assert.match(makefile, /check-platform-matrix\.mjs --require-implemented=harmonyos/u);
  assert.doesNotMatch(makefile, /^release-check:.*openharmony-audit/mu);
  assert.doesNotMatch(makefile, /^release-check:.*openharmony-build/mu);
});
