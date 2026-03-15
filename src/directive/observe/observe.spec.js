import { Angular } from "../../angular.ts";
import { createElementFromHTML, dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";

describe("observe", () => {
  let $compile,
    $scope,
    $rootScope,
    element,
    observerInstances,
    observerCallbacks;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    angular.module("myModule", ["ng"]);
    angular
      .bootstrap(document.getElementById("app"), ["myModule"])
      .invoke((_$compile_, _$rootScope_) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
        $scope = $rootScope.$new();
      });

    observerInstances = [];
    observerCallbacks = [];
    spyOn(window, "MutationObserver").and.callFake(function (callback) {
      observerCallbacks.push(callback);
      const instance = jasmine.createSpyObj("MutationObserver", [
        "observe",
        "disconnect",
      ]);
      observerInstances.push(instance);

      return instance;
    });
  });

  async function createDirective(attributeValue, updateProp) {
    const template = `<div ng-observe-${attributeValue}="${updateProp}"></div>`;
    element = $compile(template)($scope);
    await wait();
  }

  it("should set the scope property to the attribute value before any changes", () => {
    const scope = $rootScope.$new();
    const element = createElementFromHTML(
      '<div ng-observe-sourceAttr="testProp"></div>',
    );
    element.setAttribute("sourceAttr", "initialValue");
    $compile(element)(scope);

    expect(scope.testProp).toBeDefined();
    expect(scope.testProp).toEqual("initialValue");
  });

  it("should observe attribute changes and update the scope property", async () => {
    $scope.myProp = "";
    await createDirective("test-attribute", "myProp");

    const mutationObserverCallback = observerCallbacks.at(-1);
    const mutationRecord = {
      target: element,
      attributeName: "test-attribute",
    };

    element.setAttribute("test-attribute", "newValue");

    mutationObserverCallback([mutationRecord]);
    await wait();
    expect($scope.myProp).toBe("newValue");
  });

  it("should not update the model if the attribute value is unchanged", async () => {
    $scope.myProp = "existingValue";
    await createDirective("test-attribute", "myProp");
    const mutationObserverCallback = observerCallbacks.at(-1);
    const mutationRecord = {
      target: element,
      attributeName: "test-attribute",
    };

    element.setAttribute("test-attribute", "existingValue");

    mutationObserverCallback([mutationRecord]);

    expect($scope.myProp).toBe("existingValue");
  });

  it("should disconnect the observer on scope destruction", async () => {
    await createDirective("test-attribute", "myProp");
    $scope.$destroy();

    expect(observerInstances.at(-1).disconnect).toHaveBeenCalled();
  });

  it("should observe attribute changes and update the same scope name if attribute definition is absent", async () => {
    $scope.testAttribute = "";
    const template = `<div ng-observe-test-attribute></div>`;
    element = $compile(template)($scope);
    await wait();

    const mutationObserverCallback = observerCallbacks.at(-1);
    const mutationRecord = {
      target: element,
      attributeName: "test-attribute",
    };

    element.setAttribute("test-attribute", "newValue");

    mutationObserverCallback([mutationRecord]);
    await wait();
    expect($scope.testAttribute).toBe("newValue");
  });
});
