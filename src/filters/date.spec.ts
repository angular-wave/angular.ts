/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";
import { createScope } from "../core/scope/scope.ts";
import { wait } from "../shared/test-utils.ts";

describe("date filter", () => {
  let $compile: ng.CompileService;

  let $rootScope: ng.RootScopeService & {
    createdAt: Date;
    dateLocale?: Intl.LocalesArgument;
    dateOptions: Intl.DateTimeFormatOptions;
  };

  let filter: ng.FilterService;

  const date = new Date(Date.UTC(2020, 0, 2, 15, 4, 5));

  function formatDefaultLocale(
    value: Date | number | string,
    options: Intl.DateTimeFormatOptions,
  ): string {
    const dateValue = value instanceof Date ? value : new Date(value);

    return new Intl.DateTimeFormat(undefined, options).format(dateValue);
  }

  beforeEach(() => {
    window.angular = new Angular();
    createInjector(["ng"]).invoke(
      (
        _$compile_: ng.CompileService,
        _$filter_: ng.FilterService,
        _$rootScope_: ng.RootScopeService & {
          createdAt: Date;
          dateLocale?: Intl.LocalesArgument;
          dateOptions: Intl.DateTimeFormatOptions;
        },
      ) => {
        $compile = _$compile_;
        filter = _$filter_;
        $rootScope = _$rootScope_;
      },
    );
  });

  it("should format dates with the runtime default format", () => {
    expect(filter("date")(date)).toEqual(formatDefaultLocale(date, {}));
  });

  it("should format timestamps and ISO strings", () => {
    expect(
      filter("date")(date.getTime(), undefined, {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      }),
    ).toEqual(
      formatDefaultLocale(date.getTime(), {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        timeZone: "UTC",
      }),
    );
    expect(
      filter("date")(date.toISOString(), undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      }),
    ).toEqual(
      formatDefaultLocale(date.toISOString(), {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "UTC",
      }),
    );
  });

  it("should support Intl.DateTimeFormat options", () => {
    expect(
      filter("date")(date, undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
    ).toEqual(
      formatDefaultLocale(date, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }),
    );
    expect(
      filter("date")(date, undefined, {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }),
    ).toEqual(
      formatDefaultLocale(date, {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }),
    );
  });

  it("should support locale and timezone options", () => {
    expect(
      filter("date")(date, "en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
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
        $rootScope.dateLocale = undefined;
        $rootScope.dateOptions = {
          year: "numeric",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        };

        expect(
          $parse("createdAt | date:dateLocale:dateOptions")($rootScope),
        ).toBe(
          formatDefaultLocale(date, {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }),
        );
      },
    );
  });

  it("should format proxied dates", () => {
    const scope = createScope({
      createdAt: date,
    });

    expect(
      filter("date")(scope.createdAt, undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    ).toBe(
      formatDefaultLocale(date, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    );
  });

  it("should update interpolation when a proxied Date is mutated", async () => {
    $rootScope.dateOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    };

    $rootScope.dateLocale = undefined;

    const element = $compile(
      "<div>{{ createdAt | date:dateLocale:dateOptions }}</div>",
    )($rootScope) as HTMLElement;

    $rootScope.createdAt = new Date(Date.UTC(2020, 0, 2));
    await wait();

    expect(element.textContent).toBe(
      formatDefaultLocale($rootScope.createdAt, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    );

    $rootScope.createdAt.setUTCFullYear(2021);
    await wait();

    expect(element.textContent).toBe(
      formatDefaultLocale($rootScope.createdAt, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    );
  });
});
