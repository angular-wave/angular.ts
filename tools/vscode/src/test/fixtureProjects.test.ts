import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseAngularTsRegistrations } from "../analyzer/registrationParser";
import { builtInDirectives } from "../catalog/directives";
import { collectAngularTsHtmlDiagnostics } from "../templates/diagnostics";

const fixturesRoot = path.resolve(__dirname, "../../test-fixtures");

test("fixture TypeScript project indexes registrations and template cleanly", () => {
  const appPath = path.join(fixturesRoot, "basic-app", "app.ts");
  const templatePath = path.join(fixturesRoot, "basic-app", "user-card.html");
  const entries = parseAngularTsRegistrations(
    fs.readFileSync(appPath, "utf8"),
    appPath,
  );
  const diagnostics = collectAngularTsHtmlDiagnostics(
    fs.readFileSync(templatePath, "utf8"),
    [...builtInDirectives, ...entries],
  );
  assert.deepEqual(
    entries.map((entry) => `${entry.kind}:${entry.name}`),
    [
      "component:userCard",
      "directive:activeWhen",
      "filter:activeOnly",
      "controller:DemoController",
    ],
  );
  assert.deepEqual(diagnostics, []);
});

test("fixture JavaScript project indexes registrations and template cleanly without tsconfig", () => {
  const appPath = path.join(fixturesRoot, "javascript-app", "app.js");
  const templatePath = path.join(fixturesRoot, "javascript-app", "todo-row.html");
  const entries = parseAngularTsRegistrations(
    fs.readFileSync(appPath, "utf8"),
    appPath,
  );
  const diagnostics = collectAngularTsHtmlDiagnostics(
    fs.readFileSync(templatePath, "utf8"),
    [...builtInDirectives, ...entries],
  );
  const inlineTemplate = entries.find((entry) => entry.name === "todoList")?.template;
  const inlineDiagnostics = collectAngularTsHtmlDiagnostics(
    inlineTemplate ?? "",
    [...builtInDirectives, ...entries],
  );

  assert.deepEqual(
    entries.map((entry) => `${entry.kind}:${entry.name}`),
    ["component:todoList", "component:todoRow", "service:TodoApi"],
  );
  assert.deepEqual(
    entries.find((entry) => entry.name === "todoRow")?.bindings?.map((binding) => ({
      name: binding.name,
      mode: binding.mode,
    })),
    [{ name: "todo", mode: "<" }],
  );
  assert.ok(inlineTemplate);
  assert.deepEqual(inlineDiagnostics, []);
  assert.deepEqual(diagnostics, []);
});

test("fixture multi-root workspace aggregates registrations across roots", () => {
  const adminAppPath = path.join(
    fixturesRoot,
    "multi-root",
    "admin",
    "admin-app.ts",
  );
  const sharedPath = path.join(
    fixturesRoot,
    "multi-root",
    "shared",
    "shared-directives.js",
  );
  const templatePath = path.join(
    fixturesRoot,
    "multi-root",
    "admin",
    "admin-panel.html",
  );
  const entries = [
    ...parseAngularTsRegistrations(fs.readFileSync(adminAppPath, "utf8"), adminAppPath),
    ...parseAngularTsRegistrations(fs.readFileSync(sharedPath, "utf8"), sharedPath),
  ];
  const diagnostics = collectAngularTsHtmlDiagnostics(
    fs.readFileSync(templatePath, "utf8"),
    [...builtInDirectives, ...entries],
  );

  assert.deepEqual(
    entries.map((entry) => `${entry.kind}:${entry.name}`),
    [
      "component:adminPanel",
      "service:AdminApi",
      "directive:auditLog",
      "filter:displayName",
    ],
  );
  assert.deepEqual(diagnostics, []);
});
