// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import {
  applyAnchorScrollConfiguration,
  createAnchorScrollRuntimeState,
  createAnchorScrollService,
  destroyAnchorScrollRuntimeState,
} from "./anchor-scroll.ts";

describe("AnchorScroll composition", () => {
  it("defaults automatic scrolling to enabled", () => {
    const state = createAnchorScrollRuntimeState();

    expect(state.autoScrollingEnabled).toBeTrue();
  });

  it("applies configuration before and after service construction", () => {
    const state = createAnchorScrollRuntimeState();
    const removeLocationListener = jasmine.createSpy("removeLocationListener");
    const removeDestroyListener = jasmine.createSpy("removeDestroyListener");
    const listeners = new Map();
    const rootScope = {
      $on(name, listener) {
        listeners.set(name, listener);

        return name === "$destroy"
          ? removeDestroyListener
          : removeLocationListener;
      },
    };

    applyAnchorScrollConfiguration(state, { autoScrolling: false });
    createAnchorScrollService(
      state,
      { getHash: () => "" },
      rootScope,
      document,
      window,
    );

    expect(listeners.has("$locationChangeSuccess")).toBeFalse();

    applyAnchorScrollConfiguration(state, {});
    applyAnchorScrollConfiguration(state, { autoScrolling: true });

    expect(listeners.has("$locationChangeSuccess")).toBeTrue();

    applyAnchorScrollConfiguration(state, { autoScrolling: false });

    expect(removeLocationListener).toHaveBeenCalledTimes(1);

    destroyAnchorScrollRuntimeState(state);
    destroyAnchorScrollRuntimeState(state);

    expect(removeDestroyListener).toHaveBeenCalledTimes(1);
    expect(state.instances.size).toBe(0);
  });

  it("rejects configuration and construction after teardown", () => {
    const state = createAnchorScrollRuntimeState();

    destroyAnchorScrollRuntimeState(state);

    expect(() => applyAnchorScrollConfiguration(state, {})).toThrowError(
      "Anchor-scroll runtime has already been disposed.",
    );
    expect(() =>
      createAnchorScrollService(
        state,
        { getHash: () => "" },
        { $on: () => () => undefined },
        document,
        window,
      ),
    ).toThrowError("Anchor-scroll runtime has already been disposed.");
  });

  it("owns pending load listeners and ignores them after destruction", () => {
    const listeners = new Map();
    const scopeListeners = new Map();
    const runtimeWindow = {
      Element,
      HTMLElement,
      addEventListener: jasmine
        .createSpy("addEventListener")
        .and.callFake((name, listener) => listeners.set(name, listener)),
      removeEventListener: jasmine.createSpy("removeEventListener"),
      getComputedStyle: window.getComputedStyle.bind(window),
      queueMicrotask,
      scrollBy: jasmine.createSpy("scrollBy"),
      scrollTo: jasmine.createSpy("scrollTo"),
    };
    const runtimeDocument = {
      readyState: "loading",
      getElementById: () => null,
      getElementsByName: () => [],
    };
    const state = createAnchorScrollRuntimeState();
    createAnchorScrollService(
      state,
      { getHash: () => "" },
      {
        $on(name, listener) {
          scopeListeners.set(name, listener);
          return () => undefined;
        },
      },
      runtimeDocument,
      runtimeWindow,
    );

    scopeListeners.get("$locationChangeSuccess")(
      {},
      "https://example.test/#top",
      "https://example.test/",
    );

    expect(runtimeWindow.addEventListener).toHaveBeenCalled();

    listeners.get("load")();

    expect(runtimeWindow.scrollTo).toHaveBeenCalledWith(0, 0);

    scopeListeners.get("$locationChangeSuccess")(
      {},
      "https://example.test/#top",
      "https://example.test/",
    );

    const instance = [...state.instances][0];

    instance.destroy();
    instance.destroy();
    listeners.get("load")();

    expect(runtimeWindow.removeEventListener).toHaveBeenCalled();
    expect(runtimeWindow.scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe("AnchorScrollService", () => {
  let $anchorScroll;

  let $injector;

  let el;

  let angular;

  beforeEach(() => {
    el = document.createElement("div");
    el.id = "app";
    document.body.appendChild(el);

    angular = new Angular();

    angular.module("default", []);

    $injector = angular.bootstrap(el, ["default"]);
    $anchorScroll = $injector.get("$anchorScroll");

    // Avoid leaking state between tests
    $anchorScroll.yOffset = undefined;
  });

  afterEach(() => {
    angular._composition.destroy();
    document.body.removeChild(el);
  });

  it("should be injectable", () => {
    expect($anchorScroll).toBeDefined();
    expect(typeof $anchorScroll).toBe("function");
  });

  it("should scroll to top when called with no hash", () => {
    spyOn(window, "scrollTo");

    $anchorScroll();

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("should scroll to element by id", () => {
    const target = document.createElement("div");

    target.id = "target";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");

    $anchorScroll("target");

    expect(target.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should scroll to first anchor by name", () => {
    const anchor = document.createElement("a");

    anchor.setAttribute("name", "myAnchor");
    document.body.appendChild(anchor);

    spyOn(anchor, "scrollIntoView");

    $anchorScroll("myAnchor");

    expect(anchor.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(anchor);
  });

  it("should support numeric hash values", () => {
    const target = document.createElement("div");

    target.id = "123";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");

    $anchorScroll(123);

    expect(target.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should apply numeric yOffset", () => {
    const target = document.createElement("div");

    target.id = "offset";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");
    spyOn(window, "scrollBy");

    $anchorScroll.yOffset = 40;

    $anchorScroll("offset");

    expect(window.scrollBy).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should support yOffset as a function", () => {
    const target = document.createElement("div");

    target.id = "fnOffset";
    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");
    spyOn(window, "scrollBy");

    $anchorScroll.yOffset = () => 25;

    $anchorScroll("fnOffset");

    expect(window.scrollBy).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("uses the bottom edge of a fixed element as yOffset", () => {
    const target = document.createElement("div");
    const offset = document.createElement("header");

    target.id = "fixedOffset";
    el.append(target, offset);
    spyOn(target, "scrollIntoView");
    spyOn(target, "getBoundingClientRect").and.returnValue({ top: 120 });
    spyOn(offset, "getBoundingClientRect").and.returnValue({ bottom: 30 });
    spyOn(window, "getComputedStyle").and.returnValue({ position: "fixed" });
    spyOn(window, "scrollBy");
    $anchorScroll.yOffset = offset;

    $anchorScroll("fixedOffset");

    expect(window.scrollBy).toHaveBeenCalledWith(0, 90);
  });

  it("ignores a non-fixed element used as yOffset", () => {
    const target = document.createElement("div");
    const offset = document.createElement("header");

    target.id = "staticOffset";
    el.append(target, offset);
    spyOn(target, "scrollIntoView");
    spyOn(window, "getComputedStyle").and.returnValue({ position: "static" });
    spyOn(window, "scrollBy");
    $anchorScroll.yOffset = offset;

    $anchorScroll("staticOffset");

    expect(window.scrollBy).not.toHaveBeenCalled();
  });

  it("treats the top hash as the document top", () => {
    spyOn(window, "scrollTo");

    $anchorScroll("top");

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("should scroll when passed an element", () => {
    const target = document.createElement("div");

    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");

    $anchorScroll(target);

    expect(target.scrollIntoView).toHaveBeenCalled();

    document.body.removeChild(target);
  });

  it("should apply yOffset when passed an element", () => {
    const target = document.createElement("div");

    document.body.appendChild(target);

    spyOn(target, "scrollIntoView");
    spyOn(window, "scrollBy");

    $anchorScroll.yOffset = 40;

    $anchorScroll(target);

    expect(target.scrollIntoView).toHaveBeenCalled();
    expect(window.scrollBy).toHaveBeenCalled();

    document.body.removeChild(target);
  });
});
