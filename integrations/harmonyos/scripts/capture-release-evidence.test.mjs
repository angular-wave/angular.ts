import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { captureReleaseEvidence } from "./capture-release-evidence.mjs";

test("captures immutable device, package, and toolchain evidence", async () => {
  const temporary = await mkdtemp(resolve(tmpdir(), "harmony-capture-"));
  try {
    const source = resolve(temporary, "device");
    const release = resolve(temporary, "release");
    const output = resolve(temporary, "evidence");
    await mkdir(source);
    await mkdir(release);
    await writeFile(resolve(source, "results.json"), "device");
    await writeFile(resolve(release, "core.har"), "package");
    const result = await captureReleaseEvidence({
      source,
      release,
      output,
      commit: "a".repeat(40),
      runId: "42",
      deviceName: "phone",
      commandLineToolsSha256: "b".repeat(64),
      versions: { ohpm: "5.3.2", hvigor: "6.20.0", codelinter: "1.0.0" },
    });
    const metadata = JSON.parse(await readFile(resolve(output, "evidence.json"), "utf8"));
    const sums = await readFile(resolve(output, "SHA256SUMS"), "utf8");
    assert.equal(metadata.runId, 42);
    assert.equal(metadata.tools.hvigor, "6.20.0");
    assert.equal(result.files, 3);
    assert.match(sums, new RegExp(`${createHash("sha256").update("package").digest("hex")}  release/core\\.har`, "u"));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("rejects incomplete release identity", async () => {
  await assert.rejects(captureReleaseEvidence({
    commit: "bad",
    runId: "0",
    deviceName: "phone name",
    commandLineToolsSha256: "bad",
    versions: {},
  }));
});
