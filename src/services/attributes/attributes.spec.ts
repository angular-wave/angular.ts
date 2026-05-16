// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc, setTranscludedHostElement } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("$attributes", () => {
  let angular: Angular;
  let app: HTMLElement;
  let $attributes: ng.AttributesService;
  let $rootScope: ng.Scope;
  let errors: string[];

  beforeEach(() => {
    angular = new Angular();
    errors = [];
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);

    angular
      .module("attributesTest", ["ng"])
      .decorator("$exceptionHandler", () => {
        return (exception: Error) => {
          errors.push(exception.message);
        };
      });

    angular
      .bootstrap(app, ["attributesTest"])
      .invoke((_$attributes_, _$rootScope_) => {
        $attributes = _$attributes_;
        $rootScope = _$rootScope_;
      });
  });

  afterEach(() => {
    dealoc(app);
  });

  it("reads normalized attribute aliases from the element", () => {
    const element = document.createElement("div");

    element.setAttribute("data-ng-on-test", "data handler");
    expect($attributes.read(element, "ngOnTest")).toBe("data handler");
    expect($attributes.has(element, "ngOnTest")).toBeTrue();

    element.removeAttribute("data-ng-on-test");
    element.setAttribute("ng-on-test", "handler");
    expect($attributes.read(element, "ngOnTest")).toBe("handler");
  });

  it("reads custom data attributes without decorated object properties", () => {
    const element = document.createElement("div");

    element.setAttribute("data-config", "transportConfig");

    expect($attributes.read(element, "config")).toBe("transportConfig");
    expect("config" in {}).toBeFalse();
  });

  it("does not decorate the service object with normalized attribute values", async () => {
    const element = document.createElement("div");
    const hasOwn = Object.prototype.hasOwnProperty;

    element.setAttribute("data-ng-on-test", "data handler");

    expect($attributes.read(element, "ngOnTest")).toBe("data handler");
    expect(hasOwn.call($attributes, "ngOnTest")).toBeFalse();
    expect(($attributes as Record<string, unknown>).ngOnTest).toBeUndefined();

    $attributes.set(element, "ngOnTest", "updated");
    expect(element.getAttribute("ng-on-test")).toBe("updated");
    expect(hasOwn.call($attributes, "ngOnTest")).toBeFalse();

    $attributes.observe($rootScope, element, "ngOnTest", () => {
      /* observe only */
    });
    element.setAttribute("data-ng-on-test", "observed");
    await wait();

    expect(hasOwn.call($attributes, "ngOnTest")).toBeFalse();
    expect(($attributes as Record<string, unknown>).ngOnTest).toBeUndefined();
  });

  it("reads later DOM attribute updates without cached attrs properties", () => {
    const element = document.createElement("div");

    element.setAttribute("data-config", "first");
    expect($attributes.read(element, "config")).toBe("first");

    element.removeAttribute("data-config");
    element.setAttribute("config", "second");
    expect($attributes.read(element, "config")).toBe("second");
  });

  it("reads attributes from the host element for transclusion anchors", () => {
    const host = document.createElement("div");

    host.setAttribute("data-ng-if", "visible");

    const anchor = document.createComment("ngIf");

    setTranscludedHostElement(anchor, host);

    expect($attributes.read(anchor, "ngIf")).toBe("visible");
    expect($attributes.has(anchor, "ngIf")).toBeTrue();
  });

  it("observes initial and later normalized attribute values", async () => {
    const element = document.createElement("div");
    const values: Array<string | undefined> = [];

    element.setAttribute("data-title", "first");

    $attributes.observe($rootScope, element, "title", (value) => {
      values.push(value);
    });

    expect(values).toEqual(["first"]);

    element.setAttribute("data-title", "second");
    await wait();

    expect(values).toEqual(["first", "second"]);

    element.removeAttribute("data-title");
    await wait();

    expect(values).toEqual(["first", "second", undefined]);
  });

  it("stops observing when the deregistration function runs", async () => {
    const element = document.createElement("div");
    const values: Array<string | undefined> = [];

    const deregister = $attributes.observe(
      $rootScope,
      element,
      "state",
      (value) => {
        values.push(value);
      },
    );

    element.setAttribute("data-state", "first");
    await wait();

    deregister();

    element.setAttribute("data-state", "second");
    await wait();

    expect(values).toEqual(["first"]);
  });

  it("stops observing when the owning scope is destroyed", async () => {
    const element = document.createElement("div");
    const values: Array<string | undefined> = [];

    $attributes.observe($rootScope, element, "title", (value) => {
      values.push(value);
    });

    element.setAttribute("title", "first");
    await wait();

    $rootScope.$destroy();

    element.setAttribute("title", "second");
    await wait();

    expect(values).toEqual(["first"]);
  });

  it("notifies normalized target observers for aliased ng-* attributes", async () => {
    const element = document.createElement("input");
    const values: Array<string | undefined> = [];

    $attributes.observe($rootScope, element, "min", (value) => {
      values.push(value);
    });

    expect(values).toEqual([]);

    element.setAttribute("ng-min", "25");
    await wait();

    expect(values).toEqual(["25"]);
  });

  it("sets attributes and notifies observers synchronously without duplicate mutation notifications", async () => {
    const element = document.createElement("div");
    const values: Array<string | undefined> = [];

    $attributes.observe($rootScope, element, "title", (value) => {
      values.push(value);
    });

    $attributes.set(element, "title", "first");

    expect(element.getAttribute("title")).toBe("first");
    expect(values).toEqual(["first"]);

    await wait();

    expect(values).toEqual(["first"]);
  });

  it("sets aliased ng-* attributes and notifies normalized target observers", async () => {
    const element = document.createElement("input");
    const values: Array<string | undefined> = [];

    $attributes.observe($rootScope, element, "min", (value) => {
      values.push(value);
    });

    $attributes.set(element, "ngMin", "25");

    expect(element.getAttribute("ng-min")).toBe("25");
    expect(values).toEqual(["25"]);

    await wait();

    expect(values).toEqual(["25"]);
  });

  it("adds, removes, and updates classes on elements", () => {
    const element = document.createElement("div");

    $attributes.addClass(element, "first extra");
    expect(element.classList.contains("first")).toBeTrue();
    expect(element.classList.contains("extra")).toBeTrue();

    $attributes.updateClass(element, "first second", "first third");
    expect(element.classList.contains("first")).toBeTrue();
    expect(element.classList.contains("second")).toBeTrue();
    expect(element.classList.contains("third")).toBeFalse();

    $attributes.removeClass(element, "second extra");
    expect(element.classList.contains("second")).toBeFalse();
    expect(element.classList.contains("extra")).toBeFalse();
  });

  it("routes observer callback exceptions through $exceptionHandler", async () => {
    const element = document.createElement("div");

    $attributes.observe($rootScope, element, "title", () => {
      throw new Error("observe failed");
    });

    element.setAttribute("title", "first");
    await wait();

    expect(errors).toEqual(["observe failed"]);
  });

  it("returns the original DOM attribute name for normalized aliases", () => {
    const element = document.createElement("div");

    element.setAttribute("data-ng-transclude", "data-ng-transclude");

    expect($attributes.originalName(element, "ngTransclude")).toBe(
      "data-ng-transclude",
    );
  });

  it("returns undefined and false for missing attributes", () => {
    const element = document.createElement("div");

    expect($attributes.read(element, "ngIf")).toBeUndefined();
    expect($attributes.has(element, "ngIf")).toBeFalse();
    expect($attributes.originalName(element, "ngIf")).toBeUndefined();
  });
});
