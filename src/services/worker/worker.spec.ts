// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { SCOPE_PROXY_BIND } from "../../core/scope/scope.ts";
import {
  createWorkerRuntimeState,
  createWorkerService,
  destroyWorkerRuntimeState,
  WorkerError,
} from "./worker.ts";

describe("$worker", () => {
  let RealWorker;
  let workers;
  let log;
  let err;
  let createConnection;

  class MockWorker {
    constructor(scriptPath, options) {
      this.scriptPath = scriptPath;
      this.options = options;
      this.sent = [];
      this.terminated = false;
      this.terminateCalls = 0;
      this.onmessage = undefined;
      this.onerror = undefined;
      this.onmessageerror = undefined;
      workers.push(this);
    }

    postMessage(data, transfer) {
      this.sent.push({ data, transfer });
    }

    terminate() {
      this.terminated = true;
      this.terminateCalls++;
    }
  }

  beforeEach(() => {
    workers = [];
    log = {
      info: jasmine.createSpy("info"),
      log: jasmine.createSpy("log"),
      warn: jasmine.createSpy("warn"),
      error: jasmine.createSpy("error"),
      debug: jasmine.createSpy("debug"),
    };
    err = jasmine.createSpy("exceptionHandler");
    RealWorker = window.Worker;
    window.Worker = MockWorker;
    createConnection = createWorkerService(
      log,
      createWorkerRuntimeState(),
      () => MockWorker,
    );
  });

  afterEach(() => {
    window.Worker = RealWorker;
  });

  it("requires a script path", () => {
    expect(() => createConnection("")).toThrowError(
      "Worker script path required",
    );
  });

  it("requires restart when restart limits are configured", () => {
    expect(() =>
      createConnection("/workers/echo.js", {
        restart: false,
        restartDelay: 100,
      }),
    ).toThrowError(
      "$worker restartDelay and maxRestarts require restart: true.",
    );
    expect(workers).toEqual([]);
  });

  it("rejects malformed JavaScript worker configuration", () => {
    const invalidConfigs = [
      [null, "$worker config must be an object."],
      [{ type: "shared" }, "$worker type must be 'classic' or 'module'."],
      [
        { credentials: "credentialless" },
        "$worker credentials must be 'omit', 'same-origin', or 'include'.",
      ],
      [{ name: 1 }, "$worker name must be a string."],
      [{ decode: true }, "$worker decode must be a function."],
      [{ restart: "yes" }, "$worker restart must be a boolean."],
      [
        { restart: true, restartDelay: -1 },
        "$worker restartDelay must be a finite non-negative number.",
      ],
      [
        { restart: true, restartDelay: Infinity },
        "$worker restartDelay must be a finite non-negative number.",
      ],
      [
        { restart: true, maxRestarts: -1 },
        "$worker maxRestarts must be a non-negative integer or Infinity.",
      ],
      [
        { restart: true, maxRestarts: 1.5 },
        "$worker maxRestarts must be a non-negative integer or Infinity.",
      ],
    ];

    for (const [config, message] of invalidConfigs) {
      expect(() => createConnection("/workers/echo.js", config)).toThrowError(
        message,
      );
    }

    expect(workers).toEqual([]);
  });

  it("accepts Infinity as an explicit unlimited worker restart count", () => {
    const connection = createConnection("/workers/echo.js", {
      restart: true,
      maxRestarts: Infinity,
    });

    expect(connection.status).toBe("running");
  });

  it("creates a module worker and posts messages", () => {
    const connection = createConnection("/workers/echo.js");

    connection.post({ value: 1 });

    expect(workers.length).toBe(1);
    expect(workers[0].scriptPath).toBe("/workers/echo.js");
    expect(workers[0].options).toEqual({ type: "module" });
    expect(workers[0].sent).toEqual([{ data: { value: 1 }, transfer: [] }]);
  });

  it("accepts native worker options and transferables", () => {
    const connection = createConnection("/workers/echo.js", {
      type: "classic",
      name: "echo",
      credentials: "include",
    });
    const buffer = new ArrayBuffer(4);

    connection.post({ buffer }, [buffer]);

    expect(workers[0].options).toEqual({
      type: "classic",
      name: "echo",
      credentials: "include",
    });
    expect(workers[0].sent).toEqual([{ data: { buffer }, transfer: [buffer] }]);
  });

  it("preserves structured-clone messages by default", () => {
    const received = [];
    const connection = createConnection("/workers/echo.js");
    connection.onMessage((data, event) => received.push({ data, event }));
    const event = { data: '{"ok":true}' };

    workers[0].onmessage(event);

    expect(received).toEqual([{ data: '{"ok":true}', event }]);
    connection.terminate();
  });

  it("passes non-JSON string messages through", () => {
    const received = [];

    const connection = createConnection("/workers/echo.js");
    connection.onMessage((data) => received.push(data));

    workers[0].onmessage({ data: "plain text" });

    expect(received).toEqual(["plain text"]);
  });

  it("passes non-string messages through", () => {
    const received = [];
    const payload = { value: 2 };

    const connection = createConnection("/workers/echo.js");
    connection.onMessage((data) => received.push(data));

    workers[0].onmessage({ data: payload });

    expect(received).toEqual([payload]);
  });

  it("reports decoder errors and skips invalid messages", () => {
    const received = [];
    const errors = [];

    const connection = createConnection("/workers/echo.js", {
      decode: () => {
        throw new Error("bad transform");
      },
    });
    connection.onMessage((data) => received.push(data));
    connection.onError((error) => errors.push(error));

    workers[0].onmessage({ data: "raw" });

    expect(received).toEqual([]);
    expect(log.error).toHaveBeenCalledWith(
      "Worker message decoder failed",
      jasmine.any(Error),
    );
    expect(errors[0].code).toBe("decode");
    expect(connection.error).toBe(errors[0]);
  });

  it("passes the native message event to the decoder", () => {
    let decodedEvent;
    const connection = createConnection("/workers/echo.js", {
      decode: (data, event) => {
        decodedEvent = event;

        return data;
      },
    });
    const event = { data: "message", ports: [] };

    workers[0].onmessage(event);

    expect(decodedEvent).toBe(event);
    connection.terminate();
  });

  it("delivers undefined when the decoder returns undefined", () => {
    const received = [];
    const connection = createConnection("/workers/echo.js", {
      decode: () => undefined,
    });

    connection.onMessage((data) => received.push(data));
    workers[0].onmessage({ data: "message" });

    expect(received).toEqual([undefined]);
  });

  it("reports native message deserialization failures", () => {
    const errors = [];
    const connection = createConnection("/workers/echo.js");
    const event = new MessageEvent("messageerror", { data: "invalid" });

    connection.onError((error) => errors.push(error));
    workers[0].onmessageerror(event);

    expect(connection.status).toBe("running");
    expect(errors[0].code).toBe("message");
    expect(errors[0].event).toBe(event);
  });

  it("reports malformed AngularTS worker protocol messages", () => {
    const errors = [];
    const connection = createConnection("/workers/echo.js");

    connection.onError((error) => errors.push(error));
    workers[0].onmessage({
      data: { type: "angular-ts:worker:response", id: "missing-ok" },
    });

    expect(errors[0].code).toBe("message");
    expect(errors[0].message).toBe("Worker sent a malformed protocol message");
  });

  it("correlates typed worker requests and decodes their results", async () => {
    const connection = createConnection("/workers/echo.js", {
      decode: (data) => ({ decoded: data }),
    });
    const buffer = new ArrayBuffer(4);
    const resultPromise = connection.request(
      { operation: "calculate", buffer },
      { timeout: Infinity, transfer: [buffer] },
    );
    const request = workers[0].sent[0].data;

    expect(request).toEqual({
      type: "angular-ts:worker:request",
      id: "worker-1",
      payload: { operation: "calculate", buffer },
    });
    expect(workers[0].sent[0].transfer).toEqual([buffer]);

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:response",
        id: request.id,
        ok: true,
        result: 42,
      },
    });

    await expectAsync(resultPromise).toBeResolvedTo({ decoded: 42 });
  });

  it("ignores responses that do not match a pending request", () => {
    const connection = createConnection("/workers/echo.js");

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:response",
        id: "unknown",
        ok: true,
        result: 42,
      },
    });

    expect(connection.status).toBe("running");
    expect(connection.error).toBeUndefined();
  });

  it("rejects a correlated response when its decoder fails", async () => {
    const connection = createConnection("/workers/echo.js", {
      decode: () => {
        throw new Error("invalid response");
      },
    });
    const result = connection.request("decode", { timeout: Infinity });
    const request = workers[0].sent[0].data;

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:response",
        id: request.id,
        ok: true,
        result: "invalid",
      },
    });

    await expectAsync(result).toBeRejectedWithError(
      "Worker message decoder failed",
    );
    expect(connection.error.code).toBe("decode");
  });

  it("rejects failed, timed out, and aborted worker requests", async () => {
    jasmine.clock().install();
    const connection = createConnection("/workers/echo.js");
    const reported = [];

    connection.onError((error) => reported.push(error));
    const failed = connection.request("fail", { timeout: Infinity });
    const failedId = workers[0].sent[0].data.id;

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:response",
        id: failedId,
        ok: false,
        error: { message: "calculation failed" },
      },
    });

    await expectAsync(failed).toBeRejectedWithError("calculation failed");
    expect(reported[0].code).toBe("request");

    const timedOut = connection.request("slow", { timeout: 10 });

    jasmine.clock().tick(10);
    await expectAsync(timedOut).toBeRejectedWithError(
      "Worker request timed out after 10ms",
    );
    expect(reported[1].code).toBe("request-timeout");

    const controller = new AbortController();
    const aborted = connection.request("cancel", {
      timeout: Infinity,
      signal: controller.signal,
    });

    controller.abort("cancelled");
    await expectAsync(aborted).toBeRejectedWithError(
      "Worker request was aborted",
    );
    expect(reported.length).toBe(2);
    jasmine.clock().uninstall();
  });

  it("validates request options and rejects requests after termination", async () => {
    const connection = createConnection("/workers/echo.js");

    expect(() => connection.request("value", null)).toThrowError(
      "$worker request options must be an object.",
    );
    expect(() => connection.request("value", { timeout: -1 })).toThrowError(
      "$worker request timeout must be a non-negative number or Infinity.",
    );
    expect(() => connection.request("value", { transfer: {} })).toThrowError(
      "$worker request transfer must be an array.",
    );
    expect(() => connection.request("value", { signal: {} })).toThrowError(
      "$worker request signal must be an AbortSignal.",
    );

    connection.terminate();

    await expectAsync(connection.request("late")).toBeRejectedWithError(
      "Cannot request from a terminated Worker",
    );
  });

  it("rejects requests whose signal is already aborted", async () => {
    const connection = createConnection("/workers/echo.js");
    const controller = new AbortController();

    controller.abort("cancelled before dispatch");

    await expectAsync(
      connection.request("cancel", { signal: controller.signal }),
    ).toBeRejectedWithError("Worker request was aborted");
    expect(workers[0].sent).toEqual([]);
  });

  it("rejects pending requests when the worker terminates", async () => {
    const connection = createConnection("/workers/echo.js");
    const controller = new AbortController();
    const pending = connection.request("pending", {
      signal: controller.signal,
    });

    connection.terminate();

    await expectAsync(pending).toBeRejectedWithError(
      "Worker terminated before request completed",
    );
  });

  it("normalizes native and typed request posting failures", async () => {
    const connection = createConnection("/workers/echo.js");
    const nativeError = new Error("structured clone failed");

    workers[0].postMessage = () => {
      throw nativeError;
    };

    await expectAsync(
      connection.request("native", { timeout: Infinity }),
    ).toBeRejectedWithError("Worker request could not be posted");

    const typedError = new WorkerError("request", "typed post failure");

    workers[0].postMessage = () => {
      throw typedError;
    };

    await expectAsync(
      connection.request("typed", { timeout: Infinity }),
    ).toBeRejectedWith(typedError);
  });

  it("formats supported worker request failure payloads", async () => {
    const connection = createConnection("/workers/echo.js");
    const failures = [new Error(), "plain failure", "", undefined];
    const expected = [
      "Error",
      "plain failure",
      "Worker request failed",
      "Worker request failed",
    ];

    for (let index = 0; index < failures.length; index++) {
      const result = connection.request(index, { timeout: Infinity });
      const request = workers[0].sent[index].data;

      workers[0].onmessage({
        data: {
          type: "angular-ts:worker:response",
          id: request.id,
          ok: false,
          error: failures[index],
        },
      });

      await expectAsync(result).toBeRejectedWithError(expected[index]);
    }
  });

  it("adapts worker channels to model synchronization targets", () => {
    const connection = createConnection("/workers/model.js");
    const target = connection.model("player");
    const apply = jasmine.createSpy("apply");
    const disposeReceive = target.receive(apply);

    expect(workers[0].sent[0].data).toEqual({
      type: "angular-ts:worker:model:subscribe",
      channel: "player",
    });

    target.write(
      { score: 2 },
      { keys: ["score"], snapshotVersion: 1, origin: "game" },
    );
    expect(workers[0].sent[1].data).toEqual({
      type: "angular-ts:worker:model:update",
      channel: "player",
      snapshot: { score: 2 },
      change: { keys: ["score"], snapshotVersion: 1, origin: "game" },
    });

    workers[0].onmessage({
      data: {
        type: "angular-ts:worker:model:snapshot",
        channel: "player",
        snapshot: { score: 3 },
        options: { mode: "merge" },
      },
    });
    expect(apply).toHaveBeenCalledWith({ score: 3 }, { mode: "merge" });

    connection.restart();
    expect(workers[1].sent[0].data).toEqual({
      type: "angular-ts:worker:model:subscribe",
      channel: "player",
    });

    disposeReceive();
    target.dispose();
    workers[1].onmessage({
      data: {
        type: "angular-ts:worker:model:snapshot",
        channel: "player",
        snapshot: { score: 4 },
      },
    });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("rejects empty and disposed worker model channels", () => {
    const connection = createConnection("/workers/model.js");

    expect(() => connection.model("")).toThrowError(
      "Worker model channel must be a non-empty string.",
    );

    const target = connection.model();

    target.dispose();
    target.dispose();
    expect(() => target.receive(() => undefined)).toThrowError(
      "Cannot receive from a disposed Worker model target.",
    );
    expect(() =>
      target.write({ value: 1 }, { keys: ["value"], snapshotVersion: 1 }),
    ).not.toThrow();
  });

  it("handles worker errors and restarts when configured", () => {
    jasmine.clock().install();
    const errors = [];
    const connection = createConnection("/workers/echo.js", {
      restart: true,
      restartDelay: 10,
    });
    connection.onError((error) => errors.push(error));
    const error = new ErrorEvent("error");

    workers[0].onerror(error);

    expect(connection.status).toBe("error");
    jasmine.clock().tick(10);

    expect(errors[0].code).toBe("runtime");
    expect(errors[0].event).toBe(error);
    expect(log.info).toHaveBeenCalledWith("Worker: restarting...");
    expect(workers[0].terminated).toBeTrue();
    expect(workers.length).toBe(2);
    expect(connection.status).toBe("running");
    expect(connection.error).toBe(errors[0]);
    expect(connection.restartCount).toBe(1);

    connection.post("after restart");
    expect(workers[1].sent).toEqual([{ data: "after restart", transfer: [] }]);
    jasmine.clock().uninstall();
  });

  it("restarts manually and resets the automatic retry budget", () => {
    jasmine.clock().install();
    const connection = createConnection("/workers/echo.js", {
      restart: true,
      restartDelay: 10,
      maxRestarts: 1,
    });

    workers[0].onerror(new ErrorEvent("first"));
    connection.restart();
    jasmine.clock().tick(10);

    expect(workers.length).toBe(2);
    expect(workers[0].terminated).toBeTrue();
    expect(connection.status).toBe("running");
    expect(connection.restartCount).toBe(1);
    jasmine.clock().uninstall();
  });

  it("bounds automatic worker restarts with exponential backoff", () => {
    jasmine.clock().install();
    const connection = createConnection("/workers/echo.js", {
      restart: true,
      restartDelay: 10,
      maxRestarts: 2,
    });

    workers[0].onerror(new ErrorEvent("first"));
    jasmine.clock().tick(10);
    workers[1].onerror(new ErrorEvent("second"));
    jasmine.clock().tick(19);
    expect(workers.length).toBe(2);
    jasmine.clock().tick(1);
    expect(workers.length).toBe(3);

    workers[2].onerror(new ErrorEvent("third"));
    jasmine.clock().tick(30_000);

    expect(workers.length).toBe(3);
    expect(connection.status).toBe("error");
    expect(connection.restartCount).toBe(2);
    jasmine.clock().uninstall();
  });

  it("exposes errors and schedules scope-bound state", () => {
    const connection = createConnection("/workers/echo.js");
    const listener = jasmine.createSpy("listener");
    const schedule = jasmine.createSpy("schedule");
    const handler = {
      $id: 41,
      _destroyed: false,
      _scheduleWatchKeys: schedule,
    };
    const dispose = connection.onError(listener);
    const destroyedSchedule = jasmine.createSpy("destroyedSchedule");

    connection[SCOPE_PROXY_BIND](handler, handler);
    connection[SCOPE_PROXY_BIND](
      {
        $id: 42,
        _destroyed: true,
        _scheduleWatchKeys: destroyedSchedule,
      },
      {},
    );
    const error = new ErrorEvent("error");
    workers[0].onerror(error);

    expect(connection.status).toBe("error");
    expect(connection.error.code).toBe("runtime");
    expect(connection.error.event).toBe(error);
    expect(listener).toHaveBeenCalledWith(connection.error);
    expect(schedule).toHaveBeenCalledWith(["status", "error", "restartCount"]);
    expect(destroyedSchedule).not.toHaveBeenCalled();

    dispose();
    workers[0].onerror(new ErrorEvent("second"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not restart after termination", () => {
    const connection = createConnection("/workers/echo.js", {
      restart: true,
    });

    connection.terminate();

    expect(() => connection.restart()).toThrowError(
      "Cannot restart a terminated Worker",
    );
    expect(workers.length).toBe(1);
  });

  it("terminates idempotently and releases native handlers", () => {
    const connection = createConnection("/workers/echo.js");

    const listener = () => undefined;
    const unsubscribe = connection.onMessage(listener);

    unsubscribe();
    connection.terminate();
    connection.terminate();

    expect(workers[0].terminateCalls).toBe(1);
    expect(workers[0].onmessage).toBeNull();
    expect(workers[0].onerror).toBeNull();
    expect(workers[0].onmessageerror).toBeNull();
  });

  it("tears down worker runtime state idempotently", () => {
    const state = createWorkerRuntimeState();
    const connection = { terminate: jasmine.createSpy("terminate") };
    state.connections.add(connection);

    destroyWorkerRuntimeState(state);
    destroyWorkerRuntimeState(state);

    expect(connection.terminate).toHaveBeenCalledTimes(1);
  });

  it("does not post after termination", () => {
    const connection = createConnection("/workers/echo.js");

    connection.terminate();

    expect(() => connection.post("late")).toThrowError(
      "Cannot post to a terminated Worker",
    );
    expect(workers[0].sent).toEqual([]);
    expect(connection.status).toBe("terminated");
  });

  it("surfaces failed postMessage calls", () => {
    const connection = createConnection("/workers/echo.js");
    const error = new Error("post failed");

    workers[0].postMessage = () => {
      throw error;
    };

    expect(() => connection.post("bad")).toThrow(error);
  });

  it("provides $worker and terminates owned workers with the runtime", () => {
    const app = document.getElementById("app");
    const angular = new Angular();
    let workerService;

    dealoc(app);
    angular.bootstrap(app, []).invoke([
      "$worker",
      (_$worker_) => {
        workerService = _$worker_;
      },
    ]);

    const connection = workerService("/workers/di.js");

    expect(workers[0].scriptPath).toBe("/workers/di.js");
    expect(connection.post).toEqual(jasmine.any(Function));

    angular._composition.destroy();

    expect(workers[0].terminateCalls).toBe(1);
    expect(() => workerService("/workers/late.js")).toThrowError(
      "Cannot create a Worker after runtime teardown",
    );

    dealoc(app);
  });

  it("applies $security before creating a native worker", () => {
    const app = document.getElementById("app");
    const angular = new Angular();
    const module = angular.module("secureWorkers", []).config({
      $security: {
        fallback: "deny",
        credentials: { bearer: "token" },
      },
    });
    let workerService;

    dealoc(app);
    angular.bootstrap(app, [module.name]).invoke([
      "$worker",
      (_$worker_) => {
        workerService = _$worker_;
      },
    ]);

    expect(() => workerService("/workers/denied.js")).toThrowError(
      "Worker transport cannot attach Authorization credentials",
    );
    expect(workers).toEqual([]);

    angular._composition.destroy();
    dealoc(app);
  });

  it("uses a stable error when a worker security denial has no reason", () => {
    const app = document.getElementById("app");
    const angular = new Angular();
    const module = angular.module("deniedWorkers", []).config({
      $security: { fallback: "deny" },
    });
    let workerService;

    dealoc(app);
    angular.bootstrap(app, [module.name]).invoke([
      "$worker",
      (_$worker_) => {
        workerService = _$worker_;
      },
    ]);

    expect(() => workerService("/workers/denied.js")).toThrowError(
      "Worker creation denied by security policy",
    );
    expect(workers).toEqual([]);

    angular._composition.destroy();
    dealoc(app);
  });

  it("releases explicitly terminated workers from runtime ownership", () => {
    const app = document.getElementById("app");
    const angular = new Angular();
    let workerService;

    dealoc(app);
    angular.bootstrap(app, []).invoke([
      "$worker",
      (_$worker_) => {
        workerService = _$worker_;
      },
    ]);

    const connection = workerService("/workers/di.js");

    connection.terminate();
    angular._composition.destroy();

    expect(workers[0].terminateCalls).toBe(1);

    dealoc(app);
  });
});
