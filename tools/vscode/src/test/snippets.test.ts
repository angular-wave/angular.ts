import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const snippetDir = path.resolve(__dirname, "../../snippets");

test("snippet files contain valid JSON snippet definitions", () => {
  for (const fileName of fs.readdirSync(snippetDir)) {
    if (!fileName.endsWith(".code-snippets")) continue;

    const fullPath = path.join(snippetDir, fileName);
    const snippets = JSON.parse(fs.readFileSync(fullPath, "utf8")) as Record<
      string,
      { prefix?: string; body?: string | string[]; description?: string }
    >;

    assert.ok(Object.keys(snippets).length > 0, `${fileName} has snippets`);

    for (const [name, snippet] of Object.entries(snippets)) {
      assert.equal(typeof snippet.prefix, "string", `${name} has prefix`);
      assert.ok(snippet.prefix, `${name} has non-empty prefix`);
      assert.ok(
        typeof snippet.body === "string" || Array.isArray(snippet.body),
        `${name} has snippet body`,
      );
      assert.equal(
        typeof snippet.description,
        "string",
        `${name} has description`,
      );
    }
  }
});

test("snippet coverage includes AngularTS roadmap prefixes", () => {
  const prefixes = new Set<string>();

  for (const fileName of fs.readdirSync(snippetDir)) {
    if (!fileName.endsWith(".code-snippets")) continue;
    const snippets = JSON.parse(
      fs.readFileSync(path.join(snippetDir, fileName), "utf8"),
    ) as Record<string, { prefix: string }>;
    Object.values(snippets).forEach((snippet) => prefixes.add(snippet.prefix));
  }

  [
    "ngcomponent",
    "ngconfig",
    "ngconstant",
    "ngcontroller",
    "ngdirective",
    "ngfactory",
    "ngfilter",
    "ngmodule",
    "ngprovider",
    "ngrun",
    "ngservice",
    "ngcomponenturl",
    "ngcomponentinline",
    "ngbindings",
    "ngdi",
    "nginject",
    "ngget",
    "ngpost",
    "ngwasm",
    "ngwebcomponent",
  ].forEach((prefix) => assert.ok(prefixes.has(prefix), `${prefix} snippet`));
});
