import assert from "node:assert/strict";
import test from "node:test";
import {
  NativeBridgeDispatcher,
  NativeBridgeFailure,
} from "../main/ets/bridge/NativeBridgeDispatcher.ts";
import { NativeBridgeSecurity } from "../main/ets/bridge/NativeBridgeSecurity.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function request(id, target, method, params = null, session = "session-1") {
  return JSON.stringify({ protocol: 1, id, target, method, params, session });
}

function fixture(overrides = {}) {
  const replies = [];
  const calls = [];
  const handlers = {
    platform: {
      invoke(method, parameters) {
        calls.push({ target: "platform", method, parameters });
        return { platform: "harmonyos" };
      },
    },
    component: {
      invoke(method, parameters) {
        calls.push({ target: "component", method, parameters });
        return { mounted: method !== "unmount" };
      },
    },
    ...overrides,
  };
  const dispatcher = new NativeBridgeDispatcher(
    new NativeBridgeSecurity("https://example.com/app", "session-1"),
    handlers,
    (reply) => replies.push(reply),
  );
  return { dispatcher, replies, calls, handlers };
}

test("dispatches only catalogued capability methods", async () => {
  const { dispatcher, replies, calls } = fixture();
  dispatcher.receive(request("1", "platform", "status"), "https://example.com/page");
  dispatcher.receive(request("2", "platform", "missing"), "https://example.com/page");
  dispatcher.receive(request("3", "missing", "status"), "https://example.com/page");
  await tick();
  assert.deepEqual(calls, [{ target: "platform", method: "status", parameters: null }]);
  assert.equal(replies.find((reply) => reply.id === "1").result.platform, "harmonyos");
  assert.equal(replies.find((reply) => reply.id === "2").error.code, "unknown_method");
  assert.equal(replies.find((reply) => reply.id === "3").error.code, "unknown_target");
});

test("rejects unauthorized and duplicate active requests", async () => {
  let resolve;
  const pending = new Promise((done) => { resolve = done; });
  const { dispatcher, replies } = fixture({
    platform: { invoke: () => pending },
  });
  dispatcher.receive(request("denied", "platform", "status", null, "wrong"), "https://example.com");
  dispatcher.receive(request("same", "platform", "status"), "https://example.com");
  dispatcher.receive(request("same", "platform", "status"), "https://example.com");
  await tick();
  assert.equal(replies.find((reply) => reply.id === "denied").error.code, "unauthorized");
  assert.equal(replies.find((reply) => reply.id === "same").error.code, "invalid_message");
  resolve({ platform: "harmonyos" });
  await tick();
});

test("cancels owned work and interrupts it during destination disposal", async () => {
  const cancelled = [];
  const { dispatcher, replies } = fixture({
    platform: {
      invoke(_method, _parameters, context) {
        context.onCancel(() => cancelled.push(context.requestId));
        return new Promise(() => undefined);
      },
    },
  });
  dispatcher.receive(request("work", "platform", "status"), "https://example.com");
  await tick();
  dispatcher.receive(
    request("cancel", "bridge", "cancel", { id: "work" }),
    "https://example.com",
  );
  dispatcher.receive(request("work-2", "platform", "status"), "https://example.com");
  await tick();
  dispatcher.close();
  assert.deepEqual(cancelled, ["work", "work-2"]);
  assert.equal(replies.find((reply) => reply.id === "work").error.code, "cancelled");
  assert.equal(replies.find((reply) => reply.id === "cancel").result.cancelled, true);
  assert.equal(replies.find((reply) => reply.id === "work-2").error.code, "interrupted");
});

test("validates component types, properties, methods, and instance ownership", async () => {
  const { dispatcher, replies, calls } = fixture();
  dispatcher.receive(
    request("bad-element", "component", "mount", { id: "a", name: "missing", props: {} }),
    "https://example.com",
  );
  dispatcher.receive(
    request("bad-property", "component", "mount", {
      id: "b", name: "button", props: { enabled: "yes" },
    }),
    "https://example.com",
  );
  dispatcher.receive(
    request("mount", "component", "mount", {
      id: "button-1", name: "button", props: { text: "Open", enabled: true },
    }),
    "https://example.com",
  );
  await tick();
  dispatcher.receive(
    request("update", "component", "update", {
      id: "button-1", props: { text: "Close" },
    }),
    "https://example.com",
  );
  dispatcher.receive(
    request("invoke", "component", "invoke", { id: "button-1", method: "missing" }),
    "https://example.com",
  );
  await tick();
  assert.equal(replies.find((reply) => reply.id === "bad-element").error.code, "unknown_element");
  assert.equal(replies.find((reply) => reply.id === "bad-property").error.code, "invalid_property");
  assert.equal(replies.find((reply) => reply.id === "invoke").error.code, "unknown_method");
  assert.deepEqual(calls.map((call) => call.method), ["mount", "update"]);
});

test("accepts normalized style transport metadata", async () => {
  const { dispatcher, replies, calls } = fixture();
  dispatcher.receive(request("styled", "component", "mount", {
    id: "title",
    name: "text",
    props: { text: "Hello", style: { color: "#112233", padding: 8 } },
  }), "https://example.com");
  await tick();
  assert.equal(calls.length, 1);
  assert.equal(replies[0].ok, true);
});

test("validates every nested native child descriptor", async () => {
  const { dispatcher, replies, calls } = fixture();
  dispatcher.receive(request("valid-tree", "component", "mount", {
    id: "root",
    name: "column",
    props: {
      children: [{ key: "title", name: "text", props: { text: "Hello", style: {} } }],
    },
  }), "https://example.com");
  dispatcher.receive(request("unknown-child", "component", "mount", {
    id: "bad",
    name: "column",
    props: { children: [{ key: "bad", name: "unknown", props: {} }] },
  }), "https://example.com");
  dispatcher.receive(request("missing-key", "component", "mount", {
    id: "bad-key",
    name: "column",
    props: { children: [{ name: "text", props: { text: "No key" } }] },
  }), "https://example.com");
  await tick();
  assert.equal(calls.filter((call) => call.method === "mount").length, 1);
  assert.equal(replies.find((reply) => reply.id === "valid-tree").ok, true);
  assert.equal(replies.find((reply) => reply.id === "unknown-child").error.code, "invalid_property");
  assert.equal(replies.find((reply) => reply.id === "missing-key").error.code, "invalid_property");
});

test("sanitizes provider failures while preserving declared bridge failures", async () => {
  const { dispatcher, replies } = fixture({
    platform: {
      invoke(method) {
        if (method === "status") throw new Error("private stack detail");
        throw new NativeBridgeFailure("denied", "Permission denied");
      },
    },
  });
  dispatcher.receive(request("internal", "platform", "status"), "https://example.com");
  await tick();
  assert.deepEqual(replies[0].error, { code: "internal", message: "Native operation failed" });
});
