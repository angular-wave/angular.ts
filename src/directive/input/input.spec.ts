/// <reference types="jasmine" />
import { FormController } from "../form/form.ts";
import { NgModelController } from "../model/model.ts";
import { defined, instance } from "../../shared/test-fixtures.spec.ts";

import { Angular } from "../../angular.ts";
import { dealoc, getController } from "../../shared/dom.ts";
import { browserTrigger, wait } from "../../shared/test-utils.ts";

describe("input directive", () => {
  let $compile: ng.CompileService;
  let $rootScope: FixtureScope;
  let app: HTMLElement;

  beforeEach(() => {
    app = defined(document.getElementById("app"));
    dealoc(app);
    app.innerHTML = "";

    const angular = new Angular();

    angular.bootstrap(app, []).invoke([
      "$compile",
      "$rootScope",
      (_$compile_: ng.CompileService, _$rootScope_: FixtureScope) => {
        $compile = _$compile_;
        $rootScope = _$rootScope_;
      },
    ]);
  });

  afterEach(() => {
    dealoc(app);
  });

  it("preserves exact text input values", async () => {
    const scope = $rootScope.new();

    app.innerHTML = '<input type="text" ng-model="name" />';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));

    input.value = "  Ada  ";
    browserTrigger(input, "input");
    await wait();

    expect(scope.name).toBe("  Ada  ");
  });

  it("keeps number input values as strings by default", async () => {
    const scope = $rootScope.new();

    app.innerHTML = '<input type="number" ng-model="age" />';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));

    input.value = "42";
    browserTrigger(input, "input");
    await wait();

    expect(scope.age).toBe("42");
  });

  it("uses native validity for email", async () => {
    const scope = $rootScope.new();

    app.innerHTML =
      '<form name="form"><input type="email" name="email" ng-model="email" /></form>';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));

    input.value = "not email";
    browserTrigger(input, "input");
    await wait();

    expect(
      instance(defined(scope.form).email, NgModelController).invalid,
    ).toBeTrue();
    expect(
      instance(defined(scope.form).email, NgModelController).error.native,
    ).toBeUndefined();
    expect(
      instance(defined(scope.form).email, NgModelController).validity
        ?.typeMismatch,
    ).toBeTrue();
    expect(scope.email).toBe("not email");

    input.value = "ada@example.com";
    browserTrigger(input, "input");
    await wait();

    expect(
      instance(defined(scope.form).email, NgModelController).valid,
    ).toBeTrue();
    expect(scope.email).toBe("ada@example.com");
  });

  it("exposes native validity on the model controller", async () => {
    const scope = $rootScope.new();

    app.innerHTML = '<input type="email" ng-model="email" />';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));
    const ctrl = instance(getController(input, "ngModel"), NgModelController);

    input.value = "not email";
    browserTrigger(input, "input");
    await wait();

    expect(defined(ctrl.validity).typeMismatch).toBeTrue();
    expect(defined(ctrl.validity).valid).toBe(input.validity.valid);
    expect(ctrl.validationMessage).toBe(input.validationMessage);
  });

  it("sets a single native custom validity message from the model controller", async () => {
    const scope = $rootScope.new();

    app.innerHTML = '<input type="text" ng-model="name" />';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));
    const ctrl = instance(getController(input, "ngModel"), NgModelController);

    ctrl.setCustomValidity("Use a display name.");
    await wait();

    expect(input.validity.customError).toBeTrue();
    expect(defined(ctrl.validity).customError).toBeTrue();
    expect(ctrl.validationMessage).toBe("Use a display name.");
    expect(ctrl.invalid).toBeTrue();
    expect(ctrl.error.customError).toBeUndefined();

    ctrl.setCustomValidity("");
    await wait();

    expect(input.validity.customError).toBeFalse();
    expect(defined(ctrl.validity).valid).toBeTrue();
    expect(ctrl.validationMessage).toBe("");
    expect(ctrl.valid).toBeTrue();
  });

  it("uses native min, max, and step validity for numbers", async () => {
    const scope = $rootScope.new();

    app.innerHTML =
      '<form name="form"><input type="number" name="age" min="10" max="20" step="2" ng-model="age" /></form>';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));

    input.value = "9";
    browserTrigger(input, "input");
    await wait();

    expect(
      instance(defined(scope.form).age, NgModelController).error.native,
    ).toBeUndefined();
    expect(
      instance(defined(scope.form).age, NgModelController).validity
        ?.rangeUnderflow,
    ).toBeTrue();
    expect(scope.age).toBe("9");

    input.value = "11";
    browserTrigger(input, "input");
    await wait();

    expect(
      instance(defined(scope.form).age, NgModelController).error.native,
    ).toBeUndefined();
    expect(
      instance(defined(scope.form).age, NgModelController).validity
        ?.stepMismatch,
    ).toBeTrue();
    expect(scope.age).toBe("11");

    input.value = "12";
    browserTrigger(input, "input");
    await wait();

    expect(
      instance(defined(scope.form).age, NgModelController).valid,
    ).toBeTrue();
    expect(scope.age).toBe("12");
  });

  it("uses boolean checkbox models", async () => {
    const scope = $rootScope.new();

    app.innerHTML = '<input type="checkbox" ng-model="enabled" />';
    $compile(app)(scope);

    const input = defined(app.querySelector("input"));

    input.checked = true;
    browserTrigger(input, "change");
    await wait();

    expect(scope.enabled).toBeTrue();

    input.checked = false;
    browserTrigger(input, "change");
    await wait();

    expect(scope.enabled).toBeFalse();
  });

  it("uses native radio string values", async () => {
    const scope = $rootScope.new();

    app.innerHTML =
      '<input type="radio" name="color" value="red" ng-model="color" />' +
      '<input type="radio" name="color" value="blue" ng-model="color" />';
    $compile(app)(scope);

    const inputs = app.querySelectorAll("input");
    const blue = defined(inputs[1]);

    blue.checked = true;
    browserTrigger(blue, "change");
    await wait();

    expect(scope.color).toBe("blue");
  });

  describe("HTML input type coverage", () => {
    [
      ["color", "#336699", "input", "#336699"],
      ["date", "2026-05-16", "input", "2026-05-16"],
      ["datetime-local", "2026-05-16T10:30", "input", "2026-05-16T10:30"],
      ["email", "ada@example.com", "input", "ada@example.com"],
      ["month", "2026-05", "input", "2026-05"],
      ["number", "42", "input", "42"],
      ["password", "secret", "input", "secret"],
      ["range", "75", "input", "75"],
      ["search", "angular", "input", "angular"],
      ["tel", "+37112345678", "input", "+37112345678"],
      ["text", "Ada", "input", "Ada"],
      ["time", "10:30", "input", "10:30"],
      ["url", "https://example.com", "input", "https://example.com"],
      ["week", "2026-W20", "input", "2026-W20"],
    ].forEach(([type, value, event, expected]) => {
      it(`updates ${type} models from native ${event} events`, async () => {
        const scope = $rootScope.new();

        app.innerHTML = `<input type="${type}" ng-model="value" />`;
        $compile(app)(scope);

        const input = defined(app.querySelector("input"));

        input.value = value;
        browserTrigger(input, event);
        await wait();

        expect(scope.value).toBe(expected);
      });
    });

    it("updates checkbox models from native change events", async () => {
      const scope = $rootScope.new();

      app.innerHTML = '<input type="checkbox" ng-model="value" />';
      $compile(app)(scope);

      const input = defined(app.querySelector("input"));

      input.checked = true;
      browserTrigger(input, "change");
      await wait();

      expect(scope.value).toBeTrue();
    });

    it("updates radio models from native change events", async () => {
      const scope = $rootScope.new();

      app.innerHTML =
        '<input type="radio" value="selected" ng-model="value" />';
      $compile(app)(scope);

      const input = defined(app.querySelector("input"));

      input.checked = true;
      browserTrigger(input, "change");
      await wait();

      expect(scope.value).toBe("selected");
    });

    it("updates file models from native change events", async () => {
      const scope = $rootScope.new();

      app.innerHTML = '<input type="file" ng-model="value" />';
      $compile(app)(scope);

      const input = defined(app.querySelector("input"));
      const transfer = new DataTransfer();

      transfer.items.add(new File(["hello"], "hello.txt"));
      input.files = transfer.files;
      browserTrigger(input, "change");
      await wait();

      expect(instance(scope.value, FileList).length).toBe(1);
      expect(defined(instance(scope.value, FileList)[0]).name).toBe(
        "hello.txt",
      );
    });

    it("writes hidden models without installing view-to-model updates", async () => {
      const scope = $rootScope.new();

      scope.value = "from model";
      app.innerHTML = '<input type="hidden" ng-model="value" />';
      $compile(app)(scope);
      await wait();

      const input = defined(app.querySelector("input"));

      expect(input.value).toBe("from model");

      input.value = "from view";
      browserTrigger(input, "input");
      browserTrigger(input, "change");
      await wait();

      expect(scope.value).toBe("from model");
    });

    ["button", "image", "reset", "submit"].forEach((type) => {
      it(`does not bind ${type} controls as value inputs`, async () => {
        const scope = $rootScope.new();

        app.innerHTML = `<input type="${type}" ng-model="value" value="clicked" />`;
        $compile(app)(scope);

        const input = defined(app.querySelector("input"));

        browserTrigger(input, "input");
        browserTrigger(input, "change");
        await wait();

        expect(scope.value).toBeUndefined();
      });
    });
  });
});

interface FixtureScope extends ng.Scope {
  "new"(childInstance?: ng.Scope): FixtureScope;
  newIsolate(childInstance?: ng.Scope): FixtureScope;
  value?: unknown;
  form?: FormController & { email: NgModelController; age: NgModelController };
}
