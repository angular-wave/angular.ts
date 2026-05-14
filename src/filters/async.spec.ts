/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";
import { wait } from "../shared/test-utils.ts";

describe("async filter", () => {
  let $compile: ng.CompileService;

  let $rootScope: ng.RootScopeService;

  let filter: ng.FilterService;

  beforeEach(() => {
    window.angular = new Angular();
    createInjector(["ng"]).invoke(
      (
        _$compile_: ng.CompileService,
        _$filter_: ng.FilterService,
        _$rootScope_: ng.RootScopeService,
      ) => {
        $compile = _$compile_;
        filter = _$filter_;
        $rootScope = _$rootScope_;
      },
    );
  });

  it("should pass through non-promise values", () => {
    expect(filter("async")("ready")).toBe("ready");
    expect(filter("async")(null)).toBeNull();
    expect(filter("async")(undefined)).toBeUndefined();
  });

  it("should unwrap a promise once it resolves", async () => {
    const promise = Promise.resolve("ready");

    expect(filter("async")(promise)).toBeUndefined();
    await wait();

    expect(filter("async")(promise)).toBe("ready");
  });

  it("should unwrap a promise rejection reason once it rejects", async () => {
    const error = new Error("failed");

    const promise = Promise.reject(error);

    expect(filter("async")(promise)).toBeUndefined();
    await wait();

    expect(filter("async")(promise)).toBe(error);
  });

  it("should update interpolation when a promise resolves", async () => {
    const element = $compile("<div>{{ value | async }}</div>")(
      $rootScope,
    ) as HTMLElement;

    $rootScope.value = Promise.resolve("ready");
    await wait();

    expect(element.textContent).toBe("ready");
  });

  it("should update nested interpolation when a promise resolves to an object", async () => {
    const element = $compile("<div>{{ (value | async).name }}</div>")(
      $rootScope,
    ) as HTMLElement;

    $rootScope.value = Promise.resolve({ name: "Ada" });
    await wait();

    expect(element.textContent).toBe("Ada");
  });

  it("should update ng-repeat when a promise resolves to a collection", async () => {
    const element = $compile(
      '<ul><li ng-repeat="item in items | async">{{item.name}}|</li></ul>',
    )($rootScope) as HTMLElement;

    $rootScope.items = Promise.resolve([{ name: "Ada" }, { name: "Grace" }]);
    await wait();

    expect(element.textContent).toBe("Ada|Grace|");
  });
});
