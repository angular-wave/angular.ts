import { NgModule } from "./ng-module.js";
import { $injectTokens as $t } from "../../../injection-tokens.js";

describe("NgModule", () => {
  /** @type {NgModule} */
  let ngModule;
  let a = {};
  let b = () => {
    /* empty */
  };
  let cf = () => {
    /* empty */
  };
  beforeEach(() => (ngModule = new NgModule("test", ["otherModule"])));

  it("can be instantiated", () => {
    expect(ngModule).toBeDefined();
    expect(ngModule.name).toBeDefined();
    expect(ngModule.name).toEqual("test");
    expect(ngModule._requires).toEqual(["otherModule"]);
  });

  it("can't be instantiated without name or dependencies", () => {
    expect(() => new NgModule()).toThrowError();
    expect(() => new NgModule("test")).toThrowError();
  });

  it("can store constants", () => {
    // when contants are registered
    ngModule.constant("aConstant", 42);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "constant",
      ["aConstant", 42],
    ]);

    // then they are prepended to invocation queue
    ngModule.constant("bConstant", 24);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "constant",
      ["bConstant", 24],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      $t._provide,
      "constant",
      ["aConstant", 42],
    ]);
  });

  it("can store values", () => {
    // when value are registered
    ngModule.value("aValue", 42);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "value",
      ["aValue", 42],
    ]);

    // then are pushed to invocation queue
    ngModule.value("bValue", 24);
    expect(ngModule._invokeQueue[1]).toEqual([
      $t._provide,
      "value",
      ["bValue", 24],
    ]);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "value",
      ["aValue", 42],
    ]);
  });

  it("can store config blocks", () => {
    // when config functions are registered
    let fn1 = () => {
      /* empty */
    };
    let fn2 = () => {
      /* empty */
    };
    ngModule.config(fn1);
    ngModule.config(fn2);

    // then they are appended to config queue
    expect(ngModule._configBlocks[0]).toEqual([$t._injector, "invoke", [fn1]]);
    expect(ngModule._configBlocks[1]).toEqual([$t._injector, "invoke", [fn2]]);
  });

  it("can store components", () => {
    ngModule.component("aComponent", a).component("bComponent", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._compileProvider,
      "component",
      ["aComponent", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      $t._compileProvider,
      "component",
      ["bComponent", b],
    ]);
    // Objects do not get a name
  });

  it("can store factories", () => {
    ngModule.factory("aFactory", a).factory("bFactory", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "factory",
      ["aFactory", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      $t._provide,
      "factory",
      ["bFactory", b],
    ]);
  });

  it("can store services", () => {
    ngModule.service("aService", a).service("bService", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "service",
      ["aService", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      $t._provide,
      "service",
      ["bService", b],
    ]);
  });

  it("can store providers", () => {
    ngModule.provider("aProvider", a).provider("bProvider", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._provide,
      "provider",
      ["aProvider", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      $t._provide,
      "provider",
      ["bProvider", b],
    ]);
  });

  it("can store decorators", () => {
    ngModule.decorator("aDecorator", a).decorator("bDecorator", b);
    expect(ngModule._configBlocks[0]).toEqual([
      $t._provide,
      "decorator",
      ["aDecorator", a],
    ]);

    expect(ngModule._configBlocks[1]).toEqual([
      $t._provide,
      "decorator",
      ["bDecorator", b],
    ]);
  });

  it("can store directives", () => {
    ngModule.directive("aDirective", a).directive("bDirective", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._compileProvider,
      "directive",
      ["aDirective", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      $t._compileProvider,
      "directive",
      ["bDirective", b],
    ]);
  });

  it("can store animations", () => {
    ngModule.animation("aAnimation", a).animation("bAnimation", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._animateProvider,
      "register",
      ["aAnimation", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      $t._animateProvider,
      "register",
      ["bAnimation", b],
    ]);
  });

  it("can store filters", () => {
    ngModule.filter("aFilter", cf).filter("bFilter", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._filterProvider,
      "register",
      ["aFilter", cf],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      $t._filterProvider,
      "register",
      ["bFilter", b],
    ]);
  });

  it("can store controllers", () => {
    ngModule.controller("aController", a).controller("bController", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      $t._controllerProvider,
      "register",
      ["aController", a],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      $t._controllerProvider,
      "register",
      ["bController", b],
    ]);
  });
});
