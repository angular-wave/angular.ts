import { createAngularCustom } from "./index.ts";
import { defineAngularElement } from "./web-component.ts";
import { ngBindDirective } from "../directive/bind/bind.ts";
import { ngClickDirective } from "../directive/events/events.ts";
import { ngRepeatDirective } from "../directive/repeat/repeat.ts";
import { createElementFromHTML, dealoc, getScope } from "../shared/dom.ts";
import { wait } from "../shared/test-utils.ts";

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
    const angular = createAngularCustom({
      attachToWindow: true,
      ngModule: {
        directives: {
          ngBind: ngBindDirective,
          ngRepeat: ngRepeatDirective,
        },
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

  it("compiles controlled bindings without an SCE provider", async () => {
    const angular = createAngularCustom({ attachToWindow: true });
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

  it("does not attach bare custom runtimes to window.angular by default", () => {
    const previousAngular = window.angular;

    const angular = createAngularCustom();

    expect(window.angular).toBe(previousAngular);
    expect(angular).toBeDefined();
  });

  it("registers custom filters and services", () => {
    function CounterService() {
      this.value = 7;
    }

    const angular = createAngularCustom({
      attachToWindow: true,
      ngModule: {
        filters: {
          suffix: () => (value) => `${value}!`,
        },
        services: {
          counter: CounterService,
        },
      },
    });
    const injector = angular.injector(["ng"]);

    expect(injector.get("$filter")("suffix")("ok")).toBe("ok!");
    expect(injector.get("counter").value).toBe(7);
  });

  it("includes the normal controller provider", async () => {
    function TodoController() {
      this.title = "custom controller";
    }

    const angular = createAngularCustom({ attachToWindow: true });

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
    const angular = createAngularCustom({ attachToWindow: true });

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
      $get = () => (src, imports, opts) => ({
        type: "wasm",
        src,
        imports,
        opts,
      });
    }

    class SseProvider {
      $get = () => (url, config) => ({ type: "sse", url, config });
    }

    class WebSocketProvider {
      $get = () => (url, protocols, config) => ({
        type: "websocket",
        url,
        protocols,
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

    const angular = createAngularCustom({
      attachToWindow: true,
      ngModule: {
        providers: {
          $rest: RestProvider,
          $worker: WorkerProvider,
          $wasm: WasmProvider,
          $sse: SseProvider,
          $webTransport: WebTransportProvider,
          $websocket: WebSocketProvider,
        },
      },
    });

    angular
      .module("app", [])
      .rest("posts", "/api/posts", PostEntity, { cache: true })
      .worker("backgroundWorker", "/workers/bg.js", { autoRestart: true })
      .wasm(
        "mathLib",
        "/wasm/math.wasm",
        { env: { table: "mock" } },
        {
          raw: true,
        },
      )
      .sse("notifications", "/events", { retryDelay: 10 })
      .websocket("chat", "wss://chat.example.com", ["json"], {
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
      config: { autoRestart: true },
    });
    expect(injector.get("mathLib")).toEqual({
      type: "wasm",
      src: "/wasm/math.wasm",
      imports: { env: { table: "mock" } },
      opts: { raw: true },
    });
    expect(injector.get("notifications")).toEqual({
      type: "sse",
      url: "/events",
      config: { retryDelay: 10 },
    });
    expect(injector.get("chat")).toEqual({
      type: "websocket",
      url: "wss://chat.example.com",
      protocols: ["json"],
      config: { maxRetries: 1 },
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

  it("defines standalone AngularTS custom elements without host bootstrap", async () => {
    class LabelService {
      value = "custom runtime service";
    }

    const tagName = `x-runtime-card-${++nextElementId}`;
    const events = [];

    const definition = defineAngularElement(tagName, {
      ngModule: {
        directives: {
          ngClick: ngClickDirective,
        },
        services: {
          labelService: LabelService,
        },
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
  });
});
