/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngBindHtml", () => {
  let $rootScope: any, $compile: any;

  beforeEach(() => {
    window.angular = new Angular();
    createInjector(["ng"]).invoke((_$rootScope_: any, _$compile_: any) => {
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
    it(`should reset html when value is null or undefined ${val}`, async () => {
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
