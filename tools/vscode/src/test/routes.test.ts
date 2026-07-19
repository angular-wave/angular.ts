import test from "node:test";
import assert from "node:assert/strict";
import type { AngularTsCatalogEntry } from "../catalog/types";
import {
  routeCompletionContextAtOffset,
  routeEntries,
  routeNameCompletionEntries,
  routeParamCompletionNames,
} from "../templates/routes";

const adminProfileRoute: AngularTsCatalogEntry = {
  kind: "route",
  name: "admin.profile",
  normalizedName: "admin.profile",
  aliases: [],
  description: "Fixture route",
  routeParams: [
    { name: "userId", optional: false },
    { name: "tab", optional: true },
  ],
};

const adminRolesRoute: AngularTsCatalogEntry = {
  kind: "route",
  name: "admin.roles",
  normalizedName: "admin.roles",
  aliases: [],
  description: "Fixture route",
  routeParams: [{ name: "roleId", optional: false }],
};

test("detects route-name completion context inside ng-state literals", () => {
  const text = `<a ng-state="'admin.pr'"></a>`;
  const offset = text.indexOf("pr") + 2;

  const context = routeCompletionContextAtOffset(text, offset, [
    adminProfileRoute,
    adminRolesRoute,
  ]);

  assert.equal(context?.kind, "route-name");
  assert.equal(context?.prefix, "admin.pr");
  assert.equal(text.slice(context?.start, context?.end), "admin.pr");
});

test("excludes lazy route boundaries from navigable route entries", () => {
  const text = `<a ng-state="'admin.**'"></a>`;
  const offset = text.indexOf("admin.**") + "admin.**".length;
  const entries = [
    adminProfileRoute,
    {
      kind: "route" as const,
      name: "admin.**",
      normalizedName: "admin.**",
      aliases: [],
      description: "Lazy admin boundary",
      routeLazyBoundary: true,
    },
  ];

  const context = routeCompletionContextAtOffset(text, offset, entries);

  assert.equal(context?.kind, "route-name");
  assert.equal(context?.prefix, "admin.**");
  assert.deepEqual(routeEntries(entries).map((entry) => entry.name), [
    "admin.profile",
  ]);
});

test("filters route-name completions by typed prefix", () => {
  const entries = [
    adminProfileRoute,
    adminRolesRoute,
    {
      kind: "route" as const,
      name: "settings.profile",
      normalizedName: "settings.profile",
      aliases: [],
      description: "Fixture settings route",
    },
    {
      kind: "route" as const,
      name: "admin.**",
      normalizedName: "admin.**",
      aliases: [],
      description: "Lazy admin boundary",
      routeLazyBoundary: true,
    },
  ];

  assert.deepEqual(
    routeNameCompletionEntries(entries, "admin.r").map((entry) => entry.name),
    ["admin.roles"],
  );
});

test("detects route-param completion context inside ng-state-params", () => {
  const text = `<a ng-state="'admin.profile'" ng-state-params="{ userId: user.id, ta }"></a>`;
  const offset = text.lastIndexOf("ta") + 2;

  const context = routeCompletionContextAtOffset(text, offset, [
    adminProfileRoute,
    adminRolesRoute,
  ]);

  assert.equal(context?.kind, "route-param");
  if (context?.kind !== "route-param") return;

  assert.equal(context.prefix, "ta");
  assert.equal(context.route.name, "admin.profile");
  assert.deepEqual([...context.existingParams], ["userId"]);
  assert.equal(text.slice(context.start, context.end), "ta");
});

test("filters route-param completions by prefix and existing params", () => {
  assert.deepEqual(
    routeParamCompletionNames(adminProfileRoute, new Set(["userId"]), "t"),
    ["tab"],
  );
});
