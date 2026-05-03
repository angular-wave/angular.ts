import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";

describe("ngDelete", () => {
  let $compile, $rootScope, el;

  beforeEach(() => {
    el = document.getElementById("app");
    dealoc(el);
    el.innerHTML = "";
    let angular = new Angular();
    angular.module("default", []);
    angular.bootstrap(el, ["default"]).invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  it("should compile and swap streamed HTML responses", async () => {
    const scope = $rootScope.$new();

    scope.first = "A";
    scope.second = "B";
    el.innerHTML =
      '<button ng-delete="/mock/stream-html" response-type="stream" data-swap="beforeend" data-target="#found">Load</button><div id="found"></div>';
    $compile(el)(scope);
    browserTrigger(el.querySelector("button"), "click");
    await wait(200);
    expect(el.querySelector("#found").textContent).toBe("AB");
  });
});
