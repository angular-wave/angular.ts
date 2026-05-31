// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { wait } from "../../shared/test-utils.ts";
import type { WorkflowService } from "./workflow.ts";

describe("$workflow", () => {
  let $compile: ng.CompileService;
  let $rootScope: ng.RootScopeService;
  let $workflow: WorkflowService;

  beforeEach(() => {
    window.angular = new Angular();

    const injector = createInjector(["ng"]);

    $compile = injector.get("$compile") as ng.CompileService;
    $rootScope = injector.get("$rootScope") as ng.RootScopeService;
    $workflow = injector.get("$workflow") as WorkflowService;
  });

  it("creates a reactive workflow on top of machine transitions", async () => {
    const element = $compile(
      '<section><span class="mode">{{ build.current }}</span>' +
        '<span class="status">{{ build.data.status }}</span></section>',
    )($rootScope);

    $rootScope.build = $workflow({
      id: "docs-build",
      initial: "idle",
      data: {
        status: "idle",
      },
      transitions: {
        idle: {
          start(data) {
            data.status = "running";

            return "running";
          },
        },
      },
    });

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("idle");
    expect(element.querySelector(".status")?.textContent).toBe("idle");

    $rootScope.build.send("start");

    await wait();

    expect(element.querySelector(".mode")?.textContent).toBe("running");
    expect(element.querySelector(".status")?.textContent).toBe("running");
  });

  it("runs commands through stable history and diagnostics boundaries", async () => {
    const workflow = $workflow({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
      },
      transitions: {},
      commands: {
        build({ data, input }) {
          data.output = String(input);

          return {
            ok: true,
            output: {
              file: data.output,
            },
          };
        },
        fail() {
          throw new Error("build failed");
        },
      },
    });

    const result = await workflow.run("build", "index.html");

    expect(result.ok).toBe(true);
    expect(workflow.data.output).toBe("index.html");
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.completed",
    ]);
    expect(workflow.history[1].output).toEqual({ file: "index.html" });

    const failure = await workflow.run("fail");

    expect(failure.ok).toBe(false);
    expect(failure.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "workflow.commandFailed",
        message: "build failed",
        recoverable: true,
        command: "fail",
      }),
    );
    expect(workflow.diagnostics.length).toBe(1);
    expect(workflow.history[3]).toEqual(
      jasmine.objectContaining({
        type: "command.failed",
        command: "fail",
      }),
    );
  });

  it("normalizes async command success, rejected promises, and malformed results", async () => {
    const workflow = $workflow({
      id: "agent-task",
      initial: "idle",
      data: {
        value: "",
      },
      transitions: {},
      commands: {
        async resolve({ data, input }) {
          await Promise.resolve();
          data.value = String(input);

          return {
            ok: true,
            output: {
              value: data.value,
            },
          };
        },
        async reject({ data }) {
          data.value = "partial";

          throw new Error("remote step failed");
        },
        malformed() {
          return {
            ok: "yes",
          };
        },
      },
    });

    const success = await workflow.run("resolve", "ready");

    expect(success).toEqual({
      ok: true,
      output: {
        value: "ready",
      },
      diagnostics: undefined,
    });
    expect(workflow.data.value).toBe("ready");

    const rejected = await workflow.run("reject");

    expect(rejected.ok).toBe(false);
    expect(workflow.data.value).toBe("partial");
    expect(rejected.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "workflow.commandFailed",
        message: "remote step failed",
        command: "reject",
      }),
    );

    const malformed = await workflow.run("malformed");

    expect(malformed.ok).toBe(false);
    expect(malformed.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "workflow.invalidCommandResult",
      }),
    );
  });

  it("records overlapping async command completions in resolution order", async () => {
    let resolveSlow: (() => void) | undefined;
    let resolveFast: (() => void) | undefined;
    const workflow = $workflow({
      id: "concurrent",
      initial: "idle",
      data: {
        value: "",
      },
      transitions: {},
      commands: {
        async slow({ data }) {
          await new Promise<void>((resolve) => {
            resolveSlow = resolve;
          });
          data.value = "slow";

          return {
            ok: true,
            output: "slow",
          };
        },
        async fast({ data }) {
          await new Promise<void>((resolve) => {
            resolveFast = resolve;
          });
          data.value = "fast";

          return {
            ok: true,
            output: "fast",
          };
        },
      },
    });

    const slow = workflow.run("slow");
    const fast = workflow.run("fast");

    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.started",
    ]);

    resolveFast?.();
    await fast;

    expect(workflow.data.value).toBe("fast");
    expect(workflow.history.map((entry) => entry.command)).toEqual([
      "slow",
      "fast",
      "fast",
    ]);

    resolveSlow?.();
    await slow;

    expect(workflow.data.value).toBe("slow");
    expect(workflow.history.map((entry) => entry.command)).toEqual([
      "slow",
      "fast",
      "fast",
      "slow",
    ]);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.started",
      "command.completed",
      "command.completed",
    ]);
  });

  it("rejects concurrent commands when configured", async () => {
    let resolveBuild: (() => void) | undefined;
    const workflow = $workflow({
      id: "concurrency-reject",
      concurrency: "reject",
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        async build() {
          await new Promise<void>((resolve) => {
            resolveBuild = resolve;
          });

          return {
            ok: true,
          };
        },
      },
    });

    const first = workflow.run("build");
    const second = await workflow.run("build");

    expect(second).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandRunning",
          command: "build",
        }),
      ],
    });

    resolveBuild?.();

    expect((await first).ok).toBe(true);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.failed",
      "command.completed",
    ]);
  });

  it("queues concurrent commands when configured", async () => {
    let resolveFirst: (() => void) | undefined;
    const started: string[] = [];
    const workflow = $workflow({
      id: "concurrency-queue",
      concurrency: "queue",
      initial: "idle",
      data: {
        values: [] as string[],
      },
      transitions: {},
      commands: {
        async build({ data, input }) {
          started.push(String(input));

          if (input === "first") {
            await new Promise<void>((resolve) => {
              resolveFirst = resolve;
            });
          }

          data.values.push(String(input));

          return {
            ok: true,
            output: String(input),
          };
        },
      },
    });

    const first = workflow.run("build", "first");
    const second = workflow.run("build", "second");

    await wait();

    expect(started).toEqual(["first"]);

    resolveFirst?.();

    expect((await first).ok).toBe(true);
    expect((await second).ok).toBe(true);
    expect(started).toEqual(["first", "second"]);
    expect(workflow.data.values).toEqual(["first", "second"]);
  });

  it("cancels running commands and runs registered cleanup callbacks", async () => {
    let cleaned = false;
    let signal: AbortSignal | undefined;
    const workflow = $workflow({
      id: "cancel",
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        async build({ cleanup, signal: commandSignal }) {
          signal = commandSignal;
          cleanup(() => {
            cleaned = true;
          });

          await new Promise(() => undefined);

          return {
            ok: true,
          };
        },
      },
    });

    const running = workflow.run("build");

    await wait();

    expect(workflow.cancel("build")).toBe(1);

    const result = await running;

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandCancelled",
          command: "build",
        }),
      ],
    });
    expect(signal?.aborted).toBe(true);
    expect(cleaned).toBe(true);
  });

  it("times out commands that ignore abort signals", async () => {
    const workflow = $workflow({
      id: "timeout",
      commandTimeout: 1,
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        async build() {
          await new Promise(() => undefined);

          return {
            ok: true,
          };
        },
      },
    });

    const result = await workflow.run("build");

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandTimeout",
          command: "build",
        }),
      ],
    });
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.failed",
    ]);
  });

  it("returns diagnostics for invalid runtime command options", async () => {
    const workflow = $workflow({
      id: "invalid-options",
      initial: "idle",
      data: {
        runs: 0,
      },
      transitions: {},
      commands: {
        build({ data }) {
          data.runs += 1;

          return {
            ok: true,
          };
        },
      },
    });

    const invalidConcurrency = await workflow.run("build", undefined, {
      concurrency: "drop",
    } as ng.WorkflowCommandOptions);
    const invalidTimeout = await workflow.run("build", undefined, {
      timeout: -1,
    });
    const invalidSignal = await workflow.run("build", undefined, {
      signal: {} as AbortSignal,
    });

    expect(invalidConcurrency).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.invalidCommandOptions",
          command: "build",
        }),
      ],
    });
    expect(invalidTimeout.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "workflow.invalidCommandOptions",
        command: "build",
      }),
    );
    expect(invalidSignal.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "workflow.invalidCommandOptions",
        command: "build",
      }),
    );
    expect(workflow.data.runs).toBe(0);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.failed",
      "command.failed",
      "command.failed",
    ]);
  });

  it("removes external abort listeners after command completion", async () => {
    let abortHandler: EventListener | undefined;
    let removedHandler: EventListener | undefined;
    const signal = {
      aborted: false,
      addEventListener(_type: string, handler: EventListener) {
        abortHandler = handler;
      },
      removeEventListener(_type: string, handler: EventListener) {
        removedHandler = handler;
      },
    } as AbortSignal;
    const workflow = $workflow({
      id: "abort-listener-cleanup",
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        build() {
          return {
            ok: true,
          };
        },
      },
    });

    const result = await workflow.run("build", undefined, { signal });

    expect(result.ok).toBe(true);
    expect(abortHandler).toBeDefined();
    expect(removedHandler).toBe(abortHandler);
  });

  it("restore cancels running and queued commands without polluting restored state", async () => {
    let resolveFirst: (() => void) | undefined;
    const started: string[] = [];
    const workflow = $workflow({
      id: "restore-cancels-work",
      concurrency: "queue",
      initial: "idle",
      data: {
        items: new Map<string, string>([["current", "initial"]]),
        value: "initial",
      },
      transitions: {},
      commands: {
        async build({ data, input }) {
          started.push(String(input));

          if (input === "first") {
            await new Promise<void>((resolve) => {
              resolveFirst = resolve;
            });
          }

          data.value = String(input);
          data.items.set("late", String(input));

          return {
            ok: true,
          };
        },
      },
    });
    const snapshot = workflow.snapshot();
    const first = workflow.run("build", "first");
    const second = workflow.run("build", "second");

    await wait();

    expect(started).toEqual(["first"]);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
    ]);

    workflow.restore(snapshot);

    const firstResult = await first;
    const secondResult = await second;

    resolveFirst?.();
    await wait();

    expect(firstResult).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandCancelled",
          command: "build",
        }),
      ],
    });
    expect(secondResult).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandCancelled",
          command: "build",
        }),
      ],
    });
    expect(started).toEqual(["first"]);
    expect(workflow.current).toBe("idle");
    expect(workflow.data.value).toBe("initial");
    expect(workflow.data.items.get("current")).toBe("initial");
    expect(workflow.data.items.has("late")).toBe(false);
    expect(workflow.diagnostics).toEqual([]);
    expect(workflow.history).toEqual([]);
  });

  it("bounds history with a configurable limit", async () => {
    const workflow = $workflow({
      id: "bounded-history",
      historyLimit: 3,
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        ping({ input }) {
          return {
            ok: true,
            output: input,
          };
        },
      },
    });

    await workflow.run("ping", "one");
    await workflow.run("ping", "two");
    await workflow.run("ping", "three");

    expect(workflow.history.map((entry) => entry.command)).toEqual([
      "ping",
      "ping",
      "ping",
    ]);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.completed",
      "command.started",
      "command.completed",
    ]);
    expect(workflow.history[0].output).toBe("two");
  });

  it("returns stable diagnostics for invalid or missing commands", async () => {
    const workflow = $workflow({
      id: "diagnostics",
      initial: "idle",
      data: {},
      transitions: {},
    });

    const invalid = await workflow.run("");
    const missing = await workflow.run("publish");

    expect(invalid).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.invalidCommand",
          recoverable: true,
        }),
      ],
    });
    expect(missing).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.missingCommand",
          command: "publish",
          recoverable: true,
        }),
      ],
    });
    expect(workflow.history).toEqual([
      jasmine.objectContaining({
        type: "command.failed",
        command: "publish",
      }),
    ]);
  });

  it("does not treat empty replay or cancel command names as wildcards", async () => {
    let resolveBuild: (() => void) | undefined;
    const workflow = $workflow({
      id: "empty-command-boundaries",
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        async build() {
          await new Promise<void>((resolve) => {
            resolveBuild = resolve;
          });

          return {
            ok: true,
          };
        },
      },
    });

    const running = workflow.run("build");
    const retry = await workflow.retry("");
    const repeat = await workflow.repeat("");

    expect(workflow.cancel("")).toBe(0);
    expect(retry).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.invalidCommand",
        }),
      ],
    });
    expect(repeat).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.invalidCommand",
        }),
      ],
    });

    resolveBuild?.();

    expect((await running).ok).toBe(true);
  });

  it("returns stable diagnostics for invalid transitions without throwing", () => {
    const workflow = $workflow({
      id: "transition-diagnostics",
      initial: "idle",
      data: {},
      transitions: {
        running: {
          stop() {
            return "idle";
          },
        },
      },
    });

    expect(workflow.send("stop")).toBe(false);
    expect(workflow.current).toBe("idle");
    expect(workflow.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflow.invalidTransition",
        recoverable: true,
        detail: {
          current: "idle",
          type: "stop",
          payload: undefined,
        },
      }),
    ]);
  });

  it("bounds diagnostics with a configurable limit", async () => {
    const workflow = $workflow({
      id: "bounded-diagnostics",
      diagnosticLimit: 2,
      initial: "idle",
      data: {},
      transitions: {
        idle: {},
      },
      commands: {
        fail({ input }) {
          return {
            ok: false,
            diagnostics: [
              {
                code: `docs.${String(input)}`,
                message: String(input),
              },
            ],
          };
        },
      },
    });

    await workflow.run("fail", "one");
    await workflow.run("fail", "two");
    workflow.send("missing");

    expect(workflow.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "docs.two",
      "workflow.invalidTransition",
    ]);
  });

  it("retries the latest failed command with the original input", async () => {
    let attempts = 0;
    const workflow = $workflow({
      id: "publish",
      initial: "idle",
      data: {
        file: "",
        published: false,
      },
      transitions: {},
      commands: {
        publish({ data, input }) {
          attempts += 1;
          data.file = String(input);

          if (attempts === 1) {
            throw new Error("network unavailable");
          }

          data.published = true;

          return {
            ok: true,
            output: {
              file: data.file,
            },
          };
        },
      },
    });

    const failure = await workflow.run("publish", "index.html");
    const retry = await workflow.retry();

    expect(failure.ok).toBe(false);
    expect(retry).toEqual({
      ok: true,
      output: {
        file: "index.html",
      },
      diagnostics: undefined,
    });
    expect(workflow.data.published).toBe(true);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.failed",
      "command.started",
      "command.completed",
    ]);
    expect(workflow.history[2].input).toBe("index.html");
    expect(workflow.diagnostics[0].message).toBe("network unavailable");
  });

  it("keeps public history JSON-safe while retrying live original inputs", async () => {
    let attempts = 0;
    const workflow = $workflow({
      id: "history-json",
      initial: "idle",
      data: {
        values: [] as string[],
      },
      transitions: {},
      commands: {
        publish({ data, input }) {
          attempts += 1;

          if (!(input instanceof Map)) {
            throw new Error("expected original map input");
          }

          data.values.push(String(input.get("file")));

          if (attempts === 1) {
            throw new Error("retry me");
          }

          return {
            ok: true,
            output: {
              file: input.get("file"),
              callback() {
                return "ignored";
              },
            },
          };
        },
      },
    });
    const input = new Map<string, unknown>([
      ["file", "index.html"],
      [
        "metadata",
        {
          created: new Date("2024-01-01T00:00:00.000Z"),
        },
      ],
    ]);
    input.set("self", input);

    const failure = await workflow.run("publish", input);
    const retry = await workflow.retry("publish");
    const snapshot = workflow.snapshot();

    expect(failure.ok).toBe(false);
    expect(retry.ok).toBe(true);
    expect(workflow.data.values).toEqual(["index.html", "index.html"]);
    expect(workflow.history[0].input).toEqual([
      ["file", "index.html"],
      ["metadata", { created: "2024-01-01T00:00:00.000Z" }],
      ["self", "[Circular]"],
    ]);
    expect(workflow.history[3].output).toEqual({
      file: "index.html",
      callback: "[Function]",
    });
    expect(() => JSON.stringify(workflow.history)).not.toThrow();
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  it("returns a recoverable diagnostic when there is no failed command to retry", async () => {
    const workflow = $workflow({
      id: "retry-empty",
      initial: "idle",
      data: {},
      transitions: {},
    });

    const result = await workflow.retry("publish");

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.noFailedCommand",
          command: "publish",
          recoverable: true,
        }),
      ],
    });
    expect(workflow.history).toEqual([]);
  });

  it("repeats the latest completed command with the original input", async () => {
    const workflow = $workflow({
      id: "repeat",
      initial: "idle",
      data: {
        files: [] as string[],
      },
      transitions: {},
      commands: {
        publish({ data, input }) {
          data.files.push(String(input));

          return {
            ok: true,
            output: {
              file: String(input),
            },
          };
        },
      },
    });

    const first = await workflow.run("publish", "index.html");
    const repeated = await workflow.repeat();

    expect(first.ok).toBe(true);
    expect(repeated).toEqual({
      ok: true,
      output: {
        file: "index.html",
      },
      diagnostics: undefined,
    });
    expect(workflow.data.files).toEqual(["index.html", "index.html"]);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.completed",
      "command.started",
      "command.completed",
    ]);
    expect(workflow.history[2].input).toBe("index.html");
  });

  it("returns a recoverable diagnostic when there is no completed command to repeat", async () => {
    const workflow = $workflow({
      id: "repeat-empty",
      initial: "idle",
      data: {},
      transitions: {},
    });

    const result = await workflow.repeat("publish");

    expect(result).toEqual({
      ok: false,
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.noCompletedCommand",
          command: "publish",
          recoverable: true,
        }),
      ],
    });
    expect(workflow.history).toEqual([]);
  });

  it("uses configured repair commands without deleting failure evidence", async () => {
    const workflow = $workflow({
      id: "repair",
      initial: "idle",
      data: {
        title: "",
        repaired: false,
      },
      transitions: {
        idle: {
          validate(data) {
            return data.title ? "complete" : "failed";
          },
        },
        failed: {
          reset() {
            return "idle";
          },
          complete() {
            return "complete";
          },
        },
      },
      commands: {
        validate({ workflow: currentWorkflow }) {
          currentWorkflow.send("validate");

          return currentWorkflow.matches("complete")
            ? { ok: true }
            : {
                ok: false,
                diagnostics: [
                  {
                    code: "docs.missingTitle",
                    message: "Missing title.",
                    recoverable: true,
                  },
                ],
              };
        },
        repair({ data, workflow: currentWorkflow, input }) {
          data.title = String(input);
          data.repaired = true;
          currentWorkflow.send("complete");

          return {
            ok: true,
          };
        },
      },
    });

    const failure = await workflow.run("validate");
    const reset = workflow.send("reset");
    const secondFailure = await workflow.run("validate");
    const repair = await workflow.run("repair", "Guide");

    expect(failure.ok).toBe(false);
    expect(reset).toBe(true);
    expect(secondFailure.ok).toBe(false);
    expect(repair.ok).toBe(true);
    expect(workflow.current).toBe("complete");
    expect(workflow.data).toEqual({
      title: "Guide",
      repaired: true,
    });
    expect(workflow.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "docs.missingTitle",
      }),
    );
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.failed",
      "command.started",
      "command.failed",
      "command.started",
      "command.completed",
    ]);
  });

  it("keeps diagnostics safe to serialize as JSON", async () => {
    const detail: Record<string, unknown> = {
      code: 1n,
      callback() {
        return "ignored";
      },
    };

    detail.self = detail;

    const workflow = $workflow({
      id: "serializable",
      initial: "idle",
      data: {},
      transitions: {},
      commands: {
        inspect() {
          return {
            ok: false,
            diagnostics: [
              {
                code: "docs.invalid",
                message: "Invalid docs.",
                detail,
              },
            ],
          };
        },
      },
    });

    await workflow.run("inspect");

    expect(() => JSON.stringify(workflow.diagnostics)).not.toThrow();
    expect(JSON.parse(JSON.stringify(workflow.diagnostics))[0].detail).toEqual({
      code: "1",
      callback: "[Function]",
      self: "[Circular]",
    });
  });

  it("snapshots and restores workflow JSON state", async () => {
    const workflow = $workflow({
      id: "repairable",
      initial: "idle",
      data: {
        count: 0,
      },
      transitions: {
        idle: {
          start(data) {
            data.count += 1;

            return "running";
          },
        },
      },
      commands: {
        diagnose() {
          return {
            ok: false,
            diagnostics: [
              {
                code: "docs.missingTitle",
                message: "Missing title.",
                recoverable: true,
              },
            ],
          };
        },
      },
    });

    workflow.send("start");
    await workflow.run("diagnose");

    const snapshot = workflow.snapshot();

    expect(snapshot).toEqual(
      jasmine.objectContaining({
        version: 1,
        id: "repairable",
        current: "running",
      }),
    );
    expect(snapshot.diagnostics[0].code).toBe("docs.missingTitle");

    workflow.data.count = 99;
    workflow.restore(snapshot);

    expect(workflow.current).toBe("running");
    expect(workflow.data.count).toBe(1);
    expect(workflow.diagnostics[0].code).toBe("docs.missingTitle");
  });

  it("restores failed, repaired, and complete workflow snapshots", async () => {
    const workflow = $workflow({
      id: "snapshot-cycle",
      initial: "idle",
      data: {
        title: "",
      },
      transitions: {
        idle: {
          fail() {
            return "failed";
          },
        },
        failed: {
          complete() {
            return "complete";
          },
        },
      },
      commands: {
        validate({ workflow: currentWorkflow }) {
          currentWorkflow.send("fail");

          return {
            ok: false,
            diagnostics: [
              {
                code: "docs.missingTitle",
                message: "Missing title.",
                recoverable: true,
              },
            ],
          };
        },
        repair({ data, workflow: currentWorkflow, input }) {
          data.title = String(input);
          currentWorkflow.send("complete");

          return {
            ok: true,
          };
        },
      },
    });

    await workflow.run("validate");
    const failedSnapshot = workflow.snapshot();

    await workflow.run("repair", "Guide");
    const completeSnapshot = workflow.snapshot();

    workflow.restore(failedSnapshot);

    expect(workflow.current).toBe("failed");
    expect(workflow.data.title).toBe("");
    expect(workflow.diagnostics[0].code).toBe("docs.missingTitle");

    await workflow.run("repair", "Recovered");
    const repairedSnapshot = workflow.snapshot();

    workflow.restore(completeSnapshot);

    expect(workflow.current).toBe("complete");
    expect(workflow.data.title).toBe("Guide");

    workflow.restore(repairedSnapshot);

    expect(workflow.current).toBe("complete");
    expect(workflow.data.title).toBe("Recovered");
  });

  it("rejects malformed or mismatched workflow snapshots", () => {
    const workflow = $workflow({
      id: "restore-target",
      initial: "idle",
      data: {},
      transitions: {},
    });

    expect(() =>
      workflow.restore({
        version: 2,
        id: "restore-target",
        current: "idle",
        data: {},
        diagnostics: [],
        history: [],
      }),
    ).toThrowError("$workflow restore requires a version 1 snapshot.");

    expect(() =>
      workflow.restore({
        version: 1,
        id: "other-workflow",
        current: "idle",
        data: {},
        diagnostics: [],
        history: [],
      }),
    ).toThrowError("$workflow restore snapshot id must match workflow id.");
  });

  it("migrates older workflow snapshots before restore", () => {
    const workflow = $workflow({
      id: "migrated",
      initial: "idle",
      data: {
        title: "",
      },
      transitions: {},
      migrateSnapshot(snapshot) {
        const oldSnapshot = snapshot as {
          state: string;
          title: string;
        };

        return {
          version: 1,
          id: "migrated",
          current: oldSnapshot.state,
          data: {
            title: oldSnapshot.title,
          },
          diagnostics: [],
          history: [],
        };
      },
    });

    workflow.restore({
      version: 0,
      state: "complete",
      title: "Guide",
    });

    expect(workflow.current).toBe("complete");
    expect(workflow.data.title).toBe("Guide");
  });

  it("normalizes restored diagnostics and history entries", async () => {
    const circularInput: Record<string, unknown> = {
      file: "index.html",
    };

    circularInput.self = circularInput;

    const workflow = $workflow({
      id: "restore-normalized",
      initial: "idle",
      data: {
        value: "",
      },
      transitions: {},
      commands: {
        publish({ data, input }) {
          data.value = String(input);

          return {
            ok: true,
            output: {
              file: data.value,
            },
          };
        },
      },
    });

    workflow.restore({
      version: 1,
      id: "restore-normalized",
      current: "idle",
      data: {
        value: "",
      },
      diagnostics: [
        {
          code: 7,
          message: null,
          detail: {
            value: 1n,
            callback() {
              return "ignored";
            },
          },
        },
        "plain failure",
      ],
      history: [
        {
          id: "bad",
          type: "unknown",
          command: "",
          input: circularInput,
          output: new Set(["created"]),
          diagnostics: ["bad history"],
        },
        {
          id: 4,
          type: "command.completed",
          command: "publish",
          input: "restored.html",
        },
        {
          id: 4,
          type: "command.failed",
          command: "duplicate",
        },
        {
          id: 4.5,
          type: "command.failed",
          command: "fractional",
        },
      ],
    });

    const repeat = await workflow.repeat("publish");

    expect(workflow.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflow.diagnostic",
        message: "Workflow diagnostic.",
        detail: {
          value: "1",
          callback: "[Function]",
        },
      }),
      jasmine.objectContaining({
        code: "workflow.diagnostic",
        message: "plain failure",
        recoverable: true,
      }),
    ]);
    expect(workflow.history[0]).toEqual(
      jasmine.objectContaining({
        id: 1,
        type: "command.failed",
        command: "unknown",
        input: {
          file: "index.html",
          self: "[Circular]",
        },
        output: ["created"],
        diagnostics: [
          jasmine.objectContaining({
            message: "bad history",
          }),
        ],
      }),
    );
    expect(workflow.history[1]).toEqual(
      jasmine.objectContaining({
        id: 4,
        type: "command.completed",
        command: "publish",
        input: "restored.html",
      }),
    );
    expect(workflow.history[2]).toEqual(
      jasmine.objectContaining({
        id: 5,
        type: "command.failed",
        command: "duplicate",
      }),
    );
    expect(workflow.history[3]).toEqual(
      jasmine.objectContaining({
        id: 6,
        type: "command.failed",
        command: "fractional",
      }),
    );
    expect(repeat.ok).toBe(true);
    expect(workflow.data.value).toBe("restored.html");
    expect(workflow.history[4].id).toBe(7);
    expect(workflow.history[5].id).toBe(8);
  });

  it("registers named workflows as singleton injectables", async () => {
    window.angular.module("workflowNamedApp", ["ng"]).workflow("docsWorkflow", {
      id: "docs",
      initial: "idle",
      data: {
        runs: 0,
      },
      transitions: {
        idle: {
          start(data) {
            data.runs += 1;

            return "running";
          },
        },
      },
    });

    const injector = createInjector(["workflowNamedApp"]);
    const first = injector.get("docsWorkflow");
    const second = injector.get("docsWorkflow");

    expect(first).toBe(second);
    expect(first.send("start")).toBe(true);
    expect(second.current).toBe("running");
    expect(second.data.runs).toBe(1);
  });

  it("keeps named workflows alive after one observing directive scope is destroyed", async () => {
    const directiveScopes: ng.Scope[] = [];

    window.angular = new Angular();
    window.angular
      .module("workflowDirectiveApp", ["ng"])
      .workflow("sessionWorkflow", {
        id: "session",
        initial: "setup",
        data: {
          status: "idle",
        },
        transitions: {
          setup: {
            wait(data) {
              data.status = "waiting";

              return "waiting";
            },
          },
        },
      })
      .directive("workflowPanel", () => ({
        scope: true,
        template:
          '<span class="mode">{{ session.current }}</span>' +
          '<span class="status">{{ session.data.status }}</span>',
        link(scope: ng.Scope) {
          directiveScopes.push(scope);
          scope.session.matches("setup");
        },
      }));

    const injector = createInjector(["workflowDirectiveApp"]);
    const compile = injector.get("$compile") as ng.CompileService;
    const workflow = injector.get("sessionWorkflow") as ng.Workflow<{
      status: string;
    }>;
    const rootScope = injector.get("$rootScope") as ng.RootScopeService;

    rootScope.session = workflow;

    const element = compile(
      '<section><workflow-panel class="first" session="session"></workflow-panel>' +
        '<workflow-panel class="second" session="session"></workflow-panel></section>',
    )(rootScope);

    await wait();

    expect(directiveScopes.length).toBe(2);
    expect(element.querySelector(".first .status")?.textContent).toBe("idle");
    expect(element.querySelector(".second .status")?.textContent).toBe("idle");

    directiveScopes[0].$destroy();

    workflow.send("wait");

    await wait();

    expect(workflow.current).toBe("waiting");
    expect(element.querySelector(".second .mode")?.textContent).toBe("waiting");
    expect(element.querySelector(".second .status")?.textContent).toBe(
      "waiting",
    );
  });

  describe("documentation examples", () => {
    it("runs the create workflow example", async () => {
      const build = $workflow({
        id: "docs-build",
        initial: "idle",
        data: {
          status: "idle",
          output: "",
        },
        transitions: {
          idle: {
            start(data) {
              data.status = "running";

              return "running";
            },
          },
          running: {
            complete(data, output) {
              data.status = "complete";
              data.output = output;

              return "complete";
            },
            fail(data, reason) {
              data.status = reason;

              return "failed";
            },
          },
        },
        commands: {
          build({ workflow, data, input }) {
            workflow.send("start");
            data.output = String(input);
            workflow.send("complete", data.output);

            return {
              ok: true,
              output: {
                file: data.output,
              },
            };
          },
        },
      });

      const result = await build.run("build", "index.html");

      expect(result).toEqual({
        ok: true,
        output: {
          file: "index.html",
        },
        diagnostics: undefined,
      });
      expect(build.current).toBe("complete");
      expect(build.data).toEqual({
        status: "complete",
        output: "index.html",
      });
    });

    it("runs the named injectable workflow example", () => {
      window.angular
        .module("workflowDocsNamedApp", ["ng"])
        .workflow("docsWorkflow", {
          id: "docs",
          initial: "idle",
          data: {
            runs: 0,
          },
          transitions: {
            idle: {
              start(data) {
                data.runs += 1;

                return "running";
              },
            },
          },
        });

      const injector = createInjector(["workflowDocsNamedApp"]);
      const docsWorkflow = injector.get("docsWorkflow");

      expect(docsWorkflow.send("start")).toBe(true);
      expect(docsWorkflow.current).toBe("running");
      expect(docsWorkflow.data.runs).toBe(1);
    });

    it("runs the command diagnostics example", async () => {
      const workflow = $workflow({
        id: "diagnostics-example",
        initial: "idle",
        data: {},
        transitions: {},
        commands: {
          publish() {
            return {
              ok: false,
              diagnostics: [
                {
                  code: "docs.publishFailed",
                  message: "Publish failed.",
                  recoverable: true,
                },
              ],
            };
          },
        },
      });

      const result = await workflow.run("publish", "index.html");

      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toEqual(
        jasmine.objectContaining({
          code: "docs.publishFailed",
          message: "Publish failed.",
        }),
      );
      expect(JSON.stringify(workflow.diagnostics)).toBe(
        '[{"code":"docs.publishFailed","message":"Publish failed.","recoverable":true}]',
      );
    });

    it("runs the snapshot and restore example", async () => {
      const key = "docsWorkflow";
      const workflow = $workflow({
        id: "docs-build",
        initial: "idle",
        data: {
          title: "",
        },
        transitions: {
          idle: {
            fail() {
              return "failed";
            },
          },
        },
        commands: {
          validate({ workflow: currentWorkflow }) {
            currentWorkflow.send("fail");

            return {
              ok: false,
              diagnostics: [
                {
                  code: "docs.missingTitle",
                  message: "Missing title.",
                  recoverable: true,
                },
              ],
            };
          },
        },
      });

      try {
        await workflow.run("validate");

        const snapshot = workflow.snapshot();

        localStorage.setItem(key, JSON.stringify(snapshot));

        const restored = JSON.parse(localStorage.getItem(key) ?? "null");

        workflow.data.title = "mutated";
        workflow.restore(restored);

        expect(workflow.current).toBe("failed");
        expect(workflow.data.title).toBe("");
        expect(workflow.diagnostics[0].code).toBe("docs.missingTitle");
      } finally {
        localStorage.removeItem(key);
      }
    });

    it("runs the retry and repeat examples", async () => {
      let attempts = 0;
      const workflow = $workflow({
        id: "retry-repeat",
        initial: "idle",
        data: {
          files: [] as string[],
        },
        transitions: {},
        commands: {
          publish({ data, input }) {
            attempts += 1;

            if (attempts === 1) {
              throw new Error("offline");
            }

            data.files.push(String(input));

            return {
              ok: true,
              output: {
                file: String(input),
              },
            };
          },
        },
      });

      await workflow.run("publish", "index.html");

      const retryResult = await workflow.retry("publish");
      const repeatResult = await workflow.repeat("publish");

      expect(retryResult.ok).toBe(true);
      expect(repeatResult.ok).toBe(true);
      expect(workflow.data.files).toEqual(["index.html", "index.html"]);
    });

    it("runs the repair command example", async () => {
      const workflow = $workflow({
        id: "repairable-docs",
        initial: "idle",
        data: {
          title: "",
        },
        transitions: {
          idle: {
            validate(data) {
              return data.title ? "complete" : "failed";
            },
          },
          failed: {
            complete() {
              return "complete";
            },
          },
        },
        commands: {
          validate({ workflow: currentWorkflow }) {
            currentWorkflow.send("validate");

            return currentWorkflow.matches("complete")
              ? { ok: true }
              : {
                  ok: false,
                  diagnostics: [
                    {
                      code: "docs.missingTitle",
                      message: "Missing title.",
                      recoverable: true,
                    },
                  ],
                };
          },
          repair({ workflow: currentWorkflow, data, input }) {
            data.title = String(input);
            currentWorkflow.send("complete");

            return {
              ok: true,
            };
          },
        },
      });

      const validation = await workflow.run("validate");
      const repair = await workflow.run("repair", "Guide");

      expect(validation.ok).toBe(false);
      expect(repair.ok).toBe(true);
      expect(workflow.current).toBe("complete");
      expect(workflow.data.title).toBe("Guide");
      expect(workflow.diagnostics[0].code).toBe("docs.missingTitle");
    });
  });
});
