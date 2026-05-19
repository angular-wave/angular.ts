import test from "node:test";
import assert from "node:assert/strict";
import { parseAngularTsRegistrations } from "../analyzer/registrationParser";

test("parses component, directive, filter, service, and controller registrations", () => {
  const text = `
    angular.module("demo", [])
      .component("userCard", {
        bindings: {
          user: "<",
          onSelect: "&?"
        }
      })
      .directive("activeWhen", function() {
        return {
          restrict: "A",
          scope: { activeWhen: "<" }
        };
      })
      .filter("activeOnly", function() {})
      .service("UserApi", function() {})
      .controller("DemoController", function() {});
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");
  const names = entries.map((entry) => entry.name);

  assert.deepEqual(names, [
    "userCard",
    "activeWhen",
    "activeOnly",
    "UserApi",
    "DemoController",
  ]);

  const component = entries.find((entry) => entry.name === "userCard");
  assert.equal(component?.htmlName, "user-card");
  assert.deepEqual(
    component?.bindings?.map((binding) => ({
      name: binding.name,
      mode: binding.mode,
      optional: binding.optional,
    })),
    [
      { name: "user", mode: "<", optional: false },
      { name: "onSelect", mode: "&", optional: true },
    ],
  );

  const directive = entries.find((entry) => entry.name === "activeWhen");
  assert.equal(directive?.htmlName, "active-when");
});
