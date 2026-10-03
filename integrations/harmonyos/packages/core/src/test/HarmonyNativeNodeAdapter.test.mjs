import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyNativeNodeAdapter } from "../main/ets/nodes/HarmonyNativeNodeAdapter.ts";

test("projects stable component models onto the Harmony surface", async () => {
  const operations = [];
  const surface = {
    beginBatch: () => operations.push("begin"),
    endBatch: () => operations.push("end"),
    attach: (snapshot, primitive) => operations.push(["attach", snapshot.id, primitive, snapshot.embedId]),
    update: (snapshot) => operations.push(["update", snapshot.id, snapshot.revision, snapshot.visible]),
    layout: (id, rect) => operations.push(["layout", id, rect]),
    invoke: (id, method) => operations.push(["invoke", id, method]),
    detach: (id) => operations.push(["detach", id]),
  };
  const adapter = new HarmonyNativeNodeAdapter(surface);
  adapter.beginBatch();
  const node = adapter.create("title", "text", "embed-title", () => {});
  adapter.update(node, { text: "Hello" });
  adapter.layout(node, { x: 1, y: 2, width: 3, height: 4 });
  adapter.setVisible(node, true);
  await adapter.invoke(node, "focus", {} ).catch((error) => {
    assert.equal(error.code, "unknown_method");
  });
  adapter.dispose(node);
  adapter.endBatch();
  assert.deepEqual(operations, [
    "begin",
    ["attach", "title", "Text", "embed-title"],
    ["update", "title", 1, false],
    ["layout", "title", { x: 1, y: 2, width: 3, height: 4 }],
    ["update", "title", 2, true],
    ["detach", "title"],
    "end",
  ]);
});

test("invokes declared methods on both model and surface", async () => {
  const calls = [];
  const adapter = new HarmonyNativeNodeAdapter({
    beginBatch() {},
    endBatch() {},
    attach() {},
    update() {},
    layout() {},
    invoke: (id, method, args) => {
      calls.push([id, method, args]);
      return "surface-result";
    },
    detach() {},
  });
  const node = adapter.create("field", "text-field", null, () => {});
  assert.equal(await adapter.invoke(node, "focus", { selectAll: true }), "surface-result");
  assert.deepEqual(calls, [["field", "focus", { selectAll: true }]]);
});

test("uses registered contracts and renderers for custom elements", () => {
  const attached = [];
  const contract = {
    name: "acme-meter",
    properties: [{ name: "value", type: "FLOAT", default: 5 }],
    methods: [],
    events: [{ name: "change" }],
  };
  const adapter = new HarmonyNativeNodeAdapter(
    {
      beginBatch() {},
      endBatch() {},
      attach(snapshot, primitive, emit) {
        attached.push([snapshot, primitive]);
        emit("change", { value: 8 });
      },
      update() {},
      layout() {},
      invoke() {},
      detach() {},
    },
    (name) => name === "acme-meter" ? "AcmeMeter" : undefined,
    (name) => name === "acme-meter" ? contract : undefined,
  );
  const events = [];
  adapter.create("meter", "acme-meter", "meter-embed", (event, data) => {
    events.push([event, data]);
  });
  assert.equal(attached[0][0].name, "acme-meter");
  assert.equal(attached[0][0].properties.value, 5);
  assert.equal(attached[0][1], "AcmeMeter");
  assert.deepEqual(events, [["change", { value: 8 }]]);
});

test("rejects missing renderers and contracts and falls back to model results", async () => {
  const surface = {
    beginBatch() {}, endBatch() {}, attach() {}, update() {}, layout() {}, detach() {},
    invoke() { return undefined; },
  };
  const contract = {
    name: "custom-field",
    properties: [],
    methods: [{ name: "focus" }],
    events: [{ name: "focus" }],
  };
  assert.throws(
    () => new HarmonyNativeNodeAdapter(surface, () => undefined, () => contract)
      .create("missing", "missing-widget", null, () => {}),
    /renderer is registered/u,
  );
  assert.throws(
    () => new HarmonyNativeNodeAdapter(surface, () => "Custom", () => undefined)
      .create("missing", "missing-widget", null, () => {}),
    /contract is registered/u,
  );
  const adapter = new HarmonyNativeNodeAdapter(surface, () => "Custom", () => contract);
  const node = adapter.create("field", "custom-field", null, () => {});
  assert.deepEqual(await adapter.invoke(node, "focus", {}), { focused: true });
});
