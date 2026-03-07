import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.js";
import { wait } from "../../shared/test-utils.js";

describe("ngBindHtml", () => {
  let $rootScope, $compile;

  beforeEach(() => {
    window.angular = new Angular();
    createInjector(["ng"]).invoke((_$rootScope_, _$compile_) => {
      $rootScope = _$rootScope_;
      $compile = _$compile_;
    });
  });

  it("should set html", async () => {
    const element = $compile('<div ng-bind-html="html"></div>')($rootScope);
    $rootScope.html = "<div>hello</div>";
    await wait();
    expect(element.innerHTML).toEqual("<div>hello</div>");
  });

  [null, undefined, ""].forEach((val) => {
    it("should reset html when value is null or undefined " + val, async () => {
      const element = $compile('<div ng-bind-html="html"></div>')($rootScope);

      $rootScope.html = "some val";
      await wait();
      expect(element.innerHTML).toEqual("some val");

      $rootScope.html = val;
      await wait();
      expect(element.innerHTML).toEqual("");
    });
  });
});
