// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { waitUntil } from "../../shared/test-utils.ts";
import {
  applyViewRetention,
  buildEffectiveRetentionPolicy,
} from "./transition-hooks.ts";

function configureRoutes(module, configure) {
  configure(module);
}

describe("transition security policy", () => {
  let $state;
  let moduleId = 0;

  function bootstrapSecurityTransition(securityConfig = {}) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `securityTransitionModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
        ...securityConfig,
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "public",
        url: "/public",
        template: "public",
      });
      routerModule.router({
        name: "protected",
        url: "/protected",
        template: "protected",
      });
      routerModule.router({
        name: "login",
        url: "/login",
        template: "login",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  beforeEach(() => {
    $state = bootstrapSecurityTransition();
  });

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  async function goAndAssert(name: string, expected: string) {
    await $state.go(name);
    await waitUntil(() => $state.current.name === expected);
    expect($state.current.name).toBe(expected);
  }

  it("allows transition when security policy resolves allow", async () => {
    await goAndAssert("public", "public");

    await goAndAssert("protected", "protected");
  });

  it("denies transition when policy blocks a protected target", async () => {
    $state = bootstrapSecurityTransition({
      navigation: {
        rules: [
          {
            state: "protected",
            decision: "deny",
            status: 403,
            reason: "policy denied",
          },
        ],
      },
    });

    await goAndAssert("public", "public");

    let error;

    try {
      await $state.go("protected");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("public");
  });

  it("redirects transition targets via security policy", async () => {
    $state = bootstrapSecurityTransition({
      navigation: {
        rules: [
          {
            state: "protected",
            decision: "redirect",
            target: "login",
            status: 302,
          },
        ],
      },
    });

    await goAndAssert("public", "public");
    await goAndAssert("protected", "login");
  });

  it("rejects redirect decisions without a target", async () => {
    $state = bootstrapSecurityTransition({
      navigation: {
        rules: [
          {
            state: "protected",
            decision: "redirect",
            status: 302,
          },
        ],
      },
    });

    await goAndAssert("public", "public");

    let error;

    try {
      await $state.go("protected");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("public");
  });

  it("rejects denied transitions with the default policy reason", async () => {
    $state = bootstrapSecurityTransition({
      defaultDecision: "deny",
    });

    let error;

    try {
      await $state.go("protected");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect($state.current.name).not.toBe("protected");
  });

  it("evaluates policy when navigator is unavailable", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, "navigator");

    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: undefined,
    });

    try {
      await goAndAssert("public", "public");
    } finally {
      if (descriptor) {
        Object.defineProperty(window, "navigator", descriptor);
      }
    }
  });
});

describe("transition configured security policy", () => {
  let $state;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();

    const app = window.angular.module("configuredSecurityTransitionModule", []);

    app.config({
      $security: {
        defaultDecision: "allow",
        navigation: {
          rules: [
            {
              state: "protected",
              decision: "redirect",
              target: "login",
              status: 302,
              reason: "login required",
            },
          ],
        },
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "public",
        url: "/public",
        template: "public",
      });
      routerModule.router({
        name: "protected",
        url: "/protected",
        template: "protected",
      });
      routerModule.router({
        name: "login",
        url: "/login",
        template: "login",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      "configuredSecurityTransitionModule",
    ]);

    $state = $injector.get("$state");
  });

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("redirects protected routes through configured navigation policy", async () => {
    await $state.go("public");
    await waitUntil(() => $state.current.name === "public");

    await $state.go("protected");
    await waitUntil(() => $state.current.name === "login");

    expect($state.current.name).toBe("login");
  });
});

describe("transition route-tree navigation policy", () => {
  let $state;
  let moduleId = 0;

  function bootstrapRoutePolicy(
    securityConfig = {},
    configureStates?,
    routerConfig?,
  ) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `routePolicyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
        ...securityConfig,
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "admin",
        url: "/admin",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          navigation: {
            require: "authenticated",
            redirectTo: "login",
          },
        },
      });
      routerModule.router({
        name: "admin.users",
        url: "/users",
        template: "users",
      });
      routerModule.router({
        name: "admin.roles",
        url: "/roles",
        template: "roles",
        policy: {
          navigation: {
            permissions: "admin:roles",
            redirectTo: "forbidden",
            reason: "roles permission required",
          },
        },
      });
      routerModule.router({
        name: "admin.public",
        url: "/public",
        template: "public",
        policy: {
          navigation: {
            public: true,
          },
        },
      });
      routerModule.router({
        name: "login",
        url: "/login",
        template: "login",
      });
      routerModule.router({
        name: "forbidden",
        url: "/forbidden",
        template: "forbidden",
      });

      configureStates?.(routerModule);
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  async function goAndAssert(name: string, expected: string) {
    await $state.go(name);
    await waitUntil(() => $state.current.name === expected);
    expect($state.current.name).toBe(expected);
  }

  it("inherits parent navigation policy into child routes", async () => {
    $state = bootstrapRoutePolicy();

    await goAndAssert("admin.users", "login");
  });

  it("allows inherited protected routes when an auth branch matches", async () => {
    $state = bootstrapRoutePolicy({
      branches: ["jwt"],
      credentials: {
        jwt: () => "token",
      },
    });

    await goAndAssert("admin.users", "admin.users");
  });

  it("lets an explicit public child clear inherited navigation policy", async () => {
    $state = bootstrapRoutePolicy();

    await goAndAssert("admin.public", "admin.public");
  });

  it("accumulates child permissions and uses child redirect target", async () => {
    $state = bootstrapRoutePolicy({
      branches: ["jwt"],
      credentials: {
        jwt: () => "token",
      },
      navigation: {
        permissions: [],
      },
    });

    await goAndAssert("admin.roles", "forbidden");
  });

  it("allows child permissions when configured on the navigation policy", async () => {
    $state = bootstrapRoutePolicy({
      branches: ["jwt"],
      credentials: {
        jwt: () => "token",
      },
      navigation: {
        permissions: ["admin:roles"],
      },
    });

    await goAndAssert("admin.roles", "admin.roles");
  });

  it("inherits parent policy for lazy children", async () => {
    $state = bootstrapRoutePolicy({}, (routerModule) => {
      routerModule.lazyState("admin.lazy", () => ({
        name: "admin.lazy",
        url: "/lazy",
        template: "lazy",
      }));
    });

    await goAndAssert("admin.lazy", "login");
  });

  it("builds inherited retention policy for route subtrees", async () => {
    $state = bootstrapRoutePolicy({}, (routerModule) => {
      routerModule.router({
        name: "workspace",
        url: "/workspace",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          retention: {
            mode: "keep-alive",
            max: 3,
            pause: "background",
            evict: "lru",
          },
        },
      });
      routerModule.router({
        name: "workspace.editor",
        url: "/editor",
        template: "editor",
      });
    });

    const promise = $state.go("workspace.editor");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toEqual({
      mode: "keep-alive",
      max: 3,
      pause: "background",
      evict: "lru",
      states: ["workspace"],
    });
  });

  it("lets child retention policy override inherited scalar fields", async () => {
    $state = bootstrapRoutePolicy({}, (routerModule) => {
      routerModule.router({
        name: "workspace",
        url: "/workspace",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          retention: {
            mode: "keep-alive",
            key: "workspace",
            max: 5,
            pause: "background",
            evict: "lru",
          },
        },
      });
      routerModule.router({
        name: "workspace.editor",
        url: "/editor",
        template: "editor",
        policy: {
          retention: {
            key: "editor",
            max: 1,
            pause: "schedulers",
            evict: "oldest",
          },
        },
      });
    });

    const promise = $state.go("workspace.editor");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toEqual({
      mode: "keep-alive",
      key: "editor",
      max: 1,
      pause: "schedulers",
      evict: "oldest",
      states: ["workspace", "workspace.editor"],
    });
  });

  it("lets a child retention policy opt out of inherited keep-alive", async () => {
    $state = bootstrapRoutePolicy({}, (routerModule) => {
      routerModule.router({
        name: "workspace",
        url: "/workspace",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          retention: {
            mode: "keep-alive",
            max: 5,
          },
        },
      });
      routerModule.router({
        name: "workspace.editor",
        url: "/editor",
        template: "editor",
        policy: {
          retention: {
            mode: "destroy",
          },
        },
      });
    });

    const promise = $state.go("workspace.editor");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toEqual({
      mode: "destroy",
      max: 5,
      states: ["workspace", "workspace.editor"],
    });
  });

  it("uses router-wide retention as the default policy", async () => {
    $state = bootstrapRoutePolicy(
      {
        branches: ["jwt"],
        credentials: {
          jwt: () => "token",
        },
      },
      undefined,
      {
        retention: {
          mode: "keep-alive",
          max: 2,
          pause: "schedulers",
          evict: "oldest",
        },
      },
    );

    const promise = $state.go("admin.users");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toEqual({
      mode: "keep-alive",
      max: 2,
      pause: "schedulers",
      evict: "oldest",
      states: [],
    });
  });

  it("lets route retention override router-wide defaults", async () => {
    $state = bootstrapRoutePolicy(
      {},
      (routerModule) => {
        routerModule.router({
          name: "workspace",
          url: "/workspace",
          template: "workspace",
          policy: {
            retention: {
              max: 1,
              pause: "background",
            },
          },
        });
      },
      {
        retention: {
          mode: "keep-alive",
          key: "router-default",
          max: 5,
          pause: "schedulers",
          evict: "lru",
        },
      },
    );

    const promise = $state.go("workspace");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toEqual({
      mode: "keep-alive",
      key: "router-default",
      max: 1,
      pause: "background",
      evict: "lru",
      states: ["workspace"],
    });
  });

  it("lets a route opt out of router-wide retention", async () => {
    $state = bootstrapRoutePolicy(
      {},
      (routerModule) => {
        routerModule.router({
          name: "workspace",
          url: "/workspace",
          template: "workspace",
          policy: {
            retention: {
              mode: "destroy",
            },
          },
        });
      },
      {
        retention: {
          mode: "keep-alive",
          max: 5,
        },
      },
    );

    const promise = $state.go("workspace");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toEqual({
      mode: "destroy",
      max: 5,
      states: ["workspace"],
    });
  });

  it("omits effective retention policy when no route declares one", async () => {
    $state = bootstrapRoutePolicy({
      branches: ["jwt"],
      credentials: {
        jwt: () => "token",
      },
    });

    const promise = $state.go("admin.users");
    const retention = buildEffectiveRetentionPolicy(promise.transition);

    await promise;

    expect(retention).toBeUndefined();
  });

  it("assigns default retention fields to retained view configs", () => {
    const viewConfig: any = {
      _path: [
        {
          paramValues: {},
          state: {
            name: "workspace",
            self: {
              name: "workspace",
              policy: {
                retention: {
                  mode: "keep-alive",
                },
              },
            },
          },
        },
      ],
      _targetKey: "$default",
      _retention: undefined,
    };

    applyViewRetention(
      {
        _routerState: {
          _retention: undefined,
        },
      } as any,
      viewConfig,
    );

    expect(viewConfig._retention).toEqual({
      _mode: "keep-alive",
      _key: "workspace?#$default",
      _max: 10,
      _pause: undefined,
      _evict: undefined,
      _state: "workspace",
    });
  });

  it("rejects retention key policies that do not return strings", () => {
    const transition: any = {
      _routerState: {
        _injector: {
          invoke() {
            return 123;
          },
        },
      },
    };
    const viewConfig: any = {
      _path: [
        {
          paramValues: {
            id: "one",
          },
          state: {
            name: "workspace",
            self: {
              name: "workspace",
              policy: {
                retention: {
                  mode: "keep-alive",
                  key: function () {
                    return "ignored";
                  },
                },
              },
            },
          },
        },
      ],
      _targetKey: "$default",
      _retention: undefined,
    };

    expect(() => applyViewRetention(transition, viewConfig)).toThrowError(
      "Retention key policy must return a string.",
    );
  });
});

describe("transition canExit policy", () => {
  let $state;
  let moduleId = 0;

  function bootstrapCanExitStates(canExitPolicy) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `canExitPolicyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "edit",
        url: "/edit",
        template: "edit",
        policy: {
          transition: {
            canExit: canExitPolicy,
          },
        },
      });
      routerModule.router({
        name: "confirm",
        url: "/confirm",
        template: "confirm",
      });
      routerModule.router({
        name: "home",
        url: "/home",
        template: "home",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function goAndAssert(name: string, expected: string) {
    $state._defaultErrorHandler = function () {};
    return $state
      .go(name)
      .catch(() => {})
      .then(() => waitUntil(() => $state.current.name === expected))
      .then(() => expect($state.current.name).toBe(expected));
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("blocks transition when canExit returns false", async () => {
    $state = bootstrapCanExitStates((context) => {
      context.operation;

      return false;
    });

    await goAndAssert("edit", "edit");
    await goAndAssert("home", "edit");
  });

  it("allows transition when canExit resolves true", async () => {
    $state = bootstrapCanExitStates((context) => {
      context.operation;

      return context.to.name === "home" ? true : false;
    });

    await goAndAssert("edit", "edit");
    await goAndAssert("home", "home");
  });

  it("redirects transition before leaving state", async () => {
    $state = bootstrapCanExitStates((context) => {
      context.operation;

      return context.to.name === "home" ? $state.target("confirm") : undefined;
    });

    await goAndAssert("edit", "edit");
    await goAndAssert("home", "confirm");
  });

  it("rejects invalid canExit policy results", async () => {
    $state = bootstrapCanExitStates((context) => {
      context.operation;

      return context.to.name === "home" ? 123 : true;
    });

    await $state.go("edit");

    let error;

    try {
      await $state.go("home");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(String(error)).toContain(
      "Route canExit policy must return boolean or redirect.",
    );
    expect($state.current.name).toBe("edit");
  });
});

describe("transition dirty policy", () => {
  let $state;
  let moduleId = 0;

  function bootstrapDirtyStates(dirtyPolicy) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `dirtyPolicyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "editor",
        url: "/editor",
        template: "editor",
        policy: {
          transition: {
            dirty: dirtyPolicy,
          },
        },
      });
      routerModule.router({
        name: "saved",
        url: "/saved",
        template: "saved",
      });
      routerModule.router({
        name: "home",
        url: "/home",
        template: "home",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function goAndAssert(name: string, expected: string) {
    $state._defaultErrorHandler = function () {};
    return $state
      .go(name)
      .catch(() => {})
      .then(() => waitUntil(() => $state.current.name === expected))
      .then(() => expect($state.current.name).toBe(expected));
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("blocks transition when dirty policy returns false", async () => {
    $state = bootstrapDirtyStates({
      when: () => true,
      prompt: "Discard edits?",
    });

    const confirmSpy = spyOn(window, "confirm").and.returnValue(false);

    await goAndAssert("editor", "editor");
    await goAndAssert("saved", "editor");

    expect(confirmSpy).toHaveBeenCalledWith("Discard edits?");
  });

  it("allows transition when dirty policy returns false", async () => {
    $state = bootstrapDirtyStates({
      when: () => false,
      prompt: "Discard edits?",
    });

    spyOn(window, "confirm");

    await goAndAssert("editor", "editor");
    await goAndAssert("saved", "saved");
  });

  it("redirects transition from dirty state instead of blocking when configured", async () => {
    $state = bootstrapDirtyStates({
      when: (context) => context.to.name === "saved",
      redirectTo: "home",
    });

    await goAndAssert("editor", "editor");
    await goAndAssert("saved", "home");
  });

  it("blocks dirty transitions without a prompt", async () => {
    $state = bootstrapDirtyStates({
      when: () => true,
    });

    await $state.go("editor");

    let error;

    try {
      await $state.go("saved");
    } catch (e) {
      error = e;
    }

    expect(error).toBeDefined();
    expect(String(error)).toContain("Route dirty policy blocked transition");
    expect($state.current.name).toBe("editor");
  });
});

describe("transition policy composition with navigation policy", () => {
  let $state;
  let $security;
  let moduleId = 0;

  function bootstrapCompositionStates(canExitPolicy) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `policyCompositionModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "admin",
        url: "/admin",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          navigation: {
            require: ["authenticated"],
            redirectTo: "login",
          },
        },
      });
      routerModule.router({
        name: "admin.dashboard",
        url: "/dashboard",
        template: "admin-dashboard",
      });
      routerModule.router({
        name: "home",
        url: "/home",
        template: "home",
        policy: {
          transition: {
            canExit: canExitPolicy,
          },
        },
      });
      routerModule.router({
        name: "public",
        url: "/public",
        template: "public",
      });
      routerModule.router({
        name: "login",
        url: "/login",
        template: "login",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    $security = $injector.get("$security");
    return $injector.get("$state");
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("does not bypass navigation guards when a non-security policy redirects", async () => {
    $state = bootstrapCompositionStates(() => "admin.dashboard");

    await $state.go("home");

    const checkSpy = spyOn($security, "check").and.callThrough();
    await $state.go("public").catch(() => {});

    const navigationCalls = checkSpy.calls.all();

    expect(
      navigationCalls.some(
        (call) => call.args[0]?.to?.name === "admin.dashboard",
      ),
    ).toBeTrue();
  });
});

describe("transition loading policy", () => {
  let $state;
  let $transitions;
  let moduleId = 0;

  function bootstrapLoadingPolicyStates(
    policy: any = "loading",
    routerConfig?: any,
    includeRoutePolicy = true,
  ) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `loadingPolicyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "loading",
        url: "/loading",
        template: "loading",
      });

      routerModule.router({
        name: "profile",
        url: "/profile",
        template: "profile",
        ...(includeRoutePolicy
          ? {
              policy: {
                transition: {
                  loading: policy,
                },
              },
            }
          : {}),
        resolve: {
          payload: () =>
            new Promise<string>((resolve) => {
              setTimeout(() => resolve("ok"), 5);
            }),
        },
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return {
      $state: $injector.get("$state"),
      $transitions: $injector.get("$transitions"),
    };
  }

  function bootstrapInheritedLoadingOverrideStates() {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `loadingPolicyOverrideModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "parent",
        url: "/parent",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          transition: {
            loading: "loading",
          },
        },
      });

      routerModule.router({
        name: "loading",
        url: "/loading",
        template: "loading",
      });

      routerModule.router({
        name: "parent.editor",
        url: "/editor",
        template: "editor",
        policy: {
          transition: {
            loading: false,
          },
        },
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return {
      $state: $injector.get("$state"),
      $transitions: $injector.get("$transitions"),
    };
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("navigates through a loading state before the final target", async () => {
    const result = bootstrapLoadingPolicyStates();

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    const transition = $state.go("profile");

    await transition;

    deregister();

    expect(transitionOrder).toContain("loading");
    expect(transitionOrder).toEqual(["loading", "profile"]);

    expect($state.current.name).toBe("profile");
  });

  it("skips loading boundaries when policy is true", async () => {
    const result = bootstrapLoadingPolicyStates(true);

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("skips loading boundaries that point at the target route", async () => {
    const result = bootstrapLoadingPolicyStates("profile");

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("uses callable loading policies with route context", async () => {
    const result = bootstrapLoadingPolicyStates(
      function (context, state, from, to) {
        expect(context.operation).toBe("loading");
        expect(context.state).toBe(state);
        expect(context.from).toBe(from);
        expect(context.to).toBe(to);
        expect(state.name).toBe("profile");

        return "loading";
      },
    );

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["loading", "profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("uses callable loading policies returning target states", async () => {
    const result = bootstrapLoadingPolicyStates(function ($state) {
      return $state.target("loading");
    });

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["loading", "profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("skips callable loading policies that return no boundary", async () => {
    const result = bootstrapLoadingPolicyStates(() => undefined);

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("skips callable loading policies that return true", async () => {
    const result = bootstrapLoadingPolicyStates(() => true);

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("skips callable loading policies with invalid or same-target results", async () => {
    let result = bootstrapLoadingPolicyStates(() => 123);

    $state = result.$state;
    $transitions = result.$transitions;

    await $state.go("profile");
    expect($state.current.name).toBe("profile");

    result = bootstrapLoadingPolicyStates(() => ({ params: {} }));

    $state = result.$state;

    await $state.go("profile");
    expect($state.current.name).toBe("profile");
  });

  it("supports inherited loading policies with child overrides", async () => {
    const result = bootstrapInheritedLoadingOverrideStates();

    $state = result.$state;
    $transitions = result.$transitions;

    const transition = $state.go("parent.editor");

    await transition;

    expect($state.current.name).toBe("parent.editor");
  });

  it("uses router-wide loading policy defaults", async () => {
    const result = bootstrapLoadingPolicyStates(
      undefined,
      {
        loading: "loading",
      },
      false,
    );

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["loading", "profile"]);
    expect($state.current.name).toBe("profile");
  });

  it("lets route loading policy override router-wide defaults", async () => {
    const result = bootstrapLoadingPolicyStates(
      false,
      {
        loading: "loading",
      },
      true,
    );

    $state = result.$state;
    $transitions = result.$transitions;
    const transitionOrder: string[] = [];
    const deregister = $transitions.onSuccess({}, (trans: any) => {
      transitionOrder.push(trans.to().name);
    });

    await $state.go("profile");

    deregister();

    expect(transitionOrder).toEqual(["profile"]);
    expect($state.current.name).toBe("profile");
  });
});

describe("transition retry policy", () => {
  let $state;
  let moduleId = 0;
  let resolveAttempts: number;
  let lazyLoadAttempts: number;

  function bootstrapRetryResolveState(
    policy,
    errorBoundary?: any,
    routerConfig?: any,
    includeRouteRetry = true,
  ) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `retryPolicyModule${moduleId}`;

    resolveAttempts = 0;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "error",
        url: "/error",
        template: "error",
      });

      routerModule.router({
        name: "retryResolve",
        url: "/retry-resolve",
        template: "retry-resolve",
        policy: {
          transition: {
            ...(includeRouteRetry ? { retry: policy } : {}),
            ...(errorBoundary !== undefined ? { errorBoundary } : {}),
          },
        },
        resolve: {
          payload: () => {
            resolveAttempts += 1;

            if (resolveAttempts === 1) {
              return Promise.reject(new Error("temporary"));
            }

            return "ok";
          },
        },
      });

      routerModule.router({
        name: "base",
        url: "/base",
        template: "base",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function bootstrapRetryLazyState(policy): void {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    lazyLoadAttempts = 0;

    const moduleName = `retryPolicyLazyModule${moduleId}`;
    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "parent",
        url: "/parent",
        template: "parent",
        policy: {
          transition: {
            retry: policy,
          },
        },
      });

      routerModule.lazyState("parent", async () => {
        lazyLoadAttempts += 1;

        if (lazyLoadAttempts === 1) {
          throw new Error("temporary load failure");
        }

        return [
          {
            name: "parent.lazy",
            url: "/lazy",
            template: "parent lazy",
          },
        ];
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    $state = $injector.get("$state");
  }

  function goAndAssert(name: string, expected: string) {
    $state._defaultErrorHandler = function () {};
    return $state
      .go(name)
      .catch(() => {})
      .then(() => waitUntil(() => $state.current.name === expected))
      .then(() => expect($state.current.name).toBe(expected));
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("retries failed transitions when retry policy allows", async () => {
    $state = bootstrapRetryResolveState(2);

    await goAndAssert("retryResolve", "retryResolve");

    expect(resolveAttempts).toBe(2);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "retry",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
    expect($state._policyDiagnostics[0].error).toBeUndefined();
  });

  it("retries failed transitions when retry policy callback allows", async () => {
    $state = bootstrapRetryResolveState(function (context, state, from, to) {
      expect(context.operation).toBe("retry");
      expect(context.attempt).toBe(1);
      expect(context.state).toBe(state);
      expect(context.from).toBe(from);
      expect(context.to).toBe(to);
      expect(context.error).toEqual(jasmine.any(Error));

      return true;
    });

    await goAndAssert("retryResolve", "retryResolve");

    expect(resolveAttempts).toBe(2);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "retry",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
  });

  it("does not retry when retry policy blocks failures", async () => {
    $state = bootstrapRetryResolveState(false);

    let error;

    await goAndAssert("base", "base");

    try {
      await $state.go("retryResolve");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(resolveAttempts).toBe(1);
    expect($state.current.name).toBe("base");
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "blocked",
        _from: "base",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
    expect($state._policyDiagnostics[0].error).toBeUndefined();
  });

  it("does not retry when numeric retry policy allows no attempts", async () => {
    $state = bootstrapRetryResolveState(0);

    let error;

    await goAndAssert("base", "base");

    try {
      await $state.go("retryResolve");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(resolveAttempts).toBe(1);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "blocked",
        _from: "base",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
  });

  it("uses an error boundary after retry policy blocks recovery", async () => {
    $state = bootstrapRetryResolveState(false, "error");

    await goAndAssert("base", "base");
    await goAndAssert("retryResolve", "error");

    expect(resolveAttempts).toBe(1);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "blocked",
        _from: "base",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
  });

  it("rejects retry policy callbacks that do not return a retry decision", async () => {
    $state = bootstrapRetryResolveState(() => "retry");
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("retryResolve");
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(jasmine.any(Error));
    expect(error.message).toBe(
      "Route retry policy must return boolean or number.",
    );
  });

  it("retries lazy state loading failure and inherits retry policy from parent", async () => {
    bootstrapRetryLazyState(true);

    await goAndAssert("parent.lazy", "parent.lazy");

    expect(lazyLoadAttempts).toBe(2);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "retry",
        _to: "parent.lazy",
        _policyState: "parent",
        _attempt: 1,
      }),
    ]);
    expect($state._policyDiagnostics[0].error).toBeUndefined();
  });

  it("uses router-wide retry policy defaults", async () => {
    $state = bootstrapRetryResolveState(
      undefined,
      undefined,
      {
        retry: 2,
      },
      false,
    );

    await goAndAssert("retryResolve", "retryResolve");

    expect(resolveAttempts).toBe(2);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "retry",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
  });

  it("lets route retry policy override router-wide defaults", async () => {
    $state = bootstrapRetryResolveState(false, undefined, {
      retry: 2,
    });

    await goAndAssert("base", "base");

    let error;

    try {
      await $state.go("retryResolve");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(resolveAttempts).toBe(1);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "blocked",
        _to: "retryResolve",
        _policyState: "retryResolve",
        _attempt: 1,
      }),
    ]);
  });
});

describe("transition fallback policy", () => {
  let $state;
  let moduleId = 0;
  let resolveAttempts: number;

  function bootstrapFallbackResolveState(
    fallbackTo: any = "fallback",
    routerConfig?: any,
    includeRoutePolicy = true,
  ) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `fallbackPolicyModule${moduleId}`;

    resolveAttempts = 0;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "base",
        url: "/base",
        template: "base",
      });

      routerModule.router({
        name: "fallback",
        url: "/fallback",
        template: "fallback",
      });

      routerModule.router({
        name: "fail",
        url: "/fail",
        template: "fail",
        ...(includeRoutePolicy
          ? {
              policy: {
                transition: {
                  fallbackTo,
                },
              },
            }
          : {}),
        resolve: {
          payload: () => {
            resolveAttempts += 1;

            return Promise.reject(new Error("temporary"));
          },
        },
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function bootstrapInheritedFallbackState() {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `fallbackInheritedModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });
    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "workspace",
        url: "/workspace",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          transition: {
            fallbackTo: "fallback",
          },
        },
      });

      routerModule.router({
        name: "workspace.editor",
        url: "/editor",
        template: "workspace editor",
        policy: {
          transition: {
            retry: false,
          },
        },
        resolve: {
          payload: () => Promise.reject(new Error("temporary")),
        },
      });

      routerModule.router({
        name: "fallback",
        url: "/fallback",
        template: "fallback",
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function bootstrapLazyFallbackState(parentPolicy?: any, routerConfig?: any) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `fallbackLazyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "workspace",
        url: "/workspace",
        abstract: true,
        template: "<ng-view></ng-view>",
        ...(parentPolicy !== undefined
          ? {
              policy: {
                transition: {
                  fallbackTo: parentPolicy,
                },
              },
            }
          : {}),
      });

      routerModule.router({
        name: "fallback",
        url: "/fallback",
        template: "fallback",
      });

      routerModule.lazyState("workspace", () => {
        return Promise.reject(new Error("lazy fallback failure"));
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function goAndAssert(name: string, expected: string) {
    $state._defaultErrorHandler = function () {};

    return $state
      .go(name)
      .catch(() => {})
      .then(() => waitUntil(() => $state.current.name === expected))
      .then(() => expect($state.current.name).toBe(expected));
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("falls back to a configured state on recoverable transition failures", async () => {
    $state = bootstrapFallbackResolveState();

    await goAndAssert("base", "base");
    await goAndAssert("fail", "fallback");

    expect(resolveAttempts).toBe(1);
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _from: "base",
        _to: "fail",
        _policyState: "fail",
        _target: "fallback",
      }),
    ]);
    expect($state._policyDiagnostics[0].error).toBeUndefined();
  });

  it("falls back with an object target policy", async () => {
    $state = bootstrapFallbackResolveState({
      state: "fallback",
      params: {},
    });

    await goAndAssert("base", "base");
    await goAndAssert("fail", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _from: "base",
        _to: "fail",
        _policyState: "fail",
        _target: "fallback",
      }),
    ]);
  });

  it("falls back with object target policy default params", async () => {
    $state = bootstrapFallbackResolveState({
      state: "fallback",
    });

    await goAndAssert("base", "base");
    await goAndAssert("fail", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _from: "base",
        _to: "fail",
        _policyState: "fail",
        _target: "fallback",
      }),
    ]);
  });

  it("ignores invalid fallback policy shapes", async () => {
    $state = bootstrapFallbackResolveState(123);

    await goAndAssert("base", "base");

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("base");
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "skipped",
        _from: "base",
        _to: "fail",
        _policyState: "fail",
        _reason: "invalid-target",
      }),
    ]);
  });

  it("skips fallback when object policy points at the failed target", async () => {
    $state = bootstrapFallbackResolveState({
      params: {},
    });

    await goAndAssert("base", "base");

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("base");
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "skipped",
        _from: "base",
        _to: "fail",
        _policyState: "fail",
        _target: "fail",
        _reason: "same-target",
      }),
    ]);
  });

  it("skips fallback when policy target is invalid", async () => {
    $state = bootstrapFallbackResolveState("missing");

    await goAndAssert("base", "base");

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("base");
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "skipped",
        _from: "base",
        _to: "fail",
        _policyState: "fail",
        _reason: "invalid-target",
      }),
    ]);
  });

  it("uses inherited fallback policy when child transition fails", async () => {
    $state = bootstrapInheritedFallbackState();

    await goAndAssert("workspace.editor", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "retry",
        _decision: "blocked",
        _to: "workspace.editor",
        _policyState: "workspace.editor",
        _attempt: 1,
      }),
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _to: "workspace.editor",
        _policyState: "workspace",
        _target: "fallback",
      }),
    ]);
  });

  it("uses router-wide fallback policy defaults", async () => {
    $state = bootstrapFallbackResolveState(
      undefined,
      {
        fallbackTo: "fallback",
      },
      false,
    );

    await goAndAssert("base", "base");
    await goAndAssert("fail", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _to: "fail",
        _policyState: "fail",
        _target: "fallback",
      }),
    ]);
  });

  it("falls back when lazy route loading fails", async () => {
    $state = bootstrapLazyFallbackState("fallback");

    await goAndAssert("workspace.lazy", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _to: "workspace.lazy",
        _policyState: "workspace",
        _target: "fallback",
      }),
    ]);
  });

  it("falls back from lazy loading with an object target", async () => {
    $state = bootstrapLazyFallbackState({
      state: "fallback",
      params: {},
    });

    await goAndAssert("workspace.lazy", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _to: "workspace.lazy",
        _target: "fallback",
      }),
    ]);
  });

  it("rejects partial lazy fallback objects whose default target is missing", async () => {
    $state = bootstrapLazyFallbackState({ params: {} });
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejected();

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "skipped",
        _reason: "invalid-target",
      }),
    ]);
  });

  it("skips lazy recovery when fallback resolves to an existing failed target", async () => {
    $state = bootstrapLazyFallbackState();
    const fallback = $state.get("fallback");

    fallback.policy = {
      transition: {
        fallbackTo: { params: {} },
      },
    };

    const recovered = await $state._recoverLazyLoadFailure(
      $state.target("fallback"),
      new Error("failed"),
    );

    expect(recovered).toBeUndefined();
    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "skipped",
        _target: "fallback",
        _reason: "same-target",
      }),
    ]);
  });

  it("uses failed lazy params when fallback object only names a state", async () => {
    $state = bootstrapLazyFallbackState({ state: "fallback" });

    await goAndAssert("workspace.lazy", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _target: "fallback",
      }),
    ]);
  });

  it("records invalid lazy fallback policy shapes", async () => {
    $state = bootstrapLazyFallbackState(123);
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejected();

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "skipped",
        _reason: "invalid-target",
      }),
    ]);
  });

  it("uses router-wide fallback defaults when lazy route loading fails", async () => {
    $state = bootstrapLazyFallbackState(undefined, {
      fallbackTo: "fallback",
    });

    await goAndAssert("workspace.lazy", "fallback");

    expect($state._policyDiagnostics).toEqual([
      jasmine.objectContaining({
        _kind: "fallback",
        _decision: "redirected",
        _to: "workspace.lazy",
        _policyState: "",
        _target: "fallback",
      }),
    ]);
  });
});

describe("transition error boundary policy", () => {
  let $state;
  let moduleId = 0;

  function bootstrapErrorBoundaryStates(
    policy?: (context: any) => unknown,
    useAlias?: boolean,
    routerConfig?: any,
    includeRoutePolicy = true,
  ) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `errorBoundaryPolicyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "error",
        url: "/error",
        template: "error",
      });

      routerModule.router({
        name: "fail",
        url: "/fail",
        template: "fail",
        ...(includeRoutePolicy
          ? {
              policy: useAlias
                ? {
                    transition: {
                      error: policy,
                    },
                  }
                : {
                    transition: {
                      errorBoundary: policy,
                    },
                  },
            }
          : {}),
        resolve: {
          payload: () => Promise.reject(new Error("boundary test")),
        },
      });

      routerModule.router({
        name: "parent",
        url: "/parent",
        abstract: true,
        template: "<ng-view></ng-view>",
        policy: {
          transition: {
            errorBoundary: (context) => {
              if (context.error) {
                return {
                  state: "error",
                };
              }

              return "error";
            },
          },
        },
      });

      routerModule.router({
        name: "parent.sibling",
        url: "/sibling",
        template: "sibling",
      });

      routerModule.router({
        name: "parent.failingChild",
        url: "/failing-child",
        template: "failing child",
        resolve: {
          payload: () => Promise.reject(new Error("child failed")),
        },
      });

      routerModule.router({
        name: "errorChildOverride",
        url: "/error-child-override",
        template: "error child override",
      });

      routerModule.router({
        name: "parent.failingChildOverride",
        url: "/failing-child-override",
        template: "failing child override",
        policy: {
          transition: {
            errorBoundary: "errorChildOverride",
          },
        },
        resolve: {
          payload: () => Promise.reject(new Error("child override failed")),
        },
      });

      routerModule.router({
        name: "parent.child",
        url: "/child",
        template: "child",
        resolve: {
          payload: () => Promise.resolve("ok"),
        },
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function bootstrapLazyErrorBoundaryState(
    parentPolicy?: any,
    routerConfig?: any,
  ) {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    moduleId += 1;

    const moduleName = `errorBoundaryLazyModule${moduleId}`;

    const app = window.angular.module(moduleName, []);

    app.config({
      $security: {
        defaultDecision: "allow",
      },
    });

    if (routerConfig) {
      app.config({
        $router: routerConfig,
      });
    }

    configureRoutes(app, (routerModule) => {
      routerModule.router({
        name: "workspace",
        url: "/workspace",
        abstract: true,
        template: "<ng-view></ng-view>",
        ...(parentPolicy !== undefined
          ? {
              policy: {
                transition: {
                  errorBoundary: parentPolicy,
                },
              },
            }
          : {}),
      });

      routerModule.router({
        name: "error",
        url: "/error",
        template: "error",
      });

      routerModule.router({
        name: "base",
        url: "/base",
        template: "base",
      });

      routerModule.lazyState("workspace", () => {
        return Promise.reject(new Error("lazy error boundary failure"));
      });
    });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      moduleName,
    ]);

    return $injector.get("$state");
  }

  function goAndAssert(name: string, expected: string) {
    $state._defaultErrorHandler = function () {};
    return $state
      .go(name)
      .catch(() => {})
      .then(() => waitUntil(() => $state.current.name === expected))
      .then(() => expect($state.current.name).toBe(expected));
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  it("redirects to declared error boundary on recoverable failure", async () => {
    $state = bootstrapErrorBoundaryStates("error");

    await goAndAssert("fail", "error");
  });

  it("redirects to declared error boundary object on recoverable failure", async () => {
    $state = bootstrapErrorBoundaryStates({
      state: "error",
      params: {},
    });

    await goAndAssert("fail", "error");
  });

  it("redirects to declared error boundary object with default params", async () => {
    $state = bootstrapErrorBoundaryStates({
      state: "error",
    });

    await goAndAssert("fail", "error");
  });

  it("redirects to a direct target state error boundary", async () => {
    $state = bootstrapErrorBoundaryStates("error");
    $state.get("fail").policy.transition.errorBoundary = $state.target("error");

    await goAndAssert("fail", "error");
  });

  it("ignores invalid declared error boundary targets", async () => {
    $state = bootstrapErrorBoundaryStates("missing");
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("");
  });

  it("ignores same-target declared error boundaries", async () => {
    $state = bootstrapErrorBoundaryStates({
      params: {},
    });
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("");
  });

  it("ignores non-callable error boundary policy values", async () => {
    $state = bootstrapErrorBoundaryStates(null);
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("");
  });

  it("supports alias `error` for recoverable failure boundaries", async () => {
    $state = bootstrapErrorBoundaryStates("error", true);

    await goAndAssert("fail", "error");
  });

  it("inherits parent error boundary when child has no policy", async () => {
    $state = bootstrapErrorBoundaryStates((context) => {
      context.error;

      return undefined;
    });

    await goAndAssert("parent.failingChild", "error");
  });

  it("lets a child error boundary override an inherited parent boundary", async () => {
    $state = bootstrapErrorBoundaryStates((context) => {
      context.error;

      return undefined;
    });

    await goAndAssert("parent.failingChildOverride", "errorChildOverride");
  });

  it("uses injectable policy to redirect with context error", async () => {
    $state = bootstrapErrorBoundaryStates((context) => {
      expect(context.operation).toBe("error");
      expect(context.error).toEqual(jasmine.any(Error));

      return "error";
    });

    await goAndAssert("fail", "error");
  });

  it("ignores injectable same-target error boundary objects", async () => {
    $state = bootstrapErrorBoundaryStates(() => ({
      params: {},
    }));
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("");
  });

  it("uses injectable policy to redirect with a target state", async () => {
    $state = bootstrapErrorBoundaryStates(function ($state) {
      return $state.target("error");
    });

    await goAndAssert("fail", "error");
  });

  it("rejects injectable error boundary policy results with invalid shape", async () => {
    $state = bootstrapErrorBoundaryStates(() => 123);
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toEqual(jasmine.any(Error));
    expect(error.message).toBe(
      "Route error boundary policy must return TargetState, redirect target, or undefined.",
    );
  });

  it("uses router-wide error boundary defaults", async () => {
    $state = bootstrapErrorBoundaryStates(
      undefined,
      false,
      {
        errorBoundary: "error",
      },
      false,
    );

    await goAndAssert("fail", "error");
  });

  it("lets route error boundary override router-wide defaults", async () => {
    $state = bootstrapErrorBoundaryStates("missing", false, {
      errorBoundary: "error",
    });
    $state._defaultErrorHandler = function () {};

    let error;

    try {
      await $state.go("fail");
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect($state.current.name).toBe("");
  });

  it("uses inherited error boundary when lazy route loading fails", async () => {
    $state = bootstrapLazyErrorBoundaryState("error");

    await goAndAssert("workspace.lazy", "error");
  });

  it("uses callable error boundary when lazy route loading fails", async () => {
    $state = bootstrapLazyErrorBoundaryState((context) => {
      expect(context.operation).toBe("error");
      expect(context.transition).toBeUndefined();
      expect(context.error).toEqual(jasmine.any(Error));

      return "error";
    });

    await goAndAssert("workspace.lazy", "error");
  });

  it("evaluates lazy error boundaries from the current route", async () => {
    $state = bootstrapLazyErrorBoundaryState((context) => {
      expect(context.from.name).toBe("base");
      expect(context.to.name).toBe("base");

      return {
        state: "error",
        params: {},
      };
    });

    await goAndAssert("base", "base");
    await goAndAssert("workspace.lazy", "error");
  });

  it("uses a direct target error boundary when lazy loading fails", async () => {
    $state = bootstrapLazyErrorBoundaryState("error");
    $state.get("workspace").policy.transition.errorBoundary =
      $state.target("error");

    await goAndAssert("workspace.lazy", "error");
  });

  it("uses an object error boundary when lazy loading fails", async () => {
    $state = bootstrapLazyErrorBoundaryState({
      state: "error",
      params: {},
    });

    await goAndAssert("workspace.lazy", "error");
  });

  it("uses failed lazy params for partial object error boundaries", async () => {
    $state = bootstrapLazyErrorBoundaryState({ state: "error" });

    await goAndAssert("workspace.lazy", "error");
  });

  it("ignores same-target lazy object error boundaries", async () => {
    $state = bootstrapLazyErrorBoundaryState({ params: {} });
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejected();

    expect($state.current.name).toBe("");
  });

  it("uses callable target and object results for lazy error boundaries", async () => {
    $state = bootstrapLazyErrorBoundaryState(function ($state) {
      return $state.target("error");
    });

    await goAndAssert("workspace.lazy", "error");

    $state = bootstrapLazyErrorBoundaryState(() => ({ state: "error" }));

    await goAndAssert("workspace.lazy", "error");
  });

  it("allows callable lazy error boundaries to decline recovery", async () => {
    $state = bootstrapLazyErrorBoundaryState(() => undefined);
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejected();

    expect($state.current.name).toBe("");
  });

  it("rejects invalid callable lazy error boundary results", async () => {
    $state = bootstrapLazyErrorBoundaryState(() => 123);
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejectedWithError(
      "Route error boundary policy must return TargetState, redirect target, or undefined.",
    );
  });

  it("rejects callable lazy error boundary objects without a target", async () => {
    $state = bootstrapLazyErrorBoundaryState(() => ({}));
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejectedWithError(
      "Route error boundary policy must return TargetState, redirect target, or undefined.",
    );
  });

  it("uses failed target names for callable lazy boundary params", async () => {
    $state = bootstrapLazyErrorBoundaryState();
    const errorState = $state.get("error");

    errorState.policy = {
      transition: {
        errorBoundary: () => ({ params: {} }),
      },
    };

    const recovered = await $state._recoverLazyLoadFailure(
      $state.target("error"),
      new Error("failed"),
    );

    expect(recovered).toBeUndefined();
  });

  it("ignores non-callable lazy error boundary values", async () => {
    $state = bootstrapLazyErrorBoundaryState(null);
    $state._defaultErrorHandler = function () {};

    await expectAsync($state.go("workspace.lazy")).toBeRejected();

    expect($state.current.name).toBe("");
  });

  it("uses router-wide error boundary defaults when lazy route loading fails", async () => {
    $state = bootstrapLazyErrorBoundaryState(undefined, {
      errorBoundary: "error",
    });

    await goAndAssert("workspace.lazy", "error");
  });
});
