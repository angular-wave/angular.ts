import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { routeFromLocation, tabDestination } from "./model.mjs";

test("uses distinct transitions for navigation relationships", () => {
  assert.deepEqual(tabDestination("tab:feed"), ["/feed", "replace", "fade"]);
  assert.deepEqual(tabDestination("tab:explore"), ["/explore", "replace", "fade"]);
  assert.deepEqual(tabDestination("tab:activity"), ["/activity", "replace", "slide"]);
  assert.deepEqual(tabDestination("tab:create"), ["/create", "replace", "cover"]);
  assert.deepEqual(tabDestination("tab:profile"), ["/profiles/elena", "replace", "flip"]);
  assert.equal(tabDestination("missing"), undefined);
});

test("maps every public route", () => {
  assert.deepEqual(routeFromLocation("https://pulse.test/"), { kind: "feed" });
  assert.deepEqual(routeFromLocation("https://pulse.test/feed"), { kind: "feed" });
  assert.deepEqual(routeFromLocation("https://pulse.test/explore"), { kind: "explore" });
  assert.deepEqual(routeFromLocation("https://pulse.test/posts/one"), { kind: "post", id: "one" });
  assert.deepEqual(routeFromLocation("https://pulse.test/profiles/elena"), { kind: "profile", handle: "elena" });
  assert.deepEqual(routeFromLocation("https://pulse.test/create"), { kind: "create" });
  assert.deepEqual(routeFromLocation("https://pulse.test/activity"), { kind: "activity" });
  assert.deepEqual(routeFromLocation("https://pulse.test/login"), { kind: "login" });
  assert.deepEqual(routeFromLocation("https://pulse.test/missing"), { kind: "feed" });
});

test("keeps persistent tabs in the shared navigator", async () => {
  const configuration = JSON.parse(await readFile(
    new URL("../sample-social/src/main/assets/pulse/path-configuration.json", import.meta.url),
    "utf8",
  ));
  const create = configuration.rules.find((rule) => rule.patterns.includes("^/create$"));
  assert.notEqual(create.properties.context, "modal");
});

test("every declarative native tag uses the generated public catalog", async () => {
  const [html, catalogSource] = await Promise.all([
    readFile(new URL("./index.html", import.meta.url), "utf8"),
    readFile(new URL("../native-elements.json", import.meta.url), "utf8"),
  ]);
  const catalog = JSON.parse(catalogSource);
  const definitions = new Map(catalog.elements.map((element) => [element.name, element]));
  const tags = [...html.matchAll(/<ng-native-([a-z][a-z0-9-]*)(\s[^>]*)?>/gu)];

  assert.ok(tags.length > definitions.size, "The demo should exercise nested and repeated native tags");
  for (const match of tags) {
    const name = match[1];
    const attributes = match[2] || "";
    const definition = definitions.get(name);
    assert.ok(definition, `Unknown native HTML tag: ng-native-${name}`);
    const properties = new Set(definition.properties.map((property) =>
      property.name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
    ));
    const events = new Set(definition.events.map((event) =>
      event.name.replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)
    ));
    for (const attribute of attributes.matchAll(/\s([:@a-z][a-z0-9-]*)(?=\s*=)/gu)) {
      const attributeName = attribute[1];
      if (
        attributeName === "id" ||
        attributeName === "class" ||
        attributeName === "key" ||
        attributeName === "retain" ||
        attributeName === "ng-if" ||
        attributeName === "ng-model" ||
        attributeName === "ng-repeat"
      ) continue;
      if (attributeName.startsWith("on-")) {
        assert.ok(events.has(attributeName.slice(3)), `${name} does not emit ${attributeName}`);
      } else {
        assert.ok(properties.has(attributeName), `${name} does not accept ${attributeName}`);
      }
    }
  }

  assert.match(html, /ng-repeat="post in vm\.posts"/u);
  assert.match(html, /ng-model="vm\.draft\.caption"/u);
  assert.match(html, /on-select="vm\.selectTab\(\$data\.key\)"/u);
});

test("the file uploader exposes typed progress events", async () => {
  const catalog = JSON.parse(await readFile(new URL("../native-capabilities.json", import.meta.url), "utf8"));
  const files = catalog.capabilities.find((capability) => capability.name === "files");
  assert.deepEqual(files.events.map((event) => event.name), ["progress"]);
});
