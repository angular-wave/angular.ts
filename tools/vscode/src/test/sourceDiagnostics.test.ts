import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { collectAngularTsSourceDiagnostics } from "../templates/sourceDiagnostics";
import { builtInInjectables } from "../catalog/injectables";
import type { AngularTsCatalogEntry } from "../catalog/types";
import { parseAngularTsRegistrations } from "../analyzer/registrationParser";

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

test("diagnoses literal ng-state routes inside inline templates", () => {
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "admin.profile",
    normalizedName: "admin.profile",
    aliases: [],
    description: "Fixture route",
    routeParams: [{ name: "userId", optional: false }],
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").component("x", {
       template: \`<a ng-state="'admin.profile'"></a><a ng-state="'admin.missing'"></a>\`
     });`,
    [route],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["missingRouteParam", "unknownRoute"],
  );
  assert.match(diagnostics[0].message, /userId/);
  assert.match(diagnostics[1].message, /admin\.missing/);
});

test("diagnoses literal ng-state routes inside templateUrl files", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "angular-ts-vscode-"));
  const sourcePath = path.join(tmp, "component.ts");
  fs.writeFileSync(
    path.join(tmp, "component.html"),
    `<a ng-state="'admin.profile'" ng-state-params="{ extra: true }"></a>`,
  );
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "admin.profile",
    normalizedName: "admin.profile",
    aliases: [],
    description: "Fixture route",
    routeParams: [{ name: "userId", optional: false }],
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `angular.module("demo").component("x", { templateUrl: "component.html" });`,
    [route],
    sourcePath,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["missingRouteParam", "unknownRouteParam"],
  );
  assert.match(diagnostics[0].message, /component\.html/);
  assert.match(diagnostics[1].message, /extra/);
});

test("diagnoses dynamic ng-state route unions inside inline templates", () => {
  const routes: AngularTsCatalogEntry[] = [
    {
      kind: "route",
      name: "admin.profile",
      normalizedName: "admin.profile",
      aliases: [],
      description: "Fixture profile route",
    },
    {
      kind: "route",
      name: "admin.roles",
      normalizedName: "admin.roles",
      aliases: [],
      description: "Fixture roles route",
    },
  ];

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: "admin.profile" | "admin.missing" = "admin.profile";
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="$ctrl.route"></a>\`
     });`,
    routes,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownRoute"],
  );
  assert.match(diagnostics[0].message, /admin\.missing/);
});

test("accepts dynamic ng-state route unions when every literal is registered", () => {
  const routes: AngularTsCatalogEntry[] = [
    {
      kind: "route",
      name: "admin.profile",
      normalizedName: "admin.profile",
      aliases: [],
      description: "Fixture profile route",
    },
    {
      kind: "route",
      name: "admin.roles",
      normalizedName: "admin.roles",
      aliases: [],
      description: "Fixture roles route",
    },
  ];

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: "admin.profile" | "admin.roles" = "admin.profile";
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="$ctrl.route"></a>\`
     });`,
    routes,
  );

  assert.deepEqual(diagnostics, []);
});

test("ignores dynamic ng-state expressions typed as broad string", () => {
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "admin.profile",
    normalizedName: "admin.profile",
    aliases: [],
    description: "Fixture profile route",
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: string = "admin.missing";
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="$ctrl.route"></a>\`
     });`,
    [route],
  );

  assert.deepEqual(diagnostics, []);
});

test("diagnoses dynamic ng-state route unions inside templateUrl files", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "angular-ts-vscode-"));
  const sourcePath = path.join(tmp, "component.ts");
  fs.writeFileSync(path.join(tmp, "component.html"), `<a ng-state="$ctrl.route"></a>`);
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "admin.profile",
    normalizedName: "admin.profile",
    aliases: [],
    description: "Fixture route",
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: "admin.profile" | "admin.missing" = "admin.profile";
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       templateUrl: "component.html"
     });`,
    [route],
    sourcePath,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["unknownRoute"],
  );
  assert.match(diagnostics[0].message, /component\.html/);
  assert.match(diagnostics[0].message, /admin\.missing/);
});

test("diagnoses ng-state-params values that do not match route param types", () => {
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "user.detail",
    normalizedName: "user.detail",
    aliases: [],
    description: "Fixture route",
    routeParams: [{ name: "userId", optional: false, valueType: "number" }],
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       user: { id: number; name: string } = { id: 1, name: "Ada" };
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="'user.detail'" ng-state-params="{ userId: $ctrl.user.name }"></a>\`
     });`,
    [route],
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["routeParamTypeMismatch"],
  );
  assert.match(diagnostics[0].message, /userId/);
  assert.match(diagnostics[0].message, /number/);
});

test("accepts ng-state-params values that match route param types", () => {
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "user.detail",
    normalizedName: "user.detail",
    aliases: [],
    description: "Fixture route",
    routeParams: [{ name: "userId", optional: false, valueType: "number" }],
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       user: { id: number; name: string } = { id: 1, name: "Ada" };
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="'user.detail'" ng-state-params="{ userId: $ctrl.user.id }"></a>\`
     });`,
    [route],
  );

  assert.deepEqual(diagnostics, []);
});

test("diagnoses ng-state-params value types inside templateUrl files", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "angular-ts-vscode-"));
  const sourcePath = path.join(tmp, "component.ts");
  fs.writeFileSync(
    path.join(tmp, "component.html"),
    `<a ng-state="'user.detail'" ng-state-params="{ userId: $ctrl.user.name }"></a>`,
  );
  const route: AngularTsCatalogEntry = {
    kind: "route",
    name: "user.detail",
    normalizedName: "user.detail",
    aliases: [],
    description: "Fixture route",
    routeParams: [{ name: "userId", optional: false, valueType: "number" }],
  };

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       user: { id: number; name: string } = { id: 1, name: "Ada" };
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       templateUrl: "component.html"
     });`,
    [route],
    sourcePath,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["routeParamTypeMismatch"],
  );
  assert.match(diagnostics[0].message, /component\.html/);
});

test("diagnoses dynamic ng-state-params keys shared by route unions", () => {
  const routes: AngularTsCatalogEntry[] = [
    {
      kind: "route",
      name: "admin.profile",
      normalizedName: "admin.profile",
      aliases: [],
      description: "Fixture profile route",
      routeParams: [{ name: "userId", optional: false }],
    },
    {
      kind: "route",
      name: "admin.settings",
      normalizedName: "admin.settings",
      aliases: [],
      description: "Fixture settings route",
      routeParams: [
        { name: "userId", optional: false },
        { name: "tab", optional: true },
      ],
    },
  ];

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: "admin.profile" | "admin.settings" = "admin.profile";
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="$ctrl.route" ng-state-params="{ extra: true }"></a>\`
     });`,
    routes,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["missingRouteParam", "unknownRouteParam"],
  );
  assert.match(diagnostics[0].message, /userId/);
  assert.match(diagnostics[1].message, /extra/);
});

test("does not require dynamic ng-state params needed by only some union targets", () => {
  const routes: AngularTsCatalogEntry[] = [
    {
      kind: "route",
      name: "admin.profile",
      normalizedName: "admin.profile",
      aliases: [],
      description: "Fixture profile route",
      routeParams: [{ name: "userId", optional: false }],
    },
    {
      kind: "route",
      name: "admin.roles",
      normalizedName: "admin.roles",
      aliases: [],
      description: "Fixture roles route",
      routeParams: [],
    },
  ];

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: "admin.profile" | "admin.roles" = "admin.profile";
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="$ctrl.route"></a>\`
     });`,
    routes,
  );

  assert.deepEqual(diagnostics, []);
});

test("diagnoses dynamic ng-state-params values when route unions agree on param type", () => {
  const routes: AngularTsCatalogEntry[] = [
    {
      kind: "route",
      name: "admin.profile",
      normalizedName: "admin.profile",
      aliases: [],
      description: "Fixture profile route",
      routeParams: [{ name: "userId", optional: false, valueType: "number" }],
    },
    {
      kind: "route",
      name: "admin.settings",
      normalizedName: "admin.settings",
      aliases: [],
      description: "Fixture settings route",
      routeParams: [{ name: "userId", optional: false, valueType: "number" }],
    },
  ];

  const diagnostics = collectAngularTsSourceDiagnostics(
    `class DemoController {
       route: "admin.profile" | "admin.settings" = "admin.profile";
       user: { id: number; name: string } = { id: 1, name: "Ada" };
     }
     angular.module("demo").component("x", {
       controller: DemoController,
       template: \`<a ng-state="$ctrl.route" ng-state-params="{ userId: $ctrl.user.name }"></a>\`
     });`,
    routes,
  );

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["routeParamTypeMismatch"],
  );
  assert.match(diagnostics[0].message, /userId/);
  assert.match(diagnostics[0].message, /number/);
});

test("diagnoses route resolves that do not match routed component bindings", () => {
  const sourcePath = "/workspace/app.ts";
  const source = `
    angular.module("demo", [])
      .component("userProfile", {
        bindings: {
          user: "<",
          tab: "<?",
          onClose: "&"
        }
      })
      .state("admin", { url: "/admin" })
      .state("admin.profile", {
        component: "userProfile",
        resolve: {
          extra: loadExtra
        }
      });
  `;
  const entries = parseAngularTsRegistrations(source, sourcePath);

  const diagnostics = collectAngularTsSourceDiagnostics(source, entries, sourcePath);

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["missingRouteResolveBinding", "unknownRouteResolveBinding"],
  );
  assert.match(diagnostics[0].message, /required binding 'user'/);
  assert.match(diagnostics[1].message, /resolve 'extra'/);
});

test("diagnoses duplicate and orphaned source-backed routes", () => {
  const sourcePath = "/workspace/app.ts";
  const source = `
    angular.module("demo", [])
      .state("admin", { url: "/admin" })
      .state("admin.profile", { url: "/profile" })
      .state("admin.profile", { url: "/profile-copy" })
      .state("reports.detail", { url: "/reports/:id" });
  `;
  const entries = parseAngularTsRegistrations(source, sourcePath);

  const diagnostics = collectAngularTsSourceDiagnostics(source, entries, sourcePath);

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["duplicateRoute", "orphanRoute"],
  );
  assert.match(diagnostics[0].message, /admin\.profile/);
  assert.match(diagnostics[1].message, /reports/);
});

test("accepts source-backed child routes under lazy boundaries", () => {
  const sourcePath = "/workspace/app.ts";
  const source = `
    angular.module("demo", [])
      .lazyState("reports.**", () => import("./reports.routes"))
      .state("reports.detail", { url: "/reports/:id" })
      .state("reports.detail.activity", { url: "/activity" });
  `;
  const entries = parseAngularTsRegistrations(source, sourcePath);

  const diagnostics = collectAngularTsSourceDiagnostics(source, entries, sourcePath);

  assert.deepEqual(diagnostics, []);
});

test("accepts route resolves that satisfy routed component bindings", () => {
  const sourcePath = "/workspace/app.ts";
  const source = `
    angular.module("demo", [])
      .component("userProfile", {
        bindings: {
          user: "<",
          tab: "<?",
          onClose: "&"
        }
      })
      .state("admin", { url: "/admin" })
      .state("admin.profile", {
        component: "userProfile",
        resolve: {
          user: loadUser
        }
      });
  `;
  const entries = parseAngularTsRegistrations(source, sourcePath);

  const diagnostics = collectAngularTsSourceDiagnostics(source, entries, sourcePath);

  assert.deepEqual(diagnostics, []);
});

test("diagnoses route resolve values that do not match typed component bindings", () => {
  const sourcePath = "/workspace/app.ts";
  const source = `
    interface User {
      name: string;
    }

    class UserProfileController {
      user!: User;
    }

    function loadUser(): string {
      return "wrong";
    }

    angular.module("demo", [])
      .component("userProfile", {
        controller: UserProfileController,
        bindings: {
          user: "<"
        }
      })
      .state("admin", { url: "/admin" })
      .state("admin.profile", {
        component: "userProfile",
        resolve: {
          user: loadUser
        }
      });
  `;
  const entries = parseAngularTsRegistrations(source, sourcePath);

  const diagnostics = collectAngularTsSourceDiagnostics(source, entries, sourcePath);

  assert.deepEqual(
    diagnostics.map((diagnostic) => diagnostic.code),
    ["routeResolveTypeMismatch"],
  );
  assert.match(diagnostics[0].message, /resolve 'user'/);
});

test("accepts route resolve values that match typed component bindings", () => {
  const sourcePath = "/workspace/app.ts";
  const source = `
    interface User {
      name: string;
    }

    class UserProfileController {
      user!: User;
    }

    async function loadUser(): Promise<User> {
      return { name: "Ada" };
    }

    angular.module("demo", [])
      .component("userProfile", {
        controller: UserProfileController,
        bindings: {
          user: "<"
        }
      })
      .state("admin", { url: "/admin" })
      .state("admin.profile", {
        component: "userProfile",
        resolve: {
          user: loadUser
        }
      });
  `;
  const entries = parseAngularTsRegistrations(source, sourcePath);

  const diagnostics = collectAngularTsSourceDiagnostics(source, entries, sourcePath);

  assert.deepEqual(diagnostics, []);
});
