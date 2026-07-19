/// <reference types="jasmine" />
import { Angular } from "../angular.ts";
import { createInjector } from "../core/di/injector.ts";
import { wait } from "../shared/utils.ts";

describe("filter registration", () => {
  const el = document.getElementById("app") as HTMLElement;

  beforeEach(() => {
    el.innerHTML = "";
    window.angular = new Angular();
  });

  it("evaluates module filters in compiled templates", async () => {
    window.angular
      .module("myModule", ["ng"])
      .filter("test", () => (value: unknown) => `${value}_test`);
    el.innerHTML = "<div> {{ 'hello' | test }}</div>";

    window.angular.bootstrap(el, ["myModule"]);
    await wait();

    expect(el.innerText).toEqual("hello_test");
  });

  it("calls a module filter when evaluating an expression", () => {
    const filter = jasmine.createSpy("myFilter");

    window.angular.module("myModule", []).filter("myFilter", () => filter);

    createInjector(["ng", "myModule"]).invoke([
      "$rootScope",
      "$parse",
      ($rootScope: ng.Scope, $parse: ng.ParseService) => {
        $parse("10|myFilter")($rootScope);
      },
    ]);

    expect(filter).toHaveBeenCalledWith(10);
  });
});
