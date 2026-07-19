// @ts-nocheck
/// <reference types="jasmine" />
import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { isFunction } from "../../shared/utils.ts";
import { waitUntil } from "../../shared/test-utils.ts";
import { getTransitionRetryPolicyFromStateName } from "./state-transition.ts";

describe("$state", () => {
  let $injector, template, $compile, module, $stateRegistry;

  const errorLog = [];

  const app = document.getElementById("app");

  let stateRuntime;

  function $get(what) {
    return $injector.get(what);
  }

  async function initStateTo(state, params) {
    const $state = $get("$state");

    return $state.transitionTo(state, params || {});
  }

  const A = {
      name: "A",
      data: {},
      controller: function () {
        log += "controller;";
      },
      template: "a",
    },
    B = { name: "B", template: "b" },
    C = { name: "C", template: "c" },
    D = { name: "D", params: { x: null, y: null }, template: "d" },
    DD = {
      name: "DD",
      parent: D,
      params: { x: null, y: null, z: null },
      template: "dd",
    },
    DDDD = {
      name: "DDDD",
      parent: D,
      controller: function () {},
      template: "hey",
    },
    E = { name: "E", params: { i: {} }, template: "e" },
    F = {
      name: "F",
      params: { a: "", b: false, c: 0, d: undefined, e: -1 },
      template: "f",
    },
    H = { name: "H", data: { propA: "propA", propB: "propB" }, template: "h" },
    HH = { name: "HH", parent: H, template: "hh" },
    HHH = {
      name: "HHH",
      parent: HH,
      data: { propA: "overriddenA", propC: "propC" },
      template: "hhh",
    },
    RS = {
      name: "RS",
      url: "^/search?term",
      dynamic: true,
      template: "rs",
    },
    OPT = {
      name: "OPT",
      url: "/opt/:param",
      params: { param: "100" },
      template: "opt",
    },
    OPT2 = {
      name: "OPT2",
      url: "/opt2/:param2/:param3",
      params: { param3: "300", param4: "400" },
      template: "opt2",
    },
    ISS2101 = {
      name: "ISS2101",
      params: { bar: { squash: false, value: "qux" } },
      url: "/2101/{bar:string}",
    },
    URLLESS = {
      name: "URLLESS",
      url: "/urllessparams",
      params: { myparam: { type: "int" } },
    },
    AppInjectable = {};

  let log, logEvents, logEnterExit;

  function callbackLogger(state, what) {
    return function () {
      if (logEnterExit) log += `${state.name}.${what};`;
    };
  }

  afterEach(() => {
    dealoc(document.getElementById("app"));
  });

  describe("state registration", () => {
    beforeEach(() => {
      dealoc(document.getElementById("app"));
      // some tests are polluting the cache
      window.angular = new Angular();
      module = window.angular
        .module("defaultModule", [])
        .decorator("$exceptionHandler", function () {
          return (exception) => {
            errorLog.push(exception.message);
          };
        });
      module.config({ $location: { html5Mode: false } });
      stateRuntime = window.angular
        .bootstrap(document.getElementById("app"), ["defaultModule"])
        .get("$state");
    });

    afterEach(() => {
      dealoc(document.getElementById("app"));
    });

    it("should should not allow states that are already registered", () => {
      expect(() => {
        stateRuntime.state({ name: "toString", url: "/to-string" });
      }).not.toThrow();
      expect(() => {
        stateRuntime.state({ name: "toString", url: "/to-string" });
      }).toThrowError(/stateinvalid/);
    });

    it("should requred `name` if state definition object is passed", () => {
      expect(() => {
        stateRuntime.state({ url: "/to-string" });
      }).toThrowError(/stateinvalid/);
      expect(() => {
        stateRuntime.state({ name: "hasName", url: "/to-string" });
      }).not.toThrowError(/stateinvalid/);
    });

    it("should accept state name and definition as separate arguments", () => {
      expect(() => {
        stateRuntime.state("named", {
          url: "/named",
          template: "named",
        });
      }).not.toThrowError();

      expect(stateRuntime.get("named").url).toBe("/named");
    });

    it("should reject mismatched separate state names", () => {
      expect(() => {
        stateRuntime.state("expected", {
          name: "actual",
          url: "/actual",
        });
      }).toThrowError(/does not match/);
    });
  });

  describe(".transitionTo()", function () {
    let $rootScope, $state, $transitions, $q, $location;

    const errorLog = [];

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      window.angular = new Angular();
      module = window.angular
        .module("defaultModule", [])
        .decorator("$exceptionHandler", function () {
          return (exception) => {
            errorLog.push(exception.message);
          };
        })
        .value("AppInjectable", AppInjectable);
      module.config({ $location: { html5Mode: false } });
      [A, B, C, D, DD, E, H, HH, HHH].forEach(function (state) {
        state.onEnter = callbackLogger(state, "onEnter");
        state.onExit = callbackLogger(state, "onExit");
      });

      module
        .router(A)
        .router(B)
        .router(C)
        .router(D)
        .router(DD)
        .router(DDDD)
        .router(E)
        .router(F)
        .router(H)
        .router(HH)
        .router(HHH)
        .router(RS)
        .router(OPT)
        .router(OPT2)
        .router(ISS2101)
        .router(URLLESS)
        .router({ name: "home", url: "/" })
        .router({ name: "home.item", url: "front/:id" })
        .router({
          name: "about",
          url: "/about",
          resolve: {
            stateInfo: [
              "$transition$",
              function stateInfo($transition$) {
                return [$transition$.from().name, $transition$.to().name];
              },
            ],
          },
          onEnter: [
            "stateInfo",
            function onEnter(stateInfo) {
              log = stateInfo.join(" => ");
            },
          ],
        })
        .router({ name: "about.person", url: "/:person" })
        .router({ name: "about.person.item", url: "/:id" })
        .router({ name: "about.sidebar" })
        .router({
          name: "about.sidebar.item",
          url: "/:item",
          templateUrl(params) {
            templateParams = params;
            return `/templates/${params.item}.html`;
          },
        })
        .router({
          name: "dynamicTemplate",
          url: "/dynamicTemplate/:type",
          template(params) {
            template = `${params.type}Template`;
            return template;
          },
        })
        .router({
          name: "home.redirect",
          url: "redir",
          onEnter: [
            "$state",
            function onEnter($state) {
              $state.transitionTo("about");
            },
          ],
        })
        .router({
          name: "resolveFail",
          url: "/resolve-fail",
          resolve: {
            badness: [
              "$q",
              function badness($q) {
                return $q.reject("!");
              },
            ],
          },
          onEnter: ["badness", function onEnter(badness) {}],
        })
        .router({
          name: "resolveTimeout",
          url: "/resolve-timeout/:foo",
          resolve: {
            value: [
              "$timeout",
              function value($timeout) {
                return setTimeout(function () {
                  log += "Success!";
                }, 1);
              },
            ],
          },
          onEnter: ["value", function onEnter(value) {}],
          template: "-",
          controller: function () {
            log += "controller;";
          },
        })
        .router({ name: "badParam", url: "/bad/{param:int}" })
        .router({ name: "badParam2", url: "/bad2/{param:[0-9]{5}}" })

        .router({ name: "json", url: "/jsonstate/{param:json}" })

        .router({ name: "first", url: "^/first/subpath" })
        .router({ name: "second", url: "^/second" })

        // State param inheritance tests. param1 is inherited by sub1 & sub2;
        // param2 should not be transferred (unless explicitly set).
        .router({ name: "root", url: "^/root?param1" })
        .router({ name: "root.sub1", url: "/1?param2" })
        .router({
          name: "logA",
          url: "/logA",
          template: "<div> <div ng-view/></div>",
          controller: function () {
            log += "logA;";
          },
        })
        .router({
          name: "logA.logB",
          url: "/logB",
          template: "<div> <div ng-view/></div>",
          controller: function () {
            log += "logB;";
          },
        })
        .router({
          name: "logA.logB.logC",
          url: "/logC",
          template: "<div> <div ng-view/></div>",
          controller: function () {
            log += "logC;";
          },
        })
        .router({ name: "root.sub2", url: "/2?param2" });

      $injector = window.angular.bootstrap(document.getElementById("app"), [
        "defaultModule",
      ]);

      $injector.invoke([
        "$rootScope",
        "$state",
        "$transitions",
        "$location",
        "$compile",
        "$stateRegistry",
        (
          _$rootScope_,
          _$state_,
          _$transitions_,
          _$location_,
          _$compile_,
          _$stateRegistry_,
        ) => {
          $rootScope = _$rootScope_;
          $state = _$state_;
          stateRuntime = $state;
          $transitions = _$transitions_;
          $location = _$location_;
          $compile = _$compile_;
          $stateRegistry = _$stateRegistry_;
        },
      ]);
    });

    afterEach(() => {
      dealoc(document.getElementById("app"));
    });

    describe("(with dynamic params because dynamic=true)", function () {
      describe("and only query params changed", () => {
        let entered = false;

        beforeEach(async () => {
          await initStateTo(RS);
          $transitions.onEnter({ entering: "RS" }, function () {
            entered = true;
          });
        });

        // this passes in isolation
        it("updates $state.params", async () => {
          await initStateTo(RS);
          $location.setSearch({ term: "hello" });
          await waitUntil(() => $state.params.term === "hello");
          expect($state.params.term).toEqual("hello");
          expect(entered).toBeFalsy();
        });

        it("doesn't re-enter state (triggered by url change)", async () => {
          $location.setSearch({ term: "hello" });
          await waitUntil(() => $location.getSearch().term === "hello");

          expect($location.getSearch()).toEqual({ term: "hello" });
          expect(entered).toBeFalsy();
        });

        it("doesn't re-enter state (triggered by $state transition)", async () => {
          await initStateTo(RS);
          const promise = $state.go(".", { term: "hello" });

          let success = false,
            { transition } = promise;

          await transition.promise.then(async () => {
            success = true;
          });

          expect($state.current).toBe(RS);
          expect(entered).toBeFalsy();
          expect(success).toBeTruthy();
          expect($location.getSearch()).toEqual({ term: "hello" });
        });

        it("updates URL when (triggered by $state transition)", async () => {
          await initStateTo(RS);
          await $state.go(".", { term: "goodbye" });

          expect($state.params.term).toEqual("goodbye");
          expect($location.getUrl()).toEqual("/search?term=goodbye");
          expect(entered).toBeFalsy();
        });
      });
    });

    describe("basic functionality", () => {
      it("returns a promise for the target state", async () => {
        const promise = $state.transitionTo(A, {});

        expect(isFunction(promise.then)).toBeTruthy();
        expect(promise.transition.to()).toBe(A);
        await promise;
      });

      it("provides a fallback current transition option when one is not supplied", () => {
        const $state = $get("$state");
        const $transitions = $get("$transitions");
        const target = $state.target(A, {}, {});
        const transition = $transitions.create($state.getCurrentPath(), target);

        expect(transition._options.current()).toBe(transition);
      });

      it("does not retry lazy loading when no retry policy is configured", async () => {
        const shouldRetry = await $state._shouldRetryLazyLoad(
          undefined,
          1,
          new Error("boom"),
          "missing",
        );

        expect(shouldRetry).toBe(false);
      });

      it("invokes lazy retry policy callbacks with route context", async () => {
        const calls = [];
        const originalInjector = $state._routerState._injector;
        const originalCurrent = $state._routerState._current;
        const originalCurrentState = $state._routerState._currentState;

        $state._policyDiagnostics = [];
        $state._routerState._current = undefined;
        $state._routerState._currentState = undefined;
        $state._routerState._injector = {
          invoke(policy, self, locals, label) {
            calls.push({ locals, label });

            return policy(
              locals.context,
              locals.state,
              locals.from,
              locals.to,
              locals.$transition$,
            );
          },
        };

        try {
          const shouldRetry = await $state._shouldRetryLazyLoad(
            {
              state: { name: "lazyParent" },
              policy(context, state, from, to, transition) {
                expect(context.operation).toBe("retry");
                expect(context.attempt).toBe(1);
                expect(context.state).toBe(state);
                expect(context.transition).toBeUndefined();
                expect(transition).toBeUndefined();
                expect(from.name).toBe("");
                expect(to.name).toBe("");

                return 2.9;
              },
            },
            1,
            new Error("temporary"),
            { name: "lazyParent.child" },
          );

          expect(shouldRetry).toBe(true);
          expect(calls[0].label).toBe("route retry policy");
          expect($state._policyDiagnostics).toEqual([
            {
              _kind: "retry",
              _decision: "retry",
              _from: undefined,
              _to: "lazyParent.child",
              _policyState: "lazyParent",
              _attempt: 1,
            },
          ]);
        } finally {
          $state._routerState._injector = originalInjector;
          $state._routerState._current = originalCurrent;
          $state._routerState._currentState = originalCurrentState;
        }
      });

      it("uses current route state when lazy retry policy callbacks block retry", async () => {
        const originalInjector = $state._routerState._injector;
        const originalCurrent = $state._routerState._current;
        const originalCurrentState = $state._routerState._currentState;

        $state._policyDiagnostics = [];
        $state._routerState._current = A;
        $state._routerState._currentState = { self: B };
        $state._routerState._injector = {
          invoke(policy, self, locals) {
            return policy(locals.context);
          },
        };

        try {
          const shouldRetry = await $state._shouldRetryLazyLoad(
            {
              state: { name: "lazyParent" },
              policy(context) {
                expect(context.from).toBe(A);
                expect(context.to).toBe(B);

                return false;
              },
            },
            1,
            new Error("temporary"),
            "lazyParent.child",
          );

          expect(shouldRetry).toBe(false);
          expect($state._policyDiagnostics).toEqual([
            {
              _kind: "retry",
              _decision: "blocked",
              _from: "A",
              _to: "lazyParent.child",
              _policyState: "lazyParent",
              _attempt: 1,
            },
          ]);
        } finally {
          $state._routerState._injector = originalInjector;
          $state._routerState._current = originalCurrent;
          $state._routerState._currentState = originalCurrentState;
        }
      });

      it("builds lazy error policy context from root and current route states", async () => {
        const $state = $get("$state");
        const originalInjector = $state._routerState._injector;
        const originalCurrent = $state._routerState._current;
        const originalCurrentState = $state._routerState._currentState;
        const contexts = [];

        $state._routerState._injector = {
          invoke(policy, self, locals) {
            return policy(locals.context);
          },
        };
        const policy = (context) => {
          contexts.push(context);

          return undefined;
        };

        try {
          $state._routerState._current = undefined;
          $state._routerState._currentState = undefined;
          await $state._buildLazyErrorBoundaryTarget(
            $state.target(A),
            A,
            policy,
            new Error("root"),
          );

          $state._routerState._current = A;
          $state._routerState._currentState = { self: B };
          await $state._buildLazyErrorBoundaryTarget(
            $state.target(B),
            B,
            policy,
            new Error("current"),
          );

          expect(contexts[0].from.name).toBe("");
          expect(contexts[0].to.name).toBe("");
          expect(contexts[1].from).toBe(A);
          expect(contexts[1].to).toBe(B);
        } finally {
          $state._routerState._injector = originalInjector;
          $state._routerState._current = originalCurrent;
          $state._routerState._currentState = originalCurrentState;
        }
      });

      it("rejects lazy retry policy callbacks that do not return a retry decision", async () => {
        const originalInjector = $state._routerState._injector;

        $state._routerState._injector = {
          invoke() {
            return "retry";
          },
        };

        try {
          await expectAsync(
            $state._shouldRetryLazyLoad(
              {
                state: { name: "lazyParent" },
                policy() {},
              },
              1,
              new Error("temporary"),
              "lazyParent.child",
            ),
          ).toBeRejectedWithError(
            "Route retry policy must return boolean or number.",
          );
        } finally {
          $state._routerState._injector = originalInjector;
        }
      });

      it("normalizes retry policy decisions", () => {
        expect($state._normalizeRetryPolicy(true)).toBe(2);
        expect($state._normalizeRetryPolicy(false)).toBe(0);
        expect($state._normalizeRetryPolicy(Number.POSITIVE_INFINITY)).toBe(0);
        expect($state._normalizeRetryPolicy(0)).toBe(0);
        expect($state._normalizeRetryPolicy(2.9)).toBe(2);
      });

      it("finds transition retry policies from state names and declarations", () => {
        stateRuntime.state({
          name: "retryLookup",
          policy: {
            transition: {
              retry: 3,
            },
          },
        });
        stateRuntime.state({
          name: "retryLookup.child",
          template: "retry lookup child",
        });

        expect(getTransitionRetryPolicyFromStateName($state, undefined)).toBe(
          undefined,
        );
        expect(getTransitionRetryPolicyFromStateName($state, "")).toBe(
          undefined,
        );
        expect(
          getTransitionRetryPolicyFromStateName($state, { name: 123 }),
        ).toBe(undefined);
        expect(
          getTransitionRetryPolicyFromStateName($state, {
            name: "retryLookup.child",
          }),
        ).toEqual({
          state: jasmine.objectContaining({ name: "retryLookup" }),
          policy: 3,
        });

        $state._routerState._retry = 4;

        expect(getTransitionRetryPolicyFromStateName($state, "home")).toEqual({
          state: jasmine.objectContaining({ name: "" }),
          policy: 4,
        });
      });

      it("rejects transitions to invalid abstract targets", async () => {
        stateRuntime.state({
          name: "abstractOnly",
          abstract: true,
        });

        await expectAsync($state.go("abstractOnly")).toBeRejected();
      });

      it("validates reload target options", () => {
        expect(() => {
          $state.target(A, {}, { reload: {} });
        }).toThrowError("Invalid reload state object");

        expect(() => {
          $state.target(A, {}, { reload: "missing" });
        }).toThrowError("No such reload state 'missing'");

        expect(() => {
          $state.target(A, {}, { reload: { name: "missingObject" } });
        }).toThrowError("No such reload state 'missingObject'");

        expect(() => {
          $state.target(A, {}, { reload: 42 });
        }).toThrowError("No such reload state '42'");
      });

      it("validates string state declarations and explicit undefined lookups", () => {
        expect($state.get(undefined)).toBeUndefined();
        expect(() => stateRuntime.state("missingDefinition")).toThrowError(
          /'definition' required/,
        );
      });

      it("rejects failed lazy loading when no retry policy is configured", async () => {
        const failure = new Error("lazy failed");
        let thrown;

        $state._defaultErrorHandler = function () {};
        $state.lazy("brokenLazy", async () => {
          throw failure;
        });

        try {
          await $state.go("brokenLazy.child");
        } catch (error) {
          thrown = error;
        }

        expect(thrown).toBe(failure);
      });

      it("returns a promise for the target state", async () => {
        const promise = $state.transitionTo(A, {});

        expect(isFunction(promise.then)).toBeTruthy();
        expect(promise.transition.to()).toBe(A);
        await promise;
      });

      it("show return promise with an error on invalid state", async () => {
        const res = $state.transitionTo("about.person.item", { id: 5 });

        let message;

        res.catch((x) => {
          message = x.message;
        });
        await waitUntil(() => message !== undefined);
        expect(message).toBeDefined();
      });

      it("can register a missing state asynchronously from a lazy state loader and retry the transition", async () => {
        stateRuntime.lazy("asyncLoaded", async () => {
          const imported = await Promise.resolve({
            states: [{ name: "asyncLoaded", url: "/async-loaded" }],
          });

          return imported.states;
        });

        await $state.transitionTo("asyncLoaded");

        expect($state.current.name).toBe("asyncLoaded");
      });

      it("allows transitions by name", async () => {
        await $state.transitionTo("A", {});

        expect($state.current).toEqual(A);
      });
    });

    describe("dynamic transitions", function () {
      let dynlog, paramsChangedLog, dynRetainEnabled;

      let dynamicstate, childWithParam, childNoParam;

      beforeEach(async () => {
        window.location.hash = "";
        dynlog = paramsChangedLog = "";
        dynRetainEnabled = false;
        dynamicstate = {
          name: "dyn",
          url: "^/dynstate/:path/:pathDyn?search&searchDyn",
          params: {
            pathDyn: { dynamic: true },
            searchDyn: { dynamic: true },
          },
          template: "dyn state. <div ng-view></div>",
          controller: function () {
            this.$onParamsChanged = function (updatedParams) {
              const paramNames = Object.keys(updatedParams).sort();

              const keyValues = paramNames.map(function (key) {
                return `${key}=${updatedParams[key]}`;
              });

              dynlog += `[${keyValues.join(",")}];`;
              paramsChangedLog += `${paramNames.join(",")};`;
            };
          },
          onRetain: function () {
            if (dynRetainEnabled) {
              dynlog += "retain:dyn;";
            }
          },
        };

        childWithParam = {
          name: "dyn.child",
          url: "/child",
          params: {
            config: "c1", // allow empty
            configDyn: { value: null, dynamic: true },
          },
          template: "dyn.child state",
          controller: function () {
            this.$onParamsChanged = function (updatedParams) {
              const paramNames = Object.keys(updatedParams).sort();

              const keyValues = paramNames.map(function (key) {
                return `${key}=${updatedParams[key]}`;
              });

              dynlog += `{${keyValues.join(",")}};`;
              paramsChangedLog += `${paramNames.join(",")};`;
            };
          },
        };

        childNoParam = {
          name: "dyn.noparams",
          url: "/noparams",
          template: "dyn.noparams state",
          controller: function () {
            this.$onParamsChanged = function (updatedParams) {
              const paramNames = Object.keys(updatedParams).sort();

              const keyValues = paramNames.map(function (key) {
                return `${key}=${updatedParams[key]}`;
              });

              dynlog += `<${keyValues.join(",")}>;`;
              paramsChangedLog += `${paramNames.join(",")};`;
            };
          },
        };

        stateRuntime.state(dynamicstate);
        stateRuntime.state(childWithParam);
        stateRuntime.state(childNoParam);

        $transitions.onEnter({}, function (trans, state) {
          dynlog += `enter:${state.name};`;
        });
        $transitions.onExit({}, function (trans, state) {
          dynlog += `exit:${state.name};`;
        });
        $transitions.onSuccess({}, function () {
          dynlog += "success;";
        });

        app.innerHTML = "<div>Test: <ng-view></ng-view></div>";
        $compile("<div><ng-view></ng-view></div>")($rootScope.$new());
        await initStateTo(dynamicstate, {
          path: "p1",
          pathDyn: "pd1",
          search: "s1",
          searchDyn: "sd1",
        });
        expect(dynlog.endsWith("enter:dyn;success;")).toBeTrue();
        Object.entries({
          path: "p1",
          pathDyn: "pd1",
          search: "s1",
          searchDyn: "sd1",
        }).forEach(([k, v]) => {
          expect($state.params[k]).toEqual(v);
        });
        expect($location.getUrl()).toEqual(
          "/dynstate/p1/pd1?search=s1&searchDyn=sd1",
        );
      });

      describe("[ transition.dynamic() ]:", function () {
        it("is considered fully dynamic when only dynamic params have changed", function () {
          const promise = $state.go(".", { pathDyn: "pd2", searchDyn: "sd2" });

          expect(promise.transition.dynamic()).toBeTruthy();
          promise.transition.abort();
        });

        it("is not considered fully dynamic if any state is entered", function () {
          const promise = $state.go(childWithParam);

          expect(promise.transition.dynamic()).toBeFalsy();
          promise.transition.abort();
        });

        it("is not considered fully dynamic if any state is exited", async () => {
          await initStateTo(childWithParam, {
            config: "p1",
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          const promise = $state.go(dynamicstate);

          expect(promise.transition.dynamic()).toBeFalsy();
          promise.transition.abort();
        });

        it("is not considered fully dynamic if any state is reloaded", function () {
          const promise = $state.go(dynamicstate, null, { reload: true });

          expect(promise.transition.dynamic()).toBeFalsy();
          promise.transition.abort();
        });

        it("is not considered fully dynamic if any non-dynamic parameter changes", function () {
          const promise = $state.go(dynamicstate, { path: "p2" });

          expect(promise.transition.dynamic()).toBeFalsy();
          promise.transition.abort();
        });
      });

      describe("[ promises ]", function () {
        beforeEach(() => (dynlog = ""));
        it("runs successful transition when fully dynamic", async () => {
          let transSuccess;

          const promise = $state.go(dynamicstate, { searchDyn: "sd2" });

          const { transition } = promise;

          transition.promise.then(function (result) {
            transSuccess = true;
          });
          await promise;
          await waitUntil(() => transSuccess === true);
          expect(transition.dynamic()).toBeTruthy();
          expect(transSuccess).toBeTruthy();
          expect(dynlog).toBe("success;[searchDyn=sd2];");
        });

        it("resolves the $state.go() promise with the original/final state, when fully dynamic", async () => {
          await initStateTo(dynamicstate, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          let destState,
            promise = $state.go(dynamicstate, {
              pathDyn: "pd2",
              searchDyn: "sd2",
            });

          promise.then(function (result) {
            destState = result;
          });
          await promise;
          await waitUntil(() => destState === dynamicstate);
          expect(promise.transition.dynamic()).toBeTruthy();
          expect($state.current).toBe(dynamicstate);
          expect(destState).toBe(dynamicstate);
        });
      });

      describe("[ enter/exit ]", function () {
        beforeEach(() => (dynlog = ""));
        it("does not exit nor enter any states when fully dynamic", async () => {
          const promise = $state.go(dynamicstate, { searchDyn: "sd2" });

          await promise;
          expect(promise.transition.dynamic()).toBeTruthy();
          expect(promise.transition._treeChanges.entering.length).toBe(0);
          expect(promise.transition._treeChanges.exiting.length).toBe(0);
          expect(promise.transition._treeChanges.retained.length).toBe(2);
          expect(dynlog).toBe("success;[searchDyn=sd2];");
          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd2",
          }).forEach(([k, v]) => {
            expect($state.params[k]).toEqual(v);
          });
        });

        it("runs onRetain callbacks for retained dynamic states", async () => {
          dynRetainEnabled = true;

          const promise = $state.go(dynamicstate, { searchDyn: "sd2" });

          await promise;

          expect(promise.transition.dynamic()).toBeTruthy();
          expect(dynlog).toContain("retain:dyn;");
        });

        it("does not exit nor enter the state when only dynamic search params change", async () => {
          const promise = $state.go(dynamicstate, { searchDyn: "sd2" });

          await promise;
          expect(promise.transition.dynamic()).toBeTruthy();
          expect(dynlog).toBe("success;[searchDyn=sd2];");
          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd2",
          }).forEach(([k, v]) => {
            expect($state.params[k]).toEqual(v);
          });
        });

        it("does not exit nor enter the state when only dynamic path params change", async () => {
          const promise = $state.go(dynamicstate, { pathDyn: "pd2" });

          await promise;
          expect(promise.transition.dynamic()).toBeTruthy();
          expect(dynlog).toBe("success;[pathDyn=pd2];");
          Object.entries({
            path: "p1",
            pathDyn: "pd2",
            search: "s1",
            searchDyn: "sd1",
          }).forEach(([k, v]) => {
            expect($state.params[k]).toEqual(v);
          });
        });

        it("exits and enters a state when a non-dynamic search param changes", async () => {
          const promise = $state.go(dynamicstate, { search: "s2" });

          await promise;
          expect(promise.transition.dynamic()).toBeFalsy();
          expect(dynlog).toBe("exit:dyn;enter:dyn;success;");
          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s2",
            searchDyn: "sd1",
          }).forEach(([k, v]) => {
            expect($state.params[k]).toEqual(v);
          });
        });

        it("exits and enters a state when a non-dynamic path param changes", async () => {
          const promise = $state.go(dynamicstate, { path: "p2" });

          await promise;
          expect(promise.transition.dynamic()).toBeFalsy();
          expect(dynlog).toBe("exit:dyn;enter:dyn;success;");
          Object.entries({
            path: "p2",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          }).forEach(([k, v]) => {
            expect($state.params[k]).toEqual(v);
          });
        });

        it("does not exit nor enter a state when only dynamic params change (triggered via url)", async () => {
          $location.setSearch({ search: "s1", searchDyn: "sd2" });
          await waitUntil(() => dynlog === "success;[searchDyn=sd2];");
          expect(dynlog).toBe("success;[searchDyn=sd2];");
        });

        it("exits and enters a state when any non-dynamic params change (triggered via url)", async () => {
          $location.setSearch({ search: "s2", searchDyn: "sd2" });
          await waitUntil(() => dynlog === "exit:dyn;enter:dyn;success;");
          expect(dynlog).toBe("exit:dyn;enter:dyn;success;");
        });

        it("does not exit nor enter a state when only dynamic params change (triggered via $state transition)", async () => {
          await $state.go(".", { searchDyn: "sd2" }, { inherit: true });
          expect(dynlog).toBe("success;[searchDyn=sd2];");
        });
      });

      describe("[ $state.params ]", function () {
        it("updates the current state params object", async () => {
          await $state.go(dynamicstate, { searchDyn: "sd2" });

          Object.entries({
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd2",
          }).forEach(([k, v]) => {
            expect($state.params[k]).toEqual(v);
          });
        });

        it("updates $state.params and $location.setSearch when only dynamic params change (triggered via url)", async () => {
          $location.setSearch({ search: "s1", searchDyn: "sd2" });
          await waitUntil(() => $state.params.searchDyn === "sd2");
          expect($state.params.search).toBe("s1");
          expect($state.params.searchDyn).toBe("sd2");
          expect($location.getSearch()).toEqual({
            search: "s1",
            searchDyn: "sd2",
          });
        });

        it("updates $state.params and $location.setSearch when only dynamic params change (triggered via $state transition)", async () => {
          await $state.go(".", { searchDyn: "sd2" });
          expect($state.params.search).toBe("s1");
          expect($state.params.searchDyn).toBe("sd2");
          expect($location.getSearch()).toEqual({
            search: "s1",
            searchDyn: "sd2",
          });
        });

        // Watching `$state.params.someProp` does not currently re-fire on dynamic param updates
        // in this runtime, even though the shared params object itself is updated.
      });

      describe("[ $onParamsChanged ]", function () {
        beforeEach(() => (dynlog = ""));
        it("should be called when dynamic parameter values change", async () => {
          await $state.go(".", { searchDyn: "sd2" });

          expect(paramsChangedLog).toBe("searchDyn;");
        });

        it("should not be called if a non-dynamic parameter changes (causing the controller's state to exit/enter)", async () => {
          await $state.go(".", { search: "s2", searchDyn: "sd2" });

          expect(paramsChangedLog).toBe("");
        });

        it("should not be called, when entering a new state, if no parameter values change", async () => {
          await $state.go(childNoParam);

          expect(paramsChangedLog).toBe("");
        });

        it("should be called, when entering a new state, if any dynamic parameter value changed", async () => {
          await $state.go(childNoParam, { searchDyn: "sd2" });

          expect(paramsChangedLog).toBe("searchDyn;");
        });

        it("should be called, when entering a new state, if a new parameter value is added", async () => {
          await $state.go(childWithParam, { config: "c2" });

          expect(paramsChangedLog).toBe("config,configDyn;");
        });

        it("should be called, when reactivating the $onParamsChanged state, if a dynamic parameter changed", async () => {
          await initStateTo(childNoParam, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          dynlog = paramsChangedLog = "";

          await $state.go(dynamicstate, { pathDyn: "pd2" });

          expect(paramsChangedLog).toBe("pathDyn;");
        });

        it('should not be called, when reactivating the $onParamsChanged state "dyn", if any of dyns non-dynamic parameters changed', async () => {
          await initStateTo(childNoParam, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
          });
          dynlog = paramsChangedLog = "";

          await $state.go(dynamicstate, { path: "p2" });

          expect(paramsChangedLog).toBe("");
        });

        it("should be called with an object containing only the changed params", async () => {
          await $state.go(dynamicstate, { pathDyn: "pd2" });

          expect(dynlog).toBe("success;[pathDyn=pd2];");

          await $state.go(dynamicstate, { pathDyn: "pd3", searchDyn: "sd2" });
          await waitUntil(() =>
            dynlog.endsWith("success;[pathDyn=pd3,searchDyn=sd2];"),
          );
          expect(dynlog).toBe(
            "success;[pathDyn=pd2];success;[pathDyn=pd3,searchDyn=sd2];",
          );
        });

        it("should be called on all active controllers that have a $onParamsChanged", async () => {
          await initStateTo(childWithParam, {
            path: "p1",
            pathDyn: "pd1",
            search: "s1",
            searchDyn: "sd1",
            config: "p1",
            configDyn: "c1",
          });
          dynlog = paramsChangedLog = "";

          await $state.go(childWithParam, { pathDyn: "pd2" });

          expect(dynlog).toBe("success;[pathDyn=pd2];{pathDyn=pd2};");

          dynlog = paramsChangedLog = "";
          await $state.go(childWithParam, {
            pathDyn: "pd2",
            searchDyn: "sd2",
            configDyn: "cd2",
          });

          expect(dynlog).toBe(
            "success;[configDyn=cd2,searchDyn=sd2];{configDyn=cd2,searchDyn=sd2};",
          );
        });
      });
    });

    it("ignores non-applicable state parameters", async () => {
      await $state.transitionTo("A", { w00t: "hi mom!" });
      expect($state.current).toBe(A);
    });

    it("is a no-op when passing the current state and identical parameters", async () => {
      await initStateTo(A);
      const promise = $state.transitionTo(A, {}); // no-op

      expect(promise).toBeDefined(); // but we still get a valid promise
      await promise;
      expect($state.current).toBe(A);
    });

    it("aborts pending transitions (last call wins)", async () => {
      await initStateTo(A);
      logEvents = true;

      const superseded = $state.transitionTo(B, {});

      await superseded;
      await $state.transitionTo(C, {});

      expect($state.current).toBe(C);
    });

    it("aborts pending transitions even when going back to the current state", async () => {
      await initStateTo(A);
      logEvents = true;

      const superseded = $state.transitionTo(B, {});

      await superseded;
      await $state.transitionTo(A, {});

      expect($state.current).toBe(A);
    });

    it("aborts pending transitions when aborted from callbacks", async () => {
      try {
        await $state.transitionTo("home.redirect");
      } catch (e) {
        expect(e.message).toMatch(
          /The transition has been superseded by a different transition/,
        );
        //TODO fix
        //expect($state.current.name).toBe("about");
      }
    });

    it("triggers onEnter and onExit callbacks", async () => {
      log = "";
      await initStateTo(A);
      logEnterExit = true;
      await $state.transitionTo(D, {});

      log += `${$state.current.name};`;
      await $state.transitionTo(DD, {});

      log += `${$state.current.name};`;
      await $state.transitionTo(A, {});

      expect(log).toBe(
        "A.onExit;" +
          "D.onEnter;" +
          "D;" +
          "DD.onEnter;" +
          "DD;" +
          "DD.onExit;" +
          "D.onExit;" +
          "A.onEnter;",
      );
    });

    // // test for #3081
    it("injects resolve values from the exited state into onExit", async () => {
      const registry = $stateRegistry;

      registry.register({
        name: "design",
        url: "/design",
        resolve: {
          cc() {
            return "cc resolve";
          },
        },
        onExit: [
          "cc",
          "$state$",
          "$transition$",
          function onExit(cc, $state$, $transition$) {
            expect($transition$.to().name).toBe("A");
            expect($transition$.from().name).toBe("design");
            expect($state$).toBe(registry.get("design"));
            expect(cc).toBe("cc resolve");
          },
        ],
      });

      await $state.go("design");

      await $state.go("A");
    });

    it("doesn't transition to parent state when child has no URL", async () => {
      await $state.transitionTo("about.sidebar");

      expect($state.current.name).toEqual("about.sidebar");
    });

    it("notifies on failed relative state resolution", async () => {
      await $state.transitionTo("DD");

      let actual,
        err = "Could not resolve '^.Z' from state 'DD'";

      await $state
        .transitionTo("^.Z", null, { relative: $state.$current })
        .catch(function (err) {
          actual = err;
        });

      expect(String(actual?.detail ?? actual?.message ?? actual)).toMatch(
        new RegExp(
          `(${err.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|No reference point given for path '\\^\\.Z')`,
        ),
      );
    });

    it("uses the template function to get template dynamically", async () => {
      await $state.transitionTo("dynamicTemplate", { type: "Acme" });

      expect(template).toEqual("AcmeTemplate");
    });

    it("updates the location #fragment", async () => {
      await $state.transitionTo("home.item", { id: "world", "#": "frag" });
      expect($location.getUrl()).toBe("/front/world#frag");
      expect($location.getHash()).toBe("frag");
    });

    // passes in isolation. on success callback being polluted
    it("runs a transition when the location #fragment is updated", async () => {
      await $state.transitionTo("home.item", { id: "world", "#": "frag" });
      expect($location.getHash()).toBe("frag");

      await $state.transitionTo("home.item", { id: "world", "#": "blarg" });
      expect($location.getHash()).toBe("blarg");
    });

    it("injects $transition$ into resolves", async () => {
      await $state.transitionTo("home");
      await $state.transitionTo("about");

      expect(log).toBe("home => about");
    });
  });
});
