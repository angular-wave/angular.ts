import { NgModule } from "./ng-module.js";
import { $injectTokens as $t } from "../../../injection-tokens.js";

describe("NgModule", () => {
  /** @type {NgModule} */
  let ngModule;
  let a = new Object();
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
    expect(ngModule.requires).toEqual(["otherModule"]);
  });

  it("can't be instantiated without name or dependencies", () => {
    expect(() => new NgModule()).toThrowError();
    expect(() => new NgModule("test")).toThrowError();
  });

  it("can store constants", () => {
    // when contants are registered
    ngModule.constant("aConstant", 42);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
      "constant",
      ["aConstant", 42],
    ]);

    // then they are prepended to invocation queue
    ngModule.constant("bConstant", 24);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
      "constant",
      ["bConstant", 24],
    ]);
    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$provide,
      "constant",
      ["aConstant", 42],
    ]);
  });

  it("can store values", () => {
    // when value are registered
    ngModule.value("aValue", 42);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
      "value",
      ["aValue", 42],
    ]);

    // then are pushed to invocation queue
    ngModule.value("bValue", 24);
    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$provide,
      "value",
      ["bValue", 24],
    ]);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
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
    expect(ngModule.configBlocks[0]).toEqual([$t.$injector, "invoke", [fn1]]);
    expect(ngModule.configBlocks[1]).toEqual([$t.$injector, "invoke", [fn2]]);
  });

  it("can store components", () => {
    ngModule.component("aComponent", a).component("bComponent", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$compileProvider,
      "component",
      ["aComponent", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$compileProvider,
      "component",
      ["bComponent", b],
    ]);
    // Objects do not get a name
  });

  it("can store factories", () => {
    ngModule.factory("aFactory", a).factory("bFactory", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
      "factory",
      ["aFactory", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$provide,
      "factory",
      ["bFactory", b],
    ]);
  });

  it("can store services", () => {
    ngModule.service("aService", a).service("bService", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
      "service",
      ["aService", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$provide,
      "service",
      ["bService", b],
    ]);
  });

  it("can store providers", () => {
    ngModule.provider("aProvider", a).provider("bProvider", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$provide,
      "provider",
      ["aProvider", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$provide,
      "provider",
      ["bProvider", b],
    ]);
  });

  it("can store decorators", () => {
    ngModule.decorator("aDecorator", a).decorator("bDecorator", b);
    expect(ngModule.configBlocks[0]).toEqual([
      $t.$provide,
      "decorator",
      ["aDecorator", a],
    ]);

    expect(ngModule.configBlocks[1]).toEqual([
      $t.$provide,
      "decorator",
      ["bDecorator", b],
    ]);
  });

  it("can store directives", () => {
    ngModule.directive("aDirective", a).directive("bDirective", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$compileProvider,
      "directive",
      ["aDirective", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$compileProvider,
      "directive",
      ["bDirective", b],
    ]);
  });

  it("can store animations", () => {
    ngModule.animation("aAnimation", a).animation("bAnimation", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$animateProvider,
      "register",
      ["aAnimation", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$animateProvider,
      "register",
      ["bAnimation", b],
    ]);
  });

  it("can store filters", () => {
    ngModule.filter("aFilter", cf).filter("bFilter", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$filterProvider,
      "register",
      ["aFilter", cf],
    ]);
    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$filterProvider,
      "register",
      ["bFilter", b],
    ]);
  });

  it("can store controllers", () => {
    ngModule.controller("aController", a).controller("bController", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $t.$controllerProvider,
      "register",
      ["aController", a],
    ]);
    expect(ngModule.invokeQueue[1]).toEqual([
      $t.$controllerProvider,
      "register",
      ["bController", b],
    ]);
  });
});
