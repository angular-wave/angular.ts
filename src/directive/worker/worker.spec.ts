// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { createElementFromHTML } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import { WorkerError } from "../../services/worker/worker.ts";

describe("ngWorker", () => {
  let RealWorker;
  let workers;
  let element;
  let root;
  let compile;
  let scope;
  let warn;
  let error;
  let angular;

  class MockWorker {
    constructor(scriptPath, options) {
      this.scriptPath = scriptPath;
      this.options = options;
      this.sent = [];
      this.terminated = false;
      this.onmessage = undefined;
      this.onerror = undefined;
      this.onmessageerror = undefined;
      workers.push(this);
    }

    postMessage(data) {
      this.sent.push(data);
    }

    terminate() {
      this.terminated = true;
    }
  }

  beforeEach(() => {
    RealWorker = window.Worker;
    window.Worker = MockWorker;
    workers = [];
    warn = spyOn(window.console, "warn");
    error = spyOn(window.console, "error");

    root = document.getElementById("app");
    dealoc(root);

    angular = new Angular();
    const module = angular
      .module("workerDirectiveTests", [])
      .worker("sharedWorker", "/workers/shared.js")
      .value("rejectingWorker", {
        error: undefined,
        post: () => undefined,
        requestFailures: [
          new WorkerError("request", "typed failure"),
          "plain failure",
        ],
        request() {
          return Promise.reject(this.requestFailures.shift());
        },
        onMessage: () => () => undefined,
        onError: () => () => undefined,
        terminate: () => undefined,
      });

    angular.bootstrap(root, [module.name]).invoke([
      "$compile",
      "$rootScope",
      (_$compile_, _$rootScope_) => {
        compile = _$compile_;
        scope = _$rootScope_.$new();
      },
    ]);
  });

  afterEach(() => {
    window.Worker = RealWorker;
    dealoc(element);
    dealoc(root);
    angular._composition.destroy();
  });

  function compileWorker(template) {
    element = createElementFromHTML(template);
    root.appendChild(element);
    return compile(element)(scope);
  }

  it("warns and skips setup when worker name is missing", async () => {
    compileWorker('<button ng-worker="">Run</button>');

    await wait();

    expect(warn).toHaveBeenCalledWith(
      "ngWorker: missing worker script or data-handle",
    );
    expect(workers.length).toBe(0);
  });

  it("posts evaluated params and evaluates on-result", async () => {
    scope.payload = { count: 1 };
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="payload" on-result="received = $result">Run</button>',
    );

    element.click();
    await wait();
    workers[0].onmessage({ data: { ok: true } });
    await wait();

    expect(workers[0].sent).toEqual([{ count: 1 }]);
    expect(scope.received).toEqual({ ok: true });
  });

  it("uses a named shared worker handle without owning its lifetime", async () => {
    compileWorker(
      '<button ng-worker data-handle="sharedWorker" on-result="received = $result">Run</button>',
    );

    expect(workers.length).toBe(1);
    expect(workers[0].scriptPath).toBe("/workers/shared.js");

    workers[0].onmessage({ data: { shared: true } });
    await wait();
    expect(scope.received).toEqual({ shared: true });

    scope.$destroy();
    await wait();
    expect(workers[0].terminated).toBeFalse();
  });

  it("correlates directive requests through a shared worker handle", async () => {
    compileWorker(
      '<button ng-worker data-handle="sharedWorker" data-request data-params="{ value: 2 }" on-result="received = $result">Run</button>',
    );

    element.click();
    await wait();
    const request = workers[0].sent[0];

    expect(request.type).toBe("angular-ts:worker:request");
    expect(request.payload).toEqual({ value: 2 });

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:response",
        id: request.id,
        ok: true,
        result: { value: 4 },
      },
    });
    await wait();

    expect(scope.received).toEqual({ value: 4 });
  });

  it("normalizes request failures from named worker handles", async () => {
    compileWorker(
      '<button ng-worker data-handle="rejectingWorker" data-request on-error="failures.push($error)">Run</button>',
    );
    scope.failures = [];

    element.click();
    await wait();
    element.click();
    await wait();

    expect(scope.failures.length).toBe(2);
    expect(scope.failures[0].message).toBe("typed failure");
    expect(scope.failures[1].code).toBe("request");
    expect(scope.failures[1].cause).toBe("plain failure");
  });

  it("does not report a correlated failure twice", async () => {
    compileWorker(
      '<button ng-worker data-handle="sharedWorker" data-request on-error="failureCount = (failureCount || 0) + 1">Run</button>',
    );

    element.click();
    await wait();
    const request = workers[0].sent[0];

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:response",
        id: request.id,
        ok: false,
        error: "failed",
      },
    });
    await wait();

    expect(scope.failureCount).toBe(1);
  });

  it("rejects named injectables that are not worker handles", () => {
    expect(() =>
      compileWorker('<button ng-worker data-handle="$log">Run</button>'),
    ).toThrowError(
      "ngWorker: injectable '$log' is not a WorkerHandle. Register it with module.worker().",
    );
  });

  it("queues worker messages and updates while scope is retention-paused", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="{ x: 1 }" on-result="received = $result">Run</button>',
    );

    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
    element.click();
    workers[0].onmessage({ data: { ok: true } });
    await wait();

    expect(workers[0].sent).toEqual([]);
    expect(scope.received).toBeUndefined();

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    await wait();

    expect(workers[0].sent).toEqual([{ x: 1 }]);
    expect(scope.received).toEqual({ ok: true });
  });

  it("keeps worker operations queued if the scope pauses again before flush", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="{ x: 1 }" on-result="received = $result">Run</button>',
    );

    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
    element.dispatchEvent(new Event("click"));
    workers[0].onmessage({ data: { ok: true } });

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });

    await wait();

    expect(workers[0].sent).toEqual([]);
    expect(scope.received).toBeUndefined();

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    await wait();

    expect(workers[0].sent).toEqual([{ x: 1 }]);
    expect(scope.received).toEqual({ ok: true });
  });

  it("ignores unrelated worker retention pause and resume modes", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="{ x: 1 }">Run</button>',
    );

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    scope.$broadcast("$viewRetentionPause", { _pause: "background" });
    element.dispatchEvent(new Event("click"));
    await wait();

    expect(workers[0].sent).toEqual([{ x: 1 }]);

    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
    element.dispatchEvent(new Event("click"));
    scope.$broadcast("$viewRetentionResume", { _pause: "background" });
    await wait();

    expect(workers[0].sent).toEqual([{ x: 1 }]);

    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    await wait();

    expect(workers[0].sent).toEqual([{ x: 1 }, { x: 1 }]);
  });

  it("drops queued worker operations after scope destruction", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="{ x: 1 }" on-result="received = $result">Run</button>',
    );

    scope.$broadcast("$viewRetentionPause", { _pause: "schedulers" });
    element.dispatchEvent(new Event("click"));
    workers[0].onmessage({ data: { ok: true } });
    const staleMessageHandler = workers[0].onmessage;

    scope.$destroy();
    scope.$broadcast("$viewRetentionResume", { _pause: "schedulers" });
    staleMessageHandler({ data: { ok: false } });

    await wait();

    expect(workers[0].sent).toEqual([]);
    expect(scope.received).toBeUndefined();
  });

  it("falls back to undefined params when params expression fails", async () => {
    scope.throwParams = () => {
      throw new Error("bad params");
    };
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="throwParams()">Run</button>',
    );

    element.click();
    await wait();

    expect(error).toHaveBeenCalled();
    expect(workers[0].sent).toEqual([undefined]);
  });

  it("does not post while the host is disabled", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" disabled data-params="{ ok: true }">Run</button>',
    );

    element.dispatchEvent(new Event("click"));
    await wait();

    expect(workers[0].sent).toEqual([]);
  });

  it("does not interpret worker messages as HTML", async () => {
    compileWorker('<button ng-worker="/workers/echo.js">Run</button>');

    workers[0].onmessage({ data: "<strong>Done</strong>" });
    await wait();

    expect(element.textContent).toBe("Run");
    expect(element.querySelector("strong")).toBeNull();
  });

  it("does not replace host content when on-error is absent", async () => {
    compileWorker('<button ng-worker="/workers/echo.js">Run</button>');

    workers[0].onerror(new ErrorEvent("error"));
    await wait();

    expect(error).toHaveBeenCalled();
    expect(element.textContent).toBe("Run");
  });

  it("evaluates on-error expressions", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" on-error="failed = $error.code">Run</button>',
    );

    workers[0].onerror(new ErrorEvent("error"));
    await wait();

    expect(scope.failed).toBe("runtime");
  });

  it("throttles rapid events and clears throttled attribute", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-throttle="10">Run</button>',
    );

    element.click();
    element.click();
    await wait();

    expect(workers[0].sent.length).toBe(1);
    expect(element.getAttribute("throttled")).toBe("true");

    await wait(20);

    expect(element.getAttribute("throttled")).toBe("false");
  });

  it("uses zero throttle delay when throttle is present without a numeric value", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-throttle>Run</button>',
    );

    element.dispatchEvent(new Event("click"));
    element.dispatchEvent(new Event("click"));
    await wait();

    expect(workers[0].sent.length).toBe(1);
    expect(element.getAttribute("throttled")).toBe("false");
  });

  it("dispatches load-triggered workers immediately", async () => {
    compileWorker(
      '<div ng-worker="/workers/echo.js" data-trigger="load" data-params="{ loaded: true }"></div>',
    );

    await wait();

    expect(workers[0].sent).toEqual([{ loaded: true }]);
  });

  it("uses event delay before posting to the worker", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-delay="20">Run</button>',
    );

    element.click();
    await wait(10);
    expect(workers[0].sent.length).toBe(0);

    await wait(20);
    expect(workers[0].sent.length).toBe(1);
  });

  it("uses zero delay when delay is present without a numeric value", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-delay>Run</button>',
    );

    element.dispatchEvent(new Event("click"));
    await wait();

    expect(workers[0].sent.length).toBe(1);
  });

  it("supports latch-driven dispatch on attribute changes", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-latch>Run</button>',
    );

    await wait();
    expect(workers[0].sent.length).toBe(0);

    element.setAttribute("data-latch", "enabled");

    await wait();
    expect(workers[0].sent.length).toBe(1);
  });

  it("supports interval polling and clears the interval on destroy", async () => {
    const clearSpy = spyOn(window, "clearInterval").and.callThrough();

    compileWorker(
      '<button ng-worker="/workers/echo.js" data-interval="20"></button>',
    );

    await wait(60);
    expect(workers[0].sent.length).toBeGreaterThan(0);

    scope.$destroy();
    await wait(20);

    expect(clearSpy).toHaveBeenCalled();
    expect(clearSpy.calls.first().args.length).toBe(1);
  });

  it("uses the default interval when interval is present without a numeric value", async () => {
    const setIntervalSpy = spyOn(window, "setInterval").and.callThrough();

    compileWorker(
      '<button ng-worker="/workers/echo.js" data-interval></button>',
    );

    await wait();

    expect(workers[0].sent.length).toBe(0);
    expect(setIntervalSpy).toHaveBeenCalledWith(jasmine.any(Function), 1000);

    scope.$destroy();
  });

  it("terminates worker when host scope is destroyed", async () => {
    compileWorker(
      '<button ng-worker="/workers/echo.js" data-params="{ ok: true }"></button>',
    );

    await wait();

    expect(workers[0].terminated).toBeFalse();

    scope.$destroy();
    await wait();

    expect(workers[0].terminated).toBeTrue();
  });
});
