import {
  hasOwn,
  isArray,
  isBoolean,
  isFunction,
  isObject,
  isString,
} from "../../shared/utils.ts";
import type { WorkerHandle } from "../worker/worker.ts";
import type {
  Workflow,
  WorkflowDiagnostic,
  WorkflowResult,
  WorkflowSnapshot,
} from "./workflow.ts";

export type WorkflowWorkerRequestOperation = "run" | "snapshot" | "restore";

export interface WorkflowWorkerRequest {
  type: "angular-ts:workflow-worker:request";
  id: string;
  operation: WorkflowWorkerRequestOperation;
  workflow?: string;
  command?: string;
  input?: unknown;
  snapshot?: unknown;
}

export interface WorkflowWorkerResponse<TResult = unknown> {
  type: "angular-ts:workflow-worker:response";
  id: string;
  ok: boolean;
  result?: TResult;
  error?: WorkflowDiagnostic;
}

export interface WorkflowWorkerSnapshotMessage {
  type: "angular-ts:workflow-worker:snapshot";
  snapshot: Record<string, WorkflowSnapshot>;
}

export type WorkflowWorkerMessage =
  | WorkflowWorkerRequest
  | WorkflowWorkerResponse
  | WorkflowWorkerSnapshotMessage;

/**
 * Advanced extension API for hosting workflow instances behind a Worker-like
 * message transport.
 *
 * @see docs/content/docs/service/workflow.md#advanced-extension-apis
 */
export interface WorkflowWorkerHost {
  handle(
    message: unknown,
    post: (message: WorkflowWorkerMessage) => void,
  ): Promise<void>;
  snapshot(): Record<string, WorkflowSnapshot>;
}

export interface WorkflowWorkerHostConfig<
  TWorkflows extends Record<string, unknown> = Record<string, unknown>,
> {
  workflows: TWorkflows;
  publishSnapshots?: boolean;
}

/**
 * Advanced extension API for calling worker-hosted workflows from the page.
 *
 * @see docs/content/docs/service/workflow.md#advanced-extension-apis
 */
export interface WorkflowWorkerClient {
  readonly latestSnapshot: Record<string, WorkflowSnapshot> | undefined;
  run<TOutput = unknown>(
    workflow: string,
    command: string,
    input?: unknown,
  ): Promise<WorkflowResult<TOutput>>;
  snapshot(): Promise<Record<string, WorkflowSnapshot>>;
  restore(snapshot: unknown): Promise<Record<string, WorkflowSnapshot>>;
  onSnapshot(
    callback: (snapshot: Record<string, WorkflowSnapshot>) => void,
  ): () => void;
  dispose(): void;
}

export function createWorkflowWorkerHost<
  TWorkflows extends Record<string, unknown>,
>(config: WorkflowWorkerHostConfig<TWorkflows>): WorkflowWorkerHost {
  if (!isObject(config)) {
    throw new Error("Workflow worker host requires a config object.");
  }

  if (!isObject(config.workflows) || isArray(config.workflows)) {
    throw new Error("Workflow worker host requires workflows.");
  }

  const workflows = new Map<string, Workflow>();
  const publishSnapshots = config.publishSnapshots !== false;

  for (const [name, workflow] of Object.entries(config.workflows)) {
    if (!isString(name) || !name) {
      throw new Error("Workflow worker host workflow names must be non-empty.");
    }

    if (!isWorkflowInstance(workflow)) {
      throw new Error(
        "Workflow worker host workflows must be workflow instances.",
      );
    }

    workflows.set(name, workflow);
  }

  function snapshot(): Record<string, WorkflowSnapshot> {
    const snapshots: Record<string, WorkflowSnapshot> = {};

    for (const [name, workflow] of workflows) {
      snapshots[name] = workflow.snapshot();
    }

    return snapshots;
  }

  function publish(post: (message: WorkflowWorkerMessage) => void): void {
    if (!publishSnapshots) {
      return;
    }

    post({
      type: "angular-ts:workflow-worker:snapshot",
      snapshot: snapshot(),
    });
  }

  async function run(request: WorkflowWorkerRequest): Promise<unknown> {
    const workflow = getWorkflowWorkerWorkflow(workflows, request.workflow);

    if (!workflow) {
      return createWorkflowWorkerCommandFailure(
        "workflowWorker.missingWorkflow",
        isString(request.workflow) && request.workflow
          ? `Workflow worker host does not have workflow '${request.workflow}'.`
          : "Workflow worker host requires a workflow name.",
        request.command,
      );
    }

    if (!isString(request.command) || !request.command) {
      return createWorkflowWorkerCommandFailure(
        "workflowWorker.invalidCommand",
        "Workflow worker host requires a command name.",
        undefined,
      );
    }

    return runWorkerWorkflowCommand(workflow, request.command, request.input);
  }

  function restore(
    request: WorkflowWorkerRequest,
  ): Record<string, WorkflowSnapshot> {
    const snapshots = getWorkflowWorkerRestoreSnapshots(request.snapshot);

    for (const [name, workflowSnapshot] of Object.entries(snapshots)) {
      const workflow = workflows.get(name);

      if (!workflow) {
        continue;
      }

      workflow.restore(workflowSnapshot);
    }

    return snapshot();
  }

  async function handle(
    message: unknown,
    post: (message: WorkflowWorkerMessage) => void,
  ): Promise<void> {
    if (!isWorkflowWorkerRequest(message)) {
      return;
    }

    try {
      let result: unknown;
      let shouldPublish = false;

      if (message.operation === "run") {
        result = await run(message);
        shouldPublish = true;
      } else if (message.operation === "snapshot") {
        result = snapshot();
      } else {
        result = restore(message);
        shouldPublish = true;
      }

      post({
        type: "angular-ts:workflow-worker:response",
        id: message.id,
        ok: true,
        result,
      });

      if (shouldPublish) {
        publish(post);
      }
    } catch (error) {
      post({
        type: "angular-ts:workflow-worker:response",
        id: message.id,
        ok: false,
        error: createDiagnostic(
          "workflowWorker.requestFailed",
          formatUnknownMessage(error),
          undefined,
          true,
        ),
      });
    }
  }

  return {
    handle,
    snapshot,
  };
}

export function createWorkflowWorkerClient(
  connection: WorkerHandle,
): WorkflowWorkerClient {
  const postMethod = isObject(connection)
    ? (connection as Partial<WorkerHandle>).post
    : undefined;
  const onMessageMethod = isObject(connection)
    ? (connection as Partial<WorkerHandle>).onMessage
    : undefined;

  if (
    !isObject(connection) ||
    !isFunction(postMethod) ||
    !isFunction(onMessageMethod)
  ) {
    throw new Error("Workflow worker client requires a WorkerHandle.");
  }

  const post = postMethod.bind(connection) as (
    message: WorkflowWorkerRequest,
  ) => void;
  let nextRequestId = 1;
  let disposed = false;
  let latestSnapshot: Record<string, WorkflowSnapshot> | undefined;
  const pending = new Map<
    string,
    {
      reject(error: Error): void;
      resolve(value: unknown): void;
    }
  >();
  const snapshotListeners = new Set<
    (snapshot: Record<string, WorkflowSnapshot>) => void
  >();
  const stopListening = onMessageMethod.call(connection, (data) => {
    if (isWorkflowWorkerResponse(data)) {
      const request = pending.get(data.id);

      if (!request) {
        return;
      }

      pending.delete(data.id);

      if (data.ok) {
        request.resolve(data.result);
      } else {
        request.reject(
          createWorkflowWorkerError(
            data.error ??
              createDiagnostic(
                "workflowWorker.requestFailed",
                "Workflow worker request failed.",
                undefined,
                true,
              ),
          ),
        );
      }

      return;
    }

    if (isWorkflowWorkerSnapshotMessage(data)) {
      latestSnapshot = data.snapshot;

      for (const listener of snapshotListeners) {
        listener(data.snapshot);
      }

      return;
    }
  });

  function request<TResult>(
    operation: WorkflowWorkerRequestOperation,
    requestData: Omit<WorkflowWorkerRequest, "id" | "operation" | "type"> = {},
  ): Promise<TResult> {
    if (disposed) {
      return Promise.reject(
        createWorkflowWorkerError(
          createDiagnostic(
            "workflowWorker.clientDisposed",
            "Workflow worker client is disposed.",
            undefined,
            true,
          ),
        ),
      );
    }

    const id = `workflow-worker-${String(nextRequestId++)}`;
    const message: WorkflowWorkerRequest = {
      ...requestData,
      type: "angular-ts:workflow-worker:request",
      id,
      operation,
    };

    return new Promise<TResult>((resolve, reject) => {
      pending.set(id, {
        resolve(value) {
          resolve(value as TResult);
        },
        reject,
      });
      post(message);
    });
  }

  return {
    get latestSnapshot() {
      return latestSnapshot;
    },
    run(workflow, command, input) {
      return request("run", {
        workflow,
        command,
        input,
      });
    },
    async snapshot() {
      const workerSnapshot =
        await request<Record<string, WorkflowSnapshot>>("snapshot");

      latestSnapshot = workerSnapshot;

      return workerSnapshot;
    },
    async restore(snapshotInput) {
      const restoredSnapshot = await request<Record<string, WorkflowSnapshot>>(
        "restore",
        {
          snapshot: snapshotInput,
        },
      );

      latestSnapshot = restoredSnapshot;

      return restoredSnapshot;
    },
    onSnapshot(callback) {
      snapshotListeners.add(callback);

      return () => {
        snapshotListeners.delete(callback);
      };
    },
    dispose() {
      disposed = true;
      stopListening();

      for (const request of pending.values()) {
        request.reject(
          createWorkflowWorkerError(
            createDiagnostic(
              "workflowWorker.clientDisposed",
              "Workflow worker client is disposed.",
              undefined,
              true,
            ),
          ),
        );
      }

      pending.clear();
      snapshotListeners.clear();
    },
  };
}

function createWorkflowWorkerError(diagnostic: WorkflowDiagnostic): Error & {
  diagnostic: WorkflowDiagnostic;
} {
  const error = new Error(diagnostic.message) as Error & {
    diagnostic: WorkflowDiagnostic;
  };

  error.diagnostic = diagnostic;

  return error;
}

function isWorkflowWorkerRequest(
  value: unknown,
): value is WorkflowWorkerRequest {
  if (!isObject(value)) {
    return false;
  }

  const candidate = value as Partial<WorkflowWorkerRequest>;

  return (
    candidate.type === "angular-ts:workflow-worker:request" &&
    isString(candidate.id) &&
    candidate.id.length > 0 &&
    (candidate.operation === "run" ||
      candidate.operation === "snapshot" ||
      candidate.operation === "restore")
  );
}

function isWorkflowWorkerResponse(
  value: unknown,
): value is WorkflowWorkerResponse {
  if (!isObject(value)) {
    return false;
  }

  const candidate = value as Partial<WorkflowWorkerResponse>;

  return (
    candidate.type === "angular-ts:workflow-worker:response" &&
    isString(candidate.id) &&
    candidate.id.length > 0 &&
    isBoolean(candidate.ok)
  );
}

function isWorkflowWorkerSnapshotMessage(
  value: unknown,
): value is WorkflowWorkerSnapshotMessage {
  if (!isObject(value)) {
    return false;
  }

  const candidate = value as Partial<WorkflowWorkerSnapshotMessage>;

  return (
    candidate.type === "angular-ts:workflow-worker:snapshot" &&
    isObject(candidate.snapshot) &&
    !isArray(candidate.snapshot)
  );
}

function getWorkflowWorkerWorkflow(
  workflows: Map<string, Workflow>,
  name: unknown,
): Workflow | undefined {
  if (!isString(name) || !name) {
    return undefined;
  }

  return workflows.get(name);
}

function runWorkerWorkflowCommand(
  workflow: Workflow,
  command: string,
  input: unknown,
): Promise<WorkflowResult> {
  return (
    workflow.run as (
      command: string,
      input?: unknown,
    ) => Promise<WorkflowResult>
  )(command, input);
}

function createWorkflowWorkerCommandFailure(
  code: string,
  message: string,
  command?: string,
): WorkflowResult {
  return {
    ok: false,
    status: "rejected",
    diagnostics: [createDiagnostic(code, message, command, true)],
  };
}

function getWorkflowWorkerRestoreSnapshots(
  snapshotInput: unknown,
): Record<string, unknown> {
  if (!isObject(snapshotInput) || isArray(snapshotInput)) {
    throw new Error("Workflow worker restore requires a snapshot object.");
  }

  if (
    hasOwn(snapshotInput, "workflows") &&
    isObject((snapshotInput as { workflows?: unknown }).workflows) &&
    !isArray((snapshotInput as { workflows?: unknown }).workflows)
  ) {
    return (snapshotInput as { workflows: Record<string, unknown> }).workflows;
  }

  return snapshotInput as Record<string, unknown>;
}

function isWorkflowInstance(value: unknown): value is Workflow {
  const workflow = value as Partial<Workflow> | undefined;

  return (
    isObject(workflow) &&
    isString(workflow.id) &&
    isString(workflow.state) &&
    isObject(workflow.data) &&
    isArray(workflow.diagnostics) &&
    isArray(workflow.history) &&
    isFunction(workflow.can) &&
    isFunction(workflow.run) &&
    isFunction(workflow.cancel) &&
    isFunction(workflow.snapshot) &&
    isFunction(workflow.restore)
  );
}

function createDiagnostic(
  code: string,
  message: string,
  command: string | undefined,
  recoverable: boolean,
): WorkflowDiagnostic {
  return { code, message, command, recoverable };
}

function formatUnknownMessage(value: unknown): string {
  if (value instanceof Error) return value.message || value.name;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "Workflow worker request failed.";
}
