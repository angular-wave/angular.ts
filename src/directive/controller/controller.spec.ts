// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc, createElementFromHTML } from "../../shared/dom.ts";
import { bind } from "../../shared/utils.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";

describe("ngController", () => {
  let angular;

  let element;

  let injector;

  let $rootScope;

  let $compile;

  const Greeter = function ($scope) {
    // private stuff (not exported to scope)
    this.prefix = "Hello ";

    // public stuff (exported to scope)
    const ctrl = this;

    $scope.name = "Misko";
    $scope.expr = "Vojta";
    $scope.greet = function (name) {
      return ctrl.prefix + name + ctrl.suffix;
    };

    $scope.protoGreet = bind(this, this.protoGreet);
  };
  Greeter.$inject = ["$scope"];

  Greeter.prototype = {
    suffix: "!",
    protoGreet(name) {
      return this.prefix + name + this.suffix;
    },
  };

  class RowsController {
    rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

    swapRows() {
      const first = this.rows[0];

      this.rows[0] = this.rows[2];
      this.rows[2] = first;
    }

    removeRow() {
      this.rows.splice(1, 1);
    }
  }

  beforeEach(() => {
    angular = new Angular();
    window.angular = angular;
    angular
      .module("controllerDirectiveTests", ["ng"])
      .controller("PublicModule", function () {
        this.mark = "works";
      })
      .controller("Greeter", Greeter)

      .controller("Child", [
        "$scope",
        ($scope) => {
          $scope.name = "Adam";
        },
      ])

      .controller("Public", [
        "$scope",
        function ($scope) {
          this.mark = "works";
        },
      ])
      .controller("RowsController", RowsController)
      .component("testFunctionCounter", {
        controller: function () {
          const $ctrl = this;

          $ctrl.increment = () => {
            $ctrl.count = $ctrl.count + 1;
          };
        },
        template: `
          <section ng-cloak>
            <button ng-init="$ctrl.count = 0" ng-click="$ctrl.increment()">
              Count is: {{ $ctrl.count }}
            </button>
          </section>
        `,
      });

    const Foo = function ($scope) {
      $scope.mark = "foo";
    };

    angular
      .module("controllerDirectiveTests")
      .controller("BoundFoo", ["$scope", Foo.bind(null)]);

    injector = createInjector(["controllerDirectiveTests"]).invoke([
      "$rootScope",
      "$compile",
      (_$rootScope_, _$compile_) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should instantiate controller and bind methods", async () => {
    element = $compile('<div ng-controller="Greeter">{{greet(name)}}</div>')(
      $rootScope,
    );
    await wait();
    expect(element.innerText).toBe("Hello Misko!");
  });

  it("should instantiate bound constructor functions", async () => {
    element = $compile('<div ng-controller="BoundFoo">{{mark}}</div>')(
      $rootScope,
    );
    await wait();
    expect(element.innerText).toBe("foo");
  });

  it("should publish controller into scope", async () => {
    element = $compile('<div ng-controller="Public as p">{{p.mark}}</div>')(
      $rootScope,
    );
    await wait();
    expect(element.innerText).toBe("works");
  });

  it("should publish controller into scope from module", async () => {
    element = $compile(
      '<div ng-controller="PublicModule as p">{{p.mark}}</div>',
    )($rootScope);
    await wait();
    expect(element.innerText).toBe("works");
  });

  it("should observe keyed collection mutations made by controller-as methods", async () => {
    element = $compile(`
      <div ng-controller="RowsController as vm">
        <button data-action="swap" ng-click="vm.swapRows()"></button>
        <button data-action="remove" ng-click="vm.removeRow()"></button>
        <span ng-repeat="row in vm.rows">{{row.id}}</span>
      </div>
    `)($rootScope);
    await wait();

    element.querySelector('[data-action="swap"]').click();
    await wait();
    expect(
      Array.from(element.querySelectorAll("span"), (node) => node.innerText),
    ).toEqual(["3", "2", "1"]);

    element.querySelector('[data-action="remove"]').click();
    await wait();
    expect(
      Array.from(element.querySelectorAll("span"), (node) => node.innerText),
    ).toEqual(["3", "1"]);
  });

  it("should observe component controller mutations through an arrow closure", async () => {
    element = $compile("<test-function-counter></test-function-counter>")(
      $rootScope,
    );
    await wait();

    const button = element.querySelector("button");

    expect(button.innerText.trim()).toBe("Count is: 0");

    button.click();
    await wait();
    expect(button.innerText.trim()).toBe("Count is: 1");
  });

  it("should allow nested controllers", async () => {
    element = $compile(
      '<div ng-controller="Greeter"><div ng-controller="Child">{{greet(name)}}</div></div>',
    )($rootScope);
    await wait();
    expect(element.innerText).toBe("Hello Adam!");
    dealoc(element);

    element = $compile(
      '<div ng-controller="Greeter"><div ng-controller="Child">{{protoGreet(name)}}</div></div>',
    )($rootScope);
    await wait();
    expect(element.innerText).toBe("Hello Adam!");
  });

  it("should work with ngInclude on the same element", async () => {
    element = createElementFromHTML(
      '<div><div ng-controller="Greeter" ng-include="\'/mock/interpolation\'"></div></div>',
    );
    window.angular.module("myModule", []).controller("Greeter", [
      "$scope",
      "$element",
      function GreeterController($scope, $element) {
        $scope.expr = "Vojta";
      },
    ]);
    injector = angular.bootstrap(element, ["myModule"]);

    $rootScope = injector.get("$rootScope");
    await waitUntil(() => element.children[0]?.innerHTML === "Vojta");
    expect(element.children[0].innerHTML).toEqual("Vojta");
  });

  it("should only instantiate the controller once with ngInclude on the same element", async () => {
    let count = 0;

    element = createElementFromHTML(
      '<div><div ng-controller="Count" ng-include="\'/mock/interpolation\'"></div></div>',
    );
    window.angular
      .module("myModule", [])
      .controller("Count", function CountController() {
        count += 1;
      });

    injector = angular.bootstrap(element, ["myModule"]);

    $rootScope = injector.get("$rootScope");

    $rootScope.expr = "first";
    $rootScope.expr = "second";
    await waitUntil(() => element.textContent === "second");
    expect(count).toBe(1);
  });

  it("when ngInclude is on the same element, the content included content should get a child scope of the controller", async () => {
    let controllerScope;

    element = createElementFromHTML(
      '<div><div ng-controller="ExposeScope" ng-include="\'/mock/scopeinit\'"></div></div>',
    );

    window.angular.module("myModule", []).controller("ExposeScope", [
      "$scope",
      function ExposeScopeController($scope) {
        controllerScope = $scope;
      },
    ]);

    injector = angular.bootstrap(element, ["myModule"]);

    $rootScope = injector.get("$rootScope");
    await waitUntil(() => element.querySelector("[ng-init]") !== null);
    expect(controllerScope.name).toBeUndefined();
  });
});
