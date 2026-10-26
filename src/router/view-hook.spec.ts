/// <reference types="jasmine" />
import { StateRuntime } from "./state/state-service.ts";
import { defined } from "../shared/test-fixtures.spec.ts";
import { dealoc } from "../shared/dom.ts";
import { Angular } from "../angular.ts";
import { waitUntil } from "../shared/test-utils.ts";

describe("view hooks", () => {
  let $state: StateRuntime,
    log = "";

  class ctrl {
    data = "DATA";
    declare cmpdata?: string;
    declare canExit?: (trans: ng.Transition) => unknown;
  }

  const component = {
    bindings: { cmpdata: "<" as const },
    template: "{{$ctrl.cmpdata}}",
  };

  beforeEach(() => {
    dealoc(defined(document.getElementById("app")));
    window.addEventListener("unhandledrejection", (event) =>
      event.preventDefault(),
    );
    window.angular = new Angular();
    window.angular
      .createModule("defaultModule", [])
      .router([
        { name: "foo", url: "/foo", component: "foo" },
        { name: "bar", url: "/bar", component: "bar" },
        { name: "baz", url: "/baz", component: "baz" },
        { name: "redirect", redirectTo: "baz" },
      ])
      .component(
        "foo",
        Object.assign({}, Object.assign(component, { controller: ctrl })),
      )
      .component("bar", Object.assign({}, component))
      .component("baz", Object.assign({}, component));

    const $injector = window.angular.bootstrap(
      defined(document.getElementById("app")),
      ["defaultModule"],
    );

    $injector.invoke([
      "$state",
      "$compile",
      "$rootScope",
      (
        _$state_: StateRuntime,
        $compile: ng.CompileService,
        $rootScope: ng.Scope,
      ) => {
        $state = _$state_;
        $compile("<div><ng-view></ng-view></div>")($rootScope.new());
      },
    ]);
  });

  async function waitForState(name: string, expectedLog?: string) {
    await waitUntil(
      () =>
        defined($state.current).name === name &&
        (expectedLog === undefined || log === expectedLog),
    );
  }

  describe("canExit", () => {
    beforeEach(() => {
      log = "";
    });

    const initial = async () => {
      $state.go("foo");
      await waitForState("foo");
      expect(log).toBe("");
      expect(defined($state.current).name).toBe("foo");
    };

    it("can cancel a transition that would exit the view's state by returning false", async () => {
      $state._defaultErrorHandler = function (): never {
        throw new Error("Unexpected invocation");
      };
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return false;
      };
      await initial();
      $state.go("bar");
      await waitForState("foo", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("foo");
    });

    it("can allow the transition by returning true", async () => {
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return true;
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("bar");
    });

    it("can allow the transition by returning nothing", async () => {
      ctrl.prototype.canExit = function () {
        log += "canexit;";
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("bar");
    });

    it("can redirect the transition", async () => {
      ctrl.prototype.canExit = function (trans: ng.Transition) {
        log += "canexit;";

        return $state.target("baz");
      };
      await initial();

      $state.go("bar");
      await waitForState("baz", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("baz");
    });

    it("can cancel the transition by returning a rejected promise", async () => {
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return false;
      };
      await initial();

      $state._defaultErrorHandler = function (): never {
        throw new Error("Unexpected invocation");
      };
      $state.go("bar");
      await waitForState("foo", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("foo");
    });

    it("can wait for a promise and then reject the transition", async () => {
      $state._defaultErrorHandler = function (): never {
        throw new Error("Unexpected invocation");
      };
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return new Promise((resolve) => {
          setTimeout(() => {
            log += "delay;";
            resolve(false);
          }, 1);
        });
      };
      await initial();

      $state.go("bar");
      await waitForState("foo", "canexit;delay;");
      expect(log).toBe("canexit;delay;");
      expect(defined($state.current).name).toBe("foo");
    });

    it("can wait for a promise and then allow the transition", async () => {
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return new Promise((resolve) => {
          setTimeout(() => {
            log += "delay;";
            resolve(undefined);
          }, 1);
        });
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;delay;");
      expect(log).toBe("canexit;delay;");
      expect(defined($state.current).name).toBe("bar");
    });

    it("has 'this' bound to the controller", async () => {
      ctrl.prototype.canExit = function () {
        log += this.data;
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "DATA");
      expect(log).toBe("DATA");
      expect(defined($state.current).name).toBe("bar");
    });

    it("receives the new Transition as the first argument", async () => {
      ctrl.prototype.canExit = function (trans: ng.Transition) {
        log += "canexit;";
        expect(trans._treeChanges).toBeDefined();
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("bar");
    });

    it("should trigger once when answered truthy even if redirected", async () => {
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return true;
      };
      await initial();

      $state.go("redirect");
      await waitForState("baz", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("baz");
    });

    it("should trigger only once if returns a redirect", async () => {
      ctrl.prototype.canExit = function () {
        log += "canexit;";

        return $state.target("bar");
      };
      await initial();

      $state.go("redirect");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect(defined($state.current).name).toBe("bar");
    });
  });
});
