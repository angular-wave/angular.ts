// @ts-nocheck
/// <reference types="jasmine" />
import {
  createElementFromHTML,
  dealoc,
  getCacheData,
} from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { wasmModule } from "../../runtime/wasm.ts";
import { createCanvasWorkAdapter } from "../../services/utility/retained-scheduler.ts";
import { wait, waitUntil } from "../../shared/test-utils.ts";

function registerStates(module, ...states) {
  states.forEach((state) => module.router(state));
}

describe("ngView", () => {
  window.location.hash = "";
  const initialUrl = `${window.location.pathname}${window.location.search}`;

  let stateRuntime,
    scope,
    $compile,
    elem = document.getElementById("app"),
    log,
    app,
    $injector,
    $state,
    $view,
    $anchorScroll,
    animateSpies,
    retainedCompileCount,
    retainedLimitedCompiles,
    retainedLimitedDestroys,
    retainedParamCompiles,
    retainedCustomKeyCompiles,
    retainedQueryCompiles,
    retainedDynamicCompiles,
    retainedInjectedKeyCompiles,
    retainedInjectedKeyInvocations,
    retainedInjectedEvictCompiles,
    retainedInjectedEvictDestroys,
    retainedInjectedEvictInvocations,
    retainedNestedCompiles,
    retainedNestedLifecycle,
    retainedEvictionCleanup,
    retainedEvictionCleanupScope,
    retainedNestedCleanup,
    retainedNestedCleanupScope,
    retainedCanExitAllowed,
    retainedCanExitCompiles,
    retainedDirtyCompiles,
    retainedSecurityToken,
    retainedSecurityCompiles,
    retainedErrorAllowed,
    retainedErrorCompiles,
    retainedLoadingCompiles,
    retainedLoadingResolve,
    retainedLazyLoadAttempts,
    retainedLazyCompiles,
    errorLog = [];

  const aState = {
      name: "a",
      template: "aState template",
    },
    bState = {
      name: "b",
      template: "bState template",
    },
    cState = {
      name: "c",
      views: {
        cview: {
          template: "cState cview template",
        },
      },
    },
    dState = {
      name: "d",
      views: {
        dview1: {
          template: "dState dview1 template",
        },
        dview2: {
          template: "dState dview2 template",
        },
      },
    },
    eState = {
      name: "e",
      template: '<div ng-view="eview" class="eview"></div>',
    },
    fState = {
      name: "e.f",
      views: {
        eview: {
          template: "fState eview template",
        },
      },
    },
    gState = {
      name: "g",
      template: '<div ng-view="inner"><span>{{content}}</span></div>',
    },
    hState = {
      name: "g.h",
      views: {
        inner: {
          template: "hState inner template",
        },
      },
    },
    iState = {
      name: "i",
      template:
        "<div ng-view>" +
        '<ul><li ng-repeat="item in items">{{item}}</li></ul>' +
        "</div>",
    },
    jState = {
      name: "j",
      template: "jState",
    },
    kState = {
      name: "k",
      controller: [
        "$scope",
        function ($scope) {
          $scope.someProperty = "value";
        },
      ],
      template: "{{someProperty}}",
    },
    lState = {
      name: "l",
      views: {
        view1: {
          template: "view1",
        },
        view2: {
          template: "view2",
        },
        view3: {
          template: "view3",
        },
      },
    },
    mState = {
      name: "m",
      template: "mState",
      controller: [
        "$scope",
        "$element",
        function ($scope, $element) {
          $scope.elementId = $element.getAttribute("id");
        },
      ],
    },
    nState = {
      name: "n",
      template: "nState",
      controller: [
        "$scope",
        "$element",
        function ($scope, $element) {
          const data = getCacheData($element, "$ngViewAnim");

          $scope.$on("$destroy", () => {
            log += "destroy;";
          });
          data.$animEnter.then(() => {
            log += "animEnter;";
          });
          data.$animLeave.then(() => {
            log += "animLeave;";
          });
        },
      ],
    },
    retainedState = {
      name: "retained",
      template:
        '<button class="retained-counter" ng-click="count = count + 1">{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedCompileCount += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 2,
        },
      },
    },
    retainedLimitedAState = {
      name: "retainedLimitedA",
      template:
        '<button class="retained-limited-a" ng-click="count = count + 1">A:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedLimitedCompiles.a += 1;
          $scope.count = 0;
          $scope.$on("$destroy", () => {
            retainedLimitedDestroys.a += 1;
          });
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 1,
          evict: "oldest",
        },
      },
    },
    retainedLimitedBState = {
      name: "retainedLimitedB",
      template:
        '<button class="retained-limited-b" ng-click="count = count + 1">B:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedLimitedCompiles.b += 1;
          $scope.count = 0;
          $scope.$on("$destroy", () => {
            retainedLimitedDestroys.b += 1;
          });
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 1,
          evict: "oldest",
        },
      },
    },
    retainedParamState = {
      name: "retainedParam",
      params: {
        id: null,
      },
      template:
        '<button class="retained-param" ng-click="count = count + 1">P:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedParamCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
      },
    },
    retainedCustomKeyState = {
      name: "retainedCustomKey",
      params: {
        id: null,
      },
      template:
        '<button class="retained-custom-key" ng-click="count = count + 1">C:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedCustomKeyCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          key: "shared-custom-key",
          max: 4,
        },
      },
    },
    retainedQueryState = {
      name: "retainedQuery",
      url: "/retained-query?term",
      template:
        '<button class="retained-query" ng-click="count = count + 1">Q:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedQueryCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
      },
    },
    retainedDynamicState = {
      name: "retainedDynamic",
      params: {
        id: {
          value: "one",
          dynamic: true,
        },
      },
      template:
        '<button class="retained-dynamic" ng-click="count = count + 1">D:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedDynamicCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
      },
    },
    retainedCanExitState = {
      name: "retainedCanExit",
      template:
        '<button class="retained-can-exit" ng-click="count = count + 1">X:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedCanExitCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
        transition: {
          canExit: () => retainedCanExitAllowed,
        },
      },
    },
    retainedDirtyState = {
      name: "retainedDirty",
      template:
        '<button class="retained-dirty" ng-click="count = count + 1">Y:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedDirtyCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
        transition: {
          dirty: {
            when: () => true,
            prompt: "Discard retained dirty route?",
          },
        },
      },
    },
    retainedSecurityState = {
      name: "retainedSecurity",
      template:
        '<button class="retained-security" ng-click="count = count + 1">Z:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedSecurityCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        navigation: {
          authenticated: true,
          redirectTo: "b",
        },
        retention: {
          mode: "keep-alive",
          max: 4,
        },
      },
    },
    retainedErrorBoundaryState = {
      name: "retainedErrorBoundary",
      template:
        '<button class="retained-error-boundary" ng-click="count = count + 1">R:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedErrorCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
        transition: {
          errorBoundary: "b",
        },
      },
      resolve: {
        payload: () => {
          if (!retainedErrorAllowed) {
            return Promise.reject(new Error("retained boundary blocked"));
          }

          return "ok";
        },
      },
    },
    retainedLoadingBoundaryLoadingState = {
      name: "retainedLoadingBoundaryLoading",
      template: "loading retained route",
    },
    retainedLoadingBoundaryState = {
      name: "retainedLoadingBoundary",
      template:
        '<button class="retained-loading-boundary" ng-click="count = count + 1">L:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedLoadingCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
        },
        transition: {
          loading: "retainedLoadingBoundaryLoading",
        },
      },
      resolve: {
        payload: () =>
          new Promise((resolve) => {
            retainedLoadingResolve = resolve;
          }),
      },
    },
    retainedInjectedKeyState = {
      name: "retainedInjectedKey",
      params: {
        id: null,
      },
      template:
        '<button class="retained-injected-key" ng-click="count = count + 1">I:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedInjectedKeyCompiles += 1;
          $scope.count = 0;
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          key: [
            "retentionPrefix",
            "context",
            function (retentionPrefix, context) {
              retainedInjectedKeyInvocations += 1;

              return `${retentionPrefix}:${String(context.params.id)[0]}`;
            },
          ],
          max: 4,
        },
      },
    },
    retainedInjectedEvictAState = {
      name: "retainedInjectedEvictA",
      template:
        '<button class="retained-injected-evict-a" ng-click="count = count + 1">EA:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedInjectedEvictCompiles.a += 1;
          $scope.count = 0;
          $scope.$on("$destroy", () => {
            retainedInjectedEvictDestroys.a += 1;
          });
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          key: "evict-a",
          max: 1,
          evict: [
            "evictTarget",
            "context",
            function (evictTarget, context) {
              retainedInjectedEvictInvocations += 1;

              return context.size > context.max ? evictTarget : undefined;
            },
          ],
        },
      },
    },
    retainedInjectedEvictBState = {
      name: "retainedInjectedEvictB",
      template:
        '<button class="retained-injected-evict-b" ng-click="count = count + 1">EB:{{count}}</button>',
      controller: [
        "$scope",
        function ($scope) {
          retainedInjectedEvictCompiles.b += 1;
          $scope.count = 0;
          $scope.$on("$destroy", () => {
            retainedInjectedEvictDestroys.b += 1;
          });
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          key: "evict-b",
          max: 1,
          evict: [
            "evictTarget",
            "context",
            function (evictTarget, context) {
              retainedInjectedEvictInvocations += 1;

              return context.size > context.max ? evictTarget : undefined;
            },
          ],
        },
      },
    },
    retainedNestedState = {
      name: "retainedNested",
      template:
        '<section><button class="retained-nested-parent" ng-click="parentCount = parentCount + 1">NP:{{parentCount}}</button><ng-view name="inner"></ng-view></section>',
      controller: [
        "$scope",
        function ($scope) {
          retainedNestedCompiles.parent += 1;
          $scope.parentCount = 0;
          $scope.$on("$viewRetentionPause", () => {
            retainedNestedLifecycle.parentPause += 1;
          });
          $scope.$on("$viewRetentionResume", () => {
            retainedNestedLifecycle.parentResume += 1;
          });
        },
      ],
      policy: {
        retention: {
          mode: "keep-alive",
          max: 4,
          pause: "schedulers",
        },
      },
    },
    retainedNestedChildState = {
      name: "retainedNested.child",
      views: {
        inner: {
          template:
            '<button class="retained-nested-child" ng-click="childCount = childCount + 1">NC:{{childCount}}</button>',
          controller: [
            "$scope",
            function ($scope) {
              retainedNestedCompiles.child += 1;
              $scope.childCount = 0;
              $scope.$on("$viewRetentionPause", () => {
                retainedNestedLifecycle.childPause += 1;
              });
              $scope.$on("$viewRetentionResume", () => {
                retainedNestedLifecycle.childResume += 1;
              });
            },
          ],
        },
      },
    };

  const retainedNestedCleanupParentState = {
    name: "retainedNestedCleanup",
    template:
      '<section class="retention-nested-cleanup-parent"><ng-view name="inner"></ng-view></section>',
    policy: {
      retention: {
        mode: "keep-alive",
        max: 4,
        pause: "schedulers",
      },
    },
  };

  const retainedNestedCleanupChildState = {
    name: "retainedNestedCleanup.child",
    views: {
      inner: {
        template:
          '<div class="retention-nested-cleanup-child"><button id="nested-cleanup-worker" ng-worker="/workers/echo.js"></button></div>',
        controller: [
          "$scope",
          "$element",
          "$eventBus",
          "$wasm",
          function ($scope, $element, $eventBus, $wasm) {
            retainedNestedCleanup.scopeCreated += 1;
            retainedNestedCleanupScope = $scope;
            retainedNestedCleanup.wasmScope = $wasm.load({
              source: "/integrations/wasm/c/examples/todo/main.wasm",
            });
            void retainedNestedCleanup.wasmScope
              .bind($scope, { name: "retainedNestedCleanup" })
              .catch(() => undefined);

            const observedElement = $element.matches?.(
              ".retention-nested-cleanup-child",
            )
              ? $element
              : ($element.querySelector?.(".retention-nested-cleanup-child") ??
                $element);

            const observer = new MutationObserver(() => {
              retainedNestedCleanup.attrObserverEvents += 1;
            });

            observer.observe(observedElement, { attributes: true });

            $scope.$watch("probeValue", () => {
              retainedNestedCleanup.watchRuns += 1;
            });

            $scope.probeValue = 1;

            const unsubscribe = $eventBus.subscribe(
              "retention.nested.cleanup",
              () => {
                retainedNestedCleanup.eventBusDeliveries += 1;
              },
              $scope,
            );

            const canvasAdapter = createCanvasWorkAdapter($scope);

            $scope.$broadcast("$viewRetentionPause");

            canvasAdapter.schedule(() => {
              retainedNestedCleanup.canvasRuns += 1;
            });

            $scope.$on("$destroy", () => {
              retainedNestedCleanup.scopeDestroyEvents += 1;
              retainedNestedCleanup.wasmScope.dispose();
              observer.disconnect();
              retainedNestedCleanup.attrObserverDisconnects += 1;
              unsubscribe();
            });
          },
        ],
      },
    },
  };

  const retainedRetentionCleanupState = {
    name: "retainedEvictionCleanupA",
    template:
      '<div class="retention-eviction-probe"><button id="probe-worker" ng-worker="/workers/echo.js"></button></div>',
    controller: [
      "$scope",
      "$element",
      "$eventBus",
      "$wasm",
      function ($scope, $element, $eventBus, $wasm) {
        retainedEvictionCleanup.scopeCreated += 1;
        retainedEvictionCleanupScope = $scope;
        retainedEvictionCleanup.wasmScope = $wasm.load({
          source: "/integrations/wasm/c/examples/todo/main.wasm",
        });
        void retainedEvictionCleanup.wasmScope
          .bind($scope, { name: "retentionEvictionProbe" })
          .catch(() => undefined);

        const observedElement = $element.matches?.(".retention-eviction-probe")
          ? $element
          : ($element.querySelector?.(".retention-eviction-probe") ?? $element);

        const observer = new MutationObserver(() => {
          retainedEvictionCleanup.attrObserverEvents += 1;
        });

        observer.observe(observedElement, { attributes: true });

        $scope.$watch("probeValue", () => {
          retainedEvictionCleanup.watchRuns += 1;
        });

        $scope.probeValue = 1;

        const unsubscribe = $eventBus.subscribe(
          "retention.eviction.cleanup",
          () => {
            retainedEvictionCleanup.eventBusDeliveries += 1;
          },
          $scope,
        );

        const canvasAdapter = createCanvasWorkAdapter($scope);

        $scope.$broadcast("$viewRetentionPause");

        canvasAdapter.schedule(() => {
          retainedEvictionCleanup.canvasRuns += 1;
        });

        $scope.$on("$destroy", () => {
          retainedEvictionCleanup.scopeDestroyEvents += 1;
          retainedEvictionCleanup.wasmScope.dispose();
          observer.disconnect();
          retainedEvictionCleanup.attrObserverDisconnects += 1;
          unsubscribe();
        });
      },
    ],
    policy: {
      retention: {
        mode: "keep-alive",
        key: "retention-eviction-cleanup",
        max: 1,
      },
    },
  };

  const retainedRetentionEvictorState = {
    name: "retainedEvictionCleanupB",
    template: '<div class="retention-eviction-evictor"></div>',
    policy: {
      retention: {
        mode: "keep-alive",
        key: "retention-eviction-evictor",
        max: 1,
      },
    },
  };

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    const installedWasmModule = wasmModule(window.angular);
    log = "";
    retainedCompileCount = 0;
    retainedLimitedCompiles = { a: 0, b: 0 };
    retainedLimitedDestroys = { a: 0, b: 0 };
    retainedParamCompiles = 0;
    retainedCustomKeyCompiles = 0;
    retainedQueryCompiles = 0;
    retainedDynamicCompiles = 0;
    retainedInjectedKeyCompiles = 0;
    retainedInjectedKeyInvocations = 0;
    retainedInjectedEvictCompiles = { a: 0, b: 0 };
    retainedInjectedEvictDestroys = { a: 0, b: 0 };
    retainedInjectedEvictInvocations = 0;
    retainedNestedCompiles = { parent: 0, child: 0 };
    retainedNestedLifecycle = {
      parentPause: 0,
      parentResume: 0,
      childPause: 0,
      childResume: 0,
    };
    retainedEvictionCleanup = {
      scopeCreated: 0,
      scopeDestroyEvents: 0,
      watchRuns: 0,
      attrObserverEvents: 0,
      attrObserverDisconnects: 0,
      eventBusDeliveries: 0,
      canvasRuns: 0,
      wasmScope: undefined,
    };
    retainedEvictionCleanupScope = undefined;
    retainedNestedCleanup = {
      scopeCreated: 0,
      scopeDestroyEvents: 0,
      watchRuns: 0,
      attrObserverEvents: 0,
      attrObserverDisconnects: 0,
      eventBusDeliveries: 0,
      canvasRuns: 0,
      wasmScope: undefined,
    };
    retainedNestedCleanupScope = undefined;
    retainedCanExitAllowed = true;
    retainedCanExitCompiles = 0;
    retainedDirtyCompiles = 0;
    retainedSecurityToken = undefined;
    retainedSecurityCompiles = 0;
    retainedErrorAllowed = true;
    retainedErrorCompiles = 0;
    retainedLoadingCompiles = 0;
    retainedLoadingResolve = undefined;
    retainedLazyLoadAttempts = 0;
    retainedLazyCompiles = 0;
    app = window.angular
      .module("defaultModule", [installedWasmModule.name])
      .config({
        $security: {
          fallback: "allow",
          isAuthenticated: () => retainedSecurityToken !== undefined,
          credentials: {
            bearer: () => retainedSecurityToken,
          },
        },
      })
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          errorLog.push(exception.message);
        };
      })
      .decorator("$anchorScroll", () => {
        return jasmine.createSpy("$anchorScroll");
      })
      .value("retentionPrefix", "injected")
      .value("evictTarget", "evict-b#$default");

    registerStates(
      app,
      aState,
      bState,
      cState,
      dState,
      eState,
      fState,
      gState,
      hState,
      iState,
      jState,
      kState,
      lState,
      mState,
      nState,
      retainedState,
      retainedLimitedAState,
      retainedLimitedBState,
      retainedParamState,
      retainedCustomKeyState,
      retainedQueryState,
      retainedDynamicState,
      retainedCanExitState,
      retainedDirtyState,
      retainedSecurityState,
      retainedErrorBoundaryState,
      retainedLoadingBoundaryLoadingState,
      retainedLoadingBoundaryState,
      retainedInjectedKeyState,
      retainedInjectedEvictAState,
      retainedInjectedEvictBState,
      retainedNestedState,
      retainedNestedChildState,
      retainedNestedCleanupParentState,
      retainedNestedCleanupChildState,
      retainedRetentionCleanupState,
      retainedRetentionEvictorState,
    );
    app.lazyState("retainedLazy", () => {
      retainedLazyLoadAttempts += 1;

      return {
        name: "retainedLazy",
        template:
          '<button class="retained-lazy" ng-click="count = count + 1">G:{{count}}</button>',
        controller: [
          "$scope",
          function ($scope) {
            retainedLazyCompiles += 1;
            $scope.count = 0;
          },
        ],
        policy: {
          retention: {
            mode: "keep-alive",
            max: 4,
          },
        },
      };
    });

    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke([
      "$state",
      "$rootScope",
      "$compile",
      "$anchorScroll",
      (_$state_, $rootScope, _$compile_, _$anchorScroll_) => {
        scope = $rootScope.$new();
        $compile = _$compile_;
        $state = _$state_;
        stateRuntime = $state;
        $anchorScroll = _$anchorScroll_;
      },
    ]);
    $view = $state._viewService;

    const $animate = $injector.get("$animate");

    animateSpies = {
      enter: spyOn($animate, "enter").and.callThrough(),
      leave: spyOn($animate, "leave").and.callThrough(),
    };
  });

  afterEach(() => {
    window.history.replaceState(null, "", initialUrl);
    window.location.hash = "";
  });

  async function waitForViewText(text, selector = "ng-view") {
    await waitUntil(() => elem.querySelector(selector)?.textContent === text);
  }

  async function waitForText(text) {
    await waitUntil(() => elem.textContent.includes(text));
  }

  async function waitForSelectorCount(selector, count) {
    await waitUntil(() => elem.querySelectorAll(selector).length === count);
  }

  describe("linking ng-directive", () => {
    it("anonymous ng-view should be replaced with the template of the current $state", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      expect(elem.querySelector("ng-view").textContent).toBe("");

      $state.transitionTo(aState);
      await waitForViewText(aState.template);

      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
    });

    it("renders unloaded view configs when their template factory resolves", async () => {
      let resolveView;

      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      const activeView = $view._ngViews.find(
        (registeredView) => registeredView._fqn === "$default",
      );
      const config = {
        _id: 9001,
        _path: [],
        _viewDecl: {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: $view._rootViewContext(),
          templateUrl: "/async-route.html",
        },
        _factory: {
          _fromConfig() {
            return new Promise((resolve) => {
              resolveView = resolve;
            });
          },
          _makeComponentTemplate() {
            return undefined;
          },
        },
        _component: undefined,
        _template: undefined,
        _loaded: false,
        _controller: undefined,
        _fillPlan: {
          _kind: "template",
          _componentName: undefined,
          _componentElementName: undefined,
          _hasController: false,
          _needsResolveContext: true,
        },
        _targetKey: "$default",
        _depth: 1,
        _retention: undefined,
      };

      activeView._configUpdated(config);

      expect(elem.querySelector("ng-view").textContent).toBe("");

      resolveView({ _template: "async route template" });

      await waitForViewText("async route template");

      expect(config._loaded).toBeTrue();
      expect(elem.querySelector("ng-view").textContent).toBe(
        "async route template",
      );
    });

    it("ignores stale unloaded view configs after a newer config is selected", async () => {
      let resolveFirstView;
      let resolveSecondView;

      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      const activeView = $view._ngViews.find(
        (registeredView) => registeredView._fqn === "$default",
      );
      const makeConfig = (id, resolveFactory) => ({
        _id: id,
        _path: [],
        _viewDecl: {
          _ngViewName: "$default",
          _ngViewContextAnchor: "",
          _context: $view._rootViewContext(),
          templateUrl: `/async-route-${id}.html`,
        },
        _factory: {
          _fromConfig() {
            return new Promise((resolve) => {
              resolveFactory(resolve);
            });
          },
          _makeComponentTemplate() {
            return undefined;
          },
        },
        _component: undefined,
        _template: undefined,
        _loaded: false,
        _controller: undefined,
        _fillPlan: {
          _kind: "template",
          _componentName: undefined,
          _componentElementName: undefined,
          _hasController: false,
          _needsResolveContext: true,
        },
        _targetKey: "$default",
        _depth: 1,
        _retention: undefined,
      });

      const firstConfig = makeConfig(9010, (resolve) => {
        resolveFirstView = resolve;
      });
      const secondConfig = makeConfig(9011, (resolve) => {
        resolveSecondView = resolve;
      });

      activeView._configUpdated(firstConfig);
      activeView._configUpdated(secondConfig);

      resolveFirstView({ _template: "stale async route template" });
      await wait(0);

      expect(elem.querySelector("ng-view").textContent).toBe("");

      resolveSecondView({ _template: "fresh async route template" });
      await waitForViewText("fresh async route template");

      expect(elem.querySelector("ng-view").textContent).toBe(
        "fresh async route template",
      );
    });

    it("ignores view configuration callbacks after the host scope is destroyed", () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      const hostScope = scope.$new();

      $compile(elem)(hostScope);
      const activeView = $view._ngViews.find(
        (registeredView) => registeredView._fqn === "$default",
      );

      hostScope.$destroy();

      expect(() => activeView._configUpdated(undefined)).not.toThrow();
    });

    it("ng-view should be updated after transition to another state", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      expect(elem.querySelector("ng-view").textContent).toBe("");

      $state.transitionTo(aState);
      await waitForViewText(aState.template);

      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);

      $state.transitionTo(bState);
      await waitForViewText(bState.template);

      expect(elem.querySelector("ng-view").textContent).toBe(bState.template);
    });

    it("named ng-view should be replaced with a named view declaration", async () => {
      elem.innerHTML = '<div><ng-view name="cview"></ng-view></div>';
      $compile(elem)(scope);

      $state.transitionTo(cState);
      await waitForViewText(cState.views.cview.template);

      expect(elem.querySelector("ng-view").textContent).toBe(
        cState.views.cview.template,
      );
    });

    it("supports data-name normalized reads for named ng-view", async () => {
      elem.innerHTML = '<div><ng-view data-name="cview"></ng-view></div>';
      $compile(elem)(scope);

      $state.transitionTo(cState);
      await waitForViewText(cState.views.cview.template);

      expect(elem.querySelector("ng-view").textContent).toBe(
        cState.views.cview.template,
      );
    });

    it("should handle sibling named ng-views", async () => {
      elem.innerHTML =
        '<div><ng-view name="dview1"></ng-view><ng-view name="dview2"></ng-view></div>';
      $compile(elem)(scope);

      $state.transitionTo(dState);
      await waitUntil(() => {
        const ngViews = elem.querySelectorAll("ng-view");

        return (
          ngViews[0]?.textContent === dState.views.dview1.template &&
          ngViews[1]?.textContent === dState.views.dview2.template
        );
      });

      const ngViews = elem.querySelectorAll("ng-view");

      expect(ngViews[0].textContent).toBe(dState.views.dview1.template);
      expect(ngViews[1].textContent).toBe(dState.views.dview2.template);
    });

    it("should handle nested ng-views (testing two levels deep)", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      expect(elem.querySelector("ng-view").textContent).toBe("");

      $state.transitionTo(fState);
      await waitForViewText(fState.views.eview.template);

      expect(elem.querySelector("ng-view").textContent).toBe(
        fState.views.eview.template,
      );
    });

    it("should support named and relative view targets", async () => {
      stateRuntime
        .state({
          name: "app",
          template: '<ng-view name="mymessages"></ng-view>',
        })
        .state({
          name: "app.mymessages",
          views: {
            mymessages: {
              template:
                '<section><ng-view name="messagelist"></ng-view><ng-view name="messagecontent"></ng-view></section>',
            },
          },
        })
        .state({
          name: "app.mymessages.messagelist",
          views: {
            messagelist: {
              template: "message list",
            },
          },
        })
        .state({
          name: "app.mymessages.messagelist.message",
          views: {
            "^.^.messagecontent": {
              template: "message content",
            },
          },
        });

      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo("app.mymessages.messagelist.message");
      await waitForText("message list");
      await waitForText("message content");

      expect(elem.textContent).toContain("message list");
      expect(elem.textContent).toContain("message content");
    });
  });

  describe("handling initial view", () => {
    it("initial view should be compiled if the view is empty", async () => {
      const content = "inner content";

      scope.content = content;
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(gState);
      await waitForViewText(content);

      expect(elem.querySelector("ng-view").textContent).toBe(content);
    });

    it("initial view should be put back after removal of the view", async () => {
      const content = "inner content";

      scope.content = content;
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.go(hState);
      await waitForViewText(hState.views.inner.template);

      expect(elem.querySelector("ng-view").textContent).toBe(
        hState.views.inner.template,
      );

      // going to the parent state which makes the inner view empty
      $state.go(gState);
      await waitForViewText(content);

      expect(elem.querySelector("ng-view").textContent).toBe(content);
    });

    // related to issue #435
    it("initial view should be transcluded once to prevent breaking other directives", async () => {
      scope.items = ["I", "am", "a", "list", "of", "items"];
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      // transition to state that has an initial view
      $state.transitionTo(iState);
      await waitForSelectorCount("li", scope.items.length);

      // verify if ng-repeat has been compiled
      expect(elem.querySelectorAll("li").length).toBe(scope.items.length);

      // transition to another state that replace the initial content
      $state.transitionTo(jState);
      await waitForViewText(jState.template);
      expect(elem.querySelector("ng-view").innerText).toBe(jState.template);

      // transition back to the state with empty subview and the initial view
      $state.transitionTo(iState);
      await waitForSelectorCount("li", scope.items.length);

      // verify if the initial view is correct
      expect(elem.querySelectorAll("li").length).toBe(scope.items.length);

      // change scope properties
      scope.items.push(".", "Working?");
      await waitForSelectorCount("li", scope.items.length);
      // verify if the initial view has been updated
      expect(elem.querySelectorAll("li").length).toBe(scope.items.length);
    });
  });

  describe("autoscroll attribute", () => {
    it("should NOT autoscroll when unspecified", async () => {
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(aState);
      await waitForViewText(aState.template);
      expect($anchorScroll).not.toHaveBeenCalled();
    });

    it("should autoscroll when expression is missing", async () => {
      elem.innerHTML = "<div><ng-view autoscroll></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo(aState);
      await waitUntil(() => $anchorScroll.calls.any());

      // animateFlush($animate);

      expect($anchorScroll).toHaveBeenCalledWith(elem.querySelector("ng-view"));
    });

    it("should autoscroll based on expression", async () => {
      scope.doScroll = false;

      elem.innerHTML = "<div><ng-view autoscroll='doScroll'></ng-view></div>";
      $compile(elem)(scope);

      $state.transitionTo(aState);
      await waitForViewText(aState.template);

      expect($anchorScroll).not.toHaveBeenCalled();

      scope.doScroll = true;
      $state.transitionTo(bState);
      await waitUntil(() => $anchorScroll.calls.any());
      expect($anchorScroll).toHaveBeenCalledWith(elem.querySelector("ng-view"));
    });
  });

  it("should instantiate a controller for a view", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state.transitionTo(kState);
    await waitForText("value");
    expect(elem.textContent).toBe("value");
  });

  it("should instantiate a controller with both $scope and $element injections", async () => {
    elem.innerHTML = '<div><ng-view id="mState">{{elementId}}</ng-view></div>';
    $compile(elem)(scope);
    $state.transitionTo(mState);
    await waitForText("mState");

    expect(elem.textContent).toBe("mState");
  });

  it("should do transition animations", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("n");
    await waitForViewText(nState.template);
    expect(elem.querySelector("ng-view").textContent).toBe(nState.template);

    await $state.transitionTo("a");
    await waitForViewText(aState.template);
    expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
    await waitUntil(() => log.includes("animEnter;"));
    expect(log).toContain("animEnter;");
    expect(log).toContain("animLeave;");
  });

  it("should expose real ngView animation promises to controllers", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("n");
    await waitUntil(() => log.includes("animEnter;"));
    expect(log).toContain("animEnter;");

    await $state.transitionTo("a");
    await waitUntil(
      () => log.includes("destroy;") && log.includes("animLeave;"),
    );
    expect(log).toContain("destroy;");
    expect(log).toContain("animLeave;");
  });

  it("should activate routed views inside document.startViewTransition", async () => {
    await wait(350);
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    let committedInsideCallback = false;

    spyOn(document, "startViewTransition").and.callFake((callback) => {
      expect(elem.querySelector("ng-view").textContent).toBe("");

      callback();

      expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
      committedInsideCallback = true;

      return {
        updateCallbackDone: Promise.resolve(),
        finished: Promise.resolve(),
      };
    });

    await $state.transitionTo("a");
    await waitUntil(() => document.startViewTransition.calls.any());

    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
    expect(committedInsideCallback).toBeTrue();
  });

  it("should skip document.startViewTransition when router config disables it", async () => {
    await wait(350);
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    $state._routerState._viewTransitions = false;

    spyOn(document, "startViewTransition").and.callFake((callback) => {
      callback();

      return {
        updateCallbackDone: Promise.resolve(),
        finished: Promise.resolve(),
      };
    });

    await $state.transitionTo("a");
    await waitForViewText(aState.template);

    expect(document.startViewTransition).not.toHaveBeenCalled();
  });

  it("should not start a view transition for an ignored same-state transition", async () => {
    await wait(350);
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    spyOn(document, "startViewTransition").and.callFake((callback) => {
      callback();

      return {
        updateCallbackDone: Promise.resolve(),
        finished: Promise.resolve(),
      };
    });

    await $state.transitionTo("a");
    await waitUntil(() => document.startViewTransition.calls.any());

    document.startViewTransition.calls.reset();

    await $state.transitionTo("a");
    await wait();

    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
  });

  it("should not use $animate enter or leave for routed view replacement", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    animateSpies.enter.calls.reset();
    animateSpies.leave.calls.reset();

    await $state.transitionTo("a");
    await waitForViewText(aState.template);
    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    expect(animateSpies.enter).not.toHaveBeenCalled();
    expect(animateSpies.leave).not.toHaveBeenCalled();
  });

  it("should restore retained routed views without recompiling their scope", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retained");
    await waitForViewText("0");

    elem.querySelector(".retained-counter").click();
    await waitForViewText("1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retained");
    await waitForViewText("1");

    expect(retainedCompileCount).toBe(1);
    expect(elem.querySelector(".retained-counter").textContent).toBe("1");
  });

  it("should evict retained routed views according to max", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedLimitedA");
    await waitForViewText("A:0");

    elem.querySelector(".retained-limited-a").click();
    await waitForViewText("A:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);
    expect(retainedLimitedDestroys.a).toBe(0);

    await $state.transitionTo("retainedLimitedB");
    await waitForViewText("B:0");

    await $state.transitionTo("a");
    await waitForViewText(aState.template);
    expect(retainedLimitedDestroys.a).toBe(1);

    await $state.transitionTo("retainedLimitedA");
    await waitForViewText("A:0");

    expect(retainedLimitedCompiles.a).toBe(2);
    expect(retainedLimitedCompiles.b).toBe(1);
  });

  it("should key retained routed views by state params by default", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedParam", { id: "one" });
    await waitForViewText("P:0");

    elem.querySelector(".retained-param").click();
    await waitForViewText("P:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedParam", { id: "two" });
    await waitForViewText("P:0");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedParam", { id: "one" });
    await waitForViewText("P:1");

    expect(retainedParamCompiles).toBe(2);
  });

  it("should let string retention keys override route params", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedCustomKey", { id: "one" });
    await waitForViewText("C:0");

    elem.querySelector(".retained-custom-key").click();
    await waitForViewText("C:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedCustomKey", { id: "two" });
    await waitForViewText("C:1");

    expect(retainedCustomKeyCompiles).toBe(1);
  });

  it("should key retained routed views by query params by default", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedQuery", { term: "one" });
    await waitForViewText("Q:0");

    elem.querySelector(".retained-query").click();
    await waitForViewText("Q:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedQuery", { term: "two" });
    await waitForViewText("Q:0");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedQuery", { term: "one" });
    await waitForViewText("Q:1");

    expect(retainedQueryCompiles).toBe(2);
  });

  it("should keep the active retained view for dynamic-only param changes", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedDynamic", { id: "one" });
    await waitForViewText("D:0");

    elem.querySelector(".retained-dynamic").click();
    await waitForViewText("D:1");

    await $state.transitionTo("retainedDynamic", { id: "two" });
    await waitForViewText("D:1");

    expect(retainedDynamicCompiles).toBe(1);
  });

  it("should not detach a retained route when canExit blocks the transition", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state._defaultErrorHandler = function () {};

    await $state.transitionTo("retainedCanExit");
    await waitForViewText("X:0");

    elem.querySelector(".retained-can-exit").click();
    await waitForViewText("X:1");

    retainedCanExitAllowed = false;
    await $state.transitionTo("b").catch(() => {});
    await waitForViewText("X:1");

    expect($state.current.name).toBe("retainedCanExit");
    expect(retainedCanExitCompiles).toBe(1);

    retainedCanExitAllowed = true;
    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedCanExit");
    await waitForViewText("X:1");

    expect(retainedCanExitCompiles).toBe(1);
  });

  it("should not detach a retained route when dirty policy blocks the transition", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state._defaultErrorHandler = function () {};

    const confirmSpy = spyOn(window, "confirm");

    await $state.transitionTo("retainedDirty");
    await waitForViewText("Y:0");

    elem.querySelector(".retained-dirty").click();
    await waitForViewText("Y:1");

    confirmSpy.and.returnValue(false);
    await $state.transitionTo("b").catch(() => {});
    await waitForViewText("Y:1");

    expect($state.current.name).toBe("retainedDirty");
    expect(retainedDirtyCompiles).toBe(1);
    expect(confirmSpy).toHaveBeenCalledWith("Discard retained dirty route?");

    confirmSpy.calls.reset();
    confirmSpy.and.returnValue(true);
    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    expect(confirmSpy).toHaveBeenCalledWith("Discard retained dirty route?");

    await $state.transitionTo("retainedDirty");
    await waitForViewText("Y:1");

    expect(retainedDirtyCompiles).toBe(1);
  });

  it("should apply inherited security policy before restoring retained routes", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state._defaultErrorHandler = function () {};

    await $state.transitionTo("retainedSecurity").catch(() => {});
    await waitForViewText(bState.template);

    expect($state.current.name).toBe("b");
    expect(retainedSecurityCompiles).toBe(0);

    retainedSecurityToken = "token";
    await $state.transitionTo("retainedSecurity");
    await waitForViewText("Z:0");

    elem.querySelector(".retained-security").click();
    await waitForViewText("Z:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    retainedSecurityToken = undefined;
    await $state.transitionTo("retainedSecurity").catch(() => {});
    await waitForViewText(bState.template);

    expect($state.current.name).toBe("b");
    expect(retainedSecurityCompiles).toBe(1);

    retainedSecurityToken = "token";
    await $state.transitionTo("retainedSecurity");
    await waitForViewText("Z:1");

    expect(retainedSecurityCompiles).toBe(1);
  });

  it("should apply error boundaries before restoring retained routes", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state._defaultErrorHandler = function () {};

    retainedErrorAllowed = false;
    await $state.transitionTo("retainedErrorBoundary").catch(() => {});
    await waitForViewText(bState.template);

    expect($state.current.name).toBe("b");
    expect(retainedErrorCompiles).toBe(0);

    retainedErrorAllowed = true;
    await $state.transitionTo("retainedErrorBoundary");
    await waitForViewText("R:0");

    elem.querySelector(".retained-error-boundary").click();
    await waitForViewText("R:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    retainedErrorAllowed = false;
    await $state.transitionTo("retainedErrorBoundary").catch(() => {});
    await waitForViewText(bState.template);

    expect($state.current.name).toBe("b");
    expect(retainedErrorCompiles).toBe(1);

    retainedErrorAllowed = true;
    await $state.transitionTo("retainedErrorBoundary");
    await waitForViewText("R:1");

    expect(retainedErrorCompiles).toBe(1);
  });

  it("should apply loading boundaries before restoring retained routes", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    let transition = $state.transitionTo("retainedLoadingBoundary");
    await waitForViewText("loading retained route");

    expect($state.current.name).toBe("retainedLoadingBoundaryLoading");
    expect(retainedLoadingCompiles).toBe(0);

    retainedLoadingResolve("ok");
    await transition;
    await waitForViewText("L:0");

    elem.querySelector(".retained-loading-boundary").click();
    await waitForViewText("L:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    transition = $state.transitionTo("retainedLoadingBoundary");
    await waitForViewText("loading retained route");

    expect($state.current.name).toBe("retainedLoadingBoundaryLoading");
    expect(retainedLoadingCompiles).toBe(1);

    retainedLoadingResolve("ok");
    await transition;
    await waitForViewText("L:1");

    expect(retainedLoadingCompiles).toBe(1);
  });

  it("should restore lazily registered retained routes without recompiling", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedLazy");
    await waitForViewText("G:0");

    elem.querySelector(".retained-lazy").click();
    await waitForViewText("G:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedLazy");
    await waitForViewText("G:1");

    expect($state.current.name).toBe("retainedLazy");
    expect(retainedLazyLoadAttempts).toBe(1);
    expect(retainedLazyCompiles).toBe(1);
  });

  it("should invoke injectable retention keys with route context", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedInjectedKey", { id: "one" });
    await waitForViewText("I:0");

    elem.querySelector(".retained-injected-key").click();
    await waitForViewText("I:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedInjectedKey", { id: "other" });
    await waitForViewText("I:1");

    expect(retainedInjectedKeyCompiles).toBe(1);
    expect(retainedInjectedKeyInvocations).toBeGreaterThan(0);
  });

  it("should invoke injectable retention eviction policies with cache context", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedInjectedEvictA");
    await waitForViewText("EA:0");

    elem.querySelector(".retained-injected-evict-a").click();
    await waitForViewText("EA:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedInjectedEvictB");
    await waitForViewText("EB:0");

    elem.querySelector(".retained-injected-evict-b").click();
    await waitForViewText("EB:1");

    await $state.transitionTo("a");
    await waitForViewText(aState.template);

    expect(retainedInjectedEvictDestroys.a).toBe(0);
    expect(retainedInjectedEvictDestroys.b).toBe(1);
    expect(retainedInjectedEvictInvocations).toBeGreaterThan(0);

    await $state.transitionTo("retainedInjectedEvictA");
    await waitForViewText("EA:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedInjectedEvictB");
    await waitForViewText("EB:0");

    expect(retainedInjectedEvictCompiles.a).toBe(1);
    expect(retainedInjectedEvictCompiles.b).toBe(2);
  });

  it("should restore nested retained route views without recompiling their scopes", async () => {
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    await $state.transitionTo("retainedNested.child");
    await waitForText("NP:0");
    await waitForText("NC:0");

    elem.querySelector(".retained-nested-parent").click();
    elem.querySelector(".retained-nested-child").click();
    await waitForText("NP:1");
    await waitForText("NC:1");

    await $state.transitionTo("b");
    await waitForViewText(bState.template);

    await $state.transitionTo("retainedNested.child");
    await waitForText("NP:1");
    await waitForText("NC:1");

    expect(retainedNestedCompiles.parent).toBe(1);
    expect(retainedNestedCompiles.child).toBe(1);
    expect(retainedNestedLifecycle.parentPause).toBe(1);
    expect(retainedNestedLifecycle.parentResume).toBe(1);
    expect(retainedNestedLifecycle.childPause).toBeGreaterThan(0);
    expect(retainedNestedLifecycle.childResume).toBeGreaterThan(0);
  });

  it("should fully destroy retained view resources on eviction", async () => {
    let RealWorker;
    let workers;

    class MockWorker {
      terminated: boolean;

      constructor(scriptPath, options) {
        this.terminated = false;
        this.sent = [];
        this.post = this.post.bind(this);
        this.terminate = this.terminate.bind(this);
        this.onerror = null;
        this.onmessage = null;
        workers.push(this);
      }

      sent = [];
      terminate() {
        this.terminated = true;
      }

      post(message) {
        this.sent.push(message);
      }

      error = null;
      onmessage = null;
      onerror = null;
    }

    try {
      RealWorker = window.Worker;
      window.Worker = MockWorker;
      workers = [];

      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo("retainedEvictionCleanupA");
      await waitForSelectorCount(".retention-eviction-probe", 1);

      const probeElement = elem.querySelector(".retention-eviction-probe");
      const probeScope = retainedEvictionCleanupScope;

      expect(probeElement).toBeTruthy();
      expect(probeScope).toBeTruthy();
      expect(workers.length).toBe(1);

      const watchRunsBeforeEvict = retainedEvictionCleanup.watchRuns;
      const canvasRunsBeforeEvict = retainedEvictionCleanup.canvasRuns;

      expect(retainedEvictionCleanup.scopeCreated).toBe(1);

      if (probeElement) {
        probeElement.setAttribute("data-test-marker", "before-evict");
      }

      await waitUntil(
        () => retainedEvictionCleanup.attrObserverEvents > 0,
        1000,
        "Timed out waiting for the retained view observer",
      );

      await $state.transitionTo("b");
      await waitForViewText(bState.template);
      await waitUntil(
        () => !elem.querySelector(".retention-eviction-probe"),
        1000,
        "Timed out waiting for the retained view to detach",
      );

      expect(retainedEvictionCleanup.scopeDestroyEvents).toBe(0);

      await $state.transitionTo("retainedEvictionCleanupB");
      await waitForSelectorCount(".retention-eviction-evictor", 1);

      await $state.transitionTo("a");
      await waitForViewText(aState.template);
      await waitUntil(
        () => retainedEvictionCleanup.scopeDestroyEvents === 1,
        1000,
        "Timed out waiting for the retained view to be evicted",
      );

      expect(retainedEvictionCleanup.scopeDestroyEvents).toBe(1);
      expect(retainedEvictionCleanup.attrObserverDisconnects).toBe(1);
      expect(workers[0].terminated).toBeTrue();
      expect(retainedEvictionCleanup.wasmScope.disposed).toBeTrue();

      probeScope.probeValue = 2;
      await wait(0);

      $injector.get("$eventBus").publish("retention.eviction.cleanup");
      await wait(0);

      expect(retainedEvictionCleanup.watchRuns).toBe(watchRunsBeforeEvict);
      expect(retainedEvictionCleanup.eventBusDeliveries).toBe(0);
      expect(retainedEvictionCleanup.canvasRuns).toBe(canvasRunsBeforeEvict);

      await $state.transitionTo("retainedEvictionCleanupA");
      await waitForSelectorCount(".retention-eviction-probe", 1);
      expect(retainedEvictionCleanup.scopeCreated).toBe(2);
    } finally {
      if (RealWorker) {
        window.Worker = RealWorker;
      }
    }
  });

  it("should fully destroy nested retained route resources on eviction", async () => {
    let RealWorker;
    let workers;

    class MockWorker {
      terminated: boolean;

      constructor(scriptPath, options) {
        void scriptPath;
        void options;
        this.terminated = false;
        this.sent = [];
        this.post = this.post.bind(this);
        this.terminate = this.terminate.bind(this);
        this.onerror = null;
        this.onmessage = null;
        workers.push(this);
      }

      sent = [];
      terminate() {
        this.terminated = true;
      }

      post(message) {
        this.sent.push(message);
      }

      error = null;
      onmessage = null;
      onerror = null;
    }

    try {
      RealWorker = window.Worker;
      window.Worker = MockWorker;
      workers = [];

      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo("retainedNestedCleanup.child");
      await waitForSelectorCount(".retention-nested-cleanup-child", 1);

      const childElement = elem.querySelector(
        ".retention-nested-cleanup-child",
      );
      const childScope = retainedNestedCleanupScope;

      expect(childElement).toBeTruthy();
      expect(childScope).toBeTruthy();
      expect(workers.length).toBe(1);
      expect(retainedNestedCleanup.scopeCreated).toBe(1);

      const watchRunsBeforeEvict = retainedNestedCleanup.watchRuns;
      const canvasRunsBeforeEvict = retainedNestedCleanup.canvasRuns;

      if (childElement) {
        childElement.setAttribute("data-test-marker", "before-nested-evict");
      }

      await waitUntil(
        () => retainedNestedCleanup.attrObserverEvents > 0,
        1000,
        "Timed out waiting for the nested retained view observer",
      );

      await $state.transitionTo("b");
      await waitForViewText(bState.template);
      await waitUntil(
        () => !elem.querySelector(".retention-nested-cleanup-child"),
        1000,
        "Timed out waiting for the nested retained view to detach",
      );

      expect(retainedNestedCleanup.scopeDestroyEvents).toBe(0);

      await $state.transitionTo("retainedEvictionCleanupB");
      await waitForSelectorCount(".retention-eviction-evictor", 1);

      await $state.transitionTo("a");
      await waitForViewText(aState.template);
      await waitUntil(
        () => retainedNestedCleanup.scopeDestroyEvents === 1,
        1000,
        "Timed out waiting for the nested retained view to be evicted",
      );

      expect(retainedNestedCleanup.attrObserverDisconnects).toBe(1);
      expect(workers[0].terminated).toBeTrue();
      expect(retainedNestedCleanup.wasmScope.disposed).toBeTrue();

      childScope.probeValue = 2;
      await wait(0);

      $injector.get("$eventBus").publish("retention.nested.cleanup");
      await wait(0);

      expect(retainedNestedCleanup.watchRuns).toBe(watchRunsBeforeEvict);
      expect(retainedNestedCleanup.eventBusDeliveries).toBe(0);
      expect(retainedNestedCleanup.canvasRuns).toBe(canvasRunsBeforeEvict);

      await $state.transitionTo("retainedNestedCleanup.child");
      await waitForSelectorCount(".retention-nested-cleanup-child", 1);
      expect(retainedNestedCleanup.scopeCreated).toBe(2);
    } finally {
      if (RealWorker) {
        window.Worker = RealWorker;
      }
    }
  });

  it("should not start a view transition for detached routed views", async () => {
    await wait(350);
    const detachedScope = scope.$new();

    const detachedElement = createElementFromHTML(
      "<div><ng-view></ng-view></div>",
    );

    $compile(detachedElement)(detachedScope);

    spyOn(document, "startViewTransition").and.callThrough();

    await $state.transitionTo("a");
    await waitUntil(
      () =>
        detachedElement.querySelector("ng-view").textContent ===
        aState.template,
    );

    expect(document.startViewTransition).not.toHaveBeenCalled();
    expect(detachedElement.querySelector("ng-view").textContent).toBe(
      aState.template,
    );

    detachedScope.$destroy();
    dealoc(detachedElement);
  });

  it("should not wait for the visual view transition to finish before resolving the route transition", async () => {
    await wait(350);
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    let finishVisualTransition;

    const finished = new Promise((resolve) => {
      finishVisualTransition = resolve;
    });

    spyOn(document, "startViewTransition").and.callFake((callback) => {
      callback();

      return {
        updateCallbackDone: Promise.resolve(),
        finished,
      };
    });

    await $state.transitionTo("a");

    expect(elem.querySelector("ng-view").textContent).toBe(aState.template);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);

    finishVisualTransition();
    await wait();
  });

  it("should commit overlapping routed view changes without waiting for the active view transition", async () => {
    await wait(350);
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);

    let finishFirstTransition;

    const firstTransitionFinished = new Promise((resolve) => {
      finishFirstTransition = resolve;
    });

    spyOn(document, "startViewTransition").and.callFake((callback) => {
      callback();

      return {
        updateCallbackDone: Promise.resolve(),
        finished: firstTransitionFinished,
      };
    });

    await $state.transitionTo("a");
    await waitForViewText(aState.template);
    expect(elem.querySelector("ng-view").textContent).toBe(aState.template);

    await $state.transitionTo("b");
    await waitForViewText(bState.template);
    expect(elem.querySelector("ng-view").textContent).toBe(bState.template);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);

    finishFirstTransition();
    await wait();
  });

  it("should do ngClass animations", async () => {
    scope.classOn = false;
    elem.innerHTML =
      '<div><ng-view ng-class="{ yay: classOn }">Initial Content</ng-view></div>';
    $compile(elem)(scope);

    scope.classOn = true;
    await waitUntil(() =>
      elem.querySelector("ng-view").classList.contains("yay"),
    );
    expect(elem.querySelector("ng-view").classList.contains("yay")).toBeTrue();

    scope.classOn = false;
    await waitUntil(
      () => !elem.querySelector("ng-view").classList.contains("yay"),
    );
    expect(elem.querySelector("ng-view").classList.contains("yay")).toBeFalse();
  });

  it("should do ngIf animations", async () => {
    scope.shouldShow = false;
    elem.innerHTML =
      '<div><ng-view ng-if="shouldShow">Initial Content</ng-view></div>';
    $compile(elem)(scope);

    scope.shouldShow = true;
    await waitForViewText("Initial Content");
    expect(elem.querySelector("ng-view").textContent).toBe("Initial Content");

    scope.shouldShow = false;
    await waitUntil(() => elem.querySelector("ng-view") === null);
    expect(elem.querySelector("ng-view")).toBeNull();
  });

  describe("(resolved data)", () => {
    let _scope;

    function controller($scope) {
      _scope = $scope;
    }
    controller.$inject = ["$scope"];
    let _state;

    beforeEach(() => {
      _state = {
        name: "resolve",
        resolve: {
          user() {
            return wait(100).then(() => {
              return "joeschmoe";
            });
          },
        },
      };
    });

    it("should provide the resolved data on the $scope", async () => {
      const state = Object.assign(_state, {
        template: "{{$resolve.user}}",
        controller,
      });

      stateRuntime.state(state);
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);

      await $state.transitionTo("resolve");
      await waitForText("joeschmoe");

      expect(elem.textContent).toBe("joeschmoe");
      expect(_scope.$resolve).toBeDefined();
      expect(_scope.$resolve.user).toBe("joeschmoe");
    });

    // Test for #2626
    it("should provide the resolved data on the $scope even if there is no controller", async () => {
      const state = Object.assign(_state, {
        template: "{{$resolve.user}}",
      });

      stateRuntime.state(state);
      elem.innerHTML = "<div><ng-view></ng-view></div>";
      $compile(elem)(scope);
      expect(elem.textContent).toBe("");

      await $state.transitionTo("resolve");
      await waitForText("joeschmoe");

      expect(elem.textContent).toBe("joeschmoe");
    });

    it("should reject the removed resolveAs view option", async () => {
      const state = Object.assign(_state, {
        resolveAs: "foo",
      });

      expect(() => stateRuntime.state(state)).toThrowError(/resolveAs/);
    });
  });

  it("should call the existing $onInit after instantiating a controller", async () => {
    const $onInit = jasmine.createSpy();

    stateRuntime.state({
      name: "onInit",
      controller: function () {
        this.$onInit = $onInit;
      },
      template: "hi",
    });
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    await $state.transitionTo("onInit");
    await waitUntil(() => $onInit.calls.any());

    expect($onInit).toHaveBeenCalled();
  });

  it("should default the template to a '<ng-view>'", async () => {
    stateRuntime.state({ name: "abstract", abstract: true });
    stateRuntime.state({ name: "abstract.foo", template: "hello" });
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state.transitionTo("abstract.foo");
    await waitForText("hello");

    expect(elem.textContent).toBe("hello");
  });

  describe("play nicely with other directives", () => {
    // related to issue #857
    it("should work with ngIf", async () => {
      scope.someBoolean = false;
      elem.innerHTML = '<div ng-if="someBoolean"><ng-view></ng-view></div>';
      $compile(elem)(scope);
      $state.transitionTo(aState);
      await wait();
      // Verify there is no ng-view in the DOM
      expect(elem.querySelectorAll("ng-view").length).toBe(0);

      // Turn on the div that holds the ng-view
      scope.someBoolean = true;
      await waitForSelectorCount("ng-view", 1);
      expect(elem.querySelectorAll("ng-view").length).toBe(1);

      // Turn off the ng-view
      scope.someBoolean = false;
      await waitForSelectorCount("ng-view", 0);
      // Verify there is no ng-view in the DOM
      expect(elem.querySelectorAll("ng-view").length).toBe(0);

      // Turn on the div that holds the ng-view once again
      scope.someBoolean = true;
      await waitForSelectorCount("ng-view", 1);
      expect(elem.querySelectorAll("ng-view").length).toBe(1);
    });

    it("should work with ngClass", async () => {
      scope.showClass = false;
      elem.innerHTML =
        "<div><ng-view ng-class=\"{'someClass': showClass}\"></ng-view></div>";
      $compile(elem)(scope);
      await wait();
      expect(elem.querySelector("ng-view").classList).not.toContain(
        "someClass",
      );

      scope.showClass = true;
      await wait();
      expect(elem.querySelector("ng-view").classList).toContain("someClass");

      scope.showClass = false;
      await wait();
      expect(elem.querySelector("ng-view").classList).not.toContain(
        "someClass",
      );
    });

    describe("working with ngRepeat", () => {
      it("should have correct number of ngViews", async () => {
        elem.innerHTML =
          '<div><ng-view ng-repeat="view in views"></ng-view></div>';
        $compile(elem)(scope);
        await wait();
        // Should be no ng-views in DOM
        expect(elem.querySelectorAll("ng-view").length).toBe(0);

        // Lets add 3
        scope.views = ["view1", "view2", "view3"];
        await waitForSelectorCount("ng-view", scope.views.length);
        // Should be 3 ng-views in the DOM
        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );

        // Lets add one more - yay two-way binding
        scope.views.push("view4");
        await waitForSelectorCount("ng-view", scope.views.length);
        // Should have 4 ng-views

        expect(elem.querySelectorAll("ng-view").length).toBe(
          scope.views.length,
        );

        // Lets remove 2 ng-views from the DOM
        scope.views.pop();
        scope.views.pop();
        await waitUntil(
          () => elem.querySelectorAll("ng-view").length >= scope.views.length,
        );
        expect(elem.querySelectorAll("ng-view").length).toBeGreaterThanOrEqual(
          scope.views.length,
        );
      });
    });
  });
});

describe("ngView transclusion", () => {
  let scope, $compile, elem, $injector, $rootScope, $state;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    const module = window.angular
      .module("defaultModule", [])
      .directive("scopeObserver", () => {
        return {
          restrict: "E",
          link(scope) {
            scope.$emit("directiveCreated");
            scope.$on("$destroy", () => {
              scope.$emit("directiveDestroyed");
            });
          },
        };
      });
    registerStates(
      module,
      {
        name: "a",
        template: "<ng-view><scope-observer></scope-observer></ng-view>",
      },
      { name: "a.b", template: "anything" },
    );
    $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke([
      "$state",
      "$rootScope",
      "$compile",
      "$anchorScroll",
      (_$state_, _$rootScope_, _$compile_, _$anchorScroll_) => {
        $rootScope = _$rootScope_;
        scope = $rootScope.$new();
        $compile = _$compile_;
        $state = _$state_;
        elem = document.getElementById("app");
      },
    ]);
  });

  it("should not link the initial view and leave its scope undestroyed when a subview is activated", async () => {
    let aliveCount = 0;

    scope.$on("directiveCreated", () => {
      aliveCount++;
    });
    scope.$on("directiveDestroyed", () => {
      aliveCount--;
    });
    elem.innerHTML = "<div><ng-view></ng-view></div>";
    $compile(elem)(scope);
    $state.transitionTo("a.b");
    await wait(100);
    expect(aliveCount).toBe(0);
  });
});

describe("ngView controllers or onEnter handlers", () => {
  let el, template, scope, count, $rootScope, $compile, $state, elem;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    count = 0;
    const module = window.angular
      .module("defaultModule", [])
      .config({ $location: { html5Mode: false } });
    registerStates(
      module,
      {
        name: "aside",
        url: "/aside",
        template: '<div class="aside"></div>',
      },
      {
        name: "A",
        url: "/A",
        template: '<div class="A" ng-view></div>',
      },
      {
        name: "A.fwd",
        url: "/fwd",
        template: '<div class="fwd" ng-view>',
        controller: [
          "$state",
          function ($state) {
            if (count++ < 20 && $state.current.name == "A.fwd")
              $state.go(".nest");
          },
        ],
      },
      {
        name: "A.fwd.nest",
        url: "/nest",
        template: '<div class="nest"></div>',
      },
    );

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke([
      "$state",
      "$rootScope",
      "$compile",
      "$anchorScroll",
      (_$state_, _$rootScope_, _$compile_, _$anchorScroll_) => {
        $rootScope = _$rootScope_;
        scope = $rootScope.$new();
        $compile = _$compile_;
        $state = _$state_;
        elem = document.getElementById("app");
      },
    ]);
  });

  it("should not go into an infinite loop when controller uses $state.go", async () => {
    el = "<div><ng-view></ng-view></div>";
    template = $compile(el)($rootScope);
    await $state.transitionTo("aside");
    await waitUntil(() => template.querySelector(".aside") !== null);
    expect(template.querySelector(".aside")).toBeDefined();
    expect(template.querySelector(".fwd")).toBeNull();

    await $state.transitionTo("A");
    await waitUntil(() => template.querySelector(".A") !== null);
    expect(template.querySelector(".A")).not.toBeNull();
    expect(template.querySelector(".fwd")).toBeNull();

    await $state.transitionTo("A.fwd");
    await waitUntil(() => template.querySelector(".nest") !== null);
    expect(template.querySelector(".A")).not.toBeNull();
    expect(template.querySelector(".fwd")).not.toBeNull();
    expect(template.querySelector(".nest")).not.toBeNull();
    expect(count).toBe(1);
  });
});

describe("angular 1.5+ style .component()", () => {
  let el = document.getElementById("app"),
    app,
    scope,
    log,
    svcs,
    stateRuntime,
    $templateCache,
    $rootScope,
    errorLog = [];

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .module("defaultModule", [])
      .decorator("$exceptionHandler", function () {
        return (exception) => {
          errorLog.push(exception.message);
        };
      })
      .directive("ng12Directive", () => {
        return {
          restrict: "E",
          scope: { data: "=" },
          templateUrl: "/comp_tpl.html",
          controller: [
            "$scope",
            function ($scope) {
              this.data = $scope.data;
            },
          ],
          controllerAs: "$ctrl",
        };
      })
      .directive("ng13Directive", () => {
        return {
          scope: { data: "=" },
          templateUrl: "/comp_tpl.html",
          controller: function () {
            this.$onInit = function () {
              log += "onInit;";
            };
          },
          bindToController: true,
          controllerAs: "$ctrl",
        };
      })
      .component("ngComponent", {
        bindings: { data: "<", data2: "<" },
        templateUrl: "/comp_tpl.html",
        controller: function () {
          this.$onInit = function () {
            log += "onInit;";
          };
        },
      })
      .component("header", {
        bindings: { status: "<" },
        template: "#{{ $ctrl.status }}#",
      })
      .component("bindingTypes", {
        bindings: { oneway: "<oneway", twoway: "=", attribute: "@attr" },
        template:
          "-{{ $ctrl.oneway }},{{ $ctrl.twoway }},{{ $ctrl.attribute }}-",
      })
      .component("optionalBindingTypes", {
        bindings: { oneway: "<?oneway", twoway: "=?", attribute: "@?attr" },
        template:
          "-{{ $ctrl.oneway }},{{ $ctrl.twoway }},{{ $ctrl.attribute }}-",
      })
      .component("eventComponent", {
        bindings: { evt: "&" },
        template: "eventCmp",
      })
      .component("parentCallbackComponent", {
        controller: [
          "$rootScope",
          function ($rootScope) {
            this.handleEvent = function (foo, bar) {
              $rootScope.log.push(foo);
              $rootScope.log.push(bar);
            };
          },
        ],
        template: `
        <h1>parentCmp</h1>
        <ng-view on-event="$ctrl.handleEvent(foo, bar)"></ng-view>
        `,
      })
      .component("childEventComponent", {
        bindings: { onEvent: "&" },
        template: `
        <h1>childCmp</h1>
        <button id="eventbtn" ng-click="$ctrl.onEvent({ foo: 123, bar: 456 })">Button</button>
        `,
      })
      .component("dynamicComponent", {
        template: "dynamicComponent {{ $ctrl.param }}",
        controller: function () {
          this.$onParamsChanged = function (params) {
            this.param = params.param;
          };
        },
      })
      .config({ $location: { html5Mode: false } });

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke([
      "$rootScope",
      "$compile",
      "$state",
      "$templateCache",
      (_$rootScope_, _$compile_, _$state_, _$templateCache_) => {
        svcs = {
          $compile: _$compile_,
          $state: _$state_,
        };
        stateRuntime = _$state_;
        $rootScope = _$rootScope_;
        scope = $rootScope.$new();
        log = "";
        el.innerHTML = "<div><ng-view></ng-view></div>";
        svcs.$compile(el)(scope);
        $templateCache = _$templateCache_;
      },
    ]);
  });

  async function waitForText(text) {
    await waitUntil(
      () => el.textContent === text || el.textContent.includes(text),
    );
  }

  async function waitForViewHtml(html) {
    await waitUntil(() => el.querySelector("ng-view")?.innerHTML === html);
  }

  describe("routing using component templates", () => {
    beforeEach(() => {
      stateRuntime.state({
        name: "cmp_tpl",
        url: "/cmp_tpl",
        templateUrl: "/state_tpl.html",
        controller: function () {},
        resolve: {
          data() {
            return "DATA!";
          },
        },
      });
    });

    it("should work with directives which themselves have templateUrls", async () => {
      const { $state } = svcs;

      $templateCache.set(
        "/state_tpl.html",
        'x<ng12-directive data="$resolve.data"></ng12-directive>x',
      );
      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");

      $state.transitionTo("cmp_tpl");
      await waitForViewHtml(
        'x<ng12-directive data="$resolve.data">-DATA!-</ng12-directive>x',
      );
      expect($state.current.name).toBe("cmp_tpl");

      expect(el.querySelector("ng-view").innerHTML).toEqual(
        'x<ng12-directive data="$resolve.data">-DATA!-</ng12-directive>x',
      );
    });

    it("should work with bindToController directives", async () => {
      const { $state } = svcs;

      $templateCache.set(
        "/state_tpl.html",
        'x<ng13-directive data="$resolve.data"></ng13-directive>x',
      );
      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");

      $state.transitionTo("cmp_tpl");
      await waitForViewHtml(
        'x<ng13-directive data="$resolve.data">-DATA!-</ng13-directive>x',
      );

      expect($state.current.name).toBe("cmp_tpl");
      expect(el.querySelector("ng-view").innerHTML).toEqual(
        'x<ng13-directive data="$resolve.data">-DATA!-</ng13-directive>x',
      );
    });

    it("should work with .component()s", async () => {
      const { $state } = svcs;

      $templateCache.set(
        "/state_tpl.html",
        'x<ng-component data="$resolve.data"></ng-component>x',
      );
      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");

      $state.transitionTo("cmp_tpl");
      await waitForViewHtml(
        'x<ng-component data="$resolve.data">-DATA!-</ng-component>x',
      );

      expect($state.current.name).toBe("cmp_tpl");
      expect(el.querySelector("ng-view").innerHTML).toEqual(
        'x<ng-component data="$resolve.data">-DATA!-</ng-component>x',
      );
    });
  });

  describe("+ component: declaration", () => {
    it("should disallow controller/template configuration", () => {
      const stateDef = {
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        resolve: {
          data() {
            return "DATA!";
          },
        },
      };

      expect(() => {
        stateRuntime.state(
          Object.assign({ name: "route2cmp", template: "fail" }, stateDef),
        );
      }).toThrow();
      expect(() => {
        stateRuntime.state(
          Object.assign(
            { name: "route2cmp", templateUrl: "fail.html" },
            stateDef,
          ),
        );
      }).toThrow();
      expect(() => {
        stateRuntime.state(
          Object.assign(
            {
              name: "route2cmp",
              templateProvider: () => {
                /* empty */
              },
            },
            stateDef,
          ),
        );
      }).toThrow();
      expect(() => {
        stateRuntime.state(
          Object.assign({ name: "route2cmp", controllerAs: "fail" }, stateDef),
        );
      }).toThrow();
      expect(() => {
        stateRuntime.state(
          Object.assign(
            { name: "route2cmp", controller: "FailCtrl" },
            stateDef,
          ),
        );
      }).toThrow();

      expect(() => {
        stateRuntime.state(stateDef);
      }).not.toThrow();
    });

    it("should work with angular 1.5+ .component()s", async () => {
      stateRuntime.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const { $state } = svcs;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await waitForText("-DATA!-");

      const directiveEl = el.querySelector("div ng-view ng-component");

      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!-");
    });

    it("should route directly to an inline component definition", async () => {
      stateRuntime.state({
        name: "route2inlinecmp",
        url: "/route2inlinecmp",
        component: {
          bindings: { data: "<" },
          template: "<span>inline {{ $ctrl.data }}</span>",
        },
        resolve: {
          data: () => "DATA!",
        },
      });

      await svcs.$state.transitionTo("route2inlinecmp");
      await waitForText("inline DATA!");

      expect(svcs.$state.current.name).toBe("route2inlinecmp");
      expect(el.textContent).toBe("inline DATA!");
      expect(el.querySelector("ng-view").innerHTML).not.toContain("ng-route");
    });

    it("should support string component shorthand in named views", async () => {
      stateRuntime.state({
        name: "namedComponentView",
        views: {
          header: "header",
        },
        resolve: {
          status: () => "ready",
        },
      });

      el.innerHTML = '<div><ng-view name="header"></ng-view></div>';
      svcs.$compile(el)(scope);

      await svcs.$state.transitionTo("namedComponentView");
      await waitForText("#ready#");

      expect(el.textContent).toBe("#ready#");
    });

    it("should route named views directly to inline component definitions", async () => {
      stateRuntime.state({
        name: "namedInlineComponentView",
        views: {
          header: {
            component: {
              bindings: { status: "<" },
              template: "<span>inline #{{ $ctrl.status }}#</span>",
            },
          },
        },
        resolve: {
          status: () => "ready",
        },
      });

      el.innerHTML = '<div><ng-view name="header"></ng-view></div>';
      svcs.$compile(el)(scope);

      await svcs.$state.transitionTo("namedInlineComponentView");
      await waitForText("inline #ready#");

      expect(el.textContent).toBe("inline #ready#");
      expect(el.querySelector("ng-view").innerHTML).not.toContain("ng-route");
    });

    it("should clear ng-view when routing to a component whose templateUrl was already fetched elsewhere", async () => {
      stateRuntime.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      el.innerHTML =
        '<div><ng-component data="outsideData"></ng-component><ng-view>fallback content</ng-view></div>';
      scope.outsideData = "OUTSIDE";
      svcs.$compile(el)(scope);

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      await waitForText("-OUTSIDE-");

      expect(el.textContent).toContain("-OUTSIDE-");

      const { $state } = svcs;

      $state.transitionTo("route2cmp");
      await waitUntil(
        () => el.querySelector("div ng-view").textContent === "-DATA!-",
      );

      expect($state.current.name).toBe("route2cmp");
      expect(el.querySelector("div ng-view").textContent).toBe("-DATA!-");
      expect(el.querySelector("div ng-view").textContent).not.toContain(
        "fallback content",
      );
    });

    it("should only call $onInit() once", async () => {
      stateRuntime.state({
        name: "route2cmp",
        component: "ngComponent",
        resolve: {
          data: () => {
            return "DATA!";
          },
        },
      });

      const { $state } = svcs;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await waitUntil(() => log === "onInit;");

      expect(log).toBe("onInit;");
    });

    it('should supply resolve data to "<", "=", "@" bindings', async () => {
      stateRuntime.state({
        name: "bindingtypes",
        component: "bindingTypes",
        resolve: {
          oneway: () => {
            return "ONEWAY";
          },
          twoway: () => {
            return "TWOWAY";
          },
          attribute: () => {
            return "ATTRIBUTE";
          },
        },
        bindings: { attr: "attribute" },
      });

      const { $state } = svcs;

      $state.transitionTo("bindingtypes");
      await waitForText("-ONEWAY,TWOWAY,ATTRIBUTE-");

      expect(el.textContent).toBe("-ONEWAY,TWOWAY,ATTRIBUTE-");
    });

    it('should supply resolve data to optional "<?", "=?", "@?" bindings', async () => {
      stateRuntime.state({
        name: "optionalbindingtypes",
        component: "optionalBindingTypes",
        resolve: {
          oneway: () => {
            return "ONEWAY";
          },
          twoway: () => {
            return "TWOWAY";
          },
          attribute: () => {
            return "ATTRIBUTE";
          },
        },
        bindings: { attr: "attribute" },
      });

      const { $state } = svcs;

      $state.transitionTo("optionalbindingtypes");
      await waitForText("-ONEWAY,TWOWAY,ATTRIBUTE-");

      expect(el.textContent).toBe("-ONEWAY,TWOWAY,ATTRIBUTE-");
    });

    // Test for #3099
    it('should not throw when routing to a component with output "&" binding', async () => {
      stateRuntime.state({
        name: "nothrow",
        component: "eventComponent",
      });

      const { $state } = svcs;

      $state.transitionTo("nothrow");
      await waitForText("eventCmp");

      expect(el.textContent).toBe("eventCmp");
    });

    // Test for #3239
    it("should pass any bindings (wired from a parent component template via the ng-view) through to the child", async () => {
      const { $state } = svcs;

      stateRuntime.state({
        name: "parent",
        template:
          '<ng-view oneway="data1w" twoway="data2w" attr="attrval"></ng-view>',
        controller: [
          "$scope",
          function ($scope) {
            $scope.data1w = "1w";
            $scope.data2w = "2w";
          },
        ],
      });

      stateRuntime.state({
        name: "parent.child",
        component: "bindingTypes",
      });

      $state.transitionTo("parent.child");
      await waitForText("-1w,2w,attrval-");
      expect(el.textContent).toEqual("-1w,2w,attrval-");
    });

    // Test for #3239
    it("should prefer ng-view bindings over resolve data", async () => {
      const { $state } = svcs;

      stateRuntime.state({
        name: "parent",
        template:
          '<ng-view oneway="data1w" twoway="data2w" attr="attrval"></ng-view>',
        resolve: {
          oneway: () => "asfasfd",
          twoway: () => "asfasfd",
          attr: () => "asfasfd",
        },
        controller: [
          "$scope",
          function ($scope) {
            $scope.data1w = "1w";
            $scope.data2w = "2w";
          },
        ],
      });

      stateRuntime.state({
        name: "parent.child",
        component: "bindingTypes",
      });

      $state.transitionTo("parent.child");
      await waitForText("-1w,2w,attrval-");
      expect(el.textContent).toEqual("-1w,2w,attrval-");
    });

    // Test for #3239
    it("should prefer ng-view bindings over resolve data unless a bindings exists", async () => {
      const { $state } = svcs;

      stateRuntime.state({
        name: "parent",
        template:
          '<ng-view oneway="data1w" twoway="data2w" attr="attrval"></ng-view>',
        resolve: {
          oneway: () => "asfasfd",
          twoway: () => "asfasfd",
          attr: () => "asfasfd",
        },
        controller: [
          "$scope",
          function ($scope) {
            $scope.data1w = "1w";
            $scope.data2w = "2w";
          },
        ],
      });

      stateRuntime.state({
        name: "parent.child",
        component: "bindingTypes",
        bindings: { oneway: "oneway" },
      });

      $state.transitionTo("parent.child");
      await waitForText("-asfasfd,2w,attrval-");
      expect(el.textContent).toEqual("-asfasfd,2w,attrval-");
    });

    // Test for #3239
    it("should pass & bindings (wired from a parent component via the ng-view) through to the child", async () => {
      const { $state } = svcs;

      $rootScope.log = [];

      stateRuntime.state({
        name: "parent",
        component: "parentCallbackComponent",
      });

      stateRuntime.state({
        name: "parent.child",
        component: "childEventComponent",
      });

      $state.transitionTo("parent.child");
      await waitUntil(() => el.querySelector("button") !== null);
      expect($rootScope.log).toEqual([]);
      expect(el.textContent.split(/\s+/).filter((x) => x)).toEqual([
        "parentCmp",
        "childCmp",
        "Button",
      ]);

      // - Click button
      // - ng-click handler calls $ctrl.onEvent({ foo: 123, bar: 456 })
      // - on-event is bound to $ctrl.handleEvent(foo, bar) on parentCallbackComponent
      // - handleEvent pushes param values to the log
      el.querySelector("button").click();
      expect($rootScope.log).toEqual([123, 456]);
    });

    // Test for #3111
    it("should bind & bindings to a resolve that returns a function", async () => {
      const { $state } = svcs;

      log = [];

      const onEvent = (foo, bar) => {
        log.push(foo);
        log.push(bar);
      };
      onEvent.$inject = ["foo", "bar"];

      stateRuntime.state({
        name: "resolve",
        component: "childEventComponent",
        resolve: {
          onEvent: () => onEvent,
        },
      });

      $state.transitionTo("resolve");
      await waitUntil(() => el.querySelector("button") !== null);
      expect(log).toEqual([]);
      el.querySelector("button").click();
      expect(log).toEqual([123, 456]);
    });

    // Test for #3111
    it("should bind & bindings to a resolve that returns an array-style function", async () => {
      const { $state } = svcs;

      log = [];

      stateRuntime.state({
        name: "resolve",
        component: "childEventComponent",
        resolve: {
          onEvent: () => [
            "foo",
            "bar",
            (foo, bar) => {
              log.push(foo);
              log.push(bar);
            },
          ],
        },
      });

      $state.transitionTo("resolve");
      await waitUntil(() => el.querySelector("button") !== null);
      expect(log).toEqual([]);
      el.querySelector("button").click();
      expect(log).toEqual([123, 456]);
    });
  });

  describe("+ bindings: declaration", () => {
    it("should provide the named component binding with data from the named resolve", async () => {
      stateRuntime.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        bindings: { data: "foo" },
        resolve: {
          foo: () => {
            return "DATA!";
          },
        },
      });

      const { $state } = svcs;

      $templateCache.set("/comp_tpl.html", "-{{ $ctrl.data }}-");
      $state.transitionTo("route2cmp");
      await waitForText("-DATA!-");

      const directiveEl = el.querySelector("div ng-view ng-component");

      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!-");
    });

    it("should provide default bindings for any component bindings omitted in the state.bindings map", async () => {
      stateRuntime.state({
        name: "route2cmp",
        url: "/route2cmp",
        component: "ngComponent",
        bindings: { data: "foo" },
        resolve: {
          foo: () => {
            return "DATA!";
          },
          data2: () => {
            return "DATA2!";
          },
        },
      });

      const { $state } = svcs;

      $templateCache.set(
        "/comp_tpl.html",
        "-{{ $ctrl.data }}.{{ $ctrl.data2 }}-",
      );
      $state.transitionTo("route2cmp");
      await waitForText("-DATA!.DATA2!-");

      const directiveEl = el.querySelector("div ng-view ng-component");

      expect(directiveEl).toBeDefined();
      expect($state.current.name).toBe("route2cmp");
      expect(el.textContent).toBe("-DATA!.DATA2!-");
    });
  });

  describe("$onParamsChanged()", () => {
    let param;

    beforeEach(() => {
      param = null;

      stateRuntime.state({
        name: "dynamic",
        url: "/dynamic/:param",
        component: "dynamicComponent",
        params: { param: { dynamic: true } },
      });
      stateRuntime.state({
        name: "dynamicInline",
        url: "/dynamic-inline/:param",
        component: {
          template: "<span>dynamicInline {{ $ctrl.param }}</span>",
          controller: function () {
            this.$onParamsChanged = function (params) {
              this.param = params.param;
            };
          },
        },
        params: { param: { dynamic: true } },
      });
    });

    it("should not be called on the initial transition", async () => {
      const { $state } = svcs;

      $state.go("dynamic", { param: "abc" });
      await waitForText("dynamicComponent");
      expect(el.textContent.trim()).toBe("dynamicComponent");
    });

    it("should be called when dynamic parameters change", async () => {
      const { $state } = svcs;

      $state.go("dynamic", { param: "abc" });
      await waitForText("dynamicComponent");
      $state.go("dynamic", { param: "def" });
      await waitForText("dynamicComponent def");

      expect(el.textContent.trim()).toBe("dynamicComponent def");
    });

    it("should be called when dynamic parameters change on an inline component", async () => {
      const { $state } = svcs;

      $state.go("dynamicInline", { param: "abc" });
      await waitForText("dynamicInline");
      $state.go("dynamicInline", { param: "def" });
      await waitForText("dynamicInline def");

      expect(el.textContent.trim()).toBe("dynamicInline def");
      expect(el.querySelector("ng-view").innerHTML).not.toContain("ng-route");
    });
  });
});
