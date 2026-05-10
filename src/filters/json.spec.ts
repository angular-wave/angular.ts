/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";
import { toJson } from "../shared/utils.ts";

describe("json filter", () => {
  let filter: ng.FilterService;

  beforeEach(() => {
    window.angular = new Angular();
    filter = createInjector(["ng"]).get("$filter") as ng.FilterService;
  });

  it("should do basic filter", () => {
    expect(filter("json")({ a: "b" })).toEqual(toJson({ a: "b" }, true));
  });

  it("should allow custom indentation", () => {
    expect(filter("json")({ a: "b" }, 4)).toEqual(toJson({ a: "b" }, 4));
  });
});
