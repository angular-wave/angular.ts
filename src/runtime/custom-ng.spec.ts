// @ts-nocheck
/// <reference types="jasmine" />
import { createAngular } from "./index.ts";
import { orchestrationModule } from "./orchestration.ts";
import { realtimeModule } from "./realtime.ts";
import { routerModule } from "./router.ts";
import { serviceWorkerModule } from "./service-worker.ts";
import { wasmModule } from "./wasm.ts";
import { defineAngularElement } from "./web-component.ts";
import {
  ngBindDirective,
  ngBrowserProviders,
  ngEventDirectives,
  ngRepeatDirective,
} from "../ng.ts";
import { createElementFromHTML, dealoc, getScope } from "../shared/dom.ts";
import { wait, waitUntil } from "../shared/test-utils.ts";

describe("custom runtime", () => {
  let element;

  let previousAngular;

  let nextElementId = 0;

  beforeEach(() => {
    previousAngular = window.angular;
  });

  afterEach(() => {
    dealoc(element);
    window.angular = previousAngular;
  });

  it("creates ng from core providers and a custom directive list", async () => {
    const angular = createAngular({
      directives: {
        ngBind: ngBindDirective,
        ngRepeat: ngRepeatDirective,
      },
    });

    const injector = angular.injector(["ng"]);

    const $compile = injector.get("$compile");

    const $rootScope = injector.get("$rootScope");

    $rootScope.items = ["a", "b"];
    element = createElementFromHTML(
      '<ul><li ng-repeat="item in items" ng-bind="item"></li></ul>',
    );

    $compile(element)($rootScope);
    await wait();

    expect(element.textContent).toBe("ab");
  });

  it("allows Beacon logging when a custom composition omits security", () => {
    const sendBeacon = spyOn(window.navigator, "sendBeacon").and.returnValue(
      true,
    );
    const angular = createAngular({
      providers: { $log: ngBrowserProviders.$log },
    });

    angular.module("beaconApp", []).config({
      $log: { beacon: { url: "/logs" } },
    });

    angular.injector(["ng", "beaconApp"]).get("$log").error("failure");

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    angular._composition.destroy();
  });

  it("applies custom exception-handler configuration", () => {
    const handled = [];
    const angular = createAngular();

    angular.module("exceptionApp", []).config({
      $exceptionHandler: {
        handler(error) {
          handled.push(error);
          throw error;
        },
      },
    });
    const handler = angular
      .injector(["ng", "exceptionApp"])
      .get("$exceptionHandler");
    const error = new Error("configured");

    expect(() => handler(error)).toThrow(error);
    expect(handled).toEqual([error]);
    angular._composition.destroy();
  });

  it("compiles controlled bindings without an SCE provider", async () => {
    const angular = createAngular();

    const injector = angular.injector(["ng"]);

    const $compile = injector.get("$compile");

    const $rootScope = injector.get("$rootScope");

    expect(() => injector.get("$sce")).toThrowError(/Unknown provider/);

    $rootScope.url = "javascript:controlled()";
    element = createElementFromHTML('<a href="{{url}}"></a>');

    $compile(element)($rootScope);
    await wait();

    expect(element.getAttribute("href")).toBe("javascript:controlled()");
  });

  it("allows custom runtimes to opt into the orchestration module", () => {
    const angular = createAngular({
      modules: [orchestrationModule],
    });

    const injector = angular.injector(["ng"]);

    expect(injector.has("$machine")).toBe(true);
    expect(injector.has("$workflow")).toBe(true);
  });

  it("keeps differently composed custom runtimes reactive on separate roots", async () => {
    const orchestrationAngular = createAngular({
      modules: [orchestrationModule],
    });
    const wasmAngular = createAngular({
      modules: [wasmModule],
    });
    const wasmElement = createElementFromHTML("<p>{{message}}</p>");

    element = createElementFromHTML("<p>{{message}}</p>");
    document.body.append(element, wasmElement);

    try {
      const orchestrationInjector = orchestrationAngular.bootstrap(element);
      const wasmInjector = wasmAngular.bootstrap(wasmElement);
      const orchestrationRoot = orchestrationInjector.get("$rootScope");
      const wasmRoot = wasmInjector.get("$rootScope");
      const wasmResource = wasmInjector.get("$wasm").load({
        source: "/src/directive/wasm/math.wasm",
      });

      orchestrationRoot.message = "orchestration runtime";
      wasmRoot.message = "wasm runtime";
      await wasmResource.ready;
      await wait();

      expect(element.textContent).toBe("orchestration runtime");
      expect(wasmElement.textContent).toBe("wasm runtime");
      expect(orchestrationInjector.get("$machine")).toEqual(
        jasmine.any(Function),
      );
      expect(wasmResource.exports.add(2, 3)).toBe(5);
    } finally {
      orchestrationAngular._composition.destroy();
      wasmAngular._composition.destroy();
      dealoc(wasmElement);
    }
  });

  it("bridges custom-runtime scope state through the opt-in WASM module", async () => {
    const angular = createAngular({
      modules: [wasmModule],
    });
    const injector = angular.injector(["ng"]);
    const rootScope = injector.get("$rootScope");
    const wasmResource = injector.get("$wasm").load({
      source: "/integrations/wasm/c/examples/todo/main.wasm",
    });
    const binding = await wasmResource.bind(rootScope, {
      name: "custom:player",
    });

    expect(binding.name).toBe("custom:player");
    expect(binding.target).toBe(rootScope);
    expect(binding.disposed).toBeFalse();

    angular._composition.destroy();

    expect(binding.disposed).toBeTrue();
    expect(wasmResource.disposed).toBeTrue();
  });

  it("applies realtime defaults and closes custom-runtime connections", () => {
    const RealWebSocket = window.WebSocket;
    const RealEventSource = window.EventSource;
    const webTransportDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "WebTransport",
    );
    const sockets = [];
    const eventSources = [];

    window.WebSocket = class MockWebSocket {
      constructor(url, protocols) {
        this.url = url;
        this.protocols = protocols;
        this.closeCalls = 0;
        sockets.push(this);
      }

      send() {}

      close() {
        this.closeCalls++;
        this.onclose?.({ type: "close", code: 1000 });
      }
    };
    window.EventSource = class MockEventSource {
      constructor(url, options) {
        this.url = url;
        this.options = options;
        this.listeners = {};
        eventSources.push(this);
      }

      addEventListener(type, listener) {
        this.listeners[type] = listener;
      }

      close() {}
    };
    Object.defineProperty(window, "WebTransport", {
      configurable: true,
      value: undefined,
    });

    const angular = createAngular({
      modules: [realtimeModule],
    });

    try {
      angular.module("realtimeApp", []).config({
        $sse: {
          defaults: { retryDelay: 250, maxRetries: 2 },
        },
        $websocket: {
          defaults: {
            protocols: ["json"],
            heartbeatTimeout: 0,
            maxRetries: 0,
          },
        },
        $webTransport: {
          defaults: { reconnect: true, retryDelay: 750, maxRetries: 3 },
        },
      });

      const injector = angular.injector(["ng", "realtimeApp"]);

      expect(injector.get("$sse")).toEqual(jasmine.any(Function));
      expect(injector.get("$webTransport")).toEqual(jasmine.any(Function));

      const events = injector.get("$sse")("/events");

      injector.get("$websocket")("ws://example.test/custom-runtime");
      expect(() =>
        injector.get("$webTransport")("https://localhost:4433/webtransport"),
      ).toThrowError("WebTransport API is not available in this browser");

      expect(eventSources.length).toBe(1);
      expect(sockets.length).toBe(1);
      expect(sockets[0].url).toBe("ws://example.test/custom-runtime");
      expect(sockets[0].protocols).toEqual(["json"]);

      events.close();

      angular._composition.destroy();

      expect(sockets[0].closeCalls).toBe(1);
    } finally {
      angular._composition.destroy();
      window.WebSocket = RealWebSocket;
      window.EventSource = RealEventSource;

      if (webTransportDescriptor) {
        Object.defineProperty(window, "WebTransport", webTransportDescriptor);
      } else {
        delete window.WebTransport;
      }
    }
  });

  it("renders inline and fetched routes through the custom router module", async () => {
    const realFetch = window.fetch;
    const initialUrl = window.location.href;
    const fetch = jasmine.createSpy("fetch").and.callFake((url) =>
      Promise.resolve(
        url === "/missing-route.html"
          ? new Response("missing", { status: 503, statusText: "Unavailable" })
          : new Response('<h2 data-testid="remote-route">Remote route</h2>', {
              headers: { "Content-Type": "text/html" },
              status: 200,
            }),
      ),
    );

    window.fetch = fetch;

    const angular = createAngular({
      modules: [routerModule],
    });

    angular
      .module("routerApp", [])
      .config({
        $anchorScroll: { autoScrolling: false },
        $aria: { diagnostics: true },
        $location: { html5Mode: false },
        $security: { allowInsecureOrigins: [] },
      })
      .router([
        {
          name: "inline",
          url: "/inline",
          template: '<h2 data-testid="inline-route">Inline route</h2>',
        },
        {
          name: "remote",
          url: "/remote",
          templateUrl: "/route-template.html",
        },
        {
          name: "missing",
          url: "/missing",
          templateUrl: "/missing-route.html",
        },
      ]);

    element = createElementFromHTML(`
      <main>
        <a ng-state="'remote'" data-state-active>Remote</a>
        <div ng-view></div>
      </main>
    `);
    document.body.append(element);

    try {
      const injector = angular.bootstrap(element, ["routerApp"]);
      const state = injector.get("$state");
      const security = injector.get("$security");

      expect(
        await security.check({
          operation: "request",
          transport: "http",
          method: "GET",
          url: "/private",
          credentials: "include",
        }),
      ).toEqual(jasmine.objectContaining({ type: "deny" }));

      await state.go("inline");
      await waitUntil(
        () => element.querySelector('[data-testid="inline-route"]') !== null,
      );

      expect(
        element.querySelector('[data-testid="inline-route"]'),
      ).not.toBeNull();

      await state.go("remote");
      await wait();

      expect(fetch).toHaveBeenCalledOnceWith("/route-template.html", {
        headers: { Accept: "text/html" },
      });
      expect(
        element.querySelector('[data-testid="remote-route"]'),
      ).not.toBeNull();
      expect(
        element.querySelector("a").getAttribute("data-state-current"),
      ).toBe("true");

      await expectAsync(state.go("missing")).toBeRejected();

      angular._composition.destroy();
    } finally {
      angular._composition.destroy();
      window.fetch = realFetch;
      window.history.replaceState(null, "", initialUrl);
    }
  });

  it("owns named service-worker registration and listeners through the custom runtime", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "serviceWorker",
    );
    const listeners = {};
    const registrationListeners = {};
    const registration = {
      scope: "/app/",
      updateViaCache: "imports",
      installing: null,
      waiting: null,
      active: null,
      addEventListener(type, listener) {
        registrationListeners[type] ??= [];
        registrationListeners[type].push(listener);
      },
      removeEventListener(type, listener) {
        registrationListeners[type] = (
          registrationListeners[type] ?? []
        ).filter((entry) => entry !== listener);
      },
    };
    const register = jasmine.createSpy("register").and.resolveTo(registration);
    const container = {
      controller: null,
      register,
      addEventListener(type, listener) {
        listeners[type] ??= [];
        listeners[type].push(listener);
      },
      removeEventListener(type, listener) {
        listeners[type] = (listeners[type] ?? []).filter(
          (entry) => entry !== listener,
        );
      },
    };

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: container,
    });

    const angular = createAngular({
      modules: [serviceWorkerModule],
    });

    try {
      angular.module("app", []).serviceWorker("/service-worker.js", {
        scope: "/app/",
        autoRegister: true,
      });

      const service = angular.injector(["ng", "app"]).get("$serviceWorker");
      const stopMessages = service.onMessage(() => undefined);

      await wait();

      expect(service.supported).toBeTrue();
      expect(service.status).toBe("registered");
      expect(register).toHaveBeenCalledOnceWith("/service-worker.js", {
        scope: "/app/",
      });
      expect(listeners.controllerchange.length).toBe(1);
      expect(listeners.message.length).toBe(1);
      expect(registrationListeners.updatefound.length).toBe(1);

      stopMessages();
      expect(listeners.message.length).toBe(0);

      service.onMessage(() => undefined);
      angular._composition.destroy();

      expect(listeners.controllerchange.length).toBe(0);
      expect(listeners.message.length).toBe(0);
      expect(registrationListeners.updatefound.length).toBe(0);
    } finally {
      angular._composition.destroy();

      if (descriptor) {
        Object.defineProperty(window.navigator, "serviceWorker", descriptor);
      } else {
        delete window.navigator.serviceWorker;
      }
    }
  });

  it("disposes the default service-worker facade during runtime teardown", () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "serviceWorker",
    );
    const addEventListener = jasmine.createSpy("addEventListener");
    const removeEventListener = jasmine.createSpy("removeEventListener");

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: null,
        addEventListener,
        removeEventListener,
      },
    });

    const angular = createAngular({
      modules: [serviceWorkerModule],
    });

    try {
      const injector = angular.injector(["ng"]);
      const service = injector.get("$serviceWorker");

      expect(service.supported).toBeTrue();
      expect(addEventListener).toHaveBeenCalledTimes(1);

      angular._composition.destroy();

      expect(removeEventListener).toHaveBeenCalledTimes(1);
    } finally {
      if (descriptor) {
        Object.defineProperty(window.navigator, "serviceWorker", descriptor);
      } else {
        delete window.navigator.serviceWorker;
      }
    }
  });

  it("attaches custom runtimes to window.angular", () => {
    const angular = createAngular();

    expect(window.angular).toBe(angular);
  });

  it("registers custom filters and services", () => {
    function CounterService() {
      this.value = 7;
    }

    const angular = createAngular({
      filters: {
        suffix: () => (value) => `${value}!`,
      },
      services: {
        counter: CounterService,
      },
    });

    const injector = angular.injector(["ng"]);

    expect(injector.get("$filter")("suffix")("ok")).toBe("ok!");
    expect(injector.get("counter").value).toBe(7);
  });

  it("applies interpolation config to the custom runtime compiler", async () => {
    const angular = createAngular();

    angular.module("app", []).config({
      $interpolate: { startSymbol: "[[", endSymbol: "]]" },
    });

    const injector = angular.injector(["ng", "app"]);
    const $rootScope = injector.get("$rootScope");

    $rootScope.name = "Ada";
    element = createElementFromHTML("<p>[[name]]</p>");
    injector.get("$compile")(element)($rootScope);
    await wait();

    expect(element.textContent).toBe("Ada");
    expect(injector.get("$interpolate").startSymbol()).toBe("[[");
  });

  it("includes the normal controller provider", async () => {
    function TodoController() {
      this.title = "custom controller";
    }

    const angular = createAngular();

    angular
      .module("app", [])
      .controller("TodoController", TodoController)
      .directive("todoCard", () => ({
        controller: "TodoController",
        controllerAs: "$ctrl",
        template: "<span>{{$ctrl.title}}</span>",
      }));

    const injector = angular.injector(["ng", "app"]);

    const $compile = injector.get("$compile");

    const $rootScope = injector.get("$rootScope");

    element = createElementFromHTML("<todo-card></todo-card>");

    $compile(element)($rootScope);
    await wait();

    expect(element.textContent).toBe("custom controller");
  });

  it("fetches directive templateUrl without a template request provider", async () => {
    const angular = createAngular();

    angular.module("app", []).directive("fetchedTemplate", () => ({
      templateUrl: "/public/test.html",
    }));

    const injector = angular.injector(["ng", "app"]);

    const $compile = injector.get("$compile");

    const $rootScope = injector.get("$rootScope");

    expect(() => injector.get("$templateRequest")).toThrowError(
      /Unknown provider/,
    );

    element = createElementFromHTML("<fetched-template></fetched-template>");

    $compile(element)($rootScope);
    await wait(100);

    expect(element.textContent.trim()).toBe("hello");
  });

  it("registers high-level injectables as services through provider factories", () => {
    class RestProvider {
      $get = () => (url, entityClass, options) => ({
        type: "rest",
        url,
        entityClass,
        options,
      });
    }

    class WorkerProvider {
      $get = () => (scriptPath, config) => ({
        type: "worker",
        scriptPath,
        config,
      });
    }

    class WasmProvider {
      $get = () => ({
        load: (config) => ({ type: "wasm", config }),
      });
    }

    class SseProvider {
      $get = () => (url, config) => ({ type: "sse", url, config });
    }

    class WebSocketProvider {
      $get = () => (url, config) => ({
        type: "websocket",
        url,
        config,
      });
    }

    class WebTransportProvider {
      $get = () => (url, config) => ({
        type: "webTransport",
        url,
        config,
      });
    }

    class PostEntity {}

    class Preferences {
      theme = "light";
    }

    const storedValues = new Map();

    const storageBackend = {
      getItem(key) {
        return storedValues.get(key) ?? null;
      },
      setItem(key, value) {
        storedValues.set(key, value);
      },
      removeItem(key) {
        storedValues.delete(key);
      },
    };

    const angular = createAngular({
      providers: {
        $rest: RestProvider,
        $worker: WorkerProvider,
        $wasm: WasmProvider,
        $sse: SseProvider,
        $webTransport: WebTransportProvider,
        $websocket: WebSocketProvider,
      },
    });

    angular
      .module("app", [])
      .rest("posts", "/api/posts", PostEntity, { cache: true })
      .worker("backgroundWorker", "/workers/bg.js", { reconnect: true })
      .wasm("mathLib", {
        source: "/wasm/math.wasm",
        imports: { env: { table: "mock" } },
      })
      .sse("notifications", "/events", { retryDelay: 10 })
      .websocket("chat", "wss://chat.example.com", {
        protocols: ["json"],
        maxRetries: 1,
      })
      .webTransport("live", "https://localhost:4433/webtransport", {
        requireUnreliable: true,
      })
      .store("prefs", Preferences, "custom", { backend: storageBackend });

    const injector = angular.injector(["ng", "app"]);

    expect(injector.get("posts")).toEqual({
      type: "rest",
      url: "/api/posts",
      entityClass: PostEntity,
      options: { cache: true },
    });
    expect(injector.get("backgroundWorker")).toEqual({
      type: "worker",
      scriptPath: "/workers/bg.js",
      config: { reconnect: true },
    });
    expect(injector.get("mathLib")).toEqual({
      type: "wasm",
      config: {
        source: "/wasm/math.wasm",
        imports: { env: { table: "mock" } },
      },
    });
    expect(injector.get("notifications")).toEqual({
      type: "sse",
      url: "/events",
      config: { retryDelay: 10 },
    });
    expect(injector.get("chat")).toEqual({
      type: "websocket",
      url: "wss://chat.example.com",
      config: { protocols: ["json"], maxRetries: 1 },
    });
    expect(injector.get("live")).toEqual({
      type: "webTransport",
      url: "https://localhost:4433/webtransport",
      config: { requireUnreliable: true },
    });

    const prefs = injector.get("prefs");

    expect(prefs.theme).toBe("light");

    prefs.theme = "dark";

    expect(JSON.parse(storedValues.get("prefs"))).toEqual({ theme: "dark" });
  });

  it("resolves high-level transport/service options from injectables", () => {
    class RestProvider {
      $get = () => (url, entityClass, options) => ({
        type: "rest",
        url,
        entityClass,
        options,
      });
    }

    class SseProvider {
      $get = () => (url, config) => ({ type: "sse", url, config });
    }

    class WebSocketProvider {
      $get = () => (url, config) => ({
        type: "websocket",
        url,
        config,
      });
    }

    class WebTransportProvider {
      $get = () => (url, config) => ({
        type: "webTransport",
        url,
        config,
      });
    }

    class WorkerProvider {
      $get = () => (scriptPath, config) => ({
        type: "worker",
        scriptPath,
        config,
      });
    }

    class WasmProvider {
      $get = () => ({
        load: (config) => ({ type: "wasm", config }),
      });
    }

    class PostEntity {}

    const calls = {
      rest: 0,
      sse: 0,
      websocketConfig: 0,
      webTransport: 0,
      workerScript: 0,
      workerConfig: 0,
      wasmConfig: 0,
    };

    const makeRestOptions = () => {
      calls.rest++;

      return { cache: true };
    };

    const makeSseConfig = () => {
      calls.sse++;

      return { retryDelay: 10 };
    };

    const makeWebsocketConfig = () => {
      calls.websocketConfig++;

      return { protocols: ["json"], maxRetries: 1 };
    };

    const makeWebTransportConfig = () => {
      calls.webTransport++;

      return { requireUnreliable: true };
    };

    const makeWorkerScript = () => {
      calls.workerScript++;

      return "/workers/bg.js";
    };

    const makeWorkerConfig = () => {
      calls.workerConfig++;

      return { reconnect: true };
    };

    const makeWasmConfig = () => {
      calls.wasmConfig++;

      return {
        source: "/wasm/math.wasm",
        imports: { env: { table: { name: "dynamic" } } },
      };
    };

    const angular = createAngular({
      providers: {
        $rest: RestProvider,
        $sse: SseProvider,
        $websocket: WebSocketProvider,
        $webTransport: WebTransportProvider,
        $worker: WorkerProvider,
        $wasm: WasmProvider,
      },
    });

    angular
      .module("app", [])
      .rest("posts", "/api/posts", PostEntity, makeRestOptions)
      .sse("notifications", "/events", makeSseConfig)
      .websocket("chat", "wss://chat.example.com", makeWebsocketConfig)
      .webTransport(
        "live",
        "https://localhost:4433/webtransport",
        makeWebTransportConfig,
      )
      .worker("backgroundWorker", makeWorkerScript, makeWorkerConfig)
      .wasm("mathLib", makeWasmConfig);

    const injector = angular.injector(["ng", "app"]);

    expect(injector.get("posts")).toEqual({
      type: "rest",
      url: "/api/posts",
      entityClass: PostEntity,
      options: { cache: true },
    });
    expect(injector.get("notifications")).toEqual({
      type: "sse",
      url: "/events",
      config: { retryDelay: 10 },
    });
    expect(injector.get("chat")).toEqual({
      type: "websocket",
      url: "wss://chat.example.com",
      config: { protocols: ["json"], maxRetries: 1 },
    });
    expect(injector.get("live")).toEqual({
      type: "webTransport",
      url: "https://localhost:4433/webtransport",
      config: { requireUnreliable: true },
    });
    expect(injector.get("backgroundWorker")).toEqual({
      type: "worker",
      scriptPath: "/workers/bg.js",
      config: { reconnect: true },
    });
    expect(injector.get("mathLib")).toEqual({
      type: "wasm",
      config: {
        source: "/wasm/math.wasm",
        imports: { env: { table: { name: "dynamic" } } },
      },
    });

    expect(calls).toEqual({
      rest: 1,
      sse: 1,
      websocketConfig: 1,
      webTransport: 1,
      workerScript: 1,
      workerConfig: 1,
      wasmConfig: 1,
    });
  });

  it("resolves named machine and workflow configs from injectables", () => {
    const appSettings = {
      initialMachine: "setup",
      initialWorkflow: "idle",
    };

    const makeMachineConfig = (settings) => {
      return {
        initial: settings.initialMachine,
        data: {
          attempt: 1,
        },
        states: {
          setup: {
            on: {
              start: {
                to: "started",
                update({ data }) {
                  data.attempt += 1;
                },
              },
            },
          },
          started: {
            on: {
              reset: {
                to: "setup",
                update({ data }) {
                  data.attempt = 1;
                },
              },
            },
          },
        },
      };
    };

    const makeWorkflowConfig = (settings) => {
      return {
        id: "docs-workflow",
        initial: settings.initialWorkflow,
        data: {
          attempt: 3,
        },
        commands: {
          start: {
            from: "idle",
            pending: "starting",
            success: {
              to: "running",
              update({ data }) {
                data.attempt += 1;
              },
            },
            failure: "failed",
          },
        },
      };
    };

    makeMachineConfig.$inject = ["appSettings"];
    makeWorkflowConfig.$inject = ["appSettings"];

    const angular = createAngular({
      modules: [orchestrationModule],
    });

    angular
      .module("app", [])
      .value("appSettings", appSettings)
      .machine("sessionMachine", makeMachineConfig)
      .workflow("docsWorkflow", makeWorkflowConfig);

    const injector = angular.injector(["ng", "app"]);

    const sessionMachine = injector.get("sessionMachine");
    const docsWorkflow = injector.get("docsWorkflow");

    expect(sessionMachine.state).toBe("setup");
    expect(sessionMachine.data).toEqual({ attempt: 1 });
    expect(docsWorkflow.state).toBe("idle");
    expect(docsWorkflow.data).toEqual({ attempt: 3 });
    expect(docsWorkflow.id).toBe("docs-workflow");
  });

  it("defines standalone AngularTS custom elements without host bootstrap", async () => {
    class LabelService {
      value = "custom runtime service";
    }

    const tagName = `x-runtime-card-${++nextElementId}`;

    const events = [];

    const definition = defineAngularElement(tagName, {
      modules: [orchestrationModule],
      directives: {
        ngClick: ngEventDirectives.ngClick,
      },
      services: {
        labelService: LabelService,
      },
      component: {
        shadow: true,
        inputs: {
          count: Number,
          title: String,
        },
        scope: {
          count: 1,
        },
        template: `
          <button ng-click="increment()">
            {{ title }} / {{ count }} / {{ label.value }}
          </button>
        `,
        connected({ dispatch, injector, scope }) {
          scope.label = injector.get("labelService");
          scope.increment = () => {
            scope.count++;
            dispatch("count-change", { count: scope.count });
          };
        },
      },
    });

    expect(definition.angular.$rootScope).toBeDefined();
    expect(definition.injector.get("labelService").value).toBe(
      "custom runtime service",
    );
    expect(definition.injector.has("$machine")).toBe(true);
    expect(definition.injector.has("$workflow")).toBe(true);
    expect(definition.element).toBe(customElements.get(tagName));

    element = document.createElement(tagName);
    element.title = "Standalone";
    element.count = 2;
    element.addEventListener("count-change", (event) => {
      events.push(event.detail.count);
    });

    document.getElementById("app").appendChild(element);

    await wait();
    await wait();

    expect(getScope(element).$parent.$id).toBe(
      definition.angular.$rootScope.$id,
    );
    expect(element.shadowRoot.textContent).toContain(
      "Standalone / 2 / custom runtime service",
    );

    element.shadowRoot.querySelector("button").click();

    await wait();

    expect(events).toEqual([3]);
    expect(element.shadowRoot.textContent).toContain(
      "Standalone / 3 / custom runtime service",
    );

    element.remove();
    await wait(10);
    definition.angular._composition.destroy();
  });

  it("defines a standalone element without additional runtime modules", () => {
    const tagName = `x-runtime-minimal-${++nextElementId}`;
    const definition = defineAngularElement(tagName, {
      component: { template: "minimal" },
    });

    expect(definition.angular.injector(["ng"]).has("$compile")).toBeTrue();
    definition.angular._composition.destroy();
  });

  it("clears parsed component binding definitions during runtime teardown", () => {
    const angular = createAngular();

    angular.module("bindingCacheApp", []).component("cachedBinding", {
      bindings: { value: "<sourceValue" },
      template: "{{ $ctrl.value }}",
    });
    const injector = angular.injector(["ng", "bindingCacheApp"]);
    const scope = injector.get("$rootScope");
    const element = injector.get("$compile")(
      '<cached-binding value="value"></cached-binding>',
    )(scope);

    angular._composition.destroy();

    expect(element).toBeDefined();
  });
});
