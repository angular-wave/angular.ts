import assert from "node:assert/strict";
import test from "node:test";
import { createHarmonyCapabilityHandlers } from "../packages/core/src/main/ets/capabilities/HarmonyCapabilities.ts";
import { nativeCapabilities } from "../packages/core/src/main/ets/generated/NativeCapabilityCatalog.ts";
import { NativeNodeRegistry } from "../packages/core/src/main/ets/nodes/NativeNodeRegistry.ts";
import { HarmonyMap } from "../packages/maps/src/main/ets/HarmonyMap.ts";
import { HarmonyMedia } from "../packages/media/src/main/ets/HarmonyMedia.ts";
import { HarmonyDestinationStore } from "../packages/navigation/src/main/ets/HarmonyDestinationStore.ts";

const iterations = 200;
const overlayNames = [
  "dialog",
  "bottom-sheet",
  "menu",
  "snackbar",
  "tooltip",
  "drawer",
];

function context(requestId) {
  return { requestId, cancelled: false, onCancel() {} };
}

test("stress-closes every capability watcher and event sink", async () => {
  const targets = Object.keys(nativeCapabilities);
  let closes = 0;
  let events = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sinks = [];
    const active = new Set();
    const handlers = createHarmonyCapabilityHandlers({
      call(target, _method, _parameters, _context, emit) {
        active.add(target);
        sinks.push(emit);
        return { watching: true };
      },
      closeTarget(target) {
        assert.equal(active.delete(target), true);
        closes += 1;
      },
    }, () => {
      events += 1;
    });
    for (const target of targets) {
      await handlers[target].invoke("watch", null, context(`${iteration}-${target}`));
    }
    for (const target of targets) {
      handlers[target].close();
      handlers[target].close();
    }
    for (const emit of sinks) emit("change", {});
    assert.equal(active.size, 0);
  }
  assert.equal(closes, iterations * targets.length);
  assert.equal(events, 0);
});

test("stress-disposes overlay nodes after batched mount", async () => {
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const frames = [];
    const active = new Set();
    let disposals = 0;
    const registry = new NativeNodeRegistry({
      beginBatch() {},
      endBatch() {},
      create(id, name) {
        const node = { id, name };
        active.add(node);
        return node;
      },
      update() {},
      layout() {},
      setVisible() {},
      invoke() {},
      dispose(node) {
        assert.equal(active.delete(node), true);
        disposals += 1;
      },
    }, { schedule: (callback) => frames.push(callback) }, () => {});
    const mounts = overlayNames.map((name, index) => registry.invoke(
      "mount",
      { id: `${name}-${index}`, name, props: {} },
      context(`${iteration}-${name}`),
    ));
    frames.shift()?.();
    await Promise.all(mounts);
    registry.close();
    registry.close();
    assert.equal(active.size, 0);
    assert.equal(disposals, overlayNames.length);
  }
});

test("stress-releases destinations, maps, and media players exactly once", async () => {
  let activeDestinations = 0;
  let activeMaps = 0;
  let activePlayers = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const destination = (name) => {
      activeDestinations += 1;
      return {
        name,
        closed: false,
        close() {
          assert.equal(this.closed, false);
          this.closed = true;
          activeDestinations -= 1;
        },
      };
    };
    const store = new HarmonyDestinationStore("root", destination("root"));
    store.stage("detail", () => destination("detail"));
    store.commitPush("detail");
    store.stage("cancelled", () => destination("cancelled"));
    store.abort("cancelled");
    store.close();
    store.close();

    activeMaps += 1;
    const map = new HarmonyMap({
      update() {},
      invoke() {},
      dispose() {
        activeMaps -= 1;
      },
    });
    map.update({ latitude: 0, longitude: 0 });
    await map.invoke("move", { latitude: 1, longitude: 1 });
    map.close();
    map.close();

    activePlayers += 1;
    const media = new HarmonyMedia({
      status() {},
      load() {},
      play() {},
      pause() {},
      stop() {},
      seek() {},
      release() {
        activePlayers -= 1;
      },
    });
    await media.invoke("play", null);
    media.close();
    media.close();
  }
  assert.equal(activeDestinations, 0);
  assert.equal(activeMaps, 0);
  assert.equal(activePlayers, 0);
});
