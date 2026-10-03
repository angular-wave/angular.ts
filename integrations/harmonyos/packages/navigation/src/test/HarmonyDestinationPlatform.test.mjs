import assert from "node:assert/strict";
import test from "node:test";

import { HarmonyDestinationPlatform } from "../main/ets/HarmonyDestinationPlatform.ts";

const entry = (id, modal = false) => ({
  id,
  location: `/${id}`,
  modal,
  transition: "fade",
  state: {},
});

class Destination {
  closed = 0;

  close() {
    this.closed += 1;
  }
}

function fixture() {
  const calls = [];
  const destinations = new Map([["root", new Destination()]]);
  const platform = {
    apply: async (...parameters) => calls.push(["apply", ...parameters]),
    openExternal: async (location) => calls.push(["external", location]),
  };
  const value = new HarmonyDestinationPlatform(
    entry("root"),
    destinations.get("root"),
    platform,
    (next) => {
      const destination = new Destination();
      destinations.set(next.id, destination);
      return destination;
    },
  );
  return { calls, destinations, platform, value };
}

test("commits push, modal, replace, and pop after platform success", async () => {
  const { calls, destinations, value } = fixture();
  const one = entry("one");
  await value.apply("push", [entry("root"), one], "slide");
  assert.equal(value.current.id, "one");
  assert.equal(value.resolve("one"), destinations.get("one"));

  const dialog = entry("dialog", true);
  await value.apply("modal", [entry("root"), one, dialog], "cover");
  assert.equal(value.current.id, "dialog");

  const replacement = entry("replacement");
  await value.apply("replace", [entry("root"), one, replacement], "flip");
  assert.equal(destinations.get("dialog").closed, 1);
  assert.equal(value.current.id, "replacement");

  await value.apply("pop", [entry("root"), one], "fade");
  assert.equal(destinations.get("replacement").closed, 1);
  assert.deepEqual(value.entries.map((item) => item.id), ["root", "one"]);
  assert.equal(calls.length, 4);
});

test("aborts a staged destination when the platform rejects", async () => {
  const { destinations, platform, value } = fixture();
  platform.apply = async () => { throw new Error("platform failed"); };
  await assert.rejects(
    value.apply("push", [entry("root"), entry("failed")], "default"),
    /platform failed/u,
  );
  assert.equal(destinations.get("failed").closed, 1);
  assert.throws(() => value.resolve("failed"), /Unknown HarmonyOS destination/u);
  assert.equal(value.current.id, "root");
});

test("delegates external navigation and detects closure during asynchronous work", async () => {
  const { calls, platform, value } = fixture();
  await value.openExternal("https://example.test/");
  assert.deepEqual(calls, [["external", "https://example.test/"]]);
  platform.openExternal = async () => value.close();
  await assert.rejects(value.openExternal("https://example.test/closed"), /closed/u);
});

test("tracks platform-owned system pops without touching the root", async () => {
  const { destinations, value } = fixture();
  assert.equal(value.systemPop(), false);
  await value.apply("push", [entry("root"), entry("one")], "default");
  assert.equal(value.systemPop(), true);
  assert.equal(destinations.get("one").closed, 1);
  assert.equal(value.current.id, "root");
});

test("rejects malformed mutations before creating destinations", async () => {
  const { destinations, value } = fixture();
  for (const [operation, entries] of [
    ["push", [entry("wrong"), entry("one")]],
    ["push", [entry("root"), entry("modal", true)]],
    ["modal", [entry("root"), entry("plain")]],
    ["replace", [entry("root"), entry("replacement")]],
    ["pop", []],
  ]) {
    await assert.rejects(value.apply(operation, entries, "default"), /Invalid HarmonyOS/u);
  }
  assert.deepEqual([...destinations.keys()], ["root"]);
});

test("closes every destination once and rejects later work", async () => {
  const { destinations, value } = fixture();
  await value.apply("push", [entry("root"), entry("one")], "default");
  value.close();
  value.close();
  assert.equal(destinations.get("root").closed, 1);
  assert.equal(destinations.get("one").closed, 1);
  assert.throws(() => value.current, /closed/u);
  assert.throws(() => value.resolve("root"), /closed/u);
  assert.throws(() => value.systemPop(), /closed/u);
  await assert.rejects(value.apply("pop", [entry("root")], "default"), /closed/u);
});

test("closes staged work when the host closes during platform mutation", async () => {
  const { destinations, platform, value } = fixture();
  platform.apply = async () => value.close();
  await assert.rejects(
    value.apply("push", [entry("root"), entry("one")], "default"),
    /closed/u,
  );
  assert.equal(destinations.get("one").closed, 1);
});
