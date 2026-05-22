// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import {
  dealoc,
  getNormalizedAttr,
  getNormalizedAttrName,
  hasNormalizedAttr,
} from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  observeInternalAttribute,
  setInternalAttribute,
} from "./attributes.ts";

describe("internal attributes", () => {
  let angular: Angular;
  let app: HTMLElement;
  let $rootScope: ng.Scope;

  beforeEach(() => {
    angular = new Angular();
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);

    angular.bootstrap(app, ["ng"]).invoke((_$rootScope_) => {
      $rootScope = _$rootScope_;
    });
  });

  afterEach(() => {
    dealoc(app);
  });

  it("reads normalized attribute aliases from the element", () => {
    const element = document.createElement("div");

    element.setAttribute("data-ng-on-test", "data handler");
    expect(getNormalizedAttr(element, "ngOnTest")).toBe("data handler");
    expect(hasNormalizedAttr(element, "ngOnTest")).toBeTrue();

    element.removeAttribute("data-ng-on-test");
    element.setAttribute("ng-on-test", "handler");
    expect(getNormalizedAttr(element, "ngOnTest")).toBe("handler");
  });

  it("reads custom data attributes without decorated object properties", () => {
    const element = document.createElement("div");

    element.setAttribute("data-config", "transportConfig");

    expect(getNormalizedAttr(element, "config")).toBe("transportConfig");
    expect("config" in {}).toBeFalse();
  });

  it("sets and observes without caching normalized attributes on a service object", async () => {
    const element = document.createElement("div");

    element.setAttribute("data-ng-on-test", "data handler");

    expect(getNormalizedAttr(element, "ngOnTest")).toBe("data handler");

    setInternalAttribute(element, "ngOnTest", "updated");
    expect(element.getAttribute("ng-on-test")).toBe("updated");

    observeInternalAttribute($rootScope, element, "ngOnTest", () => {
      /* observe only */
    });
    element.setAttribute("data-ng-on-test", "observed");
    await wait();

    expect(getNormalizedAttr(element, "ngOnTest")).toBe("observed");
  });

  it("reads later DOM attribute updates without cached attrs properties", () => {
    const element = document.createElement("div");

    element.setAttribute("data-config", "first");
    expect(getNormalizedAttr(element, "config")).toBe("first");

    element.removeAttribute("data-config");
    element.setAttribute("config", "second");
    expect(getNormalizedAttr(element, "config")).toBe("second");
  });

  it("does not read attributes from transclusion anchor comments", () => {
    const host = document.createElement("div");

    host.setAttribute("data-ng-if", "visible");

    const anchor = document.createComment("ngIf");

    expect(getNormalizedAttr(anchor, "ngIf")).toBeUndefined();
    expect(hasNormalizedAttr(anchor, "ngIf")).toBeFalse();
  });

  it("observes initial and later normalized attribute values", async () => {
    const element = document.createElement("div");
    const values: Array<string | undefined> = [];

    element.setAttribute("data-title", "first");

    observeInternalAttribute($rootScope, element, "title", (value) => {
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

    const deregister = observeInternalAttribute(
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

    observeInternalAttribute($rootScope, element, "title", (value) => {
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

    observeInternalAttribute($rootScope, element, "min", (value) => {
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

    observeInternalAttribute($rootScope, element, "title", (value) => {
      values.push(value);
    });

    setInternalAttribute(element, "title", "first");

    expect(element.getAttribute("title")).toBe("first");
    expect(values).toEqual(["first"]);

    await wait();

    expect(values).toEqual(["first"]);
  });

  it("sets aliased ng-* attributes and notifies normalized target observers", async () => {
    const element = document.createElement("input");
    const values: Array<string | undefined> = [];

    observeInternalAttribute($rootScope, element, "min", (value) => {
      values.push(value);
    });

    setInternalAttribute(element, "ngMin", "25");

    expect(element.getAttribute("ng-min")).toBe("25");
    expect(values).toEqual(["25"]);

    await wait();

    expect(values).toEqual(["25"]);
  });

  it("returns the original DOM attribute name for normalized aliases", () => {
    const element = document.createElement("div");

    element.setAttribute("data-ng-transclude", "data-ng-transclude");

    expect(getNormalizedAttrName(element, "ngTransclude")).toBe(
      "data-ng-transclude",
    );
  });

  it("returns undefined and false for missing attributes", () => {
    const element = document.createElement("div");

    expect(getNormalizedAttr(element, "ngIf")).toBeUndefined();
    expect(hasNormalizedAttr(element, "ngIf")).toBeFalse();
    expect(getNormalizedAttrName(element, "ngIf")).toBeUndefined();
  });
});
