/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";
import { toJson, wait } from "../shared/utils.ts";

describe("filters", () => {
  let filter: ng.FilterService;

  let filterProvider: ng.FilterProvider;

  const el = document.getElementById("app") as HTMLElement;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .config(($filterProvider: ng.FilterProvider) => {
        filterProvider = $filterProvider;
        // @ts-expect-error test filter factories do not carry $$moduleName metadata.
        filterProvider.register("test", () => (x: any) => `${x}_test`);
      });
    const injector = createInjector(["myModule"]);

    filter = injector.get("$filter") as ng.FilterService;
  });

  it("should be available at config phase", () => {
    expect(filterProvider).toBeDefined();
  });

  it("should require name", () => {
    // @ts-expect-error intentionally omits required name argument.
    expect(() => filterProvider.register()).toThrowError();
  });

  it("should require function", () => {
    expect(() => {
      // @ts-expect-error intentionally passes invalid registration shape.
      filterProvider.register({
        test: () => {
          /* empty */
        },
      });
    }).toThrowError();
    expect(() => {
      // @ts-expect-error intentionally passes invalid factory.
      filterProvider.register("test", {});
    }).toThrowError();
  });

  it("should dynamically register filters", async () => {
    el.innerHTML = "<div> {{ 'hello' | test }}</div>";
    window.angular.bootstrap(el, ["myModule"]);
    await wait();
    expect(el.innerText).toEqual("hello_test");
  });

  it("should call the filter when evaluating expression", () => {
    const filter = jasmine.createSpy("myFilter");

    createInjector([
      "ng",
      function ($filterProvider: ng.FilterProvider) {
        // @ts-expect-error test filter factories do not carry $$moduleName metadata.
        $filterProvider.register("myFilter", () => filter);
      },
    ]).invoke(($rootScope: ng.RootScopeService, $parse: ng.ParseService) => {
      $parse("10|myFilter")($rootScope);
    });
    expect(filter).toHaveBeenCalledWith(10);
  });

  describe("json", () => {
    it("should do basic filter", () => {
      expect(filter("json")({ a: "b" })).toEqual(toJson({ a: "b" }, true));
    });
    it("should allow custom indentation", () => {
      expect(filter("json")({ a: "b" }, 4)).toEqual(toJson({ a: "b" }, 4));
    });
  });
});
