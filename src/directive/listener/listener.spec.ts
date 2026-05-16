/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("ngListener", () => {
  let $compile: any, $scope: any, element, app: any;

  beforeEach(async () => {
    app = document.getElementById("app");
    dealoc(app);

    const angular = new Angular();

    angular.module("myModule", ["ng"]);

    angular
      .bootstrap(app, ["myModule"])
      .invoke((_$compile_: any, _$rootScope_: any) => {
        $compile = _$compile_;
        $scope = _$rootScope_;
      });

    await wait();
  });

  afterEach(() => {
    dealoc(app);
  });

  it("handles CustomEvent dispatched on the element", async () => {
    element = $compile(`<div ng-listener="update"></div>`)($scope);
    await wait();

    element.dispatchEvent(
      new CustomEvent("update", {
        detail: "hello",
        bubbles: true,
      }),
    );

    await wait();

    expect(element.innerHTML).toBe("hello");
  });

  it("supports normalized data-ng-listener aliases", async () => {
    element = $compile(`<div data-ng-listener="update"></div>`)($scope);
    await wait();

    element.dispatchEvent(
      new CustomEvent("update", {
        detail: "hello",
        bubbles: true,
      }),
    );

    await wait();

    expect(element.innerHTML).toBe("hello");
  });

  it("handles CustomEvent dispatched on the element with id", async () => {
    element = $compile(`<div ng-listener id="update"></div>`)($scope);
    await wait();

    element.dispatchEvent(
      new CustomEvent("update", {
        detail: "hello",
        bubbles: true,
      }),
    );

    await wait();

    expect(element.innerHTML).toBe("hello");
  });

  it("merges object detail into scope when template content exists", async () => {
    $scope.foo = "initial";

    element = $compile(`
      <div ng-listener="merge">
        <span>{{ foo }}</span>
      </div>
    `)($scope);

    await wait();

    element.dispatchEvent(
      new CustomEvent("merge", {
        detail: { foo: "updated", bar: 42 },
        bubbles: true,
      }),
    );

    await wait();

    expect($scope.foo).toBe("updated");
    expect($scope.bar).toBe(42);
  });

  it("does nothing when detail is not an object and template content exists", async () => {
    $scope.foo = "unchanged";

    element = $compile(`
      <div ng-listener="noop">
        <span>{{ foo }}</span>
      </div>
    `)($scope);

    await wait();

    element.dispatchEvent(
      new CustomEvent("noop", {
        detail: "ignored",
        bubbles: true,
      }),
    );

    await wait();

    expect($scope.foo).toBe("unchanged");
  });

  it("removes the listener on $destroy", async () => {
    element = $compile(`<div ng-listener="destroy"></div>`)($scope);
    await wait();

    $scope.$destroy();
    await wait();

    element.dispatchEvent(
      new CustomEvent("destroy", {
        detail: "should not apply",
        bubbles: true,
      }),
    );

    await wait();

    expect(element.innerHTML).toBe("");
  });
});
