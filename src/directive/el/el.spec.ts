/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngEl", () => {
  let $compile: any, $rootScope: any, el: any, $log;
  let elementController: any;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";

    const angular = new Angular();

    angular.module("default", []).controller(
      "ElementController",
      function ElementController(this: { boardEl: Element | null }) {
        elementController = this;
        this.boardEl = null;

        return this;
      },
    );

    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_: any, _$rootScope_: any, _$log_: any) => {
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

  it("should keep simple $-prefixed names as scope.$target keys", async () => {
    el.innerHTML = `<button id="bar" ng-el="$button"></button>`;
    $compile(el)($rootScope);
    await wait();

    expect($rootScope.$target.$button).toBeDefined();
    expect($rootScope.$target.$button.id).toBe("bar");
  });

  it("should assign element to a controller-as expression", async () => {
    el.innerHTML = `
      <section ng-controller="ElementController as $ctrl">
        <canvas id="board" ng-el="$ctrl.boardEl"></canvas>
      </section>
    `;

    $compile(el)($rootScope);
    await wait();

    expect(elementController.boardEl).toBeDefined();
    expect(elementController.boardEl.id).toBe("board");
    expect($rootScope.$target["$ctrl.boardEl"]).toBeUndefined();
  });

  it("should clear controller-as expression refs when the element is removed", async () => {
    el.innerHTML = `
      <section ng-controller="ElementController as $ctrl">
        <canvas id="board" ng-el="$ctrl.boardEl"></canvas>
      </section>
    `;

    $compile(el)($rootScope);
    await wait();

    const boardEl = elementController.boardEl;

    expect(boardEl.id).toBe("board");

    boardEl.remove();
    await wait();

    expect(elementController.boardEl).toBeNull();
  });

  it("should assign and clear object path expressions on scope destroy", async () => {
    const scope = $rootScope.$new();

    scope.refs = {
      panel: null,
    };
    el.innerHTML = `<section id="panel" ng-el="refs.panel"></section>`;

    $compile(el)(scope);
    await wait();

    expect(scope.refs.panel).toBeDefined();
    expect(scope.refs.panel.id).toBe("panel");

    scope.$destroy();

    expect(scope.refs.panel).toBeNull();
  });

  it("should throw for non-assignable element expressions", () => {
    el.innerHTML = `<div ng-el="'literal'"></div>`;

    expect(() => {
      $compile(el)($rootScope);
    }).toThrowError(/nonassign/);
  });

  it("should support normalized data-ng-el aliases", async () => {
    el.innerHTML = `<div id="bar" data-ng-el="myEl"></div>`;
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
