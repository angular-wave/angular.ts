import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { checkLinks } from "./check-links.mjs";

test("validates local files, directories, and fragments", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "documentation-links-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(resolve(root, "guide"));
  await writeFile(resolve(root, "asset.css"), "body {}\n");
  await writeFile(
    resolve(root, "index.html"),
    '<a href="/guide/#start">Guide</a><link href="/asset.css"><a href="https://example.test">External</a>',
  );
  await writeFile(
    resolve(root, "guide/index.html"),
    '<h1 id="start">Start</h1><a href="../">Home</a><a href="#start">Start</a>',
  );

  const result = await checkLinks(root);
  assert.equal(result.documents, 2);
  assert.equal(result.references, 4);
  assert.deepEqual(result.errors, []);
});

test("reports missing, malformed, escaping, and fragment targets", async (context) => {
  const root = await mkdtemp(resolve(tmpdir(), "documentation-broken-links-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    resolve(root, "index.html"),
    [
      '<a href="missing">Missing</a>',
      '<a href="#unknown">Fragment</a>',
      '<a href="../outside">Outside</a>',
      '<a href="%GG">Encoding</a>',
    ].join(""),
  );

  const result = await checkLinks(root);
  assert.equal(result.errors.length, 4);
  assert.match(result.errors.join("\n"), /missing target/u);
  assert.match(result.errors.join("\n"), /missing fragment/u);
  assert.match(result.errors.join("\n"), /escapes the site root/u);
  assert.match(result.errors.join("\n"), /invalid URL encoding/u);
});
