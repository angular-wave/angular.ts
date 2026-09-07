// @ts-nocheck
/// <reference types="jasmine" />
import { dealoc, getController } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { nativeModule } from "../../runtime/native.ts";
import { createAngular } from "../../runtime/index.ts";
import { createNativeService } from "../../services/native/native.ts";
import { ngModelDirective } from "../model/model.ts";

describe("native bridge", () => {
  let angular;
  let bridge;
  let calls;
  let compile;
  let root;
  let scope;
  let service;
  let previousBridge;
  let previousEnvironment;

  beforeEach(() => {
    root = document.getElementById("app");
    dealoc(root);
    calls = [];
    bridge = {
      receive(message) {
        calls.push(JSON.parse(message));
      },
    };
    previousBridge = window.TestNative;
    previousEnvironment = window.angularNativeEnvironment;
    window.TestNative = bridge;
    window.angularNativeEnvironment = {
      platform: "android",
      session: "session-1",
    };
    angular = createAngular({
      modules: [nativeModule],
      directives: { ngModel: ngModelDirective },
    });

    angular.createModule("nativeTest", []).config({
      $native: { globalName: "TestNative", timeout: 1_000 },
    });
    angular.bootstrap(root, ["nativeTest"]).invoke([
      "$compile",
      "$native",
      "$rootScope",
      ($compile, $native, $rootScope) => {
        compile = $compile;
        service = $native;
        scope = $rootScope;
      },
    ]);
  });

  afterEach(() => {
    angular._composition.destroy();
    window.TestNative = previousBridge;
    window.angularNativeEnvironment = previousEnvironment;
    dealoc(root);
  });

  it("sends typed calls and resolves replies", async () => {
    const result = service.call(
      "navigation",
      "visit",
      { url: "/dashboard" },
      { id: "visit-1", scopeId: 4, elementId: "open" },
    );

    expect(calls).toEqual([
      {
        protocol: 1,
        id: "visit-1",
        target: "navigation",
        method: "visit",
        params: { url: "/dashboard" },
        session: "session-1",
        scopeId: 4,
        elementId: "open",
      },
    ]);

    window.angularNative.receive({ id: "visit-1", ok: true, result: 42 });
    expect(await result).toBe(42);
  });

  it("supports postMessage adapters and native errors", async () => {
    const messages = [];
    const local = createNativeService(window, {
      bridge: { postMessage: (message) => messages.push(JSON.parse(message)) },
      timeout: 0,
    });
    const result = local.call("camera", "open", undefined, { id: "camera-1" });

    local.receive({ id: "camera-1", ok: false, error: "denied" });
    await expectAsync(result).toBeRejectedWithError("denied");
    expect(messages[0].target).toBe("camera");
    local.dispose();
  });

  it("exposes structured native errors", async () => {
    const result = service.call("component", "mount", {}, { id: "bad" });

    service.receive({
      protocol: 1,
      id: "bad",
      ok: false,
      error: { code: "invalid_params", message: "Missing component id" },
    });

    await expectAsync(result).toBeRejectedWithError("Missing component id");
    await result.catch((error) => {
      expect(error.code).toBe("invalid_params");
    });
  });

  it("rejects oversized and aborted calls before dispatch", async () => {
    const limited = createNativeService(window, {
      bridge,
      maxMessageBytes: 100,
      timeout: 0,
    });
    const controller = new AbortController();
    controller.abort();

    await expectAsync(
      limited.call("component", "mount", { value: "x".repeat(200) }),
    ).toBeRejectedWithError(RangeError);
    await expectAsync(
      limited.call("component", "mount", {}, { signal: controller.signal }),
    ).toBeRejectedWithError(DOMException);
    expect(limited.protocolVersion).toBe(1);
    limited.dispose();
  });

  it("supports explicit sessions for custom native shells", async () => {
    const messages = [];
    const local = createNativeService(window, {
      bridge: { postMessage: (message) => messages.push(JSON.parse(message)) },
      session: "custom-session",
      timeout: 0,
    });

    const result = local.call("navigation", "back");

    expect(messages[0].session).toBe("custom-session");
    local.receive({ id: messages[0].id, ok: true });
    await expectAsync(result).toBeResolved();
    local.dispose();
  });

  it("uses the shared native protocol fixtures", async () => {
    const response = await fetch(
      "/integrations/android/protocol/native-bridge-fixtures.json",
    );
    const fixtures = await response.json();
    const messages = [];
    const local = createNativeService(window, {
      bridge: { postMessage: (message) => messages.push(JSON.parse(message)) },
      session: "fixture-session",
      timeout: 0,
    });
    const event = jasmine.createSpy("event");

    local.on("component", "change", event);
    const result = local.call(
      "platform",
      "status",
      { verbose: true },
      { id: "fixture-request" },
    );
    expect(messages[0]).toEqual(fixtures.request);
    local.receive(fixtures.reply);
    await expectAsync(result).toBeResolvedTo({ platform: "android" });
    local.receive(fixtures.event);
    expect(event).toHaveBeenCalledWith(fixtures.event);
    local.dispose();
  });

  it("rejects unavailable, malformed, duplicate, timed out, and disposed calls", async () => {
    const unavailable = createNativeService(window, { globalName: "Missing" });

    expect(unavailable.available).toBeFalse();
    await expectAsync(unavailable.call("x", "y")).toBeRejectedWithError(
      "Native bridge is not available",
    );
    unavailable.receive("not-json");
    unavailable.receive({ id: "unknown", ok: true });
    unavailable.dispose();
    await expectAsync(unavailable.call("x", "y")).toBeRejectedWithError(
      "Native service is disposed",
    );

    const pending = service.call("x", "y", undefined, {
      id: "same",
      timeout: 20,
    });
    await expectAsync(
      service.call("x", "y", undefined, { id: "same" }),
    ).toBeRejectedWithError("Native call id is already pending: same");
    await expectAsync(pending).toBeRejectedWithError(
      "Native call timed out: x.y",
    );
    expect(calls.at(-1)).toEqual(
      jasmine.objectContaining({
        id: "same:cancel",
        target: "bridge",
        method: "cancel",
        params: { id: "same" },
      }),
    );
  });

  it("rejects serialization and adapter failures", async () => {
    const cyclic = {};

    cyclic.self = cyclic;
    await expectAsync(service.call("x", "y", cyclic)).toBeRejected();

    const broken = createNativeService(window, { bridge: {} });

    await expectAsync(broken.call("x", "y")).toBeRejectedWithError(
      "Native bridge cannot receive messages",
    );
    broken.dispose();
  });

  it("delivers exact and wildcard events once and restores an existing receiver", () => {
    const existing = jasmine.createSpyObj("receiver", ["receive", "dispatch"]);
    const isolatedWindow = new EventTarget();

    isolatedWindow.angularNative = existing;
    const local = createNativeService(isolatedWindow, { bridge });
    const exact = jasmine.createSpy("exact");
    const wildcard = jasmine.createSpy("wildcard");
    const unsubscribe = local.on("component", "click", exact);

    local.on("*", "*", wildcard);
    isolatedWindow.angularNative.dispatch({
      target: "component",
      event: "click",
      data: { id: 1 },
    });

    expect(existing.receive).toHaveBeenCalled();
    expect(exact).toHaveBeenCalledTimes(1);
    expect(wildcard).toHaveBeenCalledTimes(1);
    unsubscribe();
    local.receive({ target: "component", event: "click" });
    expect(exact).toHaveBeenCalledTimes(1);
    local.dispose();
    expect(isolatedWindow.angularNative).toBe(existing);
  });

  it("calls native operations from markup and exposes results", async () => {
    scope.params = { url: "/dashboard" };
    scope.capture = jasmine.createSpy("capture");
    const element = compile(
      '<button id="open" ng-native="navigation.visit" data-params="params" data-on-result="capture($result)"></button>',
    )(scope);

    root.append(element);
    element.click();
    expect(element.getAttribute("aria-busy")).toBe("true");
    service.receive({ id: calls[0].id, ok: true, result: { routed: true } });
    await wait();

    expect(scope.capture).toHaveBeenCalledWith({ routed: true });
    expect(element.hasAttribute("aria-busy")).toBeFalse();
  });

  it("routes native failures to markup and ignores disabled controls", async () => {
    scope.captureError = jasmine.createSpy("captureError");
    const element = compile(
      '<button ng-native="camera.open" data-on-error="captureError($error)"></button>',
    )(scope);

    root.append(element);
    element.disabled = true;
    element.click();
    expect(calls).toEqual([]);
    element.disabled = false;
    element.click();
    service.receive({ id: calls[0].id, ok: false, error: "denied" });
    await wait();
    expect(scope.captureError).toHaveBeenCalledWith(jasmine.any(Error));
  });

  it("mounts, updates, and unmounts native components", async () => {
    scope.card = { title: "First" };
    const element = compile(
      '<section ng-native-component="native-card" data-props="card"></section>',
    )(scope);

    expect(element.getAttribute("ng-native-component"))
      .withContext("native component source attribute")
      .toBe("native-card");
    expect(element.id)
      .withContext("native component host id")
      .toContain("ng-native-component-");
    expect(element.getAttribute("data-native-component-host"))
      .withContext("native component host marker")
      .toBe("native-card");
    root.append(element);
    await wait(50);
    expect(calls.length).withContext("native component mount").toBe(1);
    expect(calls[0].method).toBe("mount");
    service.receive({ id: calls[0].id, ok: true, result: {} });
    await wait();

    scope.card = { title: "Second" };
    await wait(50);
    expect(calls.length).withContext("native component update").toBe(2);
    service.receive({ id: calls[1].id, ok: true, result: {} });
    await wait();
    expect(calls[1].method).toBe("update");
    expect(calls[1].params.props.title).toBe("Second");

    scope.destroy();
    expect(calls[2].method).toBe("unmount");
    service.receive({ id: calls[2].id, ok: true, result: {} });
  });

  it("connects native component values to ng-model", async () => {
    scope.query = "first";
    const element = compile(
      '<section ng-native-component="text-field" ng-model="query" required disabled readonly inputmode="email" enterkeyhint="next" autocomplete="email username"></section>',
    )(scope);

    root.append(element);
    await wait(50);
    expect(calls[0].params.props.value).toBe("first");
    expect(calls[0].params.props.required).toBe(true);
    expect(calls[0].params.props.enabled).toBe(false);
    expect(calls[0].params.props.readOnly).toBe(true);
    expect(calls[0].params.props.keyboardType).toBe("email");
    expect(calls[0].params.props.imeAction).toBe("next");
    expect(calls[0].params.props.autofillHints).toEqual(["email", "username"]);
    service.receive({ id: calls[0].id, ok: true, result: {} });
    await wait();

    element.removeAttribute("disabled");
    element.removeAttribute("readonly");
    element.removeAttribute("required");
    element.setAttribute("inputmode", "url");
    element.setAttribute("enterkeyhint", "send");
    element.setAttribute("autocomplete", "url");
    await wait(50);
    expect(calls[1].method).toBe("update");
    expect(calls[1].params.props.enabled).toBe(true);
    expect(calls[1].params.props.required).toBe(false);
    expect(calls[1].params.props.readOnly).toBe(false);
    expect(calls[1].params.props.keyboardType).toBe("url");
    expect(calls[1].params.props.imeAction).toBe("send");
    expect(calls[1].params.props.autofillHints).toEqual(["url"]);
    service.receive({ id: calls[1].id, ok: true, result: {} });
    await wait();

    service.receive({
      target: "component",
      event: "change",
      data: { id: element.id, value: "second" },
    });
    await wait();

    expect(scope.query).toBe("second");

    service.receive({
      target: "component",
      event: "blur",
      data: { id: element.id },
    });
    await wait();
    expect(element.classList.contains("ng-touched")).toBe(true);
  });

  it("accepts native file-picker content URI records through ng-model", async () => {
    scope.files = [];
    const element = compile(
      '<section ng-native-component="file-picker" ng-model="files"></section>',
    )(scope);

    root.append(element);
    await wait(50);
    service.receive({ id: calls[0].id, ok: true, result: {} });
    await wait();
    const callCount = calls.length;

    service.receive({
      target: "component",
      event: "request",
      data: { id: element.id, accept: ["image/*"], multiple: true },
    });
    await wait();
    expect(calls.length).toBe(callCount);

    const files = [{ uri: "content://images/1", name: "photo.jpg" }];
    service.receive({
      target: "component",
      event: "change",
      data: { id: element.id, value: files },
    });
    await wait();
    expect(scope.files).toEqual(files);
  });

  it("uses native required semantics and records user interaction state", async () => {
    scope.accepted = false;
    const element = compile(
      '<section ng-native-component="checkbox" ng-model="accepted" required></section>',
    )(scope);

    root.append(element);
    await wait(50);
    const mount = calls.at(-1);
    const model = getController(element, "ngModel");
    expect(model.isEmpty(false)).toBeTrue();
    service.receive({ id: mount.id, ok: true, result: {} });
    await wait();

    service.receive({
      target: "component",
      event: "change",
      data: { id: element.id, value: true },
    });
    service.receive({
      target: "component",
      event: "blur",
      data: { id: element.id },
    });
    await wait();

    expect(scope.accepted).toBeTrue();
    expect(model.isEmpty(true)).toBeFalse();
    expect(element.classList).toContain("ng-dirty");
    expect(element.classList).toContain("ng-touched");
  });

  [
    { name: "checkbox", initial: false, next: true },
    { name: "range-slider", initial: [0, 10], next: [2, 8] },
    { name: "date-picker", initial: "2026-09-07", next: "2026-09-08" },
  ].forEach(({ name, initial, next }) => {
    it(`preserves ${name} value types through ng-model`, async () => {
      scope.nativeValue = initial;
      const element = compile(
        `<section ng-native-component="${name}" ng-model="nativeValue"></section>`,
      )(scope);

      root.append(element);
      await wait(50);
      const mount = calls.at(-1);
      expect(mount.params.props.value).toEqual(initial);
      service.receive({ id: mount.id, ok: true, result: {} });
      await wait();

      service.receive({
        target: "component",
        event: "change",
        data: { id: element.id, value: next },
      });
      await wait();

      expect(scope.nativeValue).toEqual(next);
    });
  });

  it("runs native event expressions and unsubscribes with the scope", () => {
    scope.capture = jasmine.createSpy("capture");
    const element = compile(
      '<div ng-native-event="component.click" data-on-event="capture($data)"></div>',
    )(scope);

    root.append(element);
    service.receive({
      target: "component",
      event: "click",
      data: { id: "card" },
    });
    expect(scope.capture).toHaveBeenCalledWith({ id: "card" });
    scope.destroy();
    service.receive({ target: "component", event: "click", data: {} });
    expect(scope.capture).toHaveBeenCalledTimes(1);
  });
});
