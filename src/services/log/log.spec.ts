/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { dealoc } from "../../shared/dom.ts";
import {
  applyLogConfiguration,
  createLogRuntimeConfiguration,
  createLogService,
} from "./log.ts";

describe("$log", () => {
  let angular: Angular;
  let element: HTMLElement;

  beforeEach(() => {
    element = document.getElementById("app") as HTMLElement;
    element.innerHTML = "";
    angular = new Angular();
  });

  afterEach(() => {
    dealoc(element);
  });

  function bootstrap(moduleName: string): ng.LogService {
    return angular.bootstrap(element, [moduleName]).get("$log");
  }

  it("is injectable", () => {
    angular.module("default", []);

    const log = bootstrap("default");

    expect(log).toBeDefined();
    expect(typeof log.debug).toBe("function");
  });

  it("delegates errors to the console by default", () => {
    angular.module("default", []);
    const consoleError = spyOn(window.console, "error");

    bootstrap("default").error("error message");

    expect(consoleError).toHaveBeenCalledOnceWith("error message");
  });

  it("formats Error objects before logging them", () => {
    angular.module("default", []);
    const consoleError = spyOn(window.console, "error");
    const error = new Error("broken");

    error.stack = "stack trace";
    bootstrap("default").error(error);

    expect(consoleError).toHaveBeenCalledOnceWith("Error: broken\nstack trace");
  });

  it("suppresses debug logging by default", () => {
    angular.module("default", []);
    const consoleDebug = spyOn(window.console, "debug");

    bootstrap("default").debug("details");

    expect(consoleDebug).not.toHaveBeenCalled();
  });

  it("enables debug logging through typed object configuration", () => {
    angular.module("debug", []).config({ $log: { debug: true } });
    const consoleDebug = spyOn(window.console, "debug");

    bootstrap("debug").debug("details");

    expect(consoleDebug).toHaveBeenCalledOnceWith("details");
  });

  it("replaces the console implementation through typed configuration", () => {
    const customLog = jasmine.createSpy("customLog");

    angular.module("custom", []).config({
      $log: {
        logger: () => ({
          log: customLog,
          info: () => undefined,
          warn: () => undefined,
          error: () => undefined,
          debug: () => undefined,
        }),
      },
    });

    bootstrap("custom").log("configured");

    expect(customLog).toHaveBeenCalledOnceWith("configured");
  });

  it("merges partial logging configuration", () => {
    const configuration = createLogRuntimeConfiguration();
    const levels = ["warn"] as const;
    const logger = () => ({
      log: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    });

    applyLogConfiguration(configuration, {
      beacon: { url: "/logs", levels },
      debug: true,
    });
    applyLogConfiguration(configuration, { logger });

    expect(configuration).toEqual({
      beacon: { url: "/logs", levels: ["warn"] },
      debug: true,
      logger,
    });
    expect(configuration.beacon?.levels).not.toBe(levels);
  });

  it("disables inherited Beacon configuration", () => {
    const configuration = createLogRuntimeConfiguration();

    applyLogConfiguration(configuration, { beacon: { url: "/logs" } });
    applyLogConfiguration(configuration, { beacon: false });

    expect(configuration.beacon).toBeUndefined();
  });

  it("sends error entries through Beacon without replacing console output", async () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleError = jasmine.createSpy("consoleError");
    const sendBeacon = jasmine.createSpy("sendBeacon").and.returnValue(true);
    const consoleRef = {
      error: consoleError,
      log: () => undefined,
      warn: () => undefined,
    } as unknown as Console;

    applyLogConfiguration(configuration, { beacon: { url: "/logs" } });
    const log = createLogService(configuration, consoleRef, {
      now: () => Date.parse("2026-07-14T12:00:00.000Z"),
      sendBeacon,
    });
    const circular: { self?: unknown } = {};

    circular.self = circular;

    log.info("not remote");
    log.error("broken", new Error("failure"), 1n, circular);

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(sendBeacon.calls.mostRecent().args[0]).toBe("/logs");

    const body = sendBeacon.calls.mostRecent().args[1] as Blob;
    const entry = JSON.parse(await body.text()) as {
      args: unknown[];
      level: string;
      timestamp: string;
    };

    expect(body.type).toBe("application/json");
    expect(entry.level).toBe("error");
    expect(entry.timestamp).toBe("2026-07-14T12:00:00.000Z");
    expect(entry.args[0]).toBe("broken");
    expect(entry.args[1]).toContain("failure");
    expect(entry.args[2]).toBe("1");
    expect(entry.args[3]).toEqual({ self: "[Circular]" });
  });

  it("resolves a configured Beacon serializer through dependency injection", () => {
    const serialize = jasmine
      .createSpy("serialize")
      .and.callFake((entry: ng.LogEntry) => entry.level);
    const sendBeacon = spyOn(window.navigator, "sendBeacon").and.returnValue(
      true,
    );

    angular
      .module("beaconSerializer", [])
      .factory("clientLogSerializer", () => serialize)
      .config({
        $log: {
          beacon: {
            levels: ["warn"],
            serializer: "clientLogSerializer",
            url: "/client-logs",
          },
        },
      });

    bootstrap("beaconSerializer").warn("warning");

    expect(serialize).toHaveBeenCalledTimes(1);
    expect(serialize.calls.mostRecent().args[0].args).toEqual(["warning"]);
    expect(sendBeacon).toHaveBeenCalledOnceWith("/client-logs", "warn");
  });

  it("warns locally when Beacon rejects a payload", () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleWarn = jasmine.createSpy("consoleWarn");

    applyLogConfiguration(configuration, { beacon: { url: "/logs" } });
    createLogService(
      configuration,
      {
        error: () => undefined,
        log: () => undefined,
        warn: consoleWarn,
      } as unknown as Console,
      { sendBeacon: () => false },
    ).error("broken");

    expect(consoleWarn).toHaveBeenCalledWith(
      "$log Beacon delivery failed: the browser rejected the payload",
    );
  });

  it("can ignore Beacon failures", () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleWarn = jasmine.createSpy("consoleWarn");

    applyLogConfiguration(configuration, {
      beacon: { failure: "ignore", url: "/logs" },
    });
    createLogService(
      configuration,
      {
        error: () => undefined,
        log: () => undefined,
        warn: consoleWarn,
      } as unknown as Console,
      { sendBeacon: () => false },
    ).error("broken");

    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("reports an unavailable Beacon implementation only once", () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleWarn = jasmine.createSpy("consoleWarn");

    applyLogConfiguration(configuration, { beacon: { url: "/logs" } });
    const log = createLogService(configuration, {
      error: () => undefined,
      log: () => undefined,
      warn: consoleWarn,
    } as unknown as Console);

    log.error("first");
    log.error("second");

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      "$log Beacon delivery failed: navigator.sendBeacon() is unavailable",
    );
  });

  it("contains serializer failures without interrupting logging", () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleError = jasmine.createSpy("consoleError");
    const consoleWarn = jasmine.createSpy("consoleWarn");
    const failure = new Error("serializer failed");

    applyLogConfiguration(configuration, {
      beacon: { serializer: "brokenSerializer", url: "/logs" },
    });
    const log = createLogService(
      configuration,
      {
        error: consoleError,
        log: () => undefined,
        warn: consoleWarn,
      } as unknown as Console,
      {
        resolveSerializer: () => () => {
          throw failure;
        },
        sendBeacon: () => true,
      },
    );

    expect(() => log.error("broken")).not.toThrow();
    expect(consoleError).toHaveBeenCalledOnceWith("broken");
    expect(consoleWarn).toHaveBeenCalledWith(
      "$log Beacon delivery failed: serialization or queueing threw",
      jasmine.stringContaining("serializer failed"),
    );
  });

  it("composes Beacon delivery around a custom logger", () => {
    const configuration = createLogRuntimeConfiguration();
    const customError = jasmine.createSpy("customError");
    const sendBeacon = jasmine.createSpy("sendBeacon").and.returnValue(true);

    applyLogConfiguration(configuration, {
      beacon: { url: "/logs" },
      logger: () => ({
        debug: () => undefined,
        error: customError,
        info: () => undefined,
        log: () => undefined,
        warn: () => undefined,
      }),
    });
    createLogService(
      configuration,
      { log: () => undefined, warn: () => undefined } as unknown as Console,
      { sendBeacon },
    ).error("broken");

    expect(customError).toHaveBeenCalledOnceWith("broken");
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it("reports a serializer that cannot be resolved", () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleWarn = jasmine.createSpy("consoleWarn");

    applyLogConfiguration(configuration, {
      beacon: { serializer: "missingSerializer", url: "/logs" },
    });
    createLogService(
      configuration,
      {
        error: () => undefined,
        log: () => undefined,
        warn: consoleWarn,
      } as unknown as Console,
      { sendBeacon: () => true },
    ).error("broken");

    expect(consoleWarn).toHaveBeenCalledWith(
      '$log Beacon delivery failed: serializer "missingSerializer" could not be resolved',
    );
  });

  it("contains injectable serializer resolution failures", () => {
    const configuration = createLogRuntimeConfiguration();
    const consoleWarn = jasmine.createSpy("consoleWarn");
    const failure = new Error("unknown serializer");

    applyLogConfiguration(configuration, {
      beacon: { serializer: "missingSerializer", url: "/logs" },
    });
    const log = createLogService(
      configuration,
      {
        error: () => undefined,
        log: () => undefined,
        warn: consoleWarn,
      } as unknown as Console,
      {
        resolveSerializer: () => {
          throw failure;
        },
        sendBeacon: () => true,
      },
    );

    expect(() => log.error("first")).not.toThrow();
    log.error("second");

    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith(
      '$log Beacon delivery failed: serializer "missingSerializer" could not be resolved',
      jasmine.stringContaining("unknown serializer"),
    );
  });

  it("falls back to console.log when a console method is unavailable", () => {
    const fallback = jasmine.createSpy("fallback");
    const consoleRef = {
      log: fallback,
    } as unknown as Console;

    createLogService(createLogRuntimeConfiguration(), consoleRef).warn(
      "warning",
    );

    expect(fallback).toHaveBeenCalledOnceWith("warning");
  });
});
