/// <reference types="jasmine" />
import { defined, htmlNode } from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc, createElementFromHTML } from "../../shared/dom.ts";
import { bind } from "../../shared/utils.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";

describe("ngController", () => {
  let angular: Angular;

  let element: HTMLElement;

  let injector: ng.InjectorService;

  let $rootScope: FixtureScope;

  let $compile: ng.CompileService;

  interface GreeterInstance {
    prefix: string;
    suffix: string;
    protoGreet(name: string): string;
  }
  const Greeter = function (
    this: GreeterInstance,
    $scope: FixtureScope,
  ): undefined {
    // private stuff (not exported to scope)
    this.prefix = "Hello ";

    // public stuff (exported to scope)
    const ctrl = this;

    $scope.name = "Misko";
    $scope.expr = "Vojta";
    $scope.greet = function (name: string) {
      return ctrl.prefix + name + ctrl.suffix;
    };

    $scope.protoGreet = bind(this, this.protoGreet);
  };
  Greeter.$inject = ["$scope"];

  Greeter.prototype = {
    suffix: "!",
    protoGreet(this: GreeterInstance, name: string) {
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
      .createModule("controllerDirectiveTests", ["ng"])
      .controller("PublicModule", function (this: { mark: string }): undefined {
        this.mark = "works";
      })
      .controller("Greeter", Greeter)

      .controller("Child", [
        "$scope",
        ($scope: FixtureScope): undefined => {
          $scope.name = "Adam";
        },
      ])

      .controller("Public", [
        "$scope",
        function (this: { mark: string }, $scope: FixtureScope): undefined {
          this.mark = "works";
        },
      ])
      .controller("RowsController", RowsController)
      .component("testFunctionCounter", {
        controller: function (this: {
          count: number;
          increment(): void;
        }): undefined {
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

    const Foo = function ($scope: FixtureScope): undefined {
      $scope.mark = "foo";
    };

    angular
      .getModule("controllerDirectiveTests")
      .controller("BoundFoo", ["$scope", Foo.bind(null)]);

    injector = createInjector(["controllerDirectiveTests"]);
    injector.invoke([
      "$rootScope",
      "$compile",
      (_$rootScope_: FixtureScope, _$compile_: ng.CompileService) => {
        $rootScope = _$rootScope_;
        $compile = _$compile_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should instantiate controller and bind methods", async () => {
    element = htmlNode(
      $compile('<div ng-controller="Greeter">{{greet(name)}}</div>')(
        $rootScope,
      ),
    );
    await wait();
    expect(element.innerText).toBe("Hello Misko!");
  });

  it("should instantiate bound constructor functions", async () => {
    element = htmlNode(
      $compile('<div ng-controller="BoundFoo">{{mark}}</div>')($rootScope),
    );
    await wait();
    expect(element.innerText).toBe("foo");
  });

  it("should publish controller into scope", async () => {
    element = htmlNode(
      $compile('<div ng-controller="Public as p">{{p.mark}}</div>')($rootScope),
    );
    await wait();
    expect(element.innerText).toBe("works");
  });

  it("should publish controller into scope from module", async () => {
    element = htmlNode(
      $compile('<div ng-controller="PublicModule as p">{{p.mark}}</div>')(
        $rootScope,
      ),
    );
    await wait();
    expect(element.innerText).toBe("works");
  });

  it("should observe keyed collection mutations made by controller-as methods", async () => {
    element = htmlNode(
      $compile(`
      <div ng-controller="RowsController as vm">
        <button data-action="swap" ng-click="vm.swapRows()"></button>
        <button data-action="remove" ng-click="vm.removeRow()"></button>
        <span ng-repeat="row in vm.rows">{{row.id}}</span>
      </div>
    `)($rootScope),
    );
    await wait();

    htmlNode(element.querySelector('[data-action="swap"]')).click();
    await wait();
    expect(
      Array.from(element.querySelectorAll("span"), (node) => node.innerText),
    ).toEqual(["3", "2", "1"]);

    htmlNode(element.querySelector('[data-action="remove"]')).click();
    await wait();
    expect(
      Array.from(element.querySelectorAll("span"), (node) => node.innerText),
    ).toEqual(["3", "1"]);
  });

  it("should observe component controller mutations through an arrow closure", async () => {
    element = htmlNode(
      $compile("<test-function-counter></test-function-counter>")($rootScope),
    );
    await wait();

    const button = element.querySelector("button");

    expect(defined(button).innerText.trim()).toBe("Count is: 0");

    defined(button).click();
    await wait();
    expect(defined(button).innerText.trim()).toBe("Count is: 1");
  });

  it("should allow nested controllers", async () => {
    element = htmlNode(
      $compile(
        '<div ng-controller="Greeter"><div ng-controller="Child">{{greet(name)}}</div></div>',
      )($rootScope),
    );
    await wait();
    expect(element.innerText).toBe("Hello Adam!");
    dealoc(element);

    element = htmlNode(
      $compile(
        '<div ng-controller="Greeter"><div ng-controller="Child">{{protoGreet(name)}}</div></div>',
      )($rootScope),
    );
    await wait();
    expect(element.innerText).toBe("Hello Adam!");
  });

  it("should work with ngInclude on the same element", async () => {
    element = htmlNode(
      createElementFromHTML(
        '<div><div ng-controller="Greeter" ng-include="\'/mock/interpolation\'"></div></div>',
      ),
    );
    window.angular.createModule("myModule", []).controller("Greeter", [
      "$scope",
      "$element",
      function GreeterController(
        $scope: FixtureScope,
        $element: Element,
      ): undefined {
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

    element = htmlNode(
      createElementFromHTML(
        '<div><div ng-controller="Count" ng-include="\'/mock/interpolation\'"></div></div>',
      ),
    );
    window.angular
      .createModule("myModule", [])
      .controller("Count", function CountController(): undefined {
        count += 1;
      });

    injector = angular.bootstrap(element, ["myModule"]);

    $rootScope = injector.get("$rootScope");

    $rootScope.expr = "first";
    await waitUntil(() => element.textContent === "first");
    expect(count).toBe(1);
    $rootScope.expr = "second";
    await waitUntil(() => element.textContent === "second");
    expect(count).toBe(1);
  });

  it("when ngInclude is on the same element, the content included content should get a child scope of the controller", async () => {
    let controllerScope: FixtureScope | undefined;

    element = htmlNode(
      createElementFromHTML(
        '<div><div ng-controller="ExposeScope" ng-include="\'/mock/scopeinit\'"></div></div>',
      ),
    );

    window.angular.createModule("myModule", []).controller("ExposeScope", [
      "$scope",
      function ExposeScopeController($scope: FixtureScope): undefined {
        controllerScope = $scope;
      },
    ]);

    injector = angular.bootstrap(element, ["myModule"]);

    $rootScope = injector.get("$rootScope");
    await waitUntil(() => element.querySelector("[ng-init]") !== null);
    expect(defined(controllerScope).name).toBeUndefined();
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  name?: string;
  expr?: string;
  greet?: unknown;
  protoGreet?: unknown;
  mark?: string;
}
