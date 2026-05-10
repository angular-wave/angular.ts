/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngViewport", () => {
  let $compile: any, $rootScope: any, el: any, $test, $log;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    const angular = new Angular();

    angular.module("default", []);
    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_: any, _$rootScope_: any, _$log_: any) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      });
  });

  it("should detect element being scrolled into view", async () => {
    el.innerHTML = `<div
      ng-viewport
      on-enter="viewable = true"
      on-leave="viewable = false"
    >
      Test
    </div>`;
    $compile(el)($rootScope);
    await wait();
    expect($rootScope.viewable).toEqual(undefined);

    window.scrollTo(0, 1500);
    await wait(100);
    expect($rootScope.viewable).toEqual(true);

    window.scrollTo(0, 0);
    await wait(100);
    expect($rootScope.viewable).toEqual(false);
  });
});
