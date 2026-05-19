import test from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import {
  componentNames,
  generateComponentFiles,
  inferModuleName,
} from "../commands/componentGenerator";

test("normalizes component names", () => {
  assert.deepEqual(componentNames("user-card"), {
    camel: "userCard",
    kebab: "user-card",
    pascal: "UserCard",
  });

  assert.deepEqual(componentNames("billingSummary"), {
    camel: "billingSummary",
    kebab: "billing-summary",
    pascal: "BillingSummary",
  });
});

test("infers AngularTS module names from source", () => {
  assert.equal(
    inferModuleName(`angular.module("demo", []).component("x", {});`),
    "demo",
  );
  assert.equal(inferModuleName(`const x = 1;`), undefined);
});

test("generates external-template component files", () => {
  const files = generateComponentFiles({
    componentName: "userCard",
    moduleName: "demo",
    directory: "/tmp/components",
    language: "ts",
    template: "external",
    includeCss: true,
    includeTest: true,
  });

  assert.deepEqual(
    files.map((file) => path.basename(file.path)),
    [
      "user-card.component.ts",
      "user-card.html",
      "user-card.css",
      "user-card.component.spec.ts",
    ],
  );
  assert.match(files[0].content, /angular\.module\("demo"\)\.component\("userCard"/);
  assert.match(files[0].content, /templateUrl: "\.\/user-card\.html"/);
  assert.match(files[1].content, /class="user-card"/);
});

test("generates inline-template JavaScript components", () => {
  const files = generateComponentFiles({
    componentName: "user-card",
    moduleName: "demo",
    directory: "/tmp/components",
    language: "js",
    template: "inline",
    includeCss: false,
    includeTest: false,
  });

  assert.deepEqual(
    files.map((file) => path.basename(file.path)),
    ["user-card.component.js"],
  );
  assert.match(files[0].content, /function UserCardController/);
  assert.match(files[0].content, /template: `<section><\/section>`/);
});
