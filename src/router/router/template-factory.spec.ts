/// <reference types="jasmine" />
import { dealoc } from "../../shared/dom.ts";
import { Angular } from "../../angular.ts";
import { Rejection, RejectType } from "../transition/reject-factory.ts";
import { waitUntil } from "../../shared/test-utils.ts";
import type { StateRuntime } from "../state/state-service.ts";

describe("templateFactory", () => {
  let $injector: any,
    templateFactory: any,
    $scope: any,
    $compile: any,
    $stateRegistry: any,
    $stateService: any,
    error;

  beforeEach(() => {
    dealoc(document.getElementById("app"));
    window.angular = new Angular();
    window.angular
      .createModule("defaultModule", [])
      .decorator("$exceptionHandler", () => {
        return (exception: any) => {
          error = exception.message;
        };
      });
    $injector = window.angular.bootstrap(document.getElementById("app")!, [
      "defaultModule",
    ]);
    $injector.invoke([
      "$state",

      "$rootScope",
      (_$state_: any, $rootScope: any) => {
        templateFactory = _$state_._viewService._templateFactory;

        $scope = $rootScope;
      },
    ]);
  });

  it("is owned by the state runtime", () => {
    expect(templateFactory).toBeDefined();
  });

  describe("template URL behavior", () => {
    it("fetches relative URLs correctly", async () => {
      const res = await templateFactory._fromUrl("/mock/hello");

      expect(await res).toEqual("Hello");
    });

    it("rejects external template URLs before fetching", async () => {
      const url = "http://evil.com/views/view.html";
      const fetch = spyOn(window, "fetch").and.resolveTo(
        new Response("Cross-domain template"),
      );

      await expectAsync(templateFactory._fromUrl(url)).toBeRejectedWithError(
        /insecurl/,
      );
      expect(fetch).not.toHaveBeenCalled();
    });

    it("loads external template URLs approved by compiler policy", async () => {
      const url = "http://example.com/trusted.html";
      const fetch = spyOn(window, "fetch").and.resolveTo(
        new Response("Trusted template"),
      );
      window.angular.createModule("externalTemplates", []).config({
        $compile: {
          resourceUrlPolicy: (value) => {
            if (value !== url) throw new Error("Resource denied");
            return value;
          },
        },
      });
      const state = window.angular
        .injector(["ng", "externalTemplates"])
        .get("$state") as unknown as StateRuntime;
      templateFactory = state._viewService._templateFactory;

      const templateData = await templateFactory._fromUrl(url);

      expect(fetch).toHaveBeenCalledWith(url, jasmine.any(Object));
      expect(templateData).toBe("Trusted template");
    });
  });

  describe("transition template cancellation", () => {
    it("supersedes a waiting route without aborting another template consumer", async () => {
      const state = $injector.get("$state");
      const registry = $injector.get("$stateRegistry");
      const templateRequest = $injector.get("$templateRequest");
      registry.register({ name: "slow", templateUrl: "/shared-route.html" });
      registry.register({ name: "fast", template: "Fast" });
      const download = Promise.withResolvers<Response>();
      const fetchSpy = spyOn(window, "fetch").and.returnValue(download.promise);
      const independent = templateRequest("/shared-route.html");
      const load = spyOn(templateFactory, "_fromConfig").and.callThrough();
      const oldRoute = state.go("slow");
      const rejected = oldRoute.catch((error: Rejection) => error);
      await waitUntil(() => load.calls.count() > 0);
      await state.go("fast");
      const error = await rejected;
      expect(error.type).toBe(RejectType._SUPERSEDED);
      expect(
        (fetchSpy.calls.first().args[1]!.signal as AbortSignal).aborted,
      ).toBeFalse();
      download.resolve(new Response("Shared"));
      await expectAsync(independent).toBeResolvedTo("Shared");
      expect(state.current.name).toBe("fast");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it("aborts the transport when its only route consumer aborts", async () => {
      const state = $injector.get("$state");
      const registry = $injector.get("$stateRegistry");
      registry.register({
        name: "abortable",
        templateUrl: "/abort-route.html",
      });
      let signal: AbortSignal | undefined;
      spyOn(window, "fetch").and.callFake(
        (_url, config) =>
          new Promise((_resolve, reject) => {
            signal = config!.signal as AbortSignal;
            signal.addEventListener("abort", () => reject(signal!.reason), {
              once: true,
            });
          }),
      );
      const route = state.go("abortable");
      const rejected = route.catch((error: Rejection) => error);
      await waitUntil(() => signal !== undefined);
      $scope.pendingTransition = route.transition;
      $scope.pendingTransition.abort();
      const error = await rejected;
      expect(error.type).toBe(RejectType._ABORTED);
      expect(signal!.aborted).toBeTrue();
      expect(state.current.name).not.toBe("abortable");
    });
  });

  describe("component template builder", () => {
    let el: any;

    beforeEach(() => {
      dealoc(document.getElementById("app"));
      const mod = window.angular.createModule("defaultModule", []);

      mod.component("myComponent", { template: "hi" });
      $injector = window.angular.bootstrap(document.getElementById("app")!, [
        "defaultModule",
      ]);
      $injector.invoke([
        "$rootScope",
        "$stateRegistry",
        "$state",
        "$compile",
        (
          $rootScope: any,
          _$stateRegistry_: any,
          _$state_: any,
          _$compile_: any,
        ) => {
          templateFactory = _$state_._viewService._templateFactory;

          $scope = $rootScope;
          $stateRegistry = _$stateRegistry_;
          $stateService = _$state_;
          $compile = _$compile_;
        },
      ]);
      el = $compile("<div><ng-view></ng-view></div>")($scope.new());
    });

    it("should not prefix the components dom element with anything", async () => {
      $stateRegistry.register({ name: "cmp", component: "myComponent" });
      $stateService.go("cmp");
      await waitUntil(() => /\<my-component/.test(el.innerHTML));
      expect(el.innerHTML).toMatch(/\<my-component/);
    });
  });
});
