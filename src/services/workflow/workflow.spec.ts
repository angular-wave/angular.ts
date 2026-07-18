// @ts-nocheck
/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import {
  getCompiledFragmentRecord,
  scheduleCompiledFragmentDomWork,
} from "../../core/compile/incremental-fragment.ts";
import { createInjector } from "../../core/di/injector.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  createWorkflowService,
  createWorkflowSupervisor,
  defineWorkflow,
} from "./workflow.ts";
import {
  createWorkflowWorkerClient,
  createWorkflowWorkerHost,
} from "./worker-adapter.ts";
import { createWorkflowUiFragmentHost } from "./workflow-ui-fragment.ts";

function command(overrides = {}) {
  return {
    from: "idle",
    pending: "running",
    execute: ({ input }) => input,
    success: "complete",
    failure: "failed",
    ...overrides,
  };
}

function workflowConfig(id = "build", overrides = {}) {
  return {
    id,
    initial: "idle",
    data: { output: "", attempts: 0 },
    commands: {
      build: command({
        execute: ({ input }) => String(input),
        success: {
          to: "complete",
          update({ data, output }) {
            data.output = output;
          },
        },
      }),
    },
    ...overrides,
  };
}

function createWorkflowWorkerTestConnection(host) {
  const listeners = new Set();
  const dispatch = (data) => {
    const event = { data };

    for (const listener of listeners) listener(data, event);
  };

  return {
    dispatch,
    post(data) {
      void host.handle(data, dispatch);
    },
    onMessage(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    restart() {},
    terminate() {},
  };
}

function deleteIndexedDbDatabase(database) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(database);

    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB delete failed."));
    request.onblocked = () => resolve();
  });
}

describe("$workflow", () => {
  let $compile;
  let $rootScope;
  let $workflow;

  beforeEach(() => {
    window.angular = new Angular();

    const injector = createInjector(["ng"]);

    $compile = injector.get("$compile");
    $rootScope = injector.get("$rootScope");
    $workflow = injector.get("$workflow");
  });

  it("creates declarative workflows and preserves definition identity", () => {
    const definition = workflowConfig();

    expect(defineWorkflow(definition)).toBe(definition);
    expect(createWorkflowService()(definition).state).toBe("idle");
    expect(
      defineWorkflow({
        id: "empty-data",
        initial: "idle",
        commands: {
          reset: command({ execute: undefined }),
        },
      }).data,
    ).toEqual({});
  });

  it("owns pending, success, and data update lifecycles", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const workflow = $workflow(
      workflowConfig("publish", {
        commands: {
          publish: command({
            async execute({ input, signal }) {
              expect(signal.aborted).toBeFalse();
              await gate;

              return { file: input };
            },
            success: {
              to: "complete",
              update({ data, output, command: name, input }) {
                data.output = output.file;
                expect(name).toBe("publish");
                expect(input).toBe("index.html");
              },
            },
          }),
        },
      }),
    );

    expect(workflow.can("publish")).toBeTrue();

    const running = workflow.run("publish", "index.html");

    expect(workflow.state).toBe("running");
    expect(workflow.can("publish")).toBeFalse();
    release();

    await expectAsync(running).toBeResolvedTo({
      ok: true,
      status: "completed",
      output: { file: "index.html" },
      diagnostics: undefined,
    });
    expect(workflow.state).toBe("complete");
    expect(workflow.data.output).toBe("index.html");
    expect(workflow.history.map(({ type }) => type)).toEqual([
      "command.started",
      "command.completed",
    ]);
  });

  it("normalizes failures and applies declared failure updates", async () => {
    const workflow = $workflow(
      workflowConfig("failure", {
        data: { output: "", error: "" },
        commands: {
          publish: command({
            execute() {
              throw new Error("network unavailable");
            },
            failure: {
              to: "failed",
              update({ data, diagnostic, diagnostics }) {
                data.error = diagnostic.message;
                expect(diagnostics).toEqual([diagnostic]);
              },
            },
          }),
        },
      }),
    );

    const result = await workflow.run("publish");

    expect(result.ok).toBeFalse();
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0].message).toBe("network unavailable");
    expect(workflow.state).toBe("failed");
    expect(workflow.data.error).toBe("network unavailable");
  });

  it("records controlled rejections through the same failure lifecycle", async () => {
    const workflow = $workflow(
      workflowConfig("rejection", {
        commands: {
          validate: command({
            execute({ reject }) {
              return reject({
                code: "docs.missingTitle",
                message: "Missing title.",
                recoverable: true,
              });
            },
          }),
        },
      }),
    );

    const result = await workflow.run("validate");

    expect(result.status).toBe("rejected");
    expect(workflow.state).toBe("failed");
    expect(workflow.diagnostics[0].code).toBe("docs.missingTitle");
  });

  it("keeps command data readonly and lifecycle data mutable", async () => {
    const observed = {};
    const workflow = $workflow(
      workflowConfig("readonly", {
        data: {
          output: "draft",
          nested: { count: 0 },
          list: ["one"],
          map: new Map([["one", { count: 0 }]]),
          objectKey: { id: 1 },
          objectMap: new Map(),
          nullPrototype: Object.assign(Object.create(null), { value: 1 }),
          set: new Set([{ count: 0 }]),
          timestamp: new Date("2024-01-01T00:00:00.000Z"),
        },
        commands: {
          inspect: command({
            execute({ data }) {
              observed.mapSize = data.map.size;
              observed.mapHas = data.map.has("one");
              observed.mapKeys = [...data.map.keys()];
              observed.mapValues = [...data.map.values()].map(
                (value) => value.count,
              );
              observed.mapEntries = [...data.map.entries()].length;
              observed.mapIterator = [...data.map].length;
              observed.mapForEach = [];
              data.map.forEach((value, key) => {
                observed.mapForEach.push([key, value.count]);
              });
              observed.setSize = data.set.size;
              observed.setHas = data.set.has([...data.set][0]);
              observed.setKeys = [...data.set.keys()].length;
              observed.setValues = [...data.set.values()].length;
              observed.setEntries = [...data.set.entries()].length;
              observed.setForEach = [];
              data.set.forEach((value, key) => {
                observed.setForEach.push(value === key);
              });
              observed.objectMapHas = data.objectMap.has(data.objectKey);
              observed.objectMapGet = data.objectMap.get(data.objectKey)?.id;
              observed.objectMapMissing = data.objectMap.has({ id: 1 });
              observed.mapTag = data.map[Symbol.toStringTag];
              observed.mapConstructor = data.map.constructor.name;
              observed.mapString = data.map.toString();
              observed.setTag = data.set[Symbol.toStringTag];
              observed.setConstructor = data.set.constructor.name;
              observed.setString = data.set.toString();
              observed.nullPrototype = data.nullPrototype.value;
              observed.timestamp = data.timestamp.getUTCFullYear();

              const mutations = [
                () => {
                  data.output = "changed";
                },
                () => {
                  data.nested.count = 1;
                },
                () => data.list.push("two"),
                () => data.map.set("two", 2),
                () => data.map.delete("one"),
                () => data.map.clear(),
                () => {
                  data.map.get("one").count = 1;
                },
                () => {
                  for (const value of data.map.values()) value.count = 1;
                },
                () => data.set.add("two"),
                () => data.set.delete("one"),
                () => data.set.clear(),
                () => {
                  for (const value of data.set) value.count = 1;
                },
                () => {
                  delete data.nested.count;
                },
                () => Object.defineProperty(data.nested, "next", { value: 1 }),
                () => Object.setPrototypeOf(data.nested, null),
              ];

              return mutations.map((mutate) => {
                try {
                  mutate();

                  return false;
                } catch (error) {
                  return error instanceof TypeError;
                }
              });
            },
            success: {
              to: "complete",
              update({ data, output }) {
                data.output = output.every(Boolean) ? "protected" : "broken";
              },
            },
          }),
        },
      }),
    );
    workflow.data.objectMap.set(workflow.data.objectKey, { id: 2 });

    const result = await workflow.run("inspect");

    expect(result.ok).toBeTrue();
    expect(result.output.every(Boolean)).toBeTrue();
    expect(workflow.data.output).toBe("protected");
    expect(workflow.data.nested.count).toBe(0);
    expect(workflow.data.map.get("one").count).toBe(0);
    expect([...workflow.data.set][0].count).toBe(0);
    expect(observed).toEqual({
      mapSize: 1,
      mapHas: true,
      mapKeys: ["one"],
      mapValues: [0],
      mapEntries: 1,
      mapIterator: 1,
      mapForEach: [["one", 0]],
      setSize: 1,
      setHas: true,
      setKeys: 1,
      setValues: 1,
      setEntries: 1,
      setForEach: [true],
      objectMapHas: true,
      objectMapGet: 2,
      objectMapMissing: false,
      mapTag: "Map",
      mapConstructor: "Map",
      mapString: "[object Map]",
      setTag: "Set",
      setConstructor: "Set",
      setString: "[object Set]",
      nullPrototype: 1,
      timestamp: 2024,
    });
  });

  it("supports immediate state commands without execute", async () => {
    const workflow = $workflow(
      workflowConfig("immediate", {
        commands: {
          reset: command({
            pending: "resetting",
            execute: undefined,
            success: "idle",
          }),
        },
      }),
    );

    await expectAsync(workflow.run("reset")).toBeResolvedTo({
      ok: true,
      status: "completed",
      output: undefined,
      diagnostics: undefined,
    });
    expect(workflow.state).toBe("idle");
  });

  it("rejects commands outside their declared source states", async () => {
    const workflow = $workflow(workflowConfig());

    await workflow.run("build", "one");
    const result = await workflow.run("build", "two");

    expect(result.status).toBe("rejected");
    expect(result.diagnostics[0].code).toBe("workflow.commandNotAllowed");
    expect(workflow.state).toBe("complete");
  });

  it("enforces reject and queue concurrency declarations", async () => {
    const releases = [];
    const workflow = $workflow(
      workflowConfig("concurrency", {
        commands: {
          reject: command({
            from: ["idle", "running"],
            concurrency: "reject",
            execute: () => new Promise((resolve) => releases.push(resolve)),
          }),
          queue: command({
            from: ["complete", "running"],
            pending: "running",
            success: "complete",
            concurrency: "queue",
            execute: ({ input }) =>
              new Promise((resolve) => releases.push(() => resolve(input))),
          }),
        },
      }),
    );

    const first = workflow.run("reject");
    const rejected = await workflow.run("reject");

    expect(rejected.status).toBe("rejected");
    releases.shift()("first");
    await first;

    const queuedFirst = workflow.run("queue", "one");
    const queuedSecond = workflow.run("queue", "two");

    await wait();
    releases.shift()();
    await queuedFirst;
    await wait();
    releases.shift()();
    await expectAsync(queuedSecond).toBeResolvedTo(
      jasmine.objectContaining({ ok: true, output: "two" }),
    );
  });

  it("automatically retries failed execution according to the declaration", async () => {
    let attempts = 0;
    const workflow = $workflow(
      workflowConfig("retry", {
        commands: {
          publish: command({
            retry: 2,
            execute() {
              attempts += 1;
              if (attempts < 3) throw new Error("temporary");

              return "published";
            },
          }),
        },
      }),
    );

    const result = await workflow.run("publish");

    expect(result).toEqual(
      jasmine.objectContaining({ ok: true, output: "published" }),
    );
    expect(attempts).toBe(3);
    expect(workflow.diagnostics).toEqual([]);
  });

  it("cancels commands and applies the cancelled lifecycle", async () => {
    let cleaned = false;
    let observedSignal;
    const workflow = $workflow(
      workflowConfig("cancel", {
        commands: {
          publish: command({
            execute({ cleanup, signal }) {
              observedSignal = signal;
              cleanup(() => {
                cleaned = true;
              });

              return new Promise(() => undefined);
            },
            cancelled: "cancelled",
          }),
        },
      }),
    );
    const running = workflow.run("publish");

    expect(workflow.cancel("publish")).toBe(1);
    expect(workflow.cancel("publish")).toBe(0);
    expect(workflow.cancel("missing")).toBe(0);

    const result = await running;

    expect(result.status).toBe("cancelled");
    expect(workflow.state).toBe("cancelled");
    expect(observedSignal.aborted).toBeTrue();
    expect(cleaned).toBeTrue();
  });

  it("times out commands and applies the timeout lifecycle", async () => {
    const workflow = $workflow(
      workflowConfig("timeout", {
        commands: {
          publish: command({
            commandTimeout: 0,
            execute: () => new Promise(() => undefined),
            timeout: "timed-out",
          }),
        },
      }),
    );

    const result = await workflow.run("publish");

    expect(result.status).toBe("timeout");
    expect(workflow.state).toBe("timed-out");
  });

  it("falls back to failure states for undeclared cancellation and timeout targets", async () => {
    let workflow;

    workflow = $workflow(
      workflowConfig("fallback-lifecycles", {
        commands: {
          cancelDuringPending: command({
            pending: {
              to: "running",
              update() {
                workflow.cancel("cancelDuringPending");
              },
            },
          }),
          timeout: command({
            from: "failed",
            commandTimeout: 0,
            execute: () => new Promise(() => undefined),
          }),
        },
      }),
    );

    expect((await workflow.run("cancelDuringPending")).status).toBe(
      "cancelled",
    );
    expect(workflow.state).toBe("failed");
    expect((await workflow.run("timeout")).status).toBe("timeout");
    expect(workflow.state).toBe("failed");
  });

  it("cancels active and queued work when restoring", async () => {
    let release;
    const workflow = $workflow(
      workflowConfig("restore-running", {
        commands: {
          build: command({
            from: ["idle", "running"],
            concurrency: "queue",
            execute({ cleanup }) {
              cleanup(() => {
                throw new Error("discarded cleanup");
              });

              return new Promise((_resolve, reject) => {
                release = () => reject(new Error("late operation failure"));
              });
            },
          }),
        },
      }),
    );
    const initial = workflow.snapshot();
    const running = workflow.run("build", "one");
    const queued = workflow.run("build", "two");

    await wait();
    workflow.restore(initial);
    const runningResult = await running;
    const queuedResult = await queued;

    release?.();
    await wait();
    expect(runningResult.status).toBe("cancelled");
    expect(queuedResult.status).toBe("cancelled");
    expect(workflow.diagnostics).toEqual([]);
    expect(workflow.history).toEqual([]);
  });

  it("records cleanup and lifecycle update failures", async () => {
    const workflow = $workflow(
      workflowConfig("cleanup", {
        commands: {
          publish: command({
            execute({ cleanup }) {
              cleanup(() => {
                throw new Error("cleanup failed");
              });
              throw new Error("execution failed");
            },
            failure: {
              to: "failed",
              update() {
                throw new Error("lifecycle failed");
              },
            },
          }),
        },
      }),
    );

    const result = await workflow.run("publish");

    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "workflow.lifecycleUpdateFailed",
    );
    expect(workflow.diagnostics.map(({ code }) => code)).toContain(
      "workflow.cleanupFailed",
    );
    expect(workflow.state).toBe("failed");
  });

  it("bounds diagnostics and history", async () => {
    const workflow = $workflow(
      workflowConfig("bounded", {
        diagnosticLimit: 1,
        historyLimit: 2,
        commands: {
          fail: command({
            from: ["idle", "failed"],
            pending: "running",
            execute({ input }) {
              throw new Error(String(input));
            },
          }),
        },
      }),
    );

    await workflow.run("fail", "one");
    await workflow.run("fail", "two");

    expect(workflow.diagnostics.length).toBe(1);
    expect(workflow.diagnostics[0].message).toBe("two");
    expect(workflow.history.length).toBe(2);
  });

  it("returns stable diagnostics for invalid and missing commands", async () => {
    const workflow = $workflow(workflowConfig());

    expect((await workflow.run("")).status).toBe("rejected");
    expect((await workflow.run("missing")).status).toBe("rejected");
    expect(workflow.can("missing")).toBeFalse();
    expect(workflow.cancel("")).toBe(0);
  });

  it("validates declarative workflow definitions", () => {
    const invalidConfigs = [
      null,
      { ...workflowConfig(), id: "" },
      { ...workflowConfig(), initial: "" },
      { ...workflowConfig(), data: null },
      { ...workflowConfig(), commands: [] },
      { ...workflowConfig(), commands: { "": command() } },
      { ...workflowConfig(), commands: { build: null } },
      { ...workflowConfig(), commands: { build: command({ from: [] }) } },
      {
        ...workflowConfig(),
        commands: { build: command({ pending: "" }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ success: { to: "", update() {} } }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ failure: { to: "failed", update: 1 } }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ execute: [] }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ concurrency: "serial" }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ commandTimeout: -1 }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ commandTimeout: Number.NaN }) },
      },
      {
        ...workflowConfig(),
        commands: { build: command({ retry: Number.NaN }) },
      },
      { ...workflowConfig(), historyLimit: Number.POSITIVE_INFINITY },
      { ...workflowConfig(), diagnosticLimit: -1 },
      { ...workflowConfig(), migrateSnapshot: true },
    ];

    for (const config of invalidConfigs) {
      expect(() => $workflow(config)).toThrow();
    }
  });

  it("snapshots, restores, and migrates workflow state", async () => {
    const workflow = $workflow(workflowConfig("snapshot"));

    await workflow.run("build", "index.html");

    const snapshot = workflow.snapshot();

    workflow.data.output = "changed";
    workflow.restore(snapshot);
    expect(workflow.state).toBe("complete");
    expect(workflow.data.output).toBe("index.html");

    const migrated = $workflow(
      workflowConfig("migrated", {
        migrateSnapshot() {
          return {
            ...snapshot,
            id: "migrated",
          };
        },
      }),
    );

    migrated.restore({ version: 0 });
    expect(migrated.state).toBe("complete");
  });

  it("rejects malformed and mismatched snapshots", () => {
    const workflow = $workflow(workflowConfig("snapshot-errors"));

    for (const snapshot of [
      null,
      {},
      { version: 1 },
      { version: 1, id: "x" },
      { version: 1, id: "x", state: "idle" },
      { version: 1, id: "x", state: "idle", data: {} },
      {
        version: 1,
        id: "x",
        state: "idle",
        data: {},
        diagnostics: [],
      },
    ]) {
      expect(() => workflow.restore(snapshot)).toThrow();
    }

    expect(() =>
      workflow.restore({
        ...workflow.snapshot(),
        id: "other",
      }),
    ).toThrowError("$workflow restore snapshot id must match workflow id.");
  });

  it("normalizes restored diagnostics and history", () => {
    const workflow = $workflow(workflowConfig("normalized-restore"));
    const circular = {};

    circular.self = circular;
    workflow.restore({
      version: 1,
      id: "normalized-restore",
      state: "idle",
      data: { output: "restored", attempts: 0 },
      diagnostics: [
        "plain failure",
        {
          code: 1,
          message: false,
          path: 2,
          command: 3,
          detail: {
            bigint: 1n,
            symbol: Symbol("detail"),
            callback() {},
            date: new Date("2024-01-01T00:00:00.000Z"),
            map: new Map([["key", "value"]]),
            set: new Set(["value"]),
            circular,
          },
        },
        {
          code: "workflow.path",
          message: "Path diagnostic.",
          path: "data.output",
          command: "build",
        },
      ],
      history: [
        {
          id: 2,
          type: "command.started",
          command: "build",
          input: { file: "one" },
        },
        {
          id: 2,
          type: "unknown",
          command: "",
          output: { file: "two" },
          diagnostics: [false],
        },
        {
          id: 4,
          type: "command.failed",
          command: "build",
          diagnostics: null,
        },
        null,
      ],
    });

    expect(workflow.diagnostics[0]).toEqual(
      jasmine.objectContaining({
        code: "workflow.diagnostic",
        message: "plain failure",
      }),
    );
    expect(workflow.diagnostics[1].detail).toEqual(
      jasmine.objectContaining({
        bigint: "1",
        symbol: "Symbol(detail)",
        callback: "[Function]",
        date: "2024-01-01T00:00:00.000Z",
        map: [["key", "value"]],
        set: ["value"],
      }),
    );
    expect(workflow.diagnostics[1].detail.circular.self).toBe("[Circular]");
    expect(workflow.history.map(({ id }) => id)).toEqual([2, 3, 4, 5]);
    expect(workflow.history[1]).toEqual(
      jasmine.objectContaining({ type: "command.failed", command: "unknown" }),
    );
  });

  it("restores array, map, and set workflow data in place", () => {
    const arrayWorkflow = $workflow({
      id: "array-data",
      initial: "idle",
      data: ["one"],
      commands: {},
    });
    const mapWorkflow = $workflow({
      id: "map-data",
      initial: "idle",
      data: new Map([["one", 1]]),
      commands: {},
    });
    const setWorkflow = $workflow({
      id: "set-data",
      initial: "idle",
      data: new Set(["one"]),
      commands: {},
    });

    for (const [workflow, data] of [
      [arrayWorkflow, ["two"]],
      [mapWorkflow, new Map([["two", 2]])],
      [setWorkflow, new Set(["two"])],
    ]) {
      workflow.restore({ ...workflow.snapshot(), data });
    }

    expect(arrayWorkflow.data).toEqual(["two"]);
    expect([...mapWorkflow.data]).toEqual([["two", 2]]);
    expect([...setWorkflow.data]).toEqual(["two"]);
  });

  it("defaults omitted workflow data", () => {
    const workflow = $workflow({
      id: "default-data",
      initial: "idle",
      commands: {},
    });

    expect(workflow.data).toEqual({});
  });

  it("normalizes non-error command failures", async () => {
    const values = [new Error(""), 42, true, 1n, Symbol(), () => undefined, {}];
    const messages = [];

    for (const [index, value] of values.entries()) {
      const workflow = $workflow(
        workflowConfig(`unknown-error-${String(index)}`, {
          commands: {
            build: command({
              execute() {
                throw value;
              },
            }),
          },
        }),
      );

      messages.push((await workflow.run("build")).diagnostics[0].message);
    }

    expect(messages).toEqual([
      "Workflow command failed.",
      "42",
      "true",
      "1",
      "Symbol()",
      "[Function]",
      "Workflow diagnostic.",
    ]);
  });

  it("reactively propagates lifecycle state and data into templates", async () => {
    const workflow = $workflow(workflowConfig("reactive"));

    $rootScope.workflow = workflow;

    const element = $compile(
      '<section><span class="state">{{ workflow.state }}</span>' +
        '<span class="output">{{ workflow.data.output }}</span></section>',
    )($rootScope);

    await wait();
    expect(element.querySelector(".state").textContent).toBe("idle");

    await workflow.run("build", "bundle.js");
    await wait();
    expect(element.querySelector(".state").textContent).toBe("complete");
    expect(element.querySelector(".output").textContent).toBe("bundle.js");
  });

  it("forgets destroyed reactive workflow bindings", async () => {
    const workflow = $workflow(workflowConfig("destroyed-binding"));
    const scope = $rootScope.$new();

    scope.workflow = workflow;
    $compile("<span>{{ workflow.state }}</span>")(scope);
    await wait();
    scope.$destroy();

    await workflow.run("build", "after-destroy.js");
    expect(workflow.state).toBe("complete");
  });

  it("registers named workflows as singleton injectables", async () => {
    const app = window.angular.module("workflow-app", []);

    app
      .workflow("buildWorkflow", {
        initial: "idle",
        data: { output: "" },
        commands: {
          build: command({
            execute: ({ input }) => input,
            success: {
              to: "complete",
              update({ data, output }) {
                data.output = output;
              },
            },
          }),
        },
      })
      .workflow("emptyWorkflow", {
        initial: "idle",
        commands: {},
      })
      .machine("emptyMachine", {
        initial: "idle",
        states: { idle: {} },
      })
      .workflowSupervisor("defaultSupervisor", {
        workflows: { empty: workflowConfig("supervised-empty") },
      });

    const injector = createInjector(["ng", "workflow-app"]);
    const first = injector.get("buildWorkflow");
    const second = injector.get("buildWorkflow");
    const emptyWorkflow = injector.get("emptyWorkflow");
    const emptyMachine = injector.get("emptyMachine");
    const defaultSupervisor = injector.get("defaultSupervisor");

    expect(first).toBe(second);
    await first.run("build", "app.js");
    expect(first.data.output).toBe("app.js");
    expect(emptyWorkflow.data).toEqual({});
    expect(emptyMachine.data).toEqual({});
    expect(defaultSupervisor.id).toBe("defaultSupervisor");
  });

  describe("supervision", () => {
    it("validates supervisor declarations and workflow entries", () => {
      const invalidConfigs = [
        null,
        {},
        { id: "", workflows: { build: workflowConfig() } },
        { id: "invalid", workflows: null },
        { id: "invalid", workflows: [] },
        { id: "invalid", workflows: [["", workflowConfig()]] },
        {
          id: "invalid",
          workflows: [
            ["build", workflowConfig()],
            ["build", workflowConfig()],
          ],
        },
        { id: "invalid", workflows: [["build", null]] },
        { id: "invalid", workflows: [42] },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          autoPersist: "yes",
        },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          autoRecover: true,
        },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          persistence: {},
        },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          persistence: 1,
        },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          persistence: { type: "indexeddb", database: "" },
        },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          persistence: { type: "indexeddb", store: 1 },
        },
        {
          id: "invalid",
          workflows: { build: workflowConfig() },
          persistence: { type: "indexeddb", version: 0 },
        },
      ];

      for (const config of invalidConfigs) {
        expect(() => createWorkflowSupervisor($workflow, config)).toThrow();
      }
    });

    it("accepts tuple and object workflow registry entries", () => {
      const existing = $workflow(workflowConfig("existing"));
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "entry-shapes",
        workflows: [
          ["tuple", workflowConfig("tuple")],
          { name: "instance", workflow: existing },
          { name: "config", config: workflowConfig("object-config") },
        ],
      });

      expect(supervisor.workflow("tuple").id).toBe("tuple");
      expect(supervisor.workflow("instance")).toBe(existing);
      expect(supervisor.workflow("config").id).toBe("object-config");
    });

    it("creates, snapshots, restores, and cancels workflows", async () => {
      let release;
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "pipeline",
        workflows: {
          build: workflowConfig("build"),
          publish: workflowConfig("publish", {
            commands: {
              publish: command({
                execute: () =>
                  new Promise((resolve) => {
                    release = resolve;
                  }),
              }),
            },
          }),
        },
      });

      await supervisor.workflow("build").run("build", "one");
      const running = supervisor.workflow("publish").run("publish");
      const snapshot = supervisor.snapshot();

      expect(supervisor.cancelAll()).toBe(1);
      await running;
      supervisor.restore(snapshot);
      expect(supervisor.workflow("build").data.output).toBe("one");
      expect(() => supervisor.workflow("missing")).toThrow();
      expect(() => supervisor.workflow(null)).toThrow();
      release?.();
    });

    it("normalizes restored supervisor state and unknown workflows", () => {
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "restore-supervisor",
        workflows: { build: workflowConfig("restore-build") },
      });
      const base = supervisor.snapshot();

      supervisor.restore({
        ...base,
        status: "recovering",
        workflows: {
          ...base.workflows,
          unknown: base.workflows.build,
        },
        diagnostics: [
          "plain",
          {
            code: 1,
            message: false,
            recoverable: false,
            workflow: 2,
            command: 3,
          },
          {
            code: "known",
            message: "Known diagnostic.",
            workflow: "build",
            command: "build",
            detail: 1n,
          },
        ],
      });

      expect(supervisor.status).toBe("failed");
      expect(supervisor.diagnostics.map(({ code }) => code)).toContain(
        "workflowSupervisor.unknownSnapshotWorkflow",
      );
      expect(supervisor.diagnostics[0].message).toBe("plain");
      supervisor.restore({ ...base, status: "recovering" });
      expect(supervisor.status).toBe("idle");
      supervisor.restore({ ...base, status: "failed" });
      expect(supervisor.status).toBe("failed");
      expect(() => supervisor.restore({ ...base, id: "other" })).toThrow();

      for (const snapshot of [
        null,
        {},
        { version: 1 },
        { version: 1, id: "restore-supervisor" },
        { version: 1, id: "restore-supervisor", status: "unknown" },
        {
          version: 1,
          id: "restore-supervisor",
          status: "idle",
          workflows: [],
        },
        {
          version: 1,
          id: "restore-supervisor",
          status: "idle",
          workflows: {},
          diagnostics: null,
        },
        {
          version: 1,
          id: "restore-supervisor",
          status: "idle",
          workflows: {},
          diagnostics: [],
          updatedAt: Number.NaN,
        },
      ]) {
        expect(() => supervisor.restore(snapshot)).toThrow();
      }
    });

    it("persists automatically after commands", async () => {
      const saved = [];
      const persistence = {
        async load() {
          return undefined;
        },
        async save(_id, snapshot) {
          saved.push(snapshot);
        },
      };
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "persisted",
        workflows: { build: workflowConfig("persisted-build") },
        persistence,
        autoPersist: true,
      });

      await supervisor.workflow("build").run("build", "main.js");

      expect(saved.length).toBe(1);
      expect(saved[0].workflows.build.data.output).toBe("main.js");
    });

    it("handles absent and failing persistence adapters", async () => {
      const transient = createWorkflowSupervisor($workflow, {
        id: "transient",
        workflows: { build: workflowConfig("transient-build") },
      });

      expect((await transient.persist()).id).toBe("transient");
      expect(await transient.recover()).toBeUndefined();

      const saveError = new Error("save failed");
      const failingSave = createWorkflowSupervisor($workflow, {
        id: "failing-save",
        workflows: { build: workflowConfig("failing-save-build") },
        persistence: {
          async load() {
            return undefined;
          },
          async save() {
            throw saveError;
          },
        },
        autoPersist: true,
      });

      expect(failingSave.workflow("build").id).toBe("failing-save-build");
      await failingSave.workflow("build").run("build", "ignored.js");
      expect(failingSave.status).toBe("failed");
      expect(failingSave.diagnostics.at(-1).code).toBe(
        "workflowSupervisor.persistenceSaveFailed",
      );
      await expectAsync(failingSave.persist()).toBeRejectedWith(saveError);

      const loadError = new Error("load failed");
      const failingLoad = createWorkflowSupervisor($workflow, {
        id: "failing-load",
        workflows: { build: workflowConfig("failing-load-build") },
        persistence: {
          async load() {
            throw loadError;
          },
          async save() {},
        },
      });

      await expectAsync(failingLoad.recover()).toBeRejectedWith(loadError);
      expect(failingLoad.status).toBe("failed");
      expect(failingLoad.diagnostics.at(-1).code).toBe(
        "workflowSupervisor.persistenceLoadFailed",
      );

      const autoRecovering = createWorkflowSupervisor($workflow, {
        id: "auto-failing-load",
        workflows: { build: workflowConfig("auto-failing-load-build") },
        persistence: {
          async load() {
            throw loadError;
          },
          async save() {},
        },
        autoRecover: true,
      });

      expect(await autoRecovering.ready).toBeUndefined();
      expect(autoRecovering.status).toBe("failed");

      const emptyPersistence = createWorkflowSupervisor($workflow, {
        id: "empty-persistence",
        workflows: { build: workflowConfig("empty-persistence-build") },
        persistence: {
          async load() {
            return undefined;
          },
          async save() {},
        },
      });

      expect(await emptyPersistence.recover()).toBeUndefined();
      expect(emptyPersistence.status).toBe("idle");

      const namelessError = createWorkflowSupervisor($workflow, {
        id: "nameless-error",
        workflows: { build: workflowConfig("nameless-error-build") },
        persistence: {
          async load() {
            throw new Error("");
          },
          async save() {},
        },
      });

      await expectAsync(namelessError.recover()).toBeRejected();
      expect(namelessError.diagnostics.at(-1).message).toContain("Error");
    });

    it("records recovery failures and ignores non-recoverable history", async () => {
      const seed = createWorkflowSupervisor($workflow, {
        id: "failed-recovery",
        workflows: {
          build: workflowConfig("failed-recovery-build", {
            commands: {
              build: command({
                from: ["idle", "failed"],
                execute({ reject }) {
                  reject({
                    code: "build.retry",
                    message: "retry failed",
                    recoverable: true,
                  });
                },
              }),
            },
          }),
        },
      });

      await seed.workflow("build").run("build");
      const persisted = seed.snapshot();
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "failed-recovery",
        workflows: {
          build: workflowConfig("failed-recovery-build", {
            commands: {
              build: command({
                from: ["idle", "failed"],
                execute() {
                  throw new Error("still unavailable");
                },
              }),
            },
          }),
        },
        persistence: {
          async load() {
            return persisted;
          },
          async save() {},
        },
      });

      const recovered = await supervisor.recover();

      expect(recovered.status).toBe("failed");
      expect(supervisor.diagnostics.at(-1).code).toBe(
        "workflowSupervisor.recoveryCommandFailed",
      );

      const nonRecoverable = createWorkflowSupervisor($workflow, {
        id: "non-recoverable",
        workflows: {
          build: workflowConfig("non-recoverable-build", {
            commands: {
              build: command({
                from: ["idle", "failed"],
                execute({ reject }) {
                  reject({
                    code: "build.permanent",
                    message: "permanent failure",
                    recoverable: false,
                  });
                },
              }),
            },
          }),
        },
      });

      await nonRecoverable.workflow("build").run("build");
      expect(await nonRecoverable.recover()).toBeUndefined();
    });

    it("restores persisted state and reruns recoverable commands", async () => {
      const seed = createWorkflowSupervisor($workflow, {
        id: "recovery",
        workflows: {
          build: workflowConfig("recovery-build", {
            commands: {
              build: command({
                from: ["idle", "failed"],
                execute({ input, reject }) {
                  return reject({
                    code: "build.retry",
                    message: String(input),
                    recoverable: true,
                  });
                },
              }),
            },
          }),
        },
      });

      await seed.workflow("build").run("build", "retry.js");
      const persisted = seed.snapshot();
      let attempts = 0;
      const persistence = {
        async load() {
          return persisted;
        },
        async save() {},
      };
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "recovery",
        workflows: {
          build: workflowConfig("recovery-build", {
            commands: {
              build: command({
                from: ["idle", "failed"],
                execute({ input }) {
                  attempts += 1;

                  return input;
                },
              }),
            },
          }),
        },
        persistence,
        autoRecover: true,
      });

      await supervisor.ready;
      expect(attempts).toBe(1);
      expect(supervisor.workflow("build").state).toBe("complete");
    });

    it("persists through the built-in IndexedDB adapter", async () => {
      const database = `angular-ts-workflow-${String(Math.random())}`;

      try {
        const first = createWorkflowSupervisor($workflow, {
          id: "indexed",
          workflows: { build: workflowConfig("indexed-build") },
          persistence: { type: "indexeddb", database, version: 2 },
        });

        await first.workflow("build").run("build", "db.js");
        await first.persist();

        const second = createWorkflowSupervisor($workflow, {
          id: "indexed",
          workflows: { build: workflowConfig("indexed-build") },
          persistence: { type: "indexeddb", database, version: 2 },
        });

        await second.recover();
        expect(second.workflow("build").data.output).toBe("db.js");
      } finally {
        await deleteIndexedDbDatabase(database);
      }
    });

    it("selects built-in IndexedDB persistence by name", async () => {
      const id = `indexed-name-${String(Math.random())}`;

      try {
        const supervisor = createWorkflowSupervisor($workflow, {
          id,
          workflows: { build: workflowConfig(`${id}-build`) },
          persistence: "indexeddb",
        });

        await supervisor.persist();
        expect((await supervisor.recover()).id).toBe(id);
      } finally {
        await deleteIndexedDbDatabase("angular-ts-workflows");
      }
    });

    it("reports IndexedDB persistence failures", async () => {
      const persistenceFor = (id, indexedDBFactory) =>
        createWorkflowSupervisor($workflow, {
          id,
          workflows: { build: workflowConfig(`${id}-build`) },
          persistence: {
            type: "indexeddb",
            database: `${id}-database`,
            indexedDB: indexedDBFactory,
          },
        });
      const openFailureFactory = (event, error = null) => ({
        open() {
          const request = { error };

          queueMicrotask(() => request[event]?.());

          return request;
        },
      });
      const transactionFailureFactory = (stage, error = null) => ({
        open() {
          const transaction = {
            error,
            objectStore() {
              return {
                put() {
                  const request = { error };

                  queueMicrotask(() => {
                    if (stage === "request") request.onerror?.();
                    else request.onsuccess?.();
                  });

                  return request;
                },
              };
            },
          };
          Object.defineProperty(transaction, "oncomplete", {
            set(callback) {
              queueMicrotask(() => {
                if (stage === "transaction-error") transaction.onerror?.();
                else if (stage === "transaction-abort") transaction.onabort?.();
                else callback();
              });
            },
          });
          const database = {
            close() {},
            objectStoreNames: { contains: () => true },
            transaction: () => transaction,
          };
          const request = { error: null, result: database };

          queueMicrotask(() => request.onsuccess?.());

          return request;
        },
      });

      const supervisors = [
        persistenceFor("missing-indexeddb", false),
        persistenceFor(
          "open-error",
          openFailureFactory("onerror", new Error("open")),
        ),
        persistenceFor("open-error-fallback", openFailureFactory("onerror")),
        persistenceFor("open-blocked", openFailureFactory("onblocked")),
        persistenceFor(
          "request-error",
          transactionFailureFactory("request", new Error("request")),
        ),
        persistenceFor(
          "request-error-fallback",
          transactionFailureFactory("request"),
        ),
        persistenceFor(
          "transaction-error",
          transactionFailureFactory(
            "transaction-error",
            new Error("transaction"),
          ),
        ),
        persistenceFor(
          "transaction-error-fallback",
          transactionFailureFactory("transaction-error"),
        ),
        persistenceFor(
          "transaction-abort",
          transactionFailureFactory("transaction-abort", new Error("abort")),
        ),
        persistenceFor(
          "transaction-abort-fallback",
          transactionFailureFactory("transaction-abort"),
        ),
      ];

      for (const supervisor of supervisors) {
        await expectAsync(supervisor.persist()).toBeRejected();
        expect(supervisor.status).toBe("failed");
      }
    });
  });

  describe("worker transport", () => {
    it("runs, snapshots, and restores hosted workflows", async () => {
      const workflow = $workflow(workflowConfig("worker"));
      const host = createWorkflowWorkerHost({
        workflows: { build: workflow },
      });
      const client = createWorkflowWorkerClient(
        createWorkflowWorkerTestConnection(host),
      );
      const snapshots = [];
      const stop = client.onSnapshot((snapshot) => snapshots.push(snapshot));

      expect(client.latestSnapshot).toBeUndefined();

      const result = await client.run("build", "build", "worker.js");

      expect(result.ok).toBeTrue();
      expect(snapshots.at(-1).build.data.output).toBe("worker.js");

      const snapshot = await client.snapshot();
      workflow.data.output = "changed";
      await client.restore(snapshot);
      expect(workflow.data.output).toBe("worker.js");
      expect(client.latestSnapshot.build.data.output).toBe("worker.js");
      stop();
      client.dispose();
    });

    it("returns command failures for missing workflow and command names", async () => {
      const host = createWorkflowWorkerHost({
        workflows: { build: $workflow(workflowConfig("worker-errors")) },
      });
      const responses = [];

      await host.handle(
        {
          type: "angular-ts:workflow-worker:request",
          id: "missing-workflow",
          operation: "run",
          workflow: "missing",
          command: "build",
        },
        (message) => responses.push(message),
      );
      await host.handle(
        {
          type: "angular-ts:workflow-worker:request",
          id: "empty-workflow",
          operation: "run",
          workflow: "",
          command: "build",
        },
        (message) => responses.push(message),
      );
      await host.handle(
        {
          type: "angular-ts:workflow-worker:request",
          id: "missing-command",
          operation: "run",
          workflow: "build",
        },
        (message) => responses.push(message),
      );

      const results = responses.filter(
        (message) => message.type === "angular-ts:workflow-worker:response",
      );

      expect(results[0].result.status).toBe("rejected");
      expect(results[1].result.status).toBe("rejected");
      expect(results[2].result.status).toBe("rejected");
    });

    it("handles worker protocol validation, errors, and snapshot publication policy", async () => {
      const workflow = $workflow(workflowConfig("worker-protocol"));
      const host = createWorkflowWorkerHost({
        workflows: { build: workflow },
        publishSnapshots: false,
      });
      const messages = [];

      for (const message of [
        null,
        {},
        {
          type: "angular-ts:workflow-worker:request",
          id: "",
          operation: "run",
        },
        {
          type: "angular-ts:workflow-worker:request",
          id: "invalid-operation",
          operation: "cancel",
        },
      ]) {
        await host.handle(message, (response) => messages.push(response));
      }

      await host.handle(
        {
          type: "angular-ts:workflow-worker:request",
          id: "restore-invalid",
          operation: "restore",
          snapshot: [],
        },
        (response) => messages.push(response),
      );
      await host.handle(
        {
          type: "angular-ts:workflow-worker:request",
          id: "restore-wrapper",
          operation: "restore",
          snapshot: { workflows: { unknown: workflow.snapshot() } },
        },
        (response) => messages.push(response),
      );
      await host.handle(
        {
          type: "angular-ts:workflow-worker:request",
          id: "run",
          operation: "run",
          workflow: "build",
          command: "build",
          input: "worker.js",
        },
        (response) => messages.push(response),
      );

      expect(messages.some((message) => message.ok === false)).toBeTrue();
      expect(
        messages.some(
          (message) => message.type === "angular-ts:workflow-worker:snapshot",
        ),
      ).toBeFalse();
      expect(() =>
        createWorkflowWorkerHost({ workflows: { "": workflow } }),
      ).toThrow();
    });

    it("rejects worker client failures and pending requests", async () => {
      let listener;
      const posted = [];
      const connection = {
        post(message) {
          posted.push(message);
        },
        onMessage(callback) {
          listener = callback;

          return () => undefined;
        },
      };
      const client = createWorkflowWorkerClient(connection);
      const failed = client.run("build", "build");

      listener({
        type: "angular-ts:workflow-worker:response",
        id: "unknown",
        ok: true,
      });
      listener({
        type: "angular-ts:workflow-worker:response",
        id: posted[0].id,
        ok: false,
      });
      await expectAsync(failed).toBeRejected();

      const pending = client.snapshot();

      client.dispose();
      await expectAsync(pending).toBeRejected();
    });

    it("validates hosts and rejects pending requests when disposed", async () => {
      expect(() => createWorkflowWorkerHost(null)).toThrow();
      expect(() => createWorkflowWorkerHost({ workflows: [] })).toThrow();
      expect(() =>
        createWorkflowWorkerHost({ workflows: { invalid: {} } }),
      ).toThrow();
      expect(() => createWorkflowWorkerClient({})).toThrow();
      expect(() => createWorkflowWorkerClient(null)).toThrow();

      const workflow = $workflow(workflowConfig("dispose"));
      const host = createWorkflowWorkerHost({ workflows: { build: workflow } });
      const connection = createWorkflowWorkerTestConnection(host);
      const client = createWorkflowWorkerClient(connection);

      client.dispose();
      await expectAsync(client.run("build", "build")).toBeRejected();
    });

    it("normalizes worker host transport errors", async () => {
      const thrown = [new Error(""), "string failure", 2, false, {}];
      const messages = [];

      for (const [index, value] of thrown.entries()) {
        const base = $workflow(workflowConfig(`worker-throw-${String(index)}`));
        const workflow = {
          ...base,
          state: base.state,
          data: base.data,
          diagnostics: base.diagnostics,
          history: base.history,
          async run() {
            throw value;
          },
        };
        const host = createWorkflowWorkerHost({
          workflows: { build: workflow },
        });

        await host.handle(
          {
            type: "angular-ts:workflow-worker:request",
            id: `throw-${String(index)}`,
            operation: "run",
            workflow: "build",
            command: "build",
          },
          (message) => messages.push(message),
        );
      }

      expect(messages.map(({ error }) => error.message)).toEqual([
        "Error",
        "string failure",
        "2",
        "false",
        "Workflow worker request failed.",
      ]);
    });

    it("ignores unrelated worker client messages", () => {
      let listener;
      const client = createWorkflowWorkerClient({
        post() {},
        onMessage(callback) {
          listener = callback;

          return () => undefined;
        },
      });

      listener(null);
      listener({ type: "angular-ts:workflow-worker:response" });
      listener({ type: "angular-ts:workflow-worker:snapshot", snapshot: [] });
      expect(client.latestSnapshot).toBeUndefined();
      client.dispose();
    });
  });

  describe("incremental UI fragments", () => {
    it("renders and disposes workflow-owned fragments", async () => {
      const workflow = $workflow(workflowConfig("fragment"));
      const target = document.createElement("div");

      $rootScope.workflow = workflow;

      const host = createWorkflowUiFragmentHost({
        compile: $compile,
        scope: $rootScope,
        target,
      });
      const fragment = host.render(
        '<p class="progress">{{ workflow.state }}:{{ workflow.data.output }}</p>',
      );

      await workflow.run("build", "fragment.js");
      await wait();
      expect(target.querySelector(".progress").textContent).toBe(
        "complete:fragment.js",
      );

      const node = fragment.nodes[0];

      fragment.dispose();
      expect(fragment.disposed).toBeTrue();
      expect(getCompiledFragmentRecord(node)).toBeUndefined();
    });

    it("tracks, replaces, and disposes hosted fragments", () => {
      const target = document.createElement("div");
      const scope = $rootScope.$new();
      const host = createWorkflowUiFragmentHost({
        compile: $compile,
        scope,
        target,
      });
      const first = host.render(document.createElement("p"));
      const second = host.render("<strong>next</strong>");

      expect(host.current).toBe(second);
      expect(first.disposed).toBeTrue();
      scope.$destroy();
      expect(host.current).toBeNull();
      host.dispose();
      expect(() => host.render("<p>late</p>")).toThrow();
    });

    it("requires compilation to return a compiled fragment", () => {
      const host = createWorkflowUiFragmentHost({
        compile: () => () => document.createTextNode("plain"),
        scope: $rootScope,
        target: document.createElement("div"),
      });

      expect(() => host.render("ignored")).toThrowError(
        "Workflow UI fragment host requires a compiled fragment.",
      );
      host.dispose();
    });

    it("accepts linked node arrays", () => {
      const target = document.createElement("div");
      const linked = $compile("<p>array</p>")($rootScope);
      const host = createWorkflowUiFragmentHost({
        compile: () => () => [linked],
        scope: $rootScope,
        target,
      });

      expect(host.render("ignored").nodes[0].textContent).toBe("array");
      host.dispose();
    });

    it("ignores late DOM work after fragment disposal", async () => {
      const target = document.createElement("div");
      const host = createWorkflowUiFragmentHost({
        compile: $compile,
        scope: $rootScope,
        target,
      });
      const fragment = host.render("<p>late</p>");
      let ran = false;

      scheduleCompiledFragmentDomWork(fragment, () => {
        ran = true;
      });
      fragment.dispose();

      expect(ran).toBeFalse();
    });
  });
});
