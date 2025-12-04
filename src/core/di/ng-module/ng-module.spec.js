import {
  NgModule,
  COMPILE_LITERAL,
  ANIMATION_LITERAL,
  CONTROLLER_LITERAL,
} from "./ng-module.js";
import { $injectTokens } from "../../../injection-tokens.js";

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
      $injectTokens.$provide,
      "constant",
      ["aConstant", 42],
    ]);

    // then they are prepended to invocation queue
    ngModule.constant("bConstant", 24);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$provide,
      "constant",
      ["bConstant", 24],
    ]);
    expect(ngModule.invokeQueue[1]).toEqual([
      $injectTokens.$provide,
      "constant",
      ["aConstant", 42],
    ]);
  });

  it("can store values", () => {
    // when value are registered
    ngModule.value("aValue", 42);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$provide,
      "value",
      ["aValue", 42],
    ]);

    // then are pushed to invocation queue
    ngModule.value("bValue", 24);
    expect(ngModule.invokeQueue[1]).toEqual([
      $injectTokens.$provide,
      "value",
      ["bValue", 24],
    ]);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$provide,
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
    expect(ngModule.configBlocks[0]).toEqual([
      $injectTokens.$injector,
      "invoke",
      [fn1],
    ]);
    expect(ngModule.configBlocks[1]).toEqual([
      $injectTokens.$injector,
      "invoke",
      [fn2],
    ]);
  });

  it("can store components", () => {
    ngModule.component("aComponent", a).component("bComponent", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      COMPILE_LITERAL,
      "component",
      ["aComponent", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      COMPILE_LITERAL,
      "component",
      ["bComponent", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bComponent");
  });

  it("can store factories", () => {
    ngModule.factory("aFactory", a).factory("bFactory", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$provide,
      "factory",
      ["aFactory", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $injectTokens.$provide,
      "factory",
      ["bFactory", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bFactory");
  });

  it("can store services", () => {
    ngModule.service("aService", a).service("bService", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$provide,
      "service",
      ["aService", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $injectTokens.$provide,
      "service",
      ["bService", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bService");
  });

  it("can store providers", () => {
    ngModule.provider("aProvider", a).provider("bProvider", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$provide,
      "provider",
      ["aProvider", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      $injectTokens.$provide,
      "provider",
      ["bProvider", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bProvider");
  });

  it("can store decorators", () => {
    ngModule.decorator("aDecorator", a).decorator("bDecorator", b);
    expect(ngModule.configBlocks[0]).toEqual([
      $injectTokens.$provide,
      "decorator",
      ["aDecorator", a],
    ]);

    expect(ngModule.configBlocks[1]).toEqual([
      $injectTokens.$provide,
      "decorator",
      ["bDecorator", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bDecorator");
  });

  it("can store directives", () => {
    ngModule.directive("aDirective", a).directive("bDirective", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      COMPILE_LITERAL,
      "directive",
      ["aDirective", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      COMPILE_LITERAL,
      "directive",
      ["bDirective", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bDirective");
  });

  it("can store animations", () => {
    ngModule.animation("aAnimation", a).animation("bAnimation", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      ANIMATION_LITERAL,
      "register",
      ["aAnimation", a],
    ]);

    expect(ngModule.invokeQueue[1]).toEqual([
      ANIMATION_LITERAL,
      "register",
      ["bAnimation", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bAnimation");
  });

  it("can store filters", () => {
    ngModule.filter("aFilter", cf).filter("bFilter", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      $injectTokens.$filterProvider,
      "register",
      ["aFilter", cf],
    ]);
    expect(ngModule.invokeQueue[1]).toEqual([
      $injectTokens.$filterProvider,
      "register",
      ["bFilter", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bFilter");
  });

  it("can store controllers", () => {
    ngModule.controller("aController", a).controller("bController", b);
    expect(ngModule.invokeQueue[0]).toEqual([
      CONTROLLER_LITERAL,
      "register",
      ["aController", a],
    ]);
    expect(ngModule.invokeQueue[1]).toEqual([
      CONTROLLER_LITERAL,
      "register",
      ["bController", b],
    ]);
    // Objects do not get a name
    expect(a.$$moduleName).toBeUndefined();
    // Functions get a name
    expect(b.$$moduleName).toBe("bController");
  });
});
