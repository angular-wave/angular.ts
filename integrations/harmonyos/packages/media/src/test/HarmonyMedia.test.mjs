import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyMedia } from "../main/ets/HarmonyMedia.ts";

test("routes every media operation through one destination-owned player", async () => {
  const calls = [];
  const platform = {
    status: () => ({ state: "idle" }),
    load: (value) => calls.push(["load", value]),
    play: () => calls.push(["play"]),
    pause: () => calls.push(["pause"]),
    stop: () => calls.push(["stop"]),
    seek: (value) => calls.push(["seek", value]),
    release: () => calls.push(["release"]),
  };
  const handler = new HarmonyMedia(platform);
  assert.deepEqual(handler.invoke("status", null), { state: "idle" });
  await handler.invoke("load", { url: "https://example.test/video.mp4" });
  await handler.invoke("play", null);
  await handler.invoke("pause", null);
  await handler.invoke("stop", null);
  await handler.invoke("seek", { position: 1200 });
  await handler.invoke("release", null);
  assert.deepEqual(calls, [
    ["load", { url: "https://example.test/video.mp4" }],
    ["play"],
    ["pause"],
    ["stop"],
    ["seek", 1200],
    ["release"],
  ]);
});

test("rejects invalid media operations before reaching the player", () => {
  const handler = new HarmonyMedia({
    status() {}, load() {}, play() {}, pause() {}, stop() {}, seek() {}, release() {},
  });
  assert.throws(() => handler.invoke("seek", { position: -1 }), TypeError);
  assert.throws(() => handler.invoke("unknown", null), /Unsupported media method/u);
});

test("releases destination-owned players exactly once", () => {
  let releases = 0;
  const handler = new HarmonyMedia({
    status() {}, load() {}, play() {}, pause() {}, stop() {}, seek() {},
    release() { releases += 1; },
  });
  handler.close();
  handler.close();
  assert.equal(releases, 1);
  assert.throws(() => handler.invoke("status", null), /disposed/u);
});
