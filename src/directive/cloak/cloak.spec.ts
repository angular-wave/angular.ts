/// <reference types="jasmine" />
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { ngCloakDirective } from "./cloak.ts";

describe("ngCloak", () => {
  let element: any;

  let $compile: any;

  let $rootScope;

  let injector: any;

  beforeEach(() => {
    window.angular = new Angular();
    injector = createInjector(["ng"]);
    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
    element = createElementFromHTML("<div ng-cloak></div>");
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should remove the cloak attribute through $attributes", () => {
    const $attributes = injector.get("$attributes");
    const ngCloak = ngCloakDirective($attributes);

    spyOn($attributes, "set").and.callThrough();

    ngCloak.compile!(element, undefined as any);

    expect($attributes.set).toHaveBeenCalledWith(element, "ngCloak", null);
    expect(element.getAttribute("ng-cloak")).toBeNull();
  });

  it("should get removed when an element is compiled", () => {
    expect(element.getAttribute("ng-cloak")).toBe("");
    $compile(element);
    expect(element.getAttribute("ng-cloak")).toBeNull();
  });
});
