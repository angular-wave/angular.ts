import {
  SCOPE_PROXY_BIND,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";
import {
  hasOwn,
  isArray,
  isBoolean,
  isFunction,
  isInstanceOf,
  isNumber,
  isObject,
  isString,
} from "../../shared/utils.ts";
import type {
  Machine,
  MachineConfig,
  MachineMode,
  MachineSendResult,
  MachineService,
  MachineStateMap,
} from "../machine/machine.ts";
import type { WorkerConnection } from "../worker/worker.ts";

export type WorkflowNoEvents = Record<never, never>;

export type WorkflowNoCommands = Record<never, never>;

export type WorkflowConcurrencyPolicy = "allow" | "reject" | "queue";

export interface WorkflowDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly recoverable?: boolean;
  readonly path?: string;
  readonly command?: string;
  readonly detail?: unknown;
}

export type WorkflowCommandResult<TOutput = unknown> =
  | {
      readonly ok: true;
      readonly status: "completed";
      readonly output?: TOutput;
      readonly diagnostics?: readonly WorkflowDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly status: Exclude<WorkflowCommandStatus, "completed">;
      readonly diagnostics: readonly WorkflowDiagnostic[];
    };

export type WorkflowCommandStatus =
  | "completed"
  | "failed"
  | "cancelled"
  | "timeout"
  | "rejected";

type WorkflowCommandReturn<TOutput = unknown> =
  | {
      readonly ok: true;
      readonly status?: "completed";
      readonly output?: TOutput;
      readonly diagnostics?: readonly WorkflowDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly status?: Exclude<WorkflowCommandStatus, "completed">;
      readonly diagnostics: readonly WorkflowDiagnostic[];
    };

type WorkflowEventName<TEvents extends object> = Extract<keyof TEvents, string>;

/** @inline */
type WorkflowEventPayload<
  TEvents extends object,
  TType extends WorkflowEventName<TEvents>,
> = undefined extends TEvents[TType]
  ? [payload?: TEvents[TType]]
  : [payload: TEvents[TType]];

export interface WorkflowStateEngineSnapshot<
  TData extends object = Record<string, unknown>,
> {
  readonly current: MachineMode;
  readonly data: TData;
}

export type WorkflowSendResult<TData extends object = Record<string, unknown>> =
  | {
      readonly ok: true;
      readonly status: "transitioned" | "updated";
      readonly type: string;
      readonly from?: MachineMode;
      readonly to?: MachineMode;
      readonly data?: TData;
      readonly payload?: unknown;
      readonly detail?: unknown;
    }
  | {
      readonly ok: false;
      readonly status:
        | "missing-transition"
        | "missing-workflow"
        | "guard-denied"
        | "policy-denied"
        | "invalid-event"
        | "command-finished";
      readonly type: string;
      readonly from?: MachineMode;
      readonly to?: MachineMode;
      readonly data?: TData;
      readonly payload?: unknown;
      readonly detail?: unknown;
    };

export interface WorkflowCommandOptions {
  concurrency?: WorkflowConcurrencyPolicy;
  signal?: AbortSignal;
  timeout?: number;
}

export interface WorkflowCommandContext<
  TInput = unknown,
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
> {
  workflow: Workflow<TData, TEvents, WorkflowCommandMap<TData, TEvents>>;
  data: TData;
  input: TInput;
  command: string;
  cleanup(callback: () => void): void;
  signal: AbortSignal;
}

type WorkflowCommandHandlerResult<TOutput> =
  | WorkflowCommandReturn<TOutput>
  | TOutput
  | Promise<WorkflowCommandReturn<TOutput> | TOutput>;

export type WorkflowCommand<
  TInput = unknown,
  TOutput = unknown,
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
> = (
  context: WorkflowCommandContext<TInput, TData, TEvents>,
) => WorkflowCommandHandlerResult<TOutput>;

export type WorkflowCommandMap<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
> = Record<string, WorkflowCommand<unknown, unknown, TData, TEvents>>;

/**
 * Advanced extension API for custom workflow state engines.
 *
 * Ordinary workflow authors should configure `states`; implement this contract
 * only when packaging an alternate state-engine adapter.
 *
 * @see docs/content/docs/service/workflow.md#advanced-extension-apis
 */
export interface WorkflowStateEngine<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
> {
  readonly current: MachineMode;
  readonly data: TData;
  send<TType extends Extract<keyof TEvents, string>>(
    type: TType,
    ...payload: WorkflowEventPayload<TEvents, TType>
  ): WorkflowSendResult<TData>;
  can<TType extends Extract<keyof TEvents, string>>(
    type: TType,
    ...payload: WorkflowEventPayload<TEvents, TType>
  ): boolean;
  matches(mode: MachineMode): boolean;
  snapshot(): WorkflowStateEngineSnapshot<TData>;
  restore(snapshot: WorkflowStateEngineSnapshot<TData>): void;
}

export interface WorkflowStateEngineContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
  TCommands extends object = WorkflowNoCommands,
> {
  config: WorkflowConfig<TData, TEvents, TCommands>;
  createDefaultEngine(): WorkflowStateEngine<TData, TEvents>;
}

/**
 * Advanced extension API for creating custom workflow state engines.
 *
 * @see docs/content/docs/service/workflow.md#advanced-extension-apis
 */
export type WorkflowStateEngineFactory<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
  TCommands extends object = WorkflowNoCommands,
> = (
  context: WorkflowStateEngineContext<TData, TEvents, TCommands>,
) => WorkflowStateEngine<TData, TEvents>;

type WorkflowCommandDefs<TCommands extends object> = {
  [TName in keyof TCommands]: TCommands[TName] extends (
    ...args: never[]
  ) => unknown
    ? TCommands[TName]
    : never;
};

type WorkflowCommandName<TCommands extends object> = Extract<
  keyof TCommands,
  string
>;

type WorkflowCommandParts<TCommand> =
  TCommand extends WorkflowCommand<
    infer TInput,
    infer TOutput,
    infer TData,
    infer TEvents
  >
    ? [TData, TInput, TOutput, TEvents]
    : [never, unknown, unknown, never];

/** @inline */
type WorkflowCommandInput<
  TCommands extends object,
  TName extends WorkflowCommandName<TCommands>,
> = WorkflowCommandParts<TCommands[TName]>[1];

type WorkflowCommandOutput<
  TCommands extends object,
  TName extends WorkflowCommandName<TCommands>,
> = WorkflowCommandReturnOutput<
  ReturnType<Extract<TCommands[TName], (...args: never[]) => unknown>>
>;

/** @inline */
type WorkflowCommandReturnOutput<TValue> =
  Awaited<TValue> extends infer TResolved
    ? TResolved extends { ok: true; output?: infer TOutput }
      ? TOutput
      : TResolved extends { ok: false }
        ? never
        : TResolved
    : never;

/** @inline */
type WorkflowCommandInputArgs<TInput> = undefined extends TInput
  ? [input?: TInput, options?: WorkflowCommandOptions]
  : [input: TInput, options?: WorkflowCommandOptions];

/** @inline */
type WorkflowCommandOutputUnion<TCommands extends object> =
  WorkflowCommandName<TCommands> extends infer TName
    ? TName extends WorkflowCommandName<TCommands>
      ? WorkflowCommandOutput<TCommands, TName>
      : never
    : never;

export type WorkflowSupervisorWorkflowMap = Record<string, unknown>;

export type WorkflowFromDefinition<TDefinition> =
  TDefinition extends Workflow<infer TData, infer TEvents, infer TCommands>
    ? Workflow<TData, TEvents, TCommands>
    : TDefinition extends WorkflowConfig<
          infer TData,
          infer TEvents,
          infer TCommands
        >
      ? Workflow<TData, TEvents, TCommands>
      : Workflow;

type WorkflowSupervisorWorkflowName<TWorkflows extends object> = Extract<
  keyof TWorkflows,
  string
>;

export type WorkflowSupervisorSnapshotMap<TWorkflows extends object> = {
  [TWorkflowName in keyof TWorkflows &
    string]: TWorkflows[TWorkflowName] extends Workflow<
    infer TData,
    infer TEvents,
    infer TCommands
  >
    ? TEvents extends object
      ? TCommands extends object
        ? WorkflowSnapshot<TData>
        : never
      : never
    : TWorkflows[TWorkflowName] extends WorkflowConfig<
          infer TData,
          infer TConfigEvents,
          infer TConfigCommands
        >
      ? TConfigEvents extends object
        ? TConfigCommands extends object
          ? WorkflowSnapshot<TData>
          : never
        : never
      : WorkflowSnapshot<object>;
};

export interface WorkflowHistoryEntry {
  readonly id: number;
  readonly type: "command.started" | "command.completed" | "command.failed";
  readonly command: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly diagnostics?: readonly WorkflowDiagnostic[];
}

interface WorkflowCommonConfig<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
> {
  commandTimeout?: number;
  concurrency?: WorkflowConcurrencyPolicy;
  diagnosticLimit?: number;
  id: string;
  initial: MachineMode;
  data: TData;
  historyLimit?: number;
  migrateSnapshot?: WorkflowSnapshotMigration<TData>;
  stateEngine?: WorkflowStateEngineFactory<TData, TEvents, TCommands>;
}

interface WorkflowStateConfig<TData extends object, TEvents extends object> {
  states: MachineStateMap<TData, TEvents>;
}

type WorkflowBaseConfig<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
> = WorkflowCommonConfig<TData, TEvents, TCommands> &
  WorkflowStateConfig<TData, TEvents>;

type WorkflowCommandConfig<TCommands extends object> =
  keyof TCommands extends never
    ? {
        commands?: undefined;
      }
    : {
        commands: TCommands & WorkflowCommandDefs<TCommands>;
      };

export type WorkflowConfig<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
  TCommands extends object = WorkflowNoCommands,
> = WorkflowBaseConfig<TData, TEvents, TCommands> &
  WorkflowCommandConfig<TCommands>;

type WorkflowInferredDefinition = Omit<
  WorkflowCommonConfig<object, object, object>,
  "data" | "stateEngine"
> & {
  data: object;
  states: object;
  commands?: object;
  stateEngine?: WorkflowStateEngineFactory<object, object, object>;
};

type WorkflowDataFromDefinition<TDefinition> = TDefinition extends {
  data: infer TData extends object;
}
  ? TData
  : Record<string, unknown>;

type WorkflowCommandMapFromDefinition<TDefinition> = TDefinition extends {
  commands: infer TCommands extends object;
}
  ? TCommands
  : WorkflowNoCommands;

type WorkflowEventNamesFromState<TState> = TState extends {
  on: infer TTransitions extends object;
}
  ? Extract<keyof TTransitions, string>
  : never;

type WorkflowEventNamesFromStates<TStates> = TStates extends object
  ? {
      [TState in keyof TStates]: WorkflowEventNamesFromState<TStates[TState]>;
    }[keyof TStates]
  : never;

type WorkflowEventsFromDefinition<TDefinition> = TDefinition extends {
  states: infer TStates;
}
  ? {
      [TEvent in WorkflowEventNamesFromStates<TStates>]: unknown;
    }
  : WorkflowNoEvents;

export interface WorkflowSnapshot<
  TData extends object = Record<string, unknown>,
> {
  readonly version: 1;
  readonly id: string;
  readonly current: MachineMode;
  readonly data: TData;
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly history: readonly WorkflowHistoryEntry[];
}

export type WorkflowSnapshotMigration<
  TData extends object = Record<string, unknown>,
> = (snapshot: unknown) => WorkflowSnapshot<TData>;

export interface Workflow<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
  TCommands extends object = WorkflowNoCommands,
> {
  readonly id: string;
  readonly current: MachineMode;
  data: TData;
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly history: readonly WorkflowHistoryEntry[];
  send<TType extends Extract<keyof TEvents, string>>(
    type: TType,
    ...payload: WorkflowEventPayload<TEvents, TType>
  ): WorkflowSendResult<TData>;
  can<TType extends Extract<keyof TEvents, string>>(
    type: TType,
    ...payload: WorkflowEventPayload<TEvents, TType>
  ): boolean;
  matches(mode: MachineMode): boolean;
  run<TName extends WorkflowCommandName<TCommands>>(
    command: TName,
    ...input: WorkflowCommandInputArgs<WorkflowCommandInput<TCommands, TName>>
  ): Promise<WorkflowCommandResult<WorkflowCommandOutput<TCommands, TName>>>;
  retry(
    options?: WorkflowCommandOptions,
  ): Promise<WorkflowCommandResult<WorkflowCommandOutputUnion<TCommands>>>;
  retry<TName extends WorkflowCommandName<TCommands>>(
    command: TName,
    options?: WorkflowCommandOptions,
  ): Promise<WorkflowCommandResult<WorkflowCommandOutput<TCommands, TName>>>;
  cancel(command?: string): number;
  snapshot(): WorkflowSnapshot<TData>;
  restore(snapshot: unknown): void;
}

export interface WorkflowService {
  <
    TData extends object = Record<string, unknown>,
    TEvents extends object = WorkflowNoEvents,
    TCommands extends object = WorkflowNoCommands,
  >(
    config: WorkflowConfig<TData, TEvents, TCommands>,
  ): Workflow<TData, TEvents, TCommands>;
}

export type WorkflowSupervisorStatus =
  | "idle"
  | "running"
  | "persisting"
  | "recovering"
  | "failed";

export interface WorkflowSupervisorDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly recoverable?: boolean;
  readonly workflow?: string;
  readonly command?: string;
  readonly detail?: unknown;
}

export interface WorkflowSupervisorSnapshot<
  TWorkflowSnapshots extends Record<string, WorkflowSnapshot<object>> = Record<
    string,
    WorkflowSnapshot<object>
  >,
> {
  readonly version: 1;
  readonly id: string;
  readonly status: WorkflowSupervisorStatus;
  readonly workflows: TWorkflowSnapshots;
  readonly diagnostics: readonly WorkflowSupervisorDiagnostic[];
  readonly updatedAt: number;
}

export interface WorkflowSupervisorPersistence<
  TSnapshot extends WorkflowSupervisorSnapshot = WorkflowSupervisorSnapshot,
> {
  load(id: string): Promise<TSnapshot | undefined>;
  save(id: string, snapshot: TSnapshot): Promise<void>;
  remove?(id: string): Promise<void>;
}

export type WorkflowSupervisorPersistencePolicy = "manual" | "after-command";

export interface WorkflowSupervisorIndexedDbPersistenceConfig {
  database?: string;
  store?: string;
  version?: number;
  indexedDB?: IDBFactory;
}

export interface WorkflowSupervisorRecoveryPolicy {
  restoreOnStart?: boolean;
}

export interface WorkflowSupervisorConfig<
  TWorkflows extends WorkflowSupervisorWorkflowMap =
    WorkflowSupervisorWorkflowMap,
> {
  id: string;
  workflows: TWorkflows;
  persistence?: WorkflowSupervisorPersistence<
    WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
  >;
  persistencePolicy?: WorkflowSupervisorPersistencePolicy;
  recovery?: WorkflowSupervisorRecoveryPolicy;
}

export interface WorkflowSupervisor<
  TWorkflows extends WorkflowSupervisorWorkflowMap =
    WorkflowSupervisorWorkflowMap,
> {
  readonly id: string;
  readonly status: WorkflowSupervisorStatus;
  readonly diagnostics: readonly WorkflowSupervisorDiagnostic[];
  readonly ready: Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  >;
  workflow<TWorkflowName extends WorkflowSupervisorWorkflowName<TWorkflows>>(
    name: TWorkflowName,
  ): WorkflowFromDefinition<TWorkflows[TWorkflowName]>;
  cancelAll(): number;
  snapshot(): WorkflowSupervisorSnapshot<
    WorkflowSupervisorSnapshotMap<TWorkflows>
  >;
  restore(snapshot: unknown): void;
  persist(): Promise<
    WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
  >;
  load(): Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  >;
  recover(): Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  >;
}

export type WorkflowWorkerRequestOperation =
  | "run"
  | "send"
  | "snapshot"
  | "restore";

export interface WorkflowWorkerRequest {
  type: "angular-ts:workflow-worker:request";
  id: string;
  operation: WorkflowWorkerRequestOperation;
  workflow?: string;
  command?: string;
  event?: string;
  input?: unknown;
  payload?: unknown;
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
  snapshot: Record<string, WorkflowSnapshot<object>>;
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
  snapshot(): Record<string, WorkflowSnapshot<object>>;
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
  readonly latestSnapshot: Record<string, WorkflowSnapshot<object>> | undefined;
  run<TOutput = unknown>(
    workflow: string,
    command: string,
    input?: unknown,
  ): Promise<WorkflowCommandResult<TOutput>>;
  send(
    workflow: string,
    event: string,
    payload?: unknown,
  ): Promise<WorkflowSendResult>;
  snapshot(): Promise<Record<string, WorkflowSnapshot<object>>>;
  restore(snapshot: unknown): Promise<Record<string, WorkflowSnapshot<object>>>;
  onSnapshot(
    callback: (snapshot: Record<string, WorkflowSnapshot<object>>) => void,
  ): () => void;
  dispose(): void;
}

type WorkflowTarget<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
> = Workflow<TData, TEvents, TCommands> & ScopeProxyBindable;

interface WorkflowBinding<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
> {
  _handler: Scope;
  _proxy: Workflow<TData, TEvents, TCommands>;
}

interface WorkflowRunState {
  _cancel: (diagnostic: WorkflowDiagnostic) => void;
  _cancelDiagnostic?: WorkflowDiagnostic;
  _cancelPromise: Promise<WorkflowDiagnostic>;
  _cleanups: Array<() => void>;
  _command: string;
  _controller: AbortController;
  _discardResult: boolean;
  _done: boolean;
}

/** @internal */
export function createWorkflowService(
  $machine: MachineService,
): WorkflowService {
  return createWorkflowFactory($machine) as WorkflowService;
}

export function defineWorkflow<
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
  TCommands extends object = WorkflowNoCommands,
>(
  config: WorkflowConfig<TData, TEvents, TCommands>,
): WorkflowConfig<TData, TEvents, TCommands>;
export function defineWorkflow<
  const TDefinition extends WorkflowInferredDefinition,
>(
  config: TDefinition,
): WorkflowConfig<
  WorkflowDataFromDefinition<TDefinition>,
  WorkflowEventsFromDefinition<TDefinition>,
  WorkflowCommandMapFromDefinition<TDefinition>
> &
  TDefinition;
export function defineWorkflow(
  config: WorkflowConfig | WorkflowInferredDefinition,
): WorkflowConfig | WorkflowInferredDefinition {
  return config;
}

export function defineCommand<
  TInput = unknown,
  TOutput = unknown,
  TData extends object = Record<string, unknown>,
  TEvents extends object = WorkflowNoEvents,
>(
  command: WorkflowCommand<TInput, TOutput, TData, TEvents>,
): WorkflowCommand<TInput, TOutput, TData, TEvents> {
  return command;
}

export function createWorkflowSupervisor<
  TWorkflows extends WorkflowSupervisorWorkflowMap,
>(
  $workflow: WorkflowService,
  config: WorkflowSupervisorConfig<TWorkflows>,
): WorkflowSupervisor<TWorkflows> {
  const workflows = createWorkflowSupervisorRegistry($workflow, config);
  const exposedWorkflows = new Map<string, Workflow>();
  const diagnostics: WorkflowSupervisorDiagnostic[] = [];
  let status: WorkflowSupervisorStatus = "idle";

  function snapshot(): WorkflowSupervisorSnapshot<
    WorkflowSupervisorSnapshotMap<TWorkflows>
  > {
    const workflowSnapshots: Record<string, WorkflowSnapshot<object>> = {};

    for (const [name, workflow] of workflows) {
      workflowSnapshots[name] = workflow.snapshot() as WorkflowSnapshot<object>;
    }

    return {
      version: 1,
      id: config.id,
      status,
      workflows: workflowSnapshots as WorkflowSupervisorSnapshotMap<TWorkflows>,
      diagnostics: normalizeWorkflowSupervisorDiagnostics(diagnostics),
      updatedAt: Date.now(),
    };
  }

  function appendSupervisorDiagnostic(
    diagnostic: WorkflowSupervisorDiagnostic,
  ): WorkflowSupervisorDiagnostic {
    diagnostics.push(diagnostic);

    return diagnostic;
  }

  function createMissingWorkflowDiagnostic(
    workflowName: unknown,
    command?: string,
  ): WorkflowSupervisorDiagnostic {
    const formattedWorkflow = isString(workflowName) ? workflowName : "";
    const workflow =
      isString(workflowName) && workflowName ? workflowName : undefined;

    return {
      code: "workflowSupervisor.missingWorkflow",
      message: formattedWorkflow
        ? `Workflow supervisor '${config.id}' does not have workflow '${formattedWorkflow}'.`
        : `Workflow supervisor '${config.id}' requires a workflow name.`,
      recoverable: true,
      workflow,
      command,
      detail: normalizeDiagnosticDetail({
        supervisor: config.id,
        workflow: workflowName,
      }),
    };
  }

  function createUnknownSnapshotWorkflowDiagnostic(
    workflowName: string,
  ): WorkflowSupervisorDiagnostic {
    return {
      code: "workflowSupervisor.unknownSnapshotWorkflow",
      message: `Workflow supervisor '${config.id}' snapshot includes unknown workflow '${workflowName}'.`,
      recoverable: true,
      workflow: workflowName,
      detail: normalizeDiagnosticDetail({
        supervisor: config.id,
        workflow: workflowName,
      }),
    };
  }

  function createPersistenceDiagnostic(
    code: string,
    action: "load" | "save",
    error: unknown,
  ): WorkflowSupervisorDiagnostic {
    return {
      code,
      message: `Workflow supervisor '${config.id}' failed to ${action} persisted snapshot: ${formatUnknownMessage(error)}`,
      recoverable: true,
      detail: normalizeDiagnosticDetail({
        supervisor: config.id,
        action,
        error: formatUnknownMessage(error),
      }),
    };
  }

  function createRecoveryDiagnostic(
    workflowName: string,
    command: string,
    result: Extract<WorkflowCommandResult, { ok: false }>,
  ): WorkflowSupervisorDiagnostic {
    return {
      code: "workflowSupervisor.recoveryCommandFailed",
      message: `Workflow supervisor '${config.id}' recovery retry failed for workflow '${workflowName}' command '${command}'.`,
      recoverable: result.diagnostics.some(
        (diagnostic) => diagnostic.recoverable === true,
      ),
      workflow: workflowName,
      command,
      detail: normalizeDiagnosticDetail({
        supervisor: config.id,
        workflow: workflowName,
        command,
        diagnostics: result.diagnostics,
      }),
    };
  }

  function findRecoverableFailedCommand(
    workflow: Workflow,
  ): string | undefined {
    for (let index = workflow.history.length - 1; index >= 0; index -= 1) {
      const entry = workflow.history[index];

      if (entry.type !== "command.failed") {
        continue;
      }

      if (
        !entry.diagnostics?.some(
          (diagnostic) => diagnostic.recoverable === true,
        )
      ) {
        continue;
      }

      return entry.command;
    }

    return undefined;
  }

  function retryWorkflowCommand(
    workflow: Workflow,
    command: string,
  ): Promise<WorkflowCommandResult> {
    return (
      workflow.retry as (command: string) => Promise<WorkflowCommandResult>
    )(command);
  }

  function restore(snapshotInput: unknown): void {
    const restoredSnapshot = normalizeWorkflowSupervisorSnapshot(snapshotInput);

    if (restoredSnapshot.id !== config.id) {
      throw new Error(
        "$workflowSupervisor restore snapshot id must match supervisor id.",
      );
    }

    const supervisorDiagnostics = [...restoredSnapshot.diagnostics];

    for (const [name, workflowSnapshot] of Object.entries(
      restoredSnapshot.workflows,
    )) {
      const workflow = workflows.get(name);

      if (!workflow) {
        supervisorDiagnostics.push(
          createUnknownSnapshotWorkflowDiagnostic(name),
        );

        continue;
      }

      workflow.restore(workflowSnapshot);
    }

    status = restoredSnapshot.status;
    replaceArray(diagnostics, supervisorDiagnostics);
  }

  async function persist(): Promise<
    WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
  > {
    const supervisorSnapshot = snapshot();

    if (!config.persistence) {
      return supervisorSnapshot;
    }

    status = "persisting";

    try {
      await config.persistence.save(config.id, supervisorSnapshot);
      status = "idle";

      return supervisorSnapshot;
    } catch (error) {
      status = "failed";
      appendSupervisorDiagnostic(
        createPersistenceDiagnostic(
          "workflowSupervisor.persistenceSaveFailed",
          "save",
          error,
        ),
      );

      throw error;
    }
  }

  async function load(): Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  > {
    if (!config.persistence) {
      return undefined;
    }

    status = "recovering";

    try {
      const persistedSnapshot = await config.persistence.load(config.id);

      if (!persistedSnapshot) {
        status = "idle";

        return undefined;
      }

      restore(persistedSnapshot);
      status = "idle";

      return snapshot();
    } catch (error) {
      status = "failed";
      appendSupervisorDiagnostic(
        createPersistenceDiagnostic(
          "workflowSupervisor.persistenceLoadFailed",
          "load",
          error,
        ),
      );

      throw error;
    }
  }

  async function persistAfterCommand<TOutput>(
    result: WorkflowCommandResult<TOutput>,
  ): Promise<WorkflowCommandResult<TOutput>> {
    try {
      await persist();
    } catch {
      return result;
    }

    return result;
  }

  function getWorkflowOrThrow(name: string): Workflow {
    const workflow = getWorkflowOrRecordDiagnostic(name);

    if (!workflow) {
      throw new Error(
        `$workflowSupervisor workflow '${name}' is not registered.`,
      );
    }

    if ((config.persistencePolicy ?? "manual") !== "after-command") {
      return workflow;
    }

    let exposedWorkflow = exposedWorkflows.get(name);

    if (!exposedWorkflow) {
      exposedWorkflow = new Proxy(workflow, {
        get(target, property, receiver) {
          if (property === "run") {
            return (
              command: string,
              input?: unknown,
              options?: WorkflowCommandOptions,
            ) =>
              runWorkflowCommand(target, command, input, options).then(
                persistAfterCommand,
              );
          }

          return Reflect.get(target, property, receiver) as unknown;
        },
      });
      exposedWorkflows.set(name, exposedWorkflow);
    }

    return exposedWorkflow;
  }

  function getWorkflowOrRecordDiagnostic(
    workflowName: unknown,
    command?: string,
  ): Workflow | undefined {
    if (!isString(workflowName) || !workflowName) {
      appendSupervisorDiagnostic(
        createMissingWorkflowDiagnostic(workflowName, command),
      );

      return undefined;
    }

    const workflow = workflows.get(workflowName);

    if (!workflow) {
      appendSupervisorDiagnostic(
        createMissingWorkflowDiagnostic(workflowName, command),
      );

      return undefined;
    }

    return workflow;
  }

  const supervisor: WorkflowSupervisor<TWorkflows> = {
    id: config.id,
    get status() {
      return status;
    },
    diagnostics,
    ready:
      config.recovery?.restoreOnStart === true && config.persistence
        ? load().catch(() => undefined)
        : Promise.resolve(undefined),
    workflow(name) {
      return getWorkflowOrThrow(name) as WorkflowFromDefinition<
        TWorkflows[typeof name]
      >;
    },
    cancelAll() {
      let cancelled = 0;

      for (const workflow of workflows.values()) {
        cancelled += workflow.cancel();
      }

      return cancelled;
    },
    snapshot,
    restore,
    persist,
    load,
    async recover() {
      status = "recovering";

      let recovered = false;
      let failed = false;

      for (const [workflowName, workflow] of workflows) {
        const command = findRecoverableFailedCommand(workflow);

        if (!command) {
          continue;
        }

        recovered = true;

        const result = await retryWorkflowCommand(workflow, command);

        if (!result.ok) {
          failed = true;
          appendSupervisorDiagnostic(
            createRecoveryDiagnostic(workflowName, command, result),
          );
        }
      }

      status = failed ? "failed" : "idle";

      return recovered ? snapshot() : undefined;
    },
  };

  return supervisor;
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

  function snapshot(): Record<string, WorkflowSnapshot<object>> {
    const snapshots: Record<string, WorkflowSnapshot<object>> = {};

    for (const [name, workflow] of workflows) {
      snapshots[name] = workflow.snapshot() as WorkflowSnapshot<object>;
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

  function send(request: WorkflowWorkerRequest): WorkflowSendResult {
    const workflow = getWorkflowWorkerWorkflow(workflows, request.workflow);

    if (!workflow || !isString(request.event) || !request.event) {
      return {
        ok: false,
        status: "missing-workflow",
        type: isString(request.event) ? request.event : "",
        payload: request.payload,
      };
    }

    return sendWorkerWorkflowEvent(workflow, request.event, request.payload);
  }

  function restore(
    request: WorkflowWorkerRequest,
  ): Record<string, WorkflowSnapshot<object>> {
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
      } else if (message.operation === "send") {
        result = send(message);
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
  connection: WorkerConnection,
): WorkflowWorkerClient {
  const postMessageMethod = isObject(connection)
    ? (connection as Partial<WorkerConnection>).postMessage
    : undefined;
  const onMessageMethod = isObject(connection)
    ? (connection as Partial<WorkerConnection>).onMessage
    : undefined;

  if (
    !isObject(connection) ||
    !isFunction(postMessageMethod) ||
    !isFunction(onMessageMethod)
  ) {
    throw new Error("Workflow worker client requires a WorkerConnection.");
  }

  const postMessage = postMessageMethod.bind(connection) as (
    message: WorkflowWorkerRequest,
  ) => void;
  let nextRequestId = 1;
  let disposed = false;
  let latestSnapshot: Record<string, WorkflowSnapshot<object>> | undefined;
  const pending = new Map<
    string,
    {
      reject(error: Error): void;
      resolve(value: unknown): void;
    }
  >();
  const snapshotListeners = new Set<
    (snapshot: Record<string, WorkflowSnapshot<object>>) => void
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
      postMessage(message);
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
    send(workflow, event, payload) {
      return request("send", {
        workflow,
        event,
        payload,
      });
    },
    async snapshot() {
      const workerSnapshot =
        await request<Record<string, WorkflowSnapshot<object>>>("snapshot");

      latestSnapshot = workerSnapshot;

      return workerSnapshot;
    },
    async restore(snapshotInput) {
      const restoredSnapshot = await request<
        Record<string, WorkflowSnapshot<object>>
      >("restore", {
        snapshot: snapshotInput,
      });

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
      candidate.operation === "send" ||
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
): Promise<WorkflowCommandResult> {
  return (
    workflow.run as (
      command: string,
      input?: unknown,
    ) => Promise<WorkflowCommandResult>
  )(command, input);
}

function sendWorkerWorkflowEvent(
  workflow: Workflow,
  event: string,
  payload: unknown,
): WorkflowSendResult {
  return (
    workflow.send as (event: string, payload?: unknown) => WorkflowSendResult
  )(event, payload);
}

function createWorkflowWorkerCommandFailure(
  code: string,
  message: string,
  command?: string,
): WorkflowCommandResult {
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
function createWorkflowSupervisorRegistry<
  TWorkflows extends WorkflowSupervisorWorkflowMap,
>(
  $workflow: WorkflowService,
  config: WorkflowSupervisorConfig<TWorkflows>,
): Map<string, Workflow> {
  assertWorkflowSupervisorConfig(config);

  const registry = new Map<string, Workflow>();
  const workflowEntries = normalizeWorkflowSupervisorEntries(
    (config as { workflows?: unknown }).workflows,
  );

  if (!workflowEntries.length) {
    throw new Error("$workflowSupervisor requires at least one workflow.");
  }

  for (const [name, definition] of workflowEntries) {
    if (!isString(name) || !name) {
      throw new Error(
        "$workflowSupervisor workflow names must be non-empty strings.",
      );
    }

    if (registry.has(name)) {
      throw new Error(`$workflowSupervisor duplicate workflow name '${name}'.`);
    }

    registry.set(name, createWorkflowSupervisorWorkflow($workflow, definition));
  }

  return registry;
}

function assertWorkflowSupervisorConfig(config: unknown): void {
  if (!isObject(config)) {
    throw new Error("$workflowSupervisor requires a config object.");
  }

  const id = (config as { id?: unknown }).id;

  if (!isString(id) || !id) {
    throw new Error("$workflowSupervisor requires a non-empty id.");
  }

  const persistencePolicy = (config as { persistencePolicy?: unknown })
    .persistencePolicy;

  if (
    persistencePolicy !== undefined &&
    persistencePolicy !== "manual" &&
    persistencePolicy !== "after-command"
  ) {
    throw new Error(
      "$workflowSupervisor persistencePolicy must be 'manual' or 'after-command'.",
    );
  }

  const recovery = (config as { recovery?: unknown }).recovery;

  if (recovery === undefined) {
    return;
  }

  if (!isObject(recovery) || isArray(recovery)) {
    throw new Error("$workflowSupervisor recovery must be an object.");
  }

  const recoveryPolicy = recovery as WorkflowSupervisorRecoveryPolicy;

  if (
    recoveryPolicy.restoreOnStart !== undefined &&
    !isBoolean(recoveryPolicy.restoreOnStart)
  ) {
    throw new Error(
      "$workflowSupervisor recovery.restoreOnStart must be a boolean.",
    );
  }
}

function normalizeWorkflowSupervisorEntries(
  workflows: unknown,
): Array<[string, unknown]> {
  if (isArray(workflows)) {
    return workflows.map(normalizeWorkflowSupervisorEntry);
  }

  if (!isObject(workflows)) {
    throw new Error("$workflowSupervisor requires workflows.");
  }

  return Object.entries(workflows);
}

function normalizeWorkflowSupervisorEntry(entry: unknown): [string, unknown] {
  if (isArray(entry)) {
    return [entry[0] as string, entry[1]];
  }

  if (isObject(entry)) {
    const record = entry as {
      config?: unknown;
      name?: unknown;
      workflow?: unknown;
    };

    if (hasOwn(record, "workflow")) {
      return [record.name as string, record.workflow];
    }

    if (hasOwn(record, "config")) {
      return [record.name as string, record.config];
    }
  }

  throw new Error(
    "$workflowSupervisor workflow entries must be tuples or objects.",
  );
}

function createWorkflowSupervisorWorkflow(
  $workflow: WorkflowService,
  definition: unknown,
): Workflow {
  if (isWorkflowInstance(definition)) {
    return definition;
  }

  if (!isObject(definition)) {
    throw new Error(
      "$workflowSupervisor workflow must be a workflow instance or config object.",
    );
  }

  return $workflow(definition as WorkflowConfig);
}

function isWorkflowInstance(value: unknown): value is Workflow {
  const workflow = value as Partial<Workflow> | undefined;

  return (
    isObject(workflow) &&
    isString(workflow.id) &&
    isString(workflow.current) &&
    isObject(workflow.data) &&
    isArray(workflow.diagnostics) &&
    isArray(workflow.history) &&
    isFunction(workflow.send) &&
    isFunction(workflow.can) &&
    isFunction(workflow.matches) &&
    isFunction(workflow.run) &&
    isFunction(workflow.retry) &&
    isFunction(workflow.cancel) &&
    isFunction(workflow.snapshot) &&
    isFunction(workflow.restore)
  );
}

function normalizeWorkflowSupervisorSnapshot(
  snapshot: unknown,
): WorkflowSupervisorSnapshot {
  assertWorkflowSupervisorSnapshot(snapshot);

  const diagnostics = normalizeWorkflowSupervisorDiagnostics(
    snapshot.diagnostics,
  );

  return {
    version: 1,
    id: snapshot.id,
    status: normalizeRestoredSupervisorStatus(snapshot.status, diagnostics),
    workflows: snapshot.workflows,
    diagnostics,
    updatedAt: snapshot.updatedAt,
  };
}

function normalizeRestoredSupervisorStatus(
  status: WorkflowSupervisorStatus,
  diagnostics: WorkflowSupervisorDiagnostic[],
): WorkflowSupervisorStatus {
  if (status === "failed") {
    return "failed";
  }

  if (
    status === "running" ||
    status === "persisting" ||
    status === "recovering"
  ) {
    return diagnostics.some((diagnostic) => diagnostic.recoverable === false)
      ? "failed"
      : "idle";
  }

  return status;
}

function assertWorkflowSupervisorSnapshot(
  snapshot: unknown,
): asserts snapshot is WorkflowSupervisorSnapshot {
  if (!isObject(snapshot)) {
    throw new Error("$workflowSupervisor restore requires a snapshot object.");
  }

  const candidate = snapshot as Partial<WorkflowSupervisorSnapshot>;

  if (candidate.version !== 1) {
    throw new Error(
      "$workflowSupervisor restore requires a version 1 snapshot.",
    );
  }

  if (!isString(candidate.id) || !candidate.id) {
    throw new Error("$workflowSupervisor restore requires a non-empty id.");
  }

  if (!isWorkflowSupervisorStatus(candidate.status)) {
    throw new Error("$workflowSupervisor restore requires a valid status.");
  }

  if (!isObject(candidate.workflows) || isArray(candidate.workflows)) {
    throw new Error("$workflowSupervisor restore requires workflows.");
  }

  if (!isArray(candidate.diagnostics)) {
    throw new Error("$workflowSupervisor restore requires diagnostics.");
  }

  if (!isNumber(candidate.updatedAt) || !Number.isFinite(candidate.updatedAt)) {
    throw new Error("$workflowSupervisor restore requires updatedAt.");
  }
}

function isWorkflowSupervisorStatus(
  value: unknown,
): value is WorkflowSupervisorStatus {
  return (
    value === "idle" ||
    value === "running" ||
    value === "persisting" ||
    value === "recovering" ||
    value === "failed"
  );
}

function normalizeWorkflowSupervisorDiagnostics(
  supervisorDiagnostics: unknown,
): WorkflowSupervisorDiagnostic[] {
  /* istanbul ignore next: restore validation enforces diagnostics arrays before normalization. */
  if (!isArray(supervisorDiagnostics)) {
    return [];
  }

  return supervisorDiagnostics.map((diagnostic) => {
    if (!isObject(diagnostic)) {
      return {
        code: "workflowSupervisor.diagnostic",
        message: formatUnknownMessage(diagnostic),
        recoverable: true,
      };
    }

    const candidate = diagnostic as Partial<WorkflowSupervisorDiagnostic>;

    return {
      code: isString(candidate.code)
        ? candidate.code
        : "workflowSupervisor.diagnostic",
      message: isString(candidate.message)
        ? candidate.message
        : "Workflow supervisor diagnostic.",
      recoverable: isBoolean(candidate.recoverable)
        ? candidate.recoverable
        : undefined,
      workflow: isString(candidate.workflow) ? candidate.workflow : undefined,
      command: isString(candidate.command) ? candidate.command : undefined,
      detail: normalizeDiagnosticDetail(candidate.detail),
    };
  });
}

export function indexedDbWorkflowSupervisorPersistence<
  TSnapshot extends WorkflowSupervisorSnapshot = WorkflowSupervisorSnapshot,
>(
  config: WorkflowSupervisorIndexedDbPersistenceConfig = {},
): WorkflowSupervisorPersistence<TSnapshot> {
  const database = normalizeWorkflowSupervisorIndexedDbName(
    config.database,
    "database",
    "angular-ts-workflows",
  );
  const store = normalizeWorkflowSupervisorIndexedDbName(
    config.store,
    "store",
    "supervisorSnapshots",
  );
  const version = normalizeWorkflowSupervisorIndexedDbVersion(config.version);
  const indexedDBFactory = config.indexedDB ?? globalThis.indexedDB;

  return {
    async load(id) {
      const databaseHandle = await openWorkflowSupervisorIndexedDb(
        indexedDBFactory,
        database,
        store,
        version,
      );

      try {
        const transaction = databaseHandle.transaction(store, "readonly");
        const objectStore = transaction.objectStore(store);
        const value = await workflowSupervisorIdbRequest<TSnapshot | undefined>(
          objectStore.get(id) as IDBRequest<TSnapshot | undefined>,
        );

        await workflowSupervisorIdbTransaction(transaction);

        return value;
      } finally {
        databaseHandle.close();
      }
    },
    async save(id, snapshot) {
      const databaseHandle = await openWorkflowSupervisorIndexedDb(
        indexedDBFactory,
        database,
        store,
        version,
      );

      try {
        const transaction = databaseHandle.transaction(store, "readwrite");
        const objectStore = transaction.objectStore(store);

        await workflowSupervisorIdbRequest(objectStore.put(snapshot, id));
        await workflowSupervisorIdbTransaction(transaction);
      } finally {
        databaseHandle.close();
      }
    },
    async remove(id) {
      const databaseHandle = await openWorkflowSupervisorIndexedDb(
        indexedDBFactory,
        database,
        store,
        version,
      );

      try {
        const transaction = databaseHandle.transaction(store, "readwrite");
        const objectStore = transaction.objectStore(store);

        await workflowSupervisorIdbRequest(objectStore.delete(id));
        await workflowSupervisorIdbTransaction(transaction);
      } finally {
        databaseHandle.close();
      }
    },
  };
}

function normalizeWorkflowSupervisorIndexedDbName(
  value: unknown,
  field: "database" | "store",
  fallback: string,
): string {
  if (value === undefined) {
    return fallback;
  }

  if (!isString(value) || !value) {
    throw new Error(
      `$workflowSupervisor IndexedDB ${field} must be non-empty.`,
    );
  }

  return value;
}

function normalizeWorkflowSupervisorIndexedDbVersion(value: unknown): number {
  if (value === undefined) {
    return 1;
  }

  if (!isNumber(value) || !Number.isInteger(value) || value < 1) {
    throw new Error(
      "$workflowSupervisor IndexedDB version must be a positive integer.",
    );
  }

  return value;
}

function openWorkflowSupervisorIndexedDb(
  indexedDBFactory: IDBFactory | undefined,
  database: string,
  store: string,
  version: number,
): Promise<IDBDatabase> {
  if (!indexedDBFactory) {
    return Promise.reject(
      new Error(
        "$workflowSupervisor IndexedDB persistence requires indexedDB.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBFactory.open(database, version);

    request.onupgradeneeded = () => {
      const databaseHandle = request.result;

      if (!databaseHandle.objectStoreNames.contains(store)) {
        databaseHandle.createObjectStore(store);
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB open failed."));
    };
    request.onblocked = () => {
      reject(new Error("IndexedDB open was blocked."));
    };
  });
}

function workflowSupervisorIdbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error("IndexedDB request failed."));
    };
  });
}

function workflowSupervisorIdbTransaction(
  transaction: IDBTransaction,
): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    };
  });
}

function createDefaultWorkflowStateEngine<
  TData extends object,
  TEvents extends object,
>(
  $machine: MachineService,
  config: WorkflowConfig<TData, TEvents, object>,
): WorkflowStateEngine<TData, TEvents> {
  const machineConfig = {
    initial: config.initial,
    data: config.data,
    states: config.states,
  } as unknown as MachineConfig<TData, TEvents>;
  const machine: Machine<TData, TEvents> = $machine(machineConfig);

  return {
    get current() {
      return machine.current;
    },
    get data() {
      return machine.data;
    },
    send(type, ...payload) {
      return mapMachineSendResultToWorkflowSendResult(
        machine.send(type, ...payload),
      );
    },
    can(type, ...payload) {
      return machine.can(type, ...payload);
    },
    matches(mode) {
      return machine.matches(mode);
    },
    snapshot() {
      return machine.snapshot();
    },
    restore(snapshot) {
      machine.restore(snapshot);
    },
  };
}

function mapMachineSendResultToWorkflowSendResult<
  TData extends object,
  TEvents extends object,
>(result: MachineSendResult<TData, TEvents>): WorkflowSendResult<TData> {
  const evidence = {
    type: result.type,
    from: result.from,
    to: result.to,
    data: result.data,
    payload: result.payload,
    detail: result.policyDecision,
  };

  return result.ok
    ? { ...evidence, ok: true, status: result.status }
    : { ...evidence, ok: false, status: result.status };
}

function createWorkflowStateEngine<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
>(
  $machine: MachineService,
  config: WorkflowConfig<TData, TEvents, TCommands>,
): WorkflowStateEngine<TData, TEvents> {
  const createDefaultEngine = () =>
    createDefaultWorkflowStateEngine(
      $machine,
      config as WorkflowConfig<TData, TEvents, object>,
    );

  const engine = config.stateEngine
    ? config.stateEngine({
        config,
        createDefaultEngine,
      })
    : createDefaultEngine();

  assertWorkflowStateEngine(engine);

  return engine;
}

function createWorkflowFactory($machine: MachineService) {
  return function createWorkflow<
    TData extends object,
    TEvents extends object = WorkflowNoEvents,
    TCommands extends object = WorkflowNoCommands,
  >(
    config: WorkflowConfig<TData, TEvents, TCommands>,
  ): Workflow<TData, TEvents, TCommands> {
    assertWorkflowConfig(config);

    const engine = createWorkflowStateEngine($machine, config);
    const diagnostics: WorkflowDiagnostic[] = [];
    const history: WorkflowHistoryEntry[] = [];
    const diagnosticLimit = normalizeEntryLimit(
      config.diagnosticLimit,
      "$workflow diagnosticLimit",
      1000,
    );
    const historyLimit = normalizeHistoryLimit(config.historyLimit);
    const runningCommands = new Set<WorkflowRunState>();
    const commandQueues = new Map<string, Promise<unknown>>();
    const replayInputs = new Map<number, unknown>();
    const bindings = new Map<
      number,
      WorkflowBinding<TData, TEvents, TCommands>
    >();
    let activeBinding: WorkflowBinding<TData, TEvents, TCommands> | undefined;
    let nextHistoryId = 1;
    let queueGeneration = 0;

    const workflowTarget: WorkflowTarget<TData, TEvents, TCommands> = {
      id: config.id,
      get current() {
        return engine.current;
      },
      get data() {
        return engine.data;
      },
      diagnostics,
      history,
      send(type: string, payload?: unknown): WorkflowSendResult<TData> {
        const result = engine.send(
          type as Extract<keyof TEvents, string>,
          payload as never,
        );

        if (result.ok) {
          scheduleWorkflowBindings();
        } else {
          const status = result.status;

          appendDiagnostics(
            createDiagnostic(
              "workflow.invalidTransition",
              `Workflow mode '${engine.current}' cannot handle transition '${type}' (${status}).`,
              undefined,
              true,
              {
                current: engine.current,
                status,
                type,
                payload,
              },
            ),
          );
          scheduleWorkflowBindings();
        }

        return result;
      },
      can(type: string, payload?: unknown): boolean {
        return engine.can(
          type as Extract<keyof TEvents, string>,
          payload as never,
        );
      },
      matches(mode: MachineMode): boolean {
        return engine.matches(mode);
      },
      async run<TOutput = unknown>(
        command: string,
        input?: unknown,
        options?: WorkflowCommandOptions,
      ): Promise<WorkflowCommandResult<TOutput>> {
        if (!isString(command) || !command) {
          return failCommand<TOutput>(
            "workflow.invalidCommand",
            command,
            input,
            [
              createDiagnostic(
                "workflow.invalidCommand",
                "Workflow command name must be a non-empty string.",
                command,
                true,
              ),
            ],
          );
        }

        const handler = getCommand(config, command);

        if (!handler) {
          return failCommand<TOutput>(
            "workflow.missingCommand",
            command,
            input,
            [
              createDiagnostic(
                "workflow.missingCommand",
                `Workflow command '${command}' is not configured.`,
                command,
                true,
              ),
            ],
          );
        }

        const policy = options?.concurrency ?? config.concurrency ?? "allow";
        const optionDiagnostic = validateCommandOptions(command, options);

        if (optionDiagnostic) {
          return failCommand<TOutput>(
            "workflow.invalidCommandOptions",
            command,
            input,
            [optionDiagnostic],
          );
        }

        if (policy === "reject" && isCommandRunning(command)) {
          return failCommand<TOutput>(
            "workflow.commandRunning",
            command,
            input,
            [
              createDiagnostic(
                "workflow.commandRunning",
                `Workflow command '${command}' is already running.`,
                command,
                true,
              ),
            ],
          );
        }

        if (policy === "queue") {
          const generation = queueGeneration;
          const previous = commandQueues.get(command) ?? Promise.resolve();
          const queued = previous
            .catch(() => undefined)
            .then(() => {
              if (generation !== queueGeneration) {
                return {
                  ok: false,
                  status: "cancelled",
                  diagnostics: [
                    createDiagnostic(
                      "workflow.commandCancelled",
                      `Workflow command '${command}' was cancelled.`,
                      command,
                      true,
                    ),
                  ],
                } satisfies WorkflowCommandResult<TOutput>;
              }

              return executeCommand<TOutput>(command, input, handler, options);
            });
          const tail = queued.finally(() => {
            if (commandQueues.get(command) === tail) {
              commandQueues.delete(command);
            }
          });

          commandQueues.set(command, tail);

          return queued;
        }

        return executeCommand(command, input, handler, options);
      },
      retry<TOutput = unknown>(
        command?: string | WorkflowCommandOptions,
        options?: WorkflowCommandOptions,
      ): Promise<WorkflowCommandResult<TOutput>> {
        const replay = normalizeReplayArgs(command, options);

        if (replay.invalidCommand) {
          return Promise.resolve(
            failWithoutHistory<TOutput>([
              createDiagnostic(
                "workflow.invalidCommand",
                "Workflow command name must be a non-empty string.",
                undefined,
                true,
              ),
            ]),
          );
        }

        const retryEntry = findRetryEntry(replay.command);

        if (!retryEntry) {
          return Promise.resolve(
            failWithoutHistory<TOutput>([
              createDiagnostic(
                "workflow.noFailedCommand",
                isString(replay.command) && replay.command
                  ? `Workflow command '${replay.command}' has no failed run to retry.`
                  : "Workflow has no failed command to retry.",
                isString(replay.command) && replay.command
                  ? replay.command
                  : undefined,
                true,
              ),
            ]),
          );
        }

        return runWorkflowCommand<TOutput>(
          workflowTarget,
          retryEntry.command,
          getReplayInput(retryEntry),
          replay.options,
        );
      },
      cancel(command?: string): number {
        if (command !== undefined && (!isString(command) || !command)) {
          return 0;
        }

        let cancelled = 0;

        for (const state of runningCommands) {
          if (command && state._command !== command) {
            continue;
          }

          cancelRun(
            state,
            createDiagnostic(
              "workflow.commandCancelled",
              `Workflow command '${state._command}' was cancelled.`,
              state._command,
              true,
            ),
          );
          cancelled += 1;
        }

        return cancelled;
      },
      snapshot(): WorkflowSnapshot<TData> {
        const stateSnapshot = engine.snapshot();

        return {
          version: 1,
          id: config.id,
          current: stateSnapshot.current,
          data: structuredClone(stateSnapshot.data),
          diagnostics: structuredClone(diagnostics),
          history: structuredClone(history),
        };
      },
      restore(snapshot: unknown): void {
        const restoredSnapshot = normalizeWorkflowSnapshot(snapshot);

        if (restoredSnapshot.id !== config.id) {
          throw new Error(
            "$workflow restore snapshot id must match workflow id.",
          );
        }

        queueGeneration += 1;
        commandQueues.clear();
        cancelRunningCommands(false);
        engine.restore({
          current: restoredSnapshot.current,
          data: restoredSnapshot.data,
        });
        replaceArray(
          diagnostics,
          normalizeDiagnostics(restoredSnapshot.diagnostics),
        );
        trimDiagnostics();
        replaceArray(history, normalizeHistory(restoredSnapshot.history));
        trimHistory();
        resetReplayInputs();
        nextHistoryId =
          history.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
        scheduleWorkflowBindings();
      },
    };

    Object.defineProperty(workflowTarget, SCOPE_PROXY_BIND, {
      value(handler: Scope, proxy: Workflow<TData, TEvents, TCommands>) {
        let binding = bindings.get(handler.$id);

        if (!binding) {
          binding = {
            _handler: handler,
            _proxy: proxy,
          };
          bindings.set(handler.$id, binding);
        }

        activeBinding = binding;
      },
    });

    return workflowTarget;

    async function executeCommand<TOutput>(
      command: string,
      input: unknown,
      handler: WorkflowCommand<unknown, unknown, TData, TEvents>,
      options?: WorkflowCommandOptions,
    ): Promise<WorkflowCommandResult<TOutput>> {
      appendHistory({
        type: "command.started",
        command,
        input,
      });

      const state = createRunState(command, options);

      try {
        const cancelDiagnostic = state._cancelDiagnostic;

        if (cancelDiagnostic) {
          return failCommand<TOutput>(cancelDiagnostic.code, command, input, [
            cancelDiagnostic,
          ]);
        }

        const commandPromise = Promise.resolve(
          (() => {
            const data = createWorkflowDataProxy(engine.data, state);

            return invokeWorkflowCommand(handler, {
              workflow: createCommandWorkflow(getActiveWorkflow(), state, data),
              cleanup(callback) {
                if (!isFunction(callback)) {
                  return;
                }

                state._cleanups.push(callback);
              },
              data,
              input,
              command,
              signal: state._controller.signal,
            });
          })(),
        );
        const commandValue = (await Promise.race([
          commandPromise,
          state._cancelPromise.then((diagnostic) => ({
            _workflowCancel: diagnostic,
          })),
        ])) as
          | WorkflowCommandReturn<TOutput>
          | TOutput
          | {
              _workflowCancel: WorkflowDiagnostic;
            };

        commandPromise.catch(() => undefined);

        if (
          isObject(commandValue) &&
          (commandValue as { _workflowCancel?: WorkflowDiagnostic })
            ._workflowCancel
        ) {
          const cancelled = commandValue as {
            _workflowCancel: WorkflowDiagnostic;
          };

          if (state._discardResult) {
            return {
              ok: false,
              status: commandStatusFromDiagnostics([cancelled._workflowCancel]),
              diagnostics: [cancelled._workflowCancel],
            };
          }

          return failCommand<TOutput>(
            cancelled._workflowCancel.code,
            command,
            input,
            [cancelled._workflowCancel],
          );
        }

        const result = normalizeCommandResult<TOutput>(
          commandValue as WorkflowCommandReturn<TOutput> | TOutput,
        );

        if (result.diagnostics?.length) {
          appendDiagnostics(...result.diagnostics);
        }

        appendHistory(
          result.ok
            ? {
                type: "command.completed",
                command,
                input,
                output: result.output,
                diagnostics: result.diagnostics,
              }
            : {
                type: "command.failed",
                command,
                input,
                diagnostics: result.diagnostics,
              },
        );

        return result;
      } catch (error) {
        if (state._cancelDiagnostic) {
          if (state._discardResult) {
            return {
              ok: false,
              status: commandStatusFromDiagnostics([state._cancelDiagnostic]),
              diagnostics: [state._cancelDiagnostic],
            };
          }

          return failCommand<TOutput>(
            state._cancelDiagnostic.code,
            command,
            input,
            [state._cancelDiagnostic],
          );
        }

        return failCommand<TOutput>("workflow.commandFailed", command, input, [
          diagnosticFromError(error, command),
        ]);
      } finally {
        finishRunState(state);
      }
    }

    function getActiveWorkflow(): Workflow<TData, TEvents, TCommands> {
      return getActiveBinding()?._proxy ?? workflowTarget;
    }

    function getActiveBinding():
      | WorkflowBinding<TData, TEvents, TCommands>
      | undefined {
      if (activeBinding && !activeBinding._handler._destroyed) {
        return activeBinding;
      }

      for (const [scopeId, binding] of bindings) {
        if (binding._handler._destroyed) {
          bindings.delete(scopeId);

          continue;
        }

        activeBinding = binding;

        return binding;
      }

      activeBinding = undefined;

      return undefined;
    }

    function scheduleWorkflowBindings(): void {
      for (const [scopeId, binding] of bindings) {
        if (binding._handler._destroyed) {
          bindings.delete(scopeId);

          continue;
        }

        binding._handler._scheduleWatchKeys([
          "current",
          "data",
          "diagnostics",
          "history",
        ]);
        binding._handler._checkListenersForAllKeys(engine.data as never);
        binding._handler._checkListenersForAllKeys(diagnostics as never);
        binding._handler._checkListenersForAllKeys(history as never);
      }
    }

    function appendDiagnostics(...entries: WorkflowDiagnostic[]): void {
      diagnostics.push(...entries);
      trimDiagnostics();
    }

    function trimDiagnostics(): void {
      trimArray(diagnostics, diagnosticLimit);
    }

    function appendHistory(
      entry: Omit<WorkflowHistoryEntry, "id">,
    ): WorkflowHistoryEntry {
      const historyEntry: WorkflowHistoryEntry = {
        id: nextHistoryId++,
        type: entry.type,
        command: entry.command,
        input: normalizeHistoryValue(entry.input),
        ...(hasOwn(entry, "output")
          ? { output: normalizeHistoryValue(entry.output) }
          : {}),
        ...(entry.diagnostics
          ? { diagnostics: normalizeDiagnostics(entry.diagnostics) }
          : {}),
      };

      replayInputs.set(historyEntry.id, entry.input);

      history.push(historyEntry);
      trimHistory();
      scheduleWorkflowBindings();

      return historyEntry;
    }

    function trimHistory(): void {
      const removed = trimArray(history, historyLimit);

      for (const entry of removed) {
        replayInputs.delete(entry.id);
      }
    }

    function isCommandRunning(command: string): boolean {
      for (const state of runningCommands) {
        if (state._command === command) {
          return true;
        }
      }

      return false;
    }

    function createRunState(
      command: string,
      options?: WorkflowCommandOptions,
    ): WorkflowRunState {
      const controller = new AbortController();
      let cancel!: (diagnostic: WorkflowDiagnostic) => void;
      const state: WorkflowRunState = {
        _cancel(diagnostic) {
          cancel(diagnostic);
        },
        _cancelPromise: new Promise<WorkflowDiagnostic>((resolve) => {
          cancel = resolve;
        }),
        _cleanups: [],
        _command: command,
        _controller: controller,
        _discardResult: false,
        _done: false,
      };
      const timeout = normalizeTimeout(
        options?.timeout ?? config.commandTimeout,
      );
      let timeoutId: number | undefined;

      if (options?.signal) {
        if (options.signal.aborted) {
          cancelRun(
            state,
            createDiagnostic(
              "workflow.commandCancelled",
              `Workflow command '${command}' was cancelled.`,
              command,
              true,
            ),
          );
        } else {
          const abortHandler = () => {
            cancelRun(
              state,
              createDiagnostic(
                "workflow.commandCancelled",
                `Workflow command '${command}' was cancelled.`,
                command,
                true,
              ),
            );
          };

          options.signal.addEventListener("abort", abortHandler, {
            once: true,
          });
          state._cleanups.push(() =>
            options.signal?.removeEventListener("abort", abortHandler),
          );
        }
      }

      if (timeout !== undefined) {
        timeoutId = window.setTimeout(() => {
          cancelRun(
            state,
            createDiagnostic(
              "workflow.commandTimeout",
              `Workflow command '${command}' timed out after ${String(
                timeout,
              )}ms.`,
              command,
              true,
              {
                timeout,
              },
            ),
          );
        }, timeout);
      }

      if (timeoutId !== undefined) {
        state._cleanups.push(() => {
          window.clearTimeout(timeoutId);
        });
      }

      runningCommands.add(state);

      return state;
    }

    function cancelRun(
      state: WorkflowRunState,
      diagnostic: WorkflowDiagnostic,
      discardResult = false,
    ): void {
      if (state._done || state._cancelDiagnostic) {
        return;
      }

      state._discardResult = discardResult;
      state._cancelDiagnostic = diagnostic;
      state._cancel(diagnostic);

      if (!state._controller.signal.aborted) {
        state._controller.abort(diagnostic);
      }
    }

    function finishRunState(state: WorkflowRunState): void {
      state._done = true;
      runningCommands.delete(state);

      while (state._cleanups.length) {
        const cleanup = state._cleanups.pop();

        try {
          cleanup?.();
        } catch (error) {
          if (state._discardResult) {
            continue;
          }

          appendDiagnostics(
            diagnosticFromError(
              error,
              state._command,
              "workflow.cleanupFailed",
            ),
          );
        }
      }

      scheduleWorkflowBindings();
    }

    function cancelRunningCommands(recordResult = true): void {
      for (const state of runningCommands) {
        cancelRun(
          state,
          createDiagnostic(
            "workflow.commandCancelled",
            `Workflow command '${state._command}' was cancelled.`,
            state._command,
            true,
          ),
          !recordResult,
        );
      }
    }

    function findRetryEntry(
      command?: string,
    ): WorkflowHistoryEntry | undefined {
      for (let index = history.length - 1; index >= 0; index -= 1) {
        const entry = history[index];

        if (entry.type !== "command.failed") {
          continue;
        }

        if (isString(command) && command && entry.command !== command) {
          continue;
        }

        return entry;
      }

      return undefined;
    }

    function getReplayInput(entry: WorkflowHistoryEntry): unknown {
      return replayInputs.has(entry.id)
        ? replayInputs.get(entry.id)
        : entry.input;
    }

    function resetReplayInputs(): void {
      replayInputs.clear();

      for (const entry of history) {
        if (hasOwn(entry, "input")) {
          replayInputs.set(entry.id, entry.input);
        }
      }
    }

    function normalizeWorkflowSnapshot(
      snapshot: unknown,
    ): WorkflowSnapshot<TData> {
      if (
        isObject(snapshot) &&
        (snapshot as { version?: unknown }).version === 1
      ) {
        assertWorkflowSnapshot(snapshot);

        return snapshot as WorkflowSnapshot<TData>;
      }

      if (config.migrateSnapshot) {
        const migrated = config.migrateSnapshot(snapshot);

        assertWorkflowSnapshot(migrated);

        return migrated;
      }

      assertWorkflowSnapshot(snapshot);

      return snapshot as WorkflowSnapshot<TData>;
    }

    function failCommand<TOutput = unknown>(
      code: string,
      command: unknown,
      input: unknown,
      commandDiagnostics: WorkflowDiagnostic[],
    ): WorkflowCommandResult<TOutput> {
      appendDiagnostics(...commandDiagnostics);

      if (isString(command) && command) {
        appendHistory({
          type: "command.failed",
          command,
          input,
          diagnostics: commandDiagnostics,
        });
      } else {
        scheduleWorkflowBindings();
      }

      return {
        ok: false,
        status: commandStatusFromDiagnostics(commandDiagnostics),
        diagnostics: commandDiagnostics.length
          ? commandDiagnostics
          : [
              createDiagnostic(
                code,
                "Workflow command failed.",
                isString(command) ? command : undefined,
                true,
              ),
            ],
      };
    }

    function failWithoutHistory<TOutput = unknown>(
      commandDiagnostics: WorkflowDiagnostic[],
    ): WorkflowCommandResult<TOutput> {
      appendDiagnostics(...commandDiagnostics);
      scheduleWorkflowBindings();

      return {
        ok: false,
        status: commandStatusFromDiagnostics(commandDiagnostics),
        diagnostics: commandDiagnostics,
      };
    }
  };
}

function runWorkflowCommand<TOutput>(
  workflow: unknown,
  command: string,
  input?: unknown,
  options?: WorkflowCommandOptions,
): Promise<WorkflowCommandResult<TOutput>> {
  const runner = workflow as {
    run<TCommandOutput = unknown>(
      command: string,
      input?: unknown,
      options?: WorkflowCommandOptions,
    ): Promise<WorkflowCommandResult<TCommandOutput>>;
  };

  return runner.run<TOutput>(command, input, options);
}

function invokeWorkflowCommand<
  TInput,
  TOutput,
  TData extends object,
  TEvents extends object,
>(
  handler: WorkflowCommand<TInput, TOutput, TData, TEvents>,
  context: WorkflowCommandContext<TInput, TData, TEvents>,
): WorkflowCommandHandlerResult<TOutput> {
  return handler(context);
}

function createCommandWorkflow<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
>(
  workflow: Workflow<TData, TEvents, TCommands>,
  state: WorkflowRunState,
  data: TData,
): Workflow<TData, TEvents, TCommands> {
  return new Proxy(workflow, {
    get(target, property, receiver) {
      if (property === "data") {
        return data;
      }

      if (property === "send") {
        return (...args: unknown[]) => {
          if (state._done) {
            return {
              ok: false,
              status: "command-finished",
              type: isString(args[0]) ? args[0] : "",
              payload: args[1],
            } satisfies WorkflowSendResult;
          }

          return (
            target.send as unknown as (
              ...sendArgs: unknown[]
            ) => WorkflowSendResult
          )(...args);
        };
      }

      if (property === "run" || property === "retry") {
        return (...args: unknown[]) =>
          state._done
            ? Promise.resolve({
                ok: false,
                status: "cancelled",
                diagnostics: [
                  createDiagnostic(
                    "workflow.commandCancelled",
                    `Workflow command '${state._command}' was cancelled.`,
                    state._command,
                    true,
                  ),
                ],
              })
            : (target[property] as (...runArgs: unknown[]) => unknown)(...args);
      }

      return Reflect.get(target, property, receiver) as unknown;
    },
  });
}

function createWorkflowDataProxy<TData extends object>(
  data: TData,
  state: WorkflowRunState,
): TData {
  const proxies = new WeakMap<object, object>();

  return proxify(data) as TData;

  function proxify(value: unknown): unknown {
    if (!isWorkflowDataProxyable(value)) {
      return value;
    }

    const cached = proxies.get(value);

    if (cached) {
      return cached;
    }

    const proxy = new Proxy(value, {
      get(target, property, receiver) {
        if (isInstanceOf(target, Map)) {
          return getWorkflowMapProperty(
            target,
            property,
            receiver,
            state,
            proxify,
          );
        }

        if (isInstanceOf(target, Set)) {
          return getWorkflowSetProperty(target, property, receiver, state);
        }

        return proxify(Reflect.get(target, property, receiver));
      },
      set(target, property, nextValue, receiver) {
        if (state._done) {
          return true;
        }

        return Reflect.set(target, property, nextValue, receiver);
      },
      deleteProperty(target, property) {
        if (state._done) {
          return true;
        }

        return Reflect.deleteProperty(target, property);
      },
      defineProperty(target, property, descriptor) {
        if (state._done) {
          return true;
        }

        return Reflect.defineProperty(target, property, descriptor);
      },
      setPrototypeOf(target, prototype) {
        if (state._done) {
          return true;
        }

        return Reflect.setPrototypeOf(target, prototype);
      },
    });

    proxies.set(value, proxy);

    return proxy;
  }
}

function getWorkflowMapProperty(
  target: Map<unknown, unknown>,
  property: string | symbol,
  receiver: unknown,
  state: WorkflowRunState,
  proxify: (value: unknown) => unknown,
): unknown {
  if (property === "size") {
    return target.size;
  }

  if (property === "get") {
    return (key: unknown) => proxify(target.get(key));
  }

  if (property === "set") {
    return (key: unknown, value: unknown) => {
      if (state._done) {
        return receiver;
      }

      target.set(key, value);

      return receiver;
    };
  }

  if (property === "delete") {
    return (key: unknown) => (state._done ? false : target.delete(key));
  }

  if (property === "clear") {
    return () => {
      if (!state._done) {
        target.clear();
      }
    };
  }

  const value = Reflect.get(target, property, target) as unknown;

  return isFunction(value) ? value.bind(target) : value;
}

function getWorkflowSetProperty(
  target: Set<unknown>,
  property: string | symbol,
  receiver: unknown,
  state: WorkflowRunState,
): unknown {
  if (property === "size") {
    return target.size;
  }

  if (property === "add") {
    return (value: unknown) => {
      if (state._done) {
        return receiver;
      }

      target.add(value);

      return receiver;
    };
  }

  if (property === "delete") {
    return (value: unknown) => (state._done ? false : target.delete(value));
  }

  if (property === "clear") {
    return () => {
      if (!state._done) {
        target.clear();
      }
    };
  }

  if (property === "has") {
    return (value: unknown) => target.has(value);
  }

  const value = Reflect.get(target, property, target) as unknown;

  return isFunction(value) ? value.bind(target) : value;
}

function isWorkflowDataProxyable(value: unknown): value is object {
  if (!isObject(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as object | null;

  return (
    isArray(value) ||
    isInstanceOf(value, Map) ||
    isInstanceOf(value, Set) ||
    prototype === Object.prototype ||
    prototype === null
  );
}

function getCommand<
  TData extends object,
  TEvents extends object = WorkflowNoEvents,
  TCommands extends object = WorkflowNoCommands,
>(
  config: WorkflowConfig<TData, TEvents, TCommands>,
  command: string,
): WorkflowCommand<unknown, unknown, TData, TEvents> | undefined {
  if (!config.commands || !hasOwn(config.commands, command)) {
    return undefined;
  }

  const handler = (config.commands as Record<string, unknown>)[command];

  return isFunction(handler)
    ? (handler as WorkflowCommand<unknown, unknown, TData, TEvents>)
    : undefined;
}

function normalizeCommandResult<TOutput>(
  value: WorkflowCommandReturn<TOutput> | TOutput,
): WorkflowCommandResult<TOutput> {
  if (isObject(value) && hasOwn(value, "ok")) {
    const result = value as {
      ok: unknown;
      output?: TOutput;
      diagnostics?: WorkflowDiagnostic[];
      status?: WorkflowCommandStatus;
    };
    const ok = result.ok;

    if (ok === true) {
      return {
        ok: true,
        status: "completed",
        output: result.output,
        diagnostics: normalizeOptionalDiagnostics(result.diagnostics),
      };
    }

    if (ok === false) {
      const normalizedDiagnostics = normalizeOptionalDiagnostics(
        result.diagnostics,
      ) ?? [
        createDiagnostic(
          "workflow.commandFailed",
          "Workflow command failed.",
          undefined,
          true,
        ),
      ];

      return {
        ok: false,
        status: normalizeCommandFailureStatus(
          result.status,
          normalizedDiagnostics,
        ),
        diagnostics: normalizedDiagnostics,
      };
    }

    return {
      ok: false,
      status: "failed",
      diagnostics: [
        createDiagnostic(
          "workflow.invalidCommandResult",
          "Workflow command result must use ok: true or ok: false.",
          undefined,
          true,
          value,
        ),
      ],
    };
  }

  return {
    ok: true,
    status: "completed",
    output: value as TOutput,
  };
}

function normalizeCommandFailureStatus(
  status: WorkflowCommandStatus | undefined,
  diagnostics: WorkflowDiagnostic[],
): Exclude<WorkflowCommandStatus, "completed"> {
  if (
    status === "failed" ||
    status === "cancelled" ||
    status === "timeout" ||
    status === "rejected"
  ) {
    return status;
  }

  return commandStatusFromDiagnostics(diagnostics);
}

function commandStatusFromDiagnostics(
  diagnostics: WorkflowDiagnostic[],
): Exclude<WorkflowCommandStatus, "completed"> {
  for (const diagnostic of diagnostics) {
    if (diagnostic.code === "workflow.commandTimeout") {
      return "timeout";
    }
  }

  for (const diagnostic of diagnostics) {
    if (diagnostic.code === "workflow.commandCancelled") {
      return "cancelled";
    }
  }

  for (const diagnostic of diagnostics) {
    if (
      diagnostic.code === "workflow.invalidCommand" ||
      diagnostic.code === "workflow.missingCommand" ||
      diagnostic.code === "workflow.invalidCommandOptions" ||
      diagnostic.code === "workflow.commandRunning" ||
      diagnostic.code === "workflow.noFailedCommand"
    ) {
      return "rejected";
    }
  }

  return "failed";
}

function normalizeDiagnostics(
  diagnostics: readonly WorkflowDiagnostic[] | undefined,
): WorkflowDiagnostic[] {
  if (!isArray(diagnostics)) {
    return [];
  }

  return diagnostics.map((diagnostic) =>
    isObject(diagnostic)
      ? {
          code: isString(diagnostic.code)
            ? diagnostic.code
            : "workflow.diagnostic",
          message: isString(diagnostic.message)
            ? diagnostic.message
            : "Workflow diagnostic.",
          recoverable: diagnostic.recoverable,
          path: isString(diagnostic.path) ? diagnostic.path : undefined,
          command: isString(diagnostic.command)
            ? diagnostic.command
            : undefined,
          detail: normalizeDiagnosticDetail(diagnostic.detail),
        }
      : createDiagnostic(
          "workflow.diagnostic",
          formatUnknownMessage(diagnostic),
          undefined,
          true,
        ),
  );
}

function normalizeOptionalDiagnostics(
  diagnostics: readonly WorkflowDiagnostic[] | undefined,
): WorkflowDiagnostic[] | undefined {
  if (!isArray(diagnostics)) {
    return undefined;
  }

  return normalizeDiagnostics(diagnostics);
}

function normalizeHistoryValue(value: unknown): unknown {
  return normalizeDiagnosticDetail(value);
}

function normalizeHistory(
  historyEntries: readonly WorkflowHistoryEntry[] | undefined,
): WorkflowHistoryEntry[] {
  if (!isArray(historyEntries)) {
    return [];
  }

  let nextFallbackId = 1;
  const usedIds = new Set<number>();

  return historyEntries.map((entry) => {
    const candidate = isObject(entry)
      ? (entry as Partial<WorkflowHistoryEntry>)
      : {};
    const id = allocateHistoryId(candidate.id);
    return {
      id,
      type: normalizeHistoryType(candidate.type),
      command:
        isString(candidate.command) && candidate.command
          ? candidate.command
          : "unknown",
      ...(hasOwn(candidate, "input")
        ? { input: normalizeHistoryValue(candidate.input) }
        : {}),
      ...(hasOwn(candidate, "output")
        ? { output: normalizeHistoryValue(candidate.output) }
        : {}),
      ...(hasOwn(candidate, "diagnostics")
        ? { diagnostics: normalizeDiagnostics(candidate.diagnostics) }
        : {}),
    };
  });

  function allocateHistoryId(value: unknown): number {
    if (
      isNumber(value) &&
      Number.isInteger(value) &&
      value > 0 &&
      !usedIds.has(value)
    ) {
      usedIds.add(value);
      nextFallbackId = Math.max(nextFallbackId, value + 1);

      return value;
    }

    while (usedIds.has(nextFallbackId)) {
      nextFallbackId += 1;
    }

    const id = nextFallbackId;

    usedIds.add(id);
    nextFallbackId += 1;

    return id;
  }
}

function normalizeHistoryType(value: unknown): WorkflowHistoryEntry["type"] {
  if (
    value === "command.started" ||
    value === "command.completed" ||
    value === "command.failed"
  ) {
    return value;
  }

  return "command.failed";
}

function diagnosticFromError(
  error: unknown,
  command: string,
  code = "workflow.commandFailed",
): WorkflowDiagnostic {
  if (isInstanceOf(error, Error)) {
    return createDiagnostic(
      code,
      error.message || "Workflow command failed.",
      command,
      true,
      {
        name: error.name,
      },
    );
  }

  return createDiagnostic(code, formatUnknownMessage(error), command, true);
}

function normalizeHistoryLimit(value: unknown): number {
  return normalizeEntryLimit(value, "$workflow historyLimit", 1000);
}

function normalizeEntryLimit(
  value: unknown,
  label: string,
  defaultValue: number,
): number {
  if (value === undefined) {
    return defaultValue;
  }

  if (!isNumber(value) || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

function trimArray<T>(target: T[], limit: number): T[] {
  if (!Number.isFinite(limit) || limit < 0) {
    return [];
  }

  const deleteCount = target.length - limit;

  if (deleteCount <= 0) {
    return [];
  }

  return target.splice(0, deleteCount);
}

function normalizeReplayArgs(
  command?: string | WorkflowCommandOptions,
  options?: WorkflowCommandOptions,
): {
  command?: string;
  invalidCommand?: boolean;
  options?: WorkflowCommandOptions;
} {
  if (isString(command)) {
    if (!command) {
      return {
        invalidCommand: true,
        options,
      };
    }

    return {
      command,
      options,
    };
  }

  if (isObject(command)) {
    return {
      options: command,
    };
  }

  return {
    options,
  };
}

function validateCommandOptions(
  command: string,
  options: WorkflowCommandOptions | undefined,
): WorkflowDiagnostic | undefined {
  if (options === undefined) {
    return undefined;
  }

  if (!isObject(options)) {
    return createDiagnostic(
      "workflow.invalidCommandOptions",
      "Workflow command options must be an object.",
      command,
      true,
    );
  }

  const concurrency = options.concurrency as unknown;

  if (
    concurrency !== undefined &&
    concurrency !== "allow" &&
    concurrency !== "reject" &&
    concurrency !== "queue"
  ) {
    return createDiagnostic(
      "workflow.invalidCommandOptions",
      "Workflow command concurrency must be 'allow', 'reject', or 'queue'.",
      command,
      true,
      {
        concurrency,
      },
    );
  }

  try {
    normalizeTimeout(options.timeout);
  } catch (error) {
    return diagnosticFromError(
      error,
      command,
      "workflow.invalidCommandOptions",
    );
  }

  if (options.signal !== undefined && !isAbortSignalLike(options.signal)) {
    return createDiagnostic(
      "workflow.invalidCommandOptions",
      "Workflow command signal must be an AbortSignal.",
      command,
      true,
    );
  }

  return undefined;
}

function isAbortSignalLike(value: unknown): value is AbortSignal {
  const signal = value as {
    aborted?: unknown;
    addEventListener?: unknown;
    removeEventListener?: unknown;
  };

  return (
    isObject(value) &&
    isBoolean(signal.aborted) &&
    isFunction(signal.addEventListener) &&
    isFunction(signal.removeEventListener)
  );
}

function normalizeTimeout(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isNumber(value) || !Number.isFinite(value)) {
    throw new Error("$workflow command timeout must be a finite number.");
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      "$workflow command timeout must be a non-negative integer.",
    );
  }

  return value;
}

function createDiagnostic(
  code: string,
  message: string,
  command?: string,
  recoverable = true,
  detail?: unknown,
): WorkflowDiagnostic {
  return {
    code,
    message,
    recoverable,
    command,
    detail: normalizeDiagnosticDetail(detail),
  };
}

function normalizeDiagnosticDetail(
  value: unknown,
  seen = new WeakSet<object>(),
): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  const valueType = typeof value;

  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean"
  ) {
    return value;
  }

  if (valueType === "bigint") {
    return (value as bigint).toString();
  }

  if (valueType === "symbol") {
    return formatSymbol(value as symbol);
  }

  if (valueType === "function") {
    return "[Function]";
  }

  const objectValue = value as object;

  if (seen.has(objectValue)) {
    return "[Circular]";
  }

  seen.add(objectValue);

  if (isInstanceOf(value, Date)) {
    seen.delete(objectValue);

    return value.toISOString();
  }

  if (isArray(value)) {
    const normalized = value.map((item) =>
      normalizeDiagnosticDetail(item, seen),
    );

    seen.delete(objectValue);

    return normalized;
  }

  if (isInstanceOf(value, Map)) {
    const normalized = Array.from(value.entries()).map(([key, entryValue]) => [
      normalizeDiagnosticDetail(key, seen),
      normalizeDiagnosticDetail(entryValue, seen),
    ]);

    seen.delete(objectValue);

    return normalized;
  }

  if (isInstanceOf(value, Set)) {
    const normalized = Array.from(value.values()).map((item) =>
      normalizeDiagnosticDetail(item, seen),
    );

    seen.delete(objectValue);

    return normalized;
  }

  if (isObject(value)) {
    const normalized: Record<string, unknown> = {};

    for (const key of Object.keys(value)) {
      normalized[key] = normalizeDiagnosticDetail(
        (value as Record<string, unknown>)[key],
        seen,
      );
    }

    seen.delete(objectValue);

    return normalized;
  }

  seen.delete(objectValue);

  return "[Unknown]";
}

function formatUnknownMessage(value: unknown): string {
  if (isInstanceOf(value, Error)) {
    return value.message || value.name;
  }

  if (isString(value)) {
    return value;
  }

  const valueType = typeof value;

  if (valueType === "number" || valueType === "boolean") {
    return String(value);
  }

  if (valueType === "bigint") {
    return (value as bigint).toString();
  }

  if (valueType === "symbol") {
    return formatSymbol(value as symbol);
  }

  if (valueType === "function") {
    return "[Function]";
  }

  return "Workflow diagnostic.";
}

function formatSymbol(value: symbol): string {
  return value.description ? `Symbol(${value.description})` : "Symbol()";
}

function replaceArray<T>(target: T[], source: T[]): void {
  target.splice(0, target.length, ...structuredClone(source));
}

function assertWorkflowConfig<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
>(config: WorkflowConfig<TData, TEvents, TCommands>): void {
  if (!isObject(config)) {
    throw new Error("$workflow requires a config object.");
  }

  if (!isString(config.id) || !config.id) {
    throw new Error("$workflow requires a non-empty id.");
  }

  if (!isString(config.initial) || !config.initial) {
    throw new Error("$workflow requires a non-empty initial mode.");
  }

  if (!isObject(config.data)) {
    throw new Error("$workflow requires a data object.");
  }

  if (!isObject(config.states)) {
    throw new Error("$workflow requires a states object.");
  }

  if (config.commands !== undefined && !isObject(config.commands)) {
    throw new Error("$workflow commands must be an object.");
  }

  if (config.stateEngine !== undefined && !isFunction(config.stateEngine)) {
    throw new Error("$workflow stateEngine must be a function.");
  }

  const concurrency = config.concurrency as unknown;

  if (
    concurrency !== undefined &&
    concurrency !== "allow" &&
    concurrency !== "reject" &&
    concurrency !== "queue"
  ) {
    throw new Error(
      "$workflow concurrency must be 'allow', 'reject', or 'queue'.",
    );
  }

  normalizeHistoryLimit(config.historyLimit);
  normalizeEntryLimit(
    config.diagnosticLimit,
    "$workflow diagnosticLimit",
    1000,
  );
  normalizeTimeout(config.commandTimeout);

  if (
    config.migrateSnapshot !== undefined &&
    !isFunction(config.migrateSnapshot)
  ) {
    throw new Error("$workflow migrateSnapshot must be a function.");
  }
}

function assertWorkflowStateEngine(value: unknown): void {
  if (!isObject(value)) {
    throw new Error("$workflow stateEngine must return an engine object.");
  }

  const engine = value as Partial<WorkflowStateEngine>;

  if (!isString(engine.current) || !engine.current) {
    throw new Error("$workflow stateEngine must expose a current mode.");
  }

  if (!isObject(engine.data)) {
    throw new Error("$workflow stateEngine must expose a data object.");
  }

  if (
    !isFunction(engine.send) ||
    !isFunction(engine.can) ||
    !isFunction(engine.matches) ||
    !isFunction(engine.snapshot) ||
    !isFunction(engine.restore)
  ) {
    throw new Error(
      "$workflow stateEngine must expose send, can, matches, snapshot, and restore.",
    );
  }
}

function assertWorkflowSnapshot(snapshot: unknown): void {
  if (!isObject(snapshot)) {
    throw new Error("$workflow restore requires a snapshot object.");
  }

  const candidate = snapshot as Partial<WorkflowSnapshot>;

  if (candidate.version !== 1) {
    throw new Error("$workflow restore requires a version 1 snapshot.");
  }

  if (!isString(candidate.id) || !candidate.id) {
    throw new Error("$workflow restore requires a non-empty id.");
  }

  if (!isString(candidate.current) || !candidate.current) {
    throw new Error("$workflow restore requires a non-empty current mode.");
  }

  if (!isObject(candidate.data)) {
    throw new Error("$workflow restore requires a data object.");
  }

  if (!isArray(candidate.diagnostics)) {
    throw new Error("$workflow restore requires diagnostics.");
  }

  if (!isArray(candidate.history)) {
    throw new Error("$workflow restore requires history.");
  }
}
