import { Angular } from "../../angular.js";
import {
  createElementFromHTML as $,
  dealoc,
  getController,
} from "../../shared/dom.js";
import { wait } from "../../shared/test-utils.js";
import { EMAIL_REGEXP, ISO_DATE_REGEXP, URL_REGEXP } from "./input.js";

describe("input", () => {
  let $compile;
  let scope;
  let inputElm;
  let error = [];

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    error = [];
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          error.push(exception.message);
        };
      });
    window.angular
      .bootstrap(document.getElementById("app"), ["myModule"])
      .invoke((_$compile_, $rootScope) => {
        $compile = _$compile_;
        scope = $rootScope.$new();
      });
  });

  it("should bind to a model", async () => {
    inputElm = $compile(
      '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
    )(scope);

    scope.$apply("name = 'misko'");
    await wait();
    expect(inputElm.value).toBe("misko");
  });

  it('should update the model on "blur" event', async () => {
    inputElm = $compile(
      '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
    )(scope);
    await wait();
    inputElm.setAttribute("value", "adam");
    inputElm.dispatchEvent(new Event("change"));
    expect(scope.name).toEqual("adam");
  });

  it("should not add the property to the scope if name is unspecified", async () => {
    $compile('<input type="text" ng-model="name">')(scope);
    await wait();
    expect(scope.name).toBeUndefined();
  });

  it("should not set the `val` property when the value is equal to the current value", async () => {
    // This is a workaround for Firefox validation. Look at #12102.
    const input = $('<input type="text" ng-model="foo" required/>');
    let setterCalls = 0;
    scope.foo = "";
    Object.defineProperty(input, "value", {
      get() {
        return "";
      },
      set() {
        setterCalls++;
      },
    });
    $compile(input)(scope);
    await wait();
    expect(setterCalls).toBe(0);
  });

  describe("compositionevents", () => {
    it('should not update the model between "compositionstart" and "compositionend"', async () => {
      //$sniffer.android = false;

      inputElm = $compile(
        '<input type="text" ng-model="name" name="alias"" />',
      )(scope);
      await wait();
      inputElm.setAttribute("value", "a");
      inputElm.dispatchEvent(new Event("change"));
      expect(scope.name).toEqual("a");

      inputElm.dispatchEvent(new Event("compositionstart"));
      inputElm.setAttribute("value", "adam");
      expect(scope.name).toEqual("a");
      inputElm.dispatchEvent(new Event("compositionend"));
      inputElm.setAttribute("value", "adam");
      expect(scope.name).toEqual("adam");
    });
  });

  describe("interpolated names", () => {
    it("should interpolate input names", async () => {
      scope.nameID = "47";
      inputElm = $compile(
        '<form name="form"><input type="text" ng-model="name" name="name{{nameID}}" /></form>',
      )(scope);
      await wait();
      expect(scope.form.name47.$pristine).toBeTruthy();
      inputElm.querySelector("input").setAttribute("value", "caitp");
      inputElm.querySelector("input").dispatchEvent(new Event("change"));
      expect(scope.form.name47.$dirty).toBeTruthy();
    });

    it("should rename form controls in form when interpolated name changes", async () => {
      scope.nameID = "A";
      inputElm = $compile(
        '<form name="form"><input type="text" ng-model="name" name="name{{nameID}}" /></form>',
      )(scope);
      await wait();
      expect(scope.form.nameA.$name).toBe("nameA");
      const oldModel = scope.form.nameA;
      scope.nameID = "B";
      await wait();
      expect(scope.form.nameA).toBeUndefined();
      expect(scope.form.nameB).toBe(oldModel);
      expect(scope.form.nameB.$name).toBe("nameB");
    });

    it("should rename form controls in null form when interpolated name changes", async () => {
      scope.nameID = "A";
      inputElm = $compile(
        '<input type="text" ng-model="name" name="name{{nameID}}" />',
      )(scope);
      await wait();
      const model = getController(inputElm, "ngModel");
      expect(model.$name).toBe("nameA");

      scope.nameID = "B";
      await wait();
      expect(model.$name).toBe("nameB");
    });
  });

  describe('"change" event', () => {
    let assertBrowserSupportsChangeEvent;

    beforeEach(() => {
      assertBrowserSupportsChangeEvent = async function (inputEventSupported) {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" />',
        )(scope);
        await wait();
        //inputElm.val("mark");
        inputElm.setAttribute("value", "mark");
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.name).toEqual("mark");
      };
    });

    it('should update the model event if the browser does not support the "input" event', () => {
      assertBrowserSupportsChangeEvent(false);
    });

    it(
      'should update the model event if the browser supports the "input" ' +
        "event so that form auto complete works",
      () => {
        assertBrowserSupportsChangeEvent(true);
      },
    );

    describe('"keydown", "paste", "cut" and "drop" events', () => {
      it('should update the model on "paste" event if the input value changes', async () => {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
        )(scope);
        await wait();
        inputElm.dispatchEvent(new Event("keydown"));
        expect(inputElm.classList.contains("ng-pristine")).toBeTrue();

        inputElm.setAttribute("value", "mark");
        inputElm.dispatchEvent(new Event("paste"));
        expect(scope.name).toEqual("mark");
      });

      it('should update the model on "drop" event if the input value changes', async () => {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
        )(scope);
        await wait();
        inputElm.dispatchEvent(new Event("keydown"));
        expect(inputElm.classList.contains("ng-pristine")).toBeTrue();

        inputElm.setAttribute("value", "mark");
        inputElm.dispatchEvent(new Event("drop"));
        expect(scope.name).toEqual("mark");
      });

      it('should update the model on "cut" event', async () => {
        inputElm = $compile(
          '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
        )(scope);
        await wait();
        inputElm.setAttribute("value", "john");
        inputElm.dispatchEvent(new Event("cut"));
        expect(scope.name).toEqual("john");
      });

      it("should cancel the delayed dirty if a change occurs", async () => {
        inputElm = $compile('<input type="text" ng-model="name" />')(scope);
        await wait();
        const ctrl = getController(inputElm, "ngModel");

        inputElm.dispatchEvent(new Event("keydown", { target: inputElm }));
        inputElm.value = "f";
        inputElm.dispatchEvent(new Event("change"));
        expect(inputElm.classList.contains("ng-dirty")).toBeTrue();

        ctrl.$setPristine();
        await wait();

        expect(inputElm.classList.contains("ng-pristine")).toBeTrue();
      });

      describe("ngTrim", () => {
        it("should update the model and trim the value", async () => {
          inputElm = $compile(
            '<input type="text" ng-model="name" name="alias" ng-change="change()" />',
          )(scope);
          await wait();
          inputElm.setAttribute("value", "   a    ");
          inputElm.dispatchEvent(new Event("change"));
          expect(scope.name).toEqual("a");
        });

        it("should update the model and not trim the value", async () => {
          inputElm = $compile(
            '<input type="text" ng-model="name" name="alias" ng-trim="false" />',
          )(scope);
          await wait();
          inputElm.setAttribute("value", "  a  ");
          inputElm.dispatchEvent(new Event("change"));
          expect(scope.name).toEqual("  a  ");
        });
      });

      it("should allow complex reference binding", async () => {
        inputElm = $compile(
          '<input type="text" ng-model="obj[\'abc\'].name"/>',
        )(scope);
        scope.$apply("obj = { abc: { name: 'Misko'} }");
        await wait();
        expect(inputElm.value).toEqual("Misko");
      });

      it("should ignore input without ngModel directive", async () => {
        inputElm = $compile('<input type="text" name="whatever" required />')(
          scope,
        );
        await wait();
        inputElm.setAttribute("value", "");
        inputElm.dispatchEvent(new Event("change"));
        expect(inputElm.classList.contains("ng-valid")).toBe(false);
        expect(inputElm.classList.contains("ng-invalid")).toBe(false);
        expect(inputElm.classList.contains("ng-pristine")).toBe(false);
        expect(inputElm.classList.contains("ng-dirty")).toBe(false);
      });

      it("should report error on assignment error", () => {
        expect(() => {
          inputElm = $compile('<input type="text" ng-model="throw \'\'">')(
            scope,
          );
        }).toThrowError(/Syntax Error/);
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="text" ng-model="age" />')(scope);
        await wait();
        scope.$apply("age = null");
        await wait();
        expect(scope.age).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should render 0 even if it is a number", async () => {
        inputElm = $compile('<input type="text" ng-model="value" />')(scope);
        scope.$apply("value = 0");
        await wait();
        expect(inputElm.value).toBe("0");
      });

      it("should render the $viewValue when $modelValue is empty", async () => {
        inputElm = $compile('<input type="text" ng-model="value" />')(scope);
        await wait();
        const ctrl = getController(inputElm, "ngModel");

        ctrl.$modelValue = null;

        expect(ctrl.$isEmpty(ctrl.$modelValue)).toBe(true);

        ctrl.$viewValue = "abc";
        ctrl.$render();
        await wait();
        expect(inputElm.value).toBe("abc");
      });
    });

    // INPUT TYPES
    describe("month", () => {
      // IN ANGULAR.JS month types were converted to Date object. This is not standard behavior
      it("should allow a String object in format 'YYYY-MM'", async () => {
        inputElm = $compile('<input type="month" ng-model="january"/>')(scope);
        await wait();
        scope.january = "2013-01";
        await wait();
        expect(inputElm.value).toBe("2013-01");
      });

      it("should throw if the model is a Date object", async () => {
        inputElm = $compile('<input type="month" ng-model="march"/>')(scope);
        await wait();
        scope.march = new Date(2013, 2, 1);
        await wait();
        expect(error[0].match(/datefmt/)).toBeTruthy();
      });

      it("should discard invalid month input via browser normalization", async () => {
        inputElm = $compile('<input type="month" ng-model="march"/>')(scope);
        const ctrl = angular.getController(inputElm, "ngModel");
        inputElm.value = "fail";
        inputElm.dispatchEvent(new Event("input", { bubbles: true }));
        await wait();
        expect(ctrl.$viewValue).toBe("");
        expect(ctrl.$modelValue).toBeUndefined();
      });

      it("should not change the model if the input is an invalid month string", async () => {
        inputElm = $compile('<input type="month" ng-model="value"/>')(scope);

        scope.value = "2013-01";
        await wait();
        expect(inputElm.value).toBe("2013-01");

        inputElm.setAttribute("value", "stuff");
        inputElm.dispatchEvent(new Event("change"));
        expect(inputElm.value).toBe("2013-01");
        expect(scope.value).toBe("2013-01");
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="month" ng-model="test" />')(scope);

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="month" ng-model="test" />')(scope);
        await wait();
        expect(inputElm.value).toBe("");

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.value).toBe("");
      });

      it("should parse empty string to null", async () => {
        scope.test = "init";
        inputElm = $compile('<input type="month" ng-model="test" />')(scope);
        await wait();
        inputElm.setAttribute("value", "");
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should set scope to a string value", async () => {
        inputElm = $compile('<input type="month" ng-model="value" />')(scope);
        await wait();
        inputElm.setAttribute("value", "2013-07");
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.value).toBe("2013-07");
      });

      describe("min", () => {
        let inputElm;
        beforeEach(async () => {
          scope.minVal = "2013-01";
          inputElm = $compile(
            '<form name="form"><input type="month" ng-model="value" name="alias" min="{{ minVal }}" /></form>',
          )(scope);
          await wait();
        });

        it("should invalidate", () => {
          inputElm.querySelector("input").setAttribute("value", "2012-12");
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.querySelector("input").setAttribute("value", "2013-07");
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2013-07");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate if min is empty", async () => {
          scope.minVal = undefined;
          scope.value = "2014-01";
          await wait();
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;
        beforeEach(async () => {
          scope.maxVal = "2013-01";
          inputElm = $compile(
            '<form name="form"><input type="month" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          await wait();
        });

        it("should validate", () => {
          inputElm.querySelector("input").setAttribute("value", "2012-03");
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2012-03");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should invalidate", () => {
          inputElm.querySelector("input").setAttribute("value", "2013-05");
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should ignore max validation when max is undefined", async () => {
          const input = inputElm.querySelector("input");
          const ctrl = angular.getController(input, "ngModel");

          scope.maxVal = undefined;

          input.value = "2012-03";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait();

          expect(ctrl.$valid).toBeTrue();
          expect(ctrl.$error.max).toBeFalsy();
        });
      });
    });

    describe("week", () => {
      it("should throw if model is a Date object", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek"/>')(
          scope,
        );
        await wait();
        scope.secondWeek = new Date(2013, 0, 11);
        await wait();
        expect(error[0]).toMatch("datefmt");
      });

      it("should set the view if the model is a valid String object", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek"/>')(
          scope,
        );
        await wait();
        scope.secondWeek = "2013-W02";
        await wait();
        expect(inputElm.value).toBe("2013-W02");
      });

      it("should set scope to a string value", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek" />')(
          scope,
        );
        await wait();
        scope.secondWeek = "2013-W02";
        await wait();
        expect(scope.secondWeek).toBe("2013-W02");
        // input type week in Chrome does not react to changes on the attribute. Value must be set directly
        inputElm.value = "2014-W03";
        inputElm.dispatchEvent(new Event("change"));

        expect(scope.secondWeek).toBe("2014-W03");
      });

      it("should set the model undefined if the input is an invalid week string", async () => {
        inputElm = $compile('<input type="week" ng-model="secondWeek"/>')(
          scope,
        );
        await wait();
        scope.secondWeek = "2013-W02";
        await wait();
        expect(inputElm.value).toBe("2013-W02");

        // set to text for browsers with datetime-local validation.
        inputElm.value = "stuff";
        inputElm.dispatchEvent(new Event("change"));
        expect(inputElm.value).toBe("");
        expect(scope.value).toBeUndefined();
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="week" ng-model="test" />')(scope);
        await wait();
        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="week" ng-model="test" />')(scope);
        await wait();
        expect(inputElm.value).toBe("");

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.value).toBe("");
      });

      it("should parse empty string to null", async () => {
        inputElm = $compile('<input type="week" ng-model="test" />')(scope);
        await wait();
        scope.test = "2013-W02";
        await wait();
        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.test).toBeNull();
      });

      describe("min", () => {
        let inputElm;
        beforeEach(async () => {
          scope.minVal = "2013-W01";
          inputElm = $compile(
            '<form name="form"><input type="week" ng-model="value" name="alias" min="{{ minVal }}" /></from>',
          )(scope);
          await wait();
        });

        it("should invalidate", () => {
          inputElm.querySelector("input").value = "2012-W12";
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.querySelector("input").value = "2013-W03";
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2013-W03");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        // THIS WORKED WITH LEGACY DIGEST CYCLE BUT IT IS UNCLEAR IF THE CASE STILL APPLIES AS THERE IS NO MODEL CHANGE AND THUS NO TRIGGER
        // it("should revalidate when the min value changes", async () => {
        //   inputElm.querySelector("input").value = "2013-W03";
        //   inputElm.querySelector("input").dispatchEvent(new Event("change"));
        //   expect(
        //     inputElm.querySelector("input").classList.contains("ng-valid"),
        //   ).toBeTrue();
        //   expect(scope.form.alias.$error.min).toBeFalsy();

        //   scope.minVal = "2014-W01";
        //   debugger
        //   await wait();
        //   expect(
        //     inputElm.querySelector("input").classList.contains("ng-invalid"),
        //   ).toBeTrue();
        //   expect(scope.form.alias.$error.min).toBeTruthy();
        // });

        it("should ignore min constraint when min is undefined", async () => {
          const input = inputElm.querySelector("input");
          const ctrl = angular.getController(input, "ngModel");

          scope.minVal = undefined;

          input.value = "2013-W03";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait();

          expect(ctrl.$valid).toBeTrue();
          expect(ctrl.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;

        beforeEach(async () => {
          scope.maxVal = "2013-W01";
          inputElm = $compile(
            '<form name="form"><input type="week" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          await wait();
        });

        it("should validate", () => {
          inputElm.querySelector("input").value = "2012-W01";
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-valid"),
          ).toBeTrue();
          expect(scope.value).toBe("2012-W01");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should invalidate", () => {
          inputElm.querySelector("input").value = "2013-W03";
          inputElm.querySelector("input").dispatchEvent(new Event("change"));
          expect(
            inputElm.querySelector("input").classList.contains("ng-invalid"),
          ).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        // TODO
        // it("should revalidate when the max value changes", async () => {
        //   inputElm.querySelector("input").value = "2012-W03";
        //   inputElm.querySelector("input").dispatchEvent(new Event("change"));
        //   expect(
        //     inputElm.querySelector("input").classList.contains("ng-valid"),
        //   ).toBeTrue();
        //   expect(scope.form.alias.$error.max).toBeFalsy();

        //   scope.maxVal = "2012-W01";
        //   await wait();
        //   expect(
        //     inputElm.querySelector("input").classList.contains("ng-invalid"),
        //   ).toBeTrue();
        //   expect(scope.form.alias.$error.max).toBeTruthy();
        // });
        it("should ignore max constraint when max is undefined", async () => {
          const input = inputElm.querySelector("input");
          const ctrl = angular.getController(input, "ngModel");

          scope.maxVal = undefined;

          input.value = "2012-W01";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait();

          expect(ctrl.$valid).toBeTrue();
          expect(ctrl.$error.max).toBeFalsy();
        });
      });
    });

    describe("datetime-local", () => {
      it("should throw if model is a Date object", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="lunchtime"/>',
        )(scope);
        await wait();
        scope.lunchtime = new Date(2013, 11, 31, 23, 59, 59, 500);
        await wait();
        expect(error[0]).toMatch("datefmt");
      });

      it("should set the view if the model if a valid String.", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="halfSecondToNextYear"/>',
        )(scope);
        await wait();
        scope.halfSecondToNextYear = "2013-12-16T11:30";
        await wait();
        expect(inputElm.value).toBe("2013-12-16T11:30");
      });

      it("should bind to the model if a valid String.", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="halfSecondToNextYear"/>',
        )(scope);
        await wait();
        inputElm.value = "2013-12-16T11:30";
        inputElm.dispatchEvent(new Event("change"));

        expect(inputElm.value).toBe("2013-12-16T11:30");
        expect(scope.halfSecondToNextYear).toBe("2013-12-16T11:30");
      });

      it("should set the model null if the view is invalid", async () => {
        inputElm = $compile(
          '<input type="datetime-local" ng-model="breakMe"/>',
        )(scope);
        await wait();
        scope.breakMe = "2013-12-16T11:30";
        await wait();
        expect(inputElm.value).toBe("2013-12-16T11:30");

        // set to text for browsers with datetime-local validation.

        inputElm.value = "stuff";
        inputElm.dispatchEvent(new Event("change"));
        expect(inputElm.value).toBe("");
        expect(scope.breakMe).toBeNull();
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="datetime-local" ng-model="test" />')(
          scope,
        );
        await wait();
        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="datetime-local" ng-model="test" />')(
          scope,
        );
        await wait();
        expect(inputElm.value).toBe("");

        scope.$apply("test = null");
        await wait();
        expect(scope.test).toBeNull();
        expect(inputElm.value).toBe("");
      });

      it("should parse empty string to null", async () => {
        inputElm = $compile('<input type="datetime-local" ng-model="test" />')(
          scope,
        );
        await wait();
        scope.test = "2013-12-16T11:30";
        await wait();
        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      describe("min", () => {
        let inputElm;
        beforeEach(() => {
          scope.minVal = "2000-01-01T12:30:00";
          let formElm = $compile(
            `<form name="form">
              <input type="datetime-local" ng-model="value" name="alias" min="{{ minVal }}" />
            </form>`,
          )(scope);
          inputElm = formElm.querySelector("input");
        });

        it("should invalidate", () => {
          inputElm.value = "1999-12-31T01:02:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.value = "2000-01-01T23:02:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01T23:02");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        // it("should revalidate when the min value changes", async () => {
        //   inputElm.value = "2000-02-01T01:02:00";
        //   inputElm.dispatchEvent(new Event("change"));
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        //   expect(scope.form.alias.$error.min).toBeFalsy();

        //   scope.minVal = "2010-01-01T01:02:00";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
        //   expect(scope.form.alias.$error.min).toBeTruthy();
        // });

        it("should validate if min is empty", () => {
          scope.minVal = undefined;
          scope.value = "2010-01-01T01:02:00";
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;
        beforeEach(() => {
          scope.maxVal = "2019-01-01T01:02:00";
          let formElm = $compile(
            '<form name="form"><input type="datetime-local" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
        });

        it("should invalidate", () => {
          inputElm.value = "2019-12-31T01:02:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.value = "2000-01-01T01:02:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01T01:02");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        // it("should revalidate when the max value changes", () => {
        //   inputElm.value = "2000-02-01T01:02:00";
        //   inputElm.dispatchEvent(new Event("change"));
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        //   expect(scope.form.alias.$error.max).toBeFalsy();

        //   scope.maxVal = "2000-01-01T01:02:00";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
        //   expect(scope.form.alias.$error.max).toBeTruthy();
        // });

        it("should validate if max is empty", () => {
          scope.maxVal = undefined;
          scope.value = "2000-01-01T01:02:00";
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate when timezone is provided.", () => {
          inputElm = $compile(
            '<input type="datetime-local" ng-model="value" name="alias" ' +
              'max="{{ maxVal }}" ng-model-options="{timezone: \'UTC\', allowInvalid: true}"/>',
          )(scope);
          scope.maxVal = "2013-01-01T00:00:00";
          scope.value = "2012-01-01T00:00:00";
          expect(scope.form.alias.$error.max).toBeFalsy();
          expect(scope.form.alias.$valid).toBeTruthy();

          scope.value = "";
          inputElm.value = "2013-01-01T00:00:00";
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeFalsy();
          expect(scope.form.alias.$valid).toBeTruthy();
        });
      });

      // it("should validate even if max value changes on-the-fly", () => {
      //   scope.max = "2013-01-01T01:02:00";
      //   inputElm = $compile(
      //     '<input type="datetime-local" ng-model="value" name="alias" max="{{max}}" />',
      //   )(scope);

      //   inputElm.value = "2014-01-01T12:34:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.max = "2001-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.max = "2024-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if min value changes on-the-fly", () => {
      //   scope.min = "2013-01-01T01:02:00";
      //   inputElm = $compile(
      //     '<input type="datetime-local" ng-model="value" name="alias" min="{{min}}" />',
      //   )(scope);

      //   inputElm.value = "2010-01-01T12:34:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.min = "2014-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.min = "2009-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if ng-max value changes on-the-fly", () => {
      //   scope.max = "2013-01-01T01:02:00";
      //   inputElm = $compile(
      //     '<input type="datetime-local" ng-model="value" name="alias" ng-max="max" />',
      //   )(scope);

      //   inputElm.value = "2014-01-01T12:34:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.max = "2001-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.max = "2024-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if ng-min value changes on-the-fly", () => {
      //   scope.min = "2013-01-01T01:02:00";
      //   inputElm = $compile(
      //     '<input type="datetime-local" ng-model="value" name="alias" ng-min="min" />',
      //   )(scope);

      //   inputElm.value = "2010-01-01T12:34:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.min = "2014-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

      //   scope.min = "2009-01-01T01:02:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });
    });

    describe("time", () => {
      it("should throw if model is a Date object", async () => {
        inputElm = $compile('<input type="time" ng-model="lunchtime"/>')(scope);
        scope.lunchtime = new Date(1970, 0, 1, 15, 41, 0, 500);
        await wait();
        expect(error[0]).toMatch("datefmt");
      });

      it("should set the view if the model is a valid String object.", async () => {
        inputElm = $compile('<input type="time" ng-model="threeFortyOnePm"/>')(
          scope,
        );

        scope.threeFortyOnePm = "15:41:00.500";
        await wait();
        expect(inputElm.value).toBe("15:41:00.500");
      });

      it("should bind to mode if a valid String object.", () => {
        inputElm = $compile('<input type="time" ng-model="threeFortyOnePm"/>')(
          scope,
        );

        inputElm.value = "15:41:00.500";
        inputElm.dispatchEvent(new Event("change"));

        expect(inputElm.value).toBe("15:41:00.500");
        expect(scope.threeFortyOnePm).toBe("15:41:00.500");
      });

      it("should set the model to null if the view is invalid", async () => {
        inputElm = $compile('<input type="time" ng-model="breakMe"/>')(scope);

        scope.breakMe = "16:25:00.000";
        await wait();
        expect(inputElm.value).toBe("16:25:00.000");

        inputElm.value = "stuff";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.value).toBe("");
        expect(scope.breakMe).toBeNull();
      });

      it("should set blank if null", () => {
        inputElm = $compile('<input type="time" ng-model="test" />')(scope);

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should set blank when no value specified", () => {
        inputElm = $compile('<input type="time" ng-model="test" />')(scope);

        expect(inputElm.value).toBe("");

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.value).toBe("");
      });

      it("should parse empty string to null", () => {
        inputElm = $compile('<input type="time" ng-model="test" />')(scope);

        scope.test = "16:25:00";

        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      it("should allow to specify the milliseconds", () => {
        inputElm = $compile('<input type="time" ng-model="value"" />')(scope);

        inputElm.value = "01:02:03.500";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.value).toBe("01:02:03.500");
      });

      it("should allow to specify single digit milliseconds", () => {
        inputElm = $compile('<input type="time" ng-model="value"" />')(scope);

        inputElm.value = "01:02:03.4";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.value).toBe("01:02:03.4");
      });

      it("should allow to specify the seconds", async () => {
        inputElm = $compile('<input type="time" ng-model="value"" />')(scope);

        inputElm.value = "01:02:03";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.value).toBe("01:02:03");

        scope.value = "01:02:03.000";
        await wait();
        expect(inputElm.value).toBe("01:02:03.000");
      });

      describe("min", () => {
        let inputElm;
        beforeEach(() => {
          scope.minVal = "09:30:00";
          let formElm = $compile(
            '<form name="form"><input type="time" ng-model="value" name="alias" min="{{ minVal }}" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
        });

        it("should invalidate", () => {
          inputElm.value = "01:02:03";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.value = "23:02:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("23:02:00");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        // it("should revalidate when the min value changes", async () => {
        //   inputElm.value = "23:02:00";
        //   inputElm.dispatchEvent(new Event("change"));
        //   await wait();
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        //   expect(scope.form.alias.$error.min).toBeFalsy();

        //   scope.minVal = "23:55:00";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
        //   expect(scope.form.alias.$error.min).toBeTruthy();
        // });

        it("should validate if min is empty", () => {
          scope.minVal = undefined;
          scope.value = "23:55:00";
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        let inputElm;
        beforeEach(() => {
          scope.maxVal = "22:30:00";
          let formElm = $compile(
            '<form name="form"><input type="time" ng-model="value" name="alias" max="{{ maxVal }}" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
        });

        it("should invalidate", () => {
          inputElm.value = "23:00:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate", () => {
          inputElm.value = "05:30:00";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("05:30:00");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate if max is empty", () => {
          scope.maxVal = undefined;
          scope.value = "05:30:00";
          expect(scope.form.alias.$error.max).toBeFalsy();
        });
      });

      // it("should validate even if max value changes on-the-fly", async () => {
      //   scope.max = "04:02:00";
      //   inputElm = $compile(
      //     '<input type="time" ng-model="value" name="alias" max="{{max}}" />',
      //   )(scope);

      //   inputElm.value = "05:34:00";
      //   inputElm.dispatchEvent(new Event("change"));

      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      // scope.max = "06:34:00";
      // await wait();
      // expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if min value changes on-the-fly", () => {
      //   scope.min = "08:45:00";
      //   inputElm = $compile(
      //     '<input type="time" ng-model="value" name="alias" min="{{min}}" />',
      //   )(scope);

      //   inputElm.value = "06:15:00";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.min = "05:50:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if ng-max value changes on-the-fly", () => {
      //   scope.max = "04:02:00";
      //   inputElm = $compile(
      //     '<input type="time" ng-model="value" name="alias" ng-max="max" />',
      //   )(scope);

      //   inputElm.value = "05:34:00";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.max = "06:34:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if ng-min value changes on-the-fly", () => {
      //   scope.min = "08:45:00";
      //   inputElm = $compile(
      //     '<input type="time" ng-model="value" name="alias" ng-min="min" />',
      //   )(scope);

      //   inputElm.value = "06:15:00";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.min = "05:50:00";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });
    });

    describe("date", () => {
      it("should throw if model is a Date object", async () => {
        inputElm = $compile('<input type="date" ng-model="birthday"/>')(scope);
        scope.birthday = new Date("a");
        await wait();
        expect(error[0]).toMatch("datefmt");
      });

      it("should set the view when the model is an valid String", async () => {
        inputElm = $compile('<input type="date" ng-model="val"/>')(scope);

        scope.val = "1977-10-22";
        await wait();
        expect(inputElm.value).toBe("1977-10-22");
      });

      it("should bind to scope when the model is an valid String", () => {
        inputElm = $compile('<input type="date" ng-model="val"/>')(scope);

        inputElm.value = "1977-10-22";
        inputElm.dispatchEvent(new Event("change"));

        expect(scope.val).toBe("1977-10-22");
      });

      it("should set the model to null if the view is invalid", async () => {
        inputElm = $compile('<input type="date" ng-model="arrMatey"/>')(scope);

        scope.arrMatey = "2014-09-14";
        await wait();
        expect(inputElm.value).toBe("2014-09-14");

        // set to text for browsers with date validation.
        inputElm.value = "1-2-3";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.value).toBe("");
        expect(scope.arrMatey).toBeNull();
      });

      it("should render as blank if null", () => {
        inputElm = $compile('<input type="date" ng-model="test" />')(scope);

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should come up blank when no value specified", () => {
        inputElm = $compile('<input type="date" ng-model="test" />')(scope);

        expect(inputElm.value).toBe("");

        scope.$apply("test = null");

        expect(scope.test).toBeNull();
        expect(inputElm.value).toBe("");
      });

      it("should parse empty string to null", () => {
        inputElm = $compile('<input type="date" ng-model="test" />')(scope);

        scope.test = "2014-09-14";

        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.test).toBeNull();
      });

      describe("min", () => {
        it("should invalidate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" min="2000-01-01" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          inputElm.value = "1999-12-31";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();
        });

        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" min="2000-01-01" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          inputElm.value = "2000-01-01";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01");
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate if min is empty", () => {
          const formElm = $compile(
            '<form name="form"><input name="alias" ng-model="value" type="date" min >',
          )(scope);
          inputElm = formElm.querySelector("input");

          scope.value = "2000-01-01";
          expect(scope.form.alias.$error.min).toBeFalsy();
        });
      });

      describe("max", () => {
        it("should invalidate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" max="2019-01-01" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "2019-12-31";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.max).toBeTruthy();
        });

        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="date" ng-model="value" name="alias" max="2019-01-01" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "2000-01-01";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe("2000-01-01");
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should parse ISO-based date strings as a valid max date value", async () => {
          scope.max = new Date(2014, 10, 10, 0, 0, 0).toISOString();
          $compile(
            '<form name="form"><input name="myControl" type="date" max="{{ max }}" ng-model="value"></form>',
          )(scope);
          await wait();
          scope.value = "2020-01-01";
          await wait();
          expect(scope.form.myControl.$error.max).toBeTruthy();
        });

        it("should validate if max is empty", () => {
          $compile(
            '<form name="form"><input type="date" name="alias" ng-model="value" max /></form>',
          )(scope);

          scope.value = "2020-01-01";
          expect(scope.form.alias.$error.max).toBeFalsy();
        });
      });

      // it("should validate even if max value changes on-the-fly", () => {
      //   scope.max = "2013-01-01";
      //   inputElm = $compile(
      //     '<input type="date" ng-model="value" name="alias" max="{{max}}" />',
      //   )(scope);

      //   inputElm.value = "2014-01-01";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.max = "2001-01-01";
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.max = "2021-01-01";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if min value changes on-the-fly", () => {
      //   scope.min = "2013-01-01";
      //   inputElm = $compile(
      //     '<input type="date" ng-model="value" name="alias" min="{{min}}" />',
      //   )(scope);

      //   inputElm.value = "2010-01-01";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.min = "2014-01-01";
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.min = "2009-01-01";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if ng-max value changes on-the-fly", () => {
      //   scope.max = "2013-01-01";
      //   inputElm = $compile(
      //     '<input type="date" ng-model="value" name="alias" ng-max="max" />',
      //   )(scope);

      //   inputElm.value = "2014-01-01";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.max = "2001-01-01";
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.max = "2021-01-01";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      // it("should validate even if ng-min value changes on-the-fly", () => {
      //   scope.min = "2013-01-01";
      //   inputElm = $compile(
      //     '<input type="date" ng-model="value" name="alias" ng-min="min" />',
      //   )(scope);

      //   inputElm.value = "2010-01-01";
      //   inputElm.dispatchEvent(new Event("change"));
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.min = "2014-01-01";
      //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

      //   scope.min = "2009-01-01";
      //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      // });

      it("should ignore ng-max when provided as a Date object", async () => {
        scope.max = new Date(2012, 1, 1, 1, 2, 0);

        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" ng-max="max" />',
        )(scope);

        const ctrl = angular.getController(inputElm, "ngModel");

        inputElm.value = "2014-01-01";
        inputElm.dispatchEvent(new Event("input", { bubbles: true }));
        await wait();

        expect(ctrl.$valid).toBeTrue();
        expect(ctrl.$error.max).toBeFalsy();
      });

      it("should allow Date objects as valid ng-min values", async () => {
        scope.min = new Date(2013, 1, 1, 1, 2, 0);
        inputElm = $compile(
          '<input type="date" ng-model="value" name="alias" ng-min="min" />',
        )(scope);
        await wait();
        inputElm.value = "2010-01-01";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        // scope.min = new Date(2014, 1, 1, 1, 2, 0);
        // expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        // scope.min = new Date(2009, 1, 1, 1, 2, 0);
        // expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      describe("ISO_DATE_REGEXP", () => {
        [
          // Validate date
          ["00:00:00.0000+01:01", false], // date must be specified
          ["2010.06.15T00:00:00.0000+01:01", false], // date must use dash separator
          ["x2010-06-15T00:00:00.0000+01:01", false], // invalid leading characters

          // Validate year
          ["2010-06-15T00:00:00.0000+01:01", true], // year has four or more digits
          ["20100-06-15T00:00:00.0000+01:01", true], // year has four or more digits
          ["-06-15T00:00:00.0000+01:01", false], // year has too few digits
          ["2-06-15T00:00:00.0000+01:01", false], // year has too few digits
          ["20-06-15T00:00:00.0000+01:01", false], // year has too few digits
          ["201-06-15T00:00:00.0000+01:01", false], // year has too few digits

          // Validate month
          ["2010-01-15T00:00:00.0000+01:01", true], // month has two digits
          ["2010--15T00:00:00.0000+01:01", false], // month has too few digits
          ["2010-0-15T00:00:00.0000+01:01", false], // month has too few digits
          ["2010-1-15T00:00:00.0000+01:01", false], // month has too few digits
          ["2010-111-15T00:00:00.0000+01:01", false], // month has too many digits
          ["2010-22-15T00:00:00.0000+01:01", false], // month is too large

          // Validate day
          ["2010-01-01T00:00:00.0000+01:01", true], // day has two digits
          ["2010-01-T00:00:00.0000+01:01", false], // day has too few digits
          ["2010-01-1T00:00:00.0000+01:01", false], // day has too few digits
          ["2010-01-200T00:00:00.0000+01:01", false], // day has too many digits
          ["2010-01-41T00:00:00.0000+01:01", false], // day is too large

          // Validate time
          ["2010-01-01", false], // time must be specified
          ["2010-01-0101:00:00.0000+01:01", false], // missing date time separator
          ["2010-01-01V01:00:00.0000+01:01", false], // invalid date time separator
          ["2010-01-01T01-00-00.0000+01:01", false], // time must use colon separator

          // Validate hour
          ["2010-01-01T01:00:00.0000+01:01", true], // hour has two digits
          ["2010-01-01T-01:00:00.0000+01:01", false], // hour must be positive
          ["2010-01-01T:00:00.0000+01:01", false], // hour has too few digits
          ["2010-01-01T1:00:00.0000+01:01", false], // hour has too few digits
          ["2010-01-01T220:00:00.0000+01:01", false], // hour has too many digits
          ["2010-01-01T32:00:00.0000+01:01", false], // hour is too large

          // Validate minutes
          ["2010-01-01T01:00:00.0000+01:01", true], // minute has two digits
          ["2010-01-01T01:-00:00.0000+01:01", false], // minute must be positive
          ["2010-01-01T01::00.0000+01:01", false], // minute has too few digits
          ["2010-01-01T01:0:00.0000+01:01", false], // minute has too few digits
          ["2010-01-01T01:100:00.0000+01:01", false], // minute has too many digits
          ["2010-01-01T01:60:00.0000+01:01", false], // minute is too large

          // Validate seconds
          ["2010-01-01T01:00:00.0000+01:01", true], // second has two digits
          ["2010-01-01T01:00:-00.0000+01:01", false], // second must be positive
          ["2010-01-01T01:00:.0000+01:01", false], // second has too few digits
          ["2010-01-01T01:00:0.0000+01:01", false], // second has too few digits
          ["2010-01-01T01:00:100.0000+01:01", false], // second has too many digits
          ["2010-01-01T01:00:60.0000+01:01", false], // second is too large

          // Validate milliseconds
          ["2010-01-01T01:00:00+01:01", false], // millisecond must be specified
          ["2010-01-01T01:00:00.-0000+01:01", false], // millisecond must be positive
          ["2010-01-01T01:00:00:0000+01:01", false], // millisecond must use period separator
          ["2010-01-01T01:00:00.+01:01", false], // millisecond has too few digits

          // Validate timezone
          ["2010-06-15T00:00:00.0000", false], // timezone must be specified

          // Validate timezone offset
          ["2010-06-15T00:00:00.0000+01:01", true], // timezone offset can be positive hours and minutes
          ["2010-06-15T00:00:00.0000-01:01", true], // timezone offset can be negative hours and minutes
          ["2010-06-15T00:00:00.0000~01:01", false], // timezone has postive/negative indicator
          ["2010-06-15T00:00:00.000001:01", false], // timezone has postive/negative indicator
          ["2010-06-15T00:00:00.0000+00:01Z", false], // timezone invalid trailing characters
          ["2010-06-15T00:00:00.0000+00:01 ", false], // timezone invalid trailing characters

          // Validate timezone hour offset
          ["2010-06-15T00:00:00.0000+:01", false], // timezone hour offset has too few digits
          ["2010-06-15T00:00:00.0000+0:01", false], // timezone hour offset has too few digits
          ["2010-06-15T00:00:00.0000+211:01", false], // timezone hour offset too many digits
          ["2010-06-15T00:00:00.0000+31:01", false], // timezone hour offset value too large

          // Validate timezone minute offset
          ["2010-06-15T00:00:00.0000+00:-01", false], // timezone minute offset must be positive
          ["2010-06-15T00:00:00.0000+00.01", false], // timezone minute offset must use colon separator
          ["2010-06-15T00:00:00.0000+0101", false], // timezone minute offset must use colon separator
          ["2010-06-15T00:00:00.0000+010", false], // timezone minute offset must use colon separator
          ["2010-06-15T00:00:00.0000+00", false], // timezone minute offset has too few digits
          ["2010-06-15T00:00:00.0000+00:", false], // timezone minute offset has too few digits
          ["2010-06-15T00:00:00.0000+00:0", false], // timezone minute offset has too few digits
          ["2010-06-15T00:00:00.0000+00:211", false], // timezone minute offset has too many digits
          ["2010-06-15T00:00:00.0000+01010", false], // timezone minute offset has too many digits
          ["2010-06-15T00:00:00.0000+00:61", false], // timezone minute offset is too large

          // Validate timezone UTC
          ["2010-06-15T00:00:00.0000Z", true], // UTC timezone can be indicated with Z
          ["2010-06-15T00:00:00.0000K", false], // UTC timezone indicator is invalid
          ["2010-06-15T00:00:00.0000 Z", false], // UTC timezone indicator has extra space
          ["2010-06-15T00:00:00.0000ZZ", false], // UTC timezone indicator invalid trailing characters
          ["2010-06-15T00:00:00.0000Z ", false], // UTC timezone indicator invalid trailing characters
        ].forEach((item) => {
          it("should validate date: $prop", () => {
            const date = item[0];
            const valid = item[1];

            expect(ISO_DATE_REGEXP.test(date)).toBe(valid);
          });
        });
      });
    });

    describe("number", () => {
      // Helpers for min / max tests
      const subtract = function (value) {
        return value - 5;
      };

      const add = function (value) {
        return value + 5;
      };

      it("should reset the model if view is invalid", async () => {
        inputElm = $compile('<input type="number" ng-model="age"/>')(scope);

        scope.$apply("age = 123");
        await wait();
        expect(inputElm.value).toBe("123");

        inputElm.value = "123X";
        inputElm.dispatchEvent(new Event("change"));

        expect(inputElm.value).toBe("");
        expect(scope.age).toBeNull();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should render as blank if null", async () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        scope.$apply("age = null");
        await wait();
        expect(scope.age).toBeNull();
        expect(inputElm.value).toEqual("");
      });

      it("should come up blank when no value specified", async () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        expect(inputElm.value).toBe("");

        scope.$apply("age = null");
        await wait();
        expect(scope.age).toBeNull();
        expect(inputElm.value).toBe("");
      });

      it("should parse empty string to null", async () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);

        scope.$apply("age = 10");
        await wait();
        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));

        expect(scope.age).toBeNull();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should only invalidate the model if suffering from bad input when the data is parsed", async () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);
        await wait();
        expect(scope.age).toBeUndefined();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        inputElm.value = "this-will-fail-because-of-the-badInput-flag";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.age).toBeUndefined();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate number if transition from bad input to empty string", async () => {
        inputElm = $compile('<input type="number" ng-model="age" />')(scope);
        inputElm.value = "10a";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.age).toBeUndefined();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should validate with undefined viewValue when $validate() called", () => {
        inputElm = $compile(
          '<form name="form"><input type="number" name="alias" ng-model="value" /></form>',
        )(scope);

        scope.form.alias.$validate();

        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.form.alias.$error.number).toBeUndefined();
      });

      it("should throw if the model value is not a number", async () => {
        scope.value = "one";
        $compile('<input type="number" ng-model="value" />')(scope);
        await wait();
        expect(error[0]).toMatch("numfmt");
      });

      it("should parse exponential notation", () => {
        const formElm = $compile(
          '<form name="form"><input type="number" name="alias" ng-model="value" /></form>',
        )(scope);
        inputElm = formElm.querySelector("input");

        // #.###e+##
        scope.form.alias.$setViewValue("1.23214124123412412e+26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###e##
        scope.form.alias.$setViewValue("1.23214124123412412e26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###e-##
        scope.form.alias.$setViewValue("1.23214124123412412e-26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e-26);

        // ####e+##
        scope.form.alias.$setViewValue("123214124123412412e+26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####e##
        scope.form.alias.$setViewValue("123214124123412412e26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####e-##
        scope.form.alias.$setViewValue("123214124123412412e-26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e-26);

        // #.###E+##
        scope.form.alias.$setViewValue("1.23214124123412412E+26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###E##
        scope.form.alias.$setViewValue("1.23214124123412412E26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e26);

        // #.###E-##
        scope.form.alias.$setViewValue("1.23214124123412412E-26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(1.23214124123412412e-26);

        // ####E+##
        scope.form.alias.$setViewValue("123214124123412412E+26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####E##
        scope.form.alias.$setViewValue("123214124123412412E26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e26);

        // ####E-##
        scope.form.alias.$setViewValue("123214124123412412E-26");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.value).toBe(123214124123412412e-26);
      });

      it("should bind to scope if input is valid", async () => {
        inputElm = $compile('<input type="number" ng-model="age"/>')(scope);
        const ctrl = getController(inputElm, "ngModel");

        let previousParserFail = false;
        let laterParserFail = false;

        ctrl.$parsers.unshift((value) =>
          previousParserFail ? undefined : value,
        );

        ctrl.$parsers.push((value) => (laterParserFail ? undefined : value));

        inputElm.value = "123X";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.value).toBe("");

        expect(scope.age).toBeUndefined();
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(ctrl.$error.number).toBeUndefined();

        inputElm.value = "123";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.value).toBe("123");
        expect(scope.age).toBe(123);
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(ctrl.$error.number).toBeFalsy();
        expect(ctrl.$error.parse).toBe(undefined);
      });

      describe("min", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" min="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "1";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();

          inputElm.value = "100";
          inputElm.dispatchEvent(new Event("change"));

          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(100);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model-options="{allowInvalid: true}" ng-model="value" name="alias" min="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          const ngModelCtrl = getController(inputElm, "ngModel");
          ngModelCtrl.$parsers.push(subtract);

          inputElm.value = "10";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.min).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(add);

          inputElm.value = "5";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
          expect(scope.value).toBe(10);
        });

        // it("should validate even if min value changes on-the-fly", () => {
        //   scope.min = undefined;
        //   inputElm = $compile(
        //     '<input type="number" ng-model="value" name="alias" min="{{min}}" />',
        //   )(scope);
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   inputElm.value = "15";
        //   inputElm.dispatchEvent(new Event("change"));
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.min = 10;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.min = 20;
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.min = null;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.min = "20";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.min = "abc";
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        // });
      });

      describe("ngMin", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" ng-min="50" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "1";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeFalsy();
          expect(scope.form.alias.$error.min).toBeTruthy();

          inputElm.value = "100";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(100);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" ng-min="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          const ngModelCtrl = getController(inputElm, "ngModel");
          ngModelCtrl.$parsers.push(subtract);

          inputElm.value = "10";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.min).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(add);

          inputElm.value = "5";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.min).toBeTruthy();
          expect(scope.value).toBe(undefined);
        });

        // it("should validate even if the ngMin value changes on-the-fly", () => {
        //   scope.min = undefined;
        //   inputElm = $compile(
        //     '<input type="number" ng-model="value" name="alias" ng-min="min" />',
        //   )(scope);
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   inputElm.value = "15";
        //   inputElm.dispatchEvent(new Event("change"));
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.min = 10;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.min = 20;
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.min = null;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.min = "20";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.min = "abc";
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        // });
      });

      describe("max", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" max="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "20";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();

          inputElm.value = "0";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number"' +
              'ng-model-options="{allowInvalid: true}" ng-model="value" name="alias" max="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          const ngModelCtrl = getController(inputElm, "ngModel");
          ngModelCtrl.$parsers.push(add);

          inputElm.value = "10";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(15);
          expect(scope.form.alias.$error.max).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(subtract);

          inputElm.value = "15";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
          expect(scope.value).toBe(10);
        });

        // it("should validate even if max value changes on-the-fly", () => {
        //   scope.max = undefined;
        //   inputElm = $compile(
        //     '<input type="number" ng-model="value" name="alias" max="{{max}}" />',
        //   )(scope);
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   inputElm.value = "5";
        //   inputElm.dispatchEvent(new Event("change"));
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.max = 10;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.max = 0;
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.max = null;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.max = "4";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.max = "abc";
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        // });
      });

      describe("ngMax", () => {
        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" ng-max="5" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "20";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.value).toBeUndefined();
          expect(scope.form.alias.$error.max).toBeTruthy();

          inputElm.value = "0";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate against the viewValue", () => {
          const formElm = $compile(
            '<form name="form"><input type="number"' +
              'ng-model-options="{allowInvalid: true}" ng-model="value" name="alias" ng-max="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          const ngModelCtrl = getController(inputElm, "ngModel");
          ngModelCtrl.$parsers.push(add);

          inputElm.value = "10";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(15);
          expect(scope.form.alias.$error.max).toBeFalsy();

          ngModelCtrl.$parsers.pop();
          ngModelCtrl.$parsers.push(subtract);

          inputElm.value = "15";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.max).toBeTruthy();
          expect(scope.value).toBe(10);
        });

        // it("should validate even if the ngMax value changes on-the-fly", () => {
        //   scope.max = undefined;
        //   inputElm = $compile(
        //     '<input type="number" ng-model="value" name="alias" ng-max="max" />',
        //   )(scope);
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   inputElm.value = "5";
        //   inputElm.dispatchEvent(new Event("change"));
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.max = 10;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.max = 0;
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.max = null;
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        //   scope.max = "4";
        //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

        //   scope.max = "abc";
        //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        // });
      });

      Object.entries({
        step: 'step="{{step}}"',
        ngStep: 'ng-step="step"',
      }).forEach(([attrName, attrHtml]) => {
        describe(attrName, () => {
          it("should validate", async () => {
            scope.step = 10;
            scope.value = 20;
            const formElm = $compile(
              `<form name="form"><input type="number" ng-model="value" name="alias" ${attrHtml} /></form>`,
            )(scope);
            inputElm = formElm.querySelector("input");
            await wait();
            expect(inputElm.value).toBe("20");
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(20);
            expect(scope.form.alias.$error.step).toBeFalsy();

            inputElm.value = "18";
            inputElm.dispatchEvent(new Event("change"));
            expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            expect(inputElm.value).toBe("18");
            expect(scope.value).toBeUndefined();
            expect(scope.form.alias.$error.step).toBeTruthy();

            inputElm.value = "10";
            inputElm.dispatchEvent(new Event("change"));
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(inputElm.value).toBe("10");
            expect(scope.value).toBe(10);
            expect(scope.form.alias.$error.step).toBeFalsy();

            scope.$apply("value = 12");
            await wait();
            expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            expect(inputElm.value).toBe("12");
            expect(scope.value).toBe(12);
            expect(scope.form.alias.$error.step).toBeTruthy();
          });

          // it("should validate even if the step value changes on-the-fly", () => {
          //   scope.step = 10;
          //   const formElm = $compile(
          //     `<form name="form"><input type="number" ng-model="value" name="alias" ${attrHtml} /></form>`,
          //   )(scope);
          //   inputElm = formElm.querySelector("input");
          //   inputElm.value = "10";
          //   inputElm.dispatchEvent(new Event("change"));
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(10);

          //   // Step changes, but value matches
          //   scope.$apply("step = 5");
          //   expect(inputElm.value).toBe("10");
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(10);
          //   expect(scope.form.alias.$error.step).toBeFalsy();

          //   // Step changes, value does not match
          //   scope.$apply("step = 6");
          //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          //   expect(scope.value).toBeUndefined();
          //   expect(inputElm.value).toBe("10");
          //   expect(scope.form.alias.$error.step).toBeTruthy();

          //   // null = valid
          //   scope.$apply("step = null");
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(10);
          //   expect(inputElm.value).toBe("10");
          //   expect(scope.form.alias.$error.step).toBeFalsy();

          //   // Step val as string
          //   scope.$apply('step = "7"');
          //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          //   expect(scope.value).toBeUndefined();
          //   expect(inputElm.value).toBe("10");
          //   expect(scope.form.alias.$error.step).toBeTruthy();

          //   // unparsable string is ignored
          //   scope.$apply('step = "abc"');
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(10);
          //   expect(inputElm.value).toBe("10");
          //   expect(scope.form.alias.$error.step).toBeFalsy();
          // });

          it('should use the correct "step base" when `[min]` is specified', async () => {
            scope.min = 5;
            scope.step = 10;
            scope.value = 10;
            inputElm = $compile(
              `<input type="number" ng-model="value" min="{{min}}" ${attrHtml} />`,
            )(scope);
            const ngModel = getController(inputElm, "ngModel");
            await wait();
            expect(inputElm.value).toBe("10");
            expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            expect(ngModel.$error.step).toBe(true);
            expect(scope.value).toBe(10); // an initially invalid value should not be changed

            inputElm.value = "15";
            inputElm.dispatchEvent(new Event("change"));
            await wait();
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(15);
            // TODO
            // scope.$apply("step = 3");
            // await wait();
            // expect(inputElm.value).toBe("15");
            // expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            // expect(ngModel.$error.step).toBe(true);
            // expect(scope.value).toBeUndefined();

            // inputElm.value = "8";
            // inputElm.dispatchEvent(new Event("change"));
            // await wait();
            // expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            // expect(scope.value).toBe(8);

            // scope.$apply("min = 10; step = 20");
            // inputElm.value = "30";
            // inputElm.dispatchEvent(new Event("change"));
            // await wait();
            // expect(inputElm.value).toBe("30");
            // expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            // expect(scope.value).toBe(30);

            // scope.$apply("min = 5");
            // await wait();
            // expect(inputElm.value).toBe("30");
            // expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            // expect(ngModel.$error.step).toBe(true);
            // expect(scope.value).toBeUndefined();

            // scope.$apply("step = 0.00000001");
            // await wait();
            // expect(inputElm.value).toBe("30");
            // expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            // expect(scope.value).toBe(30);

            // // 0.3 - 0.2 === 0.09999999999999998
            // scope.$apply("min = 0.2; step = (0.3 - 0.2)");
            // inputElm.value = "0.3";
            // inputElm.dispatchEvent(new Event("change"));
            // await wait();
            // expect(inputElm.value).toBe("0.3");
            // expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            // expect(ngModel.$error.step).toBe(true);
            // expect(scope.value).toBeUndefined();
          });

          // it("should correctly validate even in cases where the JS floating point arithmetic fails", async () => {
          //   scope.step = 0.1;
          //   inputElm = $compile(
          //     `<input type="number" ng-model="value" ${attrHtml} />`,
          //   )(scope);
          //   await wait();
          //   const ngModel = getController(inputElm, "ngModel");

          //   expect(inputElm.value).toBe("");
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBeUndefined();

          //   inputElm.value = "0.3";
          //   inputElm.dispatchEvent(new Event("change"));
          //   await wait();
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(0.3);

          //   inputElm.value = "2.9999999999999996";
          //   inputElm.dispatchEvent(new Event("change"));
          //   await wait();
          //   expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          //   expect(ngModel.$error.step).toBe(true);
          //   expect(scope.value).toBeUndefined();

          //   // 0.5 % 0.1 === 0.09999999999999998
          //   inputElm.value = "0.5";
          //   inputElm.dispatchEvent(new Event("change"));
          //   await wait();
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(0.5);

          //   // // 3.5 % 0.1 === 0.09999999999999981
          //   inputElm.value = "3.5";
          //   inputElm.dispatchEvent(new Event("change"));
          //   await wait();
          //   expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   expect(scope.value).toBe(3.5);

          //   // // 1.16 % 0.01 === 0.009999999999999896
          //   // // 1.16 * 100  === 115.99999999999999
          //   // scope.step = 0.01;
          //   // inputElm.value = "1.16";
          //   // inputElm.dispatchEvent(new Event("change"));
          //   // await wait();
          //   // expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          //   // expect(scope.value).toBe(1.16);
          // });
        });
      });

      describe("required", () => {
        it("should be valid even if value is 0", () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" required /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "0";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.required).toBeFalsy();
        });

        it("should be valid even if value 0 is set from model", async () => {
          const formElm = $compile(
            '<form name="form"><input type="number" ng-model="value" name="alias" required /></form>',
          )(scope);
          await wait();
          inputElm = formElm.querySelector("input");
          scope.$apply("value = 0");
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("0");
          expect(scope.form.alias.$error.required).toBeFalsy();
        });

        it("should register required on non boolean elements", async () => {
          const formElm = $compile(
            '<form name="form"><div ng-model="value" name="alias" required></form>',
          )(scope);
          inputElm = formElm.querySelector("div");

          scope.$apply("value = ''");
          await wait();
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.alias.$error.required).toBeTruthy();
        });

        it("should not invalidate number if ng-required=false and viewValue has not been committed", () => {
          inputElm = $compile(
            '<input type="number" ng-model="value" name="alias" ng-required="required">',
          )(scope);

          scope.$apply("required = false");

          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        });
      });

      describe("ngRequired", () => {
        describe("when the ngRequired expression initially evaluates to true", () => {
          it("should be valid even if value is 0", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="true" /></form>',
            )(scope);
            inputElm = formElm.querySelector("input");

            inputElm.value = "0";
            inputElm.dispatchEvent(new Event("change"));
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(0);
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should be valid even if value 0 is set from model", async () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="true" /></form>',
            )(scope);
            inputElm = formElm.querySelector("input");

            scope.$apply("value = 0");
            await wait();
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(inputElm.value).toBe("0");
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should register required on non boolean elements", async () => {
            const formElm = $compile(
              '<form name="form"><div ng-model="value" name="numberInput" ng-required="true"></form>',
            )(scope);
            inputElm = formElm.querySelector("div");

            scope.$apply("value = ''");
            await wait();
            expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            expect(scope.form.numberInput.$error.required).toBeTruthy();
          });

          it("should change from invalid to valid when the value is empty and the ngRequired expression changes to false", async () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="ngRequiredExpr" /></form>',
            )(scope);
            inputElm = formElm.querySelector("input");

            scope.$apply("ngRequiredExpr = true");
            await wait();
            expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeTruthy();

            scope.$apply("ngRequiredExpr = false");
            await wait();
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });
        });

        describe("when the ngRequired expression initially evaluates to false", () => {
          it("should be valid even if value is empty", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="false" /></form>',
            )(scope);
            inputElm = formElm.querySelector("input");

            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeFalsy();
            expect(scope.form.numberInput.$error.number).toBeFalsy();
          });

          it("should be valid if value is non-empty", () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="false" /></form>',
            )(scope);
            inputElm = formElm.querySelector("input");

            inputElm.value = "42";
            inputElm.dispatchEvent(new Event("change"));
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBe(42);
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should not register required on non boolean elements", async () => {
            const formElm = $compile(
              '<form name="form"><div ng-model="value" name="numberInput" ng-required="false"><form>',
            )(scope);
            inputElm = formElm.querySelector("div");

            scope.$apply("value = ''");
            await wait();
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.form.numberInput.$error.required).toBeFalsy();
          });

          it("should change from valid to invalid when the value is empty and the ngRequired expression changes to true", async () => {
            const formElm = $compile(
              '<form name="form"><input type="number" ng-model="value" name="numberInput" ng-required="ngRequiredExpr" /><form>',
            )(scope);
            inputElm = formElm.querySelector("input");

            scope.$apply("ngRequiredExpr = false");
            await wait();
            expect(inputElm.classList.contains("ng-valid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeFalsy();

            scope.$apply("ngRequiredExpr = true");
            await wait();
            expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
            expect(scope.value).toBeUndefined();
            expect(scope.form.numberInput.$error.required).toBeTruthy();
          });
        });
      });

      describe("minlength", () => {
        it("should invalidate values that are shorter than the given minlength", () => {
          inputElm = $compile(
            '<input type="number" ng-model="value" ng-minlength="3" />',
          )(scope);

          inputElm.value = "12";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

          inputElm.value = "123";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        });

        it("should observe the standard minlength attribute and register it as a validator on the model", async () => {
          const formElm = $compile(
            '<form name="form"><input type="number" name="input" ng-model="value" minlength="{{ min }}" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          scope.min = 10;
          await wait();
          inputElm.value = "12345";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.input.$error.minlength).toBe(true);

          scope.min = 5;
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.input.$error.minlength).not.toBe(true);
        });
      });

      describe("maxlength", () => {
        it("should invalidate values that are longer than the given maxlength", () => {
          inputElm = $compile(
            '<input type="number" ng-model="value" ng-maxlength="5" />',
          )(scope);

          inputElm.value = "12345678";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();

          inputElm.value = "123";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        });

        it("should observe the standard maxlength attribute and register it as a validator on the model", async () => {
          const formElm = $compile(
            '<form name="form"><input type="number" name="input" ng-model="value" maxlength="{{ max }}" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          scope.max = 1;
          await wait();
          inputElm.value = "12345";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
          expect(scope.form.input.$error.maxlength).toBe(true);

          scope.max = 6;
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.form.input.$error.maxlength).not.toBe(true);
        });
      });
    });

    describe("range", () => {
      const rangeTestEl = '<input type="range">';
      const supportsRange = rangeTestEl.type === "range";

      it("should render as 50 if null", async () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);
        inputElm.value = "25";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.age).toBe(25);

        scope.$apply("age = null");
        await wait();
        expect(inputElm.value).toEqual("50");
      });

      it("should set model to 50 when no value specified and default min/max", async () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);
        await wait();
        expect(inputElm.value).toBe("50");

        scope.$apply("age = null");
        await wait();
        expect(scope.age).toBe(50);
      });

      it("should parse non-number values to 50 when default min/max", async () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        scope.$apply("age = 10");
        await wait();
        expect(inputElm.value).toBe("10");

        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.age).toBe(50);
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should parse the input value to a Number", () => {
        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        inputElm.value = "75";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.age).toBe(75);
      });

      it("should only invalidate the model if suffering from bad input when the data is parsed", () => {
        scope.age = 60;

        inputElm = $compile('<input type="range" ng-model="age" />')(scope);

        expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        inputElm.value = "this-will-fail-because-of-the-badInput-flag";
        inputElm.dispatchEvent(new Event("change"));

        expect(scope.age).toBe(50);
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
      });

      it("should throw if the model value is not a number", async () => {
        scope.value = "one";
        inputElm = $compile('<input type="range" ng-model="value" />')(scope);
        await wait();
        expect(error[0]).toMatch("numfmt");
      });

      describe("min", () => {
        it("should initialize correctly with non-default model and min value", async () => {
          scope.value = -3;
          scope.min = -5;
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" min="{{min}}" /></form>',
          )(scope);
          await wait();
          inputElm = formElm.querySelector("input");
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("-3");
          expect(scope.value).toBe(-3);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        // Browsers that implement range will never allow you to set the value < min values
        it("should adjust invalid input values", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" min="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "5";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.min).toBeFalsy();

          inputElm.value = "100";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(100);
          expect(scope.form.alias.$error.min).toBeFalsy();
        });

        it("should set the model to the min val if it is less than the min val", async () => {
          scope.value = -10;
          // Default min is 0
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" min="{{min}}" />',
          )(scope);
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("0");
          expect(scope.value).toBe(0);

          scope.$apply("value = 5; min = 10");
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("10");
          expect(scope.value).toBe(10);
        });

        it("should adjust the element and model value when the min value changes on-the-fly", async () => {
          scope.min = 10;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" min="{{min}}" />',
          )(scope);
          inputElm.value = "15";
          inputElm.dispatchEvent(new Event("change"));
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();

          scope.min = 20;
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.value).toBe("20");

          scope.min = null;
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.value).toBe("20");

          scope.min = "15";
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.value).toBe("20");

          scope.min = "abc";
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(20);
          expect(inputElm.value).toBe("20");
        });
      });

      describe("max", () => {
        // Browsers that implement range will never allow you to set the value > max value
        it("should initialize correctly with non-default model and max value", async () => {
          scope.value = 130;
          scope.max = 150;
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" max="{{max}}" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("130");
          expect(scope.value).toBe(130);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should validate", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" max="10" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "20";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.max).toBeFalsy();

          inputElm.value = "0";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(scope.form.alias.$error.max).toBeFalsy();
        });

        it("should set the model to the max val if it is greater than the max val", async () => {
          scope.value = 110;
          // Default max is 100
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" />',
          )(scope);
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("100");
          expect(scope.value).toBe(100);

          scope.$apply("value = 90; max = 10");
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(inputElm.value).toBe("10");
          expect(scope.value).toBe(10);
        });

        it("should adjust the element and model value if the max value changes on-the-fly", async () => {
          scope.max = 10;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" />',
          )(scope);
          await wait();
          inputElm.value = "5";
          inputElm.dispatchEvent(new Event("change"));
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();

          scope.max = 0;
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.value).toBe("0");

          scope.max = null;
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.value).toBe("0");

          scope.max = "4";
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.value).toBe("0");

          scope.max = "abc";
          await wait();
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(0);
          expect(inputElm.value).toBe("0");
        });
      });

      describe("min and max", () => {
        it("should set the correct initial value when min and max are specified", async () => {
          scope.max = 80;
          scope.min = 40;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" min="{{min}}" />',
          )(scope);
          await wait();
          expect(inputElm.value).toBe("60");
          expect(scope.value).toBe(60);
        });

        it("should set element and model value to min if max is less than min", async () => {
          scope.min = 40;
          inputElm = $compile(
            '<input type="range" ng-model="value" name="alias" max="{{max}}" min="{{min}}" />',
          )(scope);
          await wait();
          expect(inputElm.value).toBe("70");
          expect(scope.value).toBe(70);

          scope.max = 20;
          await wait();
          expect(inputElm.value).toBe("40");
          expect(scope.value).toBe(40);
        });
      });

      describe("step", () => {
        // Browsers that implement range will never allow you to set a value that doesn't match the step value
        // However, currently only Firefox fully implements the spec when setting the value after the step value changes.
        // Other browsers fail in various edge cases, which is why they are not tested here.

        it("should round the input value to the nearest step on user input", () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" step="5" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          inputElm.value = "5";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm.value = "10";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm.value = "9";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm.value = "7";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          inputElm.value = "7.5";
          inputElm.dispatchEvent(new Event("change"));
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();
        });

        it("should round the input value to the nearest step when setting the model", async () => {
          const formElm = $compile(
            '<form name="form"><input type="range" ng-model="value" name="alias" step="5" /></form>',
          )(scope);
          inputElm = formElm.querySelector("input");

          scope.$apply("value = 10");
          await wait();
          expect(inputElm.value).toBe("10");
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 5");
          await wait();
          expect(inputElm.value).toBe("5");
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 7.5");
          await wait();
          expect(inputElm.value).toBe("10");
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 7");
          await wait();
          expect(inputElm.value).toBe("5");
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(5);
          expect(scope.form.alias.$error.step).toBeFalsy();

          scope.$apply("value = 9");
          await wait();
          expect(inputElm.value).toBe("10");
          expect(inputElm.classList.contains("ng-valid")).toBeTrue();
          expect(scope.value).toBe(10);
          expect(scope.form.alias.$error.step).toBeFalsy();
        });
      });
    });

    describe("email", () => {
      it("should validate e-mail", () => {
        const formElm = $compile(
          '<form name="form">' +
            '<input type="email" ng-model="email" name="alias" />' +
            "</form>",
        )(scope);
        inputElm = formElm.querySelector("input");

        const widget = scope.form.alias;
        inputElm.value = "vojta@google.com";
        inputElm.dispatchEvent(new Event("change"));

        expect(scope.email).toBe("vojta@google.com");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(widget.$error.email).toBeFalsy();

        inputElm.value = "invalid@";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.email).toBeUndefined();
        expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
        expect(widget.$error.email).toBeTruthy();
      });

      describe("EMAIL_REGEXP", () => {
        it("should validate email", () => {
          /* basic functionality */
          expect(EMAIL_REGEXP.test("a@b.com")).toBe(true);
          expect(EMAIL_REGEXP.test("a@b.museum")).toBe(true);
          expect(EMAIL_REGEXP.test("a@B.c")).toBe(true);
          /* domain label separation, hyphen-minus, syntax */
          expect(EMAIL_REGEXP.test("a@b.c.")).toBe(false);
          expect(EMAIL_REGEXP.test("a@.b.c")).toBe(false);
          expect(EMAIL_REGEXP.test("a@-b.c")).toBe(false);
          expect(EMAIL_REGEXP.test("a@b-.c")).toBe(false);
          expect(EMAIL_REGEXP.test("a@b-c")).toBe(true);
          expect(EMAIL_REGEXP.test("a@-")).toBe(false);
          expect(EMAIL_REGEXP.test("a@.")).toBe(false);
          expect(EMAIL_REGEXP.test("a@host_name")).toBe(false);
          /* leading or sole digit */
          expect(EMAIL_REGEXP.test("a@3b.c")).toBe(true);
          expect(EMAIL_REGEXP.test("a@3")).toBe(true);
          /* TLD eMail address */
          expect(EMAIL_REGEXP.test("a@b")).toBe(true);
          /* domain valid characters */
          expect(
            EMAIL_REGEXP.test(
              "a@abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ.0123456789",
            ),
          ).toBe(true);
          /* domain invalid characters */
          expect(EMAIL_REGEXP.test("a@")).toBe(false);
          expect(EMAIL_REGEXP.test("a@ ")).toBe(false);
          expect(EMAIL_REGEXP.test("a@!")).toBe(false);
          expect(EMAIL_REGEXP.test('a@"')).toBe(false);
          expect(EMAIL_REGEXP.test("a@#")).toBe(false);
          expect(EMAIL_REGEXP.test("a@$")).toBe(false);
          expect(EMAIL_REGEXP.test("a@%")).toBe(false);
          expect(EMAIL_REGEXP.test("a@&")).toBe(false);
          expect(EMAIL_REGEXP.test("a@'")).toBe(false);
          expect(EMAIL_REGEXP.test("a@(")).toBe(false);
          expect(EMAIL_REGEXP.test("a@)")).toBe(false);
          expect(EMAIL_REGEXP.test("a@*")).toBe(false);
          expect(EMAIL_REGEXP.test("a@+")).toBe(false);
          expect(EMAIL_REGEXP.test("a@,")).toBe(false);
          expect(EMAIL_REGEXP.test("a@/")).toBe(false);
          expect(EMAIL_REGEXP.test("a@:")).toBe(false);
          expect(EMAIL_REGEXP.test("a@;")).toBe(false);
          expect(EMAIL_REGEXP.test("a@<")).toBe(false);
          expect(EMAIL_REGEXP.test("a@=")).toBe(false);
          expect(EMAIL_REGEXP.test("a@>")).toBe(false);
          expect(EMAIL_REGEXP.test("a@?")).toBe(false);
          expect(EMAIL_REGEXP.test("a@@")).toBe(false);
          expect(EMAIL_REGEXP.test("a@[")).toBe(false);
          expect(EMAIL_REGEXP.test("a@\\")).toBe(false);
          expect(EMAIL_REGEXP.test("a@]")).toBe(false);
          expect(EMAIL_REGEXP.test("a@^")).toBe(false);
          expect(EMAIL_REGEXP.test("a@_")).toBe(false);
          expect(EMAIL_REGEXP.test("a@`")).toBe(false);
          expect(EMAIL_REGEXP.test("a@{")).toBe(false);
          expect(EMAIL_REGEXP.test("a@|")).toBe(false);
          expect(EMAIL_REGEXP.test("a@}")).toBe(false);
          expect(EMAIL_REGEXP.test("a@~")).toBe(false);
          expect(EMAIL_REGEXP.test("a@İ")).toBe(false);
          expect(EMAIL_REGEXP.test("a@ı")).toBe(false);
          /* domain length, label and total */
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            ),
          ).toBe(false);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.x",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "a@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xx",
            ),
          ).toBe(false);
          expect(
            EMAIL_REGEXP.test(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xx",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa@xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxx",
            ),
          ).toBe(false);

          /* local-part valid characters and dot-atom syntax */
          expect(EMAIL_REGEXP.test("'@x")).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "-!#$%&*+/0123456789=?ABCDEFGHIJKLMNOPQRSTUVWXYZ@x",
            ),
          ).toBe(true);
          expect(EMAIL_REGEXP.test("^_`abcdefghijklmnopqrstuvwxyz{|}~@x")).toBe(
            true,
          );
          expect(EMAIL_REGEXP.test(".@x")).toBe(false);
          expect(EMAIL_REGEXP.test("'.@x")).toBe(false);
          expect(EMAIL_REGEXP.test(".'@x")).toBe(false);
          expect(EMAIL_REGEXP.test("'.'@x")).toBe(true);
          /* local-part invalid characters */
          expect(EMAIL_REGEXP.test("@x")).toBe(false);
          expect(EMAIL_REGEXP.test(" @x")).toBe(false);
          expect(EMAIL_REGEXP.test('"@x')).toBe(false);
          expect(EMAIL_REGEXP.test("(@x")).toBe(false);
          expect(EMAIL_REGEXP.test(")@x")).toBe(false);
          expect(EMAIL_REGEXP.test(",@x")).toBe(false);
          expect(EMAIL_REGEXP.test(":@x")).toBe(false);
          expect(EMAIL_REGEXP.test(";@x")).toBe(false);
          expect(EMAIL_REGEXP.test("<@x")).toBe(false);
          expect(EMAIL_REGEXP.test(">@x")).toBe(false);
          expect(EMAIL_REGEXP.test("@@x")).toBe(false);
          expect(EMAIL_REGEXP.test("[@x")).toBe(false);
          expect(EMAIL_REGEXP.test("\\@x")).toBe(false);
          expect(EMAIL_REGEXP.test("]@x")).toBe(false);
          expect(EMAIL_REGEXP.test("İ@x")).toBe(false);
          expect(EMAIL_REGEXP.test("ı@x")).toBe(false);
          /* local-part size limit */
          expect(
            EMAIL_REGEXP.test(
              "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@x",
            ),
          ).toBe(true);
          expect(
            EMAIL_REGEXP.test(
              "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@x",
            ),
          ).toBe(false);
          /* content (local-part + ‘@’ + domain) is required */
          expect(EMAIL_REGEXP.test("")).toBe(false);
          expect(EMAIL_REGEXP.test("a")).toBe(false);
          expect(EMAIL_REGEXP.test("aa")).toBe(false);
        });
      });
    });

    describe("url", () => {
      it("should validate url", () => {
        const formElm = $compile(
          '<form name="form">' +
            '<input type="url" ng-model="url" name="alias" />',
          +"</form>",
        )(scope);
        inputElm = formElm.querySelector("input");

        const widget = scope.form.alias;

        inputElm.value = "http://www.something.com";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.url).toBe("http://www.something.com");
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(widget.$error.url).toBeFalsy();

        inputElm.value = "invalid.com";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.url).toBeUndefined();
        expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
        expect(widget.$error.url).toBeTruthy();
      });

      describe("URL_REGEXP", () => {
        // See valid URLs in RFC3987 (http://tools.ietf.org/html/rfc3987)
        // Note: We are being more lenient, because browsers are too.
        const urls = [
          ["scheme://hostname", true],
          [
            "scheme://username:password@host.name:7678/pa/t.h?q=u&e=r&y#fragment",
            true,
          ],

          // Validating `scheme`
          ["://example.com", false],
          ["0scheme://example.com", false],
          [".scheme://example.com", false],
          ["+scheme://example.com", false],
          ["-scheme://example.com", false],
          ["_scheme://example.com", false],
          ["scheme0://example.com", true],
          ["scheme.://example.com", true],
          ["scheme+://example.com", true],
          ["scheme-://example.com", true],
          ["scheme_://example.com", false],

          // Validating `:` and `/` after `scheme`
          ["scheme//example.com", false],
          ["scheme:example.com", true],
          ["scheme:/example.com", true],
          ["scheme:///example.com", true],

          // Validating `username` and `password`
          ["scheme://@example.com", true],
          ["scheme://username@example.com", true],
          ["scheme://u0s.e+r-n_a~m!e@example.com", true],
          ["scheme://u#s$e%r^n&a*m;e@example.com", true],
          ["scheme://:password@example.com", true],
          ["scheme://username:password@example.com", true],
          ["scheme://username:pass:word@example.com", true],
          ["scheme://username:p0a.s+s-w_o~r!d@example.com", true],
          ["scheme://username:p#a$s%s^w&o*r;d@example.com", true],

          // Validating `hostname`
          ["scheme:", false], // Chrome, FF: true
          ["scheme://", false], // Chrome, FF: true
          ["scheme:// example.com:", false], // Chrome, FF: true
          ["scheme://example com:", false], // Chrome, FF: true
          ["scheme://:", false], // Chrome, FF: true
          ["scheme://?", false], // Chrome, FF: true
          ["scheme://#", false], // Chrome, FF: true
          ["scheme://username:password@:", false], // Chrome, FF: true
          ["scheme://username:password@/", false], // Chrome, FF: true
          ["scheme://username:password@?", false], // Chrome, FF: true
          ["scheme://username:password@#", false], // Chrome, FF: true
          ["scheme://host.name", true],
          ["scheme://123.456.789.10", true],
          ["scheme://[1234:0000:0000:5678:9abc:0000:0000:def]", true],
          ["scheme://[1234:0000:0000:5678:9abc:0000:0000:def]:7678", true],
          ["scheme://[1234:0:0:5678:9abc:0:0:def]", true],
          ["scheme://[1234::5678:9abc::def]", true],
          ["scheme://~`!@$%^&*-_=+|\\;'\",.()[]{}<>", true],

          // Validating `port`
          ["scheme://example.com/no-port", true],
          ["scheme://example.com:7678", true],
          ["scheme://example.com:76T8", false], // Chrome, FF: true
          ["scheme://example.com:port", false], // Chrome, FF: true

          // Validating `path`
          ["scheme://example.com/", true],
          ["scheme://example.com/path", true],
          ["scheme://example.com/path/~`!@$%^&*-_=+|\\;:'\",./()[]{}<>", true],

          // Validating `query`
          ["scheme://example.com?query", true],
          ["scheme://example.com/?query", true],
          ["scheme://example.com/path?query", true],
          ["scheme://example.com/path?~`!@$%^&*-_=+|\\;:'\",.?/()[]{}<>", true],

          // Validating `fragment`
          ["scheme://example.com#fragment", true],
          ["scheme://example.com/#fragment", true],
          ["scheme://example.com/path#fragment", true],
          ["scheme://example.com/path/#fragment", true],
          ["scheme://example.com/path?query#fragment", true],
          [
            "scheme://example.com/path?query#~`!@#$%^&*-_=+|\\;:'\",.?/()[]{}<>",
            true,
          ],

          // Validating miscellaneous
          ["scheme://☺.✪.⌘.➡/䨹", true],
          ["scheme://مثال.إختبار", true],
          ["scheme://例子.测试", true],
          ["scheme://उदाहरण.परीक्षा", true],

          // Legacy tests
          ["http://server:123/path", true],
          ["https://server:123/path", true],
          ["file:///home/user", true],
          ["mailto:user@example.com?subject=Foo", true],
          ["r2-d2.c3-p0://localhost/foo", true],
          ["abc:/foo", true],
          ["http://example.com/path;path", true],
          ["http://example.com/[]$'()*,~)", true],
          ["http:", false], // FF: true
          ["a@B.c", false],
          ["a_B.c", false],
          ["0scheme://example.com", false],
          ["http://example.com:9999/``", true],
        ].forEach((item) => {
          it("should validate url: $prop", () => {
            const url = item[0];
            const valid = item[1];

            expect(URL_REGEXP.test(url)).toBe(valid);
          });
        });
      });
    });

    describe("radio", () => {
      ["click", "change"].forEach((event) => {
        it("should update the model on $prop event", async () => {
          let res = $compile(
            '<div><input type="radio" ng-model="color" value="white" />' +
              '<input type="radio" ng-model="color" value="red" />' +
              '<input type="radio" ng-model="color" value="blue" /></div>',
          )(scope);
          await wait();
          inputElm = res.querySelectorAll("input");

          scope.$apply("color = 'white'");
          await wait();
          expect(inputElm[0].checked).toBe(true);
          expect(inputElm[1].checked).toBe(false);
          expect(inputElm[2].checked).toBe(false);

          scope.$apply("color = 'red'");
          await wait();
          expect(inputElm[0].checked).toBe(false);
          expect(inputElm[1].checked).toBe(true);
          expect(inputElm[2].checked).toBe(false);

          if (event === "change") inputElm[2].checked = true;
          if (event === "click") inputElm[2].click();
          inputElm[2].dispatchEvent(new Event("change"));
          await wait();
          expect(scope.color).toBe("blue");
        });
      });

      it("should treat the value as a string when evaluating checked-ness", async () => {
        inputElm = $compile(
          '<input type="radio" ng-model="model" value="0" />',
        )(scope);

        scope.$apply("model = '0'");
        await wait();
        expect(inputElm.checked).toBe(true);

        scope.$apply("model = 0");
        await wait();
        expect(inputElm.checked).toBe(false);
      });

      it("should allow {{expr}} as value", async () => {
        scope.some = 11;
        let res = $compile(
          '<div><input type="radio" ng-model="value" value="{{some}}" />' +
            '<input type="radio" ng-model="value" value="{{other}}" /></div>',
        )(scope);
        inputElm = res.querySelectorAll("input");
        await wait();
        scope.value = "blue";
        scope.some = "blue";
        scope.other = "red";
        await wait();
        expect(inputElm[0].checked).toBe(true);
        expect(inputElm[1].checked).toBe(false);

        inputElm[1].click();
        inputElm[1].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.value).toBe("red");

        scope.$apply("other = 'non-red'");
        await wait();
        expect(inputElm[0].checked).toBe(false);
        expect(inputElm[1].checked).toBe(false);
      });

      it("should allow the use of ngTrim", async () => {
        scope.some = 11;
        let res = $compile(
          '<div><input type="radio" ng-model="value" value="opt1" />' +
            '<input type="radio" ng-model="value" value="  opt2  " />' +
            '<input type="radio" ng-model="value" ng-trim="false" value="  opt3  " />' +
            '<input type="radio" ng-model="value" ng-trim="false" value="{{some}}" />' +
            '<input type="radio" ng-model="value" ng-trim="false" value="  {{some}}  " /></div>',
        )(scope);
        inputElm = res.querySelectorAll("input");
        scope.value = "blue";
        scope.some = "blue";
        await wait();
        expect(inputElm[0].checked).toBe(false);
        expect(inputElm[1].checked).toBe(false);
        expect(inputElm[2].checked).toBe(false);
        expect(inputElm[3].checked).toBe(true);
        expect(inputElm[4].checked).toBe(false);

        inputElm[1].click();
        inputElm[1].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.value).toBe("opt2");
        inputElm[2].click();
        inputElm[2].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.value).toBe("  opt3  ");
        inputElm[3].click();
        inputElm[3].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.value).toBe("blue");
        inputElm[4].click();
        inputElm[4].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.value).toBe("  blue  ");

        scope.$apply("value = '  opt2  '");
        await wait();
        expect(inputElm[1].checked).toBe(false);
        scope.$apply("value = 'opt2'");
        await wait();
        expect(inputElm[1].checked).toBe(true);
        scope.$apply("value = '  opt3  '");
        await wait();
        expect(inputElm[2].checked).toBe(true);
        scope.$apply("value = 'opt3'");
        await wait();
        expect(inputElm[2].checked).toBe(false);

        scope.$apply("value = 'blue'");
        await wait();
        expect(inputElm[3].checked).toBe(true);
        expect(inputElm[4].checked).toBe(false);
        scope.$apply("value = '  blue  '");
        await wait();
        expect(inputElm[3].checked).toBe(false);
        expect(inputElm[4].checked).toBe(true);
      });
    });

    describe("checkbox", () => {
      it("should ignore checkbox without ngModel directive", async () => {
        inputElm = $compile(
          '<input type="checkbox" name="whatever" required />',
        )(scope);

        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.classList.contains("ng-valid")).toBe(false);
        expect(inputElm.classList.contains("ng-invalid")).toBe(false);
        expect(inputElm.classList.contains("ng-pristine")).toBe(false);
        expect(inputElm.classList.contains("ng-dirty")).toBe(false);
      });

      ["click", "change"].forEach((event) => {
        it("should update the model on $prop event", async () => {
          inputElm = $compile('<input type="checkbox" ng-model="checkbox" />')(
            scope,
          );

          expect(inputElm.checked).toBe(false);

          scope.$apply("checkbox = true");
          await wait();
          expect(inputElm.checked).toBe(true);

          scope.$apply("checkbox = false");
          await wait();
          expect(inputElm.checked).toBe(false);

          if (event === "change") inputElm.checked = true;
          if (event === "click") inputElm.click();
          inputElm.dispatchEvent(new Event("change"));
          await wait();
          expect(scope.checkbox).toBe(true);
        });
      });

      it("should format booleans", async () => {
        inputElm = $compile('<input type="checkbox" ng-model="name" />')(scope);

        scope.$apply("name = false");
        await wait();
        expect(inputElm.checked).toBe(false);

        scope.$apply("name = true");
        await wait();
        expect(inputElm.checked).toBe(true);
      });

      it('should support type="checkbox" with non-standard capitalization', async () => {
        inputElm = $compile('<input type="checkBox" ng-model="checkbox" />')(
          scope,
        );
        await wait();
        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.checkbox).toBe(true);

        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.checkbox).toBe(false);
      });

      it("should allow custom enumeration", async () => {
        inputElm = $compile(
          '<input type="checkbox" ng-model="name" ng-true-value="\'y\'" ' +
            "ng-false-value=\"'n'\">",
        )(scope);

        scope.$apply("name = 'y'");
        await wait();
        expect(inputElm.checked).toBe(true);

        scope.$apply("name = 'n'");
        await wait();
        expect(inputElm.checked).toBe(false);

        scope.$apply("name = 'something else'");
        await wait();
        expect(inputElm.checked).toBe(false);

        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.name).toEqual("y");

        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.name).toEqual("n");
      });

      it("should throw if ngTrueValue is present and not a constant expression", async () => {
        inputElm = $compile(
          '<input type="checkbox" ng-model="value" ng-true-value="yes" />',
        )(scope);
        await wait();
        expect(error[0]).toMatch("constexpr");
      });

      it("should throw if ngFalseValue is present and not a constant expression", async () => {
        inputElm = $compile(
          '<input type="checkbox" ng-model="value" ng-false-value="no" />',
        )(scope);
        await wait();
        expect(error[0]).toMatch("constexpr");
      });

      it("should not throw if ngTrueValue or ngFalseValue are not present", async () => {
        inputElm = $compile('<input type="checkbox" ng-model="value" />')(
          scope,
        );
        await wait();
        expect(error.length).toBe(0);
      });

      it("should be required if false", async () => {
        inputElm = $compile(
          '<input type="checkbox" ng-model="value" required />',
        )(scope);

        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.checked).toBe(true);
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();

        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.checked).toBe(false);
        expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
      });

      it('should pass validation for "required" when trueValue is a string', async () => {
        const formElm = $compile(
          '<form name="form">' +
            '<input type="checkbox" required name="cb" ng-model="value" ng-true-value="\'yes\'" />' +
            "</form>",
        )(scope);
        inputElm = formElm.querySelector("input");
        await wait();
        expect(inputElm.classList.contains("ng-invalid")).toBeTrue();
        expect(scope.form.cb.$error.required).toBe(true);

        inputElm.click();
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(inputElm.checked).toBe(true);
        expect(inputElm.classList.contains("ng-valid")).toBeTrue();
        expect(scope.form.cb.$error.required).toBeUndefined();
      });
    });

    describe("textarea", () => {
      it("should process textarea", async () => {
        inputElm = $compile('<textarea ng-model="name"></textarea>')(scope);

        scope.$apply("name = 'Adam'");
        await wait();
        expect(inputElm.value).toEqual("Adam");

        inputElm.value = "Shyam";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.name).toEqual("Shyam");

        inputElm.value = "Kai";
        inputElm.dispatchEvent(new Event("change"));
        await wait();
        expect(scope.name).toEqual("Kai");
      });

      it("should ignore textarea without ngModel directive", () => {
        inputElm = $compile('<textarea name="whatever" required></textarea>')(
          scope,
        );

        inputElm.value = "";
        inputElm.dispatchEvent(new Event("change"));
        expect(inputElm.classList.contains("ng-valid")).toBe(false);
        expect(inputElm.classList.contains("ng-invalid")).toBe(false);
        expect(inputElm.classList.contains("ng-pristine")).toBe(false);
        expect(inputElm.classList.contains("ng-dirty")).toBe(false);
      });
    });

    describe("ngValue", () => {
      it('should update the dom "value" property and attribute', async () => {
        inputElm = $compile('<input type="submit" ng-value="value">')(scope);

        scope.$apply("value = 'something'");
        await wait();
        expect(inputElm.value).toBe("something");
        expect(inputElm.getAttribute("value")).toBe("something");
      });

      it('should clear the "dom" value property and attribute when the value is undefined', async () => {
        inputElm = $compile('<input type="text" ng-value="value">')(scope);

        scope.$apply('value = "something"');
        await wait();
        expect(inputElm.value).toBe("something");
        expect(inputElm.getAttribute("value")).toBe("something");
        delete scope.value;
        await wait();
        expect(inputElm.value).toBe("");
        // Support: IE 9-11, Edge
        // In IE it is not possible to remove the `value` attribute from an input element.
        expect(inputElm.getAttribute("value")).toBeNull();
        // } else {
        //   // Support: IE 9-11, Edge
        //   // This will fail if the Edge bug gets fixed
        //   expect(inputElm.getAttribute("value")).toBe("something");
        // }
      });

      // they(
      //   'should update the $prop "value" property and attribute after the bound expression changes',
      //   {
      //     input: '<input type="text" ng-value="value">',
      //     textarea: '<textarea ng-value="value"></textarea>',
      //   },
      //   (tmpl) => {
      //     const element = $compile(tmpl)(scope);

      //     helper.changeInputValueTo("newValue");
      //     expect(element.value).toBe("newValue");
      //     expect(element.getAttribute("value")).toBeNull();

      //     scope.$apply(() => {
      //       scope.value = "anotherValue";
      //     });
      //     expect(element.value).toBe("anotherValue");
      //     expect(element.getAttribute("value")).toBe("anotherValue");
      //   },
      // );

      it("should evaluate and set constant expressions", async () => {
        let res = $compile(
          '<div><input type="radio" ng-model="selected" ng-value="true">' +
            '<input type="radio" ng-model="selected" ng-value="false">' +
            '<input type="radio" ng-model="selected" ng-value="1"></div>',
        )(scope);
        inputElm = res.querySelectorAll("input");
        inputElm[0].click();
        inputElm[0].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.selected).toBe(true);

        inputElm[1].click();
        inputElm[1].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.selected).toBe(false);

        inputElm[2].click();
        inputElm[2].dispatchEvent(new Event("change"));
        await wait();
        expect(scope.selected).toBe(1);
      });

      it("should use strict comparison between model and value", async () => {
        scope.selected = false;
        const res = $compile(
          '<div><input type="radio" ng-model="selected" ng-value="false">' +
            '<input type="radio" ng-model="selected" ng-value="\'\'">' +
            '<input type="radio" ng-model="selected" ng-value="0"></div>',
        )(scope);
        inputElm = res.querySelectorAll("input");
        await wait();
        expect(inputElm[0].checked).toBe(true);
        expect(inputElm[1].checked).toBe(false);
        expect(inputElm[2].checked).toBe(false);
      });

      it("should watch the expression", async () => {
        inputElm = $compile(
          '<input type="radio" ng-model="selected" ng-value="value">',
        )(scope);
        expect(inputElm.checked).toBe(false);
        await wait();
        scope.value = { some: "object" };
        scope.selected = scope.value;
        await wait();
        expect(inputElm.checked).toBe(true);

        // inputElm = $compile(
        //   '<input type="radio" ng-model="selected" ng-value="value">',
        // )(scope);
        // expect(inputElm.checked).toBe(false);
        // await wait();

        // inputElm.click();
        // inputElm.dispatchEvent(new Event("change"));
        // await wait();
        // expect(scope.selected).toEqual(scope.value);
      });

      it("should work inside ngRepeat", async () => {
        inputElm = $compile(
          '<div><input type="radio" ng-repeat="i in items" ng-model="selected" ng-value="i.id"></div>',
        )(scope);

        scope.items = [{ id: 1 }, { id: 2 }];
        scope.selected = 1;
        await wait();

        expect(inputElm.children[0].checked).toBe(true);
        expect(inputElm.children[1].checked).toBe(false);
        // TODO INVESIGATE
        // inputElm.children[1].click();
        // inputElm.children[1].dispatchEvent(new Event("change"));
        // await wait(100);
        // expect(scope.selected).toBe(2);
      });
    });

    describe("password", () => {
      // Under no circumstances should input[type=password] trim inputs
      it("should not trim if ngTrim is unspecified", () => {
        inputElm = $compile('<input type="password" ng-model="password">')(
          scope,
        );

        inputElm.value = " - - untrimmed - - ";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.password.length).toBe(" - - untrimmed - - ".length);
      });

      it("should not trim if ngTrim !== false", () => {
        inputElm = $compile(
          '<input type="password" ng-model="password" ng-trim="true">',
        )(scope);
        inputElm.value = " - - untrimmed - - ";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.password.length).toBe(" - - untrimmed - - ".length);
      });

      it("should not trim if ngTrim === false", () => {
        inputElm = $compile(
          '<input type="password" ng-model="password" ng-trim="false">',
        )(scope);
        inputElm.value = " - - untrimmed - - ";
        inputElm.dispatchEvent(new Event("change"));
        expect(scope.password.length).toBe(" - - untrimmed - - ".length);
      });
    });
  });
});
