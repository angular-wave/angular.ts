import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ngEl", () => {
  let $compile, $rootScope, el, $log;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";

    const angular = new Angular();
    angular.module("default", []);

    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_, _$rootScope_, _$log_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $log = _$log_;
      });
  });

  it("should attach element to scope.$target by id when no expression is provided", async () => {
    el.innerHTML = `<div id="foo" ng-el></div>`;
    $compile(el)($rootScope);
    await wait();

    expect($rootScope.$target.foo).toBeDefined();
    expect($rootScope.$target.foo instanceof HTMLElement).toBe(true);
    expect($rootScope.$target.foo.id).toBe("foo");
  });

  it("should attach element to scope.$target using ng-el value as key", async () => {
    el.innerHTML = `<div id="bar" ng-el="myEl"></div>`;
    $compile(el)($rootScope);
    await wait();

    expect($rootScope.$target.myEl).toBeDefined();
    expect($rootScope.$target.myEl.id).toBe("bar");
  });

  it("should support multiple ng-el elements", async () => {
    el.innerHTML = `
      <div id="a" ng-el="first"></div>
      <div id="b" ng-el="second"></div>
      <div id="c" ng-el></div>
    `;

    $compile(el)($rootScope);
    await wait();

    expect(Object.keys($rootScope.$target)).toContain("first");
    expect(Object.keys($rootScope.$target)).toContain("second");
    expect(Object.keys($rootScope.$target)).toContain("c");
    expect($rootScope.$target.first.id).toBe("a");
    expect($rootScope.$target.second.id).toBe("b");
    expect($rootScope.$target.c.id).toBe("c");
  });

  it("should not throw if $target is not defined on scope", async () => {
    el.innerHTML = `<div id="noTarget" ng-el="missing"></div>`;

    // no $target defined on scope
    expect(() => {
      $compile(el)($rootScope);
    }).not.toThrow();
  });

  it("should override previous entries with the same key", async () => {
    el.innerHTML = `
      <div id="x1" ng-el="dup"></div>
      <div id="x2" ng-el="dup"></div>
    `;
    $rootScope.$target = {};

    $compile(el)($rootScope);
    await wait();

    expect($rootScope.$target.dup.id).toBe("x2");
  });

  it("should remove reference from scope.$target when element is removed", async () => {
    el.innerHTML = `<div id="temp" ng-el="tempEl"></div>`;
    $compile(el)($rootScope);
    await wait();

    expect($rootScope.$target.tempEl).toBeDefined();
    const elem = $rootScope.$target.tempEl;

    // simulate element removal and scope destruction
    elem.remove();
    await wait();

    expect($rootScope.$target.tempEl).toBeUndefined();
  });
});
