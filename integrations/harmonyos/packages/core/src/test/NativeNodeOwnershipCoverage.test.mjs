import assert from "node:assert/strict";
import test from "node:test";
import { NativeNodeRegistry } from "../main/ets/nodes/NativeNodeRegistry.ts";
import { SameLayerSurface } from "../main/ets/nodes/SameLayerSurface.ts";

const context = (id, cancelled = false) => ({
  requestId: id,
  cancelled,
  onCancel() {},
});

function nodeFixture() {
  const frames = [];
  const events = [];
  const operations = [];
  const emitters = new Map();
  const adapter = {
    beginBatch: () => operations.push("begin"),
    endBatch: () => operations.push("end"),
    create(id, name, embedId, emit) {
      emitters.set(id, emit);
      operations.push(["create", id, name, embedId]);
      return { id, name };
    },
    update: (node, props) => operations.push(["update", node.id, props]),
    layout: (node, rect) => operations.push(["layout", node.id, rect]),
    setVisible: (node, visible) => operations.push(["visible", node.id, visible]),
    invoke: (_node, method, args) => ({ method, args }),
    dispose: (node) => operations.push(["dispose", node.id]),
  };
  const registry = new NativeNodeRegistry(
    adapter,
    { schedule: (callback) => frames.push(callback) },
    (event) => events.push(event),
  );
  const flush = async () => {
    frames.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  return { registry, frames, events, operations, emitters, flush };
}

test("validates node operations before scheduling a frame", () => {
  const value = nodeFixture();
  assert.throws(
    () => value.registry.invoke("missing", { id: "node" }, context("method")),
    (error) => error.code === "unknown_method",
  );
  assert.throws(
    () => value.registry.invoke("mount", null, context("id")),
    (error) => error.code === "invalid_params",
  );
  assert.throws(
    () => value.registry.invoke("mount", { id: "node" }, context("name")),
    (error) => error.code === "invalid_params",
  );
  for (const embedId of ["", 1]) {
    assert.throws(
      () => value.registry.invoke("mount", { id: "node", name: "text", embedId }, context("embed")),
      (error) => error.code === "invalid_params",
    );
  }
});

test("preserves same-type nodes and rejects type changes and unknown instances", async () => {
  const value = nodeFixture();
  const first = value.registry.invoke("mount", { id: "node", name: "text", props: null }, context("first"));
  await value.flush();
  await first;
  const remount = value.registry.invoke("mount", { id: "node", name: "text", embedId: null }, context("again"));
  await value.flush();
  await remount;
  assert.equal(value.operations.filter((entry) => Array.isArray(entry) && entry[0] === "create").length, 1);

  const changed = value.registry.invoke("mount", { id: "node", name: "button" }, context("changed"));
  const unknownUpdate = value.registry.invoke("update", { id: "unknown", props: [] }, context("update"));
  const unknownInvoke = value.registry.invoke("invoke", { id: "unknown", method: "focus", args: [] }, context("invoke"));
  const absentUnmount = value.registry.invoke("unmount", { id: "absent" }, context("unmount"));
  await value.flush();
  await assert.rejects(changed, (error) => error.code === "invalid_params");
  await assert.rejects(unknownUpdate, (error) => error.code === "unknown_instance");
  await assert.rejects(unknownInvoke, (error) => error.code === "unknown_instance");
  assert.deepEqual(await absentUnmount, { mounted: false, id: "absent" });
});

test("validates every rectangle coordinate and forwards default event data", async () => {
  for (const rect of [
    { y: 0, width: 1, height: 1 },
    { x: 0, width: 1, height: 1 },
    { x: 0, y: 0, height: 1 },
    { x: 0, y: 0, width: 1 },
    { x: 0, y: 0, width: -1, height: 1 },
    { x: 0, y: 0, width: 1, height: -1 },
    { x: Number.POSITIVE_INFINITY, y: 0, width: 1, height: 1 },
  ]) {
    const value = nodeFixture();
    assert.throws(
      () => value.registry.invoke("mount", { id: "node", name: "text", rect }, context("rect")),
      (error) => error.code === "invalid_params",
    );
  }
  const value = nodeFixture();
  const mounted = value.registry.invoke("mount", {
    id: "node", name: "text", rect: { x: 0, y: 0, width: 0, height: 0 },
  }, context("valid"));
  await value.flush();
  await mounted;
  value.emitters.get("node")("change");
  assert.deepEqual(value.events[0].data, { id: "node", name: "text" });
  value.registry.close();
  value.emitters.get("node")("change", { stale: true });
  assert.equal(value.events.length, 1);
});

test("ignores a scheduled flush after close", async () => {
  const value = nodeFixture();
  const pending = value.registry.invoke("mount", { id: "node", name: "text" }, context("pending"));
  value.registry.close();
  await assert.rejects(pending, (error) => error.code === "interrupted");
  await value.flush();
  assert.deepEqual(value.operations, ["begin", "end"]);
});

function surfaceFixture() {
  const operations = [];
  const surface = new SameLayerSurface((embed) => ({
    update: (snapshot) => operations.push(["update", embed.domId, snapshot.id]),
    layout: (rect) => operations.push(["layout", embed.domId, rect]),
    invoke: (method) => `result:${method}`,
    postTouchEvent: (event) => event === "accepted",
    dispose: () => operations.push(["dispose", embed.domId]),
  }));
  return { surface, operations };
}

const surfaceSnapshot = {
  id: "node",
  name: "text",
  embedId: "node-embed",
  properties: {},
  visible: true,
  focused: false,
  revision: 0,
};
const surfaceEmbed = {
  domId: "node-embed",
  embedId: "engine",
  surfaceId: "surface",
  width: 100,
  height: 40,
};

test("enforces surface ownership and supports disconnected components", async () => {
  const value = surfaceFixture();
  value.surface.attach(surfaceSnapshot, "Text", () => {});
  assert.throws(() => value.surface.attach(surfaceSnapshot, "Text", () => {}), /already attached/u);
  assert.equal(value.surface.controller("missing"), null);
  assert.equal(value.surface.controller("node"), null);
  assert.equal(value.surface.invoke("node", "focus", {}), undefined);
  value.surface.update({ ...surfaceSnapshot, revision: 1 });
  value.surface.layout("node", { x: 1, y: 2, width: 3, height: 4 });
  assert.throws(() => value.surface.update({ ...surfaceSnapshot, id: "missing" }), /Unknown/u);
  value.surface.embedCreated({ ...surfaceEmbed, domId: "other", embedId: "other-engine" });
  assert.equal(value.surface.postTouchEvent("missing", "accepted"), false);
  assert.equal(value.surface.postTouchEvent("other-engine", "accepted"), false);
  value.surface.detach("missing");
  value.surface.embedUpdated({ ...surfaceEmbed, domId: "missing" });
  value.surface.embedDestroyed("missing");
  value.surface.detach("node");
  assert.deepEqual(value.surface.activeComponentIds(), []);
});

test("reconnects replaced embeds and routes updates, gestures, and disposal", async () => {
  const value = surfaceFixture();
  value.surface.embedCreated(surfaceEmbed);
  value.surface.attach(surfaceSnapshot, "Text", () => {});
  value.surface.embedCreated({ ...surfaceEmbed, width: 120 });
  value.surface.embedUpdated({ ...surfaceEmbed, width: 140, height: 50 });
  assert.equal(await value.surface.invoke("node", "show", {}), "result:show");
  assert.equal(value.surface.postTouchEvent("engine", "rejected"), false);
  assert.equal(value.surface.postTouchEvent("engine", "accepted"), true);
  value.surface.embedDestroyed(surfaceEmbed.domId);
  assert.equal(value.surface.postTouchEvent("engine", "accepted"), false);
  value.surface.embedUpdated(surfaceEmbed);
  assert.equal(value.surface.activeComponentIds().includes("node"), true);
  value.surface.detach("node");
  assert.ok(value.operations.filter((entry) => entry[0] === "dispose").length >= 2);
});

test("supports components without embeds and nested structural batches", () => {
  const value = surfaceFixture();
  let firstChanges = 0;
  let secondChanges = 0;
  const removeFirst = value.surface.onChange(() => { firstChanges += 1; });
  const removeSecond = value.surface.onChange(() => { secondChanges += 1; });
  removeFirst();
  value.surface.beginBatch();
  value.surface.beginBatch();
  value.surface.attach({ ...surfaceSnapshot, id: "plain", embedId: null }, "Text", () => {});
  value.surface.endBatch();
  assert.equal(secondChanges, 0);
  value.surface.endBatch();
  assert.equal(firstChanges, 0);
  assert.equal(secondChanges, 1);
  removeSecond();
  value.surface.detach("plain");
  assert.equal(secondChanges, 1);
});
