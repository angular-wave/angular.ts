/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("channel", () => {
  let $compile: any, $eventBus: ng.EventBusService, $scope: any, element;

  beforeEach(() => {
    const root = document.getElementById("app")!;

    dealoc(root);
    const angular = new Angular();

    angular.module("myModule", ["ng"]);
    angular
      .bootstrap(root, ["myModule"])
      .invoke(
        (
          _$compile_: any,
          _$eventBus_: ng.EventBusService,
          _$rootScope_: any,
        ) => {
          $compile = _$compile_;
          $eventBus = _$eventBus_;
          $scope = _$rootScope_;
        },
      );

    spyOn($eventBus, "subscribe").and.callThrough();
  });

  it("should subscribe to the specified angular.$eventBus channel", () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect($eventBus.subscribe).toHaveBeenCalledWith(
      "testChannel",
      jasmine.any(Function),
      $scope,
    );
  });

  it("should support normalized data-ng-channel aliases", () => {
    element = $compile('<div data-ng-channel="testChannel"></div>')($scope);

    expect($eventBus.subscribe).toHaveBeenCalledWith(
      "testChannel",
      jasmine.any(Function),
      $scope,
    );
  });

  it("should update innerHtml when angular.$eventBus emits a value", async () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(element.innerHTML).toBe("");

    $eventBus.publish("testChannel", "New Content");
    await wait(10);

    expect(element.innerHTML).toBe("New Content");
  });

  it("should serialize non-string values when angular.$eventBus emits a value", async () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    $eventBus.publish("testChannel", { status: "ready" });
    await wait(10);

    expect(element.innerHTML).toBe('{"status":"ready"}');
  });

  it("should unsubscribe from the angular.$eventBus when the scope is destroyed", () => {
    $eventBus.reset();
    element = $compile('<div ng-channel="testChannel"></div>')($scope);
    expect($eventBus.getCount("testChannel")).toEqual(1);
    $scope.$destroy();

    expect($eventBus.getCount("testChannel")).toEqual(0);
  });

  it("should not update after publish is queued and scope is destroyed", async () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    $eventBus.publish("testChannel", "Queued Content");
    $scope.$destroy();

    await wait();

    expect(element.innerHTML).toBe("");
    expect($eventBus.getCount("testChannel")).toEqual(0);
  });

  it("should handle templates when angular.$eventBus emits a value", async () => {
    element = $compile(
      '<div ng-channel="testChannel">{{ a.firstName }} {{ a.lastName }}</div>',
    )($scope);
    await wait();
    expect(element.textContent).toBe(" ");

    $eventBus.publish("testChannel", {
      a: { firstName: "John", lastName: "Doe" },
    });

    await wait(100);

    expect(element.textContent).toBe("John Doe");
  });
});
