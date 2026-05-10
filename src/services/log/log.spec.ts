/// <reference types="jasmine" />
import { createInjector } from "../../core/di/injector.ts";
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";

describe("$logService", () => {
  let $logService: any,
    logProvider: any,
    el: any,
    log: any = [],
    angular: any;

  beforeEach(() => {
    el = document.getElementById("app");
    el.innerHTML = "";
    angular = new Angular();

    angular.module("default", []).config(($logProvider: any) => {
      logProvider = $logProvider;
    });
    angular.bootstrap(el, ["default"]).invoke((_$log_: any) => {
      $logService = _$log_;
    });

    window.console.error = (msg) => {
      log.push(msg);
    };
  });

  afterEach(() => {
    dealoc(el);
  });

  it("should be available as a provider", () => {
    expect(logProvider).toBeDefined();
    expect(logProvider.debug).toBeFalse();
    expect(typeof logProvider.$get).toBe("function");
  });

  it("should be injectable", () => {
    expect($logService).toBeDefined();
    expect(typeof $logService.debug).toBe("function");
  });

  it("should call console.error by default when $log.error is called", () => {
    $logService.error("error message");
    expect(log[0]).toEqual("error message");
  });

  it("can be overriden", () => {
    let called = false;

    angular.module("default2", []).config(($logProvider: any) => {
      $logProvider.setLogger(() => ({
        log: () => (called = true),
        info: () => {
          /* empty */
        },
        warn: () => {
          /* empty */
        },
        error: () => {
          /* empty */
        },
        debug: () => {
          /* empty */
        },
      }));
    });

    const $injector = createInjector(["ng", "default2"]);

    expect($injector).toBeDefined();
    $injector.get("$log").log();
    expect(called).toBeTrue();
  });
});
