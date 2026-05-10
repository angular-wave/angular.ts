/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";
import { wait } from "../shared/test-utils.ts";

describe("collection filters", () => {
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

  describe("keys", () => {
    it("should return object keys", () => {
      expect(filter("keys")({ name: "Angular", active: true })).toEqual([
        "name",
        "active",
      ]);
    });

    it("should return keys from native keyed collections", () => {
      expect(filter("keys")(new URLSearchParams("?page=2&sort=name"))).toEqual([
        "page",
        "sort",
      ]);

      expect(
        filter("keys")(
          new Map<any, any>([
            ["name", "Angular"],
            ["active", true],
          ]),
        ),
      ).toEqual(["name", "active"]);
    });

    it("should return an empty array for nullish or unsupported values", () => {
      expect(filter("keys")(null)).toEqual([]);
      expect(filter("keys")(undefined)).toEqual([]);
      expect(filter("keys")(42)).toEqual([]);
    });

    it("should render keys in ng-repeat", async () => {
      const element = $compile(
        '<ul><li ng-repeat="key in user | keys">{{key}}|</li></ul>',
      )($rootScope) as HTMLElement;

      $rootScope.user = { name: "Angular", active: true };
      await wait();

      expect(element.textContent).toEqual("name|active|");
    });
  });

  describe("values", () => {
    it("should return object values", () => {
      expect(filter("values")({ name: "Angular", active: true })).toEqual([
        "Angular",
        true,
      ]);
    });

    it("should return values from native keyed collections", () => {
      const formData = new FormData();

      formData.append("name", "Angular");
      formData.append("active", "true");

      expect(filter("values")(formData)).toEqual(["Angular", "true"]);
      expect(filter("values")(new Set(["one", "two"]))).toEqual(["one", "two"]);
    });

    it("should return an empty array for nullish or unsupported values", () => {
      expect(filter("values")(null)).toEqual([]);
      expect(filter("values")(undefined)).toEqual([]);
      expect(filter("values")(42)).toEqual([]);
    });

    it("should render native collection values in ng-repeat", async () => {
      const element = $compile(
        '<ul><li ng-repeat="value in params | values">{{value}}|</li></ul>',
      )($rootScope) as HTMLElement;

      $rootScope.params = new URLSearchParams("?page=2&sort=name");
      await wait();

      expect(element.textContent).toEqual("2|name|");
    });
  });

  describe("entries", () => {
    it("should return object entries as key-value objects", () => {
      expect(filter("entries")({ name: "Angular", active: true })).toEqual([
        { key: "name", value: "Angular" },
        { key: "active", value: true },
      ]);
    });

    it("should return URLSearchParams entries as key-value objects", () => {
      expect(
        filter("entries")(new URLSearchParams("?page=2&sort=name")),
      ).toEqual([
        { key: "page", value: "2" },
        { key: "sort", value: "name" },
      ]);
    });

    it("should return Headers entries as key-value objects", () => {
      expect(
        filter("entries")(
          new Headers({
            Accept: "application/json",
            Authorization: "Bearer token",
          }),
        ),
      ).toEqual([
        { key: "accept", value: "application/json" },
        { key: "authorization", value: "Bearer token" },
      ]);
    });

    it("should return Map entries as key-value objects", () => {
      const key = { id: 1 };

      expect(
        filter("entries")(
          new Map<any, any>([
            [key, "Angular"],
            ["active", true],
          ]),
        ),
      ).toEqual([
        { key, value: "Angular" },
        { key: "active", value: true },
      ]);
    });

    it("should return an empty array for nullish or unsupported values", () => {
      expect(filter("entries")(null)).toEqual([]);
      expect(filter("entries")(undefined)).toEqual([]);
      expect(filter("entries")(42)).toEqual([]);
    });

    it("should work when evaluating expression filters", () => {
      createInjector(["ng"]).invoke(
        ($rootScope: ng.RootScopeService, $parse: ng.ParseService) => {
          $rootScope.params = new URLSearchParams("?page=2");

          expect($parse("params | entries")($rootScope)).toEqual([
            { key: "page", value: "2" },
          ]);
        },
      );
    });

    it("should render object entries in ng-repeat", async () => {
      const element = $compile(
        '<ul><li ng-repeat="entry in user | entries">' +
          "{{entry.key}}={{entry.value}}|" +
          "</li></ul>",
      )($rootScope) as HTMLElement;

      $rootScope.user = { name: "Angular", active: true };
      await wait();

      expect(element.textContent).toEqual("name=Angular|active=true|");
    });

    it("should render native collection entries in ng-repeat", async () => {
      const element = $compile(
        '<ul><li ng-repeat="entry in headers | entries">' +
          "{{entry.key}}={{entry.value}}|" +
          "</li></ul>",
      )($rootScope) as HTMLElement;

      $rootScope.headers = new Headers({
        Accept: "application/json",
        Authorization: "Bearer token",
      });
      await wait();

      expect(element.textContent).toEqual(
        "accept=application/json|authorization=Bearer token|",
      );
    });
  });
});
