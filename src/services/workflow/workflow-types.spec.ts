/// <reference types="jasmine" />
import {
  createWorkflowWorkerClient,
  createWorkflowWorkerHost,
  defineCommand,
  defineWorkflow,
} from "./workflow.ts";
import type {
  Workflow,
  WorkflowCommand,
  WorkflowCommandMap,
  WorkflowCommandContext,
  WorkflowCommandResult,
  WorkflowCommandStatus,
  WorkflowConfig,
  WorkflowDiagnostic,
  WorkflowNoCommands,
  WorkflowNoEvents,
  WorkflowService,
  WorkflowSendResult,
  WorkflowSnapshot,
  WorkflowStateEngine,
  WorkflowStateEngineContext,
  WorkflowStateEngineFactory,
  WorkflowStateEngineSnapshot,
  WorkflowSupervisor,
  WorkflowSupervisorConfig,
  WorkflowSupervisorDiagnostic,
  WorkflowSupervisorIndexedDbPersistenceConfig,
  WorkflowSupervisorPersistence,
  WorkflowSupervisorPersistencePolicy,
  WorkflowSupervisorRecoveryPolicy,
  WorkflowSupervisorSnapshot,
  WorkflowSupervisorStatus,
  WorkflowWorkerClient,
  WorkflowWorkerHost,
  WorkflowWorkerHostConfig,
  WorkflowWorkerMessage,
  WorkflowWorkerRequest,
  WorkflowWorkerRequestOperation,
  WorkflowWorkerResponse,
  WorkflowWorkerSnapshotMessage,
} from "./workflow.ts";

interface BuildData {
  output: string;
  error: string;
}

interface BuildEvents {
  start: undefined;
  complete: { output: string };
  fail: string;
}

interface BuildCommands {
  build: WorkflowCommand<string, { file: string }, BuildData, BuildEvents>;
}

interface PipelineCommands {
  build: WorkflowCommand<string, { file: string }, BuildData, BuildEvents>;
  publish: WorkflowCommand<
    { file: string },
    { url: string },
    BuildData,
    BuildEvents
  >;
}

describe("$workflow types", () => {
  it("limits command statuses to settled outcomes", () => {
    const completed: WorkflowCommandStatus = "completed";
    const cancelled: WorkflowCommandStatus = "cancelled";
    const invalidResult: WorkflowCommandResult = {
      ok: false,
      // @ts-expect-error queued work settles before run returns a result.
      status: "queued",
      diagnostics: [],
    };

    expect(completed).toBe("completed");
    expect(cancelled).toBe("cancelled");
    expect(invalidResult.ok).toBeFalse();
  });

  it("infers direct command-map input and output without command map generics", async () => {
    const workflowService = null as unknown as WorkflowService;
    const config = defineWorkflow({
      id: "direct-inferred-command",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build({ input }: WorkflowCommandContext<string>) {
          return {
            file: input,
          };
        },
      },
    });
    const workflow = workflowService(config);
    const result = await workflow.run("build", "index.html");

    // @ts-expect-error inferred direct commands preserve input type.
    workflow.run("build", 123);
    // @ts-expect-error inferred direct command maps reject unknown commands.
    workflow.run("publish", "index.html");

    if (result.ok) {
      const file: string | undefined = result.output?.file;
      // @ts-expect-error inferred direct commands preserve output type.
      const wrongFile: number | undefined = result.output?.file;

      void file;
      void wrongFile;
    }

    expect(result.ok).toBe(true);
  });

  it("infers simple command input and output without defineCommand generic lists", async () => {
    const workflowService = null as unknown as WorkflowService;
    const buildCommand = defineCommand(
      ({ input }: WorkflowCommandContext<string>) => {
        return {
          file: input,
        };
      },
    );
    type InferredCommands = {
      build: typeof buildCommand;
    };
    const config = defineWorkflow<
      { output: string },
      WorkflowNoEvents,
      InferredCommands
    >({
      id: "inferred-command",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build: buildCommand,
      },
    });
    const workflow = workflowService(config);
    const result = await workflow.run("build", "index.html");

    // @ts-expect-error build requires string input inferred from the context.
    workflow.run("build", 123);
    // @ts-expect-error inferred workflows reject unknown command names.
    workflow.run("publish", "index.html");

    if (result.ok) {
      const file: string | undefined = result.output?.file;
      // @ts-expect-error inferred command output preserves the file type.
      const wrongFile: number | undefined = result.output?.file;

      void file;
      void wrongFile;
    }

    expect(result.ok).toBe(true);
  });

  it("uses one context-object command definition", async () => {
    const workflowService = null as unknown as WorkflowService;
    const buildCommand = defineCommand<
      string,
      { file: string },
      BuildData,
      BuildEvents
    >(({ input, ...context }) => {
      const runningCommand: string = context.command;
      const aborted: boolean = context.signal.aborted;

      context.cleanup(() => undefined);
      context.data.output = input;

      void runningCommand;
      void aborted;

      return {
        file: context.data.output,
      };
    });
    const workflow = workflowService(
      defineWorkflow<BuildData, BuildEvents, { build: typeof buildCommand }>({
        id: "context-command",
        initial: "idle",
        data: {
          output: "",
          error: "",
        },
        states: {
          idle: {},
        },
        commands: {
          build: buildCommand,
        },
      }),
    );

    const result = await workflow.run("build", "index.html");

    if (result.ok) {
      const file: string | undefined = result.output?.file;
      // @ts-expect-error context command output preserves the file type.
      const wrongFile: number | undefined = result.output?.file;

      void file;
      void wrongFile;
    }

    // @ts-expect-error context command preserves its input type.
    workflow.run("build", { file: "index.html" });

    expect(result.ok).toBe(true);
  });

  it("accepts direct context-object workflow command map handlers", async () => {
    const workflowService = null as unknown as WorkflowService;
    const config = defineWorkflow<BuildData, BuildEvents, BuildCommands>({
      id: "direct-context-command",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build({ input, data, command, signal }) {
          const fileInput: string = input;
          const commandName: string = command;
          const aborted: boolean = signal.aborted;

          data.output = fileInput;

          void commandName;
          void aborted;

          return {
            file: data.output,
          };
        },
      },
    });
    const workflow = workflowService(config);
    const result = await workflow.run("build", "index.html");

    // @ts-expect-error direct context commands preserve input type.
    workflow.run("build", 123);

    if (result.ok) {
      const file: string | undefined = result.output?.file;
      // @ts-expect-error direct context commands preserve output type.
      const wrongFile: number | undefined = result.output?.file;

      void file;
      void wrongFile;
    }

    expect(result.ok).toBe(true);
  });

  it("typechecks strict workflow definitions by default", async () => {
    const workflowService = null as unknown as WorkflowService;
    const strictConfig = defineWorkflow<BuildData, BuildEvents, BuildCommands>({
      id: "docs-build",
      diagnosticLimit: 100,
      historyLimit: 100,
      initial: "idle",
      data: {
        output: "",
        error: "",
      } satisfies BuildData,
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {
          on: {
            complete: {
              to: "complete",
              update({ data, payload }) {
                data.output = payload.output;
              },
            },
          },
        },
        complete: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          ({ input, cleanup, command, data, signal }) => {
            const runningCommand: string = command;
            const aborted: boolean = signal.aborted;

            cleanup(() => undefined);
            data.output = input;

            void runningCommand;
            void aborted;

            return {
              ok: true,
              output: {
                file: data.output,
              },
            };
          },
        ),
      },
    });
    const configWithUnknownTransition = defineWorkflow<
      BuildData,
      BuildEvents,
      BuildCommands
    >({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {
          on: {
            // @ts-expect-error strict workflow definitions reject unknown event keys.
            missing: {
              to: "running",
            },
          },
        },
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          () => ({
            ok: true,
            output: {
              file: "index.html",
            },
          }),
        ),
      },
    });
    const configWithWrongPayload = defineWorkflow<
      BuildData,
      BuildEvents,
      BuildCommands
    >({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        running: {
          on: {
            complete: {
              to: "complete",
              // @ts-expect-error complete receives an object payload, not a string.
              update({ payload }: { payload: string }) {
                void payload;
              },
            },
          },
        },
        complete: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          () => ({
            ok: true,
            output: {
              file: "index.html",
            },
          }),
        ),
      },
    });
    const commandNameConfig = defineWorkflow<
      BuildData,
      BuildEvents,
      BuildCommands
    >({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          ({ input, command }) => {
            const name: string = command;

            void name;

            return {
              ok: true,
              output: {
                file: input,
              },
            };
          },
        ),
      },
    });
    const strictWorkflow = workflowService(strictConfig);
    const noCommandWorkflow = workflowService(
      defineWorkflow({
        id: "empty",
        initial: "idle",
        data: {},
        states: {
          idle: {},
        },
      }),
    );
    const result = await strictWorkflow.run("build", "index.html");
    const currentMode: string = strictWorkflow.current;

    strictWorkflow.send("start");
    strictWorkflow.send("complete", { output: "site" });
    strictWorkflow.cancel("build");
    strictWorkflow.run("build", "index.html", {
      concurrency: "reject",
      signal: new AbortController().signal,
      timeout: 1000,
    });
    // @ts-expect-error build requires string input.
    strictWorkflow.run("build", 123);
    // @ts-expect-error workflow run options reject unknown concurrency policies.
    strictWorkflow.run("build", "index.html", { concurrency: "drop" });
    // @ts-expect-error strict workflows reject unknown command names.
    strictWorkflow.run("missing", "index.html");
    // @ts-expect-error strict workflows reject unknown retry command names.
    strictWorkflow.retry("missing");
    // @ts-expect-error workflow mode is readonly; use send() or restore().
    strictWorkflow.current = "running";
    // @ts-expect-error workflows without typed events expose no sends by default.
    noCommandWorkflow.send("start");
    // @ts-expect-error workflows without typed commands expose no run commands by default.
    noCommandWorkflow.run("build", "index.html");

    expect(result.ok).toBe(true);
    expect(configWithUnknownTransition.id).toBe("docs-build");
    expect(configWithWrongPayload.id).toBe("docs-build");
    expect(commandNameConfig.id).toBe("docs-build");
    expect(currentMode).toBeDefined();
  });

  it("typechecks dynamic workflow command maps with unknown input", async () => {
    const workflowService = null as unknown as WorkflowService;
    const config = defineWorkflow<
      BuildData,
      BuildEvents,
      WorkflowCommandMap<BuildData, BuildEvents>
    >({
      id: "dynamic-docs",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build: ({
          data,
          input,
        }: WorkflowCommandContext<unknown, BuildData, BuildEvents>) => {
          // @ts-expect-error dynamic command input is unknown until narrowed.
          data.output = input;

          if (typeof input === "string") {
            data.output = input;
          }

          return {
            ok: true,
            output: data.output,
          };
        },
      },
    });
    const workflow = workflowService(config);
    const result = await workflow.run("anything", { value: 1 });

    expect(result.ok).toBe(false);
  });

  it("requires declared workflow commands to be provided as callables", () => {
    const missingCommands = defineWorkflow<
      BuildData,
      BuildEvents,
      BuildCommands
      // @ts-expect-error typed command maps require a commands object.
    >({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
    });
    const nonCallableCommand = defineWorkflow<
      BuildData,
      BuildEvents,
      {
        build: string;
      }
    >({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
      commands: {
        // @ts-expect-error workflow command entries must be callable.
        build: "index.html",
      },
    });
    const incompleteCommands = defineWorkflow<
      BuildData,
      BuildEvents,
      PipelineCommands
    >({
      id: "docs-pipeline",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
      // @ts-expect-error command maps require every declared command key.
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          () => ({
            ok: true,
            output: {
              file: "index.html",
            },
          }),
        ),
      },
    });

    expect(missingCommands.id).toBe("docs-build");
    expect(nonCallableCommand.id).toBe("docs-build");
    expect(incompleteCommands.id).toBe("docs-pipeline");
  });

  it("typechecks reusable command contexts without command-map generics", () => {
    const config = defineWorkflow<BuildData, BuildEvents, PipelineCommands>({
      id: "docs-pipeline",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          ({ input, workflow, command }) => {
            const buildCommand: string = command;

            void buildCommand;

            workflow.send("start");
            workflow.run("publish", { file: input });

            return {
              ok: true,
              output: {
                file: input,
              },
            };
          },
        ),
        publish: defineCommand<
          { file: string },
          { url: string },
          BuildData,
          BuildEvents
        >(({ input }) => ({
          ok: true,
          output: {
            url: `/docs/${input.file}`,
          },
        })),
      },
    });
    const workflowService = null as unknown as WorkflowService;
    const workflow = workflowService(config);
    const publishResult = workflow.run("publish", { file: "index.html" });

    // @ts-expect-error publish requires a file object.
    workflow.run("publish", "index.html");

    expect(config.id).toBe("docs-pipeline-explicit");
    expect(publishResult).toBeDefined();
  });

  it("keeps explicit command generics available for package authors", () => {
    const config = defineWorkflow<BuildData, BuildEvents, PipelineCommands>({
      id: "docs-pipeline-explicit",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          ({ input, workflow }) => {
            workflow.send("start");
            workflow.run("publish", { file: input });

            return {
              ok: true,
              output: {
                file: input,
              },
            };
          },
        ),
        publish: defineCommand<
          { file: string },
          { url: string },
          BuildData,
          BuildEvents
        >(({ input }) => ({
          ok: true,
          output: {
            url: `/docs/${input.file}`,
          },
        })),
      },
    });
    const workflowService = null as unknown as WorkflowService;
    const workflow = workflowService(config);
    const publishResult = workflow.run("publish", { file: "index.html" });

    // @ts-expect-error publish requires a file object.
    workflow.run("publish", "index.html");

    expect(config.id).toBe("docs-pipeline");
    expect(publishResult).toBeDefined();
  });

  it("typechecks the public TypeScript workflow contract", async () => {
    const diagnostic: WorkflowDiagnostic = {
      code: "docs.failed",
      message: "Docs build failed.",
      recoverable: true,
      command: "build",
    };
    const config: WorkflowConfig<BuildData, BuildEvents, BuildCommands> = {
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {
          on: {
            complete: {
              to: "complete",
              update({ data, payload }) {
                data.output = payload.output;
              },
            },
            fail: {
              to: "failed",
              update({ data, payload }) {
                data.error = payload;
              },
            },
          },
        },
        complete: {},
        failed: {},
      },
      commands: {
        build(
          context: WorkflowCommandContext<string, BuildData, BuildEvents>,
        ): WorkflowCommandResult<{ file: string }> {
          context.data.output = context.input;

          return {
            ok: true,
            status: "completed",
            output: {
              file: context.data.output,
            },
            diagnostics: [diagnostic],
          };
        },
      },
    };
    const workflowService = null as unknown as WorkflowService;
    const workflow: Workflow<BuildData, BuildEvents, BuildCommands> =
      workflowService(config);
    const snapshot: WorkflowSnapshot<BuildData> = workflow.snapshot();
    const namespaceWorkflow: ng.Workflow<
      BuildData,
      BuildEvents,
      BuildCommands
    > = workflow;

    workflow.restore(snapshot);
    workflow.send("start");
    workflow.send("complete", { output: "site" });
    workflow.send("fail", "boom");
    // @ts-expect-error start does not accept a payload.
    workflow.send("start", {});
    // @ts-expect-error complete requires an output payload.
    workflow.send("complete", {});
    // @ts-expect-error typed workflows reject unknown events.
    workflow.send("missing");

    const result = await namespaceWorkflow.run("build", "index.html");
    const retryResult = await namespaceWorkflow.retry("build");

    // @ts-expect-error build requires string input.
    namespaceWorkflow.run("build", 123);
    // @ts-expect-error typed workflows reject unknown commands.
    namespaceWorkflow.run("missing", "index.html");
    // @ts-expect-error typed workflows reject unknown retry commands.
    namespaceWorkflow.retry("missing");

    expect(config.id).toBe("docs-build");
    expect(result.ok).toBe(true);
    expect(retryResult.ok).toBe(true);

    if (result.ok) {
      const file: string | undefined = result.output?.file;

      // @ts-expect-error output file is a string, not a number.
      const numericFile: number | undefined = result.output?.file;

      void numericFile;

      expect(file).toBeDefined();
    }
  });

  it("typechecks custom workflow state engines", () => {
    const engineFactory: WorkflowStateEngineFactory<
      BuildData,
      BuildEvents,
      BuildCommands
    > = (
      context: WorkflowStateEngineContext<
        BuildData,
        BuildEvents,
        BuildCommands
      >,
    ) => {
      const defaultEngine: WorkflowStateEngine<BuildData, BuildEvents> =
        context.createDefaultEngine();
      const initial: string = context.config.initial;
      const data: BuildData = context.config.data;
      const command = context.config.commands.build;

      void initial;
      void data;
      void command;

      return defaultEngine;
    };
    const config = defineWorkflow<BuildData, BuildEvents, BuildCommands>({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      stateEngine: engineFactory,
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          ({ workflow }) => {
            workflow.send("start");

            return {
              ok: true,
              output: {
                file: "index.html",
              },
            };
          },
        ),
      },
    });
    const namespaceEngine: WorkflowStateEngine<BuildData, BuildEvents> =
      engineFactory({
        config,
        createDefaultEngine() {
          return {
            current: "idle",
            data: config.data,
            send(type, ...payload) {
              return {
                ok: true,
                status: "transitioned",
                type,
                from: "idle",
                to: "idle",
                data: config.data,
                payload: payload[0],
              };
            },
            can() {
              return true;
            },
            matches(mode) {
              return mode === "idle";
            },
            snapshot() {
              return {
                current: "idle",
                data: config.data,
              };
            },
            restore() {
              return undefined;
            },
          };
        },
      });

    namespaceEngine.send("start");
    // @ts-expect-error strict custom engines reject unknown events.
    namespaceEngine.send("missing");
    // @ts-expect-error start does not accept a payload.
    namespaceEngine.send("start", {});

    const namespaceSnapshot: WorkflowStateEngineSnapshot<BuildData> =
      namespaceEngine.snapshot();
    const namespaceSendResult: WorkflowSendResult<BuildData> =
      namespaceEngine.send("start");
    const namespaceNoEvents: WorkflowNoEvents = {};

    expect(config.stateEngine).toBe(engineFactory);
    expect(namespaceEngine.current).toBe("idle");
    expect(namespaceSnapshot.current).toBe("idle");
    expect(namespaceSendResult.status).toBe("transitioned");
    expect(namespaceNoEvents).toEqual({});
  });

  it("typechecks workflow state tree configs", () => {
    const config: WorkflowConfig<BuildData, BuildEvents> = {
      id: "state-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
              update({ data }) {
                data.output = "running";
              },
            },
            complete: {
              // @ts-expect-error complete requires an output payload.
              update({ payload }: { payload: string }) {
                void payload;
              },
            },
          },
        },
        running: {
          on: {
            complete: {
              to: "complete",
              update({ data, payload }) {
                data.output = payload.output;
              },
            },
          },
        },
        complete: {},
      },
    };
    const workflowService = null as unknown as WorkflowService;
    const workflow = workflowService(config);

    workflow.send("start");
    workflow.send("complete", { output: "site" });
    // @ts-expect-error typed state-tree workflows reject unknown events.
    workflow.send("missing");

    expect(config.id).toBe("state-build");
  });

  it("typechecks inferred module.workflow registration", () => {
    const module = null as unknown as ng.NgModule;
    const config = defineWorkflow({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build(input: string) {
          return {
            file: input,
          };
        },
      },
    });

    const returnedModule = module.workflow("docsWorkflow", config);

    expect(returnedModule).toBe(module);
  });

  it("typechecks inferred module.workflow registration from resolvable config", () => {
    const module = null as unknown as ng.NgModule;

    const buildWorkflowConfig = () =>
      defineWorkflow({
        id: "docs-build",
        initial: "idle",
        data: {
          output: "",
          error: "",
        },
        states: {
          idle: {},
        },
        commands: {
          build(input: string) {
            return {
              file: input,
            };
          },
        },
      });

    const returnedModule = module.workflow("docsWorkflow", buildWorkflowConfig);

    expect(returnedModule).toBe(module);
  });

  it("typechecks inferred module.workflowSupervisor registration", () => {
    const module = null as unknown as ng.NgModule;
    const build = defineWorkflow({
      id: "supervised-build",
      initial: "idle",
      data: {
        output: "",
      },
      states: {
        idle: {},
      },
      commands: {
        build(input: string) {
          return {
            file: input,
          };
        },
      },
    });
    const definition = {
      id: "docs-supervisor",
      workflows: {
        build,
      },
    };

    const direct = module.workflowSupervisor("docsSupervisor", definition);
    const resolved = module.workflowSupervisor(
      "resolvedDocsSupervisor",
      () => definition,
    );

    expect(direct).toBe(module);
    expect(resolved).toBe(module);
  });

  it("typechecks the public workflow supervisor contract", async () => {
    const buildConfig = defineWorkflow<BuildData, BuildEvents, BuildCommands>({
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      states: {
        idle: {
          on: {
            start: {
              to: "running",
            },
          },
        },
        running: {},
      },
      commands: {
        build: defineCommand<string, { file: string }, BuildData, BuildEvents>(
          ({ input }) => ({
            ok: true,
            output: {
              file: input,
            },
          }),
        ),
      },
    });
    const buildWorkflow = {
      id: "docs-build",
    } as Workflow<BuildData, BuildEvents, BuildCommands>;
    const publishWorkflow = {
      id: "docs-publish",
    } as Workflow<BuildData, BuildEvents, PipelineCommands>;
    type SupervisorWorkflows = {
      build: typeof buildConfig;
      publish: typeof publishWorkflow;
    };
    const diagnostic: WorkflowSupervisorDiagnostic = {
      code: "supervisor.missingWorkflow",
      message: "Workflow is not registered.",
      recoverable: true,
      workflow: "missing",
      command: "build",
    };
    const status: WorkflowSupervisorStatus = "idle";
    const recovery: WorkflowSupervisorRecoveryPolicy = {
      restoreOnStart: false,
    };
    const persistencePolicy: WorkflowSupervisorPersistencePolicy =
      "after-command";
    const indexedDbPersistenceConfig: WorkflowSupervisorIndexedDbPersistenceConfig =
      {
        database: "angular-ts-workflows",
        store: "supervisorSnapshots",
        version: 1,
      };
    const snapshot: WorkflowSupervisorSnapshot<{
      build: WorkflowSnapshot<BuildData>;
      publish: WorkflowSnapshot<BuildData>;
    }> = {
      version: 1,
      id: "docs-supervisor",
      status: "idle",
      workflows: {
        build: {
          version: 1,
          id: "docs-build",
          current: "idle",
          data: {
            output: "",
            error: "",
          },
          diagnostics: [],
          history: [],
        },
        publish: {
          version: 1,
          id: "docs-publish",
          current: "idle",
          data: {
            output: "",
            error: "",
          },
          diagnostics: [],
          history: [],
        },
      },
      diagnostics: [diagnostic],
      updatedAt: 1,
    };
    const persistence: WorkflowSupervisorPersistence<typeof snapshot> = {
      async load(id) {
        expect(id).toBe("docs-supervisor");

        return snapshot;
      },
      async save(id, savedSnapshot) {
        expect(id).toBe("docs-supervisor");
        expect(savedSnapshot.id).toBe("docs-supervisor");
      },
    };
    const config: WorkflowSupervisorConfig<SupervisorWorkflows> = {
      id: "docs-supervisor",
      workflows: {
        build: buildConfig,
        publish: publishWorkflow,
      },
      persistence,
      persistencePolicy,
      recovery,
    };
    const supervisor = {
      id: "docs-supervisor",
      status,
      diagnostics: [diagnostic],
      ready: Promise.resolve(snapshot),
      workflow(name: "build" | "publish") {
        return name === "build" ? buildWorkflow : publishWorkflow;
      },
      async run(_workflowName: string, command: string) {
        if (command === "publish") {
          return {
            ok: true,
            status: "completed",
            output: {
              url: "/docs/index.html",
            },
          };
        }

        return {
          ok: true,
          status: "completed",
          output: {
            file: "index.html",
          },
        };
      },
      send() {
        return {
          ok: true,
          status: "transitioned",
          type: "start",
        };
      },
      cancel() {
        return 1;
      },
      cancelAll() {
        return 2;
      },
      snapshot() {
        return snapshot;
      },
      restore() {
        return undefined;
      },
      async persist() {
        return snapshot;
      },
      async load() {
        return snapshot;
      },
      async recover() {
        return snapshot;
      },
    } as WorkflowSupervisor<SupervisorWorkflows>;
    const namespaceConfig: ng.WorkflowSupervisorConfig<SupervisorWorkflows> =
      config;
    const buildWorkflowRef = supervisor.workflow("build");
    const publishWorkflowRef = supervisor.workflow("publish");
    const buildHandleResult = await buildWorkflowRef.run("build", "index.html");
    const publishHandleResult = await publishWorkflowRef.run("publish", {
      file: "index.html",
    });
    const buildResult = await supervisor
      .workflow("build")
      .run("build", "index.html");
    const publishResult = await supervisor.workflow("publish").run("publish", {
      file: "index.html",
    });

    supervisor.workflow("build").send("start");
    supervisor.workflow("build").cancel("build");
    buildWorkflowRef.send("start");
    supervisor.cancelAll();
    supervisor.restore(snapshot);
    await supervisor.ready;
    await supervisor.persist();
    await supervisor.load();
    await supervisor.recover();

    // @ts-expect-error supervisors reject unknown workflow names.
    supervisor.workflow("missing");
    // @ts-expect-error start does not accept a payload.
    supervisor.workflow("build").send("start", {});

    expect(buildWorkflowRef.id).toBe("docs-build");
    expect(publishWorkflowRef.id).toBe("docs-publish");
    expect(namespaceConfig.id).toBe("docs-supervisor");
    expect(diagnostic.code).toBe("supervisor.missingWorkflow");
    expect(indexedDbPersistenceConfig.store).toBe("supervisorSnapshots");
    expect(persistencePolicy).toBe("after-command");
    expect(status).toBe("idle");
    expect(buildHandleResult.ok).toBe(true);
    expect(publishHandleResult.ok).toBe(true);
    expect(buildResult.ok).toBe(true);
    expect(publishResult.ok).toBe(true);

    if (buildHandleResult.ok) {
      const handleFile: string | undefined = buildHandleResult.output?.file;

      expect(handleFile).toBe("index.html");
    }

    if (publishHandleResult.ok) {
      const handleUrl: string | undefined = publishHandleResult.output?.url;

      expect(handleUrl).toBe("/docs/index.html");
    }

    if (buildResult.ok) {
      const file: string | undefined = buildResult.output?.file;

      // @ts-expect-error supervisor command output preserves result type.
      const numericFile: number | undefined = buildResult.output?.file;

      void numericFile;

      expect(file).toBe("index.html");
    }
  });

  it("typechecks the workflow worker adapter contract", async () => {
    const buildWorkflow = {
      id: "docs-build",
      current: "idle",
      data: {
        output: "",
        error: "",
      },
      diagnostics: [],
      history: [],
      send() {
        return {
          ok: true,
          status: "transitioned",
          type: "start",
          data: {
            output: "",
            error: "",
          },
        };
      },
      can() {
        return true;
      },
      matches() {
        return true;
      },
      async run() {
        return {
          ok: true,
          status: "completed",
          output: {
            file: "index.html",
          },
        };
      },
      async retry() {
        return {
          ok: true,
          status: "completed",
          output: {
            file: "index.html",
          },
        };
      },
      cancel() {
        return 0;
      },
      snapshot() {
        return {
          version: 1,
          id: "docs-build",
          current: "idle",
          data: {
            output: "",
            error: "",
          },
          diagnostics: [],
          history: [],
        };
      },
      restore() {
        return undefined;
      },
    } as Workflow<BuildData, BuildEvents, BuildCommands>;
    const hostConfig: WorkflowWorkerHostConfig<{
      build: typeof buildWorkflow;
    }> = {
      workflows: {
        build: buildWorkflow,
      },
    };
    const host: WorkflowWorkerHost = createWorkflowWorkerHost(hostConfig);
    const requestOperation: WorkflowWorkerRequestOperation = "run";
    const request: WorkflowWorkerRequest = {
      type: "angular-ts:workflow-worker:request",
      id: "request-1",
      operation: requestOperation,
      workflow: "build",
      command: "build",
      input: "index.html",
    };
    const response: WorkflowWorkerResponse<
      WorkflowCommandResult<{ file: string }>
    > = {
      type: "angular-ts:workflow-worker:response",
      id: "request-1",
      ok: true,
      result: {
        ok: true,
        status: "completed",
        output: {
          file: "index.html",
        },
      },
    };
    const snapshotMessage: WorkflowWorkerSnapshotMessage = {
      type: "angular-ts:workflow-worker:snapshot",
      snapshot: {
        build: buildWorkflow.snapshot(),
      },
    };
    const message: WorkflowWorkerMessage = request;
    const connection: ng.WorkerConnection = {
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
    const client: WorkflowWorkerClient = createWorkflowWorkerClient(connection);
    const namespaceClient: WorkflowWorkerClient = client;
    const namespaceHost: WorkflowWorkerHost = host;
    const namespaceRequest: WorkflowWorkerRequest = request;
    const namespaceResponse: WorkflowWorkerResponse<
      WorkflowCommandResult<{ file: string }>
    > = response;

    // @ts-expect-error request operation rejects unknown operations.
    const invalidOperation: WorkflowWorkerRequestOperation = "cancel";
    const invalidRequest: WorkflowWorkerRequest = {
      // @ts-expect-error request type must use the workflow worker request tag.
      type: "request",
      id: "request-2",
      operation: "run",
    };

    void invalidOperation;
    void invalidRequest;
    void snapshotMessage;
    void message;
    void namespaceHost;
    void namespaceRequest;
    void namespaceResponse;

    expect(host.snapshot().build.id).toBe("docs-build");
    expect(namespaceClient.latestSnapshot).toBeUndefined();
    namespaceClient.dispose();
    await expectAsync(
      namespaceClient.run<{ file: string }>("build", "build", "index.html"),
    ).toBeRejected();
  });
});
