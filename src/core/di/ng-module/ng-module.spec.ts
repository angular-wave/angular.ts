// @ts-nocheck
/// <reference types="jasmine" />
import { NgModule } from "./ng-module.js";
import { Angular } from "../../../angular.ts";
import { createInjector } from "../injector.ts";
import { ScopeElement } from "../../../services/web-component/web-component.ts";
import { wait } from "../../../shared/test-utils.ts";
import {
  _anchorScroll,
  _aria,
  _cookie,
  _eventBus,
  _exceptionHandler,
  _htmlCanvas,
  _http,
  _injector,
  _interpolate,
  _log,
  _location,
  _machine,
  _workflow,
  _rest,
  _rootElement,
  _sce,
  _sceDelegate,
  _serviceWorker,
  _sse,
  _templateCache,
  _templateRequest,
  _wasm,
  _security,
  _webComponent,
  _webTransport,
  _websocket,
  _worker,
} from "../../../injection-tokens.ts";
import { routerRuntimeConfigKey } from "../../../router/composition/router-runtime.ts";

function createRuntimeInjector(angular, modules) {
  return createInjector(
    modules,
    false,
    (registry) => {
      registry.value(_rootElement, document.createElement("div"));
    },
    (name) => angular.module(name),
  );
}

function inspectProviderCommand(command) {
  let registration;
  const registry = {};

  [
    "constant",
    "decorator",
    "factory",
    "provider",
    "service",
    "store",
    "value",
  ].forEach((method) => {
    registry[method] = (...args) => {
      registration = { method, args };

      return {};
    };
  });

  command.register(registry);

  return registration;
}

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
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "constant",
      args: ["aConstant", 42],
    });

    // then they are prepended to invocation queue
    ngModule.constant("bConstant", 24);
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "constant",
      args: ["bConstant", 24],
    });
    expect(inspectProviderCommand(ngModule._invokeQueue[1])).toEqual({
      method: "constant",
      args: ["aConstant", 42],
    });
  });

  it("can store values", () => {
    // when value are registered
    ngModule.value("aValue", 42);
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "value",
      args: ["aValue", 42],
    });

    // then are pushed to invocation queue
    ngModule.value("bValue", 24);
    expect(inspectProviderCommand(ngModule._invokeQueue[1])).toEqual({
      method: "value",
      args: ["bValue", 24],
    });
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "value",
      args: ["aValue", 42],
    });
  });

  it("can store app-owned reactive models as provider factories", () => {
    const initial = { name: "John", authenticated: false };

    expect(ngModule.model("user", initial)).toBe(ngModule);

    expect(ngModule._models.get("user")).toEqual(jasmine.any(Function));
    const registration = inspectProviderCommand(ngModule._invokeQueue[0]);

    expect(registration.method).toBe("factory");
    expect(registration.args[0]).toBe("user");
    expect(registration.args[1][0]).toBe(_injector);

    const registerModel = spyOn(
      ngModule._appContext,
      "registerModel",
    ).and.returnValue({ name: "John" } as never);
    const injector = {};
    const modelFactory = registration.args[1][1];

    expect(modelFactory(injector)).toEqual({ name: "John" });
    expect(registerModel).toHaveBeenCalledOnceWith(
      "user",
      ngModule._models.get("user"),
      { injector },
    );
  });

  it("clones literal model roots when AppContext creates a model", () => {
    const initial = { nested: { count: 0 } };

    ngModule.model("counter", initial);

    const injector = {};
    const modelFactory = inspectProviderCommand(ngModule._invokeQueue[0])
      .args[1][1];
    const model = modelFactory(injector);

    model.nested.count = 1;

    expect(initial.nested.count).toBe(0);
  });

  it("accepts null-prototype literal model roots", () => {
    const initial = Object.create(null);

    initial.name = "John";

    ngModule.model("nullPrototypeUser", initial);

    const injector = {};
    const modelFactory = inspectProviderCommand(ngModule._invokeQueue[0])
      .args[1][1];
    const model = modelFactory(injector);

    expect(model.name).toBe("John");
  });

  it("falls back to shallow cloning when literal model roots are not structured cloneable", () => {
    const initial = {
      count: 0,
      increment() {
        this.count += 1;
      },
    };

    ngModule.model("withMethod", initial);

    const injector = {};
    const modelFactory = inspectProviderCommand(ngModule._invokeQueue[0])
      .args[1][1];
    const model = modelFactory(injector);

    model.increment();

    expect(model.count).toBe(1);
    expect(initial.count).toBe(0);
  });

  it("rejects duplicate model names inside the same module", () => {
    ngModule.model("user", { name: "John" });

    expect(() => {
      ngModule.model("user", { name: "Jane" });
    }).toThrowError("Model 'user' is already registered.");
  });

  it("rejects invalid model declarations", () => {
    expect(() => {
      ngModule.model("$bad", 0);
    }).toThrowError();

    expect(() => {
      ngModule.model("items", []);
    }).toThrowError();
  });

  it("can store internal config blocks", () => {
    // when internal config functions are registered
    const fn1 = () => {
      /* empty */
    };

    const fn2 = () => {
      /* empty */
    };

    ngModule._config(fn1);
    ngModule._config(fn2);

    // then they are appended to config queue
    expect(ngModule._configBlocks[0]).toEqual([_injector, "invoke", [fn1]]);
    expect(ngModule._configBlocks[1]).toEqual([_injector, "invoke", [fn2]]);
  });

  it("can store keyed built-in config blocks", () => {
    ngModule.config({ $compile: { strictComponentBindingsEnabled: true } });
    ngModule.config({ $anchorScroll: { autoScrolling: false } });
    ngModule.config({ $aria: { ariaDisabled: false } });
    ngModule.config({ $log: { debug: true } });
    ngModule.config({ $cookie: { defaults: { path: "/" } } });
    ngModule.config({
      $exceptionHandler: {
        handler(error) {
          throw error;
        },
      },
    });
    ngModule.config({
      $eventBus: {
        deliveryPolicy: () => "deliver",
      },
    });
    ngModule.config({
      $http: {
        defaults: {
          headers: {
            common: {
              Authorization: "Bearer token",
            },
          },
          withCredentials: true,
        },
        interceptors: [
          () => ({
            request(config) {
              return config;
            },
          }),
        ],
        xsrfTrustedOrigins: ["https://api.example.com"],
      },
    });
    ngModule.config({ $interpolate: { startSymbol: "[[", endSymbol: "]]" } });
    ngModule.config({ $location: { html5Mode: true } });
    ngModule.config({ $sce: { enabled: true } });
    ngModule.config({
      $sceDelegate: {
        trustedResourceUrlList: ["self", "https://cdn.example.com/**"],
        bannedResourceUrlList: ["https://cdn.example.com/private/**"],
        aHrefSanitizationTrustedUrlList: /^https?:/,
        imgSrcSanitizationTrustedUrlList: /^\s*(https?|data:image\/)/,
      },
    });
    ngModule.config({
      $templateCache: {
        cache: new Map([["cached.html", "<p>Cached</p>"]]),
      },
    });
    ngModule.config({
      $templateRequest: {
        httpOptions: {
          headers: {
            "X-Template": "configured",
          },
          withCredentials: true,
        },
      },
    });
    ngModule.config({
      $rest: {
        defaults: {
          withCredentials: true,
        },
      },
    });
    ngModule.config({
      $router: {
        strict: false,
        caseInsensitive: true,
        defaultSquash: "~",
      },
    });
    ngModule.config({
      $security: {
        fallback: "allow",
        allowInsecureOrigins: [window.location.origin],
        credentials: {
          bearer: "token",
          cookie: true,
          order: ["bearer", "cookie"],
        },
      },
    });
    ngModule.config({ $htmlCanvas: { enabled: false } });
    ngModule.config({
      $webComponent: {
        defaults: {
          shadow: true,
        },
      },
    });
    ngModule.config({
      $sse: {
        defaults: {
          withCredentials: true,
          retryDelay: 500,
          maxRetries: 3,
        },
      },
    });
    ngModule.config({
      $websocket: {
        defaults: {
          protocols: ["json"],
          heartbeatTimeout: 20_000,
        },
      },
    });
    ngModule.config({
      $webTransport: {
        defaults: {
          reconnect: true,
          retryDelay: 250,
          maxRetries: 2,
        },
      },
    });

    expect(ngModule._configBlocks[0]).toEqual([
      ngModule._compileRegistry,
      "configure",
      [{ strictComponentBindingsEnabled: true }],
    ]);
    const runtimeConfigBlocks = ngModule._configBlocks
      .slice(1)
      .filter((block) => block[0] === ngModule._runtimeConfig);

    expect(runtimeConfigBlocks.map((block) => block[2][0])).toEqual([
      _anchorScroll,
      _aria,
      _log,
      _cookie,
      _exceptionHandler,
      _eventBus,
      _http,
      _interpolate,
      _location,
      _sce,
      _sceDelegate,
      _templateCache,
      _templateRequest,
      _rest,
      routerRuntimeConfigKey,
      _security,
      _htmlCanvas,
      _webComponent,
      _sse,
      _websocket,
      _webTransport,
    ]);
  });

  it("can store object built-in config blocks", () => {
    ngModule.config({
      $compile: {
        strictComponentBindingsEnabled: true,
        propertySecurityContexts: [
          {
            elementName: "div",
            propertyName: "title",
            context: "mediaUrl",
          },
        ],
      },
      $anchorScroll: { autoScrolling: false },
      $aria: { ariaDisabled: false },
      $cookie: { defaults: { path: "/" } },
      $eventBus: { deliveryPolicy: () => "deliver" },
      $exceptionHandler: {
        handler(error) {
          throw error;
        },
      },
      $http: {
        defaults: {
          withCredentials: true,
        },
        xsrfTrustedOrigins: ["https://api.example.com"],
      },
      $interpolate: { startSymbol: "[[", endSymbol: "]]" },
      $location: { hashPrefix: "!" },
      $log: { debug: true },
      $sce: { enabled: true },
      $sceDelegate: {
        trustedResourceUrlList: ["self"],
      },
      $templateCache: {
        cache: new Map(),
      },
      $templateRequest: {
        httpOptions: {
          withCredentials: true,
        },
      },
      $rest: {
        defaults: {
          timeout: 1000,
        },
      },
      $router: {
        strict: false,
        caseInsensitive: true,
        defaultSquash: true,
      },
      $security: {
        fallback: "deny",
        allowInsecureOrigins: [],
        credentials: {
          basic: { username: "user", password: "password" },
        },
        permissions: ["admin:read"],
      },
      $sse: {
        defaults: {
          eventTypes: ["notice"],
          heartbeatTimeout: 5000,
        },
      },
      $websocket: {
        defaults: {
          protocols: ["json"],
          heartbeatTimeout: 0,
        },
      },
      $webTransport: {
        defaults: {
          reconnect: true,
          retryDelay: 25,
        },
      },
    });

    expect(ngModule._configBlocks[0]).toEqual([
      ngModule._compileRegistry,
      "configure",
      [
        {
          strictComponentBindingsEnabled: true,
          propertySecurityContexts: [
            {
              elementName: "div",
              propertyName: "title",
              context: "mediaUrl",
            },
          ],
        },
      ],
    ]);
    const runtimeConfigBlocks = ngModule._configBlocks
      .slice(1)
      .filter((block) => block[0] === ngModule._runtimeConfig);

    expect(runtimeConfigBlocks.map((block) => block[2][0])).toEqual([
      _anchorScroll,
      _aria,
      _cookie,
      _exceptionHandler,
      _eventBus,
      _http,
      _interpolate,
      _log,
      _location,
      _sce,
      _sceDelegate,
      _templateCache,
      _templateRequest,
      _rest,
      routerRuntimeConfigKey,
      _security,
      _sse,
      _websocket,
      _webTransport,
    ]);
  });

  it("rejects unknown built-in config keys", () => {
    expect(() => ngModule.config({ missing: {} })).toThrowError(
      "Unknown AngularTS config key 'missing'.",
    );
    expect(() => ngModule.config({ http: {} })).toThrowError(
      "Unknown AngularTS config key 'http'.",
    );
    expect(() => ngModule.config({ security: {} })).toThrowError(
      "Unknown AngularTS config key 'security'.",
    );
  });

  it("registers html canvas config for the runtime service", () => {
    expect(ngModule.config({ $htmlCanvas: { enabled: false } })).toBe(ngModule);
    expect(ngModule._configBlocks.length).toBe(1);
    expect(
      ngModule.config({
        $htmlCanvas: {
          enabled: true,
          throwOnUnsupported: true,
          defaultScheduler: "paint",
          defaultMode: "2d",
        },
      }),
    ).toBe(ngModule);
    expect(
      ngModule.config({
        $htmlCanvas: {
          enabled: "auto",
          throwOnUnsupported: true,
          defaultScheduler: "raf",
          defaultMode: "webgl",
        },
      }),
    ).toBe(ngModule);
  });

  it("applies built-in config during config phase", async () => {
    window.angular = new Angular();
    const configured = window.angular.module("configured", []);
    const compileRegistry = configured._compileRegistry;
    let routerProvider;
    const configuredError = new Error("configured");
    const aHrefPattern = /^https?:/;
    const imgSrcPattern = /^\s*(https?|data:image\/)/;
    const logCalls = [];
    const configuredLogger = () => ({
      debug: (...args) => {
        logCalls.push(["debug", ...args]);
      },
      error: (...args) => {
        logCalls.push(["error", ...args]);
      },
      info: (...args) => {
        logCalls.push(["info", ...args]);
      },
      log: (...args) => {
        logCalls.push(["log", ...args]);
      },
      warn: (...args) => {
        logCalls.push(["warn", ...args]);
      },
    });
    const httpInterceptor = jasmine
      .createSpy("httpInterceptor")
      .and.returnValue({
        request(config) {
          return config;
        },
      });
    const templateCache = new Map([["cached.html", "<p>Cached</p>"]]);

    configured
      .config({
        $compile: {
          strictComponentBindingsEnabled: true,
          propertySecurityContexts: [
            {
              elementName: "div",
              propertyName: "title",
              context: "mediaUrl",
            },
          ],
        },
      })
      .config({ $anchorScroll: { autoScrolling: false } })
      .config({ $aria: { ariaDisabled: false, bindKeydown: false } })
      .config({ $log: { debug: true, logger: configuredLogger } })
      .config({ $cookie: { defaults: { path: "/" } } })
      .config({
        $exceptionHandler: {
          handler() {
            throw configuredError;
          },
        },
      })
      .config({
        $http: {
          defaults: {
            headers: {
              delete: {
                "X-Delete": "configured",
              },
              common: {
                Authorization: "Bearer token",
              },
              post: {
                "X-Mode": "configured",
              },
            },
            withCredentials: true,
            xsrfCookieName: "APP-XSRF",
            xsrfHeaderName: "X-APP-XSRF",
          },
          interceptors: [httpInterceptor],
          xsrfTrustedOrigins: ["https://api.example.com"],
        },
      })
      .config({ $interpolate: { startSymbol: "[[", endSymbol: "]]" } })
      .config({
        $location: {
          html5Mode: {
            enabled: true,
            requireBase: false,
            rewriteLinks: "internal-link",
          },
          hashPrefix: "!",
        },
      })
      .config({ $sce: { enabled: false } })
      .config({
        $sceDelegate: {
          trustedResourceUrlList: ["self", "https://cdn.example.com/**"],
          bannedResourceUrlList: ["https://cdn.example.com/private/**"],
          aHrefSanitizationTrustedUrlList: aHrefPattern,
          imgSrcSanitizationTrustedUrlList: imgSrcPattern,
        },
      })
      .config({ $templateCache: { cache: templateCache } })
      .config({
        $templateRequest: {
          httpOptions: {
            headers: {
              "X-Template": "configured",
            },
            withCredentials: true,
          },
        },
      })
      .config({
        $rest: {
          defaults: {
            timeout: 1200,
          },
        },
      })
      .config({
        $router: {
          strict: false,
          caseInsensitive: true,
          defaultSquash: "~",
        },
      })
      .config({
        $security: {
          fallback: "deny",
          allowInsecureOrigins: [window.location.origin],
          credentials: {
            bearer: () => "token",
            cookie: true,
            order: ["bearer", "cookie"],
          },
          permissions: ["admin:read"],
        },
      })
      .config({
        $sse: {
          defaults: {
            withCredentials: true,
            params: {
              topic: "alerts",
            },
            retryDelay: 500,
            maxRetries: 3,
            heartbeatTimeout: 6000,
          },
        },
      })
      .config({
        $websocket: {
          defaults: {
            protocols: ["json"],
            retryDelay: 750,
            maxRetries: 4,
            heartbeatTimeout: 9000,
          },
        },
      })
      .config({
        $webTransport: {
          defaults: {
            allowPooling: true,
            congestionControl: "low-latency",
            reconnect: true,
            retryDelay: 250,
            maxRetries: 2,
          },
        },
      });

    const injector = createRuntimeInjector(window.angular, [
      "ng",
      configured.name,
    ]);
    const $anchorScroll = injector.get("$anchorScroll");
    const $aria = injector.get("$aria");
    const $http = injector.get("$http");
    const $security = injector.get("$security");
    routerProvider = injector.get("$state")._routerState;

    spyOn(window, "scrollTo");
    injector
      .get("$rootScope")
      .$broadcast(
        "$locationChangeSuccess",
        "https://example.test/#top",
        "https://example.test/#previous",
      );
    await wait();

    expect($anchorScroll).toBeDefined();
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(compileRegistry.strictComponentBindingsEnabled()).toBeTrue();
    expect($aria.config("ariaDisabled")).toBeFalse();
    expect($aria.config("bindKeydown")).toBeFalse();
    expect($aria.config("ariaHidden")).toBeTrue();
    injector.get("$log").log("configured");
    expect(logCalls).toEqual([["log", "configured"]]);
    expect(injector.get("$cookie")._defaults).toEqual({ path: "/" });
    expect(() =>
      injector.get("$exceptionHandler")(new Error("ignored")),
    ).toThrow(configuredError);
    expect($http.defaults.headers.common.Accept).toBe(
      "application/json, text/plain, */*",
    );
    expect($http.defaults.headers.common.Authorization).toBe("Bearer token");
    expect($http.defaults.headers.post["Content-Type"]).toBe(
      "application/json;charset=utf-8",
    );
    expect($http.defaults.headers.post["X-Mode"]).toBe("configured");
    expect($http.defaults.headers.delete["X-Delete"]).toBe("configured");
    expect($http.defaults.withCredentials).toBeTrue();
    expect($http.defaults.xsrfCookieName).toBe("APP-XSRF");
    expect($http.defaults.xsrfHeaderName).toBe("X-APP-XSRF");
    expect(httpInterceptor).toHaveBeenCalledTimes(1);
    expect(injector.get("$interpolate")("[[name]]")({ name: "Ada" })).toBe(
      "Ada",
    );
    expect(routerProvider._urlRuntime._locationConfig).toEqual({
      hashPrefix: "!",
      html5Mode: {
        enabled: true,
        requireBase: false,
        rewriteLinks: "internal-link",
      },
    });
    expect(injector.get("$sce").isEnabled()).toBeFalse();
    const $sceDelegate = injector.get("$sceDelegate");

    expect(
      $sceDelegate.getTrusted(
        "resourceUrl",
        "https://cdn.example.com/templates/home.html",
      ),
    ).toBe("https://cdn.example.com/templates/home.html");
    expect(() =>
      $sceDelegate.getTrusted(
        "resourceUrl",
        "https://cdn.example.com/private/secret.html",
      ),
    ).toThrow(configuredError);
    expect($sceDelegate.getTrusted("url", "https://example.com")).toBe(
      "https://example.com",
    );
    expect($sceDelegate.getTrusted("url", "mailto:test@example.com")).toBe(
      "unsafe:mailto:test@example.com",
    );
    expect($sceDelegate.getTrusted("mediaUrl", "data:image/png;base64,x")).toBe(
      "data:image/png;base64,x",
    );
    const $templateCache = injector.get("$templateCache");

    expect($templateCache).toBe(templateCache);
    expect($templateCache.get("cached.html")).toBe("<p>Cached</p>");
    spyOn($http, "get").and.resolveTo({ data: "<p>Configured</p>" });
    injector.get("$templateRequest")("configured.html");
    expect($http.get).toHaveBeenCalledOnceWith("configured.html", {
      cache: $templateCache,
      transformResponse: [],
      headers: {
        Accept: "text/html",
        "X-Template": "configured",
      },
      withCredentials: true,
    });
    expect(injector.get("$rest")("/posts")._options).toEqual({
      timeout: 1200,
    });
    expect(routerProvider._isStrictMode).toBeFalse();
    expect(routerProvider._isCaseInsensitive).toBeTrue();
    expect(routerProvider._defaultSquash).toBe("~");
    expect(routerProvider._compile("/admin")._exec("/ADMIN/")).toEqual({});
    expect(
      $security.check({
        operation: "request",
        transport: "http",
        method: "GET",
        url: `${window.location.origin}/resource`,
        credentials: "include",
        headers: {},
      }),
    ).toEqual(
      jasmine.objectContaining({
        type: "allow",
        credentials: {
          headers: { Authorization: "Bearer token" },
        },
      }),
    );
    await expectAsync(
      $security.check({
        operation: "navigation",
        to: {
          name: "admin",
          url: "/admin",
        },
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        type: "deny",
        status: 403,
      }),
    );
  });

  it("applies boolean location html5Mode config during config phase", () => {
    const angular = new Angular();

    angular
      .module("booleanLocationConfigApp", ["ng"])
      .config({ $location: { html5Mode: false } });

    const injector = createRuntimeInjector(angular, [
      "booleanLocationConfigApp",
    ]);
    const location = injector.get("$location");

    expect(location.html5).toBeFalse();
    expect(location.hashPrefix).toBe("#!");
  });

  it("applies HTTP header config when provider headers are unset", () => {
    const angular = new Angular();

    angular
      .module("emptyHttpHeaderConfigApp", ["ng"])
      .config({
        $http: {
          defaults: {
            headers: undefined,
          },
        },
      })
      .config({
        $http: {
          defaults: {
            headers: {
              common: {
                Accept: "application/json",
              },
            },
          },
        },
      });

    const injector = createInjector(["emptyHttpHeaderConfigApp"]);

    expect(injector.get("$http").defaults.headers.common.Accept).toBe(
      "application/json",
    );
  });

  it("can store components", () => {
    ngModule.component("aComponent", a).component("bComponent", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      ngModule._compileRegistry,
      "component",
      ["aComponent", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      ngModule._compileRegistry,
      "component",
      ["bComponent", b],
    ]);
    // Objects do not get a name
  });

  it("can store factories", () => {
    ngModule.factory("aFactory", a).factory("bFactory", b);
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "factory",
      args: ["aFactory", a],
    });

    expect(inspectProviderCommand(ngModule._invokeQueue[1])).toEqual({
      method: "factory",
      args: ["bFactory", b],
    });
  });

  it("can store services", () => {
    ngModule.service("aService", a).service("bService", b);
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "service",
      args: ["aService", a],
    });

    expect(inspectProviderCommand(ngModule._invokeQueue[1])).toEqual({
      method: "service",
      args: ["bService", b],
    });
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

    const registration = inspectProviderCommand(ngModule._invokeQueue[0]);

    expect(registration.method).toBe("store");
    expect(registration.args[0]).toBe("aStore");
    expect(registration.args[1]()).toBe(model);
    expect(registration.args[2]).toBe("custom");
    expect(registration.args[3]).toEqual({ backend });
  });

  it("stores high-level injectable helpers as provider factories", () => {
    ngModule
      .machine("sessionMachine", {
        initial: "setup",
        data: {},
        states: {
          setup: {},
        },
      })
      .rest("posts", "/api/posts")
      .worker("backgroundWorker", "/workers/bg.js")
      .wasm("mathLib", { source: "/wasm/math.wasm" })
      .serviceWorker("/sw.js")
      .sse("notifications", "/events")
      .websocket("chat", "wss://chat.example.com", { protocols: ["json"] })
      .webTransport("live", "https://localhost:4433/webtransport");

    const registrations = ngModule._invokeQueue.map(inspectProviderCommand);

    expect(registrations.map(({ method }) => method)).toEqual(
      Array(7).fill("factory"),
    );
    expect(registrations.map(({ args }) => args[0])).toEqual([
      "sessionMachine",
      "posts",
      "backgroundWorker",
      "mathLib",
      "notifications",
      "chat",
      "live",
    ]);
    expect(registrations.map(({ args }) => args[1][0])).toEqual([
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

    const websocketRegistration = ngModule._invokeQueue
      .map(inspectProviderCommand)
      .find(({ args }) => args[0] === "chat");
    const websocketFactory = websocketRegistration.args[1];
    const injector = {
      invoke: jasmine
        .createSpy("injectorInvoke")
        .and.callFake((value: any) => value()),
    };
    const websocketService = jasmine
      .createSpy("websocketService")
      .and.callFake((url, config) => ({
        url,
        config,
      }));

    const websocketResult = websocketFactory[2](websocketService, injector);

    expect(injector.invoke as jasmine.Spy).not.toHaveBeenCalled();
    expect(websocketResult).toEqual({
      url: "wss://chat.example.com",
      config: {},
    });
  });

  it("accepts URL objects when registering worker script paths", () => {
    const scriptPath = new URL("https://assets.example.com/bg.js");

    ngModule.worker("workerWithUrl", scriptPath);

    const workerRegistration = ngModule._invokeQueue
      .map(inspectProviderCommand)
      .find(({ args }) => args[0] === "workerWithUrl");
    const workerFactory = workerRegistration.args[1];
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
    const resolveWasmConfig = jasmine
      .createSpy("resolveWasmConfig")
      .and.returnValue({
        source: "/wasm/math.wasm",
        imports: {
          env: { table: { name: "dynamic" } },
        },
      });
    const resolveWorkerScript = jasmine
      .createSpy("resolveWorkerScript")
      .and.returnValue("/workers/bg.js");
    const resolveWorkerConfig = jasmine
      .createSpy("resolveWorkerConfig")
      .and.returnValue({
        restart: true,
      });

    ngModule
      .wasm("mathLib", resolveWasmConfig)
      .worker("backgroundWorker", resolveWorkerScript, resolveWorkerConfig);

    const registrations = ngModule._invokeQueue.map(inspectProviderCommand);
    const wasmRegistration = registrations.find(
      ({ args }) => args[0] === "mathLib",
    );
    const workerRegistration = registrations.find(
      ({ args }) => args[0] === "backgroundWorker",
    );

    const wasmFactory = wasmRegistration.args[1];
    const workerFactory = workerRegistration.args[1];

    const injectorInvoke = jasmine
      .createSpy("injectorInvoke")
      .and.callFake((value: any) => value());
    const injector = {
      invoke: injectorInvoke,
    };

    const wasmLoad = jasmine
      .createSpy("wasmLoad")
      .and.callFake((config) => ({ config }));
    const wasmService = { load: wasmLoad };
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

    expect(injector.invoke).toHaveBeenCalledTimes(3);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWasmConfig);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWorkerScript);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWorkerConfig);

    expect(resolveWasmConfig).toHaveBeenCalledTimes(1);
    expect(resolveWorkerScript).toHaveBeenCalledTimes(1);
    expect(resolveWorkerConfig).toHaveBeenCalledTimes(1);

    expect(wasmResult).toEqual({
      config: {
        source: "/wasm/math.wasm",
        imports: { env: { table: { name: "dynamic" } } },
      },
    });
    expect(workerResult).toEqual({
      scriptPath: "/workers/bg.js",
      config: { restart: true },
    });
    expect(wasmLoad).toHaveBeenCalledTimes(1);
    expect(workerService).toHaveBeenCalledTimes(1);
  });

  it("configures the singleton service worker", () => {
    ngModule.serviceWorker("/sw.js", {
      scope: "/",
      type: "module",
      autoRegister: true,
    });

    expect(ngModule._invokeQueue).toEqual([]);
    expect(ngModule._configBlocks[0]).toEqual([
      ngModule._runtimeConfig,
      "configure",
      [
        _serviceWorker,
        {
          scriptUrl: "/sw.js",
          config: {
            scope: "/",
            type: "module",
            autoRegister: true,
          },
        },
      ],
    ]);
  });

  it("resolves dynamic machine, workflow, and supervisor configs when invoking generated provider factories", () => {
    const resolveMachineData = {
      roomId: "resolver",
    };
    const resolveMachineConfig = jasmine
      .createSpy("resolveMachineConfig")
      .and.returnValue({
        initial: "setup",
        data: resolveMachineData,
        states: {
          setup: {
            on: {
              join: {
                to: "waiting",
                update: jasmine.createSpy("joinTransition"),
              },
            },
          },
          waiting: {},
        },
      });

    const resolveWorkflowConfig = jasmine
      .createSpy("resolveWorkflowConfig")
      .and.returnValue({
        id: "docs-workflow",
        initial: "idle",
        data: { step: 1 },
        commands: {},
      });
    const resolveSupervisorBuildData = {
      step: 1,
    };
    const resolveSupervisorConfig = jasmine
      .createSpy("resolveSupervisorConfig")
      .and.returnValue({
        id: "docs-supervisor",
        workflows: {
          build: {
            id: "docs-supervisor-build",
            initial: "idle",
            data: resolveSupervisorBuildData,
            commands: {},
          },
        },
      });

    ngModule
      .machine("sessionMachine", resolveMachineConfig)
      .workflow("docsWorkflow", resolveWorkflowConfig)
      .workflowSupervisor("docsSupervisor", resolveSupervisorConfig);

    const registrations = ngModule._invokeQueue.map(inspectProviderCommand);
    const machineRegistration = registrations.find(
      ({ args }) => args[0] === "sessionMachine",
    );
    const workflowRegistration = registrations.find(
      ({ args }) => args[0] === "docsWorkflow",
    );
    const supervisorRegistration = registrations.find(
      ({ args }) => args[0] === "docsSupervisor",
    );

    const machineFactory = machineRegistration.args[1];
    const workflowFactory = workflowRegistration.args[1];
    const supervisorFactory = supervisorRegistration.args[1];

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
    const supervisorWorkflowService = jasmine
      .createSpy("supervisorWorkflowService")
      .and.callFake((config) => ({
        id: config.id,
        state: config.initial,
        data: config.data,
        diagnostics: [],
        history: [],
        send: jasmine.createSpy("send").and.returnValue(false),
        can: jasmine.createSpy("can").and.returnValue(false),
        matches: jasmine.createSpy("matches").and.returnValue(false),
        run: jasmine.createSpy("run"),
        retry: jasmine.createSpy("retry"),
        repeat: jasmine.createSpy("repeat"),
        cancel: jasmine.createSpy("cancel").and.returnValue(0),
        snapshot: jasmine.createSpy("snapshot").and.returnValue({
          version: 1,
          id: config.id,
          state: config.initial,
          data: config.data,
          diagnostics: [],
          history: [],
        }),
        restore: jasmine.createSpy("restore"),
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
    expect(supervisorFactory).toEqual([
      _workflow,
      _injector,
      jasmine.any(Function),
    ]);

    const machineResult = machineFactory[2](machineService, injector);
    const workflowResult = workflowFactory[2](workflowService, injector);
    const supervisorResult = supervisorFactory[2](
      supervisorWorkflowService,
      injector,
    );

    expect(injector.invoke).toHaveBeenCalledTimes(3);
    expect(injector.invoke).toHaveBeenCalledWith(resolveMachineConfig);
    expect(injector.invoke).toHaveBeenCalledWith(resolveWorkflowConfig);
    expect(injector.invoke).toHaveBeenCalledWith(resolveSupervisorConfig);

    expect(resolveMachineConfig).toHaveBeenCalledTimes(1);
    expect(resolveWorkflowConfig).toHaveBeenCalledTimes(1);
    expect(resolveSupervisorConfig).toHaveBeenCalledTimes(1);

    expect(machineService).toHaveBeenCalledTimes(1);
    expect(workflowService).toHaveBeenCalledTimes(1);
    expect(supervisorWorkflowService).toHaveBeenCalledTimes(1);

    const machineArgs = machineService.calls.mostRecent().args[0];
    const workflowArgs = workflowService.calls.mostRecent().args[0];
    const supervisorWorkflowArgs =
      supervisorWorkflowService.calls.mostRecent().args[0];
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

    expect(supervisorResult.id).toBe("docs-supervisor");
    expect(supervisorWorkflowArgs.data).toEqual(resolveSupervisorBuildData);
    expect(supervisorWorkflowArgs.data).not.toBe(resolveSupervisorBuildData);
  });

  it("preserves workflow supervisor array entries and workflow instances", () => {
    const workflowInstance = {
      id: "existing-workflow",
      state: "idle",
      data: {
        step: 1,
      },
      diagnostics: [],
      history: [],
      can: jasmine.createSpy("can").and.returnValue(false),
      run: jasmine.createSpy("run"),
      cancel: jasmine.createSpy("cancel").and.returnValue(0),
      snapshot: jasmine.createSpy("snapshot").and.returnValue({
        version: 1,
        id: "existing-workflow",
        state: "idle",
        data: {
          step: 1,
        },
        diagnostics: [],
        history: [],
      }),
      restore: jasmine.createSpy("restore"),
    };
    const arrayWorkflows = [
      [
        "build",
        {
          id: "array-build",
          initial: "idle",
          data: {
            step: 1,
          },
          commands: {},
        },
      ],
    ];
    const objectWorkflows = {
      existing: workflowInstance,
      config: {
        id: "config-build",
        initial: "idle",
        data: {
          step: 2,
        },
        commands: {},
      },
    };

    ngModule
      .workflowSupervisor("arraySupervisor", {
        id: "array-supervisor",
        workflows: arrayWorkflows,
      })
      .workflowSupervisor("objectSupervisor", {
        id: "object-supervisor",
        workflows: objectWorkflows,
      });

    const registrations = ngModule._invokeQueue.map(inspectProviderCommand);
    const arrayRegistration = registrations.find(
      ({ args }) => args[0] === "arraySupervisor",
    );
    const objectRegistration = registrations.find(
      ({ args }) => args[0] === "objectSupervisor",
    );
    const workflowService = jasmine
      .createSpy("workflowService")
      .and.callFake((config) => ({
        ...config,
        state: config.initial,
        diagnostics: [],
        history: [],
        can: jasmine.createSpy("can").and.returnValue(false),
        run: jasmine.createSpy("run"),
        cancel: jasmine.createSpy("cancel").and.returnValue(0),
        snapshot: jasmine.createSpy("snapshot").and.returnValue({
          version: 1,
          id: config.id,
          state: config.initial,
          data: config.data,
          diagnostics: [],
          history: [],
        }),
        restore: jasmine.createSpy("restore"),
      }));
    const injector = {
      invoke: jasmine.createSpy("invoke").and.callFake((value: any) => value()),
    };

    const arrayResult = arrayRegistration.args[1][2](workflowService, injector);
    const objectResult = objectRegistration.args[1][2](
      workflowService,
      injector,
    );

    expect(arrayResult.workflow("build").id).toBe("array-build");
    expect(objectResult.workflow("existing")).toBe(workflowInstance);
    expect(objectResult.workflow("config").data).toEqual({
      step: 2,
    });
    expect(objectResult.workflow("config").data).not.toBe(
      objectWorkflows.config.data,
    );
  });

  it("registers named machines through the machine service", () => {
    const angular = new Angular();

    angular.module("machineApp", ["ng"]).machine("sessionMachine", {
      initial: "setup",
      data: {
        roomId: "",
      },
      states: {
        setup: {
          on: {
            join: {
              to: "waiting",
              update({ data, payload }) {
                data.roomId = payload.roomId;
              },
            },
          },
        },
        waiting: {},
      },
    });

    const injector = createInjector(["machineApp"]);
    const sessionMachine = injector.get("sessionMachine");

    expect(sessionMachine.state).toBe("setup");
    expect(sessionMachine.send("join", { roomId: "abc" }).ok).toBe(true);
    expect(sessionMachine.state).toBe("waiting");
    expect(sessionMachine.data.roomId).toBe("abc");
  });

  it("registers named models through AppContext-backed injection", () => {
    const angular = new Angular();
    const initialFactory = jasmine.createSpy("initialFactory").and.returnValue({
      count: 0,
    });

    angular.module("modelApp", ["ng"]).model("counter", initialFactory);

    const injector = createInjector(["modelApp"]);
    const counter = injector.get("counter");

    expect(initialFactory).toHaveBeenCalledTimes(1);
    expect(counter.count).toBe(0);

    counter.count = 2;

    expect(injector.get("counter")).toBe(counter);
    expect(angular._appContext.getModel("counter")).toBe(counter);
    expect(angular._appContext.getModel("counter").count).toBe(2);
  });

  it("resolves app-safe injectable model factories", () => {
    const angular = new Angular();
    const initialFactory = jasmine
      .createSpy("initialFactory")
      .and.callFake((initialToken) => ({
        token: initialToken,
      }));

    angular
      .module("injectableModelApp", ["ng"])
      .constant("initialToken", "abc")
      .model("session", ["initialToken", initialFactory]);

    const injector = createInjector(["injectableModelApp"]);
    const session = injector.get("session");

    expect(initialFactory).toHaveBeenCalledOnceWith("abc");
    expect(session.token).toBe("abc");
    expect(injector.get("session")).toBe(session);
    expect(angular._appContext.getModel("session")).toBe(session);
  });

  it("preserves explicit injectable model factory annotations", () => {
    const initialFactory = jasmine.createSpy("initialFactory").and.returnValue({
      token: "abc",
    });

    initialFactory.$inject = ["initialToken"];

    ngModule.model("annotatedSession", initialFactory);

    expect(initialFactory.$inject).toEqual(["initialToken"]);
  });

  it("rejects injectable model factories invoked before injector activation", () => {
    ngModule.model("earlySession", ["initialToken", () => ({ token: "abc" })]);

    const factory = ngModule._models.get("earlySession");

    expect(() => factory()).toThrowError(
      "Injectable model factories require an active AngularTS injector.",
    );
  });

  it("rejects root-scoped injectable model factory dependencies", () => {
    expect(() => {
      ngModule.model("badScope", ["$rootScope", () => ({ ok: false })]);
    }).toThrowError(
      "Model 'badScope' factory cannot inject root-scoped dependency '$rootScope'.",
    );

    expect(() => {
      ngModule.model("badElement", ["$rootElement", () => ({ ok: false })]);
    }).toThrowError(
      "Model 'badElement' factory cannot inject root-scoped dependency '$rootElement'.",
    );
  });

  it("rejects inferred root-scoped model dependencies without persisting annotations", () => {
    const initialFactory = ($rootScope) => ({
      rootId: $rootScope.$id,
    });

    expect(() => {
      ngModule.model("badInferredScope", initialFactory);
    }).toThrowError(
      "Model 'badInferredScope' factory cannot inject root-scoped dependency '$rootScope'.",
    );
    expect(initialFactory.$inject).toBeUndefined();
  });

  it("shares named model instances across roots managed by one AppContext", () => {
    const angular = new Angular();

    angular.module("sharedModelApp", ["ng"]).model("session", () => ({
      token: "",
    }));

    const firstInjector = angular.injector(["sharedModelApp"]);
    const firstSession = firstInjector.get("session");
    const subapp = new Angular({ subapp: true });
    const secondInjector = subapp.injector(["sharedModelApp"]);
    const secondSession = secondInjector.get("session");

    firstSession.token = "abc";

    expect(subapp._appContext).toBe(angular._appContext);
    expect(secondSession).toBe(firstSession);
    expect(secondSession.token).toBe("abc");
  });

  it("notifies consuming scope watchers when an injected model changes", async () => {
    const angular = new Angular();

    angular.module("reactiveModelApp", ["ng"]).model("user", () => ({
      name: "John",
    }));

    const injector = angular.injector(["reactiveModelApp"]);
    const rootScope = injector.get("$rootScope");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const observed = [];

    expect(user.$handler._listenerScheduler).toBe(
      angular._appContext.modelScheduler._listenerScheduler,
    );

    scope.user = user;
    scope.$watch("user.name", (value) => {
      observed.push(value);
    });

    await wait();

    expect(observed).toEqual(["John"]);
    expect(user.$handler._foreignListeners.get("name").length).toBe(1);

    user.name = "Jane";

    await wait();

    expect(observed).toEqual(["John", "Jane"]);

    scope.$destroy();

    expect(user.$handler._foreignListeners.has("name")).toBeFalse();

    user.name = "Ada";

    await wait();

    expect(observed).toEqual(["John", "Jane"]);
  });

  it("resolves injectable model sync target factories through the injector", async () => {
    const angular = new Angular();
    const writes: unknown[] = [];

    angular
      .module("modelSyncTargetApp", ["ng"])
      .value("playerSocketSync", {
        write(snapshot: unknown, change: unknown) {
          writes.push({ snapshot, change });
        },
      })
      .model("player", () => ({
        health: 100,
      }));

    const injector = angular.injector(["modelSyncTargetApp"]);
    const player = injector.get("player");

    player.$sync(["playerSocketSync", (sync) => sync]);
    player.health = 90;

    await wait();

    expect(writes.length).toBe(1);
    expect(writes[0]).toEqual({
      snapshot: { health: 90 },
      change: {
        keys: ["health"],
        snapshotVersion: 1,
        origin: undefined,
      },
    });
  });

  it("lets model sync targets coordinate named machines and workflows", async () => {
    const angular = new Angular();

    angular
      .module("modelStateEngineSyncApp", ["ng"])
      .model("player", () => ({
        health: 100,
      }))
      .machine("playerMachine", {
        initial: "alive",
        data: {
          reason: "",
        },
        states: {
          alive: {
            on: {
              knockOut: {
                to: "down",
                update({ data }) {
                  data.reason = "health";
                },
              },
            },
          },
          down: {},
        },
      })
      .workflow("recoveryWorkflow", {
        id: "recovery",
        initial: "idle",
        data: {
          starts: 0,
        },
        commands: {
          start: {
            from: "idle",
            pending: "starting",
            success: {
              to: "running",
              update({ data }) {
                data.starts += 1;
              },
            },
            failure: "failed",
          },
        },
      });

    const injector = angular.injector(["modelStateEngineSyncApp"]);
    const player = injector.get("player");
    const playerMachine = injector.get("playerMachine");
    const recoveryWorkflow = injector.get("recoveryWorkflow");

    player.$sync([
      "playerMachine",
      "recoveryWorkflow",
      (
        machine: {
          can(type: string): boolean;
          send(type: string): boolean;
        },
        workflow: {
          can(type: string): boolean;
          run(type: string): Promise<unknown>;
        },
      ) => ({
        write(snapshot: { health: number }) {
          if (snapshot.health > 0) return;

          if (machine.can("knockOut")) {
            machine.send("knockOut");
          }

          if (workflow.can("start")) {
            void workflow.run("start");
          }
        },
      }),
    ]);

    player.health = 0;

    await wait();

    expect(playerMachine.state).toBe("down");
    expect(playerMachine.data.reason).toBe("health");
    expect(recoveryWorkflow.state).toBe("running");
    expect(recoveryWorkflow.data.starts).toBe(1);
  });

  it("updates DOM interpolation when an app model assigned to scope changes", async () => {
    const angular = new Angular();

    angular.module("modelDomApp", ["ng"]).model("player", () => ({
      x: 210,
      y: 130,
    }));

    const injector = angular.injector(["modelDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const player = injector.get("player");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ player.x }}, {{ player.y }}</p>")(scope);

    scope.player = player;

    await wait();

    expect(element.textContent).toBe("210, 130");

    player.x = 234;

    await wait();

    expect(element.textContent).toBe("234, 130");
  });

  it("updates ng-bind when an app model assigned to scope changes", async () => {
    const angular = new Angular();

    angular.module("modelBindDomApp", ["ng"]).model("player", () => ({
      x: 210,
    }));

    const injector = angular.injector(["modelBindDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const player = injector.get("player");
    const scope = rootScope.$new();
    const element = $compile('<p ng-bind="player.x"></p>')(scope);

    scope.player = player;

    await wait();

    expect(element.textContent).toBe("210");

    player.x = 234;

    await wait();

    expect(element.textContent).toBe("234");
  });

  it("updates derived DOM interpolation when a model condition changes", async () => {
    const angular = new Angular();

    angular.module("modelConditionalDomApp", ["ng"]).model("synth", () => ({
      playing: false,
    }));

    const injector = angular.injector(["modelConditionalDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const synth = injector.get("synth");
    const scope = rootScope.$new();
    const element = $compile(
      "<button>{{ synth.playing ? 'Stop' : 'Start' }}</button>",
    )(scope);

    scope.synth = synth;

    await wait();

    expect(element.textContent).toBe("Start");

    synth.playing = true;

    await wait();

    expect(element.textContent).toBe("Stop");
  });

  it("updates derived DOM interpolation when a model method-call input changes", async () => {
    const angular = new Angular();

    angular.module("modelCallDomApp", ["ng"]).model("shark", () => ({
      speed: 0.03,
    }));

    const injector = angular.injector(["modelCallDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const shark = injector.get("shark");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ shark.speed.toFixed(2) }}</p>")(scope);

    scope.shark = shark;

    await wait();

    expect(element.textContent).toBe("0.03");

    shark.speed = 0.04;

    await wait();

    expect(element.textContent).toBe("0.04");
  });

  it("updates multi-part derived DOM interpolation when model method-call inputs change", async () => {
    const angular = new Angular();

    angular.module("modelMultiCallDomApp", ["ng"]).model("shark", () => ({
      speed: 0.03,
      depth: 0,
    }));

    const injector = angular.injector(["modelMultiCallDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const shark = injector.get("shark");
    const scope = rootScope.$new();
    const element = $compile(
      "<p>Speed: {{ shark.speed.toFixed(2) }}, Depth: {{ shark.depth.toFixed(1) }}</p>",
    )(scope);

    scope.shark = shark;

    await wait();

    expect(element.textContent).toBe("Speed: 0.03, Depth: 0.0");

    shark.speed = 0.04;

    await wait();

    expect(element.textContent).toBe("Speed: 0.04, Depth: 0.0");
  });

  it("updates DOM interpolation when a controller alias exposes an app model", async () => {
    const angular = new Angular();

    angular
      .module("modelAliasDomApp", ["ng"])
      .model("player", () => ({
        x: 210,
        y: 130,
      }))
      .controller(
        "DemoCtrl",
        class {
          static $inject = ["player"];

          constructor(player) {
            this.player = player;
          }
        },
      );

    const injector = angular.injector(["modelAliasDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const player = injector.get("player");
    const element = $compile(
      '<section ng-controller="DemoCtrl as demo">{{ demo.player.x }}</section>',
    )(rootScope);

    await wait();

    expect(element.textContent).toBe("210");

    player.x = 234;

    await wait();

    expect(element.textContent).toBe("234");
  });

  it("updates DOM interpolation when ng-click mutates a controller alias model", async () => {
    const angular = new Angular();

    angular
      .module("modelAliasClickDomApp", ["ng"])
      .model("player", () => ({
        x: 210,
      }))
      .controller(
        "DemoCtrl",
        class {
          static $inject = ["player"];

          constructor(player) {
            this.player = player;
          }

          move() {
            this.player.x += 24;
          }
        },
      );

    const injector = angular.injector(["modelAliasClickDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const element = $compile(
      [
        '<section ng-controller="DemoCtrl as demo">',
        '<button type="button" ng-click="demo.move()">Move</button>',
        "<p>{{ demo.player.x }}</p>",
        "</section>",
      ].join(""),
    )(rootScope);

    await wait();

    expect(element.querySelector("p").textContent).toBe("210");

    element.querySelector("button").click();

    await wait();

    expect(element.querySelector("p").textContent).toBe("234");
  });

  it("removes controller alias model observations when the consuming scope is destroyed", async () => {
    const angular = new Angular();

    angular
      .module("modelAliasDestroyDomApp", ["ng"])
      .model("session", () => ({
        token: "initial",
      }))
      .controller(
        "DemoCtrl",
        class {
          static $inject = ["session"];

          constructor(session) {
            this.session = session;
          }
        },
      );

    const injector = angular.injector(["modelAliasDestroyDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const compileLifecycle = angular._composition.compileLifecycle;
    const session = injector.get("session");
    let controllerScope;
    const stopLifecycle = compileLifecycle.onControllerCreated((record) => {
      if (record.directiveName === "ngController") {
        controllerScope = record.scope;
      }
    });
    const element = $compile(
      [
        '<section ng-controller="DemoCtrl as demo">',
        "<p>{{ demo.session.token }}</p>",
        "</section>",
      ].join(""),
    )(rootScope);

    await wait();

    expect(element.querySelector("p").textContent).toBe("initial");
    expect(session.$handler._foreignListeners.get("token").length).toBe(1);

    controllerScope.$destroy();
    stopLifecycle();

    expect(controllerScope.$handler._destroyed).toBeTrue();
    expect(session.$handler._foreignListeners.has("token")).toBeFalse();
  });

  it("updates DOM interpolation when a nested model property changes", async () => {
    const angular = new Angular();

    angular.module("modelNestedDomApp", ["ng"]).model("user", () => ({
      profile: {
        name: "John",
      },
    }));

    const injector = angular.injector(["modelNestedDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ user.profile.name }}</p>")(scope);

    scope.user = user;

    await wait();

    expect(element.textContent).toBe("John");

    user.profile.name = "Jane";

    await wait();

    expect(element.textContent).toBe("Jane");
  });

  it("updates DOM interpolation when a nested model parent is replaced", async () => {
    const angular = new Angular();

    angular.module("modelParentReplaceDomApp", ["ng"]).model("user", () => ({
      profile: {
        name: "John",
      },
    }));

    const injector = angular.injector(["modelParentReplaceDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ user.profile.name }}</p>")(scope);

    scope.user = user;

    await wait();

    expect(element.textContent).toBe("John");

    user.profile = { name: "Jane" };

    await wait();

    expect(element.textContent).toBe("Jane");
  });

  it("updates DOM interpolation when a nested model array mutates", async () => {
    const angular = new Angular();

    angular.module("modelArrayDomApp", ["ng"]).model("cart", () => ({
      items: ["alpha"],
    }));

    const injector = angular.injector(["modelArrayDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const cart = injector.get("cart");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ cart.items.length }}</p>")(scope);

    scope.cart = cart;

    await wait();

    expect(element.textContent).toBe("1");

    cart.items.push("beta");

    await wait();

    expect(element.textContent).toBe("2");
  });

  it("updates a repeat linked after a model array already contains an item", async () => {
    const angular = new Angular();

    angular.module("conditionalModelRepeatApp", ["ng"]).model("cart", () => ({
      items: [],
      state: "empty",
    }));

    const injector = angular.injector(["conditionalModelRepeatApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const cart = injector.get("cart");
    const scope = rootScope.$new();
    const element = $compile(
      "<section><ul ng-if=\"vm.cart.state === 'list'\">" +
        '<li ng-repeat="item in vm.cart.items">{{ item }}</li>' +
        "</ul></section>",
    )(scope);

    scope.vm = { cart };
    cart.items.push("alpha");
    cart.state = "list";

    await wait();

    expect(element.querySelectorAll("li").length).toBe(1);

    cart.items.push("beta");

    await wait();

    expect(element.querySelectorAll("li").length).toBe(2);
    expect(element.textContent).toContain("alpha");
    expect(element.textContent).toContain("beta");
  });

  it("updates DOM interpolation when a nested model property is deleted", async () => {
    const angular = new Angular();

    angular.module("modelDeleteNestedDomApp", ["ng"]).model("user", () => ({
      profile: {
        name: "John",
      },
    }));

    const injector = angular.injector(["modelDeleteNestedDomApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ user.profile.name }}</p>")(scope);

    scope.user = user;

    await wait();

    expect(element.textContent).toBe("John");

    delete user.profile.name;

    await wait();

    expect(element.textContent).toBe("");
  });

  it("notifies consuming scope watchers when an injected model property is deleted", async () => {
    const angular = new Angular();

    angular.module("deleteReactiveModelApp", ["ng"]).model("user", () => ({
      name: "John",
    }));

    const injector = angular.injector(["deleteReactiveModelApp"]);
    const rootScope = injector.get("$rootScope");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const observed = [];

    scope.user = user;
    scope.$watch("user.name", (value) => {
      observed.push(value);
    });

    await wait();

    expect(observed).toEqual(["John"]);
    expect(user.$handler._foreignListeners.get("name").length).toBe(1);

    delete user.name;

    await wait();

    expect(observed).toEqual(["John", undefined]);

    scope.$destroy();

    expect(user.$handler._foreignListeners.has("name")).toBeFalse();
  });

  it("proxies nested model objects lazily", () => {
    const angular = new Angular();

    angular.module("nestedReactiveModelApp", ["ng"]).model("user", () => ({
      profile: {
        name: "John",
      },
    }));

    const injector = angular.injector(["nestedReactiveModelApp"]);
    const user = injector.get("user");

    user.profile.name = "Jane";

    expect(user.profile.$handler).toBeDefined();
    expect(user.profile.name).toBe("Jane");
  });

  it("notifies consuming scope watchers when a nested injected model object changes", async () => {
    const angular = new Angular();

    angular.module("nestedModelWatchApp", ["ng"]).model("user", () => ({
      profile: {
        name: "John",
      },
    }));

    const injector = angular.injector(["nestedModelWatchApp"]);
    const rootScope = injector.get("$rootScope");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const observed = [];

    scope.user = user;
    scope.$watch("user.profile.name", (value) => {
      observed.push(value);
    });

    await wait();

    expect(observed).toEqual(["John"]);
    expect(scope.user).toBe(user);
    expect(user.profile.$handler._foreignListeners.get("name").length).toBe(1);

    user.profile.name = "Jane";

    await wait();

    expect(observed).toEqual(["John", "Jane"]);

    scope.$destroy();

    expect(user.profile.$handler._foreignListeners.has("name")).toBeFalse();

    user.profile.name = "Ada";

    await wait();

    expect(observed).toEqual(["John", "Jane"]);
  });

  it("notifies consuming scope watchers when a nested injected model array changes", async () => {
    const angular = new Angular();

    angular.module("nestedModelArrayWatchApp", ["ng"]).model("user", () => ({
      items: ["alpha"],
    }));

    const injector = angular.injector(["nestedModelArrayWatchApp"]);
    const rootScope = injector.get("$rootScope");
    const user = injector.get("user");
    const scope = rootScope.$new();
    const observed = [];

    scope.user = user;
    scope.$watch("user.items.length", (value) => {
      observed.push(value);
    });

    await wait();

    expect(observed).toEqual([1]);
    expect(user.items.$handler._foreignListeners.get("length").length).toBe(1);

    user.items.push("beta");

    await wait();

    expect(observed).toEqual([1, 2]);

    scope.$destroy();

    expect(user.items.$handler._foreignListeners.has("length")).toBeFalse();

    user.items.push("gamma");

    await wait();

    expect(observed).toEqual([1, 2]);
  });

  it("keeps app model data while removing destroyed root observations", async () => {
    const angular = new Angular();

    angular
      .module("crossRootReactiveModelApp", ["ng"])
      .model("session", () => ({
        token: "",
      }));

    const firstInjector = angular.injector(["crossRootReactiveModelApp"]);
    const firstRoot = firstInjector.get("$rootScope");
    const session = firstInjector.get("session");
    const firstScope = firstRoot.$new();
    const firstObserved = [];

    firstScope.session = session;
    firstScope.$watch("session.token", (value) => {
      firstObserved.push(value);
    });

    const subapp = new Angular({ subapp: true });
    const secondInjector = subapp.injector(["crossRootReactiveModelApp"]);
    const secondRoot = secondInjector.get("$rootScope");
    const secondSession = secondInjector.get("session");
    const secondScope = secondRoot.$new();
    const secondObserved = [];

    secondScope.session = secondSession;
    secondScope.$watch("session.token", (value) => {
      secondObserved.push(value);
    });

    await wait();

    session.token = "abc";

    await wait();

    expect(secondSession).toBe(session);
    expect(firstObserved).toEqual(["", "abc"]);
    expect(secondObserved).toEqual(["", "abc"]);

    firstScope.$destroy();
    firstRoot.$destroy();

    expect(angular._appContext.getModel("session")).toBe(session);

    session.token = "def";

    await wait();

    expect(firstObserved).toEqual(["", "abc"]);
    expect(secondObserved).toEqual(["", "abc", "def"]);
    expect(session.token).toBe("def");
  });

  it("removes descendant model observations when a root scope is destroyed", async () => {
    const angular = new Angular();

    angular
      .module("rootDestroyReactiveModelApp", ["ng"])
      .model("session", () => ({
        token: "",
      }));

    const firstInjector = angular.injector(["rootDestroyReactiveModelApp"]);
    const firstRoot = firstInjector.get("$rootScope");
    const session = firstInjector.get("session");
    const firstScope = firstRoot.$new();
    const firstObserved = [];

    firstScope.session = session;
    firstScope.$watch("session.token", (value) => {
      firstObserved.push(value);
    });

    const subapp = new Angular({ subapp: true });
    const secondInjector = subapp.injector(["rootDestroyReactiveModelApp"]);
    const secondRoot = secondInjector.get("$rootScope");
    const secondSession = secondInjector.get("session");
    const secondScope = secondRoot.$new();
    const secondObserved = [];

    secondScope.session = secondSession;
    secondScope.$watch("session.token", (value) => {
      secondObserved.push(value);
    });

    await wait();

    expect(session.$handler._foreignListeners.get("token").length).toBe(2);

    firstRoot.$destroy();

    expect(firstScope.$handler._destroyed).toBeTrue();
    expect(session.$handler._foreignListeners.get("token").length).toBe(1);

    session.token = "abc";

    await wait();

    expect(firstObserved).toEqual([""]);
    expect(secondObserved).toEqual(["", "abc"]);
  });

  it("removes DOM model observations when a consuming scope is destroyed", async () => {
    const angular = new Angular();

    angular.module("modelDomScopeDestroyApp", ["ng"]).model("session", () => ({
      token: "initial",
    }));

    const injector = angular.injector(["modelDomScopeDestroyApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const session = injector.get("session");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ session.token }}</p>")(scope);

    scope.session = session;

    await wait();

    expect(element.textContent).toBe("initial");
    expect(session.$handler._foreignListeners.get("token").length).toBe(1);

    scope.$destroy();

    expect(session.$handler._foreignListeners.has("token")).toBeFalse();

    session.token = "updated";

    await wait();

    expect(element.textContent).toBe("initial");
  });

  it("keeps sibling root DOM bindings alive after one root is destroyed", async () => {
    const angular = new Angular();

    angular
      .module("modelDomSiblingRootDestroyApp", ["ng"])
      .model("session", () => ({
        token: "initial",
      }));

    const firstInjector = angular.injector(["modelDomSiblingRootDestroyApp"]);
    const firstRoot = firstInjector.get("$rootScope");
    const firstCompile = firstInjector.get("$compile");
    const session = firstInjector.get("session");
    const firstScope = firstRoot.$new();
    const firstElement = firstCompile("<p>{{ session.token }}</p>")(firstScope);

    firstScope.session = session;

    const subapp = new Angular({ subapp: true });
    const secondInjector = subapp.injector(["modelDomSiblingRootDestroyApp"]);
    const secondRoot = secondInjector.get("$rootScope");
    const secondCompile = secondInjector.get("$compile");
    const secondSession = secondInjector.get("session");
    const secondScope = secondRoot.$new();
    const secondElement = secondCompile("<p>{{ session.token }}</p>")(
      secondScope,
    );

    secondScope.session = secondSession;

    await wait();

    expect(secondSession).toBe(session);
    expect(firstElement.textContent).toBe("initial");
    expect(secondElement.textContent).toBe("initial");
    expect(session.$handler._foreignListeners.get("token").length).toBe(2);

    session.token = "abc";

    await wait();

    expect(firstElement.textContent).toBe("abc");
    expect(secondElement.textContent).toBe("abc");

    firstRoot.$destroy();

    expect(firstScope.$handler._destroyed).toBeTrue();
    expect(session.$handler._foreignListeners.get("token").length).toBe(1);

    session.token = "def";

    await wait();

    expect(firstElement.textContent).toBe("abc");
    expect(secondElement.textContent).toBe("def");
  });

  it("allows app model mutation after all DOM roots are destroyed", async () => {
    const angular = new Angular();

    angular.module("modelDomZeroRootApp", ["ng"]).model("session", () => ({
      token: "initial",
    }));

    const injector = angular.injector(["modelDomZeroRootApp"]);
    const rootScope = injector.get("$rootScope");
    const $compile = injector.get("$compile");
    const session = injector.get("session");
    const scope = rootScope.$new();
    const element = $compile("<p>{{ session.token }}</p>")(scope);

    scope.session = session;

    await wait();

    expect(element.textContent).toBe("initial");
    expect(session.$handler._foreignListeners.get("token").length).toBe(1);

    rootScope.$destroy();

    expect(scope.$handler._destroyed).toBeTrue();
    expect(session.$handler._foreignListeners.has("token")).toBeFalse();
    expect(angular._appContext.getModel("session")).toBe(session);

    session.token = "after-destroy";

    await wait();

    expect(session.token).toBe("after-destroy");
    expect(element.textContent).toBe("initial");
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

  it("stores module router trees as router state config blocks", () => {
    expect(
      ngModule.router({
        name: "admin",
        url: "/admin",
        abstract: true,
        template: "<main ng-view></main>",
        policy: {
          navigation: {
            authenticated: true,
            redirectTo: "login",
          },
        },
        children: [
          {
            name: "users",
            url: "/users",
            template: "<h1>Users</h1>",
          },
          {
            name: "admin.roles",
            url: "/roles",
            template: "<h1>Roles</h1>",
            children: [
              {
                name: "detail",
                url: "/:id",
                template: "<h1>Role</h1>",
              },
            ],
          },
        ],
      }),
    ).toBe(ngModule);

    expect(ngModule._configBlocks).toEqual([
      [
        ngModule._runtimeConfig,
        "configure",
        [
          routerRuntimeConfigKey,
          {
            type: "state",
            definition: {
              name: "admin",
              url: "/admin",
              abstract: true,
              template: "<main ng-view></main>",
              policy: {
                navigation: {
                  authenticated: true,
                  redirectTo: "login",
                },
              },
            },
          },
        ],
      ],
      [
        ngModule._runtimeConfig,
        "configure",
        [
          routerRuntimeConfigKey,
          {
            type: "state",
            definition: {
              name: "admin.users",
              url: "/users",
              template: "<h1>Users</h1>",
            },
          },
        ],
      ],
      [
        ngModule._runtimeConfig,
        "configure",
        [
          routerRuntimeConfigKey,
          {
            type: "state",
            definition: {
              name: "admin.roles",
              url: "/roles",
              template: "<h1>Roles</h1>",
            },
          },
        ],
      ],
      [
        ngModule._runtimeConfig,
        "configure",
        [
          routerRuntimeConfigKey,
          {
            type: "state",
            definition: {
              name: "admin.roles.detail",
              url: "/:id",
              template: "<h1>Role</h1>",
            },
          },
        ],
      ],
    ]);
  });

  it("rejects invalid module router tree children", () => {
    expect(() =>
      ngModule.router({
        name: "admin",
        children: {} as any,
      }),
    ).toThrowError();
  });

  it("registers module route trees through router composition", () => {
    const angular = new Angular();
    const detail = {
      name: "detail",
      url: "/:id",
      template: "<h1>Detail</h1>",
    };
    const home = {
      name: "home",
      url: "/home",
      template: "<h1>Home</h1>",
      children: [detail],
    };

    angular.module("stateApp", ["ng"]).router(home);

    const injector = createRuntimeInjector(angular, ["stateApp"]);

    const registry = injector.get("$stateRegistry");
    const state = injector.get("$state");

    expect(registry.get("home").name).toBe("home");
    expect(registry.get("home.detail").url).toBe("/:id");
    expect(state.target(home).exists()).toBeTrue();
    expect(state.target(detail).exists()).toBeTrue();
  });

  it("registers module router trees through router composition", () => {
    const angular = new Angular();

    angular.module("routerTreeApp", ["ng"]).router({
      name: "admin",
      url: "/admin",
      abstract: true,
      children: [
        {
          name: "users",
          url: "/users",
          template: "<h1>Users</h1>",
        },
        {
          name: "admin.profile",
          url: "^/profile",
          template: "<h1>Profile</h1>",
        },
      ],
    });

    const injector = createRuntimeInjector(angular, ["routerTreeApp"]);
    const registry = injector.get("$stateRegistry");

    expect(registry.get("admin").abstract).toBeTrue();
    expect(registry.get("admin.users").url).toBe("/users");
    expect(registry.get("admin.profile").url).toBe("^/profile");
    expect(registry.get("admin.users")._state()._url._format({})).toBe(
      "/admin/users",
    );
    expect(registry.get("admin.profile")._state()._url._format({})).toBe(
      "/profile",
    );
  });

  it("registers multiple top-level module router trees", () => {
    const angular = new Angular();

    angular.module("routerComposeApp", ["ng"]).router([
      {
        name: "login",
        url: "/login",
        template: "<h1>Login</h1>",
      },
      {
        name: "admin",
        url: "/admin",
        abstract: true,
        children: [
          {
            name: "reports",
            url: "/reports",
            template: "<h1>Reports</h1>",
          },
          {
            name: "users",
            url: "/users",
            template: "<h1>Users</h1>",
          },
          {
            name: "audit",
            url: "/audit",
            template: "<h1>Audit</h1>",
          },
        ],
      },
    ]);

    const injector = createRuntimeInjector(angular, ["routerComposeApp"]);
    const registry = injector.get("$stateRegistry");

    expect(registry.get("login").url).toBe("/login");
    expect(registry.get("admin.reports").url).toBe("/reports");
    expect(registry.get("admin.users").url).toBe("/users");
    expect(registry.get("admin.audit").url).toBe("/audit");
    expect(registry.get("login")._state()._url._format({})).toBe("/login");
    expect(registry.get("admin.reports")._state()._url._format({})).toBe(
      "/admin/reports",
    );
    expect(registry.get("admin.users")._state()._url._format({})).toBe(
      "/admin/users",
    );
    expect(registry.get("admin.audit")._state()._url._format({})).toBe(
      "/admin/audit",
    );
  });

  it("stores lazy router states as config blocks", () => {
    const loader = () => ({
      name: "admin",
      url: "/admin",
      template: "<h1>Admin</h1>",
    });

    expect(ngModule.lazyState("admin.**", loader)).toBe(ngModule);

    expect(ngModule._configBlocks[0]).toEqual([
      ngModule._runtimeConfig,
      "configure",
      [routerRuntimeConfigKey, { type: "lazy", prefix: "admin.**", loader }],
    ]);
  });

  it("registers module lazy states through router composition", () => {
    const angular = new Angular();
    const loader = async () => [
      {
        name: "admin",
        url: "/admin",
        template: "<h1>Admin</h1>",
      },
    ];
    angular.module("lazyStateApp", ["ng"]).lazyState("admin.**", loader);

    const state = createRuntimeInjector(angular, ["lazyStateApp"]).get(
      "$state",
    );

    expect(state._lazyStates).toEqual([
      {
        prefix: "admin",
        loader,
        loaded: false,
      },
    ]);
  });

  it("can store providers", () => {
    ngModule.provider("aProvider", a).provider("bProvider", b);
    expect(inspectProviderCommand(ngModule._invokeQueue[0])).toEqual({
      method: "provider",
      args: ["aProvider", a],
    });

    expect(inspectProviderCommand(ngModule._invokeQueue[1])).toEqual({
      method: "provider",
      args: ["bProvider", b],
    });
  });

  it("can store decorators", () => {
    ngModule.decorator("aDecorator", a).decorator("bDecorator", b);
    expect(inspectProviderCommand(ngModule._configBlocks[0])).toEqual({
      method: "decorator",
      args: ["aDecorator", a],
    });

    expect(inspectProviderCommand(ngModule._configBlocks[1])).toEqual({
      method: "decorator",
      args: ["bDecorator", b],
    });
  });

  it("can store directives", () => {
    ngModule.directive("aDirective", a).directive("bDirective", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      ngModule._compileRegistry,
      "directive",
      ["aDirective", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      ngModule._compileRegistry,
      "directive",
      ["bDirective", b],
    ]);
  });

  it("can store animations", () => {
    ngModule.animation("aAnimation", a).animation("bAnimation", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      ngModule._animationRegistry,
      "register",
      ["aAnimation", a],
    ]);

    expect(ngModule._invokeQueue[1]).toEqual([
      ngModule._animationRegistry,
      "register",
      ["bAnimation", b],
    ]);
  });

  it("can store filters", () => {
    ngModule.filter("aFilter", cf).filter("bFilter", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      ngModule._filterRegistry,
      "register",
      ["aFilter", cf],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      ngModule._filterRegistry,
      "register",
      ["bFilter", b],
    ]);
  });

  it("can store controllers", () => {
    ngModule.controller("aController", a).controller("bController", b);
    expect(ngModule._invokeQueue[0]).toEqual([
      ngModule._controllerRegistry,
      "register",
      ["aController", a],
    ]);
    expect(ngModule._invokeQueue[1]).toEqual([
      ngModule._controllerRegistry,
      "register",
      ["bController", b],
    ]);
  });
});
