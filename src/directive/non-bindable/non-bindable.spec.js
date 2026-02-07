import { dealoc } from "../../shared/dom.js";
import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.js";
import { wait } from "../../shared/test-utils.js";

describe("ngNonBindable", () => {
  let element;
  let $rootScope;
  let injector;
  let $compile;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]);
    injector = createInjector(["myModule"]);
    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should prevent compilation of the owning element and its children", async () => {
    element = $compile(
      '<div ng-non-bindable text="{{name}}"><span ng-bind="name"></span></div>',
    )($rootScope);
    element = $compile(
      "<div>" +
        '  <span id="s1">{{a}}</span>' +
        '  <span id="s2" ng-bind="b"></span>' +
        '  <div foo="{{a}}" ng-non-bindable>' +
        '    <span ng-bind="a"></span>{{b}}' +
        "  </div>" +
        '  <span id="s3">{{a}}</span>' +
        '  <span id="s4" ng-bind="b"></span>' +
        "</div>",
    )($rootScope);
    $rootScope.a = "one";
    $rootScope.b = "two";
    await wait();
    // Bindings not contained by ng-non-bindable should resolve.
    const spans = element.querySelectorAll("span");
    expect(spans[0].textContent).toEqual("one");
    expect(spans[1].textContent).toEqual("two");
    expect(spans[3].textContent).toEqual("one");
    expect(spans[4].textContent).toEqual("two");
    // Bindings contained by ng-non-bindable should be left alone.
    const nonBindableDiv = element.querySelector("div");
    expect(nonBindableDiv.getAttribute("foo")).toEqual("{{a}}");
    expect(nonBindableDiv.textContent.trim()).toEqual("{{b}}");
  });
});
