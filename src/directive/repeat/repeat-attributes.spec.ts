// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngRepeat attribute reads", () => {
  let $compile;
  let $rootScope;
  let element;

  beforeEach(() => {
    const app = document.getElementById("app") as HTMLElement;

    dealoc(app);
    window.angular = new Angular();

    const injector = window.angular.bootstrap(app, []);

    injector.invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should read data-ng-repeat from the host element", async () => {
    element = $compile(
      '<ul><li data-ng-repeat="item in items">{{item.name}};</li></ul>',
    )($rootScope);

    $rootScope.items = [{ name: "red" }, { name: "blue" }];

    await wait();

    expect(element.textContent).toBe("red;blue;");
  });

  it("should read data-index from the host element", async () => {
    element = $compile(
      '<ul><li ng-repeat="item in items" data-index="key">{{item.label}};</li></ul>',
    )($rootScope);

    $rootScope.items = [
      { id: 1, key: "a", label: "red" },
      { id: 1, key: "b", label: "blue" },
    ];

    await wait();

    expect(element.textContent).toBe("red;blue;");
  });
});
