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
        },
        controller: "UserCardController as $ctrl",
        templateUrl: "./user-card.html"
      })
      .directive("activeWhen", function() {
        return {
          restrict: "A",
          scope: { activeWhen: "<" }
        };
      })
      .filter("activeOnly", function() {
        return function(items, includeArchived) {
          return items;
        };
      })
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
  assert.equal(component?.controller, "UserCardController");
  assert.equal(component?.controllerAs, "$ctrl");
  assert.equal(component?.templateUrl, "./user-card.html");
  assert.match(component?.description ?? "", /controller UserCardController/);
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
  assert.equal(directive?.restrict, "A");
  assert.deepEqual(directive?.allowedLocations, ["attribute"]);

  const filter = entries.find((entry) => entry.name === "activeOnly");
  assert.equal(filter?.signature, "input | activeOnly:includeArchived");
});

test("defaults custom directives without restrict to attribute usage", () => {
  const text = `
    angular.module("demo", [])
      .directive("focusTrap", function() {
        return {
          link: function() {}
        };
      });
  `;

  const [directive] = parseAngularTsRegistrations(text, "/workspace/app.ts");

  assert.equal(directive?.name, "focusTrap");
  assert.equal(directive?.htmlName, "focus-trap");
  assert.equal(directive?.restrict, "A");
  assert.deepEqual(directive?.allowedLocations, ["attribute"]);
  assert.deepEqual(directive?.aliases, ["focus-trap", "data-focus-trap"]);
});

test("maps directive restrict values to attribute and element completion locations", () => {
  const text = `
    angular.module("demo", [])
      .directive("attributeOnly", function() {
        return { restrict: "A" };
      })
      .directive("elementOnly", function() {
        return { restrict: "E" };
      })
      .directive("hybridPanel", function() {
        return { restrict: "AE" };
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");

  const attributeCompletionNames = entries
    .filter((entry) => entry.allowedLocations?.includes("attribute"))
    .flatMap((entry) => entry.aliases);
  const tagCompletionNames = entries
    .filter((entry) => entry.allowedLocations?.includes("element"))
    .map((entry) => entry.htmlName);

  assert.deepEqual(attributeCompletionNames, [
    "attribute-only",
    "data-attribute-only",
    "hybrid-panel",
    "data-hybrid-panel",
  ]);
  assert.deepEqual(tagCompletionNames, ["element-only", "hybrid-panel"]);
});

test("extracts component and directive definition metadata for hovers", () => {
  const text = `
    angular.module("demo", [])
      .component("userPanel", {
        template: "<section></section>",
        controller: function UserPanelController() {},
        controllerAs: "vm",
        bindings: { user: "<" }
      })
      .directive("focusTrap", function() {
        return {
          restrict: "A",
          require: ["ngModel", "^parentPanel"],
          controller: FocusTrapController
        };
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");
  const component = entries.find((entry) => entry.name === "userPanel");
  const directive = entries.find((entry) => entry.name === "focusTrap");

  assert.equal(component?.controller, "UserPanelController");
  assert.equal(component?.controllerAs, "vm");
  assert.equal(component?.template, "<section></section>");

  assert.equal(directive?.controller, "FocusTrapController");
  assert.deepEqual(directive?.require, ["ngModel", "^parentPanel"]);
});

test("parses supported provider object-map registrations", () => {
  const text = `
    angular.module("demo", [])
      .config(function($compileProvider, $controllerProvider) {
        $compileProvider.directive({
          activeWhen: function() {
            return {
              restrict: "A",
              scope: { activeWhen: "<" }
            };
          },
          "panel-box": function() {
            return { restrict: "E" };
          }
        });

        function FooCtrl() {}
        function BarCtrl() {}
        $controllerProvider.register({
          FooCtrl,
          BarCtrl: BarCtrl
        });
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");

  assert.deepEqual(
    entries.map((entry) => ({
      kind: entry.kind,
      name: entry.name,
      htmlName: entry.htmlName,
      restrict: entry.restrict,
      locations: entry.allowedLocations,
    })),
    [
      {
        kind: "directive",
        name: "activeWhen",
        htmlName: "active-when",
        restrict: "A",
        locations: ["attribute"],
      },
      {
        kind: "directive",
        name: "panel-box",
        htmlName: "panel-box",
        restrict: "E",
        locations: ["element"],
      },
      {
        kind: "controller",
        name: "FooCtrl",
        htmlName: undefined,
        restrict: undefined,
        locations: undefined,
      },
      {
        kind: "controller",
        name: "BarCtrl",
        htmlName: undefined,
        restrict: undefined,
        locations: undefined,
      },
    ],
  );
});

test("extracts leading JSDoc for custom registration descriptions", () => {
  const text = `
    angular.module("demo", [])
      /**
       * Displays the current user profile.
       *
       * @internal ignored tag
       */
      .component("userProfile", {
        bindings: { user: "<" }
      })
      /**
       * Formats active users for the dashboard.
       */
      .filter("activeSummary", function() {
        return function(users) {
          return users.length;
        };
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");
  const component = entries.find((entry) => entry.name === "userProfile");
  const filter = entries.find((entry) => entry.name === "activeSummary");

  assert.match(component?.description ?? "", /Displays the current user profile/);
  assert.doesNotMatch(component?.description ?? "", /@internal/);
  assert.match(component?.description ?? "", /Custom AngularTS component/);
  assert.match(filter?.description ?? "", /Formats active users/);
});

test("parses state and router route declarations with params", () => {
  const text = `
    angular.module("demo", [])
      .state("admin.profile", {
        url: "/users/:userId?tab",
        params: {
          userId: { type: "int" },
          tab: { value: "overview" }
        },
        component: "userProfile",
        resolve: {
          user: loadUser,
          tabLabel: loadTabLabel
        }
      })
      .router({
        name: "admin",
        children: [
          {
            name: "roles",
            url: "/roles/{roleId:int}"
          }
        ]
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");
  const routes = entries.filter((entry) => entry.kind === "route");

  assert.deepEqual(
    routes.map((entry) => ({
      name: entry.name,
      component: entry.routeComponent?.name,
      params: entry.routeParams?.map((param) => ({
        name: param.name,
        optional: param.optional,
        valueType: param.valueType,
      })),
      resolves: entry.routeResolves?.map((resolve) => ({
        name: resolve.name,
        value: resolve.value,
      })),
    })),
    [
      {
        name: "admin.profile",
        component: "userProfile",
        params: [
          { name: "tab", optional: true, valueType: undefined },
          { name: "userId", optional: false, valueType: "number" },
        ],
        resolves: [
          { name: "user", value: "loadUser" },
          { name: "tabLabel", value: "loadTabLabel" },
        ],
      },
      {
        name: "admin",
        component: undefined,
        params: [],
        resolves: undefined,
      },
      {
        name: "admin.roles",
        component: undefined,
        params: [{ name: "roleId", optional: false, valueType: "number" }],
        resolves: undefined,
      },
    ],
  );
});

test("parses lazy state boundaries as non-navigable route metadata", () => {
  const text = `
    angular.module("demo", [])
      .lazyState("admin.**", () => import("./admin.routes"))
      .state("admin.profile", {
        url: "/profile"
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");
  const routes = entries.filter((entry) => entry.kind === "route");

  assert.deepEqual(
    routes.map((entry) => ({
      name: entry.name,
      lazy: entry.routeLazyBoundary,
    })),
    [
      { name: "admin.**", lazy: true },
      { name: "admin.profile", lazy: undefined },
    ],
  );
});

test("extracts TypeScript-aware filter signatures from returned callbacks", () => {
  const text = `
    type Todo = { done: boolean };

    angular.module("demo", [])
      .filter("visibleTodos", function() {
        const apply = (
          items: Todo[],
          includeDone?: boolean,
          limit: number = 10
        ): Todo[] => items;

        return apply;
      })
      .filter("todoTitle", function() {
        function format(item: Todo, fallback: string): string {
          return fallback;
        }

        return format;
      })
      .filter("identityName", function() {
        return item => item;
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");

  assert.equal(
    entries.find((entry) => entry.name === "visibleTodos")?.signature,
    "input | visibleTodos:includeDone:limit",
  );
  assert.equal(
    entries.find((entry) => entry.name === "todoTitle")?.signature,
    "input | todoTitle:fallback",
  );
  assert.equal(
    entries.find((entry) => entry.name === "identityName")?.signature,
    "input | identityName",
  );
});

test("extracts JSDoc from supported object-map registration entries", () => {
  const text = `
    angular.module("demo", [])
      .config(function($compileProvider) {
        $compileProvider.directive({
          /**
           * Shows content while the flag is active.
           */
          activeWhen: function() {
            return { restrict: "A" };
          },
          passiveWhen: function() {
            return { restrict: "A" };
          }
        });
      });
  `;

  const entries = parseAngularTsRegistrations(text, "/workspace/app.ts");
  const active = entries.find((entry) => entry.name === "activeWhen");
  const passive = entries.find((entry) => entry.name === "passiveWhen");

  assert.match(active?.description ?? "", /Shows content while the flag is active/);
  assert.doesNotMatch(
    passive?.description ?? "",
    /Shows content while the flag is active/,
  );
});
