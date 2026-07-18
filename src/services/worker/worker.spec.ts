// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import {
  createWorkerConnection,
  createWorkerRuntimeState,
  destroyWorkerRuntimeState,
} from "./worker.ts";

describe("$worker", () => {
  let RealWorker;
  let workers;
  let log;
  let err;

  class MockWorker {
    constructor(scriptPath, options) {
      this.scriptPath = scriptPath;
      this.options = options;
      this.sent = [];
      this.terminated = false;
      this.terminateCalls = 0;
      this.onmessage = undefined;
      this.onerror = undefined;
      workers.push(this);
    }

    postMessage(data) {
      this.sent.push(data);
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
  });

  afterEach(() => {
    window.Worker = RealWorker;
  });

  it("requires a script path", () => {
    expect(() => createWorkerConnection("")).toThrowError(
      "Worker script path required",
    );
  });

  it("creates a module worker and posts messages", () => {
    const connection = createWorkerConnection("/workers/echo.js");

    connection.postMessage({ value: 1 });

    expect(workers.length).toBe(1);
    expect(workers[0].scriptPath).toBe("/workers/echo.js");
    expect(workers[0].options).toEqual({ type: "module" });
    expect(workers[0].sent).toEqual([{ value: 1 }]);
  });

  it("parses JSON string messages by default", () => {
    const received = [];
    const connection = createWorkerConnection("/workers/echo.js", {
      onMessage: (data, event) => received.push({ data, event }),
    });
    const event = { data: '{"ok":true}' };

    workers[0].onmessage(event);

    expect(received).toEqual([{ data: { ok: true }, event }]);
    connection.terminate();
  });

  it("passes non-JSON string messages through", () => {
    const received = [];

    createWorkerConnection("/workers/echo.js", {
      onMessage: (data) => received.push(data),
    });

    workers[0].onmessage({ data: "plain text" });

    expect(received).toEqual(["plain text"]);
  });

  it("passes non-string messages through", () => {
    const received = [];
    const payload = { value: 2 };

    createWorkerConnection("/workers/echo.js", {
      onMessage: (data) => received.push(data),
    });

    workers[0].onmessage({ data: payload });

    expect(received).toEqual([payload]);
  });

  it("swallows transform errors and delivers the original data", () => {
    const received = [];

    createWorkerConnection("/workers/echo.js", {
      transformMessage: () => {
        throw new Error("bad transform");
      },
      onMessage: (data) => received.push(data),
    });

    workers[0].onmessage({ data: "raw" });

    expect(received).toEqual(["raw"]);
  });

  it("handles worker errors and restarts when configured", () => {
    const errors = [];
    spyOn(console, "info");
    const connection = createWorkerConnection("/workers/echo.js", {
      autoRestart: true,
      onError: (error) => errors.push(error),
    });
    const error = new ErrorEvent("error");

    workers[0].onerror(error);

    expect(errors).toEqual([error]);
    expect(console.info).toHaveBeenCalledWith("Worker: restarting...");
    expect(workers[0].terminated).toBeTrue();
    expect(workers.length).toBe(2);

    connection.postMessage("after restart");
    expect(workers[1].sent).toEqual(["after restart"]);
  });

  it("does not restart after termination", () => {
    spyOn(console, "warn");
    const connection = createWorkerConnection("/workers/echo.js", {
      autoRestart: true,
    });

    connection.terminate();
    connection.restart();

    expect(console.warn).toHaveBeenCalledWith(
      "Worker cannot restart after terminate",
    );
    expect(workers.length).toBe(1);
  });

  it("terminates idempotently and releases native handlers", () => {
    const connection = createWorkerConnection("/workers/echo.js");

    const listener = () => undefined;
    const unsubscribe = connection.onMessage(listener);

    unsubscribe();
    connection.terminate();
    connection.terminate();

    expect(workers[0].terminateCalls).toBe(1);
    expect(workers[0].onmessage).toBeNull();
    expect(workers[0].onerror).toBeNull();
  });

  it("tears down worker runtime state idempotently", () => {
    const state = createWorkerRuntimeState();
    const connection = { terminate: jasmine.createSpy("terminate") };
    state.connections.add(connection);

    destroyWorkerRuntimeState(state);
    destroyWorkerRuntimeState(state);

    expect(connection.terminate).toHaveBeenCalledTimes(1);
  });

  it("warns but still attempts to post after termination", () => {
    spyOn(console, "warn");
    const connection = createWorkerConnection("/workers/echo.js");

    connection.terminate();
    connection.postMessage("late");

    expect(console.warn).toHaveBeenCalledWith("Worker already terminated");
    expect(workers[0].sent).toEqual(["late"]);
  });

  it("logs failed postMessage calls", () => {
    spyOn(console, "log");
    const connection = createWorkerConnection("/workers/echo.js");
    const error = new Error("post failed");

    workers[0].postMessage = () => {
      throw error;
    };

    connection.postMessage("bad");

    expect(console.log).toHaveBeenCalledWith("Worker post failed", error);
  });

  it("provides $worker and terminates owned workers with the runtime", () => {
    const app = document.getElementById("app");
    const angular = new Angular();
    let workerService;

    dealoc(app);
    angular.bootstrap(app, []).invoke((_$worker_) => {
      workerService = _$worker_;
    });

    const connection = workerService("/workers/di.js");

    expect(workers[0].scriptPath).toBe("/workers/di.js");
    expect(connection.postMessage).toEqual(jasmine.any(Function));

    angular._composition.destroy();

    expect(workers[0].terminateCalls).toBe(1);
    expect(() => workerService("/workers/late.js")).toThrowError(
      "Cannot create a Worker after runtime teardown",
    );

    dealoc(app);
  });

  it("releases explicitly terminated workers from runtime ownership", () => {
    const app = document.getElementById("app");
    const angular = new Angular();
    let workerService;

    dealoc(app);
    angular.bootstrap(app, []).invoke((_$worker_) => {
      workerService = _$worker_;
    });

    const connection = workerService("/workers/di.js");

    connection.terminate();
    angular._composition.destroy();

    expect(workers[0].terminateCalls).toBe(1);

    dealoc(app);
  });
});
