/// <reference types="jasmine" />
import { defined, htmlNode } from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngRepeat attribute reads", () => {
  let $compile: ng.CompileService;
  let $rootScope: FixtureScope;
  let element: HTMLElement;

  beforeEach(() => {
    const app = defined(defined(document.getElementById("app")));

    dealoc(app);
    window.angular = new Angular();

    const injector = window.angular.bootstrap(app, []);

    injector.invoke([
      "$compile",
      "$rootScope",
      (_$compile_: ng.CompileService, _$rootScope_: FixtureScope) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should read data-ng-repeat from the host element", async () => {
    element = htmlNode(
      $compile(
        '<ul><li data-ng-repeat="item in items">{{item.name}};</li></ul>',
      )($rootScope),
    );

    $rootScope.items = [{ name: "red" }, { name: "blue" }];

    await wait();

    expect(element.textContent).toBe("red;blue;");
  });

  it("should read data-index from the host element", async () => {
    element = htmlNode(
      $compile(
        '<ul><li ng-repeat="item in items" data-index="key">{{item.label}};</li></ul>',
      )($rootScope),
    );

    $rootScope.items = [
      { id: 1, key: "a", label: "red" },
      { id: 1, key: "b", label: "blue" },
    ];

    await wait();

    expect(element.textContent).toBe("red;blue;");
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  items?: { name?: string; id?: number; key?: string; label?: string }[];
}
