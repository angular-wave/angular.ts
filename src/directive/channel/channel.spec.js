import { Angular } from "../../angular.js";
import { EventBus } from "../../services/pubsub/pubsub.js";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("channel", () => {
  let $compile, $scope, element, unsubscribeSpy;

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

    spyOn(EventBus, "subscribe").and.callThrough();
  });

  it("should subscribe to the specified EventBus channel", () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(EventBus.subscribe).toHaveBeenCalledWith(
      "testChannel",
      jasmine.any(Function),
    );
  });

  it("should update innerHtml when EventBus emits a value", async () => {
    element = $compile('<div ng-channel="testChannel"></div>')($scope);

    expect(element.innerHTML).toBe("");

    EventBus.publish("testChannel", "New Content");
    await wait(10);

    expect(element.innerHTML).toBe("New Content");
  });

  it("should unsubscribe from the EventBus when the scope is destroyed", () => {
    EventBus.reset();
    element = $compile('<div ng-channel="testChannel"></div>')($scope);
    expect(EventBus.getCount("testChannel")).toEqual(1);
    $scope.$destroy();

    expect(EventBus.getCount("testChannel")).toEqual(0);
  });

  it("should handle templates when EventBus emits a value", async () => {
    element = $compile(
      '<div ng-channel="testChannel">{{ a.firstName }} {{ a.lastName }}</div>',
    )($scope);
    await wait();
    expect(element.textContent).toBe(" ");

    EventBus.publish("testChannel", {
      a: { firstName: "John", lastName: "Doe" },
    });

    await wait(100);

    expect(element.textContent).toBe("John Doe");
  });
});
