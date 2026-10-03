import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyDestinationStore } from "../main/ets/HarmonyDestinationStore.ts";

function destination(name) {
  return { name, closes: 0, close() { this.closes += 1; } };
}

test("stages before push and preserves covered destinations", () => {
  const root = destination("root");
  const detail = destination("detail");
  const store = new HarmonyDestinationStore("root", root);
  assert.equal(store.stage("detail", () => detail), detail);
  assert.equal(store.stage("detail", () => destination("duplicate")), detail);
  assert.equal(store.resolve("detail"), detail);
  store.commitPush("detail");
  assert.equal(store.size, 2);
  assert.equal(root.closes, 0);
});

test("commits replacement and transfers root ownership", () => {
  const root = destination("root");
  const replacement = destination("replacement");
  const store = new HarmonyDestinationStore("root", root);
  store.stage("replacement", () => replacement);
  store.commitReplace("root", "replacement");
  assert.equal(store.root, "replacement");
  assert.equal(store.size, 1);
  assert.equal(root.closes, 1);
  store.commitReplace("replacement", "replacement");
  assert.equal(replacement.closes, 0);
});

test("pops only committed non-root destinations", () => {
  const root = destination("root");
  const detail = destination("detail");
  const store = new HarmonyDestinationStore("root", root);
  store.stage("detail", () => detail);
  store.commitPush("detail");
  store.commitPop("detail");
  assert.equal(detail.closes, 1);
  assert.throws(() => store.commitPop("root"));
  assert.throws(() => store.commitPop("missing"));
});

test("resets the stack and closes every removed destination once", () => {
  const root = destination("root");
  const detail = destination("detail");
  const next = destination("next");
  const store = new HarmonyDestinationStore("root", root);
  store.stage("detail", () => detail);
  store.commitPush("detail");
  store.stage("next", () => next);
  store.commitReset("next");
  assert.equal(store.root, "next");
  assert.equal(store.size, 1);
  assert.equal(root.closes, 1);
  assert.equal(detail.closes, 1);
});

test("aborts failed transitions without disturbing active destinations", () => {
  const root = destination("root");
  const failed = destination("failed");
  const store = new HarmonyDestinationStore("root", root);
  store.stage("failed", () => failed);
  store.abort("failed");
  store.abort("failed");
  assert.equal(failed.closes, 1);
  assert.equal(store.resolve("root"), root);
  assert.throws(() => store.resolve("failed"));
});

test("rejects invalid operations and closes all ownership once", () => {
  const shared = destination("shared");
  assert.throws(() => new HarmonyDestinationStore(" ", shared));
  const store = new HarmonyDestinationStore("root", shared);
  assert.throws(() => store.stage(" ", () => destination("invalid")));
  assert.throws(() => store.commitPush("missing"));
  assert.throws(() => store.commitReplace("missing", "root"));
  store.stage("staged", () => shared);
  store.close();
  store.close();
  assert.equal(shared.closes, 1);
  assert.throws(() => store.resolve("root"));
  assert.throws(() => store.stage("next", () => destination("next")));
  assert.throws(() => store.commitPush("root"));
  assert.throws(() => store.commitReplace("root", "root"));
  assert.throws(() => store.commitPop("root"));
  assert.throws(() => store.commitReset("root"));
  assert.throws(() => store.abort("root"));
});
