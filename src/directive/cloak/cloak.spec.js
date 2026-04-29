import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { ngCloakDirective } from "./cloak.ts";
import { Attributes } from "../../core/compile/attributes.ts";
import { NodeRef } from "../../shared/noderef.ts";

describe("ngCloak", () => {
  let element;
  let $compile;
  let $rootScope;
  let injector;

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

  it("should invoke $set on attribute of directive", () => {
    const ngCloak = ngCloakDirective();
    const attr = new Attributes(
      injector,
      () => {},
      () => {},
      new NodeRef(element),
    );

    spyOn(attr, "$set");
    ngCloak.compile(element, attr);
    expect(attr.$set).toHaveBeenCalledWith("ngCloak", null);
  });

  it("should get removed when an element is compiled", () => {
    expect(element.getAttribute("ng-cloak")).toBe("");
    $compile(element);
    expect(element.getAttribute("ng-cloak")).toBeNull();
  });
});
