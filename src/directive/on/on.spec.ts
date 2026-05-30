// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";
import { createInjector } from "../../core/di/injector.ts";
import { getNormalizedAttr, getNormalizedAttrName } from "../../shared/dom.ts";

describe("ngOn* event binding", () => {
  let $rootScope, module, injector, $compile;

  const app = document.getElementById("app");

  beforeEach(() => {
    window.angular = new Angular();
    module = window.angular.module("test1", ["ng"]);
    injector = createInjector(["ng", "test1"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  it("should add event listener of specified name", () => {
    $rootScope.name = "Misko";
    const element = $compile('<span ng-on-foo="name = name + 3"></span>')(
      $rootScope,
    );

    expect($rootScope.name).toBe("Misko");

    browserTrigger(element, "foo");
    expect($rootScope.name).toBe("Misko3");
  });

  it("should allow access to the $event object", async () => {
    app.innerHTML = '<span ng-on-foo="e = $event"></span>';
    $compile(app)($rootScope);
    await wait();
    browserTrigger(app.querySelector("span"), "foo");
    expect($rootScope.e.target).toBeDefined();
    expect($rootScope.e.target).toBe(app.querySelector("span"));
  });

  it("should call the listener synchronously", () => {
    const element = $compile('<span ng-on-foo="fooEvent()"></span>')(
      $rootScope,
    );

    $rootScope.fooEvent = jasmine.createSpy("fooEvent");

    browserTrigger(element, "foo");

    expect($rootScope.fooEvent).toHaveBeenCalled();
  });

  it("should support multiple events on a single element", () => {
    const element = $compile(
      '<span ng-on-foo="fooEvent()" ng-on-bar="barEvent()"></span>',
    )($rootScope);

    $rootScope.fooEvent = jasmine.createSpy("fooEvent");
    $rootScope.barEvent = jasmine.createSpy("barEvent");

    browserTrigger(element, "foo");
    expect($rootScope.fooEvent).toHaveBeenCalled();
    expect($rootScope.barEvent).not.toHaveBeenCalled();

    $rootScope.fooEvent.calls.reset();
    $rootScope.barEvent.calls.reset();

    browserTrigger(element, "bar");
    expect($rootScope.fooEvent).not.toHaveBeenCalled();
    expect($rootScope.barEvent).toHaveBeenCalled();
  });

  it("should apply element event policy to all ng-on-* handlers", () => {
    const seen = ($rootScope.seen = jasmine.createSpy("seen"));

    const element = $compile(
      '<span data-event-prevent ng-on-foo="seen($event)" ng-on-bar="seen($event)"></span>',
    )($rootScope);

    const fooEvent = new Event("foo", {
      bubbles: true,
      cancelable: true,
    });

    const barEvent = new Event("bar", {
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(fooEvent);
    element.dispatchEvent(barEvent);

    expect(fooEvent.defaultPrevented).toBe(true);
    expect(barEvent.defaultPrevented).toBe(true);
    expect(seen).toHaveBeenCalledWith(fooEvent);
    expect(seen).toHaveBeenCalledWith(barEvent);
  });

  it("should work with different prefixes", () => {
    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    const element = $compile(
      '<span ng-on-test="cb(1)" ng-On-test2="cb(2)"></span>',
    )($rootScope);

    browserTrigger(element, "test");
    expect(cb).toHaveBeenCalledWith(1);

    browserTrigger(element, "test2");
    expect(cb).toHaveBeenCalledWith(2);
  });

  it("should work if they are prefixed with data- and different prefixes", () => {
    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    const element = $compile(
      '<span data-ng-on-test2="cb(2)" ng-on-test3="cb(3)" data-ng-on-test4="cb(4)" ' +
        'ng-on-test5="cb(5)" ng-on-test6="cb(6)"></span>',
    )($rootScope);

    browserTrigger(element, "test2");
    expect(cb).toHaveBeenCalledWith(2);

    browserTrigger(element, "test3");
    expect(cb).toHaveBeenCalledWith(3);

    browserTrigger(element, "test4");
    expect(cb).toHaveBeenCalledWith(4);

    browserTrigger(element, "test5");
    expect(cb).toHaveBeenCalledWith(5);

    browserTrigger(element, "test6");
    expect(cb).toHaveBeenCalledWith(6);
  });

  it("should work independently of attributes with the same name", () => {
    const element = $compile('<span ng-on-asdf="cb()" asdf="foo" />')(
      $rootScope,
    );

    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    browserTrigger(element, "asdf");
    expect(cb).toHaveBeenCalled();
    expect(element.getAttribute("asdf")).toBe("foo");
  });

  it("should work independently of (ng-)attributes with the same name", () => {
    const element = $compile('<span ng-on-asdf="cb()" ng-attr-asdf="foo" />')(
      $rootScope,
    );

    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    browserTrigger(element, "asdf");
    expect(cb).toHaveBeenCalled();
    expect(element.getAttribute("asdf")).toBe("foo");
  });

  it("should work independently of properties with the same name", () => {
    const element = $compile('<span ng-on-asdf="cb()" ng-prop-asdf="123" />')(
      $rootScope,
    );

    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    browserTrigger(element, "asdf");
    expect(cb).toHaveBeenCalled();
    expect(element.asdf).toBe(123);
  });

  it("should use the full ng-on-* attribute name in $attr mappings", () => {
    let snapshot;

    window.angular.module("test", [
      "ng",
      ($compileProvider) => {
        $compileProvider.directive("attrExposer", () => ({
          link($scope, $element) {
            snapshot = {
              title: getNormalizedAttr($element, "title"),
              titleAttr: getNormalizedAttrName($element, "title"),
              ngOnTitle: getNormalizedAttr($element, "ngOnTitle"),
              ngOnTitleAttr: getNormalizedAttrName($element, "ngOnTitle"),
              superTitle: getNormalizedAttr($element, "superTitle"),
              superTitleAttr: getNormalizedAttrName($element, "superTitle"),
              ngOnSuperTitle: getNormalizedAttr($element, "ngOnSuperTitle"),
              ngOnSuperTitleAttr: getNormalizedAttrName(
                $element,
                "ngOnSuperTitle",
              ),
              myCamelTitle: getNormalizedAttr($element, "myCamelTitle"),
              myCamelTitleAttr: getNormalizedAttrName($element, "myCamelTitle"),
              ngOnMyCamelTitle: getNormalizedAttr($element, "ngOnMyCamelTitle"),
              ngOnMyCamelTitleAttr: getNormalizedAttrName(
                $element,
                "ngOnMyCamelTitle",
              ),
            };
          },
        }));
      },
    ]);
    injector = createInjector(["ng", "test"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");
    $compile(
      '<div attr-exposer ng-on-title="cb(1)" ng-on-super-title="cb(2)" ng-on-my-camel-title="cb(3)">',
    )($rootScope);

    expect(snapshot.title).toBeUndefined();
    expect(snapshot.titleAttr).toBeUndefined();
    expect(snapshot.ngOnTitle).toBe("cb(1)");
    expect(snapshot.ngOnTitleAttr).toBe("ng-on-title");

    expect(snapshot.superTitle).toBeUndefined();
    expect(snapshot.superTitleAttr).toBeUndefined();
    expect(snapshot.ngOnSuperTitle).toBe("cb(2)");
    expect(snapshot.ngOnSuperTitleAttr).toBe("ng-on-super-title");

    expect(snapshot.myCamelTitle).toBeUndefined();
    expect(snapshot.myCamelTitleAttr).toBeUndefined();
    expect(snapshot.ngOnMyCamelTitle).toBe("cb(3)");
    expect(snapshot.ngOnMyCamelTitleAttr).toBe("ng-on-my-camel-title");
  });

  it("should not conflict with (ng-attr-)attribute mappings of the same name", () => {
    let snapshot;

    window.angular.module("test", [
      "ng",
      ($compileProvider) => {
        $compileProvider.directive("attrExposer", () => ({
          link($scope, $element) {
            snapshot = {
              title: getNormalizedAttr($element, "title"),
              titleAttr: getNormalizedAttrName($element, "title"),
              ngOnTitleAttr: getNormalizedAttrName($element, "ngOnTitle"),
            };
          },
        }));
      },
    ]);
    injector = createInjector(["ng", "test"]);
    $rootScope = injector.get("$rootScope");
    $compile = injector.get("$compile");

    $compile(
      '<div attr-exposer ng-on-title="42" ng-attr-title="foo" title="bar">',
    )($rootScope);
    expect(snapshot.title).toBe("foo");
    expect(snapshot.titleAttr).toBe("title");
    expect(snapshot.ngOnTitleAttr).toBe("ng-on-title");
  });

  it("should correctly bind to kebab-cased event names", () => {
    const element = $compile('<span ng-on-foo-bar="cb()"></span>')($rootScope);

    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    browserTrigger(element, "foobar");
    browserTrigger(element, "fooBar");
    expect(cb).not.toHaveBeenCalled();

    browserTrigger(element, "foo-bar");
    expect(cb).toHaveBeenCalled();
  });

  it("should correctly bind to camelCased event names", () => {
    const element = $compile('<span ng-on-foo_bar="cb()"></span>')($rootScope);

    const cb = ($rootScope.cb = jasmine.createSpy("ng-on cb"));

    browserTrigger(element, "foobar");
    browserTrigger(element, "foo-bar");
    browserTrigger(element, "foo-bar");
    browserTrigger(element, "foo-bar");
    expect(cb).not.toHaveBeenCalled();

    browserTrigger(element, "fooBar");
    expect(cb).toHaveBeenCalled();
  });
});
