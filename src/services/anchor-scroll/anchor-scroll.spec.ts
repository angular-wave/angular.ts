/// <reference types="jasmine" />
import { defined } from "../../shared/test-fixtures.spec.ts";
import { Angular } from "../../angular.ts";
import {
  applyAnchorScrollConfiguration,
  createAnchorScrollRuntimeState,
  createAnchorScrollService,
  destroyAnchorScrollRuntimeState,
} from "./anchor-scroll.ts";

describe("AnchorScroll composition", () => {
  let angular: Angular;
  let rootScope: ng.Scope;
  let location: ng.LocationService;
  beforeEach(() => {
    angular = new Angular();
    const injector = angular.bootstrap(document.createElement("div"), []);
    rootScope = injector.get("$rootScope");
    location = injector.get("$location");
    spyOn(location, "getHash").and.returnValue("");
  });
  afterEach(() => angular._composition.destroy());
  it("defaults automatic scrolling to enabled", () => {
    const state = createAnchorScrollRuntimeState();

    expect(state.autoScrollingEnabled).toBeTrue();
  });

  it("applies configuration before and after service construction", () => {
    const state = createAnchorScrollRuntimeState();
    const removeLocationListener = jasmine.createSpy<() => void>(
      "removeLocationListener",
    );
    const removeDestroyListener = jasmine.createSpy<() => void>(
      "removeDestroyListener",
    );
    const listeners = new Map<string, Parameters<ng.Scope["on"]>[1]>();
    spyOn(rootScope, "on").and.callFake((name, listener) => {
      listeners.set(name, listener);

      return name === "$destroy"
        ? removeDestroyListener
        : removeLocationListener;
    });

    applyAnchorScrollConfiguration(state, { autoScrolling: false });
    createAnchorScrollService(state, location, rootScope, document, window);

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
      createAnchorScrollService(state, location, rootScope, document, window),
    ).toThrowError("Anchor-scroll runtime has already been disposed.");
  });

  it("owns pending load listeners and ignores them after destruction", () => {
    const scopeListeners = new Map<string, Parameters<ng.Scope["on"]>[1]>();
    const add = spyOn(window, "addEventListener").and.callThrough();
    const remove = spyOn(window, "removeEventListener").and.callThrough();
    const scroll = spyOn(window, "scrollTo");
    spyOnProperty(document, "readyState", "get").and.returnValue("loading");
    spyOn(rootScope, "on").and.callFake((name, listener) => {
      scopeListeners.set(name, listener);
      return () => undefined;
    });
    const state = createAnchorScrollRuntimeState();
    createAnchorScrollService(state, location, rootScope, document, window);

    defined(scopeListeners.get("$locationChangeSuccess"))(
      {},
      "https://example.test/#top",
      "https://example.test/",
    );

    expect(add).toHaveBeenCalled();

    const invokeLoad = () => {
      const listener = add.calls.mostRecent().args[1];
      if (typeof listener === "function")
        listener.call(window, new Event("load"));
      else listener.handleEvent(new Event("load"));
    };
    invokeLoad();

    expect(scroll).toHaveBeenCalledWith(0, 0);

    defined(scopeListeners.get("$locationChangeSuccess"))(
      {},
      "https://example.test/#top",
      "https://example.test/",
    );

    const instance = defined([...state.instances][0]);

    instance.destroy();
    instance.destroy();
    invokeLoad();

    expect(remove).toHaveBeenCalled();
    expect(scroll).toHaveBeenCalledTimes(1);
  });
});

describe("AnchorScrollService", () => {
  let $anchorScroll: ng.AnchorScrollService;

  let $injector: ng.InjectorService;

  let el: HTMLElement;

  let angular: Angular;

  beforeEach(() => {
    el = document.createElement("div");
    el.id = "app";
    document.body.appendChild(el);

    angular = new Angular();

    angular.createModule("default", []);

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
    spyOn(target, "getBoundingClientRect").and.returnValue(
      new DOMRect(0, 120, 0, 0),
    );
    spyOn(offset, "getBoundingClientRect").and.returnValue(
      new DOMRect(0, 0, 0, 30),
    );
    offset.style.position = "fixed";
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
    offset.style.position = "static";
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
