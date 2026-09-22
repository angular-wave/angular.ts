import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { androidArtifacts } from "./android-artifacts.mjs";

const execute = promisify(execFile);
const script = new URL("./reproducibility-check.mjs", import.meta.url);
const packageJson = JSON.parse(
  await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
);
const version = packageJson.version;

test("records and verifies only the selected staged repository", async (context) => {
  const temporary = await mkdtemp(join(tmpdir(), "angular-native-reproducibility-"));
  const repository = join(temporary, "repository");
  const manifest = join(temporary, "digests.json");
  context.after(() => rm(temporary, { recursive: true, force: true }));

  const files = [];
  for (const { artifact, extension } of androidArtifacts) {
    const directory = join(
      repository,
      "io",
      "github",
      "angular-wave",
      artifact,
      version,
    );
    for (const suffix of [
      `.${extension}`,
      "-sources.jar",
      "-javadoc.jar",
      ".pom",
      ".module",
    ]) {
      const file = join(directory, `${artifact}-${version}${suffix}`);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, `${artifact}:${suffix}`);
      files.push(file);
    }
  }

  const recorded = await execute(process.execPath, [
    script.pathname,
    "record",
    manifest,
    repository,
  ]);
  assert.match(recorded.stdout, /Recorded 45 Android publication digests\./u);
  assert.equal(Object.keys(JSON.parse(await readFile(manifest, "utf8"))).length, 45);

  const verified = await execute(process.execPath, [
    script.pathname,
    "verify",
    manifest,
    repository,
  ]);
  assert.match(verified.stdout, /Verified 45 reproducible Android artifacts\./u);

  await writeFile(files[0], "changed");
  await assert.rejects(
    execute(process.execPath, [script.pathname, "verify", manifest, repository]),
    (error) => {
      assert.match(error.stderr, /Android publication artifacts are not reproducible:/u);
      assert.match(error.stderr, /- changed:/u);
      return true;
    },
  );
});
