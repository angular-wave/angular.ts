import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { collectAngularTsSourceDiagnostics } from "../templates/sourceDiagnostics";
import { builtInInjectables } from "../catalog/injectables";
import type { AngularTsCatalogEntry } from "../catalog/types";

test("diagnoses dependency injection array arity mismatches", () => {
  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").controller("DemoController", ["UserApi", "$scope", function(UserApi) {}]);`,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["diArityMismatch"],
  );
  assert.match(diagnostics[0].message, /2 token\(s\).*1 parameter/);
});

test("accepts matching dependency injection arrays", () => {
  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").controller("DemoController", ["UserApi", "$scope", function(UserApi, $scope) {}]);`,
  );

  assert.deepEqual(diagnostics, []);
});

test("diagnoses unknown dependency injection tokens when an index is provided", () => {
  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").controller("DemoController", ["MissingApi", "$scope", function(MissingApi, $scope) {}]);`,
    builtInInjectables,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownDiToken"],
  );
  assert.match(diagnostics[0].message, /MissingApi/);
});

test("accepts custom dependency injection tokens from indexed registrations", () => {
  const userApi: AngularTsCatalogEntry = {
    kind: "service",
    name: "UserApi",
    normalizedName: "UserApi",
    aliases: [],
    description: "Fixture service",
  };
  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").controller("DemoController", ["UserApi", "$scope", function(UserApi, $scope) {}]);`,
    [...builtInInjectables, userApi],
  );

  assert.deepEqual(diagnostics, []);
});

test("diagnoses unknown tokens in $inject assignments", () => {
  const diagnostics = collectAngularTsSourceDiagnostics(
    `DemoController.$inject = ["MissingApi", "$scope"];`,
    builtInInjectables,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownDiToken"],
  );
  assert.match(diagnostics[0].message, /MissingApi/);
});

test("diagnoses unknown controllers in source metadata", () => {
  const controller: AngularTsCatalogEntry = {
    kind: "controller",
    name: "KnownController",
    normalizedName: "KnownController",
    aliases: [],
    description: "Fixture controller",
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").component("x", { controller: "MissingController as vm" });`,
    [controller],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownController"],
  );
  assert.match(diagnostics[0].message, /MissingController/);
});

test("diagnoses missing templateUrl files", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "angular-ts-vscode-"));
  const sourcePath = path.join(tmp, "component.ts");
  fs.writeFileSync(path.join(tmp, "exists.html"), "<p></p>");

  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").component("x", { templateUrl: "missing.html" });
     angular.module("demo").component("y", { templateUrl: "exists.html" });`,
    [],
    sourcePath,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["missingTemplateUrl"],
  );
  assert.match(diagnostics[0].message, /missing\.html/);
});
