import { Angular } from "../angular.js";
import { createInjector } from "../core/di/injector.js";
import { toJson, wait } from "../shared/utils.js";

describe("filters", () => {
  let filter;
  let filterProvider;
  let el = document.getElementById("app");

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("myModule", ["ng"]).config(($filterProvider) => {
      filterProvider = $filterProvider;
      filterProvider.register("test", () => (x) => x + "_test");
    });
    const injector = createInjector(["myModule"]);
    filter = injector.get("$filter");
  });

  it("should be available at config phase", () => {
    expect(filterProvider).toBeDefined();
  });

  it("should require name", () => {
    expect(() => filterProvider.register()).toThrowError();
  });

  it("should require function", () => {
    expect(() =>
      filterProvider.register({
        test: () => {
          /* empty */
        },
      }),
    ).toThrowError();
    expect(() => filterProvider.register("test", {})).toThrowError();
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
      function ($filterProvider) {
        $filterProvider.register("myFilter", () => filter);
      },
    ]).invoke(($rootScope) => {
      $rootScope.$eval("10|myFilter");
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
