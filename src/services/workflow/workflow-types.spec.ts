/// <reference types="jasmine" />
import { defineCommand, defineWorkflow } from "./workflow.ts";
import type {
  Workflow,
  WorkflowCommand,
  WorkflowCommandMap,
  WorkflowCommandContext,
  WorkflowCommandResult,
  WorkflowConfig,
  WorkflowDiagnostic,
  WorkflowNoCommands,
  WorkflowService,
  WorkflowSnapshot,
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
  build: WorkflowCommand<
    BuildData,
    string,
    { file: string },
    BuildEvents,
    WorkflowNoCommands,
    "build"
  >;
}

interface PipelineCommands {
  build: WorkflowCommand<
    BuildData,
    string,
    { file: string },
    BuildEvents,
    PipelineCommands
  >;
  publish: WorkflowCommand<
    BuildData,
    { file: string },
    { url: string },
    BuildEvents,
    PipelineCommands
  >;
}

describe("$workflow types", () => {
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
      transitions: {
        idle: {
          start() {
            return "running";
          },
        },
        running: {
          complete(data, payload) {
            data.output = payload.output;

            return "complete";
          },
        },
      },
      commands: {
        build: defineCommand<BuildData, string, { file: string }, BuildEvents>(
          ({ cleanup, command, data, input, signal }) => {
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
      transitions: {
        idle: {
          // @ts-expect-error strict workflow definitions reject unknown transition keys.
          missing() {
            return "running";
          },
        },
      },
      commands: {
        build: defineCommand<BuildData, string, { file: string }, BuildEvents>(
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
      transitions: {
        running: {
          // @ts-expect-error complete receives an object payload, not a string.
          complete(_data, _payload: string) {
            return "complete";
          },
        },
      },
      commands: {
        build: defineCommand<BuildData, string, { file: string }, BuildEvents>(
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
      transitions: {},
      commands: {
        build: defineCommand<
          BuildData,
          string,
          { file: string },
          BuildEvents,
          WorkflowNoCommands,
          "build"
        >(({ command, input }) => {
          const name: "build" = command;
          // @ts-expect-error command is the literal command name when typed.
          const wrongName: "publish" = command;

          void name;
          void wrongName;

          return {
            ok: true,
            output: {
              file: input,
            },
          };
        }),
      },
    });
    const strictWorkflow = workflowService(strictConfig);
    const noCommandWorkflow = workflowService(
      defineWorkflow({
        id: "empty",
        initial: "idle",
        data: {},
        transitions: {},
      }),
    );
    const result = await strictWorkflow.run("build", "index.html");

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
    // @ts-expect-error workflows without typed events expose no sends by default.
    noCommandWorkflow.send("start");
    // @ts-expect-error workflows without typed commands expose no run commands by default.
    noCommandWorkflow.run("build", "index.html");

    expect(result.ok).toBe(true);
    expect(configWithUnknownTransition.id).toBe("docs-build");
    expect(configWithWrongPayload.id).toBe("docs-build");
    expect(commandNameConfig.id).toBe("docs-build");
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
      transitions: {},
      commands: {
        build: ({ data, input }) => {
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
      transitions: {},
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
      transitions: {},
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
      transitions: {},
      // @ts-expect-error command maps require every declared command key.
      commands: {
        build: defineCommand<
          BuildData,
          string,
          { file: string },
          BuildEvents,
          PipelineCommands
        >(() => ({
          ok: true,
          output: {
            file: "index.html",
          },
        })),
      },
    });

    expect(missingCommands.id).toBe("docs-build");
    expect(nonCallableCommand.id).toBe("docs-build");
    expect(incompleteCommands.id).toBe("docs-pipeline");
  });

  it("typechecks command contexts against the full command map", () => {
    const config = defineWorkflow<BuildData, BuildEvents, PipelineCommands>({
      id: "docs-pipeline",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      transitions: {
        idle: {
          start() {
            return "running";
          },
        },
      },
      commands: {
        build: defineCommand<
          BuildData,
          string,
          { file: string },
          BuildEvents,
          PipelineCommands
        >(({ workflow, input }) => {
          workflow.send("start");
          workflow.run("publish", { file: input });
          // @ts-expect-error publish requires a file object.
          workflow.run("publish", input);
          // @ts-expect-error typed command context rejects unknown commands.
          workflow.run("missing", { file: input });

          return {
            ok: true,
            output: {
              file: input,
            },
          };
        }),
        publish: defineCommand<
          BuildData,
          { file: string },
          { url: string },
          BuildEvents,
          PipelineCommands
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
      transitions: {
        idle: {
          start() {
            return "running";
          },
        },
        running: {
          complete(data, payload) {
            data.output = payload.output;

            return "complete";
          },
          fail(data, reason) {
            data.error = reason;

            return "failed";
          },
        },
      },
      commands: {
        build(
          context: WorkflowCommandContext<BuildData, string, BuildEvents>,
        ): WorkflowCommandResult<{ file: string }> {
          context.data.output = context.input;

          return {
            ok: true,
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
    const namespaceConfig: ng.WorkflowConfig<
      BuildData,
      BuildEvents,
      BuildCommands
    > = config;

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
    const repeatResult = await namespaceWorkflow.repeat("build");

    // @ts-expect-error build requires string input.
    namespaceWorkflow.run("build", 123);
    // @ts-expect-error typed workflows reject unknown commands.
    namespaceWorkflow.run("missing", "index.html");
    // @ts-expect-error typed workflows reject unknown retry commands.
    namespaceWorkflow.retry("missing");

    expect(namespaceConfig.id).toBe("docs-build");
    expect(result.ok).toBe(true);
    expect(retryResult.ok).toBe(true);
    expect(repeatResult.ok).toBe(true);

    if (result.ok) {
      const file: string | undefined = result.output?.file;

      // @ts-expect-error output file is a string, not a number.
      const numericFile: number | undefined = result.output?.file;

      void numericFile;

      expect(file).toBeDefined();
    }
  });

  it("typechecks module.workflow registration", () => {
    const module = null as unknown as ng.NgModule;
    const config: ng.WorkflowConfig<BuildData, BuildEvents> = {
      id: "docs-build",
      initial: "idle",
      data: {
        output: "",
        error: "",
      },
      transitions: {},
    };

    const returnedModule = module.workflow<BuildData, BuildEvents>(
      "docsWorkflow",
      config,
    );

    expect(returnedModule).toBe(module);
  });
});
