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
  createWorkflowSupervisor,
  createWorkflowWorkerClient,
  createWorkflowWorkerHost,
  defineCommand,
  defineWorkflow,
  indexedDbWorkflowSupervisorPersistence,
  createWorkflowService,
} from "./workflow.ts";
import type { MachineConfig } from "../machine/machine.ts";
import type {
  WorkflowCommandOptions,
  WorkflowConfig,
  WorkflowService,
  WorkflowSupervisorPersistence,
  WorkflowWorkerHost,
  WorkflowWorkerHostConfig,
  WorkflowWorkerRequest,
} from "./workflow.ts";
import { createWorkflowUiFragmentHost } from "./workflow-ui-fragment.ts";

function deleteIndexedDbDatabase(database: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(database);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB delete failed."));
    };
    request.onblocked = () => {
      resolve();
    };
  });
}

function createWorkflowWorkerTestConnection(
  host: WorkflowWorkerHost,
): ng.WorkerConnection & { dispatch(data: unknown): void } {
  const listeners = new Set<(data: unknown, event: MessageEvent) => void>();
  const dispatch = (data: unknown) => {
    const event = { data } as MessageEvent;

    for (const listener of listeners) {
      listener(data, event);
    }
  };

  return {
    dispatch,
    postMessage(data: unknown) {
      void host.handle(data, dispatch);
    },
    onMessage(listener) {
      listeners.add(listener);

      return () => listeners.delete(listener);
    },
    restart() {
      return undefined;
    },
    terminate() {
      return undefined;
    },
  };
}

describe("$workflow", () => {
  let $compile: ng.CompileService;
  let $rootScope: ng.Scope;
  let $workflow: WorkflowService;

  beforeEach(() => {
    window.angular = new Angular();

    const injector = createInjector(["ng"]);

    $compile = injector.get("$compile") as ng.CompileService;
    $rootScope = injector.get("$rootScope") as ng.Scope;
    $workflow = injector.get("$workflow") as WorkflowService;
  });

  it("creates a reactive workflow on top of machine-backed state trees", async () => {
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
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.status = "running";
              },
            },
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

  it("creates a reactive workflow on top of machine state trees", async () => {
    const element = $compile(
      '<section><span class="mode">{{ build.current }}</span>' +
        '<span class="status">{{ build.data.status }}</span></section>',
    )($rootScope);

    $rootScope.build = $workflow({
      id: "state-build",
      initial: "idle",
      data: {
        status: "idle",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data }) {
                data.status = "running";

                return false;
              },
            },
          },
        },
        running: {},
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

  it("returns typed workflow definitions and commands unchanged", () => {
    const command = defineCommand(({ input }) => ({
      ok: true,
      output: String(input),
    }));
    const config = {
      id: "defined",
      initial: "idle",
      data: {
        value: "",
      },
      states: {
        idle: {},
      },
      commands: {
        publish: command,
      },
    };

    expect(typeof command).toBe("function");
    expect(defineWorkflow(config)).toBe(config);
  });

  it("supports context-object workflow command definitions", async () => {
    const command = defineCommand(({ input, data, command }) => {
      data.value = `${command}:${input}`;

      return {
        ok: true,
        output: data.value,
      };
    });
    const workflow = $workflow({
      id: "context-command",
      initial: "idle",
      data: {
        value: "",
      },
      states: {
        idle: {},
      },
      commands: {
        publish: command,
      },
    });

    const result = await workflow.run("publish", "ready");

    expect(result).toEqual({
      ok: true,
      status: "completed",
      output: "publish:ready",
      diagnostics: undefined,
    });
    expect(workflow.data.value).toBe("publish:ready");
  });

  it("supports direct context-object workflow command maps", async () => {
    const workflow = $workflow({
      id: "direct-context-command",
      initial: "idle",
      data: {
        value: "",
      },
      states: {
        idle: {},
      },
      commands: {
        publish({ input, data, command }) {
          data.value = `${command}:${input}`;

          return {
            ok: true,
            output: data.value,
          };
        },
      },
    });

    const result = await workflow.run("publish", "ready");

    expect(result).toEqual({
      ok: true,
      status: "completed",
      output: "publish:ready",
      diagnostics: undefined,
    });
    expect(workflow.data.value).toBe("publish:ready");
  });

  it("validates workflow configuration at creation time", () => {
    expect(() => $workflow(null as WorkflowConfig)).toThrowError(
      "$workflow requires a config object.",
    );
    expect(() =>
      $workflow({
        id: "",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
      }),
    ).toThrowError("$workflow requires a non-empty id.");
    expect(() =>
      $workflow({
        id: "bad-initial",
        initial: "",
        data: {},
        states: {
          idle: {},
        },
      }),
    ).toThrowError("$workflow requires a non-empty initial mode.");
    expect(() =>
      $workflow({
        id: "bad-data",
        initial: "idle",
        data: null,
        states: {
          idle: {},
        },
      }),
    ).toThrowError("$workflow requires a data object.");
    expect(() =>
      $workflow({
        id: "missing-states",
        initial: "idle",
        data: {},
      }),
    ).toThrowError("$workflow requires a states object.");
    expect(() =>
      $workflow({
        id: "bad-states",
        initial: "idle",
        data: {},
        states: null,
      }),
    ).toThrowError("$workflow requires a states object.");
    expect(() =>
      $workflow({
        id: "bad-commands",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        commands: null,
      }),
    ).toThrowError("$workflow commands must be an object.");
    expect(() =>
      $workflow({
        id: "bad-concurrency",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        concurrency: "drop",
      }),
    ).toThrowError(
      "$workflow concurrency must be 'allow', 'reject', or 'queue'.",
    );
    expect(() =>
      $workflow({
        id: "bad-history-limit",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        historyLimit: -1,
      }),
    ).toThrowError("$workflow historyLimit must be a non-negative integer.");
    expect(() =>
      $workflow({
        id: "bad-diagnostic-limit",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        diagnosticLimit: Number.POSITIVE_INFINITY,
      }),
    ).toThrowError("$workflow diagnosticLimit must be a finite number.");
    expect(() =>
      $workflow({
        id: "bad-timeout",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        commandTimeout: 1.5,
      }),
    ).toThrowError("$workflow command timeout must be a non-negative integer.");
    expect(() =>
      $workflow({
        id: "bad-migrate",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        migrateSnapshot: "nope",
      }),
    ).toThrowError("$workflow migrateSnapshot must be a function.");
    expect(() =>
      $workflow({
        id: "bad-state-engine",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        stateEngine: "nope",
      }),
    ).toThrowError("$workflow stateEngine must be a function.");
    expect(() =>
      $workflow({
        id: "bad-state-engine-result",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        stateEngine() {
          return null;
        },
      }),
    ).toThrowError("$workflow stateEngine must return an engine object.");
    expect(() =>
      $workflow({
        id: "bad-state-engine-current",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        stateEngine() {
          return {
            current: "",
            data: {},
            send() {
              return false;
            },
            can() {
              return false;
            },
            matches() {
              return false;
            },
            snapshot() {
              return {
                current: "idle",
                data: {},
              };
            },
            restore() {
              return undefined;
            },
          };
        },
      }),
    ).toThrowError("$workflow stateEngine must expose a current mode.");
    expect(() =>
      $workflow({
        id: "bad-state-engine-data",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        stateEngine() {
          return {
            current: "idle",
            data: null,
            send() {
              return false;
            },
            can() {
              return false;
            },
            matches() {
              return false;
            },
            snapshot() {
              return {
                current: "idle",
                data: {},
              };
            },
            restore() {
              return undefined;
            },
          };
        },
      }),
    ).toThrowError("$workflow stateEngine must expose a data object.");
    expect(() =>
      $workflow({
        id: "bad-state-engine-methods",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
        stateEngine() {
          return {
            current: "idle",
            data: {},
          };
        },
      }),
    ).toThrowError(
      "$workflow stateEngine must expose send, can, matches, snapshot, and restore.",
    );
  });

  it("creates workflow supervisors from existing workflow instances", () => {
    const build = $workflow({
      id: "supervisor-build",
      initial: "idle",
      data: {
        status: "idle",
      },
      states: {
        idle: {},
      },
    });
    const publish = $workflow({
      id: "supervisor-publish",
      initial: "idle",
      data: {
        status: "idle",
      },
      states: {
        idle: {},
      },
    });

    const supervisor = createWorkflowSupervisor($workflow, {
      id: "pipeline",
      workflows: {
        build,
        publish,
      },
    });

    expect(supervisor.id).toBe("pipeline");
    expect(supervisor.status).toBe("idle");
    expect(supervisor.workflow("build")).toBe(build);
    expect(supervisor.workflow("publish")).toBe(publish);
    expect(supervisor.snapshot()).toEqual(
      jasmine.objectContaining({
        version: 1,
        id: "pipeline",
        status: "idle",
        workflows: jasmine.objectContaining({
          build: jasmine.objectContaining({
            id: "supervisor-build",
          }),
          publish: jasmine.objectContaining({
            id: "supervisor-publish",
          }),
        }),
      }),
    );
  });

  it("creates workflow supervisors from workflow configs", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "config-pipeline",
      workflows: {
        build: {
          id: "config-build",
          initial: "idle",
          data: {
            count: 0,
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.count += 1;
                  },
                },
              },
            },
          },
        },
        publish: {
          id: "config-publish",
          initial: "idle",
          data: {
            sent: false,
          },
          states: {
            idle: {},
          },
        },
      },
    });
    const build = supervisor.workflow("build");

    expect(build.id).toBe("config-build");
    expect(build.current).toBe("idle");
    expect(build.send("start").ok).toBe(true);
    expect(build.current).toBe("running");
    expect(build.data.count).toBe(1);
    expect(supervisor.workflow("publish").id).toBe("config-publish");
  });

  it("validates workflow supervisor configuration at creation time", () => {
    const workflowConfig = {
      id: "supervised",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
    };

    expect(() =>
      createWorkflowSupervisor($workflow, null as ng.WorkflowSupervisorConfig),
    ).toThrowError("$workflowSupervisor requires a config object.");
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "",
        workflows: {
          build: workflowConfig,
        },
      }),
    ).toThrowError("$workflowSupervisor requires a non-empty id.");
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "missing-workflows",
      }),
    ).toThrowError("$workflowSupervisor requires workflows.");
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "empty-workflows",
        workflows: {},
      }),
    ).toThrowError("$workflowSupervisor requires at least one workflow.");
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "empty-name",
        workflows: {
          "": workflowConfig,
        },
      }),
    ).toThrowError(
      "$workflowSupervisor workflow names must be non-empty strings.",
    );
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "duplicate-name",
        workflows: [
          ["build", workflowConfig],
          [
            "build",
            {
              ...workflowConfig,
              id: "supervised-again",
            },
          ],
        ],
      }),
    ).toThrowError("$workflowSupervisor duplicate workflow name 'build'.");
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "bad-persistence-policy",
        persistencePolicy: "after-change",
        workflows: {
          build: workflowConfig,
        },
      }),
    ).toThrowError(
      "$workflowSupervisor persistencePolicy must be 'manual' or 'after-command'.",
    );
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "bad-recovery",
        recovery: "auto",
        workflows: {
          build: workflowConfig,
        },
      }),
    ).toThrowError("$workflowSupervisor recovery must be an object.");
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "bad-restore-on-start",
        recovery: {
          restoreOnStart: "yes",
        },
        workflows: {
          build: workflowConfig,
        },
      }),
    ).toThrowError(
      "$workflowSupervisor recovery.restoreOnStart must be a boolean.",
    );
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "bad-entry",
        workflows: [42],
      }),
    ).toThrowError(
      "$workflowSupervisor workflow entries must be tuples or objects.",
    );
    expect(() =>
      createWorkflowSupervisor($workflow, {
        id: "bad-definition",
        workflows: {
          build: null,
        },
      }),
    ).toThrowError(
      "$workflowSupervisor workflow must be a workflow instance or config object.",
    );
  });

  it("creates workflow supervisors from services and object entries", async () => {
    const providerSupervisor = createWorkflowSupervisor($workflow, {
      id: "provider-supervisor",
      workflows: {
        build: {
          id: "provider-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
        },
      },
    });
    const build = $workflow({
      id: "object-entry-build",
      initial: "idle",
      data: {
        count: 0,
      },
      states: {
        idle: {},
      },
    });
    const objectEntrySupervisor = createWorkflowSupervisor($workflow, {
      id: "object-entry-supervisor",
      workflows: [
        {
          name: "build",
          workflow: build,
        },
        {
          name: "publish",
          config: {
            id: "object-entry-publish",
            initial: "idle",
            data: {},
            states: {
              idle: {},
            },
          },
        },
      ],
    });

    const workflowFactory = createWorkflowService((config: MachineConfig) => ({
      ...config,
      current: config.initial,
      data: config.data,
      send() {
        return false;
      },
      can() {
        return false;
      },
      matches(mode: string) {
        return mode === config.initial;
      },
      snapshot() {
        return {
          current: config.initial,
          data: config.data,
        };
      },
      restore() {
        return undefined;
      },
    }));

    expect(
      workflowFactory({
        id: "provider-workflow",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
      }).id,
    ).toBe("provider-workflow");
    expect(providerSupervisor.workflow("build").id).toBe("provider-build");
    expect(objectEntrySupervisor.workflow("build")).toBe(build);
    expect(objectEntrySupervisor.workflow("publish").id).toBe(
      "object-entry-publish",
    );
    await expectAsync(providerSupervisor.persist()).toBeResolvedTo(
      jasmine.objectContaining({
        id: "provider-supervisor",
      }),
    );
    await expectAsync(providerSupervisor.load()).toBeResolvedTo(undefined);
    expect(() => providerSupervisor.workflow("missing")).toThrowError(
      "$workflowSupervisor workflow 'missing' is not registered.",
    );
    expect(() => providerSupervisor.workflow(42)).toThrowError(
      "$workflowSupervisor workflow '42' is not registered.",
    );
    expect(() => providerSupervisor.workflow("")).toThrowError(
      "$workflowSupervisor workflow '' is not registered.",
    );
    expect(providerSupervisor.diagnostics.slice(-2)).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.missingWorkflow",
        workflow: undefined,
      }),
      jasmine.objectContaining({
        code: "workflowSupervisor.missingWorkflow",
        workflow: undefined,
      }),
    ]);
  });

  it("delegates workflow supervisor run and send calls", async () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "delegation",
      workflows: {
        build: {
          id: "delegated-build",
          initial: "idle",
          data: {
            output: "",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.output = String(payload);
                  },
                },
              },
            },
          },
          commands: {
            compile({ data, input }) {
              data.output = String(input);

              return {
                ok: true,
                output: {
                  file: data.output,
                },
              };
            },
          },
        },
      },
    });

    await expectAsync(
      supervisor.workflow("build").run("compile", "app.js"),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        ok: true,
        output: {
          file: "app.js",
        },
      }),
    );
    expect(supervisor.workflow("build").send("start", "bundle.js").ok).toBe(
      true,
    );
    expect(supervisor.workflow("build").current).toBe("running");
    expect(supervisor.workflow("build").data.output).toBe("bundle.js");
    expect(supervisor.workflow("build").send("missing").ok).toBe(false);
  });

  it("delegates workflow supervisor cancellation counts", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const build = $workflow({
      id: "cancel-build",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
      commands: {
        async hold() {
          await gate;

          return "build";
        },
      },
    });
    const publish = $workflow({
      id: "cancel-publish",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
      commands: {
        async hold() {
          await gate;

          return "publish";
        },
      },
    });
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "cancellation",
      workflows: {
        build,
        publish,
      },
    });
    const buildRun = supervisor.workflow("build").run("hold");
    const publishRun = supervisor.workflow("publish").run("hold");

    const buildCancelled = supervisor.workflow("build").cancel("hold");
    const buildResult = await buildRun;

    expect(buildCancelled).toBe(1);
    expect(supervisor.workflow("build").cancel("hold")).toBe(0);
    expect(supervisor.cancelAll()).toBe(1);

    const publishResult = await publishRun;

    release();

    expect(buildResult).toEqual(
      jasmine.objectContaining({
        ok: false,
      }),
    );
    expect(publishResult).toEqual(
      jasmine.objectContaining({
        ok: false,
      }),
    );
  });

  it("snapshots and restores multiple supervised workflows", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "snapshot-pipeline",
      workflows: {
        build: {
          id: "snapshot-build",
          initial: "idle",
          data: {
            step: "draft",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.step = "building";
                  },
                },
              },
            },
            running: {
              on: {
                finish: {
                  to: "done",
                  update({ data, payload, workflow }) {
                    data.step = "done";
                  },
                },
              },
            },
          },
        },
        publish: {
          id: "snapshot-publish",
          initial: "idle",
          data: {
            step: "queued",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.step = "publishing";
                  },
                },
              },
            },
            running: {
              on: {
                finish: {
                  to: "done",
                  update({ data, payload, workflow }) {
                    data.step = "done";
                  },
                },
              },
            },
          },
        },
      },
    });

    supervisor.diagnostics.push({
      code: "custom",
      message: "Custom diagnostic.",
      detail: {
        callback() {
          return undefined;
        },
      },
    });
    supervisor.workflow("build").send("start");
    supervisor.workflow("publish").send("start");

    const snapshot = supervisor.snapshot();

    supervisor.workflow("build").send("finish");
    supervisor.workflow("publish").send("finish");

    expect(snapshot).toEqual(
      jasmine.objectContaining({
        version: 1,
        id: "snapshot-pipeline",
        status: "idle",
        updatedAt: jasmine.any(Number),
        workflows: jasmine.objectContaining({
          build: jasmine.objectContaining({
            id: "snapshot-build",
            current: "running",
          }),
          publish: jasmine.objectContaining({
            id: "snapshot-publish",
            current: "running",
          }),
        }),
        diagnostics: [
          jasmine.objectContaining({
            code: "custom",
            detail: {
              callback: "[Function]",
            },
          }),
        ],
      }),
    );
    expect(() => JSON.stringify(snapshot.diagnostics)).not.toThrow();

    supervisor.restore(snapshot);

    expect(supervisor.workflow("build").current).toBe("running");
    expect(supervisor.workflow("build").data.step).toBe("building");
    expect(supervisor.workflow("publish").current).toBe("running");
    expect(supervisor.workflow("publish").data.step).toBe("publishing");
    expect(supervisor.diagnostics).toEqual(snapshot.diagnostics);
  });

  it("rejects malformed workflow supervisor snapshots", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "malformed-snapshot",
      workflows: {
        build: {
          id: "malformed-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
        },
      },
    });
    const validSnapshot = supervisor.snapshot();

    expect(() => supervisor.restore(null)).toThrowError(
      "$workflowSupervisor restore requires a snapshot object.",
    );
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        version: 2,
      }),
    ).toThrowError(
      "$workflowSupervisor restore requires a version 1 snapshot.",
    );
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        id: "",
      }),
    ).toThrowError("$workflowSupervisor restore requires a non-empty id.");
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        status: "paused",
      }),
    ).toThrowError("$workflowSupervisor restore requires a valid status.");
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        workflows: [],
      }),
    ).toThrowError("$workflowSupervisor restore requires workflows.");
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        diagnostics: null,
      }),
    ).toThrowError("$workflowSupervisor restore requires diagnostics.");
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        updatedAt: Number.POSITIVE_INFINITY,
      }),
    ).toThrowError("$workflowSupervisor restore requires updatedAt.");
    expect(() =>
      supervisor.restore({
        ...validSnapshot,
        id: "other-supervisor",
      }),
    ).toThrowError(
      "$workflowSupervisor restore snapshot id must match supervisor id.",
    );
  });

  it("normalizes workflow supervisor diagnostics during restore", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "diagnostic-normalization",
      workflows: {
        build: {
          id: "diagnostic-normalization-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
        },
      },
    });
    const snapshot = supervisor.snapshot();

    supervisor.restore({
      ...snapshot,
      diagnostics: [
        "raw diagnostic",
        {
          code: 42,
          message: false,
          recoverable: "yes",
          workflow: 7,
          command: 8,
          detail: {
            callback() {
              return undefined;
            },
          },
        },
        {
          code: "build.warning",
          message: "Build warning.",
          recoverable: false,
          workflow: "build",
          command: "compile",
          detail: {
            ok: true,
          },
        },
      ],
    });

    expect(supervisor.diagnostics).toEqual([
      {
        code: "workflowSupervisor.diagnostic",
        message: "raw diagnostic",
        recoverable: true,
      },
      {
        code: "workflowSupervisor.diagnostic",
        message: "Workflow supervisor diagnostic.",
        recoverable: undefined,
        workflow: undefined,
        command: undefined,
        detail: {
          callback: "[Function]",
        },
      },
      {
        code: "build.warning",
        message: "Build warning.",
        recoverable: false,
        workflow: "build",
        command: "compile",
        detail: {
          ok: true,
        },
      },
    ]);
  });

  it("records unknown supervisor snapshot workflows and preserves missing workflows", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "partial-snapshot",
      workflows: {
        build: {
          id: "partial-build",
          initial: "idle",
          data: {
            step: "draft",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.step = "building";
                  },
                },
              },
            },
          },
        },
        publish: {
          id: "partial-publish",
          initial: "idle",
          data: {
            step: "queued",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.step = "publishing";
                  },
                },
              },
            },
          },
        },
      },
    });
    const snapshot = supervisor.snapshot();

    supervisor.workflow("build").send("start");
    supervisor.workflow("publish").send("start");

    const partialSnapshot = {
      ...snapshot,
      workflows: {
        build: snapshot.workflows.build,
        ghost: snapshot.workflows.build,
      },
    };

    supervisor.restore(partialSnapshot);

    expect(supervisor.workflow("build").current).toBe("idle");
    expect(supervisor.workflow("build").data.step).toBe("draft");
    expect(supervisor.workflow("publish").current).toBe("running");
    expect(supervisor.workflow("publish").data.step).toBe("publishing");
    expect(supervisor.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.unknownSnapshotWorkflow",
        workflow: "ghost",
        recoverable: true,
      }),
    ]);
  });

  it("normalizes transient workflow supervisor snapshot statuses on restore", () => {
    for (const transientStatus of [
      "running",
      "persisting",
      "recovering",
    ] as const) {
      const supervisor = createWorkflowSupervisor($workflow, {
        id: `transient-${transientStatus}`,
        workflows: {
          build: {
            id: `transient-${transientStatus}-build`,
            initial: "idle",
            data: {},
            states: {
              idle: {},
            },
          },
        },
      });
      const snapshot = supervisor.snapshot();

      supervisor.restore({
        ...snapshot,
        status: transientStatus,
      });

      expect(supervisor.status).toBe("idle");
    }
  });

  it("restores failed workflow supervisor snapshots from failed evidence", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "failed-evidence",
      workflows: {
        build: {
          id: "failed-evidence-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
        },
      },
    });
    const snapshot = supervisor.snapshot();

    supervisor.restore({
      ...snapshot,
      status: "recovering",
      diagnostics: [
        {
          code: "workflowSupervisor.recoveryCommandFailed",
          message: "Recovery failed.",
          recoverable: false,
        },
      ],
    });

    expect(supervisor.status).toBe("failed");
    expect(supervisor.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.recoveryCommandFailed",
        recoverable: false,
      }),
    ]);
  });

  it("preserves an explicitly failed supervisor snapshot status", () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "failed-status",
      workflows: {
        build: {
          id: "failed-status-build",
          initial: "idle",
          data: {},
          states: { idle: {} },
        },
      },
    });

    supervisor.restore({
      ...supervisor.snapshot(),
      status: "failed",
    });

    expect(supervisor.status).toBe("failed");
  });

  it("persists and loads workflow supervisor snapshots through an adapter", async () => {
    let savedSnapshot: ng.WorkflowSupervisorSnapshot | undefined;
    const persistence: WorkflowSupervisorPersistence = {
      async load(id) {
        expect(id).toBe("persisted-pipeline");

        return savedSnapshot;
      },
      async save(id, snapshot) {
        expect(id).toBe("persisted-pipeline");
        savedSnapshot = structuredClone(snapshot);
      },
    };
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "persisted-pipeline",
      persistence,
      workflows: {
        build: {
          id: "persisted-build",
          initial: "idle",
          data: {
            step: "draft",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.step = "building";
                  },
                },
              },
            },
            running: {
              on: {
                finish: {
                  to: "done",
                  update({ data, payload, workflow }) {
                    data.step = "done";
                  },
                },
              },
            },
          },
        },
      },
    });

    supervisor.workflow("build").send("start");

    const persisted = await supervisor.persist();

    expect(savedSnapshot).toEqual(persisted);

    supervisor.workflow("build").send("finish");

    const loaded = await supervisor.load();

    expect(loaded).toEqual(
      jasmine.objectContaining({
        id: "persisted-pipeline",
        workflows: jasmine.objectContaining({
          build: jasmine.objectContaining({
            current: "running",
          }),
        }),
      }),
    );
    expect(supervisor.workflow("build").current).toBe("running");
    expect(supervisor.workflow("build").data.step).toBe("building");
  });

  it("handles missing persisted workflow supervisor snapshots", async () => {
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "missing-persisted-pipeline",
      persistence: {
        async load() {
          return undefined;
        },
        async save() {
          throw new Error("should not save");
        },
      },
      workflows: {
        build: {
          id: "missing-persisted-build",
          initial: "idle",
          data: {
            step: "draft",
          },
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.step = "building";
                  },
                },
              },
            },
          },
        },
      },
    });

    supervisor.workflow("build").send("start");

    await expectAsync(supervisor.load()).toBeResolvedTo(undefined);
    expect(supervisor.workflow("build").current).toBe("running");
    expect(supervisor.workflow("build").data.step).toBe("building");
    expect(supervisor.status).toBe("idle");
    expect(supervisor.diagnostics).toEqual([]);
  });

  it("loads workflow supervisor snapshots on ready when restoreOnStart is enabled", async () => {
    let loadCalled = false;
    const persistedSnapshot: ng.WorkflowSupervisorSnapshot = {
      version: 1,
      id: "startup-pipeline",
      status: "idle",
      workflows: {
        build: {
          version: 1,
          id: "startup-build",
          current: "running",
          data: {
            step: "building",
          },
          diagnostics: [],
          history: [],
        },
      },
      diagnostics: [],
      updatedAt: Date.now(),
    };
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "startup-pipeline",
      recovery: {
        restoreOnStart: true,
      },
      persistence: {
        async load(id) {
          expect(id).toBe("startup-pipeline");
          loadCalled = true;

          return persistedSnapshot;
        },
        async save() {
          throw new Error("should not save");
        },
      },
      workflows: {
        build: {
          id: "startup-build",
          initial: "idle",
          data: {
            step: "draft",
          },
          states: {
            idle: {},
            running: {},
          },
        },
      },
    });

    expect(supervisor.status).toBe("recovering");
    expect(supervisor.workflow("build").current).toBe("idle");

    const readySnapshot = await supervisor.ready;

    expect(loadCalled).toBe(true);
    expect(readySnapshot).toEqual(
      jasmine.objectContaining({
        id: "startup-pipeline",
        workflows: jasmine.objectContaining({
          build: jasmine.objectContaining({
            current: "running",
          }),
        }),
      }),
    );
    expect(supervisor.status).toBe("idle");
    expect(supervisor.workflow("build").current).toBe("running");
    expect(supervisor.workflow("build").data.step).toBe("building");
    expect(supervisor.diagnostics).toEqual([]);
  });

  it("records restoreOnStart persistence failures on supervisor ready", async () => {
    const loadError = new Error("startup load failed");
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "startup-failure",
      recovery: {
        restoreOnStart: true,
      },
      persistence: {
        async load() {
          throw loadError;
        },
        async save() {
          throw new Error("should not save");
        },
      },
      workflows: {
        build: {
          id: "startup-failure-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
        },
      },
    });

    await expectAsync(supervisor.ready).toBeResolvedTo(undefined);

    expect(supervisor.status).toBe("failed");
    expect(supervisor.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.persistenceLoadFailed",
        recoverable: true,
      }),
    ]);
  });

  it("records workflow supervisor persistence failures", async () => {
    const saveError = new Error("save failed");
    const loadError = new Error("load failed");
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "failing-persistence",
      persistence: {
        async load() {
          throw loadError;
        },
        async save() {
          throw saveError;
        },
      },
      workflows: {
        build: {
          id: "failing-persistence-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
        },
      },
    });

    await expectAsync(supervisor.persist()).toBeRejectedWith(saveError);
    await expectAsync(supervisor.load()).toBeRejectedWith(loadError);

    expect(supervisor.status).toBe("failed");
    expect(supervisor.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.persistenceSaveFailed",
        recoverable: true,
      }),
      jasmine.objectContaining({
        code: "workflowSupervisor.persistenceLoadFailed",
        recoverable: true,
      }),
    ]);
  });

  it("keeps workflow supervisor persistence manual by default", async () => {
    let saves = 0;
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "manual-persistence",
      persistence: {
        async load() {
          return undefined;
        },
        async save() {
          saves += 1;
        },
      },
      workflows: {
        build: {
          id: "manual-persistence-build",
          initial: "idle",
          data: {
            output: "",
          },
          states: {
            idle: {},
          },
          commands: {
            compile({ data, input }) {
              data.output = String(input);

              return {
                ok: true,
                output: {
                  file: data.output,
                },
              };
            },
          },
        },
      },
    });

    await supervisor.workflow("build").run("compile", "index.html");

    expect(saves).toBe(0);
  });

  it("persists workflow supervisors after successful commands when configured", async () => {
    const saves: ng.WorkflowSupervisorSnapshot[] = [];
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "after-command-success",
      persistencePolicy: "after-command",
      persistence: {
        async load() {
          return undefined;
        },
        async save(_id, snapshot) {
          saves.push(structuredClone(snapshot));
        },
      },
      workflows: {
        build: {
          id: "after-command-success-build",
          initial: "idle",
          data: {
            output: "",
          },
          states: {
            idle: {},
          },
          commands: {
            compile({ data, input }) {
              data.output = String(input);

              return {
                ok: true,
                output: {
                  file: data.output,
                },
              };
            },
          },
        },
      },
    });

    expect(supervisor.workflow("build").current).toBe("idle");

    const result = await supervisor.workflow("build").run("compile", "main.js");

    expect(result).toEqual(
      jasmine.objectContaining({
        ok: true,
        output: {
          file: "main.js",
        },
      }),
    );
    expect(saves.length).toBe(1);
    expect(saves[0].workflows.build).toEqual(
      jasmine.objectContaining({
        data: {
          output: "main.js",
        },
      }),
    );
  });

  it("persists workflow supervisors after failed command results when configured", async () => {
    const saves: ng.WorkflowSupervisorSnapshot[] = [];
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "after-command-failure",
      persistencePolicy: "after-command",
      persistence: {
        async load() {
          return undefined;
        },
        async save(_id, snapshot) {
          saves.push(structuredClone(snapshot));
        },
      },
      workflows: {
        build: {
          id: "after-command-failure-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
          commands: {
            fail() {
              return {
                ok: false,
                diagnostics: [
                  {
                    code: "build.failed",
                    message: "Build failed.",
                  },
                ],
              };
            },
          },
        },
      },
    });

    const result = await supervisor.workflow("build").run("fail");

    expect(result).toEqual(
      jasmine.objectContaining({
        ok: false,
      }),
    );
    expect(saves.length).toBe(1);
    expect(saves[0].workflows.build.history).toEqual([
      jasmine.objectContaining({
        type: "command.started",
        command: "fail",
      }),
      jasmine.objectContaining({
        type: "command.failed",
        command: "fail",
      }),
    ]);
  });

  it("does not replace command results when after-command persistence fails", async () => {
    const saveError = new Error("autosave failed");
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "after-command-save-failure",
      persistencePolicy: "after-command",
      persistence: {
        async load() {
          return undefined;
        },
        async save() {
          throw saveError;
        },
      },
      workflows: {
        build: {
          id: "after-command-save-failure-build",
          initial: "idle",
          data: {
            output: "",
          },
          states: {
            idle: {},
          },
          commands: {
            compile({ data, input }) {
              data.output = String(input);

              return {
                ok: true,
                output: {
                  file: data.output,
                },
              };
            },
          },
        },
      },
    });

    const result = await supervisor.workflow("build").run("compile", "main.js");

    expect(result).toEqual(
      jasmine.objectContaining({
        ok: true,
        output: {
          file: "main.js",
        },
      }),
    );
    expect(supervisor.status).toBe("failed");
    expect(supervisor.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.persistenceSaveFailed",
        recoverable: true,
      }),
    ]);
  });

  it("retries recoverable workflow supervisor failures when requested", async () => {
    let attempts = 0;
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "recoverable-recovery",
      workflows: {
        build: {
          id: "recoverable-recovery-build",
          initial: "idle",
          data: {
            published: false,
          },
          states: {
            idle: {},
          },
          commands: {
            publish({ data }) {
              attempts += 1;

              if (attempts === 1) {
                throw new Error("network unavailable");
              }

              data.published = true;

              return {
                ok: true,
              };
            },
          },
        },
      },
    });

    const failure = await supervisor.workflow("build").run("publish");
    const recovered = await supervisor.recover();

    expect(failure.ok).toBe(false);
    expect(recovered).toEqual(
      jasmine.objectContaining({
        id: "recoverable-recovery",
      }),
    );
    expect(attempts).toBe(2);
    expect(supervisor.workflow("build").data.published).toBe(true);
    expect(
      supervisor.workflow("build").history.map((entry) => entry.type),
    ).toEqual([
      "command.started",
      "command.failed",
      "command.started",
      "command.completed",
    ]);
    expect(supervisor.status).toBe("idle");
    expect(supervisor.diagnostics).toEqual([]);
  });

  it("recovers multiple workflow supervisor workflows from recoverable failures", async () => {
    let buildAttempts = 0;
    let publishAttempts = 0;
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "multi-recovery",
      workflows: {
        build: {
          id: "multi-recovery-build",
          initial: "idle",
          data: {
            output: "",
          },
          states: {
            idle: {},
          },
          commands: {
            compile({ data, input }) {
              buildAttempts += 1;
              data.output = String(input);

              if (buildAttempts === 1) {
                return {
                  ok: false,
                  diagnostics: [
                    {
                      code: "build.network",
                      message: "Build worker unavailable.",
                      recoverable: true,
                    },
                  ],
                };
              }

              return {
                ok: true,
                output: {
                  file: data.output,
                },
              };
            },
          },
        },
        publish: {
          id: "multi-recovery-publish",
          initial: "idle",
          data: {
            url: "",
          },
          states: {
            idle: {},
          },
          commands: {
            upload({ data, input }) {
              publishAttempts += 1;

              if (publishAttempts === 1) {
                return {
                  ok: false,
                  diagnostics: [
                    {
                      code: "publish.network",
                      message: "Upload endpoint unavailable.",
                      recoverable: true,
                    },
                  ],
                };
              }

              data.url = `/docs/${String(input)}`;

              return {
                ok: true,
                output: {
                  url: data.url,
                },
              };
            },
          },
        },
      },
    });

    await supervisor.workflow("build").run("compile", "index.html");
    await supervisor.workflow("publish").run("upload", "index.html");

    const recovered = await supervisor.recover();

    expect(recovered).toEqual(
      jasmine.objectContaining({
        id: "multi-recovery",
      }),
    );
    expect(buildAttempts).toBe(2);
    expect(publishAttempts).toBe(2);
    expect(supervisor.workflow("build").data.output).toBe("index.html");
    expect(supervisor.workflow("publish").data.url).toBe("/docs/index.html");
    expect(
      supervisor.workflow("build").history.map((entry) => entry.type),
    ).toEqual([
      "command.started",
      "command.failed",
      "command.started",
      "command.completed",
    ]);
    expect(
      supervisor.workflow("publish").history.map((entry) => entry.type),
    ).toEqual([
      "command.started",
      "command.failed",
      "command.started",
      "command.completed",
    ]);
    expect(supervisor.status).toBe("idle");
    expect(supervisor.diagnostics).toEqual([]);
  });

  it("does not retry non-recoverable workflow supervisor failures", async () => {
    let attempts = 0;
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "non-recoverable-recovery",
      workflows: {
        build: {
          id: "non-recoverable-recovery-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
          commands: {
            publish() {
              attempts += 1;

              return {
                ok: false,
                diagnostics: [
                  {
                    code: "publish.auth",
                    message: "Authentication failed.",
                    recoverable: false,
                  },
                ],
              };
            },
          },
        },
      },
    });

    const failure = await supervisor.workflow("build").run("publish");
    const recovered = await supervisor.recover();

    expect(failure.ok).toBe(false);
    expect(recovered).toBeUndefined();
    expect(attempts).toBe(1);
    expect(
      supervisor.workflow("build").history.map((entry) => entry.type),
    ).toEqual(["command.started", "command.failed"]);
    expect(supervisor.status).toBe("idle");
    expect(supervisor.diagnostics).toEqual([]);
  });

  it("records workflow supervisor recovery diagnostics with workflow and command names", async () => {
    let attempts = 0;
    const supervisor = createWorkflowSupervisor($workflow, {
      id: "failed-recovery",
      workflows: {
        build: {
          id: "failed-recovery-build",
          initial: "idle",
          data: {},
          states: {
            idle: {},
          },
          commands: {
            publish() {
              attempts += 1;

              return {
                ok: false,
                diagnostics: [
                  {
                    code: "publish.network",
                    message: "Network unavailable.",
                    recoverable: true,
                  },
                ],
              };
            },
          },
        },
      },
    });

    await supervisor.workflow("build").run("publish");

    const recovered = await supervisor.recover();

    expect(recovered).toEqual(
      jasmine.objectContaining({
        id: "failed-recovery",
      }),
    );
    expect(attempts).toBe(2);
    expect(supervisor.status).toBe("failed");
    expect(supervisor.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflowSupervisor.recoveryCommandFailed",
        workflow: "build",
        command: "publish",
        recoverable: true,
      }),
    ]);
  });

  it("saves, loads, and removes workflow supervisor snapshots through IndexedDB", async () => {
    const database = `angular-ts-workflow-supervisor-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const persistence = indexedDbWorkflowSupervisorPersistence({
      database,
      store: "snapshots",
    });

    try {
      const supervisor = createWorkflowSupervisor($workflow, {
        id: "indexed-pipeline",
        persistence,
        workflows: {
          build: {
            id: "indexed-build",
            initial: "idle",
            data: {
              step: "draft",
            },
            states: {
              idle: {
                on: {
                  start: {
                    to: "running",
                    update({ data, payload, workflow }) {
                      data.step = "building";
                    },
                  },
                },
              },
            },
          },
        },
      });

      supervisor.workflow("build").send("start");

      await supervisor.persist();

      const restored = createWorkflowSupervisor($workflow, {
        id: "indexed-pipeline",
        persistence,
        workflows: {
          build: {
            id: "indexed-build",
            initial: "idle",
            data: {
              step: "draft",
            },
            states: {
              idle: {
                on: {
                  start: {
                    to: "running",
                    update({ data, payload, workflow }) {
                      data.step = "building";
                    },
                  },
                },
              },
            },
          },
        },
      });
      const loaded = await restored.load();

      expect(loaded).toEqual(
        jasmine.objectContaining({
          id: "indexed-pipeline",
        }),
      );
      expect(restored.workflow("build").current).toBe("running");
      expect(restored.workflow("build").data.step).toBe("building");

      await persistence.remove?.("indexed-pipeline");

      await expectAsync(persistence.load("indexed-pipeline")).toBeResolvedTo(
        undefined,
      );
    } finally {
      await deleteIndexedDbDatabase(database);
    }
  });

  it("validates IndexedDB workflow supervisor persistence configuration", async () => {
    expect(() =>
      indexedDbWorkflowSupervisorPersistence({
        database: "",
      }),
    ).toThrowError("$workflowSupervisor IndexedDB database must be non-empty.");
    expect(() =>
      indexedDbWorkflowSupervisorPersistence({
        store: "",
      }),
    ).toThrowError("$workflowSupervisor IndexedDB store must be non-empty.");
    expect(() =>
      indexedDbWorkflowSupervisorPersistence({
        version: 0,
      }),
    ).toThrowError(
      "$workflowSupervisor IndexedDB version must be a positive integer.",
    );

    const originalIndexedDb = globalThis.indexedDB;

    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: undefined,
    });

    try {
      const persistence = indexedDbWorkflowSupervisorPersistence();

      await expectAsync(persistence.load("missing")).toBeRejectedWithError(
        "$workflowSupervisor IndexedDB persistence requires indexedDB.",
      );
    } finally {
      Object.defineProperty(globalThis, "indexedDB", {
        configurable: true,
        value: originalIndexedDb,
      });
    }
  });

  it("surfaces IndexedDB workflow supervisor open, request, and transaction failures", async () => {
    const createIndexedDb = ({
      blockOpen = false,
      openError,
      openFails = false,
      requestError,
      requestFails = false,
      transactionAbort = false,
      transactionError,
      transactionFails = false,
    }: {
      blockOpen?: boolean;
      openError?: Error;
      openFails?: boolean;
      requestError?: Error;
      requestFails?: boolean;
      transactionAbort?: boolean;
      transactionError?: Error;
      transactionFails?: boolean;
    }): IDBFactory =>
      ({
        open() {
          const transaction = {
            error: transactionError,
            objectStore() {
              return {
                get() {
                  const request = {
                    error: requestError,
                    result: undefined,
                  } as IDBRequest<ng.WorkflowSupervisorSnapshot | undefined>;

                  setTimeout(() => {
                    if (requestFails) {
                      request.onerror?.({} as Event);

                      return;
                    }

                    request.onsuccess?.({} as Event);

                    setTimeout(() => {
                      if (transactionFails) {
                        transaction.onerror?.({} as Event);
                      } else if (transactionAbort) {
                        transaction.onabort?.({} as Event);
                      } else {
                        transaction.oncomplete?.({} as Event);
                      }
                    });
                  });

                  return request;
                },
              };
            },
          } as IDBTransaction;
          const database = {
            close: jasmine.createSpy("close"),
            createObjectStore: jasmine.createSpy("createObjectStore"),
            objectStoreNames: {
              contains: jasmine.createSpy("contains").and.returnValue(true),
            },
            transaction: jasmine
              .createSpy("transaction")
              .and.returnValue(transaction),
          } as unknown as IDBDatabase;
          const request = {
            error: openError,
            result: database,
          } as IDBOpenDBRequest;

          setTimeout(() => {
            if (blockOpen) {
              request.onblocked?.({} as Event);
            } else if (openFails) {
              request.onerror?.({} as Event);
            } else {
              request.onsuccess?.({} as Event);
            }
          });

          return request;
        },
      }) as IDBFactory;

    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          openError: new Error("open failed"),
          openFails: true,
        }),
        version: 2,
      }).load("open-error"),
    ).toBeRejectedWithError("open failed");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          openFails: true,
        }),
        version: 2,
      }).load("open-fallback"),
    ).toBeRejectedWithError("IndexedDB open failed.");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          blockOpen: true,
        }),
        version: 2,
      }).load("open-blocked"),
    ).toBeRejectedWithError("IndexedDB open was blocked.");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          requestFails: true,
          requestError: new Error("request failed"),
        }),
        version: 2,
      }).load("request-error"),
    ).toBeRejectedWithError("request failed");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          requestFails: true,
        }),
        version: 2,
      }).load("request-fallback"),
    ).toBeRejectedWithError("IndexedDB request failed.");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          transactionError: new Error("transaction failed"),
          transactionFails: true,
        }),
        version: 2,
      }).load("transaction-error"),
    ).toBeRejectedWithError("transaction failed");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          transactionFails: true,
        }),
        version: 2,
      }).load("transaction-fallback"),
    ).toBeRejectedWithError("IndexedDB transaction failed.");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          transactionAbort: true,
          transactionError: new Error("transaction aborted"),
        }),
        version: 2,
      }).load("transaction-abort-error"),
    ).toBeRejectedWithError("transaction aborted");
    await expectAsync(
      indexedDbWorkflowSupervisorPersistence({
        indexedDB: createIndexedDb({
          transactionAbort: true,
        }),
        version: 2,
      }).load("transaction-abort"),
    ).toBeRejectedWithError("IndexedDB transaction aborted.");
  });

  it("runs workflow commands through the workflow worker adapter", async () => {
    const snapshots: Array<Record<string, ng.WorkflowSnapshot<object>>> = [];
    const workflow = $workflow({
      id: "worker-build",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
      commands: {
        compile({ data, input }) {
          data.output = String(input);

          return {
            ok: true,
            output: {
              file: data.output,
            },
          };
        },
      },
    });
    const host = createWorkflowWorkerHost({
      workflows: {
        build: workflow,
      },
    });
    const client = createWorkflowWorkerClient(
      createWorkflowWorkerTestConnection(host),
    );

    client.onSnapshot((snapshot) => snapshots.push(snapshot));

    const result = await client.run("build", "compile", "index.html");

    expect(result).toEqual(
      jasmine.objectContaining({
        ok: true,
        output: {
          file: "index.html",
        },
      }),
    );
    expect(snapshots.length).toBe(1);
    expect(client.latestSnapshot?.build.data).toEqual({
      output: "index.html",
    });
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.completed",
    ]);

    client.dispose();
  });

  it("sends workflow events through the workflow worker adapter", async () => {
    const workflow = $workflow({
      id: "worker-events",
      initial: "idle",
      data: {
        status: "idle",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.status = String(payload);
              },
            },
          },
        },
      },
    });
    const client = createWorkflowWorkerClient(
      createWorkflowWorkerTestConnection(
        createWorkflowWorkerHost({
          workflows: {
            build: workflow,
          },
        }),
      ),
    );

    await expectAsync(
      client.send("build", "start", "building").then((result) => result.ok),
    ).toBeResolvedTo(true);
    expect(workflow.current).toBe("running");
    expect(workflow.data.status).toBe("building");
    expect(client.latestSnapshot?.build.current).toBe("running");

    client.dispose();
  });

  it("restores worker-hosted workflows from supervisor snapshots after restart", async () => {
    const firstWorkflow = $workflow({
      id: "worker-restart-build",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
      commands: {
        compile({ data, input }) {
          data.output = String(input);

          return {
            ok: true,
          };
        },
      },
    });
    const firstClient = createWorkflowWorkerClient(
      createWorkflowWorkerTestConnection(
        createWorkflowWorkerHost({
          workflows: {
            build: firstWorkflow,
          },
        }),
      ),
    );

    await firstClient.run("build", "compile", "restart.html");

    const workerSnapshot = await firstClient.snapshot();
    const supervisorSnapshot: ng.WorkflowSupervisorSnapshot = {
      version: 1,
      id: "worker-supervisor",
      status: "idle",
      workflows: workerSnapshot,
      diagnostics: [],
      updatedAt: Date.now(),
    };
    const restartedWorkflow = $workflow({
      id: "worker-restart-build",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
    });
    const restartedClient = createWorkflowWorkerClient(
      createWorkflowWorkerTestConnection(
        createWorkflowWorkerHost({
          workflows: {
            build: restartedWorkflow,
          },
        }),
      ),
    );

    const restored = await restartedClient.restore(supervisorSnapshot);

    expect(restored.build.data).toEqual({
      output: "restart.html",
    });
    expect(restartedWorkflow.data.output).toBe("restart.html");
    expect(restartedClient.latestSnapshot?.build.data).toEqual({
      output: "restart.html",
    });

    firstClient.dispose();
    restartedClient.dispose();
  });

  it("validates workflow worker host and client contracts", async () => {
    const workflow = $workflow({
      id: "worker-contracts",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
    });

    expect(() =>
      createWorkflowWorkerHost(null as WorkflowWorkerHostConfig),
    ).toThrowError("Workflow worker host requires a config object.");
    expect(() =>
      createWorkflowWorkerHost({
        workflows: null,
      } as WorkflowWorkerHostConfig),
    ).toThrowError("Workflow worker host requires workflows.");
    expect(() =>
      createWorkflowWorkerHost({
        workflows: {
          "": workflow,
        },
      }),
    ).toThrowError("Workflow worker host workflow names must be non-empty.");
    expect(() =>
      createWorkflowWorkerHost({
        workflows: {
          build: {},
        },
      } as WorkflowWorkerHostConfig),
    ).toThrowError(
      "Workflow worker host workflows must be workflow instances.",
    );
    expect(() =>
      createWorkflowWorkerClient(null as ng.WorkerConnection),
    ).toThrowError("Workflow worker client requires a WorkerConnection.");

    const host = createWorkflowWorkerHost({
      workflows: {
        build: workflow,
      },
    });
    const post = jasmine.createSpy("post");

    await host.handle(null, post);

    expect(post).not.toHaveBeenCalled();
  });

  it("handles workflow worker failure, disposal, and snapshot edges", async () => {
    const workflow = $workflow({
      id: "worker-edge-build",
      initial: "idle",
      data: {
        status: "idle",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.status = "running";
              },
            },
          },
        },
      },
    });
    const quietConnection = createWorkflowWorkerTestConnection(
      createWorkflowWorkerHost({
        publishSnapshots: false,
        workflows: {
          build: workflow,
        },
      }),
    );
    const quietClient = createWorkflowWorkerClient(quietConnection);
    const snapshots: Array<Record<string, ng.WorkflowSnapshot<object>>> = [];
    const unsubscribe = quietClient.onSnapshot((snapshot) => {
      snapshots.push(snapshot);
    });

    await expectAsync(
      quietClient.send("build", "start").then((result) => result.ok),
    ).toBeResolvedTo(true);
    expect(snapshots).toEqual([]);
    expect(quietClient.latestSnapshot).toBeUndefined();

    quietConnection.dispatch({
      type: "angular-ts:workflow-worker:snapshot",
      snapshot: {
        build: workflow.snapshot(),
      },
    });
    unsubscribe();
    quietConnection.dispatch({
      type: "angular-ts:workflow-worker:snapshot",
      snapshot: {
        build: workflow.snapshot(),
      },
    });

    expect(snapshots.length).toBe(1);

    const previousMessage = jasmine.createSpy("previousMessage");
    const failingListeners = new Set<
      (data: unknown, event: MessageEvent) => void
    >();
    const dispatchFailingMessage = (data: unknown) => {
      const event = { data } as MessageEvent;

      for (const listener of failingListeners) {
        listener(data, event);
      }

      return event;
    };
    const failingConnection: ng.WorkerConnection = {
      postMessage(data) {
        const request = data as WorkflowWorkerRequest;

        dispatchFailingMessage({
          type: "angular-ts:workflow-worker:response",
          id: request.id,
          ok: false,
        });
      },
      onMessage(listener) {
        failingListeners.add(listener);

        return () => failingListeners.delete(listener);
      },
      restart() {
        return undefined;
      },
      terminate() {
        return undefined;
      },
    };
    failingConnection.onMessage(previousMessage);
    const failingClient = createWorkflowWorkerClient(failingConnection);

    dispatchFailingMessage({
      type: "angular-ts:workflow-worker:response",
      id: "unknown",
      ok: true,
    });
    const passthroughEvent = dispatchFailingMessage("passthrough");

    await expectAsync(failingClient.snapshot()).toBeRejectedWithError(
      "Workflow worker request failed.",
    );
    expect(previousMessage).toHaveBeenCalledWith(
      "passthrough",
      passthroughEvent,
    );

    const hostClient = createWorkflowWorkerClient(
      createWorkflowWorkerTestConnection(
        createWorkflowWorkerHost({
          workflows: {
            build: workflow,
          },
        }),
      ),
    );

    await expectAsync(hostClient.run("missing", "compile")).toBeResolvedTo(
      jasmine.objectContaining({
        ok: false,
        diagnostics: [
          jasmine.objectContaining({
            code: "workflowWorker.missingWorkflow",
          }),
        ],
      }),
    );
    await expectAsync(hostClient.run("", "compile")).toBeResolvedTo(
      jasmine.objectContaining({
        ok: false,
        diagnostics: [
          jasmine.objectContaining({
            code: "workflowWorker.missingWorkflow",
            message: "Workflow worker host requires a workflow name.",
          }),
        ],
      }),
    );
    await expectAsync(hostClient.run("build", "")).toBeResolvedTo(
      jasmine.objectContaining({
        ok: false,
        diagnostics: [
          jasmine.objectContaining({
            code: "workflowWorker.invalidCommand",
          }),
        ],
      }),
    );
    await expectAsync(
      hostClient.send("missing", "start").then((result) => result.ok),
    ).toBeResolvedTo(false);
    await expectAsync(
      hostClient.send("build", "").then((result) => result.ok),
    ).toBeResolvedTo(false);
    await expectAsync(
      hostClient
        .send("build", null as unknown as string)
        .then((result) => result.type),
    ).toBeResolvedTo("");
    await expectAsync(
      hostClient.restore({
        build: workflow.snapshot(),
        ghost: workflow.snapshot(),
      }),
    ).toBeResolvedTo(
      jasmine.objectContaining({
        build: jasmine.objectContaining({
          id: "worker-edge-build",
        }),
      }),
    );
    await expectAsync(hostClient.restore(null)).toBeRejectedWithError(
      "Workflow worker restore requires a snapshot object.",
    );

    const pendingConnection: ng.WorkerConnection = {
      postMessage() {
        return undefined;
      },
      onMessage() {
        return () => undefined;
      },
      restart() {
        return undefined;
      },
      terminate() {
        return undefined;
      },
    };
    const pendingClient = createWorkflowWorkerClient(pendingConnection);
    const pendingSnapshot = pendingClient.snapshot();

    pendingClient.dispose();

    await expectAsync(pendingSnapshot).toBeRejectedWithError(
      "Workflow worker client is disposed.",
    );
    await expectAsync(pendingClient.snapshot()).toBeRejectedWithError(
      "Workflow worker client is disposed.",
    );

    quietClient.dispose();
    failingClient.dispose();
    hostClient.dispose();
  });

  it("runs commands through stable history and diagnostics boundaries", async () => {
    const workflow = $workflow({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
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
      status: "completed",
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
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
      status: "rejected",
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
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
      status: "cancelled",
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

  it("cancels immediately when the provided signal is already aborted", async () => {
    let ran = false;
    const controller = new AbortController();
    const workflow = $workflow({
      id: "pre-aborted",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
      commands: {
        build() {
          ran = true;

          return {
            ok: true,
          };
        },
      },
    });

    controller.abort();

    const result = await workflow.run("build", undefined, {
      signal: controller.signal,
    });

    expect(ran).toBe(false);
    expect(result).toEqual({
      ok: false,
      status: "cancelled",
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandCancelled",
          command: "build",
        }),
      ],
    });
  });

  it("records cleanup failures as diagnostics", async () => {
    const workflow = $workflow({
      id: "cleanup-failure",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
      commands: {
        build({ cleanup }) {
          cleanup(() => {
            throw new Error("cleanup exploded");
          });

          return {
            ok: true,
          };
        },
      },
    });

    const result = await workflow.run("build");

    expect(result.ok).toBe(true);
    expect(workflow.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflow.cleanupFailed",
        message: "cleanup exploded",
        command: "build",
      }),
    ]);
  });

  it("protects workflow data and nested commands after a command has finished", async () => {
    let capturedWorkflow: ng.Workflow;
    let capturedData: {
      value: string;
      nested: {
        count: number;
      };
    };
    const workflow = $workflow({
      id: "post-finish-proxy",
      initial: "idle",
      data: {
        value: "initial",
        nested: {
          count: 0,
        },
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.value = "running";
              },
            },
          },
        },
      },
      commands: {
        capture({ workflow: commandWorkflow, data }) {
          capturedWorkflow = commandWorkflow;
          capturedData = data;
          data.value = "during";

          return {
            ok: true,
          };
        },
        nested() {
          return {
            ok: true,
          };
        },
      },
    });

    await workflow.run("capture");

    capturedData!.value = "after";
    capturedData!.nested.count = 1;
    delete capturedData!.nested.count;
    Object.defineProperty(capturedData!, "extra", {
      value: true,
      configurable: true,
    });
    Object.setPrototypeOf(capturedData!, { changed: true });

    const sent = capturedWorkflow!.send("start");
    const invalidSent = capturedWorkflow!.send(null as unknown as string);
    const nestedRun = await capturedWorkflow!.run("nested");
    const nestedRetry = await capturedWorkflow!.retry("nested");

    expect(workflow.current).toBe("idle");
    expect(workflow.data).toEqual({
      value: "during",
      nested: {
        count: 0,
      },
    });
    expect(sent.ok).toBe(false);
    expect(invalidSent.type).toBe("");
    expect(nestedRun.diagnostics[0].code).toBe("workflow.commandCancelled");
    expect(nestedRetry.diagnostics[0].code).toBe("workflow.commandCancelled");
  });

  it("proxies Map and Set workflow data during commands", async () => {
    let capturedData: {
      map: Map<string, { count: number }>;
      set: Set<string>;
    };
    const workflow = $workflow({
      id: "map-set-proxy",
      initial: "idle",
      data: {
        map: new Map<string, { count: number }>([["item", { count: 1 }]]),
        set: new Set<string>(["one"]),
      },
      states: {
        idle: {},
      },
      commands: {
        inspect({ data }) {
          capturedData = data;
          expect(data.map.size).toBe(1);
          expect(data.map.get("item")!.count).toBe(1);
          data.map.get("item")!.count = 2;
          expect(data.map.has("item")).toBe(true);
          expect(Array.from(data.map.keys())).toEqual(["item"]);
          expect(data.map.set("next", { count: 3 })).toBe(data.map);
          expect(data.map.delete("missing")).toBe(false);
          expect(data.set.size).toBe(1);
          expect(data.set.has("one")).toBe(true);
          expect(data.set.add("two")).toBe(data.set);
          expect(data.set.delete("missing")).toBe(false);

          return "ok";
        },
      },
    });

    const result = await workflow.run("inspect");

    expect(result).toEqual({
      ok: true,
      status: "completed",
      output: "ok",
    });
    expect(workflow.data.map.get("item")!.count).toBe(2);
    expect(workflow.data.map.get("next")!.count).toBe(3);
    expect(workflow.data.set.has("two")).toBe(true);

    expect(capturedData!.map.set("late", { count: 4 })).toBe(capturedData!.map);
    expect(capturedData!.map.delete("item")).toBe(false);
    capturedData!.map.clear();
    expect(capturedData!.set.add("late")).toBe(capturedData!.set);
    expect(capturedData!.set.delete("one")).toBe(false);
    capturedData!.set.clear();

    expect(workflow.data.map.has("late")).toBe(false);
    expect(workflow.data.map.has("item")).toBe(true);
    expect(workflow.data.set.has("late")).toBe(false);
    expect(workflow.data.set.has("one")).toBe(true);
  });

  it("proxies array workflow data during commands", async () => {
    let capturedItems: string[] | undefined;
    const workflow = $workflow({
      id: "array-proxy",
      initial: "idle",
      data: {
        items: ["one"],
      },
      states: {
        idle: {},
      },
      commands: {
        append({ data }) {
          capturedItems = data.items;
          data.items.push("two");

          return data.items.join(",");
        },
      },
    });

    const result = await workflow.run("append");

    expect(result).toEqual({
      ok: true,
      status: "completed",
      output: "one,two",
    });
    expect(workflow.data.items).toEqual(["one", "two"]);

    capturedItems!.push("late");

    expect(workflow.data.items).toEqual(["one", "two"]);
  });

  it("leaves non-plain workflow data values unproxied during commands", async () => {
    class Counter {
      constructor(public value: number) {}

      increment(): number {
        this.value += 1;

        return this.value;
      }
    }

    let capturedCounter: Counter | undefined;
    const workflow = $workflow({
      id: "class-value-proxy",
      initial: "idle",
      data: {
        counter: new Counter(1),
      },
      states: {
        idle: {},
      },
      commands: {
        increment({ data }) {
          capturedCounter = data.counter;

          return data.counter.increment();
        },
      },
    });

    const result = await workflow.run("increment");

    expect(result).toEqual({
      ok: true,
      status: "completed",
      output: 2,
    });
    expect(capturedCounter).toBeInstanceOf(Counter);
    expect(workflow.data.counter.value).toBe(2);
  });

  it("times out commands that ignore abort signals", async () => {
    const workflow = $workflow({
      id: "timeout",
      commandTimeout: 1,
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
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
      status: "timeout",
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
      states: {
        idle: {},
      },
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
    } as WorkflowCommandOptions);
    const invalidTimeout = await workflow.run("build", undefined, {
      timeout: -1,
    });
    const invalidSignal = await workflow.run("build", undefined, {
      signal: {} as AbortSignal,
    });

    expect(invalidConcurrency).toEqual({
      ok: false,
      status: "rejected",
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
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
      status: "cancelled",
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandCancelled",
          command: "build",
        }),
      ],
    });
    expect(secondResult).toEqual({
      ok: false,
      status: "cancelled",
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
      states: {
        idle: {},
      },
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

  it("normalizes bare and explicitly failed command results", async () => {
    const workflow = $workflow({
      id: "failure-results",
      initial: "idle",
      data: {},
      states: { idle: {} },
      commands: {
        bare() {
          return { ok: false };
        },
        explicit() {
          return {
            ok: false,
            status: "failed",
            diagnostics: [
              {
                code: "build.failed",
                message: "Build failed.",
              },
            ],
          };
        },
      },
    });

    const bare = await workflow.run("bare");
    const explicit = await workflow.run("explicit");

    expect(bare).toEqual({
      ok: false,
      status: "failed",
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.commandFailed",
        }),
      ],
    });
    expect(explicit).toEqual({
      ok: false,
      status: "failed",
      diagnostics: [
        jasmine.objectContaining({
          code: "build.failed",
        }),
      ],
    });
  });

  it("returns stable diagnostics for invalid or missing commands", async () => {
    const workflow = $workflow({
      id: "diagnostics",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
    });

    const invalid = await workflow.run("");
    const missing = await workflow.run("publish");

    expect(invalid).toEqual({
      ok: false,
      status: "rejected",
      diagnostics: [
        jasmine.objectContaining({
          code: "workflow.invalidCommand",
          recoverable: true,
        }),
      ],
    });
    expect(missing).toEqual({
      ok: false,
      status: "rejected",
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

  it("does not treat empty retry or cancel command names as wildcards", async () => {
    let resolveBuild: (() => void) | undefined;
    const workflow = $workflow({
      id: "empty-command-boundaries",
      initial: "idle",
      data: {},
      states: {
        idle: {},
      },
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

    expect(workflow.cancel("")).toBe(0);
    expect(retry).toEqual({
      ok: false,
      status: "rejected",
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
      states: {
        running: {
          on: {
            stop: {
              to: "idle",
            },
          },
        },
      },
    });

    expect(workflow.send("stop").ok).toBe(false);
    expect(workflow.current).toBe("idle");
    expect(workflow.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflow.invalidTransition",
        recoverable: true,
        detail: jasmine.objectContaining({
          current: "idle",
          status: "missing-transition",
          type: "stop",
          payload: undefined,
        }),
      }),
    ]);
  });

  it("reports state-tree guard denial from the default machine engine", () => {
    const workflow = $workflow({
      id: "state-transition-diagnostics",
      initial: "idle",
      data: {
        allowed: false,
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              guard({ data }) {
                return data.allowed;
              },
            },
          },
        },
        running: {},
      },
    });

    expect(workflow.send("start").ok).toBe(false);
    expect(workflow.current).toBe("idle");
    expect(workflow.diagnostics).toEqual([
      jasmine.objectContaining({
        code: "workflow.invalidTransition",
        recoverable: true,
        detail: jasmine.objectContaining({
          current: "idle",
          status: "guard-denied",
          type: "start",
          payload: undefined,
        }),
      }),
    ]);
  });

  it("runs commands through a custom workflow state engine", async () => {
    const events: string[] = [];
    let current = "idle";
    const engineData = {
      count: 0,
      output: "",
    };
    const workflow = $workflow({
      id: "custom-engine",
      initial: "idle",
      data: engineData,
      states: {
        idle: {},
      },
      stateEngine() {
        return {
          get current() {
            return current;
          },
          get data() {
            return engineData;
          },
          send(type, payload) {
            const from = current;
            events.push(type);

            if (current === "idle" && type === "start") {
              current = "running";
              engineData.count += 1;

              return {
                ok: true,
                status: "transitioned",
                type,
                from,
                to: current,
                data: engineData,
                payload,
              };
            }

            if (current === "running" && type === "complete") {
              current = "complete";
              engineData.output = payload.output;

              return {
                ok: true,
                status: "transitioned",
                type,
                from,
                to: current,
                data: engineData,
                payload,
              };
            }

            return {
              ok: false,
              status: "missing-transition",
              type,
              from,
              to: current,
              data: engineData,
              payload,
            };
          },
          can(type) {
            return (
              (current === "idle" && type === "start") ||
              (current === "running" && type === "complete")
            );
          },
          matches(mode) {
            return current === mode;
          },
          snapshot() {
            return {
              current,
              data: structuredClone(engineData),
            };
          },
          restore(snapshot) {
            current = snapshot.current;
            engineData.count = snapshot.data.count;
            engineData.output = snapshot.data.output;
          },
        };
      },
      commands: {
        build({ data, input, workflow: currentWorkflow }) {
          data.output = String(input);
          currentWorkflow.send("start");
          currentWorkflow.send("complete", { output: data.output });

          return {
            ok: true,
            output: {
              file: data.output,
            },
          };
        },
      },
    });

    expect(workflow.can("start")).toBe(true);

    const result = await workflow.run("build", "index.html");

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.output).toEqual({
        file: "index.html",
      });
    }
    expect(events).toEqual(["start", "complete"]);
    expect(workflow.matches("complete")).toBe(true);
    expect(workflow.data).toBe(engineData);
    expect(workflow.data.count).toBe(1);
    expect(workflow.history.map((entry) => entry.type)).toEqual([
      "command.started",
      "command.completed",
    ]);

    const snapshot = workflow.snapshot();

    engineData.output = "changed.html";
    workflow.restore(snapshot);

    expect(workflow.current).toBe("complete");
    expect(workflow.data.output).toBe("index.html");
  });

  it("bounds diagnostics with a configurable limit", async () => {
    const workflow = $workflow({
      id: "bounded-diagnostics",
      diagnosticLimit: 2,
      initial: "idle",
      data: {},
      states: {
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
      states: {
        idle: {},
      },
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
      status: "completed",
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
    });

    const result = await workflow.retry("publish");

    expect(result).toEqual({
      ok: false,
      status: "rejected",
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

  it("runs the same command again with explicit input", async () => {
    const workflow = $workflow({
      id: "repeat",
      initial: "idle",
      data: {
        files: [] as string[],
      },
      states: {
        idle: {},
      },
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
    const repeated = await workflow.run("publish", "index.html");

    expect(first.ok).toBe(true);
    expect(repeated).toEqual({
      ok: true,
      status: "completed",
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

  it("uses configured repair commands without deleting failure evidence", async () => {
    const workflow = $workflow({
      id: "repair",
      initial: "idle",
      data: {
        title: "",
        repaired: false,
      },
      states: {
        idle: {
          on: {
            validate: {
              update(context) {
                const nextMode = context.data.title ? "complete" : "failed";
                if (typeof nextMode === "string" && nextMode) {
                  context.to = nextMode;
                }
              },
            },
          },
        },
        failed: {
          on: {
            reset: {
              to: "idle",
            },
            complete: {
              to: "complete",
            },
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
    expect(reset.ok).toBe(true);
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.count += 1;
              },
            },
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
      states: {
        idle: {
          on: {
            fail: {
              to: "failed",
            },
          },
        },
        failed: {
          on: {
            complete: {
              to: "complete",
            },
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
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
      states: {
        idle: {},
      },
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

    const repeated = await workflow.run("publish", "restored.html");

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
    expect(repeated.ok).toBe(true);
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
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.runs += 1;
              },
            },
          },
        },
      },
    });

    const injector = createInjector(["workflowNamedApp"]);
    const first = injector.get("docsWorkflow");
    const second = injector.get("docsWorkflow");

    expect(first).toBe(second);
    expect(first.send("start").ok).toBe(true);
    expect(second.current).toBe("running");
    expect(second.data.runs).toBe(1);
  });

  it("registers named workflow supervisors as singleton injectables", async () => {
    window.angular
      .module("workflowSupervisorNamedApp", ["ng"])
      .workflowSupervisor("docsSupervisor", {
        id: "docs-supervisor",
        workflows: {
          build: {
            id: "docs-supervisor-build",
            initial: "idle",
            data: {
              runs: 0,
            },
            states: {
              idle: {},
            },
            commands: {
              build({ data, input }) {
                data.runs += 1;

                return {
                  ok: true,
                  output: {
                    file: String(input),
                  },
                };
              },
            },
          },
        },
      });

    const injector = createInjector(["workflowSupervisorNamedApp"]);
    const first = injector.get("docsSupervisor") as ng.WorkflowSupervisor;
    const second = injector.get("docsSupervisor") as ng.WorkflowSupervisor;

    const result = await first.workflow("build").run("build", "index.html");

    expect(first).toBe(second);
    expect(result).toEqual(
      jasmine.objectContaining({
        ok: true,
        output: {
          file: "index.html",
        },
      }),
    );
    expect(second.workflow("build").data.runs).toBe(1);
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
        states: {
          setup: {
            on: {
              wait: {
                to: "waiting",
                update({ data, payload, workflow }) {
                  data.status = "waiting";
                },
              },
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
    const rootScope = injector.get("$rootScope") as ng.Scope;

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

  it("replaces workflow progress and recovery UI as bounded fragments", async () => {
    const workflow = $workflow({
      id: "publish",
      initial: "idle",
      data: {
        step: "draft",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data, payload, workflow }) {
                data.step = "uploading";
              },
            },
          },
        },
        running: {
          on: {
            fail: {
              to: "failed",
              update({ data, payload, workflow }) {
                data.step = "recover";
              },
            },
          },
        },
        failed: {
          on: {
            retry: {
              to: "running",
              update({ data, payload, workflow }) {
                data.step = "uploading";
              },
            },
          },
        },
      },
    });
    const shell = document.createElement("section");
    const stable = document.createElement("strong");
    const target = document.createElement("div");

    stable.className = "stable";
    stable.textContent = "Shell";
    shell.append(stable, target);
    $rootScope.workflow = workflow;

    const host = createWorkflowUiFragmentHost({
      compile: $compile,
      scope: $rootScope,
      target,
    });
    const progress = host.render(
      '<p class="progress">{{ workflow.current }}:{{ workflow.data.step }}</p>',
    );
    const progressNode = progress.nodes[0];

    await wait();

    expect(target.querySelector(".progress")?.textContent).toBe("idle:draft");
    expect(shell.querySelector(".stable")).toBe(stable);

    workflow.send("start");
    await wait();

    expect(target.querySelector(".progress")?.textContent).toBe(
      "running:uploading",
    );

    const snapshot = workflow.snapshot();

    workflow.send("fail");
    const recovery = host.render(
      '<button class="recovery">{{ workflow.diagnostics.length }}:{{ workflow.data.step }}</button>',
    );

    await wait();

    expect(progress.disposed).toBe(true);
    expect(getCompiledFragmentRecord(progressNode)).toBeUndefined();
    expect(target.querySelector(".recovery")?.textContent).toBe("0:recover");

    workflow.restore(snapshot);
    const resumed = host.render(
      '<p class="resumed">{{ workflow.current }}:{{ workflow.data.step }}</p>',
    );

    await wait();

    expect(recovery.disposed).toBe(true);
    expect(host.current).toBe(resumed);
    expect(target.querySelector(".resumed")?.textContent).toBe(
      "running:uploading",
    );
    expect(shell.querySelector(".stable")).toBe(stable);
  });

  it("disposes workflow UI fragments without cancelling workflow commands", async () => {
    let complete!: () => void;
    const commandGate = new Promise<void>((resolve) => {
      complete = resolve;
    });
    const workflow = $workflow({
      id: "approval",
      initial: "waiting",
      data: {
        approved: false,
      },
      states: {
        waiting: {
          on: {
            approve: {
              to: "approved",
              update({ data, payload, workflow }) {
                data.approved = true;
              },
            },
          },
        },
      },
      commands: {
        async approve({ workflow: currentWorkflow }) {
          await commandGate;
          currentWorkflow.send("approve");

          return "approved";
        },
      },
    });
    const target = document.createElement("div");

    $rootScope.workflow = workflow;

    const host = createWorkflowUiFragmentHost({
      compile: $compile,
      scope: $rootScope,
      target,
    });
    const fragment = host.render(
      '<p class="approval">{{ workflow.current }}</p>',
    );
    const command = workflow.run("approve");

    host.dispose();

    expect(fragment.disposed).toBe(true);
    expect(target.childNodes.length).toBe(0);

    complete();

    const result = await command;

    expect(result.ok).toBe(true);
    expect(workflow.current).toBe("approved");
    expect(workflow.data.approved).toBe(true);
  });

  it("ignores late workflow UI fragment DOM work after binding disposal", () => {
    const workflow = $workflow({
      id: "diagnostics",
      initial: "idle",
      data: {
        value: "ready",
      },
      states: {
        idle: {},
      },
    });
    const target = document.createElement("div");

    $rootScope.workflow = workflow;

    const host = createWorkflowUiFragmentHost({
      compile: $compile,
      scope: $rootScope,
      target,
    });
    const fragment = host.render(
      '<p class="diagnostic">{{ workflow.data.value }}</p>',
    );
    let rendered = false;

    host.dispose();

    const scheduled = scheduleCompiledFragmentDomWork(fragment, () => {
      rendered = true;
    });

    expect(scheduled).toBe(false);
    expect(rendered).toBe(false);
    expect(workflow.data.value).toBe("ready");
  });

  it("owns workflow UI fragments through scope destruction", () => {
    const scope = $rootScope.$new();
    const target = document.createElement("div");
    const host = createWorkflowUiFragmentHost({
      compile: $compile,
      scope,
      target,
    });
    const fragment = host.render('<p class="owned">owned</p>');

    scope.$destroy();

    expect(fragment.disposed).toBe(true);
    expect(host.current).toBeNull();
    expect(target.childNodes.length).toBe(0);

    host.dispose();
    expect(() => host.render("<p>late</p>")).toThrowError(
      "Cannot render a disposed workflow UI fragment host.",
    );
  });

  it("accepts a compiler that returns one linked fragment node", () => {
    const target = document.createElement("div");
    const singleNodeCompile = (template) => {
      const link = $compile(template);

      return (scope) => {
        const linked = link(scope);

        return Array.isArray(linked) ? linked[0] : linked;
      };
    };
    const host = createWorkflowUiFragmentHost({
      compile: singleNodeCompile,
      scope: $rootScope,
      target,
    });
    const fragment = host.render('<p class="single">single</p>');

    expect(fragment.nodes.length).toBe(1);
    expect(target.querySelector(".single")?.textContent).toBe("single");

    const arrayTarget = document.createElement("div");
    const arrayCompile = (template) => {
      const link = $compile(template);

      return (scope) => {
        const linked = link(scope);

        return Array.isArray(linked) ? linked : [linked];
      };
    };
    const arrayHost = createWorkflowUiFragmentHost({
      compile: arrayCompile,
      scope: $rootScope,
      target: arrayTarget,
    });
    const arrayFragment = arrayHost.render('<p class="array">array</p>');

    expect(arrayFragment.nodes.length).toBe(1);
    expect(arrayTarget.querySelector(".array")?.textContent).toBe("array");
  });

  it("rejects compiler output without fragment ownership", () => {
    const target = document.createElement("div");
    const host = createWorkflowUiFragmentHost({
      compile: () => () => document.createElement("p"),
      scope: $rootScope,
      target,
    });

    expect(() => host.render("ignored")).toThrowError(
      "Workflow UI fragment host requires a compiled fragment.",
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
        states: {
          idle: {
            on: {
              start: {
                to: "running",
                update({ data, payload, workflow }) {
                  data.status = "running";
                },
              },
            },
          },
          running: {
            on: {
              complete: {
                to: "complete",
                update({ data, payload: output, workflow }) {
                  data.status = "complete";
                  data.output = output;
                },
              },
              fail: {
                to: "failed",
                update({ data, payload: reason, workflow }) {
                  data.status = reason;
                },
              },
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
        status: "completed",
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
          states: {
            idle: {
              on: {
                start: {
                  to: "running",
                  update({ data, payload, workflow }) {
                    data.runs += 1;
                  },
                },
              },
            },
          },
        });

      const injector = createInjector(["workflowDocsNamedApp"]);
      const docsWorkflow = injector.get("docsWorkflow");

      expect(docsWorkflow.send("start").ok).toBe(true);
      expect(docsWorkflow.current).toBe("running");
      expect(docsWorkflow.data.runs).toBe(1);
    });

    it("runs the command diagnostics example", async () => {
      const workflow = $workflow({
        id: "diagnostics-example",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
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
        states: {
          idle: {
            on: {
              fail: {
                to: "failed",
              },
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

    it("runs the retry and explicit rerun examples", async () => {
      let attempts = 0;
      const workflow = $workflow({
        id: "retry-repeat",
        initial: "idle",
        data: {
          files: [] as string[],
        },
        states: {
          idle: {},
        },
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
      const repeatedResult = await workflow.run("publish", "index.html");

      expect(retryResult.ok).toBe(true);
      expect(repeatedResult.ok).toBe(true);
      expect(workflow.data.files).toEqual(["index.html", "index.html"]);
    });

    it("runs the repair command example", async () => {
      const workflow = $workflow({
        id: "repairable-docs",
        initial: "idle",
        data: {
          title: "",
        },
        states: {
          idle: {
            on: {
              validate: {
                update(context) {
                  const nextMode = context.data.title ? "complete" : "failed";
                  if (typeof nextMode === "string" && nextMode) {
                    context.to = nextMode;
                  }
                },
              },
            },
          },
          failed: {
            on: {
              complete: {
                to: "complete",
              },
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
