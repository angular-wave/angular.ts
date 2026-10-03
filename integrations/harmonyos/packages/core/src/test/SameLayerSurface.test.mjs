import assert from "node:assert/strict";
import test from "node:test";
import { SameLayerSurface } from "../main/ets/nodes/SameLayerSurface.ts";

function fixture() {
  const operations = [];
  const controllers = [];
  const surface = new SameLayerSurface((embed) => {
    const controller = {
      update: (snapshot, primitive) => operations.push(["update", embed.domId, snapshot.id, primitive]),
      layout: (rect) => operations.push(["layout", embed.domId, rect]),
      invoke: (method) => `invoked:${method}`,
      postTouchEvent: (event) => event === "accepted",
      dispose: () => operations.push(["dispose", embed.domId]),
    };
    controllers.push(controller);
    return controller;
  });
  return { surface, operations, controllers };
}

const snapshot = {
  id: "title",
  name: "text",
  embedId: "title--harmony-native",
  properties: { text: "Hello" },
  visible: true,
  focused: false,
  revision: 1,
};
const embed = {
  domId: "title--harmony-native",
  embedId: "engine-1",
  surfaceId: "surface-1",
  width: 120,
  height: 30,
};

test("connects when the bridge mount arrives before ArkWeb lifecycle", () => {
  const value = fixture();
  value.surface.attach(snapshot, "Text", () => {});
  assert.deepEqual(value.surface.activeComponentIds(), []);
  value.surface.embedCreated(embed);
  assert.deepEqual(value.surface.activeComponentIds(), ["title"]);
  assert.deepEqual(value.operations, [
    ["update", embed.domId, "title", "Text"],
    ["layout", embed.domId, { x: 0, y: 0, width: 120, height: 30 }],
  ]);
});

test("connects when the ArkWeb lifecycle arrives before bridge mount", () => {
  const value = fixture();
  value.surface.embedCreated(embed);
  value.surface.attach(snapshot, "Text", () => {});
  assert.deepEqual(value.surface.activeComponentIds(), ["title"]);
});

test("updates, forwards gestures, and disposes without stale controllers", async () => {
  const value = fixture();
  value.surface.embedCreated(embed);
  value.surface.attach(snapshot, "Text", () => {});
  value.surface.update({ ...snapshot, revision: 2, properties: { text: "Updated" } });
  value.surface.layout("title", { x: 1, y: 2, width: 100, height: 20 });
  assert.equal(await value.surface.invoke("title", "focus", {}), "invoked:focus");
  assert.equal(value.surface.postTouchEvent("engine-1", "accepted"), true);
  value.surface.embedDestroyed(embed.domId);
  assert.deepEqual(value.surface.activeComponentIds(), []);
  value.surface.detach("title");
  assert.equal(value.operations.filter((entry) => entry[0] === "dispose").length, 1);
});

test("coalesces structural notifications within a frame batch", () => {
  const value = fixture();
  let changes = 0;
  value.surface.onChange(() => changes++);
  value.surface.beginBatch();
  value.surface.embedCreated(embed);
  value.surface.attach(snapshot, "Text", () => {});
  assert.equal(changes, 0);
  value.surface.endBatch();
  assert.equal(changes, 1);
  assert.throws(() => value.surface.endBatch(), /not active/u);
});
