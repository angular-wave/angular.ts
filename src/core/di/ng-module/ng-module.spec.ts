// @ts-nocheck
/// <reference types="jasmine" />
import { NgModule } from "./ng-module.js";
import { Angular } from "../../../angular.ts";
import { createInjector } from "../injector.ts";
import {
  _animateProvider,
  _compileProvider,
  _controllerProvider,
  _eventBus,
  _filterProvider,
  _injector,
  _provide,
  _rest,
  _sse,
  _stateProvider,
  _wasm,
  _webComponent,
  _webTransport,
  _websocket,
  _worker,
} from "../../../injection-tokens.ts";
import { wait } from "../../../shared/utils.ts";

describe("NgModule", () => {
  /** @type {NgModule} */
  let ngModule;

  const a = {};

  const b = () => {
    /* empty */
  };

  const cf = () => {
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
    const fn1 = () => {
      /* empty */
    };

    const fn2 = () => {
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
      .websocket("chat", "wss://chat.example.com", ["json"])
      .webTransport("live", "https://localhost:4433/webtransport")
      .topic("taskEvents", "tasks");

    expect(ngModule._invokeQueue.map((item) => item[0])).toEqual([
      _provide,
      _provide,
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
      "factory",
      "factory",
    ]);
    expect(ngModule._invokeQueue.map((item) => item[2][0])).toEqual([
      "posts",
      "backgroundWorker",
      "mathLib",
      "notifications",
      "chat",
      "live",
      "taskEvents",
    ]);
    expect(ngModule._invokeQueue.map((item) => item[2][1][0])).toEqual([
      _rest,
      _worker,
      _wasm,
      _sse,
      _websocket,
      _webTransport,
      _eventBus,
    ]);
  });

  it("stores web component definitions as run blocks", () => {
    const options = {
      template: "<span>{{title}}</span>",
    };

    ngModule.webComponent("x-test-card", options);

    expect(ngModule._runBlocks.length).toBe(1);
    expect(ngModule._runBlocks[0][0]).toBe(_webComponent);
  });

  it("stores router states as config blocks", () => {
    const home = {
      name: "home",
      url: "/home",
      template: "<h1>Home</h1>",
    };

    ngModule.state(home).state("home.detail", {
      url: "/:id",
      template: "<h1>Detail</h1>",
    });

    expect(ngModule._configBlocks[0]).toEqual([
      _stateProvider,
      "state",
      [home],
    ]);
    expect(ngModule._configBlocks[1]).toEqual([
      _stateProvider,
      "state",
      [
        {
          name: "home.detail",
          url: "/:id",
          template: "<h1>Detail</h1>",
        },
      ],
    ]);
  });

  it("registers module states through the router provider", () => {
    const angular = new Angular();

    angular
      .module("stateApp", ["ng"])
      .state("home", {
        url: "/home",
        template: "<h1>Home</h1>",
      })
      .state({
        name: "home.detail",
        url: "/:id",
        template: "<h1>Detail</h1>",
      });

    const injector = createInjector(["stateApp"]);

    const registry = injector.get("$stateRegistry");

    expect(registry.get("home").name).toBe("home");
    expect(registry.get("home.detail").url).toBe("/:id");
  });

  it("registers topic-bound event bus helpers", async () => {
    const angular = new Angular();

    angular.module("topicApp", ["ng"]).topic("taskEvents", "tasks");

    const injector = createInjector(["topicApp"]);

    const taskEvents = injector.get("taskEvents");

    const eventBus = injector.get("$eventBus");

    const received = [];

    taskEvents.subscribe("saved", (task, source) => {
      received.push({ task, source });
    });

    expect(taskEvents.topic).toBe("tasks");
    expect(taskEvents.getCount("saved")).toBe(1);
    expect(eventBus.getCount("tasks:saved")).toBe(1);
    expect(eventBus.getCount("saved")).toBe(0);
    expect(taskEvents.publish("saved", { id: 1 }, "ui")).toBe(true);

    await wait();

    expect(received).toEqual([{ task: { id: 1 }, source: "ui" }]);
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
