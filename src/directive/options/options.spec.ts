// @ts-nocheck
/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { dealoc, getController } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import {
  isBoolean,
  hashKey,
  equals,
  isString,
  isFunction,
} from "../../shared/utils.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";

describe("ngOptions", () => {
  let scope;

  let formElement;

  let element;

  let $compile;

  let linkLog;

  let childListMutationObserver;

  let childListMutationRecords;

  let ngModelCtrl;

  let injector;

  let errors = [];

  async function compile(html) {
    element.innerHTML = `<form name="form">${html}</form>`;
    formElement = $compile(element)(scope);
    element = formElement.querySelector("select");
    ngModelCtrl = getController(element, "ngModel");
    await wait();
  }

  async function bootstrapSelect() {
    const initialScopeValues = { ...(scope.$target ?? scope) };

    injector = window.angular.bootstrap(element, ["myModule"]);
    scope = injector.get("$rootScope");
    Object.assign(scope, initialScopeValues);
    element = element.querySelector("select");
    ngModelCtrl = getController(element, "ngModel");
    await wait();
  }

  function setSelectValue(selectElement, optionIndex) {
    const option = selectElement.querySelectorAll("option")[optionIndex];

    selectElement.value = option.value;
    browserTrigger(element, "change");
  }

  beforeEach(() => {
    jasmine.addMatchers({
      toEqualSelectValue() {
        return {
          compare(_actual_, value, multiple) {
            const errors = [];

            let actual = _actual_.value;

            if (multiple) {
              value = value.map((val) => hashKey(val));
              actual = Array.from(_actual_.selectedOptions ?? []).map(
                (option) => option.value,
              );
            } else {
              value = hashKey(value);
            }

            if (!equals(actual, value)) {
              errors.push(
                `Expected select value "${actual}" to equal "${value}"`,
              );
            }
            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualOption() {
        return {
          compare(actual, value, text, label) {
            const errors = [];

            const hash = hashKey(value);

            if (actual.getAttribute("value") !== hash) {
              errors.push(
                `Expected option value "${actual.getAttribute("value")}" to equal "${hash}"`,
              );
            }

            if (text && actual.textContent !== text) {
              errors.push(
                `Expected option text "${actual.textContent}" to equal "${text}"`,
              );
            }

            if (label && actual.getAttribute("label") !== label) {
              errors.push(
                `Expected option label "${actual.getAttribute("label")}" to equal "${label}"`,
              );
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualTrackedOption() {
        return {
          compare(actual, value, text, label) {
            const errors = [];

            if (actual.getAttribute("value") !== `${value}`) {
              errors.push(
                `Expected option value "${actual.getAttribute("value")}" to equal "${value}"`,
              );
            }

            if (text && actual.textContent !== text) {
              errors.push(
                `Expected option text "${actual.textContent}" to equal "${text}"`,
              );
            }

            if (label && actual.getAttribute("label") !== label) {
              errors.push(
                `Expected option label "${actual.getAttribute("label")}" to equal "${label}"`,
              );
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualUnknownOption() {
        return {
          compare(actual) {
            const errors = [];

            if (actual.getAttribute("value") !== "?") {
              errors.push(
                `Expected option value "${actual.getAttribute("value")}" to equal "?"`,
              );
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
      toEqualUnknownValue() {
        return {
          compare(actual, value) {
            const errors = [];

            if (actual !== "?") {
              errors.push(`Expected select value "${actual}" to equal "?"`);
            }

            const message = function () {
              return errors.join("\n");
            };

            return { pass: errors.length === 0, message };
          },
        };
      },
    });
  });

  beforeEach(() => {
    errors = [];
    element = document.getElementById("app");
    element.innerHTML = "test";
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("myModule", ["ng"])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          console.error(exception.message);
          errors.push(exception.message);
        };
      });
    injector = createInjector([
      "myModule",
      ($compileProvider, $provide) => {
        linkLog = [];

        $compileProvider
          .directive("customSelect", () => ({
            restrict: "E",
            replace: true,
            scope: {
              ngModel: "=",
              options: "=",
            },
            templateUrl: "select_template.html",
            link(scope) {
              scope.selectable_options = scope.options;
            },
          }))

          .directive("oCompileContents", () => ({
            link(scope, element) {
              linkLog.push("linkCompileContents");
              $compile(element.childNodes)(scope);
            },
          }))

          .directive("observeChildList", () => ({
            link(scope, element) {
              const config = { childList: true };

              childListMutationRecords = [];
              childListMutationObserver = new window.MutationObserver(
                (records) => {
                  childListMutationRecords.push(...records);
                },
              );
              childListMutationObserver.observe(element, config);
            },
          }));

        $provide.decorator("ngOptionsDirective", ($delegate) => {
          const origPreLink = $delegate[0].link.pre;

          const origPostLink = $delegate[0].link.post;

          $delegate[0].compile = function () {
            return {
              pre: origPreLink,
              post() {
                linkLog.push("linkNgOptions");
                origPostLink.apply(this, arguments);
              },
            };
          };

          return $delegate;
        });
      },
    ]);
    $compile = injector.get("$compile");
    scope = injector.get("$rootScope").$new(); // create a child scope because the root scope can't be $destroy-ed
  });

  afterEach(() => {
    // scope.$destroy(); // disables unknown option work during destruction
    // dealoc(formElement);
    // ngModelCtrl = null;
  });

  async function createSelect(attrs, blank, unknown) {
    let html = "<select";

    Object.entries(attrs).forEach(([key, value]) => {
      if (isBoolean(value)) {
        if (value) html += ` ${key}`;
      } else {
        html += ` ${key}="${value}"`;
      }
    });
    html += `>${
      blank ? (isString(blank) ? blank : '<option value="">blank</option>') : ""
    }${
      unknown
        ? isString(unknown)
          ? unknown
          : '<option value="?">unknown</option>'
        : ""
    }</select>`;
    await compile(html);
  }

  async function createSingleSelect(blank, unknown) {
    await createSelect(
      {
        "ng-model": "selected",
        "ng-options": "value.name for value in values",
      },
      blank,
      unknown,
    );
  }

  async function createMultiSelect(blank, unknown) {
    await createSelect(
      {
        "ng-model": "selected",
        multiple: true,
        "ng-options": "value.name for value in values",
      },
      blank,
      unknown,
    );
  }

  it('should throw when not formated "? for ? in ?"', async () => {
    await compile(
      '<select ng-model="selected" ng-options="i dont parse"></select>',
    );
    await wait();
    await wait();
    expect(errors[0]).toMatch("iexp");
  });

  it("should have a dependency on ngModel", async () => {
    try {
      await compile('<select ng-options="item in items"></select>');
      await wait();
    } catch (error) {
      await wait();
      expect(error.message).toMatch("ngModel");
    }
  });

  it("should render a list", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value.name for value in values"></select>',
    );
    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    scope.selected = scope.values[1];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(3);
    await wait();
    expect(options[0]).toEqualOption(scope.values[0], "A");
    await wait();
    expect(options[1]).toEqualOption(scope.values[1], "B");
    await wait();
    expect(options[2]).toEqualOption(scope.values[2], "C");
    await wait();
    expect(options[1].selected).toEqual(true);
  });

  it("should not include properties with non-numeric keys in array-like collections when using array syntax", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value for value in values"></select>',
    );
    scope.values = { 0: "X", 1: "Y", 2: "Z", a: "A", length: 3 };
    await wait();
    scope.selected = scope.values[1];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(3);
    await wait();
    expect(options[0]).toEqualOption("X");
    await wait();
    expect(options[1]).toEqualOption("Y");
    await wait();
    expect(options[2]).toEqualOption("Z");
  });

  it("should include properties with non-numeric keys in array-like collections when using object syntax", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value for (key, value) in values"></select>',
    );
    scope.values = { 0: "X", 1: "Y", 2: "Z", a: "A", length: 3 };
    scope.selected = scope.values[1];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(5);
    await wait();
    expect(options[0]).toEqualOption("X");
    await wait();
    expect(options[1]).toEqualOption("Y");
    await wait();
    expect(options[2]).toEqualOption("Z");
    await wait();
    expect(options[3]).toEqualOption("A");
    await wait();
    expect(options[4]).toEqualOption(3);
  });

  it("should render an object", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value as key for (key, value) in object"></select>',
    );
    scope.object = { red: "FF0000", green: "00FF00", blue: "0000FF" };
    scope.selected = scope.object.green;
    await wait();

    await wait();

    let options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(3);
    await wait();
    expect(options[0]).toEqualOption("FF0000", "red");
    await wait();
    expect(options[1]).toEqualOption("00FF00", "green");
    await wait();
    expect(options[2]).toEqualOption("0000FF", "blue");
    await wait();
    expect(options[1].selected).toEqual(true);
    scope.object.azur = "8888FF";
    await wait();
    await wait();
    options = element.querySelectorAll("option");
    await wait();
    expect(options[1].selected).toEqual(true);
    await wait();
    scope.selected = scope.object.azur;
    await wait();
    await wait();
    options = element.querySelectorAll("option");
    await wait();
    expect(options[3].selected).toEqual(true);
  });

  it('should set the "selected" attribute and property on selected options', async () => {
    await compile(
      '<select ng-model="selected" ng-options="option.id as option.display for option in values"></select>',
    );
    scope.values = [
      {
        id: "FF0000",
        display: "red",
      },
      {
        id: "0000FF",
        display: "blue",
      },
    ];
    scope.selected = "FF0000";
    await wait();

    await wait();

    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(2);
    await wait();
    expect(options[0]).toEqualOption("FF0000", "red");
    await wait();
    expect(options[1]).toEqualOption("0000FF", "blue");

    await wait();

    expect(options[0].getAttribute("selected")).toBe("selected");
    await wait();
    expect(options[0].getAttribute("selected")).toBe("selected");
    await wait();
    expect(options[0].selected).toBe(true);
    await wait();
    expect(options[0].selected).toBe(true);

    scope.selected = "0000FF";
    await wait();
    await wait();
    expect(options[1].getAttribute("selected")).toBe("selected");
    await wait();
    expect(options[1].getAttribute("selected")).toBe("selected");
    await wait();
    expect(options[1].selected).toBe(true);
    await wait();
    expect(options[1].selected).toBe(true);
  });

  it("should render zero as a valid display value", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value.name for value in values"></select>',
    );

    scope.values = [{ name: 0 }, { name: 1 }, { name: 2 }];
    await wait();

    scope.selected = scope.values[0];
    await wait();

    await wait();

    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(3);
    await wait();
    expect(options[0]).toEqualOption(scope.values[0], "0");
    await wait();
    expect(options[1]).toEqualOption(scope.values[1], "1");
    await wait();
    expect(options[2]).toEqualOption(scope.values[2], "2");
  });

  it("should not be set when an option is selected and options are set asynchronously", async () => {
    await compile(
      '<select ng-model="model" ng-options="opt.id as opt.label for opt in options"></select>',
    );
    await wait();
    scope.model = 0;
    scope.options = [
      { id: 0, label: "x" },
      { id: 1, label: "y" },
    ];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(2);
    await wait();
    expect(options[0]).toEqualOption(0, "x");
    await wait();
    expect(options[1]).toEqualOption(1, "y");
  });

  it("should grow list", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value.name for value in values"></select>',
    );
    await wait();
    scope.values = [];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(1); // because we add special unknown option
    await wait();
    expect(element.querySelectorAll("option")[0]).toEqualUnknownOption();

    scope.values.push({ name: "A" });
    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(1);
    await wait();
    expect(element.querySelectorAll("option")[0]).toEqualOption(
      scope.values[0],
      "A",
    );

    scope.values.push({ name: "B" });
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(2);
    await wait();
    expect(element.querySelectorAll("option")[0]).toEqualOption(
      scope.values[0],
      "A",
    );
    await wait();
    expect(element.querySelectorAll("option")[1]).toEqualOption(
      scope.values[1],
      "B",
    );
  });

  it("should shrink list", async () => {
    await compile(
      '<select ng-model="selected" ng-options="value.name for value in values"></select>',
    );
    await wait();
    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(3);

    scope.values.pop();
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(2);
    await wait();
    expect(element.querySelectorAll("option")[0]).toEqualOption(
      scope.values[0],
      "A",
    );
    await wait();
    expect(element.querySelectorAll("option")[1]).toEqualOption(
      scope.values[1],
      "B",
    );
    scope.values.pop();
    await wait();

    await wait();

    expect(element.querySelectorAll("option").length).toEqual(1);
    await wait();
    expect(element.querySelectorAll("option")[0]).toEqualOption(
      scope.values[0],
      "A",
    );

    scope.values.pop();
    scope.selected = null;
    await wait();

    await wait();

    expect(element.querySelectorAll("option").length).toEqual(1); // we add back the special empty option
  });

  it("should shrink and then grow list", async () => {
    element.innerHTML =
      '<select ng-model="selected" ng-options="value.name for value in values"></select>';
    await bootstrapSelect();
    await wait();
    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    await wait();
    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(3);

    scope.values = [{ name: "1" }, { name: "2" }];
    await wait();
    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(2);

    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    await wait();
    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(3);
  });

  it("should update list", async () => {
    element.innerHTML =
      '<select ng-model="selected" ng-options="value.name for value in values"></select>';
    await bootstrapSelect();

    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    await wait();
    scope.selected = scope.values[0];
    await wait();
    scope.values = [{ name: "B" }, { name: "C" }, { name: "D" }];
    await wait();
    scope.selected = scope.values[0];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(3);
    await wait();
    expect(options[0]).toEqualOption(scope.values[0], "B");
    await wait();
    expect(options[1]).toEqualOption(scope.values[1], "C");
    await wait();
    expect(options[2]).toEqualOption(scope.values[2], "D");
  });

  it("should preserve pre-existing empty option", async () => {
    element.innerHTML =
      '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
    await bootstrapSelect();
    await wait();
    scope.values = [];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(1);
    scope.values = [{ name: "A" }];
    await wait();
    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(2);
    await wait();
    expect(element.querySelectorAll("option")[0].textContent).toEqual("blank");
    await wait();
    expect(element.querySelectorAll("option")[1].textContent).toEqual("A");

    scope.values = [];
    await wait();
    scope.selected = null;
    await wait();
    await wait();
    expect(element.querySelectorAll("option").length).toEqual(1);
    await wait();
    expect(element.querySelectorAll("option")[0].textContent).toEqual("blank");
  });

  it("should ignore $ and $$ properties", async () => {
    element.innerHTML =
      '<select ng-model="selected" ng-options="key as value for (key, value) in object"></select>';
    await bootstrapSelect();

    scope.object = {
      regularProperty: "visible",
      $$private: "invisible",
      $property: "invisible",
    };
    scope.selected = "regularProperty";
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(1);
    await wait();
    expect(options[0]).toEqualOption("regularProperty", "visible");
  });

  it("should not watch non-numeric array properties", async () => {
    element.innerHTML = $compile(
      '<select ng-model="selected" ng-options="value as createLabel(value) for value in array"></select>',
    )(scope);
    scope.createLabel = jasmine
      .createSpy("createLabel")
      .and.callFake((value) => value);
    scope.array = ["a", "b", "c"];
    scope.array.$$private = "do not watch";
    scope.array.$property = "do not watch";
    scope.array.other = "do not watch";
    scope.array.fn = function () {};
    scope.selected = "b";
    await wait();
    await wait();
    expect(scope.createLabel).toHaveBeenCalledWith("a");
    await wait();
    expect(scope.createLabel).toHaveBeenCalledWith("b");
    await wait();
    expect(scope.createLabel).toHaveBeenCalledWith("c");
    await wait();
    expect(scope.createLabel).not.toHaveBeenCalledWith("do not watch");
    await wait();
    expect(scope.createLabel).not.toHaveBeenCalledWith(jasmine.any(Function));
  });

  it("should not watch object properties that start with $ or $$", async () => {
    element.innerHTML = $compile(
      '<select ng-model="selected" ng-options="key as createLabel(key) for (key, value) in object"></select>',
    )(scope);
    scope.createLabel = jasmine
      .createSpy("createLabel")
      .and.callFake((value) => value);
    scope.object = {
      regularProperty: "visible",
      $$private: "invisible",
      $property: "invisible",
    };
    scope.selected = "regularProperty";
    await wait();
    await wait();
    expect(scope.createLabel).toHaveBeenCalledWith("regularProperty");
    await wait();
    expect(scope.createLabel).not.toHaveBeenCalledWith("$$private");
    await wait();
    expect(scope.createLabel).not.toHaveBeenCalledWith("$property");
  });

  it("should allow expressions over multiple lines", async () => {
    scope.isNotFoo = function (item) {
      return item.name !== "Foo";
    };
    scope.values = [
      { id: 1, name: "Foo" },
      { id: 2, name: "Bar" },
      { id: 3, name: "Baz" },
    ];
    await compile(
      `<select
        ng-model="selected"
        ng-options="key.id
          for key in values | filter:isNotFoo"></select>`,
    );

    scope.selected = scope.values[0];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options.length).toEqual(3);
    await wait();
    expect(options[1]).toEqualOption(scope.values[1], "2");
    await wait();
    expect(options[2]).toEqualOption(scope.values[2], "3");
  });

  it("should not update selected property of an option element on digest with no change event", async () => {
    // ng-options="value.name for value in values"
    // ng-model="selected"
    await compile(
      '<select ng-model="selected" ng-options="value.name for value in values"></select>',
    );
    await wait();
    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    scope.selected = scope.values[0];
    await wait();
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(scope.selected).toEqual(jasmine.objectContaining({ name: "A" }));
    await wait();
    expect(options[0].selected).toBe(true);
    await wait();
    expect(options[1].selected).toBe(false);

    const optionToSelect = options[1];

    await wait();
    await wait();
    expect(optionToSelect.textContent).toBe("B");

    optionToSelect.selected = true;
    await wait();
    await wait();
    expect(optionToSelect.selected).toBe(true);
    await wait();
    expect(scope.selected).toBe(scope.values[0]);
  });

  // bug fix #9621
  it("should update the label property", async () => {
    // ng-options="value.name for value in values"
    // ng-model="selected"
    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    scope.selected = scope.values[0];
    await compile(
      '<select ng-model="selected" ng-options="value.name for value in values"></select>',
    );
    await wait();
    const options = element.querySelectorAll("option");

    await wait();

    expect(options[0].label).toEqual("A");
    await wait();
    expect(options[1].label).toEqual("B");
    await wait();
    expect(options[2].label).toEqual("C");
  });

  it("should update the label if only the property has changed", async () => {
    // ng-options="value.name for value in values"
    // ng-model="selected"
    scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];
    // scope.selected = scope.values[0];
    element.innerHTML = $compile(
      '<div><select ng-model="selected" ng-options="value.name for value in values"></select>',
    )(scope);
    await wait();
    // let options = element.querySelectorAll("option");
    // expect(options[0].label).toEqual("A");
    // expect(options[1].label).toEqual("B");
    // expect(options[2].label).toEqual("C");

    // options = element.querySelectorAll("option");
    // expect(options[0].label).toEqual("X");
  });

  // bug fix #9714
  it("should select the matching option when the options are updated", async () => {
    // first set up a select with no options
    scope.selected = "";
    await createSelect({
      "ng-options": "val.id as val.label for val in values",
      "ng-model": "selected",
    });
    await wait();
    let options = element.querySelectorAll("option");

    // we expect the selected option to be the "unknown" option
    await wait();
    expect(options[0]).toEqualUnknownOption("");
    await wait();
    expect(options[0].selected).toEqual(true);

    // now add some real options - one of which matches the selected value
    scope.values = [
      { id: "", label: "A" },
      { id: "1", label: "B" },
      { id: "2", label: "C" },
    ];
    await wait();

    // we expect the selected option to be the one that matches the correct item
    // and for the unknown option to have been removed
    await wait();
    options = element.querySelectorAll("option");
    await wait();
    expect(element).toEqualSelectValue("");
    await wait();
    expect(options[0]).toEqualOption("", "A");
  });

  it('should remove the "selected" attribute from the previous option when the model changes', async () => {
    scope.values = [
      { id: 10, label: "ten" },
      { id: 20, label: "twenty" },
    ];

    await createSelect(
      {
        "ng-model": "selected",
        "ng-options": "item.label for item in values",
      },
      true,
    );

    await wait();

    let options = element.querySelectorAll("option");

    await wait();

    expect(options[0].selected).toBe(true);
    await wait();
    expect(options[1].selected).not.toBe(true);
    await wait();
    expect(options[2].selected).not.toBe(true);

    scope.selected = scope.values[0];
    await wait();
    await wait();
    expect(options[0].selected).not.toBe(true);
    await wait();
    expect(options[1].selected).toBe(true);
    await wait();
    expect(options[2].selected).not.toBe(true);

    scope.selected = scope.values[1];
    await wait();
    await wait();
    expect(options[0].selected).not.toBe(true);
    await wait();
    expect(options[1].selected).not.toBe(true);
    await wait();
    expect(options[2].selected).toBe(true);

    // This will select the empty option
    scope.selected = null;
    await wait();
    await wait();
    expect(options[0].selected).toBe(true);
    await wait();
    expect(options[1].selected).not.toBe(true);
    await wait();
    expect(options[2].selected).not.toBe(true);

    // This will add and select the unknown option
    scope.selected = "unmatched value";
    await wait();
    await wait();
    options = element.querySelectorAll("option");

    await wait();

    expect(options[0].selected).toBe(true);
    await wait();
    expect(options[1].selected).not.toBe(true);
    await wait();
    expect(options[2].selected).not.toBe(true);
    await wait();
    expect(options[3].selected).not.toBe(true);

    // Back to matched value
    scope.selected = scope.values[1];
    await wait();
    await wait();
    options = element.querySelectorAll("option");

    await wait();

    expect(options[0].selected).not.toBe(true);
    await wait();
    expect(options[1].selected).not.toBe(true);
    await wait();
    expect(options[2].selected).toBe(true);
  });

  if (window.MutationObserver) {
    // IE9 and IE10 do not support MutationObserver
    // Since the feature is only needed for a test, it's okay to skip these browsers
    it("should render the initial options only one time", async () => {
      scope.value = "black";
      scope.values = ["black", "white", "red"];
      // observe-child-list adds a MutationObserver that we will read out after ngOptions
      // has been compiled
      await createSelect({
        "ng-model": "value",
        "ng-options": "value.name for value in values",
        "observe-child-list": "",
      });

      const optionEls = element.querySelectorAll("option");

      const records = childListMutationRecords.concat(
        childListMutationObserver.takeRecords(),
      );

      await wait();

      expect(records.length).toBe(1);
      await wait();
      expect(records[0].addedNodes).toEqual(optionEls);
    });
  }

  describe("disableWhen expression", () => {
    describe("on single select", () => {
      it("should disable options", async () => {
        scope.selected = "";
        scope.options = [
          { name: "white", value: "#FFFFFF" },
          { name: "one", value: 1, unavailable: true },
          { name: "notTrue", value: false },
          { name: "thirty", value: 30, unavailable: false },
        ];
        await createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          "ng-model": "selected",
        });
        await wait();
        const options = element.querySelectorAll("option");

        await wait();

        expect(options.length).toEqual(5);
        await wait();
        expect(options[1].disabled).toEqual(false);
        await wait();
        expect(options[2].disabled).toEqual(true);
        await wait();
        expect(options[3].disabled).toEqual(false);
        await wait();
        expect(options[4].disabled).toEqual(false);
      });

      it("should select disabled options when model changes", async () => {
        scope.options = [
          { name: "white", value: "#FFFFFF" },
          { name: "one", value: 1, unavailable: true },
          { name: "notTrue", value: false },
          { name: "thirty", value: 30, unavailable: false },
        ];
        await createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          "ng-model": "selected",
        });

        // Initially the model is set to an enabled option
        scope.selected = 30;
        await wait();
        let options = element.querySelectorAll("option");

        await wait();

        expect(options[3].selected).toEqual(true);

        // Now set the model to a disabled option
        scope.selected = 1;
        await wait();
        options = element.querySelectorAll("option");

        // jQuery returns null for val() when the option is disabled, see
        // https://bugs.jquery.com/ticket/13097
        await wait();
        expect(element.value).toBe("number:1");
        await wait();
        expect(options.length).toEqual(4);
        await wait();
        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(false);
      });

      it("should select options in model when they become enabled", async () => {
        scope.options = [
          { name: "white", value: "#FFFFFF" },
          { name: "one", value: 1, unavailable: true },
          { name: "notTrue", value: false },
          { name: "thirty", value: 30, unavailable: false },
        ];
        await createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          "ng-model": "selected",
        });

        // Set the model to a disabled option
        scope.selected = 1;
        await wait();
        let options = element.querySelectorAll("option");

        // jQuery returns null for val() when the option is disabled, see
        // https://bugs.jquery.com/ticket/13097
        await wait();
        expect(element.value).toBe("number:1");
        await wait();
        expect(options.length).toEqual(4);
        await wait();
        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(false);

        // Now enable that option
        scope.options[1].unavailable = false;

        await wait();

        expect(element).toEqualSelectValue(1);
        await wait();
        options = element.querySelectorAll("option");
        await wait();
        expect(options.length).toEqual(4);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[3].selected).toEqual(false);
      });
    });

    describe("on multi select", () => {
      it("should disable options", async () => {
        scope.selected = [];
        scope.options = [
          { name: "a", value: 0 },
          { name: "b", value: 1, unavailable: true },
          { name: "c", value: 2 },
          { name: "d", value: 3, unavailable: false },
        ];
        await createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          multiple: true,
          "ng-model": "selected",
        });
        await wait();
        const options = element.querySelectorAll("option");

        await wait();

        expect(options[0].disabled).toEqual(false);
        await wait();
        expect(options[1].disabled).toEqual(true);
        await wait();
        expect(options[2].disabled).toEqual(false);
        await wait();
        expect(options[3].disabled).toEqual(false);
      });

      it("should select disabled options when model changes", async () => {
        scope.options = [
          { name: "a", value: 0 },
          { name: "b", value: 1, unavailable: true },
          { name: "c", value: 2 },
          { name: "d", value: 3, unavailable: false },
        ];
        await createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          multiple: true,
          "ng-model": "selected",
        });

        // Initially the model is set to an enabled option
        scope.selected = [3];
        await wait();
        let options = element.querySelectorAll("option");

        await wait();

        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(false);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(true);

        // Now add a disabled option
        scope.selected = [1, 3];
        await wait();
        options = element.querySelectorAll("option");
        await wait();
        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(true);

        // Now only select the disabled option
        scope.selected = [1];
        await wait();
        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(false);
      });

      it("should select options in model when they become enabled", async () => {
        scope.options = [
          { name: "a", value: 0 },
          { name: "b", value: 1, unavailable: true },
          { name: "c", value: 2 },
          { name: "d", value: 3, unavailable: false },
        ];
        await createSelect({
          "ng-options":
            "o.value as o.name disable when o.unavailable for o in options",
          multiple: true,
          "ng-model": "selected",
        });

        // Set the model to a disabled option
        scope.selected = [1];
        await wait();
        let options = element.querySelectorAll("option");

        await wait();

        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(false);

        // Now enable that option
        scope.options[1].unavailable = false;

        await wait();

        expect(element).toEqualSelectValue([1], true);
        await wait();
        options = element.querySelectorAll("option");
        await wait();
        expect(options[0].selected).toEqual(false);
        await wait();
        expect(options[1].selected).toEqual(true);
        await wait();
        expect(options[2].selected).toEqual(false);
        await wait();
        expect(options[3].selected).toEqual(false);
      });
    });
  });

  describe("selectAs expression", () => {
    beforeEach(() => {
      scope.arr = [
        { id: 10, label: "ten" },
        { id: 20, label: "twenty" },
      ];
      scope.obj = {
        10: { score: 10, label: "ten" },
        20: { score: 20, label: "twenty" },
      };
    });

    it("should support single select with array source", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.label for item in arr",
      });

      scope.selected = 10;
      await wait();
      expect(element).toEqualSelectValue(10);

      await wait();

      setSelectValue(element, 1);
      await wait();
      expect(scope.selected).toBe(20);
    });

    it("should support multi select with array source", async () => {
      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item.id as item.label for item in arr",
      });

      scope.selected = [10, 20];
      await wait();
      expect(element).toEqualSelectValue([10, 20], true);
      await wait();
      expect(scope.selected).toEqual([10, 20]);

      element.children[0].selected = false;
      browserTrigger(element, "change");
      await wait();
      expect(scope.selected).toEqual([20]);
      await wait();
      expect(element).toEqualSelectValue([20], true);
    });

    it("should re-render if an item in an array source is added/removed", async () => {
      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item.id as item.label for item in arr",
      });

      scope.selected = [10];
      await wait();
      expect(element).toEqualSelectValue([10], true);

      scope.selected.push(20);
      await wait();
      expect(element).toEqualSelectValue([10, 20], true);

      scope.selected.shift();
      await wait();
      expect(element).toEqualSelectValue([20], true);
    });

    it("should handle a options containing circular references", async () => {
      scope.arr[0].ref = scope.arr[0];
      scope.selected = [scope.arr[0]];
      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "item as item.label for item in arr",
      });
      await wait();
      expect(element).toEqualSelectValue([scope.arr[0]], true);

      scope.selected.push(scope.arr[1]);
      await wait();
      expect(element).toEqualSelectValue([scope.arr[0], scope.arr[1]], true);

      scope.selected.pop();
      await wait();
      expect(element).toEqualSelectValue([scope.arr[0]], true);
    });

    it("should support single select with object source", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "val.score as val.label for (key, val) in obj",
      });

      scope.selected = 10;
      await wait();
      expect(element).toEqualSelectValue(10);

      await wait();

      setSelectValue(element, 1);
      await wait();
      expect(scope.selected).toBe(20);
    });

    it("should support multi select with object source", async () => {
      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "val.score as val.label for (key, val) in obj",
      });

      scope.selected = [10, 20];
      await wait();
      expect(element).toEqualSelectValue([10, 20], true);

      element.children[0].selected = false;
      browserTrigger(element, "change");
      await wait();
      expect(scope.selected).toEqual([20]);
      await wait();
      expect(element).toEqualSelectValue([20], true);
    });
  });

  describe("binding", () => {
    it("should bind to scope value", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      {
        scope.selected = scope.values[1];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should bind to scope value and group", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.name group by item.group for item in values",
      });

      {
        scope.values = [
          { name: "A" },
          { name: "B", group: 0 },
          { name: "C", group: "first" },
          { name: "D", group: "second" },
          { name: "E", group: 0 },
          { name: "F", group: "first" },
          { name: "G", group: "second" },
        ];
        scope.selected = scope.values[3];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      await wait();

      const optgroups = element.querySelectorAll("optgroup");

      await wait();

      expect(optgroups.length).toBe(3);

      const zero = optgroups[0];

      const b = zero.querySelectorAll("option")[0];

      const e = zero.querySelectorAll("option")[1];

      await wait();

      expect(zero.getAttribute("label")).toEqual("0");
      await wait();
      expect(b.textContent).toEqual("B");
      await wait();
      expect(e.textContent).toEqual("E");

      const first = optgroups[1];

      const c = first.querySelectorAll("option")[0];

      const f = first.querySelectorAll("option")[1];

      await wait();

      expect(first.getAttribute("label")).toEqual("first");
      await wait();
      expect(c.textContent).toEqual("C");
      await wait();
      expect(f.textContent).toEqual("F");

      const second = optgroups[2];

      const d = second.querySelectorAll("option")[0];

      const g = second.querySelectorAll("option")[1];

      await wait();

      expect(second.getAttribute("label")).toEqual("second");
      await wait();
      expect(d.textContent).toEqual("D");
      await wait();
      expect(g.textContent).toEqual("G");

      {
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should group when the options are available on compile time", async () => {
      scope.values = [
        { name: "C", group: "first" },
        { name: "D", group: "second" },
        { name: "F", group: "first" },
        { name: "G", group: "second" },
      ];
      scope.selected = scope.values[3];

      await createSelect({
        "ng-model": "selected",
        "ng-options":
          "item as item.name group by item.group for item in values",
      });

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      await wait();

      const optgroups = element.querySelectorAll("optgroup");

      await wait();

      expect(optgroups.length).toBe(2);

      const first = optgroups[0];

      const c = first.querySelectorAll("option")[0];

      const f = first.querySelectorAll("option")[1];

      await wait();

      expect(first.getAttribute("label")).toEqual("first");
      await wait();
      expect(c.textContent).toEqual("C");
      await wait();
      expect(f.textContent).toEqual("F");

      const second = optgroups[1];

      const d = second.querySelectorAll("option")[0];

      const g = second.querySelectorAll("option")[1];

      await wait();

      expect(second.getAttribute("label")).toEqual("second");
      await wait();
      expect(d.textContent).toEqual("D");
      await wait();
      expect(g.textContent).toEqual("G");

      {
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should group when the options are updated", async () => {
      let optgroups;

      let one;

      let two;

      let three;

      let alpha;

      let beta;

      let gamma;

      let delta;

      let epsilon;

      await createSelect({
        "ng-model": "selected",
        "ng-options": "i.name group by i.cls for i in list",
      });

      scope.list = [
        { cls: "one", name: "Alpha" },
        { cls: "one", name: "Beta" },
        { cls: "two", name: "Gamma" },
      ];
      await wait();
      optgroups = element.querySelectorAll("optgroup");
      await wait();
      expect(optgroups.length).toBe(2);

      one = optgroups[0];
      await wait();
      expect(one.querySelectorAll("option").length).toBe(2);

      alpha = one.querySelectorAll("option")[0];
      beta = one.querySelectorAll("option")[1];
      await wait();
      expect(one.getAttribute("label")).toEqual("one");
      await wait();
      expect(alpha.textContent).toEqual("Alpha");
      await wait();
      expect(beta.textContent).toEqual("Beta");

      two = optgroups[1];
      await wait();
      expect(two.querySelectorAll("option").length).toBe(1);

      gamma = two.querySelectorAll("option")[0];
      await wait();
      expect(two.getAttribute("label")).toEqual("two");
      await wait();
      expect(gamma.textContent).toEqual("Gamma");

      // Remove item from first group, add item to second group, add new group
      scope.list.shift();
      scope.list.push(
        { cls: "two", name: "Delta" },
        { cls: "three", name: "Epsilon" },
      );
      await wait();
      optgroups = element.querySelectorAll("optgroup");
      await wait();
      expect(optgroups.length).toBe(3);

      // Group with removed item
      one = optgroups[0];
      await wait();
      expect(one.querySelectorAll("option").length).toBe(1);

      beta = one.querySelectorAll("option")[0];
      await wait();
      expect(one.getAttribute("label")).toEqual("one");
      await wait();
      expect(beta.textContent).toEqual("Beta");

      // Group with new item
      two = optgroups[1];
      await wait();
      expect(two.querySelectorAll("option").length).toBe(2);

      gamma = two.querySelectorAll("option")[0];
      await wait();
      expect(two.getAttribute("label")).toEqual("two");
      await wait();
      expect(gamma.textContent).toEqual("Gamma");
      delta = two.querySelectorAll("option")[1];
      await wait();
      expect(two.getAttribute("label")).toEqual("two");
      await wait();
      expect(delta.textContent).toEqual("Delta");

      // New group
      three = optgroups[2];
      await wait();
      expect(three.querySelectorAll("option").length).toBe(1);

      epsilon = three.querySelectorAll("option")[0];
      await wait();
      expect(three.getAttribute("label")).toEqual("three");
      await wait();
      expect(epsilon.textContent).toEqual("Epsilon");
    });

    it("should place non-grouped items in the list where they appear", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.name group by item.group for item in values",
      });

      {
        scope.values = [
          { name: "A" },
          { name: "B", group: "first" },
          { name: "C", group: "second" },
          { name: "D" },
          { name: "E", group: "first" },
          { name: "F" },
          { name: "G" },
          { name: "H", group: "second" },
        ];
        scope.selected = scope.values[0];
      }

      await wait();

      const children = element.children;

      await wait();

      expect(children.length).toEqual(6);

      await wait();

      expect(children[0].nodeName.toLowerCase()).toEqual("option");
      await wait();
      expect(children[1].nodeName.toLowerCase()).toEqual("optgroup");
      await wait();
      expect(children[2].nodeName.toLowerCase()).toEqual("optgroup");
      await wait();
      expect(children[3].nodeName.toLowerCase()).toEqual("option");
      await wait();
      expect(children[4].nodeName.toLowerCase()).toEqual("option");
      await wait();
      expect(children[5].nodeName.toLowerCase()).toEqual("option");
    });

    it("should group if the group has a falsy value (except undefined)", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.name group by item.group for item in values",
      });

      {
        scope.values = [
          { name: "A" },
          { name: "B", group: "" },
          { name: "C", group: null },
          { name: "D", group: false },
          { name: "E", group: 0 },
        ];
        scope.selected = scope.values[0];
      }

      await wait();

      const optgroups = element.querySelectorAll("optgroup");

      await wait();

      const options = element.querySelectorAll("option");

      await wait();

      expect(optgroups.length).toEqual(4);
      await wait();
      expect(options.length).toEqual(5);

      await wait();

      expect(optgroups[0].label).toBe("");
      await wait();
      expect(optgroups[1].label).toBe("null");
      await wait();
      expect(optgroups[2].label).toBe("false");
      await wait();
      expect(optgroups[3].label).toBe("0");

      await wait();

      expect(options[0].textContent).toBe("A");
      await wait();
      expect(options[0].parentNode).toBe(element);

      await wait();

      expect(options[1].textContent).toBe("B");
      await wait();
      expect(options[1].parentNode).toBe(optgroups[0]);

      await wait();

      expect(options[2].textContent).toBe("C");
      await wait();
      expect(options[2].parentNode).toBe(optgroups[1]);

      await wait();

      expect(options[3].textContent).toBe("D");
      await wait();
      expect(options[3].parentNode).toBe(optgroups[2]);

      await wait();

      expect(options[4].textContent).toBe("E");
      await wait();
      expect(options[4].parentNode).toBe(optgroups[3]);
    });

    it("should not duplicate a group with a falsy value when the options are updated", async () => {
      {
        scope.values = [
          { value: "A", group: "" },
          { value: "B", group: "First" },
        ];
        scope.selected = scope.values[0];
      }

      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.value group by item.group for item in values",
      });

      {
        scope.values.push({ value: "C", group: false });
      }

      await wait();

      const optgroups = element.querySelectorAll("optgroup");

      await wait();

      const options = element.querySelectorAll("option");

      await wait();

      expect(optgroups.length).toEqual(3);
      await wait();
      expect(options.length).toEqual(3);

      await wait();

      expect(optgroups[0].label).toBe("");
      await wait();
      expect(optgroups[1].label).toBe("First");
      await wait();
      expect(optgroups[2].label).toBe("false");

      await wait();

      expect(options[0].textContent).toBe("A");
      await wait();
      expect(options[0].parentNode).toBe(optgroups[0]);

      await wait();

      expect(options[1].textContent).toBe("B");
      await wait();
      expect(options[1].parentNode).toBe(optgroups[1]);

      await wait();

      expect(options[2].textContent).toBe("C");
      await wait();
      expect(options[2].parentNode).toBe(optgroups[2]);
    });

    it("should bind to scope value through expression", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.name for item in values",
      });

      {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
        scope.selected = scope.values[0].id;
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      {
        scope.selected = scope.values[1].id;
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should update options in the DOM", async () => {
      await compile(
        '<select ng-model="selected" ng-options="item.id as item.name for item in values"></select>',
      );

      {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
        scope.selected = scope.values[0].id;
      }

      {
        scope.values[0].name = "C";
      }

      await wait();

      const options = element.querySelectorAll("option");

      await wait();

      expect(options.length).toEqual(2);
      await wait();
      expect(options[0]).toEqualOption(10, "C");
      await wait();
      expect(options[1]).toEqualOption(20, "B");
    });

    it("should update options in the DOM from object source", async () => {
      await compile(
        '<select ng-model="selected" ng-options="val.id as val.name for (key, val) in values"></select>',
      );

      {
        scope.values = { a: { id: 10, name: "A" }, b: { id: 20, name: "B" } };
        scope.selected = scope.values.a.id;
      }

      {
        scope.values.a.name = "C";
      }

      await wait();

      const options = element.querySelectorAll("option");

      await wait();

      expect(options.length).toEqual(2);
      await wait();
      expect(options[0]).toEqualOption(10, "C");
      await wait();
      expect(options[1]).toEqualOption(20, "B");
    });

    it("should bind to object key", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "key as value for (key, value) in object",
      });

      {
        scope.object = { red: "FF0000", green: "00FF00", blue: "0000FF" };
        scope.selected = "green";
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      {
        scope.selected = "blue";
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should bind to object value", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "value as key for (key, value) in object",
      });

      {
        scope.object = { red: "FF0000", green: "00FF00", blue: "0000FF" };
        scope.selected = "00FF00";
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      {
        scope.selected = "0000FF";
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
    });

    it("should bind to object disabled", async () => {
      scope.selected = 30;
      scope.options = [
        { name: "white", value: "#FFFFFF" },
        { name: "one", value: 1, unavailable: true },
        { name: "notTrue", value: false },
        { name: "thirty", value: 30, unavailable: false },
      ];
      await createSelect({
        "ng-options":
          "o.value as o.name disable when o.unavailable for o in options",
        "ng-model": "selected",
      });

      await wait();

      let options = element.querySelectorAll("option");

      await wait();

      expect(scope.options[1].unavailable).toEqual(true);
      await wait();
      expect(options[1].disabled).toEqual(true);

      scope.options = scope.options.map((option, index) =>
        index === 1 ? { ...option, unavailable: false } : option,
      );

      await wait();

      options = element.querySelectorAll("option");

      await wait();

      expect(scope.options[1].unavailable).toEqual(false);
      await wait();
      expect(options[1].disabled).toEqual(false);
    });

    it("should insert the unknown option if bound to null", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }];
        scope.selected = null;
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.value).toEqual("?");
      await wait();
      expect(element.querySelectorAll("option")[0].value).toEqual("?");

      {
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(element.querySelectorAll("option").length).toEqual(1);
    });

    it("should select the provided empty option if bound to null", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }];
        scope.selected = null;
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.value).toEqual("");
      await wait();
      expect(element.querySelectorAll("option")[0].value).toEqual("");

      {
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(element.querySelectorAll("option")[0].value).toEqual("");
      await wait();
      expect(element.querySelectorAll("option").length).toEqual(2);
    });

    it("should reuse blank option if bound to null", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }];
        scope.selected = null;
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.value).toEqual("");
      await wait();
      expect(element.querySelectorAll("option")[0].value).toEqual("");

      {
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(element.querySelectorAll("option").length).toEqual(2);
    });

    it("should not insert a blank option if one of the options maps to null", async () => {
      await createSelect({
        "ng-model": "myColor",
        "ng-options": "color.shade as color.name for color in colors",
      });

      {
        scope.colors = [
          { name: "nothing", shade: null },
          { name: "red", shade: "dark" },
        ];
        scope.myColor = null;
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.querySelectorAll("option")[0]).toEqualOption(null);
      await wait();
      expect(element.value).not.toEqualUnknownValue(null);
      await wait();
      expect(element.querySelectorAll("option")[0]).not.toEqualUnknownOption(
        null,
      );
    });

    it("should insert a unknown option if bound to something not in the list", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }];
        scope.selected = {};
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.value).toEqualUnknownValue(scope.selected);
      await wait();
      expect(element.querySelectorAll("option")[0]).toEqualUnknownOption(
        scope.selected,
      );

      {
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(element.querySelectorAll("option").length).toEqual(1);
    });

    it(
      "should insert and select temporary unknown option when no options-model match, empty " +
        "option is present and model is defined",
      async () => {
        scope.selected = "C";
        scope.values = [{ name: "A" }, { name: "B" }];
        element.innerHTML =
          '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
        await bootstrapSelect();

        await wait();

        expect(element.value).toBe("?");
        await wait();
        expect(element.length).toBe(4);

        scope.selected = scope.values[1];

        await wait();

        expect(element.value).not.toBe("");
        await wait();
        expect(element.length).toBe(3);
      },
    );

    it('should select correct input if previously selected option was "?"', async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = {};
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(3);
      await wait();
      expect(element.value).toEqualUnknownValue();
      await wait();
      expect(element.querySelectorAll("option")[0]).toEqualUnknownOption();

      await wait();

      setSelectValue(element, 1);

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBeTruthy();
    });

    it("should remove unknown option when empty option exists and model is undefined", async () => {
      scope.selected = "C";
      scope.values = [{ name: "A" }, { name: "B" }];
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
      await bootstrapSelect();

      await wait();

      expect(element.value).toBe("?");

      scope.selected = undefined;
      await wait();
      expect(element.value).toBe("");
    });

    it('should ensure that at least one option element has the "selected" attribute', async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.name for item in values",
      });

      {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
      }
      await wait();
      expect(element.value).toEqualUnknownValue();
      await wait();
      expect(
        element.querySelectorAll("option")[0].getAttribute("selected"),
      ).toEqual("selected");

      {
        scope.selected = 10;
      }
      // Here the ? option should disappear and the first real option should have selected attribute
      await wait();
      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(
        element.querySelectorAll("option")[0].getAttribute("selected"),
      ).toEqual("selected");

      // Here the selected value is changed and we change the selected attribute
      {
        scope.selected = 20;
      }
      await wait();
      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(
        element.querySelectorAll("option")[1].getAttribute("selected"),
      ).toEqual("selected");

      {
        scope.values.push({ id: 30, name: "C" });
      }
      await wait();
      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(
        element.querySelectorAll("option")[1].getAttribute("selected"),
      ).toEqual("selected");

      // Here the ? option should reappear and have selected attribute
      {
        scope.selected = undefined;
      }
      await wait();
      expect(element.value).toEqualUnknownValue();
      await wait();
      expect(
        element.querySelectorAll("option")[0].getAttribute("selected"),
      ).toEqual("selected");
    });

    it("should select the correct option for selectAs and falsy values", async () => {
      scope.values = [
        { value: 0, label: "zero" },
        { value: 1, label: "one" },
      ];
      scope.selected = "";
      await createSelect({
        "ng-model": "selected",
        "ng-options": "option.value as option.label for option in values",
      });

      const option = element.querySelectorAll("option")[0];

      await wait();

      expect(option).toEqualUnknownOption();
    });

    it("should update the model if the selected option is removed", async () => {
      scope.values = [
        { value: 0, label: "zero" },
        { value: 1, label: "one" },
      ];
      scope.selected = 1;
      await createSelect({
        "ng-model": "selected",
        "ng-options": "option.value as option.label for option in values",
      });
      await wait();
      expect(element).toEqualSelectValue(1);

      // Check after initial option update
      {
        scope.values.pop();
      }

      await wait();

      expect(element.value).toEqual("?");
      await wait();
      expect(scope.selected).toEqual(null);

      // Check after model change
      {
        scope.selected = 0;
      }

      await wait();

      expect(element).toEqualSelectValue(0);

      {
        scope.values.pop();
      }

      await wait();

      expect(element.value).toEqual("?");
      await wait();
      expect(scope.selected).toEqual(null);
    });

    it("should update the model if all the selected (multiple) options are removed", async () => {
      scope.values = [
        { value: 0, label: "zero" },
        { value: 1, label: "one" },
        { value: 2, label: "two" },
      ];
      scope.selected = [1, 2];
      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "option.value as option.label for option in values",
      });

      await wait();

      expect(element).toEqualSelectValue([1, 2], true);

      // Check after initial option update
      {
        scope.values.pop();
      }

      await wait();

      expect(element).toEqualSelectValue([1], true);
      await wait();
      expect(scope.selected).toEqual([1]);

      scope.values.pop();

      await wait();

      expect(element).toEqualSelectValue([], true);
      await wait();
      expect(scope.selected).toEqual([]);

      // Check after model change
      scope.selected = [0];

      await wait();

      expect(element).toEqualSelectValue([0], true);

      scope.values.pop();

      await wait();

      expect(element).toEqualSelectValue([], true);
      await wait();
      expect(scope.selected).toEqual([]);
    });
  });

  describe("empty option", () => {
    it("should be compiled as template, be watched and updated", async () => {
      let option;

      await createSingleSelect(
        '<option value="">blank is {{blankVal}}</option>',
      );

      scope.blankVal = "so blank";
      scope.values = [{ name: "A" }];
      // check blank option is first and is compiled
      await wait();
      expect(element.querySelectorAll("option").length).toBe(2);
      option = element.querySelectorAll("option")[0];
      await wait();
      expect(option.value).toBe("");
      await wait();
      expect(option.textContent).toBe("blank is so blank");

      scope.blankVal = "not so blank";

      // check blank option is first and is compiled
      await wait();
      expect(element.querySelectorAll("option").length).toBe(2);
      option = element.querySelectorAll("option")[0];
      await wait();
      expect(option.value).toBe("");
      await wait();
      expect(option.textContent).toBe("blank is not so blank");
    });

    it("should support binding via ngBindTemplate directive", async () => {
      let option;

      await createSingleSelect(
        '<option value="" ng-bind-template="blank is {{blankVal}}"></option>',
      );

      scope.blankVal = "so blank";
      scope.values = [{ name: "A" }];
      // check blank option is first and is compiled
      await wait();
      expect(element.querySelectorAll("option").length).toBe(2);
      option = element.querySelectorAll("option")[0];
      await wait();
      expect(option.value).toBe("");
      await wait();
      expect(option.textContent).toBe("blank is so blank");
    });

    it("should support binding via ngBind attribute", async () => {
      let option;

      await createSingleSelect('<option value="" ng-bind="blankVal"></option>');

      scope.blankVal = "is blank";
      scope.values = [{ name: "A" }];
      // check blank option is first and is compiled
      await wait();
      expect(element.querySelectorAll("option").length).toBe(2);
      option = element.querySelectorAll("option")[0];
      await wait();
      expect(option.value).toBe("");
      await wait();
      expect(option.textContent).toBe("is blank");
    });

    it("should be ignored when it has no value attribute", async () => {
      // The option value is set to the textContent if there's no value attribute,
      // so in that case it doesn't count as a blank option
      await createSingleSelect("<option>--select--</option>");
      scope.values = [{ name: "A" }, { name: "B" }, { name: "C" }];

      await wait();

      const options = element.querySelectorAll("option");

      await wait();

      expect(options[0]).toEqualUnknownOption();
      await wait();
      expect(options[1]).toEqualOption(scope.values[0], "A");
      await wait();
      expect(options[2]).toEqualOption(scope.values[1], "B");
      await wait();
      expect(options[3]).toEqualOption(scope.values[2], "C");
    });

    it("should be rendered with the attributes preserved", async () => {
      let option;

      await createSingleSelect(
        '<option value="" class="coyote" id="road-runner" ' +
          'custom-attr="custom-attr">{{blankVal}}</option>',
      );

      scope.blankVal = "is blank";

      // check blank option is first and is compiled
      option = element.querySelectorAll("option")[0];
      await wait();
      expect(option.classList.contains("coyote")).toBeTruthy();
      await wait();
      expect(option.getAttribute("id")).toBe("road-runner");
      await wait();
      expect(option.getAttribute("custom-attr")).toBe("custom-attr");
    });

    it("should be selected, if it is available and no other option is selected", async () => {
      // selectedIndex is used here because JQLite incorrectly reports element.value
      {
        scope.values = [{ name: "A" }];
      }
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
      await bootstrapSelect();
      // ensure the first option (the blank option) is selected
      await wait();
      expect(element.selectedIndex).toEqual(0);
      // ensure the option has not changed following the digest
      await wait();
      expect(element.selectedIndex).toEqual(0);
    });

    it("should be selectable if select is multiple", async () => {
      await createMultiSelect(true);

      // select the empty option
      await wait();
      setSelectValue(element, 0);

      // ensure selection and correct binding
      await wait();
      expect(element.selectedIndex).toEqual(0);
      await wait();
      expect(scope.selected).toEqual([]);
    });

    it("should be possible to use ngIf in the blank option", async () => {
      let option;

      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      {
        scope.values = [{ name: "A" }];
        scope.isBlank = true;
      }

      await wait();

      expect(element.value).toBe("");

      scope.isBlank = false;

      await wait();

      expect(element.value).toBe("");

      scope.isBlank = true;

      await wait();

      expect(element.value).toBe("");
    });

    it("should be possible to use ngIf in the blank option when values are available upon linking", async () => {
      let options;

      scope.values = [{ name: "A" }];
      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      scope.isBlank = true;

      await wait();

      options = element.querySelectorAll("option");
      await wait();
      expect(options.length).toBe(2);
      await wait();
      expect(options[0].value).toBe("");
      await wait();
      expect(options[0].textContent).toBe("blank");

      scope.isBlank = false;

      await wait();

      expect(element.value).toBe("");
    });

    it("should select the correct option after linking when the ngIf expression is initially falsy", async () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];
      scope.selected = scope.values[2];

      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      await wait();

      expect(element).toEqualSelectValue(scope.selected);
      await wait();
      expect(linkLog).toEqual(["linkNgOptions"]);
    });

    it('should add / remove the "selected" attribute on empty option which has an initially falsy ngIf expression', async () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];
      scope.selected = scope.values[2];

      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      scope.isBlank = true;
      await wait();
      expect(element.querySelectorAll("option")[0].value).toBe("");
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(false);

      scope.selected = null;
      await wait();
      expect(element.querySelectorAll("option")[0].value).toBe("");
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(true);

      scope.selected = scope.values[1];
      await wait();
      expect(element.querySelectorAll("option")[0].value).toBe("");
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(false);
      await wait();
      expect(element).toEqualSelectValue(scope.selected);
    });

    it('should add / remove the "selected" attribute on empty option which has an initially truthy ngIf expression when no option is selected', async () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];
      scope.isBlank = true;

      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      await wait();

      expect(element.querySelectorAll("option")[0].value).toBe("");
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(true);
      scope.selected = scope.values[2];
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(false);
      await wait();
      expect(element).toEqualSelectValue(scope.selected);
    });

    it('should add the "selected" attribute on empty option which has an initially falsy ngIf expression when no option is selected', async () => {
      scope.values = [{ name: "black" }, { name: "white" }, { name: "red" }];

      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      await wait();

      expect(element.querySelectorAll("option")[0].selected).toBe(true);

      scope.isBlank = true;

      await wait();

      expect(element.querySelectorAll("option")[0].value).toBe("");
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBe(true);
      await wait();
      expect(element.querySelectorAll("option")[1].selected).toBe(false);
    });

    it("should not throw when a directive compiles the blank option before ngOptions is linked", async () => {
      await createSelect(
        {
          "o-compile-contents": "",
          name: "select",
          "ng-model": "value",
          "ng-options": "item for item in items",
        },
        true,
      );

      await wait();

      expect(linkLog).toEqual(["linkCompileContents", "linkNgOptions"]);
    });

    it("should not throw with a directive that replaces", async () => {
      const $templateCache = injector.get("$templateCache");

      $templateCache.set(
        "select_template.html",
        '<select ng-options="option as option for option in selectable_options"> <option value="">This is a test</option> </select>',
      );

      scope.options = ["a", "b", "c", "d"];

      await wait();

      expect(() => {
        element = $compile(
          '<custom-select ng-model="value" options="options"></custom-select>',
        )(scope);
      }).not.toThrow();

      dealoc(element);
    });
  });

  describe("on change", () => {
    it("should update model on change", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = scope.values[0];
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      await wait();

      setSelectValue(element, 1);
      await wait();
      expect(scope.selected).toEqual(scope.values[1]);
    });

    it("should update model on change through expression", async () => {
      await createSelect({
        "ng-model": "selected",
        "ng-options": "item.id as item.name for item in values",
      });

      {
        scope.values = [
          { id: 10, name: "A" },
          { id: 20, name: "B" },
        ];
        scope.selected = scope.values[0].id;
      }

      await wait();

      expect(element).toEqualSelectValue(scope.selected);

      await wait();

      setSelectValue(element, 1);
      await wait();
      expect(scope.selected).toEqual(scope.values[1].id);
    });

    it("should update model to null on change", async () => {
      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"><option value="">blank</option></select>';
      await bootstrapSelect();

      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = scope.values[0];
      }

      await wait();
      setSelectValue(element, 0);
      await wait();
      expect(scope.selected).toEqual(null);
    });

    // Regression https://github.com/angular/angular.js/issues/7855
    it("should update the model with ng-change", async () => {
      await createSelect({
        "ng-change": "change()",
        "ng-model": "selected",
        "ng-options": "value for value in values",
      });

      {
        scope.values = ["A", "B"];
        scope.selected = "A";
      }

      scope.change = function () {
        scope.selected = "A";
      };

      await wait();

      element.querySelectorAll("option")[1].selected = true;

      browserTrigger(element, "change");
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBeTruthy();
      await wait();
      expect(scope.selected).toEqual("A");
    });
  });

  describe("disabled blank", () => {
    it("should select disabled blank by default", async () => {
      const html =
        '<select ng-model="someModel" ng-options="c for c in choices">' +
        '<option value="" disabled>Choose One</option>' +
        "</select>";

      {
        scope.choices = ["A", "B", "C"];
      }

      await compile(html);

      await wait();

      const options = element.querySelectorAll("option");

      const optionToSelect = options[0];

      await wait();

      expect(optionToSelect.textContent).toBe("Choose One");
      await wait();
      expect(optionToSelect.selected).toBe(true);
      await wait();
      expect(element.value).toBe("");

      dealoc(element);
    });

    it("should select disabled blank by default when select is required", async () => {
      const html =
        '<select ng-model="someModel" ng-options="c for c in choices" required>' +
        '<option value="" disabled>Choose One</option>' +
        "</select>";

      {
        scope.choices = ["A", "B", "C"];
      }

      await compile(html);

      await wait();

      const options = element.querySelectorAll("option");

      const optionToSelect = options[0];

      await wait();

      expect(optionToSelect.textContent).toBe("Choose One");
      await wait();
      expect(optionToSelect.selected).toBe(true);
      await wait();
      expect(element.value).toBe("");

      dealoc(element);
    });
  });

  describe("select-many", () => {
    it("should read multiple selection", async () => {
      await createMultiSelect();

      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = [];
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBeFalsy();
      await wait();
      expect(element.querySelectorAll("option")[1].selected).toBeFalsy();

      {
        scope.selected.push(scope.values[1]);
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBeFalsy();
      await wait();
      expect(element.querySelectorAll("option")[1].selected).toBeTruthy();

      {
        scope.selected.push(scope.values[0]);
      }

      await wait();

      expect(element.querySelectorAll("option").length).toEqual(2);
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toBeTruthy();
      await wait();
      expect(element.querySelectorAll("option")[1].selected).toBeTruthy();
    });

    it("should update model on change", async () => {
      await createMultiSelect();

      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = [];
      }

      await wait();

      element.querySelectorAll("option")[0].selected = true;

      browserTrigger(element, "change");
      await wait();
      expect(scope.selected).toEqual([scope.values[0]]);
    });

    it("should select from object", async () => {
      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "key as value for (key,value) in values",
      });
      scope.values = { 0: "A", 1: "B" };

      scope.selected = ["1"];
      await wait();
      expect(element.querySelectorAll("option")[1].selected).toBe(true);

      await wait();

      element.querySelectorAll("option")[0].selected = true;
      browserTrigger(element, "change");
      await wait();
      expect(scope.selected).toEqual(["0", "1"]);

      await wait();

      element.querySelectorAll("option")[1].selected = false;
      browserTrigger(element, "change");
      await wait();
      expect(scope.selected).toEqual(["0"]);
    });

    it("should deselect all options when model is emptied", async () => {
      await createMultiSelect();
      {
        scope.values = [{ name: "A" }, { name: "B" }];
        scope.selected = [scope.values[0]];
      }
      await wait();
      expect(element.querySelectorAll("option")[0].selected).toEqual(true);

      {
        scope.selected.pop();
      }

      await wait();

      expect(element.querySelectorAll("option")[0].selected).toEqual(false);
    });

    // Support: Safari 9+
    // This test relies defining a getter/setter `selected` property on either `<option>` elements
    // or their prototype. Some browsers (including Safari 9) are very flakey when the
    // getter/setter is not defined on the prototype (probably due to some bug). On Safari 9, the
    // getter/setter that is already defined on the `<option>` element's prototype is not
    // configurable, so we can't overwrite it with our spy.
    if (
      !/\b(9|\d{2})(?:\.\d+)+[\s\S]*safari/i.test(window.navigator.userAgent)
    ) {
      it("should not re-set the `selected` property if it already has the correct value", async () => {
        scope.values = [{ name: "A" }, { name: "B" }];
        await createMultiSelect();

        await wait();

        const options = element.querySelectorAll("option");

        const optionsSetSelected = [];

        const _selected = [];

        // Set up spies
        const optionProto = Object.getPrototypeOf(options[0]);

        const originalSelectedDescriptor =
          isFunction(Object.getOwnPropertyDescriptor) &&
          Object.getOwnPropertyDescriptor(optionProto, "selected");

        const addSpiesOnProto =
          originalSelectedDescriptor && originalSelectedDescriptor.configurable;

        Object.entries(options).forEach(([i, option]) => {
          const setSelected = function (value) {
            _selected[i] = value;
          };

          optionsSetSelected[i] = jasmine
            .createSpy(`optionSetSelected${i}`)
            .and.callFake(setSelected);
          setSelected(option.selected);
        });

        if (!addSpiesOnProto) {
          Object.entries(options).forEach(([i, option]) => {
            Object.defineProperty(option, "selected", {
              get() {
                return _selected[i];
              },
              set: optionsSetSelected[i],
            });
          });
        } else {
          // Support: Firefox 54+
          // We cannot use the above (simpler) method on all browsers because of Firefox 54+, which
          // is very flaky when the getter/setter property is defined on the element itself and not
          // the prototype. (Possibly the result of some (buggy?) optimization.)
          const getSelected = function (index) {
            return _selected[index];
          };

          const setSelected = function (index, value) {
            optionsSetSelected[index](value);
          };

          const getSelectedOriginal = function (option) {
            return originalSelectedDescriptor.get.call(option);
          };

          const setSelectedOriginal = function (option, value) {
            originalSelectedDescriptor.set.call(option, value);
          };

          const getIndexAndCall = function (
            option,
            foundFn,
            notFoundFn,
            value,
          ) {
            for (let i = 0, ii = options.length; i < ii; ++i) {
              if (options[i] === option) return foundFn(i, value);
            }

            return notFoundFn(option, value);
          };

          Object.defineProperty(optionProto, "selected", {
            get() {
              return getIndexAndCall(this, getSelected, getSelectedOriginal);
            },
            set(value) {
              return getIndexAndCall(
                this,
                setSelected,
                setSelectedOriginal,
                value,
              );
            },
          });
        }

        // Select `optionA`
        scope.selected = [scope.values[0]];

        await wait();

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(true);
        await wait();
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        await wait();
        expect(options[0].selected).toBe(true);
        await wait();
        expect(options[1].selected).toBe(false);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Select `optionB` (`optionA` remains selected)
        scope.selected.push(scope.values[1]);

        await wait();

        expect(optionsSetSelected[0]).not.toHaveBeenCalled();
        await wait();
        expect(optionsSetSelected[1]).toHaveBeenCalledOnceWith(true);
        await wait();
        expect(options[0].selected).toBe(true);
        await wait();
        expect(options[1].selected).toBe(true);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Unselect `optionA` (`optionB` remains selected)
        scope.selected.shift();

        await wait();

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(false);
        await wait();
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        await wait();
        expect(options[0].selected).toBe(false);
        await wait();
        expect(options[1].selected).toBe(true);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Reselect `optionA` (`optionB` remains selected)
        scope.selected.push(scope.values[0]);

        await wait();

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(true);
        await wait();
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        await wait();
        expect(options[0].selected).toBe(true);
        await wait();
        expect(options[1].selected).toBe(true);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Unselect `optionB` (`optionA` remains selected)
        scope.selected.shift();

        await wait();

        expect(optionsSetSelected[0]).not.toHaveBeenCalled();
        await wait();
        expect(optionsSetSelected[1]).toHaveBeenCalledOnceWith(false);
        await wait();
        expect(options[0].selected).toBe(true);
        await wait();
        expect(options[1].selected).toBe(false);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Unselect `optionA`
        scope.selected.length = 0;

        await wait();

        expect(optionsSetSelected[0]).toHaveBeenCalledOnceWith(false);
        await wait();
        expect(optionsSetSelected[1]).not.toHaveBeenCalled();
        await wait();
        expect(options[0].selected).toBe(false);
        await wait();
        expect(options[1].selected).toBe(false);
        optionsSetSelected[0].calls.reset();
        optionsSetSelected[1].calls.reset();

        // Support: Firefox 54+
        // Restore `originalSelectedDescriptor`
        if (addSpiesOnProto) {
          Object.defineProperty(
            optionProto,
            "selected",
            originalSelectedDescriptor,
          );
        }
      });
    }

    if (window.MutationObserver) {
      // IE9 and IE10 do not support MutationObserver
      // Since the feature is only needed for a test, it's okay to skip these browsers
      it("should render the initial options only one time", async () => {
        scope.selected = ["black"];
        scope.values = ["black", "white", "red"];
        // observe-child-list adds a MutationObserver that we will read out after ngOptions
        // has been compiled
        await createSelect({
          "ng-model": "selected",
          "ng-options": "value.name for value in values",
          multiple: "true",
          "observe-child-list": "",
        });

        const optionEls = element.querySelectorAll("option");

        const records = childListMutationRecords.concat(
          childListMutationObserver.takeRecords(),
        );

        await wait();

        expect(records.length).toBe(1);
        await wait();
        expect(records[0].addedNodes).toEqual(optionEls);
      });
    }
  });

  describe("required state", () => {
    it("should set the error if the empty option is selected", async () => {
      await createSelect(
        {
          "ng-model": "selection",
          "ng-options": "item for item in values",
          required: "",
        },
        true,
      );

      {
        scope.values = ["a", "b"];
        scope.selection = scope.values[0];
      }
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      await wait();

      const options = element.querySelectorAll("option");

      // // view -> model
      await wait();
      setSelectValue(element, 0);
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeTruthy();

      await wait();

      setSelectValue(element, 1);
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      // // model -> view
      scope.selection = null;
      await wait();
      expect(options[0].selected).toBe(true);
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeTruthy();
    });

    it("should validate with empty option and bound ngRequired", async () => {
      await createSelect(
        {
          "ng-model": "value",
          "ng-options": "item.name for item in values",
          "ng-required": "required",
        },
        true,
      );

      {
        scope.values = [
          { name: "A", id: 1 },
          { name: "B", id: 2 },
        ];
        scope.required = false;
      }

      await wait();

      const options = element.querySelectorAll("option");

      await wait();

      setSelectValue(element, 0);
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();

      scope.required = true;
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();

      scope.value = scope.values[0];
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();

      await wait();

      setSelectValue(element, 0);
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();

      scope.required = false;
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
    });

    it("should treat an empty array as invalid when `multiple` attribute used", async () => {
      await createSelect(
        {
          "ng-model": "value",
          "ng-options": "item.name for item in values",
          "ng-required": "required",
          multiple: "",
        },
        true,
      );

      {
        scope.value = [];
        scope.values = [
          { name: "A", id: 1 },
          { name: "B", id: 2 },
        ];
        scope.required = true;
      }
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();

      {
        // ngModelWatch does not set objectEquality flag
        // array must be replaced in order to trigger $formatters
        scope.value = [scope.values[0]];
      }
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
    });

    it("should NOT set the error if the empty option is present but required attribute is not", async () => {
      {
        scope.values = ["a", "b"];
      }

      element.innerHTML =
        '<select ng-model="selected" ng-options="value.name for value in values"></select>';
      await bootstrapSelect();

      await wait();

      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(element.classList.contains("ng-pristine")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeFalsy();
    });

    it("should NOT set the error if the unknown option is selected", async () => {
      await createSelect({
        "ng-model": "selection",
        "ng-options": "item for item in values",
        required: "",
      });

      {
        scope.values = ["a", "b"];
        scope.selection = "a";
      }

      await wait();

      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      scope.selection = "c";
      await wait();
      expect(element.value).toBe("?");
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeFalsy();
    });

    it("should allow falsy values as values", async () => {
      await createSelect(
        {
          "ng-model": "value",
          "ng-options": "item.value as item.name for item in values",
          "ng-required": "required",
        },
        true,
      );

      {
        scope.values = [
          { name: "True", value: true },
          { name: "False", value: false },
        ];
        scope.required = false;
      }

      await wait();

      setSelectValue(element, 2);
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(scope.value).toBe(false);

      scope.required = true;
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(scope.value).toBe(false);
    });

    it("should validate after option list was updated", async () => {
      await createSelect(
        {
          "ng-model": "selection",
          "ng-options": "item for item in values",
          required: "",
        },
        true,
      );

      {
        scope.values = ["A", "B"];
        scope.selection = scope.values[0];
      }

      await wait();

      expect(element.value).toBe("string:A");
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeFalsy();

      {
        scope.values = ["C", "D"];
      }

      await wait();

      expect(element.value).toBe("");
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();
      await wait();
      expect(ngModelCtrl.$error.required).toBeTruthy();
      // ngModel sets undefined for invalid values
      await wait();
      expect(scope.selection).toBeUndefined();
    });
  });

  describe("required and empty option", () => {
    it("should select the empty option after compilation", async () => {
      await createSelect(
        {
          name: "select",
          "ng-model": "value",
          "ng-options": "item for item in ['first', 'second', 'third']",
          required: "required",
        },
        true,
      );

      await wait();

      expect(element.value).toBe("");
      const emptyOption = element.querySelectorAll("option")[0];

      await wait();

      expect(emptyOption.selected).toBe(true);
      await wait();
      expect(emptyOption.value).toBe("");
    });
  });

  describe("ngModelCtrl", () => {
    it('should prefix the model value with the word "the" using $parsers', async () => {
      await createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$parsers.push((value) => `the ${value}`);

      await wait();

      setSelectValue(element, 3);
      await wait();
      expect(scope.value).toBe("the third");
      await wait();
      expect(element).toEqualSelectValue("third");
    });

    it('should prefix the view value with the word "the" using $formatters', async () => {
      await createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options":
          "item for item in ['the first', 'the second', 'the third', 'the fourth']",
      });

      scope.form.select.$formatters.push((value) => `the ${value}`);

      {
        scope.value = "third";
      }
      await wait();
      expect(element).toEqualSelectValue("the third");
    });

    it("should fail validation when $validators fail", async () => {
      await createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$validators.fail = function () {
        return false;
      };

      await wait();

      setSelectValue(element, 3);
      await wait();
      expect(element.classList.contains("ng-invalid")).toBeTrue();
      await wait();
      expect(scope.value).toBeUndefined();
      await wait();
      expect(element).toEqualSelectValue("third");
    });

    it("should pass validation when $validators pass", async () => {
      await createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$validators.pass = function () {
        return true;
      };

      await wait();

      setSelectValue(element, 3);
      await wait();
      expect(element.classList.contains("ng-valid")).toBeTrue();
      await wait();
      expect(scope.value).toBe("third");
      await wait();
      expect(element).toEqualSelectValue("third");
    });

    it("should fail validation when $asyncValidators fail", async () => {
      let defer;

      await createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$asyncValidators.async = function () {
        defer = Promise.withResolvers();

        return defer.promise;
      };

      await wait();

      setSelectValue(element, 3);
      await wait();
      expect(scope.form.select.$pending).toBeDefined();
      await wait();
      expect(scope.value).toBeUndefined();
      await wait();
      expect(element).toEqualSelectValue("third");

      defer.reject();
      await wait();
      expect(scope.form.select.$pending).toBeUndefined();
      await wait();
      expect(scope.value).toBeUndefined();
      await wait();
      expect(element).toEqualSelectValue("third");
    });

    it("should pass validation when $asyncValidators pass", async () => {
      let defer;

      await createSelect({
        name: "select",
        "ng-model": "value",
        "ng-options": "item for item in ['first', 'second', 'third', 'fourth']",
      });

      scope.form.select.$asyncValidators.async = function () {
        defer = Promise.withResolvers();

        return defer.promise;
      };

      await wait();

      setSelectValue(element, 3);
      await wait();
      expect(scope.form.select.$pending).toBeDefined();
      await wait();
      expect(scope.value).toBeUndefined();
      await wait();
      expect(element).toEqualSelectValue("third");

      defer.resolve();
      await wait();
      expect(scope.form.select.$pending).toBeUndefined();
      await wait();
      expect(scope.value).toBe("third");
      await wait();
      expect(element).toEqualSelectValue("third");
    });

    it("should not set $dirty with select-multiple after compilation", async () => {
      scope.values = ["a", "b"];
      scope.selected = ["b"];

      await createSelect({
        "ng-model": "selected",
        multiple: true,
        "ng-options": "value for value in values",
        name: "select",
      });

      await wait();

      expect(element.querySelectorAll("option")[1].selected).toBe(true);
      await wait();
      expect(scope.form.select.$pristine).toBe(true);
    });
  });

  describe("selectCtrl api", () => {
    it("should reflect the status of empty and unknown option", async () => {
      await createSingleSelect(
        '<option ng-if="isBlank" value="">blank</option>',
      );

      const selectCtrl = getController(element, "select");

      scope.values = [{ name: "A" }, { name: "B" }];
      scope.isBlank = true;
      await wait();

      expect(typeof selectCtrl.$hasEmptyOption()).toBe("boolean");
      expect(typeof selectCtrl.$isEmptyOptionSelected()).toBe("boolean");
      expect(typeof selectCtrl.$isUnknownOptionSelected()).toBe("boolean");

      scope.selected = "unmatched";
      await wait();

      expect(typeof selectCtrl.$hasEmptyOption()).toBe("boolean");
      expect(typeof selectCtrl.$isEmptyOptionSelected()).toBe("boolean");
      expect(typeof selectCtrl.$isUnknownOptionSelected()).toBe("boolean");
    });
  });
});
