import { NgModule } from "./ng-module.js";
import {
  _animateProvider,
  _compileProvider,
  _controllerProvider,
  _filterProvider,
  _injector,
  _provide,
  _rest,
  _sse,
  _wasm,
  _websocket,
  _worker,
} from "../../../injection-tokens.ts";

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
      _provide,
      "constant",
      ["aConstant", 42],
    ]);

    // then they are prepended to invocation queue
    ngModule.constant("bConstant", 24);
    expect(ngModule._invokeQueue[0]).toEqual([
      _provide,
      "constant",
      ["bConstant", 24],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      _provide,
      "constant",
      ["aConstant", 42],
    ]);
  });

  it("can store values", () => {
    // when value are registered
    ngModule.value("aValue", 42);
    expect(ngModule._invokeQueue[0]).toEqual([
      _provide,
      "value",
      ["aValue", 42],
    ]);

    // then are pushed to invocation queue
    ngModule.value("bValue", 24);
    expect(ngModule._invokeQueue[1]).toEqual([
      _provide,
      "value",
      ["bValue", 24],
    ]);
    expect(ngModule._invokeQueue[0]).toEqual([
      _provide,
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
    expect(ngModule._configBlocks[0]).toEqual([_injector, "invoke", [fn1]]);
    expect(ngModule._configBlocks[1]).toEqual([_injector, "invoke", [fn2]]);
  });

  it("can store components", () => {
    ngModule.component("aComponent", a).component("bComponent", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _compileProvider,
      "component",
      ["aComponent", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      _compileProvider,
      "component",
      ["bComponent", b],
    ]);
    // Objects do not get a name
  });

  it("can store factories", () => {
    ngModule.factory("aFactory", a).factory("bFactory", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _provide,
      "factory",
      ["aFactory", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      _provide,
      "factory",
      ["bFactory", b],
    ]);
  });

  it("can store services", () => {
    ngModule.service("aService", a).service("bService", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _provide,
      "service",
      ["aService", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      _provide,
      "service",
      ["bService", b],
    ]);
  });

  it("can store persistent stores", () => {
    const model = { counter: 0 };
    const backend = {
      getItem() {
        return null;
      },
      setItem() {
        /* empty */
      },
      removeItem() {
        /* empty */
      },
    };

    ngModule.store("aStore", model, "custom", { backend });

    expect(ngModule._invokeQueue[0][0]).toBe(_provide);
    expect(ngModule._invokeQueue[0][1]).toBe("store");
    expect(ngModule._invokeQueue[0][2][0]).toBe("aStore");
    expect(ngModule._invokeQueue[0][2][1]()).toBe(model);
    expect(ngModule._invokeQueue[0][2][2]).toBe("custom");
    expect(ngModule._invokeQueue[0][2][3]).toEqual({ backend });
  });

  it("stores high-level injectable helpers as provider factories", () => {
    ngModule
      .rest("posts", "/api/posts")
      .worker("backgroundWorker", "/workers/bg.js")
      .wasm("mathLib", "/wasm/math.wasm")
      .sse("notifications", "/events")
      .websocket("chat", "wss://chat.example.com", ["json"]);

    expect(ngModule._invokeQueue.map((item) => item[0])).toEqual([
      _provide,
      _provide,
      _provide,
      _provide,
      _provide,
    ]);
    expect(ngModule._invokeQueue.map((item) => item[1])).toEqual([
      "factory",
      "factory",
      "factory",
      "factory",
      "factory",
    ]);
    expect(ngModule._invokeQueue.map((item) => item[2][0])).toEqual([
      "posts",
      "backgroundWorker",
      "mathLib",
      "notifications",
      "chat",
    ]);
    expect(ngModule._invokeQueue.map((item) => item[2][1][0])).toEqual([
      _rest,
      _worker,
      _wasm,
      _sse,
      _websocket,
    ]);
  });

  it("can store providers", () => {
    ngModule.provider("aProvider", a).provider("bProvider", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _provide,
      "provider",
      ["aProvider", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      _provide,
      "provider",
      ["bProvider", b],
    ]);
  });

  it("can store decorators", () => {
    ngModule.decorator("aDecorator", a).decorator("bDecorator", b);
    expect(ngModule._configBlocks[0]).toEqual([
      _provide,
      "decorator",
      ["aDecorator", a],
    ]);

    expect(ngModule._configBlocks[1]).toEqual([
      _provide,
      "decorator",
      ["bDecorator", b],
    ]);
  });

  it("can store directives", () => {
    ngModule.directive("aDirective", a).directive("bDirective", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _compileProvider,
      "directive",
      ["aDirective", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      _compileProvider,
      "directive",
      ["bDirective", b],
    ]);
  });

  it("can store animations", () => {
    ngModule.animation("aAnimation", a).animation("bAnimation", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _animateProvider,
      "register",
      ["aAnimation", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      _animateProvider,
      "register",
      ["bAnimation", b],
    ]);
  });

  it("can store filters", () => {
    ngModule.filter("aFilter", cf).filter("bFilter", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _filterProvider,
      "register",
      ["aFilter", cf],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      _filterProvider,
      "register",
      ["bFilter", b],
    ]);
  });

  it("can store controllers", () => {
    ngModule.controller("aController", a).controller("bController", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      _controllerProvider,
      "register",
      ["aController", a],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      _controllerProvider,
      "register",
      ["bController", b],
    ]);
  });
});
