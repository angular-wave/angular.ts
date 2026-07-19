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

test("finds component references in route and state metadata", () => {
  const routeText = `angular.module("demo").config(function($routeProvider) {
    $routeProvider.when("/users", { component: "userCard" });
  });`;
  const stateText = `angular.module("demo").config(function($stateProvider) {
    $stateProvider.state("users", { component: "user-card" });
  });`;

  const routeReference = findAngularTsReferenceAt(
    routeText,
    routeText.indexOf("userCard") + 2,
    "typescript",
  );
  const stateReference = findAngularTsReferenceAt(
    stateText,
    stateText.indexOf("user-card") + 2,
    "typescript",
  );

  assert.equal(routeReference?.kind, "component");
  assert.equal(routeReference?.name, "userCard");
  assert.deepEqual(routeReference?.targetKinds, ["component"]);
  assert.equal(stateReference?.kind, "component");
  assert.equal(stateReference?.name, "user-card");
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

test("finds indexed expression references in interpolation values", () => {
  const text = `<section>{{ UserApi.current.name }}</section>`;
  const offset = text.indexOf("UserApi") + 2;
  const reference = findAngularTsReferenceAt(text, offset, "html");

  assert.equal(reference?.kind, "expression");
  assert.equal(reference?.name, "UserApi");
  assert.deepEqual(reference?.targetKinds, [
    "controller",
    "service",
    "factory",
    "provider",
    "constant",
  ]);
});

test("finds indexed expression references in directive values", () => {
  const text = `<button ng-click="TodoActions.save(todo)">Save</button>`;
  const offset = text.indexOf("TodoActions") + 2;
  const reference = findAngularTsReferenceAt(text, offset, "html");

  assert.equal(reference?.kind, "expression");
  assert.equal(reference?.name, "TodoActions");
});

test("ignores ordinary strings", () => {
  const text = `const label = "UserApi";`;
  const offset = text.indexOf("UserApi") + 2;

  assert.equal(findAngularTsReferenceAt(text, offset, "typescript"), undefined);
});
