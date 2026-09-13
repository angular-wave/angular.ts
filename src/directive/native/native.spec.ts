// @ts-nocheck
/// <reference types="jasmine" />
import { dealoc, getController } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { nativeModule } from "../../runtime/native.ts";
import { createAngular } from "../../runtime/index.ts";
import { createNativeService } from "../../services/native/native.ts";
import { ngModelDirective } from "../model/model.ts";
import {
  coerceNativeAttribute,
  nativeElementDirective,
  nativeElementDirectiveName,
  readNativeStyle,
} from "./native-element.ts";
import {
  ngNativeComponentDirective,
  ngNativeDirective,
  ngNativeEventDirective,
} from "./native.ts";

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
      capabilities: {
        component: ["mount", "update", "invoke", "unmount"],
      },
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
      "push",
      { url: "/dashboard" },
      { id: "push-1", scopeId: 4, elementId: "open" },
    );

    expect(calls).toEqual([
      {
        protocol: 1,
        id: "push-1",
        target: "navigation",
        method: "push",
        params: { url: "/dashboard" },
        session: "session-1",
        scopeId: 4,
        elementId: "open",
      },
    ]);

    window.angularNative.receive({ id: "push-1", ok: true, result: 42 });
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

    const result = local.call("navigation", "pop");

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
      '<button id="open" ng-native="navigation.push" data-params="params" data-on-result="capture($result)"></button>',
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

  it("projects computed CSS into native component properties", async () => {
    const styles = document.createElement("style");
    styles.textContent = `
      .native-style-test {
        color: var(--native-test-color);
        background-color: color-mix(in srgb, rgb(250 245 235) 96%, white);
        width: 120px;
        min-height: 44px;
        padding: 8px;
        border: 2px solid rgb(80 70 60);
        border-radius: 12px;
        box-shadow: 0 2px 6px rgb(0 0 0 / 20%);
        font: italic 700 24px/30px Georgia, serif;
        letter-spacing: 1px;
        text-align: center;
        opacity: 0.75;
        accent-color: rgb(184 58 36);
      }
    `;
    document.head.append(styles);
    document.documentElement.style.setProperty(
      "--native-test-color",
      "rgb(32 32 29)",
    );
    const element = compile(
      '<section class="native-style-test" ng-native-component="text" data-props="{ text: \'Pulse\' }"></section>',
    )(scope);

    root.append(element);
    await wait(50);
    expect(calls[0].params.props.style).toEqual(
      jasmine.objectContaining({
        accentColor: "#b83a24",
        backgroundColor: "#faf5ec",
        borderColor: "#50463c",
        borderRadius: 12,
        borderWidth: 2,
        color: "#20201d",
        elevation: 3,
        fontSize: 24,
        fontStyle: "italic",
        fontWeight: "700",
        height: 44,
        letterSpacing: 1,
        lineHeight: 30,
        minHeight: 44,
        opacity: 0.75,
        paddingBottom: 8,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 8,
        textAlign: "center",
        width: 120,
      }),
    );
    expect(calls[0].params.props.style.fontFamily).toContain("Georgia");
    service.receive({ id: calls[0].id, ok: true, result: {} });
    await wait();

    document.documentElement.style.setProperty(
      "--native-test-color",
      "rgb(184 58 36)",
    );
    await wait(50);
    expect(calls.at(-1).method).toBe("update");
    expect(calls.at(-1).params.props.style.color).toBe("#b83a24");

    styles.remove();
    document.documentElement.style.removeProperty("--native-test-color");
  });

  it("projects CSS into generated native element trees", async () => {
    const styles = document.createElement("style");
    styles.textContent = `
      .native-row-style { gap: 8px; background-color: rgb(247 242 232); }
      .native-image-style {
        width: 48px;
        height: 48px;
        border-radius: 24px;
        object-fit: contain;
      }
    `;
    document.head.append(styles);
    const element = compile(`
      <ng-native-row class="native-row-style" label="Styled row">
        <ng-native-image
          class="native-image-style"
          key="photo"
          src="/photo.jpg"
          content-description="Photo"
        ></ng-native-image>
      </ng-native-row>
    `)(scope);

    root.append(element);
    await wait(50);
    expect(calls[0].params.props.spacing).toBe(8);
    expect(calls[0].params.props.style.backgroundColor).toBe("#f7f2e8");
    expect(calls[0].params.props.children[0].props.style).toEqual(
      jasmine.objectContaining({
        borderRadius: 24,
        height: 48,
        objectFit: "contain",
        width: 48,
      }),
    );

    styles.remove();
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

  it("normalizes generated names and every native attribute value type", () => {
    expect(nativeElementDirectiveName("bottom-bar")).toBe("ngNativeBottomBar");
    expect(coerceNativeAttribute("", "BOOLEAN")).toBeTrue();
    expect(coerceNativeAttribute("false", "BOOLEAN")).toBeFalse();
    expect(coerceNativeAttribute("2.75", "FLOAT")).toBe(2.75);
    expect(coerceNativeAttribute("2.75", "INTEGER")).toBe(2);
    expect(coerceNativeAttribute('["one","two"]', "STRING_LIST")).toEqual([
      "one",
      "two",
    ]);
    expect(coerceNativeAttribute('{"ready":true}', "JSON")).toEqual({
      ready: true,
    });
    expect(coerceNativeAttribute("plain", "STRING")).toBe("plain");
    expect(() => coerceNativeAttribute("NaN", "FLOAT")).toThrowError(
      TypeError,
      "Expected a finite float",
    );
  });

  it("handles detached documents and uncommon computed style values", () => {
    const detachedDocument = document.implementation.createHTMLDocument();
    expect(
      readNativeStyle(detachedDocument.createElement("div"), "text"),
    ).toEqual({});

    const computed = {
      color: "#010203",
      backgroundColor: "color(srgb invalid 0 0)",
      borderTopColor: "not-a-color",
      opacity: "invalid",
      boxShadow: "0px 0px -4px rgb(0 0 0)",
      fontFamily: "serif",
      fontStyle: "normal",
      fontWeight: "400",
      textAlign: "start",
      objectFit: "fill",
      accentColor: "color(srgb 100% 0% 0% / 50%)",
      getPropertyValue(property) {
        if (property === "width") return "NaNpx";
        if (property === "height") return "auto";
        if (property === "border-top-width") return "-2px";
        if (property === "row-gap") return "-1px";
        return "0px";
      },
    };
    spyOn(window, "getComputedStyle").and.returnValue(computed);

    expect(readNativeStyle(document.createElement("div"), "image")).toEqual({
      accentColor: "#80ff0000",
      color: "#010203",
    });

    computed.boxShadow = "0px 2px";
    readNativeStyle(document.createElement("div"), "image");
  });

  it("projects bottom bar buttons and nested generated child events", async () => {
    scope.capture = jasmine.createSpy("capture");
    const element = compile(`
      <ng-native-column props="{ label: 'Root' }">
        <ng-native-bottom-bar key="tabs">
          <button key="home" icon="house">Home</button>
          <button id="saved" disabled>Saved</button>
        </ng-native-bottom-bar>
        <div>
          <ng-native-row key="group">
            <ng-native-button
              key="open"
              retain
              on-click="capture($data)"
            >Open</ng-native-button>
            <ng-native-text-field
              key="query"
              ng-model="query"
            ></ng-native-text-field>
            <ng-native-text>Fallback key</ng-native-text>
          </ng-native-row>
        </div>
      </ng-native-column>
    `)(scope);

    root.append(element);
    await wait(50);
    const mount = calls.at(-1);
    const tabs = mount.params.props.children[0];
    expect(tabs.props.items).toEqual([
      { key: "home", label: "Home", icon: "house", enabled: true },
      { key: "saved", label: "Saved", icon: "", enabled: false },
    ]);
    expect(mount.params.props.children[1].props.children[0].retain).toBeTrue();
    service.receive({ id: mount.id, ok: true, result: {} });
    await wait();

    service.receive({
      target: "component",
      event: "childEvent",
      data: {
        id: element.id,
        key: "group",
        event: "childEvent",
        data: { key: "open", event: "click", data: { postId: 7 } },
      },
    });
    expect(scope.capture).toHaveBeenCalledWith({ postId: 7 });

    const textField = element.querySelector("ng-native-text-field");
    getController(textField, "ngModel").render();
    await wait();

    service.receive({
      target: "component",
      event: "childEvent",
      data: { id: element.id, key: "missing", event: "click" },
    });
    service.receive({
      target: "component",
      event: "childEvent",
      data: { id: "another-root", key: "group", event: "click" },
    });
    service.receive({
      target: "component",
      event: "childEvent",
      data: { id: element.id, key: 7, event: "click" },
    });
    service.receive({
      target: "component",
      event: "childEvent",
      data: { id: element.id, key: "group", event: 7 },
    });
    service.receive({
      target: "component",
      event: "childEvent",
      data: {
        id: element.id,
        key: "group",
        event: "childEvent",
        data: { key: "open", event: "click", data: "primitive" },
      },
    });
    service.receive({
      target: "component",
      event: "childEvent",
      data: {
        id: element.id,
        key: "group",
        event: "childEvent",
        data: { key: "open", event: "blur", data: {} },
      },
    });
    expect(scope.capture).toHaveBeenCalledTimes(2);
  });

  it("updates a native root when an existing nested element finishes linking", async () => {
    const native = {
      available: true,
      supports: () => true,
      call: jasmine.createSpy("call").and.resolveTo({}),
      on: () => () => undefined,
    };
    const localScope = { id: 94, on: () => () => undefined };
    const localWindow = {
      document,
      scrollX: 0,
      scrollY: 0,
      queueMicrotask(callback) {
        queueMicrotask(callback);
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    const parent = document.createElement("ng-native-column");
    const child = document.createElement("ng-native-text");
    child.setAttribute("key", "late-child");
    child.setAttribute("text", "Ready");
    parent.append(child);
    root.append(parent);

    nativeElementDirective(
      "column",
      native,
      () => undefined,
      fail,
      localWindow,
    ).link(localScope, parent);
    await wait();

    expect(native.call.calls.count()).toBe(1);
    expect(native.call.calls.mostRecent().args[2].props.children).toEqual([]);

    nativeElementDirective(
      "text",
      native,
      () => undefined,
      fail,
      localWindow,
    ).link(localScope, child);
    await wait();

    expect(native.call.calls.count()).toBe(2);
    expect(native.call.calls.mostRecent().args[1]).toBe("update");
    expect(native.call.calls.mostRecent().args[2].props.children[0]).toEqual(
      jasmine.objectContaining({
        key: "late-child",
        name: "text",
        props: jasmine.objectContaining({ text: "Ready" }),
      }),
    );
  });

  it("does not mount a native element removed before its mount microtask", async () => {
    const native = {
      available: true,
      supports: () => true,
      call: jasmine.createSpy("call").and.resolveTo({}),
      on: () => () => undefined,
    };
    const element = document.createElement("ng-native-text");
    root.append(element);

    nativeElementDirective("text", native, () => undefined, fail, window).link(
      scope,
      element,
    );
    element.remove();
    await wait();

    expect(native.call).not.toHaveBeenCalled();
  });

  it("connects generated native tags to ng-model and schedules root updates", async () => {
    scope.accepted = false;
    const element = compile(
      '<ng-native-checkbox ng-model="accepted" on-change="accepted = $data.value"></ng-native-checkbox>',
    )(scope);

    root.append(element);
    await wait(50);
    const mount = calls.at(-1);
    service.receive({ id: mount.id, ok: true, result: {} });
    await wait();

    service.receive({
      target: "component",
      event: "change",
      data: { id: element.id, value: true },
    });
    await wait(50);
    expect(scope.accepted).toBeTrue();
    expect(calls.at(-1).method).toBe("update");

    scope.destroy();
    const unmount = calls.at(-1);
    expect(unmount.method).toBe("unmount");
    service.receive({ id: unmount.id, ok: false, error: "already removed" });
    await wait();
  });

  it("guards and disposes generated tag shell adapters deterministically", async () => {
    const destroyers = [];
    const listeners = {};
    const eventHandlers = {};
    const unsubscribers = [];
    const exceptionHandler = jasmine.createSpy("exceptionHandler");
    const capture = jasmine.createSpy("capture");
    let supported = false;
    const native = {
      available: true,
      supports: jasmine.createSpy("supports").and.callFake(() => supported),
      call: jasmine
        .createSpy("call")
        .and.callFake((_target, method) =>
          method === "unmount"
            ? Promise.reject(new Error("gone"))
            : Promise.resolve({}),
        ),
      on(_target, event, handler) {
        eventHandlers[event] = handler;
        const unsubscribe = jasmine.createSpy(`unsubscribe-${event}`);
        unsubscribers.push(unsubscribe);
        return unsubscribe;
      },
    };
    const localScope = {
      id: 91,
      props: { text: "Ready" },
      on(event, handler) {
        if (event === "$destroy") destroyers.push(handler);
        return () => undefined;
      },
    };
    const parse = (expression) => {
      if (expression === "props") return (context) => context.props;
      if (expression === "capture($data)") {
        return (_context, locals) => capture(locals.$data);
      }
      return () => {
        throw new Error("expression failed");
      };
    };
    const localWindow = {
      document,
      scrollX: 0,
      scrollY: 0,
      queueMicrotask(callback) {
        queueMicrotask(callback);
      },
      addEventListener(event, handler) {
        listeners[event] = handler;
      },
      removeEventListener(event) {
        delete listeners[event];
      },
    };
    const element = document.createElement("ng-native-button");
    element.setAttribute("props", "props");
    element.setAttribute("on-click", "capture($data)");
    root.append(element);
    nativeElementDirective(
      "button",
      native,
      parse,
      exceptionHandler,
      localWindow,
    ).link(localScope, element);

    await wait();
    expect(native.call).not.toHaveBeenCalled();
    supported = true;
    listeners["ng:native:environment"]();
    listeners["ng:native:environment"]();
    await wait();
    expect(native.call).toHaveBeenCalledWith(
      "component",
      "mount",
      jasmine.objectContaining({ name: "button" }),
    );

    listeners.resize();
    await wait();
    expect(native.call).toHaveBeenCalledTimes(1);
    eventHandlers.click({ event: "click", data: { id: "other" } });
    eventHandlers.click({ event: "click", data: { id: element.id, value: 3 } });
    expect(capture).toHaveBeenCalledWith({ id: element.id, value: 3 });

    element.setAttribute("on-click", "explode($data)");
    eventHandlers.click({ event: "click", data: { id: element.id } });
    expect(exceptionHandler).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: "expression failed" }),
    );

    destroyers.forEach((destroy) => destroy());
    destroyers.forEach((destroy) => destroy());
    await wait();
    expect(
      unsubscribers.every((unsubscribe) => unsubscribe.calls.count() === 1),
    ).toBeTrue();
  });

  it("reports generated root failures only while the shell remains active", async () => {
    const destroyers = [];
    const listeners = {};
    const exceptionHandler = jasmine.createSpy("exceptionHandler");
    const pending = [];
    let available = true;
    const native = {
      get available() {
        return available;
      },
      supports: () => true,
      call: () =>
        new Promise((_resolve, reject) => {
          pending.push(reject);
        }),
      on: () => () => undefined,
    };
    const localScope = {
      id: 92,
      on(event, handler) {
        if (event === "$destroy") destroyers.push(handler);
        return () => undefined;
      },
    };
    const localWindow = {
      document,
      scrollX: 0,
      scrollY: 0,
      queueMicrotask(callback) {
        queueMicrotask(callback);
      },
      addEventListener(event, handler) {
        listeners[event] = handler;
      },
      removeEventListener(event) {
        delete listeners[event];
      },
    };
    const element = document.createElement("ng-native-text");
    root.append(element);
    nativeElementDirective(
      "text",
      native,
      () => undefined,
      exceptionHandler,
      localWindow,
    ).link(localScope, element);

    await wait();
    pending.shift()(new Error("active failure"));
    await wait();
    expect(exceptionHandler).toHaveBeenCalledTimes(1);

    listeners.resize();
    await wait();
    available = false;
    pending.shift()(new Error("unavailable failure"));
    await wait();
    expect(exceptionHandler).toHaveBeenCalledTimes(1);

    available = true;
    listeners["ng:native:environment"]();
    await wait();
    destroyers.forEach((destroy) => destroy());
    pending.shift()(new Error("disposed failure"));
    await wait();
    expect(exceptionHandler).toHaveBeenCalledTimes(1);
  });

  it("mounts custom generic components without observer globals", async () => {
    const detachedDocument = document.implementation.createHTMLDocument();
    const frames = [];
    const destroyers = [];
    const native = {
      available: true,
      call: jasmine.createSpy("call").and.resolveTo({}),
      on: () => () => undefined,
    };
    const localScope = {
      id: 93,
      on(event, handler) {
        if (event === "$destroy") destroyers.push(handler);
        return () => undefined;
      },
      watch: () => () => undefined,
    };
    const localWindow = {
      document: detachedDocument,
      scrollX: 0,
      scrollY: 0,
      requestAnimationFrame(callback) {
        frames.push(callback);
        return frames.length;
      },
      cancelAnimationFrame: jasmine.createSpy("cancelAnimationFrame"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
    const element = detachedDocument.createElement("section");
    element.setAttribute("ng-native-component", "custom-card");
    detachedDocument.body.append(element);

    ngNativeComponentDirective(native, () => undefined, fail, localWindow).link(
      localScope,
      element,
    );
    frames.shift()(0);
    await wait();

    expect(native.call).toHaveBeenCalledWith(
      "component",
      "mount",
      jasmine.objectContaining({ name: "custom-card" }),
    );
    destroyers.forEach((destroy) => destroy());
  });

  it("retries disconnected generic components and coalesces reentrant updates", async () => {
    const detached = compile(
      '<section ng-native-component="text" data-props="{ text: \'Detached\' }"></section>',
    )(scope);
    await wait(120);
    expect(calls).toEqual([]);

    scope.row = { label: "First" };
    const styles = document.createElement("style");
    styles.textContent = ".generic-row { display: flex; gap: 9px; }";
    document.head.append(styles);
    const element = compile(
      '<section class="generic-row" ng-native-component="row" data-props="row"></section>',
    )(scope);
    root.append(element);
    await wait(50);
    const mount = calls.at(-1);
    expect(mount.params.props.spacing).toBe(9);

    scope.row = { label: "Second" };
    await wait(50);
    expect(calls.length).toBe(1);
    service.receive({ id: mount.id, ok: true, result: {} });
    await wait(50);
    expect(calls.at(-1).method).toBe("update");
    expect(calls.at(-1).params.props.label).toBe("Second");
    service.receive({ id: calls.at(-1).id, ok: true, result: {} });
    styles.remove();
  });

  it("reports capability and pushed-event expression errors", async () => {
    const exceptionHandler = jasmine.createSpy("exceptionHandler");
    const destroyers = [];
    const localScope = {
      id: 12,
      on(event, handler) {
        if (event === "$destroy") destroyers.push(handler);
        return handler;
      },
    };
    const failedNative = {
      call: () => Promise.reject(new Error("native failed")),
      on(_target, _event, handler) {
        this.handler = handler;
        return jasmine.createSpy("unsubscribe");
      },
    };
    const parse = () => () => {
      throw new Error("handler failed");
    };

    for (const value of ["", ".open", "camera."]) {
      const invalid = document.createElement("button");
      invalid.setAttribute("ng-native", value);
      ngNativeDirective(failedNative, parse, exceptionHandler).link(
        localScope,
        invalid,
      );
      invalid.click();
    }

    const button = document.createElement("button");
    button.setAttribute("ng-native", "camera.open");
    ngNativeDirective(failedNative, () => undefined, exceptionHandler).link(
      localScope,
      button,
    );
    button.click();
    await wait();
    expect(exceptionHandler).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: "native failed" }),
    );

    const pushed = document.createElement("div");
    pushed.setAttribute("ng-native-event", "component.click");
    pushed.setAttribute("on-event", "explode()");
    ngNativeEventDirective(failedNative, parse, exceptionHandler).link(
      localScope,
      pushed,
    );
    failedNative.handler({ data: { id: 1 } });
    expect(exceptionHandler).toHaveBeenCalledWith(
      jasmine.objectContaining({ message: "handler failed" }),
    );
    destroyers.forEach((destroy) => destroy());
  });
});
