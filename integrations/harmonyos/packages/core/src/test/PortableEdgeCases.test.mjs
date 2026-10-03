import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyBrowserRoute } from "../../../browser/src/main/ets/HarmonyBrowserRoute.ts";
import {
  credentialCreationOptions,
  credentialRequestOptions,
} from "../../../credentials/src/main/ets/WebAuthnJson.ts";
import { HarmonyMap, mapProperties } from "../../../maps/src/main/ets/HarmonyMap.ts";
import { compileNativeElement } from "../../../native-elements-compiler/src/main/ets/NativeElementCompiler.ts";
import {
  HarmonyNavigation,
} from "../../../navigation/src/main/ets/HarmonyNavigation.ts";
import {
  HarmonyNavPathPlatform,
  navigationEntry,
} from "../../../navigation/src/main/ets/HarmonyNavPathPlatform.ts";
import { KeyedNativeCollection } from "../../../paging/src/main/ets/KeyedNativeCollection.ts";
import { NativeBridgeDispatcher } from "../main/ets/bridge/NativeBridgeDispatcher.ts";
import { NativeBridgeSecurity } from "../main/ets/bridge/NativeBridgeSecurity.ts";
import { NativeComponentModel } from "../main/ets/components/NativeComponentModel.ts";
import { NativeElementContractRegistry } from "../main/ets/components/NativeElementContractRegistry.ts";

const customContract = (overrides = {}) => ({
  name: "acme-widget",
  aliases: ["acme-alias"],
  properties: [{ name: "value", type: "STRING" }],
  methods: [{ name: "focus" }],
  events: [{ name: "focus" }],
  ...overrides,
});

test("rejects every invalid custom element contract shape", () => {
  const registry = new NativeElementContractRegistry();
  assert.throws(() => registry.register(customContract({ name: "widget" }), "owner"), /hyphen/u);
  assert.throws(() => registry.register(customContract(), ""), /owner/u);
  assert.throws(() => registry.register(customContract({ aliases: ["acme-widget"] }), "owner"), /Duplicate native element name/u);
  assert.throws(() => registry.register(customContract({ aliases: ["native-input"] }), "owner"), /Duplicate native element name/u);
  assert.throws(() => registry.register(customContract({ properties: [{ name: "bad name", type: "STRING" }] }), "owner"), /Invalid native element property/u);
  assert.throws(() => registry.register(customContract({ properties: [{ name: "value", type: "STRING" }, { name: "value", type: "STRING" }] }), "owner"), /Duplicate native element property/u);
  assert.throws(() => registry.register(customContract({ properties: [{ name: "value", type: "DATE" }] }), "owner"), /Invalid native element property type/u);
  assert.throws(() => registry.register(customContract({ methods: [{ name: "bad name" }] }), "owner"), /Invalid native element method/u);
  assert.throws(() => registry.register(customContract({ events: [{ name: "open" }, { name: "open" }] }), "owner"), /Duplicate native element event/u);
  assert.throws(() => registry.register(customContract({ aliases: ["bad name"] }), "owner"), /Invalid native element alias/u);

  const unregister = registry.register(customContract(), "owner");
  assert.equal(registry.get("acme-alias").name, "acme-widget");
  unregister();
  unregister();
  assert.equal(registry.has("acme-widget"), false);
  registry.register(customContract({ name: "other-widget", aliases: [] }), "other");
  registry.removeOwner("other");
  registry.removeOwner("core");
  assert.equal(registry.has("text"), true);
});

test("covers component model unknown methods and custom contracts", () => {
  const model = new NativeComponentModel("custom", "acme-widget", null, () => {}, customContract());
  assert.throws(() => model.invoke("missing", {}), (error) => error.code === "unknown_method");
  assert.throws(() => model.emit("missing"), (error) => error.code === "unknown_method");
  assert.throws(
    () => new NativeComponentModel("missing", "not-built-in", null, () => {}),
    /Unknown native element/u,
  );
});

test("rejects remaining malformed WebAuthn binary and descriptor shapes", () => {
  const encoded = Buffer.from("value").toString("base64url");
  assert.throws(() => credentialRequestOptions("[]"), /request must be an object/u);
  assert.throws(() => credentialRequestOptions(JSON.stringify({ publicKey: [], challenge: encoded })), /publicKey must be an object/u);
  assert.throws(() => credentialRequestOptions(JSON.stringify({ challenge: encoded, allowCredentials: {} })), /must be an array/u);
  assert.throws(() => credentialRequestOptions(JSON.stringify({ challenge: encoded, allowCredentials: [null] })), /must be an object/u);
  assert.throws(() => credentialCreationOptions(JSON.stringify({ challenge: encoded, user: { id: "A" } })), /valid base64url/u);
  const padded = credentialRequestOptions(JSON.stringify({ challenge: "dmFsdWU=" }));
  assert.deepEqual([...padded.publicKey.challenge], [...Buffer.from("value")]);
});

test("covers remaining map validation and unsupported operation paths", () => {
  assert.throws(() => mapProperties({ markers: "none" }), /array/u);
  assert.throws(() => mapProperties({ markers: [null] }), /object/u);
  assert.throws(() => mapProperties({ traffic: "yes" }), /boolean/u);
  assert.throws(() => mapProperties({ userLocation: 1 }), /boolean/u);
  assert.throws(() => mapProperties({ markers: [{ latitude: 0, longitude: 0, id: 1 }] }), /string/u);
  const map = new HarmonyMap({ update() {}, invoke() {}, dispose() {} });
  assert.throws(() => map.invoke("missing", {}), /Unsupported map method/u);
});

test("covers compiler member and primitive validation", () => {
  assert.throws(() => compileNativeElement({ name: "task-card", primitive: "taskCard" }), /primitive/u);
  assert.throws(() => compileNativeElement({ name: "task-card", primitive: "TaskCard", properties: { "bad-name": "STRING" } }), /Invalid property/u);
  assert.throws(() => compileNativeElement({ name: "task-card", primitive: "TaskCard", methods: ["focus", "focus"] }), /Duplicate method/u);
});

test("covers navigation external, deep-link, restore, validation, and close races", async () => {
  const operations = [];
  const navigation = new HarmonyNavigation({
    apply: (operation, entries) => operations.push([operation, entries.map((entry) => entry.location)]),
    openExternal: (location) => operations.push(["external", location]),
  }, () => {});
  assert.deepEqual(await navigation.invoke("pop", null), {
    location: null,
    previousLocation: null,
    canPop: false,
    modal: false,
    routed: false,
    method: "pop",
  });
  await navigation.invoke("replace", { url: "/root", state: "ignored" });
  await navigation.invoke("deep-link", { url: "https://example.test/link" });
  await navigation.invoke("external", { url: "https://external.test/path" });
  assert.deepEqual(operations.map((entry) => entry[0]), ["replace", "push", "external"]);
  assert.throws(() => navigation.restore([{ id: "bad", location: "relative", modal: false, transition: "default", state: {} }]), /invalid/u);
  await assert.rejects(navigation.invoke("push", { url: "/bad", transition: "spin" }), /transition/u);
  await assert.rejects(navigation.invoke("push", { url: "ftp://example.test/" }), (error) => error.code === "unauthorized");
  await assert.rejects(navigation.invoke("missing", null), (error) => error.code === "unknown_method");

  let finish;
  const closing = new HarmonyNavigation({
    apply: () => new Promise((resolve) => { finish = resolve; }),
    openExternal() {},
  }, () => {});
  const pending = closing.invoke("push", { url: "/slow" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  closing.close();
  finish();
  await assert.rejects(pending, (error) => error.code === "interrupted");
  closing.systemPop();
});

test("covers path-stack validation and empty operations", () => {
  const calls = [];
  const platform = new HarmonyNavPathPlatform({
    pushPath: (...values) => calls.push(values),
    replacePath: (...values) => calls.push(values),
    pop: (...values) => calls.push(values),
  }, () => {}, "route");
  assert.throws(() => new HarmonyNavPathPlatform({ pushPath() {}, replacePath() {}, pop() {} }, () => {}, ""), /required/u);
  assert.throws(() => platform.apply("push", [], "default"), /requires a destination/u);
  assert.throws(() => navigationEntry(null), /do not contain/u);
  assert.throws(() => navigationEntry({ entry: { id: 1, location: "/" } }), /invalid/u);
});

test("covers collection remove, insert, no-op, and reset mutations", () => {
  const collection = new KeyedNativeCollection((item) => item.id);
  const one = { id: "one" };
  const two = { id: "two" };
  const three = { id: "three" };
  collection.reconcile([one, two]);
  assert.deepEqual(collection.reconcile([one, three]), [
    { type: "remove", index: 1, key: "two" },
    { type: "insert", index: 1, item: three },
  ]);
  assert.deepEqual(collection.reconcile([one, three]), []);
  assert.deepEqual(collection.reset([two]), { type: "reset", items: [two] });
  assert.deepEqual(collection.snapshot(), [two]);
});

test("covers browser malformed locations and invalid application origins", () => {
  const route = new HarmonyBrowserRoute("https://example.test/", { open() {} });
  assert.equal(route.matches("not a url"), false);
  assert.equal(route.intercept("javascript:alert(1)"), false);
  assert.throws(() => new HarmonyBrowserRoute("resource://other/app.html", { open() {} }), /applicationLocation/u);
  assert.throws(() => new HarmonyBrowserRoute("https://user:secret@example.test/", { open() {} }), /credentials/u);
});

test("covers dispatcher closed, unavailable, and inactive cancellation paths", async () => {
  const replies = [];
  const request = (id, target, method, params = {}) => JSON.stringify({
    protocol: 1,
    id,
    session: "session",
    target,
    method,
    params,
  });
  const dispatcher = new NativeBridgeDispatcher(
    new NativeBridgeSecurity("https://example.test/app", "session"),
    {},
    (reply) => replies.push(reply),
  );
  dispatcher.receive(request("one", "media", "status"), "https://example.test/");
  dispatcher.receive(request("two", "bridge", "cancel", {}), "https://example.test/");
  dispatcher.receive(request("three", "bridge", "missing"), "https://example.test/");
  dispatcher.receive(request("four", "bridge", "cancel", { id: "absent" }), "https://example.test/");
  dispatcher.close();
  dispatcher.close();
  dispatcher.receive(request("five", "media", "status"), "https://example.test/");
  dispatcher.receive("{}", "https://example.test/");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(replies.map((reply) => reply.error?.code ?? reply.result?.cancelled), [
    "unavailable",
    "invalid_params",
    "unknown_method",
    false,
    "interrupted",
  ]);
});
