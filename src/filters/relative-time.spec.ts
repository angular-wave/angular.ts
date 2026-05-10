/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";

describe("relativeTime filter", () => {
  let filter: ng.FilterService;

  beforeEach(() => {
    window.angular = new Angular();
    filter = createInjector(["ng"]).get("$filter") as ng.FilterService;
  });

  it("should format relative time with the default locale", () => {
    expect(filter("relativeTime")(-1, "day")).toEqual("1 day ago");
    expect(filter("relativeTime")(2, "week")).toEqual("in 2 weeks");
  });

  it("should support Intl.RelativeTimeFormat options and locale", () => {
    expect(
      filter("relativeTime")(-1, "day", {
        locale: "en-US",
        numeric: "auto",
      }),
    ).toEqual("yesterday");
  });

  it("should format numeric strings", () => {
    expect(filter("relativeTime")("-3", "month")).toEqual("3 months ago");
  });

  it("should return an empty string for nullish or invalid values", () => {
    expect(filter("relativeTime")(null)).toEqual("");
    expect(filter("relativeTime")(undefined)).toEqual("");
    expect(filter("relativeTime")("not-a-number")).toEqual("");
  });

  it("should work when evaluating expression filters", () => {
    createInjector(["ng"]).invoke(
      ($rootScope: ng.RootScopeService, $parse: ng.ParseService) => {
        $rootScope.daysUntilRelease = 3;

        expect(
          $parse("daysUntilRelease | relativeTime:'day'")($rootScope),
        ).toBe("in 3 days");
      },
    );
  });
});
