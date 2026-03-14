import { Angular } from "../../angular.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("channel", () => {
  let $compile, $scope, element;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    let angular = new Angular();
    angular.module("myModule", ["ng"]);
    angular
      .bootstrap(document.getElementById("app"), ["myModule"])
      .invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $scope = _$rootScope_;
      });

    spyOn(angular.$eventBus, "subscribe").and.callThrough();
  });

  it("should subscribe to the specified angular.$eventBus channel", () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(angular.$eventBus.subscribe).toHaveBeenCalledWith(
      "testChannel",
      jasmine.any(Function),
    );
  });

  it("should update innerHtml when angular.$eventBus emits a value", async () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(element.innerHTML).toBe("");

    angular.$eventBus.publish("testChannel", "New Content");
    await wait(10);

    expect(element.innerHTML).toBe("New Content");
  });

  it("should unsubscribe from the angular.$eventBus when the scope is destroyed", () => {
    angular.$eventBus.reset();
    element = $compile('<div ng-channel="testChannel"></div>')($scope);
    expect(angular.$eventBus.getCount("testChannel")).toEqual(1);
    $scope.$destroy();

    expect(angular.$eventBus.getCount("testChannel")).toEqual(0);
  });

  it("should handle templates when angular.$eventBus emits a value", async () => {
    element = $compile(
      '<div ng-channel="testChannel">{{ a.firstName }} {{ a.lastName }}</div>',
    )($scope);
    await wait();
    expect(element.textContent).toBe(" ");

    angular.$eventBus.publish("testChannel", {
      a: { firstName: "John", lastName: "Doe" },
    });

    await wait(100);

    expect(element.textContent).toBe("John Doe");
  });
});
