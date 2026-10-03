import assert from "node:assert/strict";
import test from "node:test";
import {
  cameraParameters,
  HarmonyMap,
  mapProperties,
} from "../main/ets/HarmonyMap.ts";

test("normalizes map defaults and marker data", () => {
  assert.deepEqual(mapProperties({
    latitude: 56.95,
    longitude: 24.1,
    markers: [{ id: "riga", latitude: 56.95, longitude: 24.1, title: "Riga" }],
  }), {
    latitude: 56.95,
    longitude: 24.1,
    zoom: 12,
    mapType: "normal",
    traffic: false,
    userLocation: false,
    markers: [{ id: "riga", latitude: 56.95, longitude: 24.1, title: "Riga" }],
  });
  assert.deepEqual(cameraParameters({ latitude: 1, longitude: 2 }), {
    latitude: 1,
    longitude: 2,
  });
});

test("rejects invalid map and camera values", () => {
  assert.throws(() => mapProperties({ latitude: 91 }), /latitude/u);
  assert.throws(() => mapProperties({ mapType: "paper" }), /mapType/u);
  assert.throws(() => mapProperties({ markers: [{ latitude: 0 }] }), /longitude/u);
  assert.throws(() => cameraParameters({ latitude: 0, longitude: Infinity }), /longitude/u);
});

test("routes normalized updates and methods and disposes once", async () => {
  const calls = [];
  const map = new HarmonyMap({
    update: (properties) => calls.push(["update", properties]),
    invoke: (method, parameters) => calls.push([method, parameters]),
    dispose: () => calls.push(["dispose"]),
  });
  map.update({ latitude: 0, longitude: 0 });
  await map.invoke("move", { latitude: 1, longitude: 2, zoom: 3 });
  await map.invoke("fitMarkers", { ignored: true });
  map.close();
  map.close();
  assert.deepEqual(calls.map((call) => call[0]), ["update", "move", "fitMarkers", "dispose"]);
  assert.throws(() => map.update({}), /disposed/u);
  assert.throws(() => map.invoke("unknown", {}), /disposed/u);
});
