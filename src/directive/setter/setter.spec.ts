/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("setter", () => {
  let $compile: any, $rootScope: any, $parse, observerSpy: any, $log: any;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    const angular = new Angular();

    angular.module("myModule", []);
    angular
      .bootstrap(document.getElementById("app")!, ["myModule"])
      .invoke(
        (_$compile_: any, _$rootScope_: any, _$parse_: any, _$log_: any) => {
          $compile = _$compile_;
          $rootScope = _$rootScope_;
          $parse = _$parse_;
          $log = _$log_;
        },
      );
    observerSpy = jasmine.createSpyObj("MutationObserver", [
      "observe",
      "disconnect",
    ]);
  });

  it("should update the scope model when the element content changes", async () => {
    $rootScope.testModel = "";
    const element = $compile('<div ng-setter="testModel"></div>')($rootScope);

    await wait();

    element.innerHTML = "New content";
    await wait();

    expect($rootScope.testModel).toBe("New content");
  });

  it("should handle initial content in the element", async () => {
    $rootScope.testModel = "";
    const element = $compile(
      '<div ng-setter="testModel">Initial content</div>',
    )($rootScope);

    await wait();

    expect($rootScope.testModel).toBe("Initial content");
  });

  it("should handle expression content in the element", async () => {
    $rootScope.testModel = "";
    $compile('<div ng-setter="testModel"> {{ 2 + 2 }} </div>')($rootScope);
    await wait();

    expect($rootScope.testModel).toBe("4");
  });

  it("should handle expression and text content in the element", async () => {
    $rootScope.testModel = "";
    $compile('<div ng-setter="testModel"> Res: {{ 2 + 2 }} </div>')($rootScope);
    await wait();

    expect($rootScope.testModel).toBe("Res: 4");
  });

  it("should update value if expression changes", async () => {
    $rootScope.a = 2;
    $compile('<div ng-setter="testModel"> {{ a + 2 }} </div>')($rootScope);
    await wait();
    expect($rootScope.testModel).toBe("4");

    $rootScope.a = 4;
    await wait();
    expect($rootScope.testModel).toBe("6");
  });

  it("should warn if no model expression is provided", async () => {
    spyOn($log, "warn");

    $compile("<div ng-setter></div>")($rootScope);
    await wait();

    expect($log.warn).toHaveBeenCalledWith("ng-setter: expression null");
  });

  it("should warn if invalid model expression is provided", async () => {
    spyOn($log, "warn");

    $compile("<div ng-setter='2+2'></div>")($rootScope);
    await wait();

    expect($log.warn).toHaveBeenCalledWith("ng-setter: expression invalid");
  });

  it("should clean up the MutationObserver on scope destruction", async () => {
    spyOn(window, "MutationObserver").and.returnValue(observerSpy);
    $compile('<div ng-setter="testModel"></div>')($rootScope);

    $rootScope.$destroy();
    await wait();
    expect(observerSpy.disconnect).toHaveBeenCalled();
  });
});
