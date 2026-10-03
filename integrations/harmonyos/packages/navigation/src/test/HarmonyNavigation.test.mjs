import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyNavigation } from "../main/ets/HarmonyNavigation.ts";
import {
  HarmonyNavPathPlatform,
  navigationEntry,
} from "../main/ets/HarmonyNavPathPlatform.ts";

test("mirrors push, replace, modal, and pop without duplicate ownership", async () => {
  const operations = [];
  const changes = [];
  const navigation = new HarmonyNavigation({
    apply: (operation, entries, transition) => operations.push([operation, entries.map((entry) => entry.location), transition]),
    openExternal: (location) => operations.push(["external", location]),
  }, (change) => changes.push(change));
  const first = await navigation.invoke("push", { url: "/feed", transition: "slide" });
  await navigation.invoke("push", { url: "/post/1", transition: "cover" });
  await navigation.invoke("replace", { url: "/post/2", transition: "none" });
  await navigation.invoke("modal", { url: "/compose", transition: "dive" });
  assert.deepEqual(first, {
    routed: true,
    method: "push",
    phase: "accepted",
    transaction: 1,
    url: "/feed",
    action: "advance",
    transition: "slide",
  });
  assert.equal((await navigation.invoke("status", null)).location, "/compose");
  await navigation.invoke("pop", null);
  navigation.systemPop();
  assert.equal((await navigation.invoke("status", null)).location, "/feed");
  assert.equal(changes.filter((change) => change.method === "pop").length, 2);
  assert.deepEqual(operations.at(-1), ["pop", ["/feed", "/post/2"], "dive"]);
});

test("supports flip and substitutes fade when reduced motion is active", async () => {
  const operations = [];
  const navigation = new HarmonyNavigation({
    apply: (...args) => operations.push(args),
    openExternal() {},
  }, () => {});
  await navigation.invoke("push", { url: "/one", transition: "flip" });
  navigation.setReducedMotion(true);
  await navigation.invoke("push", { url: "/two", transition: "flip" });
  assert.equal(operations[0][2], "flip");
  assert.equal(operations[1][2], "fade");
});

test("rejects unsafe locations and calls after disposal", async () => {
  const opened = [];
  const navigation = new HarmonyNavigation({ apply() {}, openExternal: (location) => opened.push(location) }, () => {});
  await navigation.invoke("external", { url: "https://plain.example" });
  await navigation.invoke("external", { url: "HTTPS://EXAMPLE.test:443?from=app" });
  await navigation.invoke("deep-link", { url: "http://[2001:DB8::1]:8080/feed" });
  assert.deepEqual(opened, ["https://plain.example/", "https://example.test/?from=app"]);
  await assert.rejects(navigation.invoke("external", { url: "javascript:alert(1)" }), (error) => error.code === "unauthorized");
  await assert.rejects(navigation.invoke("push", { url: "relative" }), (error) => error.code === "invalid_params");
  for (const url of [
    "https:example.test",
    "https:///path",
    "https://user@example.test/path",
    "https://example..test/path",
    "https://-example.test/path",
    "https://example.test:/path",
    "https://example.test:0/path",
    "https://example.test:65536/path",
    "https://example.test:port/path",
    "https://example.test\\@attacker.test/path",
    "https://[/path",
    "https://[127.0.0.1]/path",
    "https://[::1]suffix/path",
  ]) {
    await assert.rejects(navigation.invoke("external", { url }), (error) =>
      error.code === "invalid_params" || error.code === "unauthorized"
    );
  }
  navigation.close();
  await assert.rejects(navigation.invoke("status", null), (error) => error.code === "interrupted");
});

test("serializes route transactions and commits only successful platform work", async () => {
  const releases = [];
  const platform = {
    apply: (_operation, entries) => new Promise((resolve, reject) => {
      releases.push({ entries: entries.map((entry) => entry.location), resolve, reject });
    }),
    openExternal() {},
  };
  const navigation = new HarmonyNavigation(platform, () => {});
  const first = navigation.invoke("push", { url: "/one" });
  const second = navigation.invoke("push", { url: "/two" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(releases.length, 1);
  releases[0].resolve();
  await first;
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(releases[1].entries, ["/one", "/two"]);
  releases[1].reject(new Error("platform failed"));
  await assert.rejects(second, /platform failed/u);
  assert.equal((await navigation.invoke("status", null)).location, "/one");
});

test("does not system-pop the root destination", async () => {
  const changes = [];
  const navigation = new HarmonyNavigation({ apply() {}, openExternal() {} }, (change) => changes.push(change));
  await navigation.invoke("push", { url: "/root" });
  navigation.systemPop();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal((await navigation.invoke("status", null)).location, "/root");
  assert.deepEqual(changes.map((change) => change.method), ["push"]);
});

test("applies route operations to an ArkUI path stack", async () => {
  const calls = [];
  const stack = {
    pushPath: (info, animated) => calls.push(["push", info, animated]),
    replacePath: (info, animated) => calls.push(["replace", info, animated]),
    pop: (animated) => calls.push(["pop", animated]),
  };
  const external = [];
  const platform = new HarmonyNavPathPlatform(stack, (location) => external.push(location));
  const entry = {
    id: "one",
    location: "/one",
    modal: false,
    transition: "cover",
    state: {},
  };
  platform.apply("push", [entry], "cover");
  platform.apply("replace", [entry], "none");
  platform.apply("pop", [], "slide");
  await platform.openExternal("https://example.test/");
  assert.deepEqual(calls.map((call) => [call[0], call.at(-1)]), [
    ["push", true],
    ["replace", false],
    ["pop", true],
  ]);
  assert.equal(navigationEntry(calls[0][1].param), entry);
  assert.deepEqual(external, ["https://example.test/"]);
  assert.throws(() => navigationEntry({}), /do not contain/u);
});
