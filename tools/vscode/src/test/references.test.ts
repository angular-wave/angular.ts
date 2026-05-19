import test from "node:test";
import assert from "node:assert/strict";
import { findAngularTsReferenceAt } from "../templates/references";

test("finds controller references in ng-controller values", () => {
  const text = `<section ng-controller="DemoController as vm"></section>`;
  const offset = text.indexOf("Demo") + 2;
  const reference = findAngularTsReferenceAt(text, offset, "html");

  assert.equal(reference?.kind, "controller");
  assert.equal(reference?.name, "DemoController");
  assert.deepEqual(reference?.targetKinds, ["controller"]);
  assert.equal(text.slice(reference?.start, reference?.end), "DemoController");
});

test("finds controller references in component metadata", () => {
  const text = `angular.module("demo").component("userCard", { controller: "DemoController as vm" });`;
  const offset = text.indexOf("DemoController") + 2;
  const reference = findAngularTsReferenceAt(text, offset, "typescript");

  assert.equal(reference?.kind, "controller");
  assert.equal(reference?.name, "DemoController");
});

test("finds service references in dependency injection arrays", () => {
  const text = `angular.module("demo").controller("DemoController", ["UserApi", "$scope", function(UserApi, $scope) {}]);`;
  const offset = text.indexOf("UserApi") + 2;
  const reference = findAngularTsReferenceAt(text, offset, "javascript");

  assert.equal(reference?.kind, "service");
  assert.equal(reference?.name, "UserApi");
  assert.deepEqual(reference?.targetKinds, [
    "service",
    "factory",
    "provider",
    "constant",
  ]);
});

test("finds service references in $inject assignments", () => {
  const text = `DemoController.$inject = ["UserApi", "$scope"];`;
  const offset = text.indexOf("UserApi") + 2;
  const reference = findAngularTsReferenceAt(text, offset, "typescript");

  assert.equal(reference?.kind, "service");
  assert.equal(reference?.name, "UserApi");
});

test("ignores ordinary strings", () => {
  const text = `const label = "UserApi";`;
  const offset = text.indexOf("UserApi") + 2;

  assert.equal(findAngularTsReferenceAt(text, offset, "typescript"), undefined);
});
