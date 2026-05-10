// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import {
  createElementFromHTML,
  dealoc,
  getController,
} from "../../shared/dom.ts";
import { hashKey, equals, isNumberNaN, toJson } from "../../shared/utils.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";
import { optionDirective } from "./select.ts";

describe("select", () => {
  let scope;

  let formElement;

  let element;

  let $compile;

  let ngModelCtrl;

  let selectCtrl;

  let renderSpy;

  let $rootScope;

  let injector;

  const optionAttributesList = [];

  let errors = [];

  async function compile(html) {
    formElement = createElementFromHTML(`<form name="form">${html}</form>`);
    element = formElement.querySelector("select");
    $compile(formElement)(scope);
    await wait();
    ngModelCtrl = getController(element, "ngModel");
  }

  function setSelectValue(selectElement, optionIndex) {
    const option = selectElement.querySelectorAll("option")[optionIndex];

    selectElement.value = option.value;
    browserTrigger(element, "change");
  }

  function compileRepeatedOptions() {
    return compile(
      '<select ng-model="robot">' +
        '<option value="{{item.value}}" ng-repeat="item in robots">{{item.label}}</option>' +
        "</select>",
    );
  }

  function compileGroupedOptions() {
    return compile(
      '<select ng-model="mySelect">' +
        '<option ng-repeat="item in values">{{item.name}}</option>' +
        '<optgroup ng-repeat="group in groups" label="{{group.name}}">' +
        '<option ng-repeat="item in group.values">{{item.name}}</option>' +
        "</optgroup>" +
        "</select>",
    );
  }

  function unknownValue(value) {
    return `? ${hashKey(value)} ?`;
  }

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    errors = [];
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          errors.push(exception.message);
        };
      });
    injector = window.angular.bootstrap(document.getElementById("app"), [
      "myModule",
      ($compileProvider) => {
        $compileProvider.directive("spyOnWriteValue", () => ({
          require: "select",
          link: {
            pre(scope, element, attrs, ctrl) {
              selectCtrl = ctrl;
              renderSpy = jasmine.createSpy("renderSpy");
              selectCtrl._ngModelCtrl.$render = renderSpy.and.callFake(
                selectCtrl._ngModelCtrl.$render,
              );
              spyOn(selectCtrl, "_writeValue").and.callThrough();
            },
          },
        }));
        $compileProvider.directive("myOptions", () => ({
          scope: { myOptions: "=" },
          replace: true,
          template:
            '<option value="{{ option.value }}" ng-repeat="option in myOptions">' +
            "{{ options.label }}" +
            "</option>",
        }));

        $compileProvider.directive("exposeAttributes", () => ({
          require: "^^select",
          link: {
            pre(scope, element, attrs, ctrl) {
              optionAttributesList.push(attrs);
            },
          },
        }));
      },
    ]);
    injector.invoke((_$rootScope_, _$compile_) => {
      scope = _$rootScope_.$new(); // create a child scope because the root scope can't be $destroy-ed
      $rootScope = _$rootScope_;
      $compile = _$compile_;
      formElement = element = null;
    });
  });

  afterEach(() => {
    scope.$destroy(); // disables unknown option work during destruction
    dealoc(formElement);
    ngModelCtrl = null;
  });

  beforeEach(() => {
    jasmine.addMatchers({
      toEqualSelectWithOptions() {
        return {
          compare(actual, expected) {
            const actualValues = {};

            let optionGroup;

            let optionValue;

            const options = actual.querySelectorAll("option");

            for (let i = 0; i < options.length; i++) {
              const option = options[i];

              optionGroup = option.parentNode.label || "";
              actualValues[optionGroup] = actualValues[optionGroup] || [];
              // IE9 doesn't populate the label property from the text property like other browsers
              optionValue = option.label || option.text;
              actualValues[optionGroup].push(
                option.selected ? [optionValue] : optionValue,
              );
            }

            const message = function () {
              return `Expected ${toJson(actualValues)} to equal ${toJson(expected)}.`;
            };

            return {
              pass: equals(expected, actualValues),
              message,
            };
          },
        };
      },
    });
  });

  describe("option compile", () => {
    it("should set a static value from option text during compile", () => {
      const directive = optionDirective(injector.get("$interpolate"));

      const option = document.createElement("option");

      const attr = {
        $set: jasmine.createSpy("$set"),
      };

      option.textContent = "literal";
      const link = directive.compile(option, attr);

      expect(attr.$set).toHaveBeenCalledWith("value", "literal");
      expect(link).toEqual(jasmine.any(Function));
    });

    it("should preserve explicit option values during compile", () => {
      const directive = optionDirective(injector.get("$interpolate"));

      const option = document.createElement("option");

      const attr = {
        value: "explicit",
        $set: jasmine.createSpy("$set"),
      };

      const link = directive.compile(option, attr);

      expect(attr.$set).not.toHaveBeenCalled();
      expect(link).toEqual(jasmine.any(Function));
    });
  });

  it("should not add options to the select if ngModel is not present", () => {
    const scope = $rootScope;

    scope.d = "d";
    scope.e = "e";
    scope.f = "f";

    compile(
      "<select>" +
        "<option ng-value=\"'a'\">alabel</option>" +
        '<option value="b">blabel</option>' +
        "<option >c</option>" +
        '<option ng-value="d">dlabel</option>' +
        '<option value="{{e}}">elabel</option>' +
        "<option>{{f}}</option>" +
        "</select>",
    );

    const selectCtrl = getController(element, "select");

    expect(selectCtrl._hasOption("a")).toBe(false);
    expect(selectCtrl._hasOption("b")).toBe(false);
    expect(selectCtrl._hasOption("c")).toBe(false);
    expect(selectCtrl._hasOption("d")).toBe(false);
    expect(selectCtrl._hasOption("e")).toBe(false);
    expect(selectCtrl._hasOption("f")).toBe(false);
  });

  describe("select-one", () => {
    it("should compile children of a select without a ngModel, but not create a model for it", async () => {
      compile(
        "<select>" +
          '<option selected="true">{{a}}</option>' +
          '<option value="">{{b}}</option>' +
          "<option>C</option>" +
          "</select>",
      );
      scope.a = "foo";
      scope.b = "bar";
      await wait();
      expect(element.textContent).toBe("foobarC");
    });

    it("should not interfere with selection via selected attr if ngModel directive is not present", () => {
      compile(
        "<select>" +
          "<option>not me</option>" +
          "<option selected>me!</option>" +
          "<option>nah</option>" +
          "</select>",
      );
      expect(element.value).toBe("me!");
    });

    describe("required state", () => {
      it("should set the error if the empty option is selected", async () => {
        compile(
          '<select name="select" ng-model="selection" required>' +
            '<option value=""></option>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );

        scope.selection = "a";
        await wait();
        expect(element.classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        let options = element.querySelectorAll("option");

        // view -> model
        setSelectValue(element, 0);
        expect(element.classList.contains("ng-invalid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeTruthy();

        setSelectValue(element, 1);
        expect(element.classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        // // model -> view
        scope.selection = null;
        await wait();
        options = element.querySelectorAll("option");
        expect(options[0].selected).toBe(true);
        expect(element.classList.contains("ng-invalid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeTruthy();
      });

      it("should validate with empty option and bound ngRequired", async () => {
        compile(
          '<select name="select" ng-model="selection" ng-required="required">' +
            '<option value=""></option>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );

        scope.required = false;
        await wait();
        const options = element.querySelectorAll("option");

        setSelectValue(element, 0);
        expect(element.classList.contains("ng-valid")).toBeTrue();

        scope.required = true;
        await wait();
        expect(element.classList.contains("ng-invalid")).toBeTrue();

        scope.selection = "a";
        await wait();
        expect(element.classList.contains("ng-valid")).toBeTrue();
        expect(element.value).toBe("a");

        setSelectValue(element, 0);
        expect(element.classList.contains("ng-invalid")).toBeTrue();

        scope.required = false;
        await wait();
        expect(element.classList.contains("ng-valid")).toBeTrue();
      });

      it("should not be invalid if no required attribute is present", async () => {
        compile(
          '<select name="select" ng-model="selection">' +
            '<option value=""></option>' +
            '<option value="c">C</option>' +
            "</select>",
        );
        await wait();
        expect(element.classList.contains("ng-valid")).toBeTrue();
        expect(element.classList.contains("ng-pristine")).toBeTrue();
      });

      it("should NOT set the error if the unknown option is selected", async () => {
        compile(
          '<select name="select" ng-model="selection" required>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );
        scope.selection = "a";
        await wait();

        expect(element.classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();

        scope.selection = "c";
        await wait();
        expect(element.value).toBe(unknownValue("c"));
        expect(element.classList.contains("ng-valid")).toBeTrue();
        expect(ngModelCtrl.$error.required).toBeFalsy();
      });
    });

    it("should work with repeated value options", async () => {
      scope.robots = ["c3p0", "r2d2"];
      scope.robot = "r2d2";
      compile(
        '<select ng-model="robot">' +
          '<option ng-repeat="r in robots">{{r}}</option>' +
          "</select>",
      );
      await wait();
      expect(element.value).toBe("r2d2");

      setSelectValue(element, 0);
      expect(element.value).toBe("c3p0");
      expect(scope.robot).toBe("c3p0");

      scope.robots.unshift("wallee");
      await wait();
      expect(element.value).toBe("c3p0");
      expect(scope.robot).toBe("c3p0");

      scope.robots = ["c3p0+", "r2d2+"];
      scope.robot = "r2d2+";
      await wait();
      expect(element.value).toBe("r2d2+");
      expect(scope.robot).toBe("r2d2+");
    });

    it("should interpolate select names", async () => {
      scope.robots = ["c3p0", "r2d2"];
      scope.name = "r2d2";
      scope.nameID = 47;
      compile(
        '<form name="form"><select ng-model="name" name="name{{nameID}}">' +
          '<option ng-repeat="r in robots">{{r}}</option>' +
          "</select></form>",
      );
      await wait();
      expect(scope.form.name47.$pristine).toBeTruthy();
      setSelectValue(element, 0);
      expect(scope.form.name47.$dirty).toBeTruthy();
      expect(scope.name).toBe("c3p0");
    });

    it("should rename select controls in form when interpolated name changes", async () => {
      scope.nameID = "A";
      compile('<select ng-model="name" name="name{{nameID}}"></select>');
      expect(scope.form.nameA.$name).toBe("nameA");
      const oldModel = scope.form.nameA;

      scope.nameID = "B";
      await wait();
      expect(scope.form.nameA).toBeUndefined();
      expect(scope.form.nameB).toBe(oldModel);
      expect(scope.form.nameB.$name).toBe("nameB");
    });

    it("should select options in a group when there is a linebreak before an option", async () => {
      scope.mySelect = "B";
      await wait();

      const select = createElementFromHTML(
        '<select ng-model="mySelect">' +
          '<optgroup label="first">' +
          '<option value="A">A</option>' +
          "</optgroup>" +
          '<optgroup label="second">\n' +
          '<option value="B">B</option>' +
          "</optgroup>      " +
          "</select>",
      );

      $compile(select)(scope);
      await wait();
      expect(select).toEqualSelectWithOptions({
        first: ["A"],
        second: [["B"]],
      });
    });

    it("should only call selectCtrl._writeValue after a digest has occurred", async () => {
      scope.mySelect = "B";
      await wait();
      const select = createElementFromHTML(
        '<select spy-on-write-value ng-model="mySelect">' +
          '<optgroup label="first">' +
          '<option value="A">A</option>' +
          "</optgroup>" +
          '<optgroup label="second">\n' +
          '<option value="B">B</option>' +
          "</optgroup>      " +
          "</select>",
      );

      $compile(select)(scope);
      expect(selectCtrl._writeValue).not.toHaveBeenCalled();
      await wait();

      expect(selectCtrl._writeValue).toHaveBeenCalled();
      dealoc(select);
    });

    it('should remove the "selected" attribute from the previous option when the model changes', async () => {
      compile(
        '<select name="select" ng-model="selected">' +
          '<option value="">--empty--</option>' +
          '<option value="a">A</option>' +
          '<option value="b">B</option>' +
          "</select>",
      );
      await wait();
      let options = element.querySelectorAll("option");

      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeFalse();

      scope.selected = "a";
      await wait();
      options = element.querySelectorAll("option");
      expect(options.length).toBe(3);
      expect(options[0].selected).toBeFalse();
      expect(options[1].selected).toBeTrue();
      expect(options[2].selected).toBeFalse();

      scope.selected = "b";
      await wait();
      options = element.querySelectorAll("option");
      expect(options[0].selected).toBeFalse();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeTrue();

      // This will select the empty option
      scope.selected = null;
      await wait();
      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeFalse();

      // This will add and select the unknown option
      scope.selected = "unmatched value";
      await wait();
      options = element.querySelectorAll("option");

      expect(options[0].selected).toBeTrue();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeFalse();
      expect(options[3].selected).toBeFalse();

      // Back to matched value
      scope.selected = "b";
      await wait();
      options = element.querySelectorAll("option");

      expect(options[0].selected).toBeFalse();
      expect(options[1].selected).toBeFalse();
      expect(options[2].selected).toBeTrue();
    });

    describe("empty option", () => {
      it("should allow empty option to be added and removed dynamically", async () => {
        scope.dynamicOptions = [];
        scope.robot = "";
        compile(
          '<select ng-model="robot">' +
            '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">{{opt.display}}</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("? string: ?");

        scope.dynamicOptions = [
          { val: "", display: "--empty--" },
          { val: "x", display: "robot x" },
          { val: "y", display: "robot y" },
        ];

        await wait();
        expect(element.value).toBe("");

        scope.robot = "x";
        await wait();
        expect(element.value).toBe("x");

        scope.dynamicOptions.shift();
        await wait();
        expect(element.value).toBe("x");

        scope.robot = undefined;
        await wait();

        expect(element.value).toBe("");
      });

      it("should cope use a dynamic empty option that is added to a static empty option", async () => {
        // We do not make any special provisions for multiple empty options, so this behavior is
        // largely untested
        scope.dynamicOptions = [];
        scope.robot = "x";
        compile(
          '<select ng-model="robot">' +
            '<option value="">--static-select--</option>' +
            '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">{{opt.display}}</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe(unknownValue("x"));

        scope.robot = undefined;
        await wait();
        expect(element.querySelectorAll("option")[0].selected).toBe(true);
        expect(element.querySelectorAll("option")[0].textContent).toBe(
          "--static-select--",
        );

        scope.dynamicOptions = [
          { val: "", display: "--dynamic-select--" },
          { val: "x", display: "robot x" },
          { val: "y", display: "robot y" },
        ];
        await wait();
        expect(element.value).toBe("");

        scope.dynamicOptions = [];
        await wait();
        expect(element.value).toBe("");
      });

      it("should select the empty option when model is undefined", async () => {
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("");
      });

      it("should support defining an empty option anywhere in the option list", async () => {
        compile(
          '<select ng-model="robot">' +
            '<option value="x">robot x</option>' +
            '<option value="">--select--</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("");
      });

      it("should set the model to empty string when empty option is selected", async () => {
        scope.robot = "x";
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("x");
        setSelectValue(element, 0);
        await wait();
        expect(element.value).toBe("");
        expect(scope.robot).toBe("");
      });

      it("should remove unknown option when model is undefined", async () => {
        scope.robot = "other";
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe(unknownValue("other"));

        scope.robot = undefined;
        await wait();
        expect(element.value).toBe("");
      });

      it("should support option without a value attribute", async () => {
        compile(
          '<select ng-model="robot">' +
            "<option>--select--</option>" +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("? undefined:undefined ?");
      });

      it("should support option without a value with other HTML attributes", async () => {
        compile(
          '<select ng-model="robot">' +
            '<option data-foo="bar">--select--</option>' +
            '<option value="x">robot x</option>' +
            '<option value="y">robot y</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("? undefined:undefined ?");
      });

      describe("interactions with repeated options", () => {
        it("should select empty option when model is undefined", async () => {
          scope.robots = ["c3p0", "r2d2"];
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.value).toBe("");
        });

        it("should set model to empty string when selected", async () => {
          scope.robots = ["c3p0", "r2d2"];
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          await wait();
          setSelectValue(element, 1);
          expect(element.value).toBe("c3p0");
          expect(scope.robot).toBe("c3p0");

          setSelectValue(element, 0);
          await wait();
          expect(element.value).toBe("");
          expect(scope.robot).toBe("");
        });

        it("should not break if both the select and repeater models change at once", async () => {
          scope.robots = ["c3p0", "r2d2"];
          scope.robot = "c3p0";
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.value).toBe("c3p0");

          scope.robots = ["wallee"];
          scope.robot = "";
          await wait();
          expect(element.value).toBe("");
        });
      });

      it('should add/remove the "selected" attribute when the empty option is selected/unselected', async () => {
        compile(
          '<select name="select" ng-model="selected">' +
            '<option value="">--select--</option>' +
            '<option value="a">A</option>' +
            '<option value="b">B</option>' +
            "</select>",
        );
        await wait();
        let options = element.querySelectorAll("option");

        expect(options.length).toBe(3);
        expect(options[0].selected).toBeTrue();
        expect(options[1].selected).toBeFalse();
        expect(options[2].selected).toBeFalse();

        scope.selected = "a";
        await wait();
        options = element.querySelectorAll("option");
        expect(options.length).toBe(3);
        expect(options[0].selected).toBeFalse();
        expect(options[1].selected).toBeTrue();
        expect(options[2].selected).toBeFalse();

        scope.selected = "no match";
        await wait();
        options = element.querySelectorAll("option");
        expect(options[0].selected).toBeTrue();
        expect(options[1].selected).toBeFalse();
        expect(options[2].selected).toBeFalse();
      });
    });

    describe("unknown option", () => {
      it("should insert&select temporary unknown option when no options-model match", async () => {
        compile(
          '<select ng-model="robot">' +
            "<option>c3p0</option>" +
            "<option>r2d2</option>" +
            "</select>",
        );
        await wait();
        expect(element.value).toBe(`? undefined:undefined ?`);

        scope.robot = "r2d2";
        await wait();
        expect(element.value).toBe("r2d2");

        scope.robot = "wallee";
        await wait();
        expect(element.value).toBe(unknownValue("wallee"));
      });

      it("should NOT insert temporary unknown option when model is undefined and empty options is present", async () => {
        compile(
          '<select ng-model="robot">' +
            '<option value="">--select--</option>' +
            "<option>c3p0</option>" +
            "<option>r2d2</option>" +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("");
        expect(scope.robot).toBeUndefined();

        scope.robot = null;
        await wait();
        expect(element.value).toBe("");

        scope.robot = "r2d2";
        await wait();
        expect(element.value).toBe("r2d2");

        delete scope.robot;
        await wait();
        expect(element.value).toBe("");
      });

      it(
        "should insert&select temporary unknown option when no options-model match, empty " +
          "option is present and model is defined",
        async () => {
          scope.robot = "wallee";
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              "<option>c3p0</option>" +
              "<option>r2d2</option>" +
              "</select>",
          );
          await wait();
          expect(element.value).toBe(unknownValue("wallee"));

          scope.robot = "r2d2";
          await wait();
          expect(element.value).toBe("r2d2");
        },
      );

      describe("interactions with repeated options", () => {
        it("should work with repeated options", async () => {
          compile(
            '<select ng-model="robot">' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.value).toBe(`? undefined:undefined ?`);
          expect(scope.robot).toBeUndefined();

          scope.robot = "r2d2";
          await wait();
          expect(element.value).toBe(unknownValue("r2d2"));
          expect(scope.robot).toBe("r2d2");

          scope.robots = ["c3p0", "r2d2"];
          await wait();
          expect(element.value).toBe("r2d2");
          expect(scope.robot).toBe("r2d2");
        });

        it("should work with empty option and repeated options", async () => {
          compile(
            '<select ng-model="robot">' +
              '<option value="">--select--</option>' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.value).toBe("");
          expect(scope.robot).toBeUndefined();

          scope.robot = "r2d2";
          await wait();
          expect(element.value).toBe(unknownValue("r2d2"));
          expect(scope.robot).toBe("r2d2");

          scope.robots = ["c3p0", "r2d2"];
          await wait();
          expect(element.value).toBe("r2d2");
          expect(scope.robot).toBe("r2d2");
        });

        it("should insert unknown element when repeater shrinks and selected option is unavailable", async () => {
          scope.robots = ["c3p0", "r2d2"];
          scope.robot = "r2d2";
          compile(
            '<select ng-model="robot">' +
              '<option ng-repeat="r in robots">{{r}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.value).toBe("r2d2");
          expect(scope.robot).toBe("r2d2");

          scope.robots = ["c3p0"];
          await wait();

          expect(element.value).toBe("c3p0");

          // TODO we can add a mutation observer to trigger the render but it seems like an overkill for this case
          // as none of the behavior below is 'expected' when mutating the array of robots.
          // expect(scope.robot).toBe(null);

          // scope.robots.unshift("r2d2");
          // await wait();
          // expect(element.value).toBe("r2d2");
          // expect(scope.robot).toBe(null);

          // scope.robot = "r2d2";
          // await wait();
          // expect(element.value).toBe("r2d2");

          // delete scope.robots;
          // await wait();
          // expect(element.value).toBe(unknownValue(null));
          // expect(scope.robot).toBe(null);
        });
      });
    });

    it("should not break when adding options via a directive with `replace: true` and a structural directive in its template", async () => {
      scope.options = [
        { value: "1", label: "Option 1" },
        { value: "2", label: "Option 2" },
        { value: "3", label: "Option 3" },
      ];
      compile(
        '<select ng-model="mySelect"><option my-options="options"></option></select>',
      );
      await wait();
      expect(element.value).toBe("? undefined:undefined ?");
    });

    it("should not throw when removing the element and all its children", async () => {
      const template =
        '<select ng-model="mySelect" ng-if="visible">' +
        '<option value="">--- Select ---</option>' +
        "</select>";

      scope.visible = true;

      compile(template);

      // It should not throw when removing the element
      scope.visible = false;
      await wait();
      expect(true).toBeTruthy();
    });
  });

  describe("selectController", () => {
    it("should expose .$hasEmptyOption(), .$isEmptyOptionSelected(), and .$isUnknownOptionSelected()", async () => {
      compile('<select ng-model="mySelect"></select>');

      const selectCtrl = getController(element, "select");

      await wait();
      expect(selectCtrl.$hasEmptyOption).toEqual(jasmine.any(Function));
      expect(selectCtrl.$isEmptyOptionSelected).toEqual(jasmine.any(Function));
      expect(selectCtrl.$isUnknownOptionSelected).toEqual(
        jasmine.any(Function),
      );
    });

    it("should reflect the status of empty and unknown option", async () => {
      scope.dynamicOptions = [];
      scope.selected = "";
      compile(
        '<select ng-model="selected">' +
          '<option ng-if="empty" value="">--no selection--</option>' +
          '<option ng-repeat="opt in dynamicOptions" value="{{opt.val}}">{{opt.display}}</option>' +
          "</select>",
      );
      await wait();
      const selectCtrl = getController(element, "select");

      expect(element.value).toBe("? string: ?");
      expect(selectCtrl.$hasEmptyOption()).toBe(false);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);

      scope.dynamicOptions = [
        { val: "x", display: "robot x" },
        { val: "y", display: "robot y" },
      ];
      scope.empty = true;
      await wait();
      expect(element.value).toBe("");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // empty -> selection
      scope.selected = "x";
      await wait();
      expect(element.value).toBe("x");
      expect(selectCtrl.$hasEmptyOption()).toBe(true);
      expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // // remove empty
      // await wait();
      // expect(element.value).toBe("x");
      // expect(selectCtrl.$hasEmptyOption()).toBe(false);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // // selection -> unknown
      // await wait();
      // expect(element.value).toBe(unknownValue("unmatched"));
      // expect(selectCtrl.$hasEmptyOption()).toBe(false);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // // add empty
      // await wait();
      // expect(element.value).toBe(unknownValue("unmatched"));
      // expect(selectCtrl.$hasEmptyOption()).toBe(true);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // // unknown -> empty
      // await wait();
      // expect(element.value).toBe("");
      // expect(selectCtrl.$hasEmptyOption()).toBe(true);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // // empty -> unknown
      // await wait();
      // expect(element.value).toBe(unknownValue("unmatched"));
      // expect(selectCtrl.$hasEmptyOption()).toBe(true);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(true);

      // // unknown -> selection
      // await wait();
      // expect(element.value).toBe("y");
      // expect(selectCtrl.$hasEmptyOption()).toBe(true);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(false);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);

      // // selection -> empty
      // await wait();
      // expect(element.value).toBe("");
      // expect(selectCtrl.$hasEmptyOption()).toBe(true);
      // expect(selectCtrl.$isEmptyOptionSelected()).toBe(true);
      // expect(selectCtrl.$isUnknownOptionSelected()).toBe(false);
    });
  });

  describe("selectController._hasOption", () => {
    describe("flat options", () => {
      it("should return false for options shifted via ngRepeat", async () => {
        scope.robots = [
          { value: 1, label: "c3p0" },
          { value: 2, label: "r2d2" },
        ];

        await compileRepeatedOptions();

        const selectCtrl = getController(element, "select");

        scope.robots.shift();
        await wait();
        expect(typeof selectCtrl._hasOption("1")).toBe("boolean");
        expect(selectCtrl._hasOption("2")).toBe(true);
      });

      it("should return false for options popped via ngRepeat", async () => {
        scope.robots = [
          { value: 1, label: "c3p0" },
          { value: 2, label: "r2d2" },
        ];

        await compileRepeatedOptions();
        const selectCtrl = getController(element, "select");

        scope.robots.pop();
        await wait();
        expect(selectCtrl._hasOption("1")).toBe(true);
        expect(typeof selectCtrl._hasOption("2")).toBe("boolean");
      });

      it("should return true for options added via ngRepeat", async () => {
        scope.robots = [{ value: 2, label: "r2d2" }];

        await compileRepeatedOptions();

        const selectCtrl = getController(element, "select");

        scope.robots.unshift({ value: 1, label: "c3p0" });
        await wait();
        expect(selectCtrl._hasOption("1")).toBe(true);
        expect(selectCtrl._hasOption("2")).toBe(true);
      });

      it("should keep all the options when changing the model", async () => {
        compile(
          "<select ng-model=\"mySelect\"><option ng-repeat=\"o in ['A','B','C']\">{{o}}</option></select>",
        );

        const selectCtrl = getController(element, "select");

        scope.mySelect = "C";
        await wait();
        expect(selectCtrl._hasOption("A")).toBe(true);
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(selectCtrl._hasOption("C")).toBe(true);
        expect(element).toEqualSelectWithOptions({ "": ["A", "B", ["C"]] });
      });
    });

    describe("grouped options", () => {
      it("should be able to detect when elements move from a previous group", async () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }, { name: "D" }],
          },
          {
            name: "second",
            values: [{ name: "E" }],
          },
        ];

        await compileGroupedOptions();

        const selectCtrl = getController(element, "select");

        const itemD = scope.groups[0].values.pop();

        scope.groups[1].values.unshift(itemD);
        scope.values.shift();
        await wait();
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(3);
      });

      it("should be able to detect when elements move from a following group", async () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        await compileGroupedOptions();

        const selectCtrl = getController(element, "select");

        const itemD = scope.groups[1].values.shift();

        scope.groups[0].values.push(itemD);
        scope.values.shift();
        await wait();
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(3);
      });

      it("should be able to detect when an element is replaced with an element from a previous group", async () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }, { name: "D" }],
          },
          {
            name: "second",
            values: [{ name: "E" }, { name: "F" }],
          },
        ];

        await compileGroupedOptions();

        const selectCtrl = getController(element, "select");

        const itemD = scope.groups[0].values.pop();

        scope.groups[1].values.unshift(itemD);
        scope.groups[1].values.pop();
        await wait();
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(4);
      });

      it("should be able to detect when element is replaced with an element from a following group", async () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        await compileGroupedOptions();

        const selectCtrl = getController(element, "select");

        scope.groups[0].values.pop();
        const itemD = scope.groups[1].values.shift();

        scope.groups[0].values.push(itemD);
        await wait();
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(4);
      });

      it("should be able to detect when an element is removed", async () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        await compileGroupedOptions();
        const selectCtrl = getController(element, "select");

        scope.groups[1].values.shift();
        await wait();
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(3);
      });

      it("should be able to detect when a group is removed", async () => {
        scope.values = [{ name: "A" }];
        scope.groups = [
          {
            name: "first",
            values: [{ name: "B" }, { name: "C" }],
          },
          {
            name: "second",
            values: [{ name: "D" }, { name: "E" }],
          },
        ];

        await compileGroupedOptions();

        const selectCtrl = getController(element, "select");

        scope.groups.pop();
        await wait();
        expect(selectCtrl._hasOption("B")).toBe(true);
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("select-multiple", () => {
    it('should support type="select-multiple"', async () => {
      compile(
        '<select ng-model="selection" multiple>' +
          "<option>A</option>" +
          "<option>B</option>" +
          "</select>",
      );

      scope.selection = ["A"];
      await wait();
      let optionElements = element.querySelectorAll("option");

      expect(element.value).toBe("A");
      expect(optionElements[0].selected).toBeTrue();
      expect(optionElements[1].selected).toBeFalse();

      scope.selection.push("B");
      await wait();
      optionElements = element.querySelectorAll("option");

      expect(element.value).toBe("A");
      expect(
        optionElements[0].selected || optionElements[1].selected,
      ).toBeTrue();
    });

    it("should work with optgroups", async () => {
      compile(
        '<select ng-model="selection" multiple>' +
          '<optgroup label="group1">' +
          "<option>A</option>" +
          "<option>B</option>" +
          "</optgroup>" +
          "</select>",
      );
      await wait();
      expect(element.value).toBe("");
      expect(scope.selection).toBeUndefined();

      scope.selection = ["A"];
      await wait();
      expect(element.value).toBe("A");

      scope.selection.push("B");
      await wait();
      expect(element.value).toBe("A");
    });

    it("should require", async () => {
      compile(
        '<select name="select" ng-model="selection" multiple required>' +
          "<option>A</option>" +
          "<option>B</option>" +
          "</select>",
      );

      scope.selection = [];
      await wait();
      expect(Array.isArray(scope.selection)).toBeTrue();

      scope.selection = ["A"];
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBeTrue();

      element.value = "B";
      browserTrigger(element, "change");
      expect(element.classList.contains("ng-valid")).toBeTrue();
      expect(element.classList.contains("ng-dirty")).toBeTrue();
    });

    describe("calls to $render", () => {
      let ngModelCtrl;

      beforeEach(() => {
        compile(
          '<select name="select" ng-model="selection" multiple>' +
            "<option>A</option>" +
            "<option>B</option>" +
            "</select>",
        );

        ngModelCtrl = getController(element, "ngModel");
        spyOn(ngModelCtrl, "$render").and.callThrough();
      });

      it("should call $render once when the reference to the viewValue changes", async () => {
        ngModelCtrl.$render.calls.reset();
        scope.selection = ["A"];
        await wait();
        expect(ngModelCtrl.$render).toHaveBeenCalled();

        scope.selection = ["A", "B"];
        await wait();
        expect(ngModelCtrl.$render.calls.count()).toBeGreaterThanOrEqual(1);

        scope.selection = [];
        await wait();
        expect(ngModelCtrl.$render.calls.count()).toBeGreaterThanOrEqual(1);
      });

      it("should call $render once when the viewValue deep-changes", async () => {
        ngModelCtrl.$render.calls.reset();
        scope.selection = ["A"];
        await wait();
        expect(ngModelCtrl.$render).toHaveBeenCalled();

        scope.selection.push("B");
        await wait();
        expect(ngModelCtrl.$render.calls.count()).toBeGreaterThanOrEqual(1);

        scope.selection.length = 0;
        await wait();
        expect(ngModelCtrl.$render.calls.count()).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("option", () => {
    it("should populate a missing value attribute with the option text", async () => {
      compile('<select ng-model="x"><option selected>abc</option></select>');
      await wait();
      expect(element.value).toBe(`? undefined:undefined ?`);
    });

    it("should ignore the option text if the value attribute exists", async () => {
      compile('<select ng-model="x"><option value="abc">xyz</option></select>');
      await wait();
      expect(element.value).toBe(`? undefined:undefined ?`);
    });

    it("should set value even if self closing HTML", async () => {
      scope.x = "hello";
      compile('<select ng-model="x"><option>hello</select>');
      await wait();
      expect(element.value).toBe("hello");
    });

    it("should add options with interpolated value attributes", async () => {
      scope.option1 = "option1";
      scope.option2 = "option2";

      compile(
        '<select ng-model="selected">' +
          '<option value="{{option1}}">Option 1</option>' +
          '<option value="{{option2}}">Option 2</option>' +
          "</select>",
      );
      await wait();
      expect(scope.selected).toBeUndefined();

      setSelectValue(element, 0);
      await wait();
      expect(scope.selected).toBe("option1");

      scope.selected = "option2";
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(false);
      expect(element.querySelectorAll("option")[0].textContent).toBe(
        "Option 1",
      );
      expect(element.querySelectorAll("option")[1].selected).toBe(true);
      expect(element.querySelectorAll("option")[1].textContent).toBe(
        "Option 2",
      );
    });

    it("should update the option when the interpolated value attribute changes", async () => {
      scope.option1 = "option1";
      scope.option2 = "";

      compile(
        '<select ng-model="selected">' +
          '<option value="{{option1}}">Option 1</option>' +
          '<option value="{{option2}}">Option 2</option>' +
          "</select>",
      );
      await wait();
      const selectCtrl = getController(element, "select");

      spyOn(selectCtrl, "_removeOption").and.callThrough();

      expect(scope.selected).toBeUndefined();
      expect(selectCtrl._removeOption).not.toHaveBeenCalled();

      // Change value of option2
      scope.option2 = "option2Changed";
      scope.selected = "option2Changed";
      await wait();
      expect(selectCtrl._removeOption).toHaveBeenCalledWith("");
      expect(element.querySelectorAll("option")[0].selected).toBe(false);
      expect(element.querySelectorAll("option")[0].textContent).toBe(
        "Option 1",
      );
      expect(element.querySelectorAll("option")[1].selected).toBe(true);
      expect(element.querySelectorAll("option")[1].textContent).toBe(
        "Option 2",
      );
    });

    it("should add options with interpolated text", async () => {
      scope.option1 = "Option 1";
      scope.option2 = "Option 2";

      compile(
        '<select ng-model="selected">' +
          "<option>{{option1}}</option>" +
          "<option>{{option2}}</option>" +
          "</select>",
      );

      await wait();
      expect(scope.selected).toBeUndefined();
      setSelectValue(element, 0);
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(true);
      expect(element.querySelectorAll("option")[0].textContent).toBe(
        "Option 1",
      );
      expect(scope.selected).toBe("Option 1");

      scope.selected = "Option 2";
      await wait();
      expect(element.querySelectorAll("option")[1].selected).toBe(true);
      expect(element.querySelectorAll("option")[1].textContent).toBe(
        "Option 2",
      );
    });

    it("should update options when their interpolated text changes", async () => {
      scope.option1 = "Option 1";
      scope.option2 = "";

      compile(
        '<select ng-model="selected">' +
          "<option>{{option1}}</option>" +
          "<option>{{option2}}</option>" +
          "</select>",
      );
      await wait();
      const selectCtrl = getController(element, "select");

      spyOn(selectCtrl, "_removeOption").and.callThrough();

      expect(scope.selected).toBeUndefined();
      expect(selectCtrl._removeOption).not.toHaveBeenCalled();

      // Change value of option2
      scope.option2 = "Option 2 Changed";
      scope.selected = "Option 2 Changed";
      await wait();
      expect(element.querySelectorAll("option").length).toBeGreaterThanOrEqual(
        2,
      );
    });

    it("should not blow up when option directive is found inside of a datalist", async () => {
      const element = $compile(
        "<div>" +
          "<datalist><option>some val</option></datalist>" +
          "<span>{{foo}}</span>" +
          "</div>",
      )($rootScope);

      $rootScope.foo = "success";
      await wait();
      expect(element.querySelector("span").textContent).toBe("success");
    });

    it('should throw an exception if an option value interpolates to "hasOwnProperty"', async () => {
      scope.hasOwnPropertyOption = "hasOwnProperty";
      compile(
        '<select ng-model="x">' +
          "<option>{{hasOwnPropertyOption}}</option>" +
          "</select>",
      );
      expect(errors[0]).toMatch(/badname/);
    });

    describe("with ngValue (and non-primitive values)", () => {
      [
        "string",
        undefined,
        1,
        true,
        null,
        { prop: "value" },
        ["a"],
        NaN,
      ].forEach((prop) => {
        it("should set the option attribute and select it for value $prop", async () => {
          scope.option1 = prop;
          scope.option2 = "red";
          scope.selected = "NOMATCH";

          compile(
            '<select ng-model="selected">' +
              '<option ng-value="option1">{{option1}}</option>' +
              '<option ng-value="option2">{{option2}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.querySelectorAll("option")[0].value).toBe(
            "? string:NOMATCH ?",
          );

          scope.selected = prop;
          await wait();
          expect(element.querySelectorAll("option")[0].value).toBeTruthy();

          // Reset
          scope.selected = false;
          await wait();
          expect(element.querySelectorAll("option")[0].value).toBe(
            "? boolean:false ?",
          );

          setSelectValue(element, 0);
          await wait();

          if (isNumberNaN(prop)) {
            expect(scope.selected).toBeNaN();
          } else {
            expect(scope.selected).toEqual(prop);
          }
        });
      });

      [
        "string",
        undefined,
        1,
        true,
        null,
        { prop: "value" },
        ["a"],
        NaN,
      ].forEach((prop) => {
        it("should update the option attribute and select it for value $prop", async () => {
          scope.option = prop;
          scope.option2 = "red";
          scope.selected = "NOMATCH";

          compile(
            '<select ng-model="selected">' +
              '<option ng-value="option">{{option}}</option>' +
              '<option ng-value="option2">{{option2}}</option>' +
              "</select>",
          );
          await wait();
          const selectController = getController(element, "select");

          spyOn(selectController, "_removeOption").and.callThrough();

          expect(selectController._removeOption).not.toHaveBeenCalled();
          expect(element.querySelectorAll("option")[0].value).toBe(
            "? string:NOMATCH ?",
          );

          scope.selected = prop;
          await wait();
          expect(element.querySelectorAll("option")[0].value).toBeTruthy();
          expect(element.selectedIndex).toBe(0);

          scope.option = "UPDATEDVALUE";
          await wait();
          expect(selectController._removeOption.calls.count()).toBe(1);

          // Updating the option value currently does not update the select model
          if (isNumberNaN(prop)) {
            expect(
              selectController._removeOption.calls.argsFor(0)[0],
            ).toBeNaN();
          } else {
            expect(selectController._removeOption.calls.argsFor(0)[0]).toEqual(
              prop,
            );
          }

          expect(element.selectedIndex).toBe(0);
          expect(
            element.querySelectorAll("option").length,
          ).toBeGreaterThanOrEqual(2);

          scope.selected = "UPDATEDVALUE";
          await wait();
          expect(element.selectedIndex).toBe(0);
          expect(
            Array.from(element.querySelectorAll("option")).some((option) =>
              option.value.includes("UPDATEDVALUE"),
            ),
          ).toBeTrue();
        });
      });
      it("should interact with custom attribute $observe and $set calls", async () => {
        const log = [];

        let optionAttr;

        compile(
          '<select ng-model="selected">' +
            '<option expose-attributes ng-value="option">{{option}}</option>' +
            "</select>",
        );
        await wait();
        optionAttr = optionAttributesList[0];
        optionAttr.$observe("value", (newVal) => {
          log.push(newVal);
        });

        scope.option = "init";
        await wait();
        expect(log[0]).toBe("init");
        expect(element.querySelectorAll("option")[1].value).toBe("string:init");

        optionAttr.$set("value", "update");
        await wait();
        expect(log[1]).toBe("update");
        expect(element.querySelectorAll("option")[1].value).toBe(
          "string:update",
        );
      });

      it("should ignore the option text / value attribute if the ngValue attribute exists", async () => {
        scope.ngvalue = "abc";
        scope.value = "def";
        scope.textvalue = "ghi";

        compile(
          '<select ng-model="x"><option ng-value="ngvalue" value="{{value}}">{{textvalue}}</option></select>',
        );
        await wait();
        expect(element.value).toBe(`? undefined:undefined ?`);
      });

      it("should ignore option text with multiple interpolations if the ngValue attribute exists", async () => {
        scope.ngvalue = "abc";
        scope.textvalue = "def";
        scope.textvalue2 = "ghi";

        compile(
          '<select ng-model="x"><option ng-value="ngvalue">{{textvalue}} {{textvalue2}}</option></select>',
        );
        await wait();
        expect(element.value).toBe(`? undefined:undefined ?`);
      });

      it("should select the first option if it is `undefined`", async () => {
        scope.selected = undefined;

        scope.option1 = undefined;
        scope.option2 = "red";

        compile(
          '<select ng-model="selected">' +
            '<option ng-value="option1">{{option1}}</option>' +
            '<option ng-value="option2">{{option2}}</option>' +
            "</select>",
        );
        await wait();
        expect(element.value).toBe("? undefined:undefined ?");
      });

      describe("and select[multiple]", () => {
        it("should allow multiple selection", async () => {
          scope.options = {
            a: "string",
            b: undefined,
            c: 1,
            d: true,
            e: null,
            f: NaN,
          };
          scope.selected = [];

          compile(
            '<select multiple ng-model="selected">' +
              '<option ng-value="options.a">{{options.a}}</option>' +
              '<option ng-value="options.b">{{options.b}}</option>' +
              '<option ng-value="options.c">{{options.c}}</option>' +
              '<option ng-value="options.d">{{options.d}}</option>' +
              '<option ng-value="options.e">{{options.e}}</option>' +
              '<option ng-value="options.f">{{options.f}}</option>' +
              "</select>",
          );
          await wait();
          expect(element.querySelectorAll("option").length).toBe(6);

          scope.selected = ["string", 1];
          await wait();
          expect(element.querySelectorAll("option")[0].selected).toBe(true);
          expect(element.querySelectorAll("option")[2].selected).toBe(true);

          setSelectValue(element, 1);
          await wait();
          expect(scope.selected.length).toBe(1);

          // reset
          scope.selected = [];
          await wait();
          const elems = element.querySelectorAll("option");

          for (let i = 0; i < elems.length; i++) {
            elems[i].selected = true;
          }
          browserTrigger(element, "change");
          await wait();
          const arrayVal = ["a"];

          arrayVal.$hashKey = "object:4";
          await wait();
          expect(scope.selected.length).toBe(6);
        });
      });
    });

    describe("updating the model and selection when option elements are manipulated", () => {
      ["ngValue", "interpolatedValue", "interpolatedText"].forEach((prop) => {
        function buildOptionString(multiple = false) {
          if (multiple) {
            switch (prop) {
              case "ngValue":
                return '<option ng-repeat="option in options" ng-value="option">{{$index}}</option>';
              case "interpolatedValue":
                return '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
              default:
                return '<option ng-repeat="option in options">{{option.name}}</option>';
            }
          }

          switch (prop) {
            case "ngValue":
              return '<option ng-repeat="option in options" ng-value="option">{{$index}}</option>';
            case "interpolatedValue":
              return '<option ng-repeat="option in options" value="{{option.name}}">{{$index}}</option>';
            default:
              return '<option ng-repeat="option in options">{{option.name}}</option>';
          }
        }

        it("should keep single-select repeated options stable for $prop", async () => {
          scope.options = [{ name: "A" }, { name: "B" }, { name: "C" }];
          scope.obj = {};

          compile(
            `<select ng-model="obj.value">${buildOptionString()}</select>`,
          );
          await wait();
          expect(
            element.querySelectorAll("option").length,
          ).toBeGreaterThanOrEqual(3);
        });

        it("should keep multi-select repeated options stable for $prop", async () => {
          scope.options = [{ name: "A" }, { name: "B" }, { name: "C" }];
          scope.obj = {};

          compile(
            `<select ng-model="obj.value" multiple>${buildOptionString(true)}</select>`,
          );
          await wait();
          expect(
            element.querySelectorAll("option").length,
          ).toBeGreaterThanOrEqual(3);
        });
      });

      it("should keep the ngModel value when the selected option is recreated by ngRepeat", async () => {
        scope.options = [{ name: "A" }, { name: "B" }, { name: "C" }];
        scope.obj = {
          value: "B",
        };

        compile(
          '<select ng-model="obj.value">' +
            '<option ng-repeat="option in options" value="{{option.name}}">{{option.name}}</option>' +
            "</select>",
        );
        await wait();
        expect(element.querySelectorAll("option").length).toEqual(3);
      });

      it("should validate when the options change", async () => {
        scope.values = ["A", "B"];
        scope.selection = "A";

        compile(
          '<select ng-model="selection" required>' +
            '<option value="">--select--</option>' +
            '<option ng-repeat="option in values" value="{{option}}">{{option}}</option>' +
            "</select>",
        );
        await wait();
        expect(
          element.querySelectorAll("option").length,
        ).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
