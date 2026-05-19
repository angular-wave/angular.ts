import test from "node:test";
import assert from "node:assert/strict";
import type { AngularTsCatalogEntry } from "../catalog/types";
import { collectAngularTsUsages } from "../templates/usages";

test("collects directive attribute usages in HTML", () => {
  const directive: AngularTsCatalogEntry = {
    kind: "directive",
    name: "activeWhen",
    normalizedName: "activeWhen",
    htmlName: "active-when",
    aliases: ["active-when", "data-active-when"],
    description: "Fixture directive",
  };
  const usages = collectAngularTsUsages(
    `<section active-when="ready"></section><section data-active-when="ready"></section>`,
    "html",
    directive,
  );

  assert.deepEqual(usages.map((usage) => usage.kind), [
    "attribute",
    "attribute",
  ]);
});

test("collects element directive usages in HTML", () => {
  const directive: AngularTsCatalogEntry = {
    kind: "directive",
    name: "panelBox",
    normalizedName: "panelBox",
    htmlName: "panel-box",
    aliases: ["panel-box"],
    allowedLocations: ["element"],
    description: "Fixture element directive",
  };
  const usages = collectAngularTsUsages(
    `<panel-box></panel-box>`,
    "html",
    directive,
  );

  assert.deepEqual(usages.map((usage) => usage.kind), ["element"]);
});

test("collects component element usages in HTML", () => {
  const component: AngularTsCatalogEntry = {
    kind: "component",
    name: "userCard",
    normalizedName: "userCard",
    htmlName: "user-card",
    aliases: ["user-card"],
    description: "Fixture component",
  };
  const usages = collectAngularTsUsages(
    `<user-card user="user"></user-card>`,
    "html",
    component,
  );

  assert.deepEqual(usages.map((usage) => usage.kind), ["element"]);
});

test("collects component binding usages in HTML", () => {
  const component: AngularTsCatalogEntry = {
    kind: "component",
    name: "userCard",
    normalizedName: "userCard",
    htmlName: "user-card",
    aliases: ["user-card"],
    description: "Fixture component",
    bindings: [{ name: "user", mode: "<", optional: false }],
  };
  const usages = collectAngularTsUsages(
    `<user-card user="user"></user-card>`,
    "html",
    component,
  );

  assert.deepEqual(usages.map((usage) => usage.kind), ["element", "binding"]);
});

test("collects filter usages in interpolation", () => {
  const filter: AngularTsCatalogEntry = {
    kind: "filter",
    name: "activeOnly",
    normalizedName: "activeOnly",
    aliases: [],
    description: "Fixture filter",
  };
  const usages = collectAngularTsUsages(
    `<p>{{ users | activeOnly }}</p>`,
    "html",
    filter,
  );

  assert.deepEqual(usages.map((usage) => usage.kind), ["filter"]);
});

test("collects controller usages in HTML and source metadata", () => {
  const controller: AngularTsCatalogEntry = {
    kind: "controller",
    name: "DemoController",
    normalizedName: "DemoController",
    aliases: [],
    description: "Fixture controller",
  };

  assert.deepEqual(
    collectAngularTsUsages(
      `<section ng-controller="DemoController as vm"></section>`,
      "html",
      controller,
    ).map((usage) => usage.kind),
    ["controller"],
  );

  assert.deepEqual(
    collectAngularTsUsages(
      `angular.module("demo").component("x", { controller: "DemoController as vm" });`,
      "typescript",
      controller,
    ).map((usage) => usage.kind),
    ["controller"],
  );
});

test("collects service usages in DI arrays and $inject assignments", () => {
  const service: AngularTsCatalogEntry = {
    kind: "service",
    name: "UserApi",
    normalizedName: "UserApi",
    aliases: [],
    description: "Fixture service",
  };
  const usages = collectAngularTsUsages(
    `angular.module("demo").controller("DemoController", ["UserApi", function(UserApi) {}]);
     DemoController.$inject = ["UserApi"];`,
    "typescript",
    service,
  );

  assert.deepEqual(usages.map((usage) => usage.kind), ["service", "service"]);
});
