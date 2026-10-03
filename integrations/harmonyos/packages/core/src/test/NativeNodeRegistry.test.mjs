import assert from "node:assert/strict";
import test from "node:test";
import { NativeNodeRegistry } from "../main/ets/nodes/NativeNodeRegistry.ts";

function fixture() {
  const operations = [];
  const events = [];
  const frames = [];
  let eventCallback;
  const node = { id: "node" };
  const adapter = {
    beginBatch: () => operations.push("begin"),
    endBatch: () => operations.push("end"),
    create(id, name, embedId, emit) {
      operations.push(["create", id, name, embedId]);
      eventCallback = emit;
      return node;
    },
    update: (_node, properties) => operations.push(["update", properties]),
    layout: (_node, rect) => operations.push(["layout", rect]),
    setVisible: (_node, visible) => operations.push(["visible", visible]),
    invoke: (_node, method, args) => {
      operations.push(["invoke", method, args]);
      return "invoked";
    },
    dispose: () => operations.push("dispose"),
  };
  const registry = new NativeNodeRegistry(
    adapter,
    { schedule: (callback) => frames.push(callback) },
    (event) => events.push(event),
  );
  const contexts = [];
  function context(id) {
    const actions = [];
    const value = {
      requestId: id,
      cancelled: false,
      onCancel: (action) => actions.push(action),
      cancel() {
        value.cancelled = true;
        actions.forEach((action) => action());
      },
    };
    contexts.push(value);
    return value;
  }
  async function flush() {
    frames.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
  }
  return { registry, operations, events, frames, context, contexts, flush, emit: (...args) => eventCallback(...args) };
}

test("mounts cloaked and reveals only after update and layout", async () => {
  const value = fixture();
  const result = value.registry.invoke(
    "mount",
    {
      id: "title",
      name: "text",
      embedId: "title--harmony-native",
      props: { text: "Ready" },
      rect: { x: 4, y: 8, width: 100, height: 24 },
    },
    value.context("mount"),
  );
  assert.deepEqual(value.operations, []);
  await value.flush();
  assert.deepEqual(await result, { mounted: true, id: "title", name: "text" });
  assert.deepEqual(value.operations, [
    "begin",
    ["create", "title", "text", "title--harmony-native"],
    ["visible", false],
    ["update", { text: "Ready" }],
    ["layout", { x: 4, y: 8, width: 100, height: 24 }],
    ["visible", true],
    "end",
  ]);
});

test("keeps node identity across updates and method calls", async () => {
  const value = fixture();
  const mount = value.registry.invoke(
    "mount",
    { id: "field", name: "text-field", props: { label: "Name" } },
    value.context("mount"),
  );
  await value.flush();
  await mount;
  const update = value.registry.invoke(
    "update",
    { id: "field", props: { value: "Ada" }, rect: { x: 0, y: 0, width: 200, height: 48 } },
    value.context("update"),
  );
  const invoke = value.registry.invoke(
    "invoke",
    { id: "field", method: "focus", args: {} },
    value.context("invoke"),
  );
  await value.flush();
  assert.deepEqual(await update, { mounted: true, id: "field" });
  assert.deepEqual(await invoke, { id: "field", result: "invoked" });
  assert.equal(value.operations.filter((operation) => Array.isArray(operation) && operation[0] === "create").length, 1);
});

test("forwards events only while their node remains mounted", async () => {
  const value = fixture();
  const mount = value.registry.invoke(
    "mount",
    { id: "button", name: "button", props: { text: "Open" } },
    value.context("mount"),
  );
  await value.flush();
  await mount;
  value.emit("click", { value: 1 });
  assert.deepEqual(value.events, [{
    target: "component",
    event: "click",
    data: { id: "button", name: "button", value: 1 },
  }]);
  const unmount = value.registry.invoke("unmount", { id: "button" }, value.context("unmount"));
  await value.flush();
  await unmount;
  value.emit("click", { value: 2 });
  assert.equal(value.events.length, 1);
});

test("rejects cancelled frame work without touching the adapter", async () => {
  const value = fixture();
  const context = value.context("mount");
  const result = value.registry.invoke(
    "mount",
    { id: "title", name: "text", props: { text: "Late" } },
    context,
  );
  context.cancel();
  await value.flush();
  await assert.rejects(result, (error) => error.code === "cancelled");
  assert.deepEqual(value.operations, ["begin", "end"]);
});

test("disposes all nodes and rejects queued work when closed", async () => {
  const value = fixture();
  const mount = value.registry.invoke(
    "mount",
    { id: "title", name: "text", props: { text: "Ready" } },
    value.context("mount"),
  );
  await value.flush();
  await mount;
  const queued = value.registry.invoke(
    "update",
    { id: "title", props: { text: "Never" } },
    value.context("update"),
  );
  value.registry.close();
  value.registry.close();
  await assert.rejects(queued, (error) => error.code === "interrupted");
  assert.equal(value.operations.filter((operation) => operation === "dispose").length, 1);
  assert.throws(
    () => value.registry.invoke("unmount", { id: "title" }, value.context("late")),
    (error) => error.code === "interrupted",
  );
});
