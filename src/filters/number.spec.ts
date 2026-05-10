/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";

describe("number filters", () => {
  let filter: ng.FilterService;

  beforeEach(() => {
    window.angular = new Angular();
    filter = createInjector(["ng"]).get("$filter") as ng.FilterService;
  });

  describe("number", () => {
    it("should format numbers with the default locale", () => {
      expect(filter("number")(1234.5)).toEqual("1,234.5");
    });

    it("should support Intl.NumberFormat options and locale", () => {
      expect(
        filter("number")(1234.5, {
          locale: "de-DE",
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      ).toEqual("1.234,50");
    });

    it("should format numeric strings", () => {
      expect(filter("number")("1234.5")).toEqual("1,234.5");
    });

    it("should return an empty string for nullish or invalid values", () => {
      expect(filter("number")(null)).toEqual("");
      expect(filter("number")(undefined)).toEqual("");
      expect(filter("number")("not-a-number")).toEqual("");
    });
  });

  describe("currency", () => {
    it("should format currency with USD by default", () => {
      expect(filter("currency")(1234.5)).toEqual("$1,234.50");
    });

    it("should support currency, Intl.NumberFormat options and locale", () => {
      expect(
        filter("currency")(1234.5, "EUR", {
          locale: "de-DE",
          currencyDisplay: "code",
        }),
      ).toEqual("1.234,50 EUR");
    });

    it("should return an empty string for nullish or invalid values", () => {
      expect(filter("currency")(null)).toEqual("");
      expect(filter("currency")(undefined)).toEqual("");
      expect(filter("currency")("not-a-number")).toEqual("");
    });
  });

  describe("percent", () => {
    it("should format percentages with the default locale", () => {
      expect(filter("percent")(0.1234)).toEqual("12%");
    });

    it("should support Intl.NumberFormat options and locale", () => {
      expect(
        filter("percent")(0.1234, {
          locale: "de-DE",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      ).toEqual("12,3 %");
    });

    it("should return an empty string for nullish or invalid values", () => {
      expect(filter("percent")(null)).toEqual("");
      expect(filter("percent")(undefined)).toEqual("");
      expect(filter("percent")("not-a-number")).toEqual("");
    });

    it("should work when evaluating expression filters", () => {
      createInjector(["ng"]).invoke(
        ($rootScope: ng.RootScopeService, $parse: ng.ParseService) => {
          $rootScope.ratio = 0.25;

          expect($parse("ratio | percent")($rootScope)).toBe("25%");
        },
      );
    });
  });
});
