/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";

describe("date filter", () => {
  let filter: ng.FilterService;

  const date = new Date(Date.UTC(2020, 0, 2, 15, 4, 5));

  beforeEach(() => {
    window.angular = new Angular();
    filter = createInjector(["ng"]).get("$filter") as ng.FilterService;
  });

  it("should format dates with the default mediumDate format", () => {
    expect(filter("date")(date, undefined, "UTC")).toEqual("Jan 2, 2020");
  });

  it("should format timestamps and ISO strings", () => {
    expect(filter("date")(date.getTime(), "shortDate", "UTC")).toEqual(
      "1/2/20",
    );
    expect(filter("date")(date.toISOString(), "mediumTime", "UTC")).toEqual(
      "3:04:05 PM",
    );
  });

  it("should support named date and time formats", () => {
    expect(filter("date")(date, "fullDate", "UTC")).toEqual(
      "Thursday, January 2, 2020",
    );
    expect(filter("date")(date, "short", "UTC")).toEqual("1/2/20, 3:04 PM");
  });

  it("should support locale and timezone options", () => {
    expect(
      filter("date")(date, "mediumDate", {
        locale: "en-GB",
        timeZone: "UTC",
      }),
    ).toEqual("2 Jan 2020");
  });

  it("should return an empty string for nullish or invalid dates", () => {
    expect(filter("date")(null)).toEqual("");
    expect(filter("date")(undefined)).toEqual("");
    expect(filter("date")("not-a-date")).toEqual("");
  });

  it("should work when evaluating expression filters", () => {
    createInjector(["ng"]).invoke(
      ($rootScope: ng.RootScopeService, $parse: ng.ParseService) => {
        $rootScope.createdAt = date;

        expect($parse("createdAt | date:'mediumDate':'UTC'")($rootScope)).toBe(
          "Jan 2, 2020",
        );
      },
    );
  });
});
