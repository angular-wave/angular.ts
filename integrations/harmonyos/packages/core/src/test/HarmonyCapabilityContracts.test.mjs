import assert from "node:assert/strict";
import test from "node:test";
import {
  connectivityStatus,
  fileStatus,
  geolocationPosition,
  lifecycleStatus,
  permissionStatus,
  windowStatus,
} from "../main/ets/capabilities/HarmonyCapabilityContracts.ts";

test("normalizes permission, connectivity, lifecycle, and file states", () => {
  assert.deepEqual(permissionStatus("location", true), { permission: "location", granted: true, canRequest: false });
  assert.deepEqual(connectivityStatus(false, true, true), { connected: false, validated: false, metered: false });
  assert.deepEqual(lifecycleStatus("foreground"), { state: "resumed", active: true });
  assert.deepEqual(lifecycleStatus("background"), { state: "started", active: false });
  assert.deepEqual(lifecycleStatus("inactive"), { state: "initialized", active: false });
  assert.deepEqual(fileStatus(true), { available: true, contentUris: true, upload: true });
});

test("classifies adaptive windows at every public breakpoint", () => {
  assert.equal(windowStatus(599, 479).widthClass, "compact");
  assert.equal(windowStatus(600, 480).widthClass, "medium");
  assert.equal(windowStatus(840, 900).widthClass, "expanded");
  assert.equal(windowStatus(1200, 900).widthClass, "large");
  assert.equal(windowStatus(1600, 900).widthClass, "extra-large");
  assert.equal(windowStatus(900, 600).orientation, "landscape");
});

test("serializes absent geolocation measurements as null", () => {
  assert.deepEqual(geolocationPosition({ latitude: 1, longitude: 2, accuracy: 3, timestamp: 4 }), {
    latitude: 1,
    longitude: 2,
    accuracy: 3,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    timestamp: 4,
  });
});
