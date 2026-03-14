import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("setter", () => {
  let $compile, $rootScope, $parse, observerSpy, $log;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    let angular = new Angular();
    angular.module("myModule", []);
    angular
      .bootstrap(document.getElementById("app"), ["myModule"])
      .invoke((_$compile_, _$rootScope_, _$parse_, _$log_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $parse = _$parse_;
        $log = _$log_;
      });
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
