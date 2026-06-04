// @ts-nocheck
/// <reference types="jasmine" />
import { NgModule } from "./ng-module.js";
import { Angular } from "../../../angular.ts";
import { createInjector } from "../injector.ts";
import { ScopeElement } from "../../../services/web-component/web-component.ts";
import {
  _animateProvider,
  _compileProvider,
  _controllerProvider,
  _filterProvider,
  _injector,
  _machine,
  _provide,
  _workflow,
  _rest,
  _sse,
  _stateProvider,
  _wasm,
  _webComponent,
  _webTransport,
  _websocket,
  _worker,
} from "../../../injection-tokens.ts";

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
      .machine("sessionMachine", {
        initial: "setup",
        data: {},
        transitions: {},
      })
      .rest("posts", "/api/posts")
      .worker("backgroundWorker", "/workers/bg.js")
      .wasm("mathLib", "/wasm/math.wasm")
      .sse("notifications", "/events")
      .websocket("chat", "wss://chat.example.com", ["json"])
      .webTransport("live", "https://localhost:4433/webtransport");

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
      "sessionMachine",
      "posts",
      "backgroundWorker",
      "mathLib",
      "notifications",
      "chat",
      "live",
    ]);
    expect(ngModule._invokeQueue.map((item) => item[2][1][0])).toEqual([
      _machine,
      _rest,
      _worker,
      _wasm,
      _sse,
      _websocket,
      _webTransport,
    ]);
  });

  it("uses defaults when registering websocket with only required arguments", () => {
    ngModule.websocket("chat", "wss://chat.example.com");

    const websocketRegistration = ngModule._invokeQueue.find(
      (entry) => entry[2][0] === "chat",
    );
    const websocketFactory = websocketRegistration[2][1];
    const injector = {
      invoke: jasmine
        .createSpy("injectorInvoke")
        .and.callFake((value: any) => value()),
    };
    const websocketService = jasmine
      .createSpy("websocketService")
      .and.callFake((url, protocols, config) => ({
        url,
        protocols,
        config,
      }));

    const websocketResult = websocketFactory[2](websocketService, injector);

    expect(injector.invoke as jasmine.Spy).not.toHaveBeenCalled();
    expect(websocketResult).toEqual({
      url: "wss://chat.example.com",
      protocols: [],
      config: {},
    });
  });

  it("accepts URL objects when registering worker script paths", () => {
    const scriptPath = new URL("https://assets.example.com/bg.js");

    ngModule.worker("workerWithUrl", scriptPath);

    const workerRegistration = ngModule._invokeQueue.find(
      (entry) => entry[2][0] === "workerWithUrl",
    );
    const workerFactory = workerRegistration[2][1];
    const injector = {
      invoke: jasmine
        .createSpy("injectorInvoke")
        .and.callFake((value: any) => value()),
    };
    const workerService = jasmine
      .createSpy("workerService")
      .and.callFake((workerUrl, config) => ({
        workerUrl: String(workerUrl),
        config,
      }));

    const workerResult = workerFactory[2](workerService, injector);

    expect(injector.invoke as jasmine.Spy).not.toHaveBeenCalled();
    expect(workerResult).toEqual({
      workerUrl: "https://assets.example.com/bg.js",
      config: {},
    });
  });

  it("resolves dynamic wasm and worker configs when invoking the generated provider factories", () => {
    const resolveWasmImports = jasmine
      .createSpy("resolveWasmImports")
      .and.returnValue({
        env: { table: { name: "dynamic" } },
      });
    const resolveWasmOptions = jasmine
      .createSpy("resolveWasmOptions")
      .and.returnValue({
        raw: true,
      });
    const resolveWorkerScript = jasmine
      .createSpy("resolveWorkerScript")
      .and.returnValue("/workers/bg.js");
    const resolveWorkerConfig = jasmine
      .createSpy("resolveWorkerConfig")
      .and.returnValue({
        autoRestart: true,
      });

    ngModule
      .wasm(
        "mathLib",
        "/wasm/math.wasm",
        resolveWasmImports,
        resolveWasmOptions,
      )
      .worker("backgroundWorker", resolveWorkerScript, resolveWorkerConfig);

    const wasmRegistration = ngModule._invokeQueue.find(
      (entry) => entry[2][0] === "mathLib",
    );
    const workerRegistration = ngModule._invokeQueue.find(
      (entry) => entry[2][0] === "backgroundWorker",
    );

    const wasmFactory = wasmRegistration[2][1];
    const workerFactory = workerRegistration[2][1];

    const injectorInvoke = jasmine
      .createSpy("injectorInvoke")
      .and.callFake((value: any) => value());
    const injector = {
      invoke: injectorInvoke,
    };

    const wasmService = jasmine
      .createSpy("wasmService")
      .and.callFake((src, imports, opts) => ({
        src,
        imports,
        opts,
      }));
    const workerService = jasmine
      .createSpy("workerService")
      .and.callFake((scriptPath, config) => ({
        scriptPath,
        config,
      }));

    expect(wasmFactory).toEqual([_wasm, _injector, jasmine.any(Function)]);
    expect(workerFactory).toEqual([_worker, _injector, jasmine.any(Function)]);

    const wasmResult = wasmFactory[2](wasmService, injector);
    const workerResult = workerFactory[2](workerService, injector);

    expect(injector.invoke).toHaveBeenCalledTimes(4);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWasmImports);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWasmOptions);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWorkerScript);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWorkerConfig);

    expect(resolveWasmImports).toHaveBeenCalledTimes(1);
    expect(resolveWasmOptions).toHaveBeenCalledTimes(1);
    expect(resolveWorkerScript).toHaveBeenCalledTimes(1);
    expect(resolveWorkerConfig).toHaveBeenCalledTimes(1);

    expect(wasmResult).toEqual({
      src: "/wasm/math.wasm",
      imports: { env: { table: { name: "dynamic" } } },
      opts: { raw: true },
    });
    expect(workerResult).toEqual({
      scriptPath: "/workers/bg.js",
      config: { autoRestart: true },
    });
    expect(wasmService).toHaveBeenCalledTimes(1);
    expect(workerService).toHaveBeenCalledTimes(1);
  });

  it("resolves dynamic machine and workflow configs when invoking generated provider factories", () => {
    const resolveMachineData = {
      roomId: "resolver",
    };
    const resolveMachineConfig = jasmine
      .createSpy("resolveMachineConfig")
      .and.returnValue({
        initial: "setup",
        data: resolveMachineData,
        transitions: {
          setup: {
            join: jasmine.createSpy("joinTransition"),
          },
        },
      });

    const resolveWorkflowConfig = jasmine
      .createSpy("resolveWorkflowConfig")
      .and.returnValue({
        id: "docs-workflow",
        initial: "idle",
        data: { step: 1 },
        transitions: {},
      });

    ngModule
      .machine("sessionMachine", resolveMachineConfig)
      .workflow("docsWorkflow", resolveWorkflowConfig);

    const machineRegistration = ngModule._invokeQueue.find(
      (entry) => entry[2][0] === "sessionMachine",
    );
    const workflowRegistration = ngModule._invokeQueue.find(
      (entry) => entry[2][0] === "docsWorkflow",
    );

    const machineFactory = machineRegistration[2][1];
    const workflowFactory = workflowRegistration[2][1];

    const injectorInvoke = jasmine
      .createSpy("injectorInvoke")
      .and.callFake((value: any) => value());
    const injector = {
      invoke: injectorInvoke,
    };

    const machineService = jasmine
      .createSpy("machineService")
      .and.callFake((config) => ({
        ...config,
        data: config.data,
      }));
    const workflowService = jasmine
      .createSpy("workflowService")
      .and.callFake((config) => ({
        ...config,
        data: config.data,
      }));

    expect(machineFactory).toEqual([
      _machine,
      _injector,
      jasmine.any(Function),
    ]);
    expect(workflowFactory).toEqual([
      _workflow,
      _injector,
      jasmine.any(Function),
    ]);

    const machineResult = machineFactory[2](machineService, injector);
    const workflowResult = workflowFactory[2](workflowService, injector);

    expect(injector.invoke).toHaveBeenCalledTimes(2);
    expect(injector.invoke).toHaveBeenCalledWith(resolveMachineConfig);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWorkflowConfig);

    expect(resolveMachineConfig).toHaveBeenCalledTimes(1);
    expect(resolveWorkflowConfig).toHaveBeenCalledTimes(1);

    expect(machineService).toHaveBeenCalledTimes(1);
    expect(workflowService).toHaveBeenCalledTimes(1);

    const machineArgs = machineService.calls.mostRecent().args[0];
    const workflowArgs = workflowService.calls.mostRecent().args[0];
    const resolvedMachine = resolveMachineConfig.calls.mostRecent().returnValue;
    const resolvedWorkflow =
      resolveWorkflowConfig.calls.mostRecent().returnValue;

    expect(machineArgs.data).toEqual(resolveMachineData);
    expect(machineArgs.data).not.toBe(resolveMachineData);
    expect(machineResult).toEqual({
      ...resolvedMachine,
      data: machineArgs.data,
    });

    expect(workflowArgs.data).toEqual({ step: 1 });
    expect(workflowArgs.data).not.toBe(resolvedWorkflow.data);
    expect(workflowResult).toEqual({
      ...resolvedWorkflow,
      data: workflowArgs.data,
    });
  });

  it("registers named machines through the machine service", () => {
    const angular = new Angular();

    angular.module("machineApp", ["ng"]).machine("sessionMachine", {
      initial: "setup",
      data: {
        roomId: "",
      },
      transitions: {
        setup: {
          join(data, payload) {
            data.roomId = payload.roomId;
            return "waiting";
          },
        },
      },
    });

    const injector = createInjector(["machineApp"]);
    const sessionMachine = injector.get("sessionMachine");

    expect(sessionMachine.current).toBe("setup");
    expect(sessionMachine.send("join", { roomId: "abc" })).toBe(true);
    expect(sessionMachine.current).toBe("waiting");
    expect(sessionMachine.data.roomId).toBe("abc");
  });

  it("stores app component definitions as run blocks", () => {
    const options = {
      template: "<span>{{title}}</span>",
    };

    ngModule.appComponent("x-test-card", options);

    expect(ngModule._runBlocks.length).toBe(1);
    expect(ngModule._runBlocks[0][0]).toBe(_webComponent);
  });

  it("stores ScopeElement web component definitions as run blocks", () => {
    class TestCard extends ScopeElement {}

    ngModule.webComponent("x-native-test-card", TestCard);

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

  it("throws when state name and definition name mismatch", () => {
    expect(() =>
      ngModule.state("home", {
        name: "dashboard",
        url: "/",
      } as any),
    ).toThrowError("State name 'dashboard' does not match 'home'");
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
