import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";

describe("ngScopeDirective", () => {
  let $compile, $rootScope;

  beforeEach(() => {
    window.angular = new Angular();
    window.angular.module("test", []);
    dealoc(document.getElementById("app"));
    let injector = window.angular.bootstrap(document.getElementById("app"), [
      "test",
    ]);
    injector.invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
    });
  });

  it("should set $scope.$scopename from the ng-scope attribute", async () => {
    const scope = $rootScope.$new();
    $compile('<div ng-scope="myName"></div>')(scope);

    expect(scope.$scopename).toBe("myName");
  });

  it("should not create an isolate scope", () => {
    const scope = $rootScope.$new();
    scope.testVal = 42;

    const element = $compile('<div ng-scope="x"></div>')(scope);

    expect(window.angular.getScope(element)).toBe(scope); // same scope
    expect(window.angular.getScope(element).testVal).toBe(42);
  });
});
