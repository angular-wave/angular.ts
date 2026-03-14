import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ngViewport", () => {
  let $compile, $rootScope, el, $test, $log;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    let angular = new Angular();
    angular.module("default", []);
    angular
      .bootstrap(el, ["default"])
      .invoke((_$compile_, _$rootScope_, _$log_) => {
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
