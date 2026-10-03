import assert from "node:assert/strict";
import test from "node:test";
import {
  NativeBridgeDispatcher,
  NativeBridgeFailure,
} from "../main/ets/bridge/NativeBridgeDispatcher.ts";
import { NativeBridgeSecurity } from "../main/ets/bridge/NativeBridgeSecurity.ts";
import { NativeElementContractRegistry } from "../main/ets/components/NativeElementContractRegistry.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const message = (id, target, method, params = null) => JSON.stringify({
  protocol: 1,
  id,
  target,
  method,
  params,
  session: "session",
});

function createDispatcher(handlers, elements = undefined) {
  const replies = [];
  const dispatcher = new NativeBridgeDispatcher(
    new NativeBridgeSecurity("https://example.com/app", "session"),
    handlers,
    (reply) => replies.push(reply),
    elements,
  );
  const send = (id, target, method, params = null) => {
    dispatcher.receive(message(id, target, method, params), "https://example.com/page");
  };
  return { dispatcher, replies, send };
}

test("rejects every malformed component lifecycle operation", async () => {
  const { dispatcher, replies, send } = createDispatcher({
    component: { invoke: () => ({ accepted: true }) },
  });
  send("method", "component", "missing", { id: "node" });
  send("id", "component", "mount", { name: "text", props: {} });
  send("name", "component", "mount", { id: "node", props: {} });
  send("unknown", "component", "update", { id: "unknown", props: {} });
  send("mount", "component", "mount", { id: "node", name: "text", props: { text: "One" } });
  send("field", "component", "mount", { id: "field", name: "text-field", props: {} });
  await tick();
  send("type", "component", "update", { id: "node", name: "button", props: {} });
  send("invoke-params", "component", "invoke", { id: "node" });
  send("invoke-valid", "component", "invoke", { id: "field", method: "focus" });
  send("no-props", "component", "update", { id: "field" });
  send("unmount", "component", "unmount", { id: "node" });
  await tick();
  send("after-unmount", "component", "update", { id: "node", props: {} });
  await tick();
  for (const id of ["method", "id", "name", "unknown", "type", "invoke-params", "after-unmount"]) {
    assert.equal(replies.find((reply) => reply.id === id).ok, false, id);
  }
  assert.equal(replies.find((reply) => reply.id === "unmount").ok, true);
  assert.equal(replies.find((reply) => reply.id === "invoke-valid").ok, true);
  assert.equal(replies.find((reply) => reply.id === "no-props").ok, true);
  dispatcher.close();
});

test("validates every native property representation and nested tree limit", async () => {
  const elements = new NativeElementContractRegistry();
  elements.register({
    name: "typed-widget",
    properties: [
      { name: "booleanValue", type: "BOOLEAN", required: true },
      { name: "floatValue", type: "FLOAT" },
      { name: "integerValue", type: "INTEGER" },
      { name: "colorValue", type: "COLOR" },
      { name: "stringValue", type: "STRING" },
      { name: "listValue", type: "STRING_LIST" },
      { name: "jsonValue", type: "JSON" },
      { name: "nullableValue", type: "STRING", nullable: true },
    ],
    methods: [],
    events: [],
  }, "coverage");
  const { replies, send } = createDispatcher({
    component: { invoke: () => ({ accepted: true }) },
  }, elements);
  send("valid-types", "component", "mount", {
    id: "typed",
    name: "typed-widget",
    props: {
      booleanValue: true,
      floatValue: 1.5,
      integerValue: 2,
      colorValue: "#123456",
      stringValue: "value",
      listValue: ["one", "two"],
      jsonValue: { nested: true },
      nullableValue: null,
    },
  });
  send("bad-float", "component", "mount", {
    id: "bad-float", name: "typed-widget", props: { booleanValue: true, floatValue: "1" },
  });
  send("bad-integer", "component", "mount", {
    id: "bad-integer", name: "typed-widget", props: { booleanValue: true, integerValue: 1.5 },
  });
  send("bad-list", "component", "mount", {
    id: "bad-list", name: "typed-widget", props: { booleanValue: true, listValue: [1] },
  });
  send("bad-list-container", "component", "mount", {
    id: "bad-list-container", name: "typed-widget", props: { booleanValue: true, listValue: "one" },
  });
  send("bad-null", "component", "mount", {
    id: "bad-null", name: "typed-widget", props: { booleanValue: null },
  });
  send("children-array", "component", "mount", {
    id: "children-array", name: "column", props: { children: {} },
  });
  send("child-record", "component", "mount", {
    id: "child-record", name: "column", props: { children: [null] },
  });
  send("child-name", "component", "mount", {
    id: "child-name", name: "column", props: { children: [{ name: 1, key: "one", props: {} }] },
  });
  send("child-key", "component", "mount", {
    id: "child-key", name: "column", props: { children: [{ name: "text", key: "", props: {} }] },
  });
  send("child-props", "component", "mount", {
    id: "child-props", name: "column", props: { children: [{ name: "text", key: "one", props: null }] },
  });
  send("style", "component", "mount", {
    id: "style", name: "text", props: { text: "value", style: "invalid" },
  });
  let nested = {};
  for (let depth = 0; depth < 66; depth += 1) {
    nested = { children: [{ name: "column", key: `depth-${depth}`, props: nested }] };
  }
  send("tree-limit", "component", "mount", { id: "tree", name: "column", props: nested });
  const wideChildren = Array.from({ length: 2049 }, (_, index) => ({
    name: "column", key: `wide-${index}`, props: {},
  }));
  send("count-limit", "component", "mount", {
    id: "wide-tree", name: "column", props: { children: wideChildren },
  });
  await tick();
  assert.equal(replies.find((reply) => reply.id === "valid-types").ok, true);
  for (const id of [
    "bad-float", "bad-integer", "bad-list", "bad-list-container", "bad-null",
    "children-array", "child-record", "child-name", "child-key", "child-props",
    "style", "tree-limit", "count-limit",
  ]) {
    assert.equal(replies.find((reply) => reply.id === id).error.code, "invalid_property", id);
  }
});

test("replies only when a malformed request carries a usable id", () => {
  const { dispatcher, replies } = createDispatcher({});
  dispatcher.receive("not-json", "https://example.com/page");
  dispatcher.receive(JSON.stringify({ id: "versioned" }), "https://example.com/page");
  assert.equal(replies.length, 1);
  assert.equal(replies[0].id, "versioned");
  assert.equal(replies[0].error.code, "protocol_mismatch");
});

test("validates bridge cancellation parameters and missing operations", () => {
  const { replies, send } = createDispatcher({});
  send("missing-id", "bridge", "cancel", {});
  send("missing-work", "bridge", "cancel", { id: "absent" });
  send("unknown-method", "bridge", "unknown", {});
  assert.equal(replies.find((reply) => reply.id === "missing-id").error.code, "invalid_params");
  assert.deepEqual(replies.find((reply) => reply.id === "missing-work").result, {
    id: "absent", cancelled: false,
  });
  assert.equal(replies.find((reply) => reply.id === "unknown-method").error.code, "unknown_method");
});

test("preserves declared failures and sanitizes every other thrown value", async () => {
  const failures = [
    new NativeBridgeFailure("denied", "Denied"),
    Object.assign(new Error("Interrupted"), { code: "interrupted" }),
    Object.assign(new Error("Private"), { code: "private" }),
    new Error("Private"),
    "Private",
  ];
  for (const [index, failure] of failures.entries()) {
    const { replies, send } = createDispatcher({
      platform: { invoke: () => { throw failure; } },
    });
    send(`failure-${index}`, "platform", "status");
    await tick();
    const reply = replies[0];
    assert.equal(reply.ok, false);
    assert.equal(reply.error.code, index < 2 ? failure.code : "internal");
  }
});

test("exposes cancellation state and ignores late completion", async () => {
  let context;
  let resolve;
  const operation = new Promise((done) => { resolve = done; });
  const { dispatcher, replies, send } = createDispatcher({
    platform: {
      invoke(_method, _params, invocation) {
        context = invocation;
        return operation;
      },
    },
  });
  send("work", "platform", "status");
  await tick();
  assert.equal(context.cancelled, false);
  send("cancel", "bridge", "cancel", { id: "work" });
  assert.equal(context.cancelled, true);
  let lateCancellation = false;
  context.onCancel(() => { lateCancellation = true; });
  resolve({ late: true });
  await tick();
  assert.equal(lateCancellation, false);
  assert.equal(replies.filter((reply) => reply.id === "work").length, 1);
  dispatcher.close();
  dispatcher.close();

  let reject;
  const rejection = new Promise((_resolve, fail) => { reject = fail; });
  const rejected = createDispatcher({ platform: { invoke: () => rejection } });
  rejected.send("rejected-work", "platform", "status");
  await tick();
  rejected.send("reject-cancel", "bridge", "cancel", { id: "rejected-work" });
  reject(new Error("late failure"));
  await tick();
  assert.equal(rejected.replies.filter((reply) => reply.id === "rejected-work").length, 1);
});

test("closes each distinct provider once and rejects known unavailable targets", async () => {
  let closes = 0;
  const shared = { invoke: () => null, close: () => { closes += 1; } };
  const { dispatcher, replies, send } = createDispatcher({ platform: shared, connectivity: shared });
  send("unavailable", "media", "status");
  await tick();
  dispatcher.close();
  assert.equal(closes, 1);
  assert.equal(replies[0].error.code, "unavailable");
});
