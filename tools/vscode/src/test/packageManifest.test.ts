import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";

const packageRoot = path.resolve(__dirname, "../..");
const manifestPath = path.join(packageRoot, "package.json");

interface ExtensionManifest {
  contributes?: {
    commands?: Array<{ command?: string; title?: string }>;
    snippets?: Array<{ language?: string; path?: string }>;
  };
  activationEvents?: string[];
}

test("extension manifest contributes expected AngularTS commands", () => {
  const manifest = readManifest();
  const commands = new Set(
    manifest.contributes?.commands?.map((command) => command.command) ?? [],
  );
  const activationEvents = manifest.activationEvents ?? [];

  [
    "angularTs.restartLanguageServer",
    "angularTs.showIndex",
    "angularTs.rebuildIndex",
    "angularTs.findUsage",
    "angularTs.createComponent",
  ].forEach((command) => {
    assert.ok(commands.has(command), `${command} is contributed`);
    assert.ok(
      activationEvents.includes(`onCommand:${command}`) ||
        activationEvents.some((event) => event.startsWith("onLanguage:")),
      `${command} has an activation path`,
    );
  });
});

test("extension manifest snippet contributions point to shipped files", () => {
  const manifest = readManifest();
  const snippets = manifest.contributes?.snippets ?? [];

  assert.ok(snippets.length > 0, "snippets are contributed");
  for (const snippet of snippets) {
    assert.ok(snippet.language, "snippet contribution has language");
    assert.ok(snippet.path, "snippet contribution has path");
    assert.ok(
      fs.existsSync(path.join(packageRoot, snippet.path ?? "")),
      `${snippet.path} exists`,
    );
  }
});

function readManifest(): ExtensionManifest {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8")) as ExtensionManifest;
}
