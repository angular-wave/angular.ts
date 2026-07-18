/// <reference types="jasmine" />
import { defineWorkflow } from "./workflow.ts";
import {
  createWorkflowWorkerClient,
  createWorkflowWorkerHost,
} from "./worker-adapter.ts";
import type {
  Workflow,
  WorkflowCommand,
  WorkflowCommandContext,
  WorkflowConfig,
  WorkflowContract,
  WorkflowDiagnostic,
  WorkflowResult,
  WorkflowService,
  WorkflowSnapshot,
  WorkflowSupervisor,
  WorkflowSupervisorConfig,
  WorkflowSupervisorPersistence,
  WorkflowSupervisorSnapshot,
} from "./workflow.ts";
import type {
  WorkflowWorkerClient,
  WorkflowWorkerHost,
  WorkflowWorkerMessage,
} from "./worker-adapter.ts";
import type { WorkerHandle } from "../worker/worker.ts";

interface BuildData {
  output: string;
  error: string;
}

interface BuildWorkflow extends WorkflowContract {
  data: BuildData;
  commands: {
    build: { input: string; output: { file: string } };
    publish: { input: { file: string }; output: { url: string } };
  };
  state: "idle" | "building" | "complete" | "failed";
}

const buildConfig: WorkflowConfig<BuildWorkflow> = {
  id: "build",
  initial: "idle",
  data: { output: "", error: "" },
  commands: {
    build: {
      from: "idle",
      pending: "building",
      execute({ data, input, cleanup }) {
        data.output.toUpperCase();
        // @ts-expect-error execution data is readonly.
        data.output = input;
        cleanup(() => undefined);

        return { file: input };
      },
      success: {
        to: "complete",
        update({ data, output }) {
          data.output = output.file;
        },
      },
      failure: {
        to: "failed",
        update({ data, diagnostic }) {
          data.error = diagnostic.message;
        },
      },
    },
    publish: {
      from: "complete",
      pending: "building",
      async execute({ input }) {
        return { url: `/assets/${input.file}` };
      },
      success: "complete",
      failure: "failed",
    },
  },
};

describe("$workflow contract types", () => {
  it("carries commands, states, inputs, and outputs in one contract", async () => {
    const service = null as unknown as WorkflowService;
    const workflow = service(buildConfig);
    const build = await workflow.run("build", "index.html");
    const publish = await workflow.run("publish", { file: "index.html" });

    workflow.can("build");
    // @ts-expect-error build input is a string.
    workflow.run("build", 1);
    // @ts-expect-error publish requires its input.
    workflow.run("publish");
    // @ts-expect-error unknown commands are rejected.
    workflow.run("deploy", {});
    // @ts-expect-error command names remain closed.
    workflow.can("deploy");

    if (build.ok) {
      build.output.file.toUpperCase();
      // @ts-expect-error build output remains typed.
      build.output.url;
    }

    if (publish.ok) {
      publish.output.url.toUpperCase();
    }

    expect(workflow.state).toBe("idle");
  });

  it("keeps workflow results discriminated", () => {
    const completed: WorkflowResult<string> = {
      ok: true,
      status: "completed",
      output: "done",
    };
    const failed: WorkflowResult = {
      ok: false,
      status: "failed",
      diagnostics: [],
    };
    const status: WorkflowResult<string>["status"] = completed.status;

    // @ts-expect-error queued is not a settled command status.
    failed.status = "queued";
    expect(status).toBe("completed");
  });

  it("types snapshots and migrations with the workflow contract", () => {
    const snapshot: WorkflowSnapshot<BuildWorkflow> = {
      version: 1,
      id: "build",
      state: "building",
      data: { output: "", error: "" },
      diagnostics: [],
      history: [],
    };
    const config: WorkflowConfig<BuildWorkflow> = {
      ...buildConfig,
      migrateSnapshot(value) {
        void value;

        return snapshot;
      },
    };

    // @ts-expect-error snapshot states are closed by the contract.
    snapshot.state = "unknown";
    expect(config.id).toBe("build");
  });

  it("infers ordinary definitions without positional generics", async () => {
    const service = null as unknown as WorkflowService;
    const config = defineWorkflow({
      id: "inferred",
      initial: "idle",
      data: { count: 0 },
      commands: {
        increment: {
          from: "idle",
          pending: "running",
          execute({ input }: WorkflowCommandContext<BuildWorkflow, number>) {
            return input + 1;
          },
          success: "idle",
          failure: "failed",
        },
      },
    });
    const workflow = service(config);
    const result = await workflow.run("increment", 1);

    workflow.can("increment");
    // @ts-expect-error inferred command input is numeric.
    workflow.run("increment", "1");
    // @ts-expect-error inferred command names remain closed.
    workflow.run("stop");

    if (result.ok) {
      result.output.toFixed();
    }

    expect(workflow.data.count).toBe(0);
  });

  it("supports reusable command handlers", () => {
    const command: WorkflowCommand<
      BuildWorkflow,
      { input: string; output: { file: string } }
    > = ({ input }) => ({ file: input });

    expect(command).toBeDefined();
  });

  it("types supervisor snapshots and persistence from registered workflows", () => {
    type Workflows = {
      build: WorkflowConfig<BuildWorkflow>;
      release: Workflow<BuildWorkflow>;
    };
    type Snapshot = WorkflowSupervisorSnapshot<{
      build: WorkflowSnapshot<BuildWorkflow>;
      release: WorkflowSnapshot<BuildWorkflow>;
    }>;

    const persistence: WorkflowSupervisorPersistence<Snapshot> = {
      async load() {
        return undefined;
      },
      async save(_id, snapshot) {
        snapshot.workflows.build.data.output.toUpperCase();
      },
    };
    const config: WorkflowSupervisorConfig<Workflows> = {
      id: "pipeline",
      workflows: {
        build: buildConfig,
        release: null as unknown as Workflow<BuildWorkflow>,
      },
      persistence,
    };
    const supervisor = null as unknown as WorkflowSupervisor<Workflows>;

    supervisor.workflow("build").run("build", "index.html");
    supervisor.snapshot().workflows.release.data.output.toUpperCase();
    // @ts-expect-error supervisor workflow names are closed.
    supervisor.workflow("missing");
    expect(config.id).toBe("pipeline");
  });

  it("keeps worker host and client APIs on public workflow contracts", () => {
    const workflow = null as unknown as Workflow<BuildWorkflow>;
    const host: WorkflowWorkerHost = createWorkflowWorkerHost({
      workflows: { build: workflow },
    });
    const connection = null as unknown as WorkerHandle;
    const client: WorkflowWorkerClient = createWorkflowWorkerClient(connection);
    const diagnostic: WorkflowDiagnostic = {
      code: "workflow.failed",
      message: "failed",
    };
    const message: WorkflowWorkerMessage = {
      type: "angular-ts:workflow-worker:response",
      id: "1",
      ok: false,
      error: diagnostic,
    };

    void host.handle(message, () => undefined);
    void client.run<{ file: string }>("build", "build", "index.html");
    expect(message.type).toBe("angular-ts:workflow-worker:response");
  });
});
