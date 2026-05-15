// @ts-nocheck
/// <reference types="jasmine" />
import { dealoc } from "../shared/dom.ts";
import { Angular } from "../angular.ts";
import { waitUntil } from "../shared/test-utils.ts";

describe("view hooks", () => {
  let app,
    $state,
    log = "";

  class ctrl {
    constructor() {
      this.data = "DATA";
    }
  }

  const component = {
    bindings: { cmpdata: "<" },
    template: "{{$ctrl.cmpdata}}",
  };

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.addEventListener("unhandledrejection", (event) =>
      event.preventDefault(),
    );
    window.angular = new Angular();
    app = window.angular
      .module("defaultModule", [])
      .config(($stateProvider) => {
        $stateProvider.state({ name: "foo", url: "/foo", component: "foo" });
        $stateProvider.state({ name: "bar", url: "/bar", component: "bar" });
        $stateProvider.state({ name: "baz", url: "/baz", component: "baz" });
        $stateProvider.state({ name: "redirect", redirectTo: "baz" });
      })
      .component(
        "foo",
        Object.assign({}, Object.assign(component, { controller: ctrl })),
      )
      .component("bar", Object.assign({}, component))
      .component("baz", Object.assign({}, component));

    const $injector = window.angular.bootstrap(document.getElementById("app"), [
      "defaultModule",
    ]);

    $injector.invoke((_$state_, $compile, $rootScope) => {
      $state = _$state_;
      $compile("<div><ng-view></ng-view></div>")($rootScope.$new());
    });
  });

  async function waitForState(name: string, expectedLog?: string) {
    await waitUntil(
      () =>
        $state.current.name === name &&
        (expectedLog === undefined || log === expectedLog),
    );
  }

  describe("ngCanExit", () => {
    beforeEach(() => {
      log = "";
    });

    const initial = async () => {
      $state.go("foo");
      await waitForState("foo");
      expect(log).toBe("");
      expect($state.current.name).toBe("foo");
    };

    it("can cancel a transition that would exit the view's state by returning false", async () => {
      $state.defaultErrorHandler(function () {});
      ctrl.prototype.ngCanExit = function () {
        log += "canexit;";

        return false;
      };
      await initial();
      $state.go("bar");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("foo");
    });

    it("can allow the transition by returning true", async () => {
      ctrl.prototype.ngCanExit = function () {
        log += "canexit;";

        return true;
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });

    it("can allow the transition by returning nothing", async () => {
      ctrl.prototype.ngCanExit = function () {
        log += "canexit;";
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });

    it("can redirect the transition", async () => {
      ctrl.prototype.ngCanExit = function (trans) {
        log += "canexit;";

        return $state.target("baz");
      };
      await initial();

      $state.go("bar");
      await waitForState("baz", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("baz");
    });

    it("can cancel the transition by returning a rejected promise", async () => {
      ctrl.prototype.ngCanExit = function () {
        log += "canexit;";

        return false;
      };
      await initial();

      $state.defaultErrorHandler(function () {});
      $state.go("bar");
      await waitForState("foo", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("foo");
    });

    it("can wait for a promise and then reject the transition", async () => {
      $state.defaultErrorHandler(function () {});
      ctrl.prototype.ngCanExit = function () {
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
      expect($state.current.name).toBe("foo");
    });

    it("can wait for a promise and then allow the transition", async () => {
      ctrl.prototype.ngCanExit = function () {
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
      expect($state.current.name).toBe("bar");
    });

    it("has 'this' bound to the controller", async () => {
      ctrl.prototype.ngCanExit = function () {
        log += this.data;
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "DATA");
      expect(log).toBe("DATA");
      expect($state.current.name).toBe("bar");
    });

    it("receives the new Transition as the first argument", async () => {
      const _state = $state;

      ctrl.prototype.ngCanExit = function (trans) {
        log += "canexit;";
        expect(trans._treeChanges).toBeDefined();
        // expect(trans.injector().get("$state")).toBe(_state);
      };
      await initial();

      $state.go("bar");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });

    it("should trigger once when answered truthy even if redirected", async () => {
      ctrl.prototype.ngCanExit = function () {
        log += "canexit;";

        return true;
      };
      await initial();

      $state.go("redirect");
      await waitForState("baz", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("baz");
    });

    it("should trigger only once if returns a redirect", async () => {
      ctrl.prototype.ngCanExit = function () {
        log += "canexit;";

        return $state.target("bar");
      };
      await initial();

      $state.go("redirect");
      await waitForState("bar", "canexit;");
      expect(log).toBe("canexit;");
      expect($state.current.name).toBe("bar");
    });
  });
});
