import { Angular } from "../../angular.js";
import { createInjector } from "../../core/di/injector.ts";
import { dealoc } from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";

describe("boolean attr directives", () => {
  let element, $rootScope, $compile, $rootElement;

  beforeEach(() => {
    window.angular = new Angular();
    createInjector([
      "ng",
      ($provide) => {
        $provide.value("$rootElement", document.body);
      },
    ]).invoke((_$compile_, _$rootScope_, _$rootElement_) => {
      $compile = _$compile_;
      $rootScope = _$rootScope_;
      $rootElement = _$rootElement_;
    });
  });

  afterEach(() => {
    dealoc(element);
  });

  it("should properly evaluate 0 as false", async () => {
    element = $compile('<button ng-disabled="isDisabled">Button</button>')(
      $rootScope,
    );
    $rootScope.isDisabled = 0;
    await wait();
    expect(element.hasAttribute("disabled")).toBeFalsy();
    $rootScope.isDisabled = 1;
    await wait();

    expect(element.hasAttribute("disabled")).toBeTruthy();
  });

  it("should bind disabled", async () => {
    element = $compile('<button ng-disabled="isDisabled">Button</button>')(
      $rootScope,
    );
    $rootScope.isDisabled = false;
    await wait();
    expect(element.hasAttribute("disabled")).toBeFalsy();
    $rootScope.isDisabled = true;
    await wait();
    expect(element.hasAttribute("disabled")).toBeTruthy();
  });

  it("should bind checked", async () => {
    element = $compile('<input type="checkbox" ng-checked="isChecked" />')(
      $rootScope,
    );
    $rootScope.isChecked = false;
    await wait();
    expect(element.hasAttribute("checked")).toBeFalsy();
    $rootScope.isChecked = true;
    await wait();
    expect(element.hasAttribute("checked")).toBeTruthy();
  });

  it("should not bind checked when ngModel is present", async () => {
    // test for https://github.com/angular/angular.js/issues/10662
    element = $compile(
      '<input type="checkbox" ng-model="value" ng-false-value="\'false\'" ' +
        'ng-true-value="\'true\'" ng-checked="value" />',
    )($rootScope);

    $rootScope.value = "true";
    await wait();
    expect(element.checked).toBe(true);

    element.checked = !element.checked;
    element.dispatchEvent(new Event("change"));
    expect(element.checked).toBe(false);
    expect($rootScope.value).toBe("false");
    element.checked = !element.checked;
    element.dispatchEvent(new Event("change"));
    expect(element.checked).toBe(true);
    expect($rootScope.value).toBe("true");
  });

  it("should bind selected", async () => {
    element = $compile(
      '<select><option value=""></option><option ng-selected="isSelected">Greetings!</option></select>',
    )($rootScope);
    $rootScope.isSelected = false;
    await wait();
    expect(element.children[1].selected).toBeFalsy();
    $rootScope.isSelected = true;
    await wait();
    expect(element.children[1].selected).toBeTruthy();
  });

  it("should bind readonly", async () => {
    element = $compile('<input type="text" ng-readonly="isReadonly" />')(
      $rootScope,
    );
    $rootScope.isReadonly = false;
    await wait();
    expect(element.hasAttribute("readonly")).toBeFalsy();

    $rootScope.isReadonly = true;
    await wait();
    expect(element.hasAttribute("readonly")).toBeTruthy();
  });

  it("should bind open", async () => {
    element = $compile('<details ng-open="isOpen"></details>')($rootScope);
    $rootScope.isOpen = false;
    await wait();
    expect(element.hasAttribute("open")).toBeFalsy();
    $rootScope.isOpen = true;
    await wait();
    expect(element.hasAttribute("open")).toBeTruthy();
  });

  describe("multiple", () => {
    it("should NOT bind to multiple via ngMultiple", () => {
      element = $compile('<select ng-multiple="isMultiple"></select>')(
        $rootScope,
      );
      $rootScope.isMultiple = false;
      expect(element.getAttribute("multiple")).toBeFalsy();
      $rootScope.isMultiple = "multiple";
      expect(element.getAttribute("multiple")).toBeFalsy(); // ignore
    });

    it("should throw an exception if binding to multiple attribute", () => {
      expect(() => {
        $compile('<select multiple="{{isMultiple}}"></select>');
      }).toThrowError(/selmulti/);
    });
  });
});
