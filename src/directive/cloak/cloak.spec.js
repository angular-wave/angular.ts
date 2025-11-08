import { createElementFromHTML, dealoc } from "../../shared/dom.js";
import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.js";

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
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should get removed when an element is compiled", () => {
    element = createElementFromHTML("<div ng-cloak></div>");
    expect(element.getAttribute("ng-cloak")).toBe("");
    $compile(element);
    expect(element.getAttribute("ng-cloak")).toBeNull();
  });
});
