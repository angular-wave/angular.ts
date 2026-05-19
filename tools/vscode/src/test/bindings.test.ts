import test from "node:test";
import assert from "node:assert/strict";
import type { AngularTsCatalogEntry } from "../catalog/types";
import {
  findBindingForAttribute,
  findBindingOwnersForTag,
} from "../templates/bindings";

const component: AngularTsCatalogEntry = {
  kind: "component",
  name: "userCard",
  normalizedName: "userCard",
  htmlName: "user-card",
  aliases: ["user-card"],
  description: "Fixture component",
  bindings: [{ name: "user", mode: "<", optional: false }],
};

const directive: AngularTsCatalogEntry = {
  kind: "directive",
  name: "activeWhen",
  normalizedName: "activeWhen",
  htmlName: "active-when",
  aliases: ["active-when"],
  allowedLocations: ["attribute"],
  description: "Fixture directive",
  bindings: [{ name: "activeWhen", mode: "<", optional: false }],
};

test("finds component binding owners by tag", () => {
  const owners = findBindingOwnersForTag("user-card", [], [component]);

  assert.deepEqual(
    owners.map((owner) => owner.entry.name),
    ["userCard"],
  );
});

test("finds directive binding owners by present attribute", () => {
  const owners = findBindingOwnersForTag("section", ["active-when"], [
    directive,
  ]);

  assert.deepEqual(
    owners.map((owner) => owner.entry.name),
    ["activeWhen"],
  );
});

test("finds binding attributes for component and directive owners", () => {
  assert.equal(
    findBindingForAttribute("user-card", "user", ["user"], [component])
      ?.binding.name,
    "user",
  );
  assert.equal(
    findBindingForAttribute(
      "section",
      "active-when",
      ["active-when"],
      [directive],
    )?.binding.name,
    "activeWhen",
  );
});
