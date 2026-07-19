/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../di/injector.ts";
import type { ProviderRegistry } from "../di/interface.ts";
import { FilterRegistry } from "./filter.ts";

describe("filter", () => {
  beforeEach(() => {
    window.angular = new Angular();
  });

  it("can be registered and obtained through $filter", () => {
    const myFilter = () => undefined;

    window.angular.module("myModule", []).filter("my", () => myFilter);

    const $filter = createInjector(["ng", "myModule"]).get(
      "$filter",
    ) as ng.FilterService;

    expect($filter("my")).toBe(myFilter);
  });

  it("allows registering multiple filters with the module builder", () => {
    const myFilter = () => undefined;
    const myOtherFilter = () => undefined;

    window.angular
      .module("myModule", [])
      .filter("my", () => myFilter)
      .filter("myOther", () => myOtherFilter);

    const $filter = createInjector(["ng", "myModule"]).get(
      "$filter",
    ) as ng.FilterService;

    expect($filter("my")).toBe(myFilter);
    expect($filter("myOther")).toBe(myOtherFilter);
  });

  it("makes registered filters injectable by their filter name", () => {
    const myFilter = () => undefined;

    window.angular.module("myModule", []).filter("my", () => myFilter);

    const injector = createInjector(["ng", "myModule"]);

    expect(injector.has("myFilter")).toBe(true);
    expect(injector.get("myFilter")).toBe(myFilter);
  });

  it("resolves filter factory dependencies", () => {
    window.angular
      .module("dependentFilter", [])
      .constant("suffix", "!")
      .filter("my", [
        "suffix",
        function (suffix: string) {
          return (value: string) => suffix + value;
        },
      ]);

    const injector = createInjector(["ng", "dependentFilter"]);
    const myFilter = injector.get("myFilter") as (value: string) => string;

    expect(myFilter("value")).toBe("!value");
  });

  it("includes built-in filters", () => {
    const injector = createInjector(["ng"]);

    expect(injector.has("filterFilter")).toBe(true);
  });

  it("validates filter lookup names", () => {
    const $filter = createInjector(["ng"]).get("$filter") as ng.FilterService;

    expect(() => {
      // @ts-expect-error intentionally passes an invalid lookup name.
      $filter(null);
    }).toThrowError();
  });
});

describe("FilterRegistry", () => {
  function createProviderRegistry(): jasmine.SpyObj<ProviderRegistry> {
    return jasmine.createSpyObj<ProviderRegistry>("providerRegistry", [
      "factory",
    ]);
  }

  it("replays existing declarations when an injector registry attaches", () => {
    const registry = new FilterRegistry();
    const providerRegistry = createProviderRegistry();
    const factory = () => () => "value";

    registry.register("my", factory);
    registry.attach(providerRegistry);

    expect(providerRegistry.factory).toHaveBeenCalledOnceWith(
      "myFilter",
      factory,
    );
  });

  it("binds declarations registered after attachment", () => {
    const registry = new FilterRegistry();
    const providerRegistry = createProviderRegistry();
    const factory = () => () => "value";

    registry.attach(providerRegistry);
    registry.register("my", factory);

    expect(providerRegistry.factory).toHaveBeenCalledOnceWith(
      "myFilter",
      factory,
    );
  });

  it("does not rebind an unchanged declaration", () => {
    const registry = new FilterRegistry();
    const providerRegistry = createProviderRegistry();
    const factory = () => () => "value";

    registry.attach(providerRegistry);
    registry.register("my", factory);
    registry.register("my", factory);

    expect(providerRegistry.factory).toHaveBeenCalledTimes(1);
  });

  it("validates declarations", () => {
    const registry = new FilterRegistry();

    expect(() => {
      // @ts-expect-error intentionally omits the required name.
      registry.register();
    }).toThrowError();
    expect(() => {
      // @ts-expect-error intentionally passes an invalid factory.
      registry.register("my", {});
    }).toThrowError();
  });

  it("rejects use after runtime destruction", () => {
    const registry = new FilterRegistry();

    registry.destroy();
    registry.destroy();

    expect(() => registry.attach(createProviderRegistry())).toThrowError(
      "Filter registry has been destroyed",
    );
    expect(() => registry.register("my", () => () => undefined)).toThrowError(
      "Filter registry has been destroyed",
    );
  });
});
