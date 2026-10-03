import assert from "node:assert/strict";
import test from "node:test";
import { NativeBridgeDispatcher } from "../main/ets/bridge/NativeBridgeDispatcher.ts";
import { NativeBridgeSecurity } from "../main/ets/bridge/NativeBridgeSecurity.ts";
import { NativeElementContractRegistry } from "../main/ets/components/NativeElementContractRegistry.ts";

const custom = {
  name: "task-card",
  aliases: ["work-card"],
  properties: [{ name: "title", type: "STRING", required: true }],
  methods: [{ name: "focus" }],
  events: [{ name: "select", payload: "JSON" }],
};

test("registers custom contracts without allowing built-in replacement", () => {
  const registry = new NativeElementContractRegistry();
  const unregister = registry.register(custom, "tasks-har");
  assert.equal(registry.get("work-card").name, "task-card");
  assert.throws(() => registry.register(custom, "other-har"), /Duplicate/u);
  assert.throws(() => registry.register({ ...custom, name: "text" }, "other-har"), /hyphen/u);
  unregister();
  unregister();
  assert.equal(registry.get("task-card"), undefined);
  assert.ok(registry.get("text"));
});

test("cleans aliases by owner and preserves unrelated and built-in contracts", () => {
  const registry = new NativeElementContractRegistry();
  const unregister = registry.register(custom, "tasks-har");
  registry.removeOwner("other-har");
  assert.equal(registry.has("task-card"), true);
  registry.removeOwner("core");
  assert.equal(registry.has("text"), true);
  registry.removeOwner("tasks-har");
  assert.equal(registry.has("task-card"), false);
  assert.equal(registry.has("work-card"), false);
  unregister();
});

test("supports contracts without aliases and exposes canonical names", () => {
  const registry = new NativeElementContractRegistry();
  const contract = { ...custom, name: "plain-card", aliases: undefined };
  const unregister = registry.register(contract, "plain-har");
  assert.equal(registry.get("plain-card"), contract);
  assert.equal(registry.get("missing-card"), undefined);
  assert.equal(registry.names().includes("plain-card"), true);
  registry.removeOwner("plain-har");
  assert.equal(registry.has("plain-card"), false);
  unregister();
  registry.register(contract, "plain-har")();
  assert.equal(registry.has("plain-card"), false);
});

test("rejects missing owners and duplicate canonical or alias names", () => {
  const registry = new NativeElementContractRegistry();
  assert.throws(() => registry.register(custom, ""), /owner is required/u);
  assert.throws(
    () => registry.register({ ...custom, aliases: [custom.name] }, "tasks-har"),
    /Duplicate/u,
  );
  registry.register(custom, "tasks-har");
  assert.throws(
    () => registry.register({ ...custom, name: "other-card", aliases: ["work-card"] }, "other-har"),
    /Duplicate/u,
  );
});

test("subjects custom elements and children to bridge validation", async () => {
  const registry = new NativeElementContractRegistry();
  registry.register(custom, "tasks-har");
  const calls = [];
  const replies = [];
  const dispatcher = new NativeBridgeDispatcher(
    new NativeBridgeSecurity("https://example.com", "session"),
    { component: { invoke: (...args) => calls.push(args) } },
    (reply) => replies.push(reply),
    registry,
  );
  const send = (id, props) => dispatcher.receive(JSON.stringify({
    protocol: 1,
    id,
    target: "component",
    method: "mount",
    session: "session",
    params: { id, name: "task-card", props },
  }), "https://example.com/page");
  send("valid", { title: "Ship" });
  send("missing", {});
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls.length, 1);
  assert.equal(replies.find((reply) => reply.id === "valid").ok, true);
  assert.equal(replies.find((reply) => reply.id === "missing").error.code, "invalid_property");
});
