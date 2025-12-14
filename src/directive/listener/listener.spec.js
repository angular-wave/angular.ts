import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("ngListenerDirective", () => {
  let $compile, $scope, element, angular, app;

  beforeEach(async () => {
    app = document.getElementById("app");
    dealoc(app);

    angular = new Angular();
    angular.module("myModule", ["ng"]);

    angular.bootstrap(app, ["myModule"]).invoke((_$compile_, _$rootScope_) => {
      $compile = _$compile_;
      $scope = _$rootScope_;
    });

    await wait();
  });

  afterEach(() => {
    dealoc(app);
  });

  it("registers and unregisters an event listener", async () => {
    spyOn(angular, "addEventListener").and.callThrough();
    spyOn(angular, "removeEventListener").and.callThrough();

    element = $compile(`<div ng-listener="test:event"></div>`)($scope);
    await wait();

    expect(angular.addEventListener).toHaveBeenCalledWith(
      "test:event",
      jasmine.any(Function),
    );

    $scope.$destroy();
    await wait();

    expect(angular.removeEventListener).toHaveBeenCalledWith(
      "test:event",
      jasmine.any(Function),
    );
  });

  it("merges object detail into scope when template content exists", async () => {
    $scope.foo = "initial";

    element = $compile(`
      <div ng-listener="update">
        <span>{{ foo }}</span>
      </div>
    `)($scope);

    await wait();

    angular.dispatchEvent(
      new CustomEvent("update", {
        detail: { foo: "updated", bar: 123 },
      }),
    );

    await wait();

    expect($scope.foo).toBe("updated");
    expect($scope.bar).toBe(123);
  });

  it("updates innerHTML when detail is a string and no template content exists", async () => {
    element = $compile(`<div ng-listener="html"></div>`)($scope);
    await wait();

    angular.dispatchEvent(
      new CustomEvent("html", {
        detail: "<span>Injected</span>",
      }),
    );

    await wait();

    expect(element.innerHTML).toBe("<span>Injected</span>");
  });

  it("ignores non-object detail when template content exists", async () => {
    $scope.foo = "unchanged";

    element = $compile(`
      <div ng-listener="noop">
        <span>{{ foo }}</span>
      </div>
    `)($scope);

    await wait();

    angular.dispatchEvent(
      new CustomEvent("noop", {
        detail: "should not apply",
      }),
    );

    await wait();

    expect($scope.foo).toBe("unchanged");
  });
});
