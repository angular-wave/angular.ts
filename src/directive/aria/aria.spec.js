import { createInjector } from "../../core/di/injector.js";
import { Angular } from "../../angular.js";
import { dealoc, getController } from "../../shared/dom.js";
import { browserTrigger, wait } from "../../shared/test-utils.js";

describe("$aria", () => {
  let scope;
  let $compile;
  let element;
  let errorLog = [];

  beforeEach(() => {
    window.angular = new Angular();
    window.angular
      .module("test", ["ng"])
      .decorator(
        "$exceptionHandler",
        () => (exception) => errorLog.push(exception.message),
      );
    let injector = createInjector(["test"]);
    scope = injector.get("$rootScope");
    $compile = injector.get("$compile");
  });

  afterEach(() => {
    dealoc(element);
  });

  describe("with `ngAriaDisable`", () => {
    // ariaChecked
    it("should not attach aria-checked to custom checkbox", () => {
      element = $compile(
        '<div role="checkbox" ng-model="val" ng-aria-disable></div>',
      )(scope);

      scope.$apply("val = false");
      expect(element.hasAttribute("aria-checked")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-checked")).toBeFalse();
    });

    it("should not attach aria-checked to custom radio controls", () => {
      element = $compile(
        '<div><div role="radio" ng-model="val" value="one" ng-aria-disable></div>' +
          '<div role="radio" ng-model="val" value="two" ng-aria-disable></div></div>',
      )(scope);
      const radio1 = element.children[0];
      const radio2 = element.children[1];

      scope.$apply('val = "one"');
      expect(radio1.hasAttribute("aria-checked")).toBeFalse();
      expect(radio2.hasAttribute("aria-checked")).toBeFalse();

      scope.$apply('val = "two"');
      expect(radio1.hasAttribute("aria-checked")).toBeFalse();
      expect(radio2.hasAttribute("aria-checked")).toBeFalse();
    });

    // ariaDisabled
    it("should not attach aria-disabled to custom controls", () => {
      element = $compile('<div ng-disabled="val" ng-aria-disable></div>')(
        scope,
      );
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-disabled")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-disabled")).toBeFalse();
    });

    // ariaHidden
    it("should not attach aria-hidden to `ngShow`", () => {
      element = $compile('<div ng-show="val" ng-aria-disable></div>')(scope);
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();
    });

    it("should not attach aria-hidden to `ngHide`", () => {
      element = $compile('<div ng-hide="val" ng-aria-disable></div>')(scope);
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-hidden")).toBeFalse();
    });

    // ariaInvalid
    it("should not attach aria-invalid to input", () => {
      element = $compile(
        '<input ng-model="val" ng-minlength="10" ng-aria-disable />',
      )(scope);
      scope.$apply('val = "lt 10"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();

      scope.$apply('val = "gt 10 characters"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();
    });

    it("should not attach aria-invalid to custom controls", () => {
      element = $compile(
        '<div role="textbox" ng-model="val" ng-minlength="10" ng-aria-disable></div>',
      )(scope);
      scope.$apply('val = "lt 10"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();

      scope.$apply('val = "gt 10 characters"');
      expect(element.hasAttribute("aria-invalid")).toBeFalse();
    });

    // ariaLive
    it("should not attach aria-live to `ngMessages`", () => {
      element = $compile('<div ng-messages="val" ng-aria-disable>')(scope);
      expect(element.hasAttribute("aria-live")).toBeFalse();
    });

    // ariaReadonly
    it("should not attach aria-readonly to custom controls", () => {
      element = $compile('<div ng-readonly="val" ng-aria-disable></div>')(
        scope,
      );
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-readonly")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-readonly")).toBeFalse();
    });

    // ariaRequired
    it("should not attach aria-required to custom controls with `required`", () => {
      element = $compile('<div ng-model="val" required ng-aria-disable></div>')(
        scope,
      );
      expect(element.hasAttribute("aria-required")).toBeFalse();
    });

    it("should not attach aria-required to custom controls with `ngRequired`", () => {
      element = $compile(
        '<div ng-model="val" ng-required="val" ng-aria-disable></div>',
      )(scope);
      scope.$apply("val = false");
      expect(element.hasAttribute("aria-required")).toBeFalse();

      scope.$apply("val = true");
      expect(element.hasAttribute("aria-required")).toBeFalse();
    });

    // ariaValue
    it("should not attach aria-value* to input[range]", () => {
      element = $compile(
        '<input type="range" ng-model="val" min="0" max="100" ng-aria-disable />',
      )(scope);
      expect(element.hasAttribute("aria-valuemax")).toBeFalse();
      expect(element.hasAttribute("aria-valuemin")).toBeFalse();
      expect(element.hasAttribute("aria-valuenow")).toBeFalse();

      scope.$apply("val = 50");
      expect(element.hasAttribute("aria-valuemax")).toBeFalse();
      expect(element.hasAttribute("aria-valuemin")).toBeFalse();
      expect(element.hasAttribute("aria-valuenow")).toBeFalse();

      scope.$apply("val = 150");
      expect(element.hasAttribute("aria-valuemax")).toBeFalse();
      expect(element.hasAttribute("aria-valuemin")).toBeFalse();
      expect(element.hasAttribute("aria-valuenow")).toBeFalse();
    });

    it("should not attach aria-value* to custom controls", () => {
      element = $compile(
        '<div><div role="progressbar" ng-model="val" min="0" max="100" ng-aria-disable></div>' +
          '<div role="slider" ng-model="val" min="0" max="100" ng-aria-disable></div></div>',
      )(scope);
      const progressbar = element.children[0];
      const slider = element.children[1];

      ["aria-valuemax", "aria-valuemin", "aria-valuenow"].forEach((attr) => {
        expect(progressbar.hasAttribute(attr)).toBeFalse();
        expect(slider.hasAttribute(attr)).toBeFalse();
      });

      scope.$apply("val = 50");
      ["aria-valuemax", "aria-valuemin", "aria-valuenow"].forEach((attr) => {
        expect(progressbar.hasAttribute(attr)).toBeFalse();
        expect(slider.hasAttribute(attr)).toBeFalse();
      });

      scope.$apply("val = 150");
      ["aria-valuemax", "aria-valuemin", "aria-valuenow"].forEach((attr) => {
        expect(progressbar.hasAttribute(attr)).toBeFalse();
        expect(slider.hasAttribute(attr)).toBeFalse();
      });
    });

    // bindKeypress
    it("should not bind keypress to `ngClick`", () => {
      scope.onClick = jasmine.createSpy("onClick");
      element = $compile(
        '<div><div ng-click="onClick()" tabindex="0" ng-aria-disable></div>' +
          '<ul><li ng-click="onClick()" tabindex="0" ng-aria-disable></li></ul></div>',
      )(scope);
      const div = element.querySelector("div");
      const li = element.querySelector("li");

      browserTrigger(div, { type: "keypress", keyCode: 32 });
      browserTrigger(li, { type: "keypress", keyCode: 32 });

      expect(scope.onClick).not.toHaveBeenCalled();
    });

    // bindRoleForClick
    it("should not attach role to custom controls", () => {
      element = $compile(
        '<div><div ng-click="onClick()" ng-aria-disable></div>' +
          '<div type="checkbox" ng-model="val" ng-aria-disable></div>' +
          '<div type="radio" ng-model="val" ng-aria-disable></div>' +
          '<div type="range" ng-model="val" ng-aria-disable></div></div>',
      )(scope);
      expect(element.children[0].hasAttribute("role")).toBeFalse();
      expect(element.children[1].hasAttribute("role")).toBeFalse();
      expect(element.children[2].hasAttribute("role")).toBeFalse();
      expect(element.children[3].hasAttribute("role")).toBeFalse();
    });

    // tabindex
    it("should not attach tabindex to custom controls", () => {
      element = $compile(
        '<div><div role="checkbox" ng-model="val" ng-aria-disable></div>' +
          '<div role="slider" ng-model="val" ng-aria-disable></div></div>',
      )(scope);
      expect(element.children[0].hasAttribute("tabindex")).toBeFalse();
      expect(element.children[1].hasAttribute("tabindex")).toBeFalse();
    });

    it("should not attach tabindex to `ngClick` or `ngDblclick`", () => {
      element = $compile(
        '<div><div ng-click="onClick()" ng-aria-disable></div>' +
          '<div ng-dblclick="onDblclick()" ng-aria-disable></div></div>',
      )(scope);
      expect(element.children[0].hasAttribute("tabindex")).toBeFalse();
      expect(element.children[1].hasAttribute("tabindex")).toBeFalse();
    });
  });

  describe("aria-hidden", () => {
    it("should attach aria-hidden to ng-show", async () => {
      element = $compile('<div ng-show="val"></div>')(scope);
      scope.$apply("val = false");
      await wait();

      expect(element.getAttribute("aria-hidden")).toBe("true");

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("false");
    });

    it("should attach aria-hidden to ng-hide", async () => {
      element = $compile('<div ng-hide="val"></div>')(scope);
      scope.$apply("val = false");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("false");

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("true");
    });

    it("should not change aria-hidden if it is already present on ng-show", async () => {
      element = $compile(
        '<div ng-show="val" aria-hidden="userSetValue"></div>',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("userSetValue");

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("userSetValue");
    });

    it("should not change aria-hidden if it is already present on ng-hide", async () => {
      element = $compile(
        '<div ng-hide="val" aria-hidden="userSetValue"></div>',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("userSetValue");

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("userSetValue");
    });

    it("should always set aria-hidden to a boolean value", async () => {
      element = $compile('<div ng-hide="val"></div>')(scope);
      scope.$apply('val = "test angular"');
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("true");

      scope.$apply("val = null");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("false");

      scope.$apply("val = {}");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("true");

      element = $compile('<div ng-show="val"></div>')(scope);
      scope.$apply('val = "test angular"');
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("false");

      scope.$apply("val = null");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("true");

      scope.$apply("val = {}");
      await wait();
      expect(element.getAttribute("aria-hidden")).toBe("false");
    });
  });

  describe("aria-hidden when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaHidden: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-hidden", () => {
      scope.$apply("val = false");
      element = $compile('<div ng-show="val"></div>')(scope);
      expect(element.hasAttribute("aria-hidden")).toBeFalse();

      element = $compile('<div ng-hide="val"></div>')(scope);
      expect(element.hasAttribute("aria-hidden")).toBeFalse();
    });
  });

  describe("aria-checked", () => {
    it('should not attach itself to native input type="checkbox"', async () => {
      element = $compile('<input type="checkbox" ng-model="val">')(scope);
      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-checked")).toBeNull();

      scope.$apply("val = false");
      await wait();
      expect(element.getAttribute("aria-checked")).toBeNull();
    });

    it("should attach itself to custom checkbox", async () => {
      element = $compile('<div role="checkbox" ng-model="val"></div>')(scope);
      scope.$apply('val = "checked"');
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply("val = null");
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("false");
    });

    it("should use `$isEmpty()` to determine if the checkbox is checked", async () => {
      element = $compile('<div role="checkbox" ng-model="val"></div>')(scope);
      await wait();
      const ctrl = getController(element, "ngModel");
      ctrl.$isEmpty = function (value) {
        return value === "not-checked";
      };

      scope.$apply("val = true");
      await wait();
      expect(ctrl.$modelValue).toBe(true);
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply("val = false");
      await wait();
      expect(ctrl.$modelValue).toBe(false);
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply('val = "not-checked"');
      await wait();
      expect(ctrl.$modelValue).toBe("not-checked");
      expect(element.getAttribute("aria-checked")).toBe("false");

      scope.$apply('val = "checked"');
      await wait();
      expect(ctrl.$modelValue).toBe("checked");
      expect(element.getAttribute("aria-checked")).toBe("true");
    });

    it("should not handle native checkbox with ngChecked", async () => {
      const element = $compile('<input type="checkbox" ng-checked="val">')(
        scope,
      );
      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-checked")).toBeNull();

      scope.$apply("val = false");
      await wait();
      expect(element.getAttribute("aria-checked")).toBeNull();
    });

    it("should handle custom checkbox with ngChecked", async () => {
      const element = $compile('<div role="checkbox" ng-checked="val">')(scope);

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply("val = false");
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("false");
    });

    it('should not attach to native input type="radio"', async () => {
      const element = $compile(
        '<div><input type="radio" ng-model="val" value="one">' +
          '<input type="radio" ng-model="val" value="two"></div>',
      )(scope);

      scope.$apply("val='one'");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBeNull();
      expect(element.children[1].getAttribute("aria-checked")).toBeNull();

      scope.$apply("val='two'");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBeNull();
      expect(element.children[1].getAttribute("aria-checked")).toBeNull();
    });

    it("should attach to custom radio controls", async () => {
      const element = $compile(
        '<div><div role="radio" ng-model="val" value="one"></div>' +
          '<div role="radio" ng-model="val" value="two"></div></div>',
      )(scope);

      scope.$apply("val='one'");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBe("true");
      expect(element.children[1].getAttribute("aria-checked")).toBe("false");

      scope.$apply("val='two'");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBe("false");
      expect(element.children[1].getAttribute("aria-checked")).toBe("true");
    });

    it("should handle custom radios with integer model values", async () => {
      const element = $compile(
        '<div><div role="radio" ng-model="val" value="0"></div>' +
          '<div role="radio" ng-model="val" value="1"></div></div>',
      )(scope);

      scope.$apply("val=0");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBe("true");
      expect(element.children[1].getAttribute("aria-checked")).toBe("false");

      scope.$apply("val=1");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBe("false");
      expect(element.children[1].getAttribute("aria-checked")).toBe("true");
    });

    it("should handle radios with boolean model values using ngValue", async () => {
      const element = $compile(
        '<div><div role="radio" ng-model="val" ng-value="valExp"></div>' +
          '<div role="radio" ng-model="val" ng-value="valExp2"></div></div>',
      )(scope);
      scope.valExp = true;
      scope.valExp2 = false;
      scope.val = true;
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBe("true");
      expect(element.children[1].getAttribute("aria-checked")).toBe("false");

      scope.$apply("val = false");
      await wait();
      expect(element.children[0].getAttribute("aria-checked")).toBe("false");
      expect(element.children[1].getAttribute("aria-checked")).toBe("true");
    });

    it('should attach itself to role="menuitemradio"', async () => {
      scope.val = "one";
      element = $compile(
        '<div role="menuitemradio" ng-model="val" value="one"></div>',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply("val = 'two'");
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("false");
    });

    it('should attach itself to role="menuitemcheckbox"', async () => {
      element = $compile('<div role="menuitemcheckbox" ng-model="val"></div>')(
        scope,
      );
      scope.$apply('val = "checked"');
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("true");

      scope.$apply("val = null");
      await wait();
      expect(element.getAttribute("aria-checked")).toBe("false");
    });

    it("should not attach itself if an aria-checked value is already present", async () => {
      const element = [
        $compile(
          "<div role='radio' ng-model='val' value='{{val3}}' aria-checked='userSetValue'></div>",
        )(scope),
        $compile(
          "<div role='menuitemradio' ng-model='val' value='{{val3}}' aria-checked='userSetValue'></div>",
        )(scope),
        $compile(
          "<div role='checkbox' checked='checked' aria-checked='userSetValue'></div>",
        )(scope),
        $compile(
          "<div role='menuitemcheckbox' checked='checked' aria-checked='userSetValue'></div>",
        )(scope),
      ];
      scope.$apply("val1=true;val2='one';val3='1'");
      await wait();
      expectAriaAttrOnEachElement(element, "aria-checked", "userSetValue");
    });
  });

  describe("roles for custom inputs", () => {
    it('should add missing role="button" to custom input', () => {
      element = $compile('<div ng-click="someFunction()"></div>')(scope);
      expect(element.getAttribute("role")).toBe("button");
    });

    it('should not add role="button" to anchor', () => {
      element = $compile('<a ng-click="someFunction()"></a>')(scope);
      expect(element.getAttribute("role")).not.toBe("button");
    });

    it('should add missing role="checkbox" to custom input', () => {
      element = $compile('<div type="checkbox" ng-model="val"></div>')(scope);
      expect(element.getAttribute("role")).toBe("checkbox");
    });

    it("should not add a role to a native checkbox", () => {
      element = $compile('<input type="checkbox" ng-model="val"/>')(scope);
      expect(element.getAttribute("role")).toBeNull();
    });

    it('should add missing role="radio" to custom input', () => {
      element = $compile('<div type="radio" ng-model="val"></div>')(scope);
      expect(element.getAttribute("role")).toBe("radio");
    });

    it("should not add a role to a native radio button", () => {
      element = $compile('<input type="radio" ng-model="val"/>')(scope);
      expect(element.getAttribute("role")).toBeNull();
    });

    it('should add missing role="slider" to custom input', () => {
      element = $compile('<div type="range" ng-model="val"></div>')(scope);
      expect(element.getAttribute("role")).toBe("slider");
    });

    it("should not add a role to a native range input", () => {
      element = $compile('<input type="range" ng-model="val"/>')(scope);
      expect(element.getAttribute("role")).toBeNull();
    });

    it("should not add role to native $prop controls", () => {
      [
        '<input type="text" ng-model="val">',
        '<select type="checkbox" ng-model="val"></select>',
        '<textarea type="checkbox" ng-model="val"></textarea>',
        '<button ng-click="doClick()"></button>',
        '<summary ng-click="doClick()"></summary>',
        '<details ng-click="doClick()"></details>',
        '<a ng-click="doClick()"></a>',
      ].forEach((tmpl) => {
        const element = $compile(tmpl)(scope);
        expect(element.getAttribute("role")).toBeNull();
      });
    });
  });

  describe("aria-checked when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaChecked: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-checked", () => {
      element = $compile(
        "<div role='radio' ng-model='val' value='{{val}}'></div>",
      )(scope);
      expect(element.getAttribute("aria-checked")).toBeNull();

      element = $compile(
        "<div role='menuitemradio' ng-model='val' value='{{val}}'></div>",
      )(scope);
      expect(element.getAttribute("aria-checked")).toBeNull();

      element = $compile("<div role='checkbox' checked='checked'></div>")(
        scope,
      );
      expect(element.getAttribute("aria-checked")).toBeNull();

      element = $compile(
        "<div role='menuitemcheckbox' checked='checked'></div>",
      )(scope);
      expect(element.getAttribute("aria-checked")).toBeNull();
    });
  });

  describe("aria-disabled", () => {
    it("should not attach itself to native $prop controls", () => {
      [
        '<input ng-disabled="val">',
        '<textarea ng-disabled="val"></textarea>',
        '<select ng-disabled="val"></select>',
        '<button ng-disabled="val"></button>',
      ].forEach((tmpl) => {
        const element = $compile(tmpl)(scope);
        scope.$apply("val = true");

        expect(element.getAttribute("disabled")).toBeDefined();
        expect(element.getAttribute("aria-disabled")).toBeNull();
      });
    });

    it("should attach itself to custom controls", async () => {
      element = $compile('<div ng-disabled="val"></div>')(scope);
      await wait();
      expect(element.getAttribute("aria-disabled")).toBe("false");

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-disabled")).toBe("true");
    });

    it("should not attach itself if an aria-disabled attribute is already present", () => {
      element = $compile(
        '<div ng-disabled="val" aria-disabled="userSetValue"></div>',
      )(scope);
      expect(element.getAttribute("aria-disabled")).toBe("userSetValue");
    });

    it("should always set aria-disabled to a boolean value", async () => {
      element = $compile('<div ng-disabled="val"></div>')(scope);

      scope.$apply('val = "test angular"');
      await wait();

      expect(element.getAttribute("aria-disabled")).toBe("true");

      scope.$apply("val = null");
      await wait();
      expect(element.getAttribute("aria-disabled")).toBe("false");

      scope.$apply("val = {}");
      await wait();
      expect(element.getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("aria-disabled when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaDisabled: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-disabled", async () => {
      element = $compile('<div ng-disabled="val"></div>')(scope);

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-disabled")).toBeNull();
    });
  });

  describe("aria-invalid", () => {
    it("should attach aria-invalid to input", async () => {
      element = $compile('<input ng-model="txtInput" ng-minlength="10">')(
        scope,
      );
      scope.$apply("txtInput='LTten'");
      await wait();
      expect(element.getAttribute("aria-invalid")).toBe("true");

      scope.$apply("txtInput='morethantencharacters'");
      await wait();
      expect(element.getAttribute("aria-invalid")).toBe("false");
    });

    it("should attach aria-invalid to custom controls", async () => {
      element = $compile(
        '<div ng-model="txtInput" role="textbox" ng-minlength="10"></div>',
      )(scope);
      scope.$apply("txtInput='LTten'");
      await wait();
      expect(element.getAttribute("aria-invalid")).toBe("true");

      scope.$apply("txtInput='morethantencharacters'");
      await wait();
      expect(element.getAttribute("aria-invalid")).toBe("false");
    });

    it("should not attach itself if aria-invalid is already present", async () => {
      element = $compile(
        '<input ng-model="txtInput" ng-minlength="10" aria-invalid="userSetValue">',
      )(scope);
      await wait();
      scope.$apply("txtInput='LTten'");
      expect(element.getAttribute("aria-invalid")).toBe("userSetValue");
    });

    it('should not attach if input is type="hidden"', () => {
      element = $compile('<input type="hidden" ng-model="txtInput">')(scope);
      expect(element.getAttribute("aria-invalid")).toBeNull();
    });

    it('should attach aria-invalid to custom control that is type="hidden"', async () => {
      element = $compile(
        '<div ng-model="txtInput" type="hidden" role="textbox" ng-minlength="10"></div>',
      )(scope);
      scope.$apply("txtInput='LTten'");
      await wait();
      expect(element.getAttribute("aria-invalid")).toBe("true");

      scope.$apply("txtInput='morethantencharacters'");
      await wait();
      expect(element.getAttribute("aria-invalid")).toBe("false");
    });
  });

  describe("aria-invalid when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaInvalid: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach aria-invalid if the option is disabled", () => {
      scope.$apply("txtInput='LTten'");
      element = $compile('<input ng-model="txtInput" ng-minlength="10">')(
        scope,
      );
      expect(element.getAttribute("aria-invalid")).toBeNull();
    });
  });

  describe("aria-readonly", () => {
    it("should not attach itself to native $prop controls", () => {
      [
        '<input ng-readonly="val">',
        '<textarea ng-readonly="val"></textarea>',
        '<select ng-readonly="val"></select>',
        '<button ng-readonly="val"></button>',
      ].forEach((tmpl) => {
        const element = $compile(tmpl)(scope);
        scope.$apply("val = true");

        expect(element.getAttribute("readonly")).toBeDefined();
        expect(element.getAttribute("aria-readonly")).toBeNull();
      });
    });

    it("should attach itself to custom controls", async () => {
      element = $compile('<div ng-readonly="val"></div>')(scope);
      await wait();
      expect(element.getAttribute("aria-readonly")).toBe("false");

      scope.$apply("val = true");
      await wait();
      expect(element.getAttribute("aria-readonly")).toBe("true");
    });

    it("should not attach itself if an aria-readonly attribute is already present", () => {
      element = $compile(
        '<div ng-readonly="val" aria-readonly="userSetValue"></div>',
      )(scope);
      expect(element.getAttribute("aria-readonly")).toBe("userSetValue");
    });

    it("should always set aria-readonly to a boolean value", async () => {
      element = $compile('<div ng-readonly="val"></div>')(scope);

      scope.$apply('val = "test angular"');
      await wait();
      expect(element.getAttribute("aria-readonly")).toBe("true");

      scope.$apply("val = null");
      await wait();
      expect(element.getAttribute("aria-readonly")).toBe("false");

      scope.$apply("val = {}");
      await wait();
      expect(element.getAttribute("aria-readonly")).toBe("true");
    });
  });

  describe("aria-readonly when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaReadonly: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add the aria-readonly attribute", () => {
      element = $compile("<input ng-model='val' readonly>")(scope);
      expect(element.getAttribute("aria-readonly")).toBeNull();

      element = $compile("<div ng-model='val' ng-readonly='true'></div>")(
        scope,
      );
      expect(element.getAttribute("aria-readonly")).toBeNull();
    });
  });

  describe("aria-required", () => {
    it("should not attach to input", () => {
      element = $compile('<input ng-model="val" required>')(scope);
      expect(element.getAttribute("aria-required")).toBeNull();
    });

    it("should attach to custom controls with ngModel and required", () => {
      element = $compile('<div ng-model="val" role="checkbox" required></div>')(
        scope,
      );
      expect(element.getAttribute("aria-required")).toBe("true");
    });

    it("should set aria-required to false when ng-required is false", async () => {
      element = $compile(
        "<div role='checkbox' ng-required='false' ng-model='val'></div>",
      )(scope);
      await wait();
      expect(element.getAttribute("aria-required")).toBe("false");
    });

    it("should attach to custom controls with ngRequired", async () => {
      element = $compile(
        '<div role="checkbox" ng-model="val" ng-required="true"></div>',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-required")).toBe("true");
    });

    it("should not attach itself if aria-required is already present", () => {
      element = $compile(
        "<div role='checkbox' ng-model='val' ng-required='true' aria-required='userSetValue'></div>",
      )(scope);
      expect(element.getAttribute("aria-required")).toBe("userSetValue");
    });
  });

  describe("aria-required when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaRequired: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add the aria-required attribute", () => {
      element = $compile("<input ng-model='val' required>")(scope);
      expect(element.getAttribute("aria-required")).toBeNull();

      element = $compile("<div ng-model='val' ng-required='true'></div>")(
        scope,
      );
      expect(element.getAttribute("aria-required")).toBeNull();
    });
  });

  describe("aria-value", () => {
    it('should attach to input type="range"', async () => {
      const element = [
        $compile('<input type="range" ng-model="val" min="0" max="100">')(
          scope,
        ),
        $compile('<div role="progressbar" min="0" max="100" ng-model="val">')(
          scope,
        ),
        $compile('<div role="slider" min="0" max="100" ng-model="val">')(scope),
      ];

      scope.$apply("val = 50");
      await wait();
      expectAriaAttrOnEachElement(element, "aria-valuenow", "50");
      expectAriaAttrOnEachElement(element, "aria-valuemin", "0");
      expectAriaAttrOnEachElement(element, "aria-valuemax", "100");

      scope.$apply("val = 90");
      await wait();
      expectAriaAttrOnEachElement(element, "aria-valuenow", "90");
    });

    it("should not attach if aria-value* is already present", () => {
      const element = [
        $compile(
          '<input type="range" ng-model="val" min="0" max="100" aria-valuenow="userSetValue1" aria-valuemin="userSetValue2" aria-valuemax="userSetValue3">',
        )(scope),
        $compile(
          '<div role="progressbar" min="0" max="100" ng-model="val" aria-valuenow="userSetValue1" aria-valuemin="userSetValue2" aria-valuemax="userSetValue3">',
        )(scope),
        $compile(
          '<div role="slider" min="0" max="100" ng-model="val" aria-valuenow="userSetValue1" aria-valuemin="userSetValue2" aria-valuemax="userSetValue3">',
        )(scope),
      ];

      scope.$apply("val = 50");
      expectAriaAttrOnEachElement(element, "aria-valuenow", "userSetValue1");
      expectAriaAttrOnEachElement(element, "aria-valuemin", "userSetValue2");
      expectAriaAttrOnEachElement(element, "aria-valuemax", "userSetValue3");
    });

    it("should update `aria-valuemin/max` when `min/max` changes dynamically", async () => {
      scope.$apply("min = 25; max = 75");
      element = $compile(
        '<input type="range" ng-model="val" min="{{min}}" max="{{max}}" />',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-valuemin")).toBe("25");
      expect(element.getAttribute("aria-valuemax")).toBe("75");

      scope.$apply("min = 0");
      await wait();
      expect(element.getAttribute("aria-valuemin")).toBe("0");

      scope.$apply("max = 100");
      await wait();
      expect(element.getAttribute("aria-valuemax")).toBe("100");
    });

    it("should update `aria-valuemin/max` when `ng-min/ng-max` changes dynamically", async () => {
      scope.$apply("min = 25; max = 75");
      element = $compile(
        '<input type="range" ng-model="val" ng-min="min" ng-max="max" />',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-valuemin")).toBe("25");
      expect(element.getAttribute("aria-valuemax")).toBe("75");

      scope.$apply("min = 0");

      await wait();
      expect(element.getAttribute("aria-valuemin")).toBe("0");

      scope.$apply("max = 100");

      await wait();
      expect(element.getAttribute("aria-valuemax")).toBe("100");
    });
  });

  describe("announcing ngMessages", () => {
    it("should attach aria-live", async () => {
      const element = $compile(
        '<div><div ng-messages="myForm.myName.$error"></div></div',
      )(scope);
      await wait();
      expectAriaAttrOnEachElement(
        Array.from(element.children),
        "aria-live",
        "assertive",
      );
    });
  });

  describe("aria-value when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            ariaValue: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not attach itself", async () => {
      scope.$apply("val = 50");

      element = $compile(
        '<input type="range" ng-model="val" min="0" max="100">',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-valuenow")).toBeNull();
      expect(element.getAttribute("aria-valuemin")).toBeNull();
      expect(element.getAttribute("aria-valuemax")).toBeNull();

      element = $compile(
        '<div role="progressbar" min="0" max="100" ng-model="val">',
      )(scope);
      await wait();
      expect(element.getAttribute("aria-valuenow")).toBeNull();
      expect(element.getAttribute("aria-valuemin")).toBeNull();
      expect(element.getAttribute("aria-valuemax")).toBeNull();
    });
  });

  describe("tabindex", () => {
    it("should not attach to native control $prop", () => {
      [
        "<button ng-click='something'></button>",
        "<a ng-href='#/something'>",
        "<input type='text' ng-model='val'>",
        "<input type='radio' ng-model='val'>",
        "<input type='checkbox' ng-model='val'>",
        "<textarea ng-model='val'></textarea>",
        "<select ng-model='val'></select>",
        "<details ng-model='val'></details>",
      ].forEach((html) => {
        element = $compile(html)(scope);
        expect(element.getAttribute("tabindex")).toBeNull();
      });
    });

    it("should not attach to random ng-model elements", () => {
      element = $compile('<div ng-model="val"></div>')(scope);
      expect(element.getAttribute("tabindex")).toBeNull();
    });

    it("should attach tabindex to custom inputs", () => {
      element = $compile('<div role="checkbox" ng-model="val"></div>')(scope);
      expect(element.getAttribute("tabindex")).toBe("0");

      element = $compile('<div role="slider" ng-model="val"></div>')(scope);
      expect(element.getAttribute("tabindex")).toBe("0");
    });

    it("should attach to ng-click and ng-dblclick", async () => {
      element = $compile('<div ng-click="someAction()"></div>')(scope);
      await wait();
      expect(element.getAttribute("tabindex")).toBe("0");

      element = $compile('<div ng-dblclick="someAction()"></div>')(scope);
      await wait();
      expect(element.getAttribute("tabindex")).toBe("0");
    });

    it("should not attach tabindex if it is already on an element", () => {
      element = $compile('<div role="button" tabindex="userSetValue"></div>')(
        scope,
      );
      expect(element.getAttribute("tabindex")).toBe("userSetValue");

      element = $compile('<div role="checkbox" tabindex="userSetValue"></div>')(
        scope,
      );
      expect(element.getAttribute("tabindex")).toBe("userSetValue");

      element = $compile(
        '<div ng-click="someAction()" tabindex="userSetValue"></div>',
      )(scope);
      expect(element.getAttribute("tabindex")).toBe("userSetValue");

      element = $compile(
        '<div ng-dblclick="someAction()" tabindex="userSetValue"></div>',
      )(scope);
      expect(element.getAttribute("tabindex")).toBe("userSetValue");
    });
  });

  describe("actions when bindRoleForClick is set to false", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            bindRoleForClick: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add a button role", () => {
      element = $compile('<radio-group ng-click="something"></radio-group>')(
        scope,
      );
      expect(element.getAttribute("role")).toBeNull();
    });
  });

  describe("actions when bindKeydown is set to false", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            bindKeydown: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not trigger click", () => {
      scope.someAction = jasmine.createSpy("someAction");

      element = $compile('<div ng-click="someAction()" tabindex="0"></div>')(
        scope,
      );

      browserTrigger(element, { type: "keydown", keyCode: 13 });
      browserTrigger(element, { type: "keydown", keyCode: 32 });
      browserTrigger(element, { type: "keypress", keyCode: 13 });
      browserTrigger(element, { type: "keypress", keyCode: 32 });
      browserTrigger(element, { type: "keyup", keyCode: 13 });
      browserTrigger(element, { type: "keyup", keyCode: 32 });

      expect(scope.someAction).not.toHaveBeenCalled();

      browserTrigger(element, { type: "click", keyCode: 32 });

      expect(scope.someAction).toHaveBeenCalled();
    });
  });

  describe("tabindex when disabled", () => {
    beforeEach(() => {
      window.angular.module("test", [
        "ng",
        ($ariaProvider) => {
          $ariaProvider.config({
            tabindex: false,
          });
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
    });

    it("should not add a tabindex attribute", async () => {
      element = $compile('<div role="button"></div>')(scope);
      await wait();
      expect(element.getAttribute("tabindex")).toBeNull();

      element = $compile('<div role="checkbox"></div>')(scope);
      await wait();
      expect(element.getAttribute("tabindex")).toBeNull();

      element = $compile('<div ng-click="someAction()"></div>')(scope);
      await wait();
      expect(element.getAttribute("tabindex")).toBeNull();

      element = $compile('<div ng-dblclick="someAction()"></div>')(scope);
      await wait();
      expect(element.getAttribute("tabindex")).toBeNull();
    });
  });

  describe("ngModel", () => {
    it("should not break when manually compiling", async () => {
      window.angular.module("test", [
        "ng",
        ($compileProvider) => {
          $compileProvider.directive("foo", () => ({
            priority: 10,
            terminal: true,
            link(scope, elem) {
              $compile(elem, null, 10)(scope);
            },
          }));
        },
      ]);
      let injector = createInjector(["test"]);
      scope = injector.get("$rootScope");
      $compile = injector.get("$compile");
      element = $compile('<div role="checkbox" ng-model="value" foo />')(scope);
      await wait();
      // Just check an arbitrary feature to make sure it worked
      expect(element.getAttribute("tabindex")).toBe("0");
    });
  });

  function expectAriaAttrOnEachElement(elem, ariaAttr, expected) {
    elem.forEach((val) => {
      expect(val.getAttribute(ariaAttr)).toBe(expected);
    });
  }
});
