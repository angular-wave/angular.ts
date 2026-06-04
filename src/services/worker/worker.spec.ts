// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import { createWorkerConnection } from "./worker.ts";

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
      this.onmessage = undefined;
      this.onerror = undefined;
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
    const connection = createWorkerConnection("/workers/echo.js", {
      logger: log,
    });

    connection.post({ value: 1 });

    expect(workers.length).toBe(1);
    expect(workers[0].scriptPath).toBe("/workers/echo.js");
    expect(workers[0].options).toEqual({ type: "module" });
    expect(workers[0].sent).toEqual([{ value: 1 }]);
  });

  it("parses JSON string messages by default", () => {
    const received = [];
    const connection = createWorkerConnection("/workers/echo.js", {
      logger: log,
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
      logger: log,
      onMessage: (data) => received.push(data),
    });

    workers[0].onmessage({ data: "plain text" });

    expect(received).toEqual(["plain text"]);
  });

  it("passes non-string messages through", () => {
    const received = [];
    const payload = { value: 2 };

    createWorkerConnection("/workers/echo.js", {
      logger: log,
      onMessage: (data) => received.push(data),
    });

    workers[0].onmessage({ data: payload });

    expect(received).toEqual([payload]);
  });

  it("swallows transform errors and delivers the original data", () => {
    const received = [];

    createWorkerConnection("/workers/echo.js", {
      logger: log,
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
    const connection = createWorkerConnection("/workers/echo.js", {
      logger: log,
      autoRestart: true,
      onError: (error) => errors.push(error),
    });
    const error = new ErrorEvent("error");

    workers[0].onerror(error);

    expect(errors).toEqual([error]);
    expect(log.info).toHaveBeenCalledWith("Worker: restarting...");
    expect(workers[0].terminated).toBeTrue();
    expect(workers.length).toBe(2);

    connection.post("after restart");
    expect(workers[1].sent).toEqual(["after restart"]);
  });

  it("does not restart after termination", () => {
    const connection = createWorkerConnection("/workers/echo.js", {
      logger: log,
      autoRestart: true,
    });

    connection.terminate();
    connection.restart();

    expect(log.warn).toHaveBeenCalledWith(
      "Worker cannot restart after terminate",
    );
    expect(workers.length).toBe(1);
  });

  it("warns but still attempts to post after termination", () => {
    const connection = createWorkerConnection("/workers/echo.js", {
      logger: log,
    });

    connection.terminate();
    connection.post("late");

    expect(log.warn).toHaveBeenCalledWith("Worker already terminated");
    expect(workers[0].sent).toEqual(["late"]);
  });

  it("logs failed postMessage calls", () => {
    const connection = createWorkerConnection("/workers/echo.js", {
      logger: log,
    });
    const error = new Error("post failed");

    workers[0].postMessage = () => {
      throw error;
    };

    connection.post("bad");

    expect(log.log).toHaveBeenCalledWith("Worker post failed", error);
  });

  it("provides $worker through Angular dependency injection", () => {
    const app = document.getElementById("app");
    let workerService;

    dealoc(app);
    new Angular().bootstrap(app, []).invoke((_$worker_) => {
      workerService = _$worker_;
    });

    const connection = workerService("/workers/di.js", { logger: log });

    expect(workers[0].scriptPath).toBe("/workers/di.js");
    expect(connection.config.logger).toBe(log);

    dealoc(app);
  });
});
