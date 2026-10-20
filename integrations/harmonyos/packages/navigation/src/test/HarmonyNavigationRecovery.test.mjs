import assert from "node:assert/strict";
import test from "node:test";

import { HarmonyNavigationRecovery } from "../main/ets/HarmonyNavigationRecovery.ts";

const entry = (id, location = `/${id}`, state = {}) => ({
  id,
  location,
  modal: id === "dialog",
  transition: id === "root" ? "none" : "slide",
  state,
});

test("restores named stacks without retaining arbitrary route state", () => {
  const source = new HarmonyNavigationRecovery();
  const releaseMain = source.register("main", () => [
    entry("root", "resource://rawfile/index.html", { token: "secret" }),
    entry("feed", "/feed", { token: "secret" }),
    entry("dialog", "/compose", { draft: "secret" }),
  ], (current) => current.id === "feed"
    ? [{ id: "feed-scroll", name: "scroll", state: { x: 0, y: 240 } }]
    : []);
  const releaseAdmin = source.register("admin", () => [entry("root", "https://example.test/admin")]);
  const snapshot = source.snapshot();
  assert.equal(typeof snapshot, "string");
  assert.equal(snapshot.includes("secret"), false);

  const restored = new HarmonyNavigationRecovery();
  restored.restore(snapshot);
  assert.deepEqual(restored.claim("main", entry("root", "resource://rawfile/index.html")), [
    entry("root", "resource://rawfile/index.html"),
    { ...entry("restored-1", "/feed"), id: "restored-1" },
    { ...entry("dialog", "/compose"), id: "restored-2" },
  ]);
  assert.deepEqual(restored.takeNativeState("main", "restored-1"), [
    { id: "feed-scroll", name: "scroll", state: { x: 0, y: 240 } },
  ]);
  assert.deepEqual(restored.takeNativeState("main", "restored-1"), []);
  assert.deepEqual(restored.claim("admin", entry("root", "https://example.test/admin")), [
    entry("root", "https://example.test/admin"),
  ]);
  assert.deepEqual(restored.claim("main", entry("root", "resource://rawfile/index.html")), [
    entry("root", "resource://rawfile/index.html"),
  ]);
  releaseMain();
  releaseMain();
  releaseAdmin();
  assert.equal(source.snapshot(), undefined);
});

test("rejects malformed, unsafe, stale, duplicate, and oversized recovery data", () => {
  const recovery = new HarmonyNavigationRecovery();
  const root = entry("root", "/");
  for (const value of [
    undefined,
    "not json",
    JSON.stringify({ version: 2, scopes: [] }),
    JSON.stringify({ version: 1, scopes: "wrong" }),
    JSON.stringify({ version: 1, scopes: Array.from({ length: 5 }, () => ({})) }),
    JSON.stringify({ version: 1, scopes: [{ key: "bad key", entries: [entry("root", "/")] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: Array.from({ length: 33 }, () => entry("x")) }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "//evil.test", modal: false, transition: "none" }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: true, transition: "none" }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "spin" }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none", nativeState: {} }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none", nativeState: [null] }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none", nativeState: [{}] }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none", nativeState: [{ id: "scroll" }] }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none", nativeState: [{ id: "field", name: "text-field", state: { value: "secret" } }] }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none", nativeState: [{ id: "scroll", name: "scroll", state: { x: -1, y: 0 } }] }] }] }),
    JSON.stringify({ version: 1, scopes: [{ key: "main", entries: [{ location: "/", modal: false, transition: "none" }] }, { key: "main", entries: [{ location: "/", modal: false, transition: "none" }] }] }),
    "x".repeat(40001),
  ]) {
    recovery.restore(value);
    assert.deepEqual(recovery.claim("main", root), [root]);
  }
  recovery.restore(JSON.stringify({
    version: 1,
    scopes: [{ key: "main", entries: [{ location: "/old", modal: false, transition: "none" }] }],
  }));
  assert.deepEqual(recovery.claim("main", root), [root]);
});

test("enforces active scope and snapshot bounds", () => {
  const recovery = new HarmonyNavigationRecovery();
  assert.throws(() => recovery.register("bad key", () => []), /key is invalid/u);
  assert.throws(() => recovery.claim("bad key", entry("root")), /key is invalid/u);
  const release = recovery.register("main", () => [entry("root")]);
  assert.throws(() => recovery.register("main", () => []), /already active/u);
  assert.equal(typeof recovery.snapshot(), "string");
  release();

  const empty = recovery.register("empty", () => []);
  assert.equal(recovery.snapshot(), undefined);
  empty();
  const deep = recovery.register("deep", () => Array.from({ length: 33 }, (_, index) => entry(String(index))));
  assert.equal(recovery.snapshot(), undefined);
  deep();
  const unsafe = recovery.register("unsafe", () => [entry("root", "//evil.test")]);
  assert.equal(recovery.snapshot(), undefined);
  unsafe();
  const oversized = recovery.register("large", () => [entry("root", `/${"x".repeat(1024)}`)]);
  assert.equal(recovery.snapshot(), undefined);
  oversized();

  const releases = Array.from({ length: 5 }, (_, index) =>
    recovery.register(`scope-${String(index)}`, () => [entry("root")])
  );
  assert.equal(recovery.snapshot(), undefined);
  for (const dispose of releases) dispose();

  const largeReleases = Array.from({ length: 4 }, (_, scope) =>
    recovery.register(`large-${String(scope)}`, () =>
      Array.from({ length: 32 }, (_, index) =>
        entry(String(index), `/${String(index)}-${"x".repeat(1000)}`)
      )
    )
  );
  assert.equal(recovery.snapshot(), undefined);
  for (const dispose of largeReleases) dispose();
});
