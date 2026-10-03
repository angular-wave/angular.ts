import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const runner = await readFile(
  new URL("./run-openharmony-arkts-audit.mjs", import.meta.url),
  "utf8",
);

test("audits credentials through a declaration-only API 26 stub", () => {
  assert.match(runner, /\["credentials", "angular-native-harmony-credentials"\]/u);
  assert.match(runner, /declare module "@kit\.OnlineAuthenticationKit"/u);
  assert.match(runner, /OnlineAuthenticationKit\.d\.ts/u);
  assert.doesNotMatch(runner, /rm\(join\(stagingRoot, "packages", "credentials"/u);
});
