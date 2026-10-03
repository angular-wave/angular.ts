import assert from "node:assert/strict";
import test from "node:test";
import { HarmonyBrowserRoute } from "../../../browser/src/main/ets/HarmonyBrowserRoute.ts";
import {
  credentialCreationOptions,
  credentialRequestOptions,
} from "../../../credentials/src/main/ets/WebAuthnJson.ts";
import { HarmonyMap, mapProperties } from "../../../maps/src/main/ets/HarmonyMap.ts";
import { HarmonyMedia } from "../../../media/src/main/ets/HarmonyMedia.ts";
import { compileNativeElement } from "../../../native-elements-compiler/src/main/ets/NativeElementCompiler.ts";
import { HarmonyNavigation } from "../../../navigation/src/main/ets/HarmonyNavigation.ts";
import { nativeAccessibilityState } from "../main/ets/accessibility/NativeAccessibility.ts";
import { createHarmonyCapabilityHandlers } from "../main/ets/capabilities/HarmonyCapabilities.ts";
import {
  connectivityStatus,
  geolocationPosition,
  permissionStatus,
} from "../main/ets/capabilities/HarmonyCapabilityContracts.ts";
import { nativeLayoutFrame } from "../main/ets/layout/NativeLayout.ts";
import { nativeStyle } from "../main/ets/styles/NativeStyle.ts";
import { AngularNativeWebHost } from "../main/ets/web/AngularNativeWebHost.ts";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const invocation = { requestId: "request", cancelled: false, onCancel() {} };

test("covers default browser failure reporting", async () => {
  const route = new HarmonyBrowserRoute("https://app.example/", {
    open: () => Promise.reject(new Error("unavailable")),
  });
  assert.equal(route.intercept("https://external.example/path"), true);
  await tick();
});

test("covers web host reload, close, and interrupted readiness", async () => {
  const scripts = [];
  const runtime = {
    currentLocation: "https://example.com/page",
    runJavaScript: async (source) => { scripts.push(source); },
  };
  const host = new AngularNativeWebHost("https://example.com/app", runtime, {}, "session");
  host.pageStarted();
  host.emitEvent("lifecycle", "change");
  await host.pageReady();
  assert.equal(scripts.length, 2);

  const closed = new AngularNativeWebHost("https://example.com/app", runtime, {}, "session");
  closed.close();
  await closed.pageReady();

  let release;
  const blockedRuntime = {
    currentLocation: "https://example.com/page",
    runJavaScript: () => new Promise((resolve) => { release = resolve; }),
  };
  const interrupted = new AngularNativeWebHost(
    "https://example.com/app",
    blockedRuntime,
    { platform: { invoke: () => new Promise(() => undefined) } },
    "session",
  );
  const ready = interrupted.pageReady();
  interrupted.receive(JSON.stringify({
    protocol: 1, id: "pending", target: "platform", method: "status", params: null, session: "session",
  }));
  await tick();
  interrupted.close();
  release();
  await ready;
});

test("covers capability disposal, optional parameters, and event ownership", () => {
  const events = [];
  const closedTargets = [];
  let emit;
  const handlers = createHarmonyCapabilityHandlers({
    call(_target, _method, parameters, _context, callback) {
      emit = callback;
      return parameters;
    },
    closeTarget: (target) => closedTargets.push(target),
  }, (target, event, data) => events.push({ target, event, data }));
  assert.deepEqual(handlers.platform.invoke("status", null, invocation), {});
  emit("change", { value: true });
  handlers.platform.close();
  handlers.platform.close();
  emit("change", { value: false });
  assert.equal(events.length, 1);
  assert.deepEqual(closedTargets, ["platform"]);
  assert.throws(() => handlers.platform.invoke("status", null, invocation), /disposed/u);

  const withoutClose = createHarmonyCapabilityHandlers({ call: () => null }, () => {});
  withoutClose.platform.close();
});

test("covers capability status normalization branches", () => {
  assert.deepEqual(permissionStatus("camera", false, false), {
    permission: "camera", granted: false, canRequest: false,
  });
  assert.equal(permissionStatus("camera", true).canRequest, false);
  assert.deepEqual(connectivityStatus(false, true, true), {
    connected: false, validated: false, metered: false,
  });
  assert.deepEqual(connectivityStatus(true, false, true), {
    connected: true, validated: false, metered: true,
  });
  const position = geolocationPosition({
    latitude: "invalid",
    longitude: 1,
    accuracy: Number.NaN,
    altitude: 2,
    altitudeAccuracy: "invalid",
    heading: Number.POSITIVE_INFINITY,
    speed: 3,
    timestamp: 4,
  });
  assert.equal(position.latitude, 0);
  assert.equal(position.altitude, 2);
  assert.equal(position.altitudeAccuracy, null);
});

test("covers layout, accessibility, and style normalization branches", () => {
  const environment = {
    density: 1,
    viewportOffsetX: 0,
    viewportOffsetY: 0,
    safeAreaTop: 0,
    safeAreaEnd: 0,
    safeAreaBottom: 0,
    safeAreaStart: 0,
    rightToLeft: false,
  };
  assert.throws(
    () => nativeLayoutFrame({ x: Number.NaN, y: 0, width: 1, height: 1 }, environment),
    /must be finite/u,
  );
  assert.equal(nativeAccessibilityState("checkbox", {}).label, "");
  assert.equal(nativeAccessibilityState("checkbox", { checked: true }).checked, true);
  assert.equal(nativeAccessibilityState("checkbox", { value: false }).checked, false);
  assert.equal(nativeAccessibilityState("checkbox", { value: "mixed" }).value, "mixed");
  assert.equal(nativeAccessibilityState("checkbox", { value: 1 }).value, 1);
  assert.equal(nativeAccessibilityState("checkbox", { value: {} }).value, null);
  assert.equal(nativeStyle(null, { darkMode: false, reducedMotion: false, fontScale: 1 }).visible, true);
  const style = nativeStyle(
    { fontSize: 10, textAlign: "center" },
    { darkMode: false, reducedMotion: false, fontScale: 2 },
  );
  assert.equal(style.fontSize, 20);
  assert.equal(style.textAlign, "center");
});

test("covers empty WebAuthn payload fields", () => {
  assert.throws(() => credentialRequestOptions(""), /non-empty/u);
  assert.throws(
    () => credentialRequestOptions(JSON.stringify({ challenge: "" })),
    /non-empty base64url/u,
  );
  assert.throws(
    () => credentialCreationOptions(JSON.stringify({ challenge: "dmFsdWU", user: { id: 1 } })),
    /non-empty base64url/u,
  );
});

test("covers optional map marker and boolean fields", () => {
  const properties = mapProperties({
    traffic: true,
    userLocation: true,
    markers: [
      { latitude: 1, longitude: 2, id: "one", title: "Title", snippet: "Snippet" },
      { latitude: 3, longitude: 4 },
    ],
  });
  assert.equal(properties.traffic, true);
  assert.equal(properties.userLocation, true);
  const platform = { update() {}, invoke() {}, dispose() {} };
  const map = new HarmonyMap(platform);
  map.close();
  assert.throws(() => map.update({}), /disposed/u);
});

test("covers media and compiler optional inputs", () => {
  const loaded = [];
  const media = new HarmonyMedia({
    status() {}, load: (parameters) => loaded.push(parameters), play() {}, pause() {}, stop() {},
    seek() {}, release() {},
  });
  media.invoke("load", null);
  assert.deepEqual(loaded, [{}]);
  const compiled = compileNativeElement({ name: "empty-widget", primitive: "Column" });
  assert.deepEqual(compiled.registration.methods, []);
});

test("covers reduced-motion pop and invalid navigation state inputs", async () => {
  const operations = [];
  const navigation = new HarmonyNavigation({
    apply: (operation, entries, transition) => operations.push({ operation, entries, transition }),
    openExternal() {},
  }, () => {});
  await assert.rejects(navigation.invoke("push", null), (error) => error.code === "invalid_params");
  await navigation.invoke("push", { url: "/one", state: { source: "coverage" } });
  await navigation.invoke("push", { url: "/two", transition: "cover", state: [] });
  navigation.setReducedMotion(true);
  const result = await navigation.invoke("pop", null);
  assert.equal(result.transition, undefined);
  assert.equal(operations.at(-1).transition, "fade");
});
