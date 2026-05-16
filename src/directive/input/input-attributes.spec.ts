// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";

describe("modern input directive attribute reads", () => {
  let $compile;
  let $rootScope;
  let app: HTMLElement;

  beforeEach(() => {
    app = document.getElementById("app") as HTMLElement;
    dealoc(app);
    app.innerHTML = "";

    const angular = new Angular();

    angular.bootstrap(app, []).invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  afterEach(() => {
    dealoc(app);
  });

  it("reads data-type for native input type behavior", async () => {
    const scope = $rootScope.$new();

    app.innerHTML = '<input data-type="number" ng-model="age" />';
    $compile(app)(scope);

    const input = app.querySelector("input") as HTMLInputElement;

    input.value = "42";
    browserTrigger(input, "input");
    await wait();

    expect(scope.age).toBe("42");
  });

  it("ignores data-ng-model-type conversion hints", async () => {
    const scope = $rootScope.$new();

    app.innerHTML =
      '<input type="date" data-ng-model-type="date" ng-model="birthday" />';
    $compile(app)(scope);

    const input = app.querySelector("input") as HTMLInputElement;

    input.value = "2026-05-16";
    browserTrigger(input, "input");
    await wait();

    expect(scope.birthday).toBe("2026-05-16");
  });

  it("does not implement data-ng-trim compatibility", async () => {
    const scope = $rootScope.$new();

    app.innerHTML =
      '<input data-ng-trim="true" ng-model="name" value=" Lucas " />';
    $compile(app)(scope);

    const input = app.querySelector("input") as HTMLInputElement;

    input.value = " Lucas ";
    browserTrigger(input, "input");
    await wait();

    expect(scope.name).toBe(" Lucas ");
  });
});
