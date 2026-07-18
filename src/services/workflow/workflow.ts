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
export type WorkflowNoCommands = Record<never, never>;

type WorkflowEmptyData = Record<never, never>;

/** Input and output carried by a workflow command. */
export interface WorkflowCommandContract {
  input: unknown;
  output: unknown;
}

/** Labeled type contract carried by a workflow definition and instance. */
export interface WorkflowContract {
  data: object;
  commands: object;
  state: string;
}

type DefaultWorkflowContract = {
  data: object;
  commands: WorkflowNoCommands;
  state: string;
};

type WorkflowContractOf<
  TData extends object,
  TCommands extends object,
  TState extends string = string,
> = {
  data: TData;
  commands: TCommands;
  state: TState;
};

type WorkflowInstance<
  TData extends object,
  TCommands extends object,
  TState extends string = string,
> = Workflow<WorkflowContractOf<TData, TCommands, TState>>;

type WorkflowConfiguration<
  TData extends object,
  TCommands extends object,
  TState extends string = string,
> = WorkflowConfig<WorkflowContractOf<TData, TCommands, TState>>;

export type WorkflowConcurrencyMode = "parallel" | "reject" | "queue";

export interface WorkflowDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly recoverable?: boolean;
  readonly path?: string;
  readonly command?: string;
  readonly detail?: unknown;
}

export type WorkflowResult<TOutput = unknown> =
  | {
      readonly ok: true;
      readonly status: "completed";
      readonly output: TOutput;
      readonly diagnostics?: readonly WorkflowDiagnostic[];
    }
  | {
      readonly ok: false;
      readonly status: WorkflowFailureStatus;
      readonly diagnostics: readonly WorkflowDiagnostic[];
    };

/** @inline */
type WorkflowFailureStatus = "failed" | "cancelled" | "timeout" | "rejected";

const WORKFLOW_COMMAND_CANCELLATION = Symbol("workflow.command.cancellation");

class WorkflowCommandRejectionError extends Error {
  constructor(readonly diagnostic: WorkflowDiagnostic) {
    super(diagnostic.message);
    this.name = "WorkflowCommandRejectionError";
  }
}

interface WorkflowCommandCancellation {
  readonly [WORKFLOW_COMMAND_CANCELLATION]: WorkflowDiagnostic;
}

export interface WorkflowCommandContext<
  TContract extends WorkflowContract = DefaultWorkflowContract,
  TInput = unknown,
> {
  readonly data: Readonly<TContract["data"]>;
  readonly input: TInput;
  readonly command: string;
  cleanup(callback: () => void): void;
  /** Stop the command with a controlled, recorded diagnostic. */
  reject(diagnostic: WorkflowDiagnostic): never;
  readonly signal: AbortSignal;
}

type WorkflowCommandHandlerResult<TOutput> = TOutput | Promise<TOutput>;

type DefaultWorkflowCommandContract = {
  input: unknown;
  output: unknown;
};

export type WorkflowCommand<
  TContract extends WorkflowContract = DefaultWorkflowContract,
  TCommand extends WorkflowCommandContract = DefaultWorkflowCommandContract,
> = (
  context: WorkflowCommandContext<TContract, TCommand["input"]>,
) => WorkflowCommandHandlerResult<TCommand["output"]>;

type WorkflowCommandName<TCommands extends object> = Extract<
  keyof TCommands,
  string
>;

/** @inline */
type WorkflowCommandInput<
  TCommands extends object,
  TName extends WorkflowCommandName<TCommands>,
> = TCommands[TName] extends WorkflowCommandContract
  ? TCommands[TName]["input"]
  : unknown;

/** @inline */
type WorkflowCommandOutput<
  TCommands extends object,
  TName extends WorkflowCommandName<TCommands>,
> = TCommands[TName] extends WorkflowCommandContract
  ? TCommands[TName]["output"]
  : unknown;

/** @inline */
type WorkflowCommandInputArgs<TInput> = undefined extends TInput
  ? [input?: TInput]
  : [input: TInput];

export type WorkflowSupervisorWorkflowMap = Record<string, unknown>;

type WorkflowLifecycleTargetState<TTarget> = TTarget extends string
  ? TTarget
  : TTarget extends { to: infer TState extends string }
    ? TState
    : never;

type WorkflowCommandStates<TCommand> = TCommand extends {
  from: infer TFrom;
  pending: infer TPending;
  success: infer TSuccess;
  failure: infer TFailure;
}
  ?
      | Extract<
          TFrom extends readonly (infer TState)[] ? TState : TFrom,
          string
        >
      | WorkflowLifecycleTargetState<TPending>
      | WorkflowLifecycleTargetState<TSuccess>
      | WorkflowLifecycleTargetState<TFailure>
      | (TCommand extends { cancelled: infer TCancelled }
          ? WorkflowLifecycleTargetState<TCancelled>
          : never)
      | (TCommand extends { timeout: infer TTimeout }
          ? WorkflowLifecycleTargetState<TTimeout>
          : never)
  : never;

type WorkflowStateFromDefinition<TDefinition> = TDefinition extends {
  initial: infer TInitial extends string;
  commands: infer TCommands extends object;
}
  ?
      | TInitial
      | {
          [TName in keyof TCommands]: WorkflowCommandStates<TCommands[TName]>;
        }[keyof TCommands]
  : string;

export type WorkflowFromDefinition<TDefinition> =
  TDefinition extends Workflow<infer TContract>
    ? Workflow<TContract>
    : TDefinition extends WorkflowConfig<infer TContract>
      ? Workflow<TContract>
      : Workflow;

type WorkflowSupervisorWorkflowName<TWorkflows extends object> = Extract<
  keyof TWorkflows,
  string
>;

export type WorkflowSupervisorSnapshotMap<TWorkflows extends object> = {
  [TWorkflowName in keyof TWorkflows &
    string]: TWorkflows[TWorkflowName] extends {
    snapshot(): infer TSnapshot extends WorkflowSnapshot;
  }
    ? TSnapshot
    : TWorkflows[TWorkflowName] extends WorkflowConfig<infer TContract>
      ? WorkflowSnapshot<TContract>
      : WorkflowSnapshot;
};

export interface WorkflowHistoryEntry {
  readonly id: number;
  readonly type: "command.started" | "command.completed" | "command.failed";
  readonly command: string;
  readonly input?: unknown;
  readonly output?: unknown;
  readonly diagnostics?: readonly WorkflowDiagnostic[];
}

declare const WORKFLOW_CONTRACT: unique symbol;

/** @inline */
interface WorkflowLifecycleContext<TContract extends WorkflowContract, TInput> {
  readonly command: string;
  readonly input: TInput;
  readonly data: TContract["data"];
}

/** @inline */
interface WorkflowSuccessContext<
  TContract extends WorkflowContract,
  TInput,
  TOutput,
> extends WorkflowLifecycleContext<TContract, TInput> {
  readonly output: TOutput;
}

/** @inline */
interface WorkflowFailureContext<
  TContract extends WorkflowContract,
  TInput,
> extends WorkflowLifecycleContext<TContract, TInput> {
  readonly diagnostic: WorkflowDiagnostic;
  readonly diagnostics: readonly WorkflowDiagnostic[];
}

/** @inline */
type WorkflowLifecycleTarget<TState extends string, TContext> =
  | TState
  | {
      to: TState;
      update?(context: TContext): void;
    };

export interface WorkflowCommandDefinition<
  TContract extends WorkflowContract = DefaultWorkflowContract,
  TCommand extends WorkflowCommandContract = DefaultWorkflowCommandContract,
> {
  from: TContract["state"] | readonly TContract["state"][];
  pending: WorkflowLifecycleTarget<
    TContract["state"],
    WorkflowLifecycleContext<TContract, TCommand["input"]>
  >;
  execute?: WorkflowCommand<TContract, TCommand>;
  success: WorkflowLifecycleTarget<
    TContract["state"],
    WorkflowSuccessContext<TContract, TCommand["input"], TCommand["output"]>
  >;
  failure: WorkflowLifecycleTarget<
    TContract["state"],
    WorkflowFailureContext<TContract, TCommand["input"]>
  >;
  cancelled?: WorkflowLifecycleTarget<
    TContract["state"],
    WorkflowFailureContext<TContract, TCommand["input"]>
  >;
  timeout?: WorkflowLifecycleTarget<
    TContract["state"],
    WorkflowFailureContext<TContract, TCommand["input"]>
  >;
  concurrency?: WorkflowConcurrencyMode;
  commandTimeout?: number;
  retry?: number;
}

type WorkflowCommandConfig<TContract extends WorkflowContract> = {
  [TName in keyof TContract["commands"]]: WorkflowCommandDefinition<
    TContract,
    TContract["commands"][TName] extends WorkflowCommandContract
      ? TContract["commands"][TName]
      : DefaultWorkflowCommandContract
  >;
};

export type WorkflowConfig<
  TContract extends WorkflowContract = DefaultWorkflowContract,
> = {
  diagnosticLimit?: number;
  id: string;
  initial: TContract["state"];
  historyLimit?: number;
  migrateSnapshot?: (snapshot: unknown) => WorkflowSnapshot<TContract>;
} & (keyof TContract["data"] extends never
  ? { readonly data?: TContract["data"] }
  : { readonly data: TContract["data"] }) & {
    readonly [WORKFLOW_CONTRACT]?: TContract;
    commands: WorkflowCommandConfig<TContract>;
  };

type WorkflowInferredDefinition = {
  diagnosticLimit?: number;
  id: string;
  initial: string;
  historyLimit?: number;
  data?: object;
  commands: Record<string, object>;
};

type WorkflowDataFromDefinition<TDefinition> = TDefinition extends {
  data: infer TData extends object;
}
  ? TData
  : WorkflowEmptyData;

type WorkflowCommandMapFromDefinition<TDefinition> = TDefinition extends {
  commands: infer TCommands extends object;
}
  ? {
      [TName in keyof TCommands]: TCommands[TName] extends {
        execute: (context: infer TContext) => infer TOutput;
      }
        ? {
            input: TContext extends { input: infer TInput } ? TInput : unknown;
            output: Awaited<TOutput>;
          }
        : { input: undefined; output: undefined };
    }
  : WorkflowNoCommands;

export interface WorkflowSnapshot<
  TContract extends WorkflowContract = DefaultWorkflowContract,
> {
  readonly version: 1;
  readonly id: string;
  readonly state: TContract["state"];
  readonly data: TContract["data"];
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly history: readonly WorkflowHistoryEntry[];
}

export interface Workflow<
  TContract extends WorkflowContract = DefaultWorkflowContract,
> {
  readonly id: string;
  readonly state: TContract["state"];
  readonly data: TContract["data"];
  readonly diagnostics: readonly WorkflowDiagnostic[];
  readonly history: readonly WorkflowHistoryEntry[];
  can(command: WorkflowCommandName<TContract["commands"]>): boolean;
  run<TName extends WorkflowCommandName<TContract["commands"]>>(
    command: TName,
    ...input: WorkflowCommandInputArgs<
      WorkflowCommandInput<TContract["commands"], TName>
    >
  ): Promise<
    WorkflowResult<WorkflowCommandOutput<TContract["commands"], TName>>
  >;
  cancel(command?: WorkflowCommandName<TContract["commands"]>): number;
  snapshot(): WorkflowSnapshot<TContract>;
  restore(snapshot: unknown): void;
}

export interface WorkflowService {
  <TContract extends WorkflowContract>(
    config: WorkflowConfig<TContract>,
  ): Workflow<TContract>;
  <const TDefinition extends WorkflowInferredDefinition>(
    config: TDefinition,
  ): Workflow<
    WorkflowContractOf<
      WorkflowDataFromDefinition<TDefinition>,
      WorkflowCommandMapFromDefinition<TDefinition>,
      WorkflowStateFromDefinition<TDefinition>
    >
  >;
}

export type WorkflowSupervisorStatus =
  | "idle"
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
  TWorkflowSnapshots extends Record<string, WorkflowSnapshot> = Record<
    string,
    WorkflowSnapshot
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
}

/** Built-in IndexedDB persistence selected by a workflow supervisor. */
export interface WorkflowSupervisorPersistenceConfig {
  type: "indexeddb";
  database?: string;
  store?: string;
  version?: number;
  indexedDB?: IDBFactory;
}

export type WorkflowSupervisorConfig<
  TWorkflows extends WorkflowSupervisorWorkflowMap =
    WorkflowSupervisorWorkflowMap,
> = {
  id: string;
  workflows: TWorkflows;
} & (
  | {
      persistence:
        | "indexeddb"
        | WorkflowSupervisorPersistenceConfig
        | WorkflowSupervisorPersistence<
            WorkflowSupervisorSnapshot<
              WorkflowSupervisorSnapshotMap<TWorkflows>
            >
          >;
      /** Persist a fresh supervisor snapshot after each completed command. */
      autoPersist?: boolean;
      /** Restore persisted state and retry recoverable commands on startup. */
      autoRecover?: boolean;
    }
  | {
      persistence?: undefined;
      autoPersist?: false;
      autoRecover?: false;
    }
);

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
  recover(): Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  >;
}

type WorkflowTarget<
  TData extends object,
  TCommands extends object,
  TState extends string,
> = WorkflowInstance<TData, TCommands, TState> & ScopeProxyBindable;

interface WorkflowBinding<
  TData extends object,
  TCommands extends object,
  TState extends string,
> {
  _handler: Scope;
  _proxy: WorkflowInstance<TData, TCommands, TState>;
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
export function createWorkflowService(): WorkflowService {
  return createWorkflowFactory() as WorkflowService;
}

export function defineWorkflow<
  const TDefinition extends WorkflowInferredDefinition,
>(
  config: TDefinition,
): WorkflowConfig<
  WorkflowContractOf<
    WorkflowDataFromDefinition<TDefinition>,
    WorkflowCommandMapFromDefinition<TDefinition>,
    WorkflowStateFromDefinition<TDefinition>
  >
> &
  TDefinition;
export function defineWorkflow<
  TContract extends WorkflowContract = DefaultWorkflowContract,
>(config: WorkflowConfig<TContract>): WorkflowConfig<TContract>;
export function defineWorkflow(
  config: WorkflowConfig | WorkflowInferredDefinition,
): WorkflowConfig | WorkflowInferredDefinition {
  return config.data === undefined ? { ...config, data: {} } : config;
}

export function createWorkflowSupervisor<
  TWorkflows extends WorkflowSupervisorWorkflowMap,
>(
  $workflow: WorkflowService,
  config: WorkflowSupervisorConfig<TWorkflows>,
): WorkflowSupervisor<TWorkflows> {
  const workflows = createWorkflowSupervisorRegistry($workflow, config);
  const persistence = resolveWorkflowSupervisorPersistence(config.persistence);
  const exposedWorkflows = new Map<string, Workflow>();
  const diagnostics: WorkflowSupervisorDiagnostic[] = [];
  let status: WorkflowSupervisorStatus = "idle";

  function snapshot(): WorkflowSupervisorSnapshot<
    WorkflowSupervisorSnapshotMap<TWorkflows>
  > {
    const workflowSnapshots: Record<string, WorkflowSnapshot> = {};

    for (const [name, workflow] of workflows) {
      workflowSnapshots[name] = workflow.snapshot();
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
    result: Extract<WorkflowResult, { ok: false }>,
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
  ): WorkflowHistoryEntry | undefined {
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

      return entry;
    }

    return undefined;
  }

  function recoverWorkflowCommand(
    workflow: Workflow,
    entry: WorkflowHistoryEntry,
  ): Promise<WorkflowResult> {
    return runWorkflowCommand(workflow, entry.command, entry.input);
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

    if (!persistence) {
      return supervisorSnapshot;
    }

    status = "persisting";

    try {
      await persistence.save(config.id, supervisorSnapshot);
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

  async function restorePersisted(): Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  > {
    if (!persistence) {
      return undefined;
    }

    status = "recovering";

    try {
      const persistedSnapshot = await persistence.load(config.id);

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
    result: WorkflowResult<TOutput>,
  ): Promise<WorkflowResult<TOutput>> {
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

    if (config.autoPersist !== true) {
      return workflow;
    }

    let exposedWorkflow = exposedWorkflows.get(name);

    if (!exposedWorkflow) {
      exposedWorkflow = new Proxy(workflow, {
        get(target, property, receiver) {
          if (property === "run") {
            return (command: string, input?: unknown) =>
              runWorkflowCommand(target, command, input).then(
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

  async function recover(): Promise<
    | WorkflowSupervisorSnapshot<WorkflowSupervisorSnapshotMap<TWorkflows>>
    | undefined
  > {
    status = "recovering";

    const restored = await restorePersisted();
    let recovered = false;
    let failed = false;

    for (const [workflowName, workflow] of workflows) {
      const entry = findRecoverableFailedCommand(workflow);

      if (!entry) continue;

      recovered = true;

      const result = await recoverWorkflowCommand(workflow, entry);

      if (!result.ok) {
        failed = true;
        appendSupervisorDiagnostic(
          createRecoveryDiagnostic(workflowName, entry.command, result),
        );
      }
    }

    status = failed ? "failed" : "idle";

    return restored || recovered ? snapshot() : undefined;
  }

  const supervisor: WorkflowSupervisor<TWorkflows> = {
    id: config.id,
    get status() {
      return status;
    },
    diagnostics,
    ready:
      config.autoRecover === true
        ? recover().catch(() => undefined)
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
    recover,
  };

  return supervisor;
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

  for (const option of ["autoPersist", "autoRecover"] as const) {
    const value = (config as Record<string, unknown>)[option];

    if (value !== undefined && !isBoolean(value)) {
      throw new Error(`$workflowSupervisor ${option} must be a boolean.`);
    }
  }

  const typedConfig = config as {
    autoPersist?: boolean;
    autoRecover?: boolean;
    persistence?: unknown;
  };

  if (
    (typedConfig.autoPersist === true || typedConfig.autoRecover === true) &&
    typedConfig.persistence === undefined
  ) {
    throw new Error(
      "$workflowSupervisor autoPersist and autoRecover require persistence.",
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

  if (status === "persisting" || status === "recovering") {
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

function createIndexedDbWorkflowSupervisorPersistence<
  TSnapshot extends WorkflowSupervisorSnapshot = WorkflowSupervisorSnapshot,
>(
  config: Omit<WorkflowSupervisorPersistenceConfig, "type">,
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
  };
}

function resolveWorkflowSupervisorPersistence<
  TSnapshot extends WorkflowSupervisorSnapshot,
>(
  persistence:
    | "indexeddb"
    | WorkflowSupervisorPersistenceConfig
    | WorkflowSupervisorPersistence<TSnapshot>
    | undefined,
): WorkflowSupervisorPersistence<TSnapshot> | undefined {
  if (persistence === undefined) return undefined;

  if (persistence === "indexeddb") {
    return createIndexedDbWorkflowSupervisorPersistence<TSnapshot>({});
  }

  if (isWorkflowSupervisorPersistenceConfig(persistence)) {
    return createIndexedDbWorkflowSupervisorPersistence<TSnapshot>(persistence);
  }

  if (isWorkflowSupervisorPersistence(persistence)) {
    return persistence;
  }

  throw new Error(
    "$workflowSupervisor persistence must be 'indexeddb', an IndexedDB config, or a persistence adapter.",
  );
}

function isWorkflowSupervisorPersistenceConfig(
  value: unknown,
): value is WorkflowSupervisorPersistenceConfig {
  return isObject(value) && (value as { type?: unknown }).type === "indexeddb";
}

function isWorkflowSupervisorPersistence<
  TSnapshot extends WorkflowSupervisorSnapshot,
>(value: unknown): value is WorkflowSupervisorPersistence<TSnapshot> {
  if (!isObject(value)) return false;

  const candidate = value as {
    load?: unknown;
    save?: unknown;
  };

  return isFunction(candidate.load) && isFunction(candidate.save);
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

function createWorkflowFactory() {
  return function createWorkflow<
    TData extends object,
    TCommands extends object = WorkflowNoCommands,
    TState extends string = string,
  >(
    config: WorkflowConfiguration<TData, TCommands, TState>,
  ): WorkflowInstance<TData, TCommands, TState> {
    if (!isObject(config)) {
      throw new Error("$workflow requires a config object.");
    }

    const data = defaultWorkflowData(config.data);

    config = {
      ...config,
      data,
    } as unknown as WorkflowConfiguration<TData, TCommands, TState>;
    assertWorkflowConfig(config);

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
    const bindings = new Map<
      number,
      WorkflowBinding<TData, TCommands, TState>
    >();
    let state = config.initial;
    let nextHistoryId = 1;
    let queueGeneration = 0;

    const workflowTarget: WorkflowTarget<TData, TCommands, TState> = {
      id: config.id,
      get state() {
        return state;
      },
      get data() {
        return data;
      },
      diagnostics,
      history,
      can(command: string): boolean {
        const definition = getCommand(config, command);

        if (!definition || !isCommandAllowedFrom(definition, state)) {
          return false;
        }

        return !(
          (definition.concurrency ?? "reject") === "reject" &&
          isCommandRunning(command)
        );
      },
      async run<TOutput = unknown>(
        command: string,
        input?: unknown,
      ): Promise<WorkflowResult<TOutput>> {
        if (!isString(command) || !command) {
          return failCommand<TOutput>(command, input, [
            createDiagnostic(
              "workflow.invalidCommand",
              "Workflow command name must be a non-empty string.",
              command,
              true,
            ),
          ]);
        }

        const definition = getCommand(config, command);

        if (!definition) {
          return failCommand<TOutput>(command, input, [
            createDiagnostic(
              "workflow.missingCommand",
              `Workflow command '${command}' is not configured.`,
              command,
              true,
            ),
          ]);
        }

        const mode = definition.concurrency ?? "reject";

        if (mode === "reject" && isCommandRunning(command)) {
          return failCommand<TOutput>(command, input, [
            createDiagnostic(
              "workflow.commandRunning",
              `Workflow command '${command}' is already running.`,
              command,
              true,
            ),
          ]);
        }

        if (mode === "queue") {
          const generation = queueGeneration;
          const previous = commandQueues.get(command) ?? Promise.resolve();
          const queued = previous.then(() => {
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
              } satisfies WorkflowResult<TOutput>;
            }

            return executeCommand<TOutput>(command, input, definition);
          });
          const tail = queued.finally(() => {
            if (commandQueues.get(command) === tail) {
              commandQueues.delete(command);
            }
          });

          commandQueues.set(command, tail);

          return queued;
        }

        return executeCommand(command, input, definition);
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

          if (
            cancelRun(
              state,
              createDiagnostic(
                "workflow.commandCancelled",
                `Workflow command '${state._command}' was cancelled.`,
                state._command,
                true,
              ),
            )
          ) {
            cancelled += 1;
          }
        }

        return cancelled;
      },
      snapshot(): WorkflowSnapshot<
        WorkflowContractOf<TData, TCommands, TState>
      > {
        return {
          version: 1,
          id: config.id,
          state,
          data: structuredClone(data),
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
        state = restoredSnapshot.state;
        replaceWorkflowData(data, restoredSnapshot.data);
        replaceArray(
          diagnostics,
          normalizeDiagnostics(restoredSnapshot.diagnostics),
        );
        trimDiagnostics();
        replaceArray(history, normalizeHistory(restoredSnapshot.history));
        trimHistory();
        nextHistoryId =
          history.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
        scheduleWorkflowBindings();
      },
    };

    Object.defineProperty(workflowTarget, SCOPE_PROXY_BIND, {
      value(handler: Scope, proxy: WorkflowInstance<TData, TCommands, TState>) {
        let binding = bindings.get(handler.$id);

        if (!binding) {
          binding = {
            _handler: handler,
            _proxy: proxy,
          };
          bindings.set(handler.$id, binding);
        }
      },
    });

    return workflowTarget;

    async function executeCommand<TOutput>(
      command: string,
      input: unknown,
      definition: WorkflowCommandDefinition<
        WorkflowContractOf<TData, TCommands, TState>
      >,
    ): Promise<WorkflowResult<TOutput>> {
      if (!isCommandAllowedFrom(definition, state)) {
        return failCommand<TOutput>(command, input, [
          createDiagnostic(
            "workflow.commandNotAllowed",
            `Workflow command '${command}' cannot run from state '${state}'.`,
            command,
            true,
            { command, state },
          ),
        ]);
      }

      appendHistory({
        type: "command.started",
        command,
        input,
      });

      const runState = createRunState(command, definition.commandTimeout);

      try {
        applyLifecycleTarget(definition.pending, {
          command,
          input,
          data,
        });

        const cancelDiagnostic = runState._cancelDiagnostic;

        if (cancelDiagnostic) {
          applyFailureLifecycle(definition, command, input, [cancelDiagnostic]);

          return failCommand<TOutput>(command, input, [cancelDiagnostic]);
        }

        const retries = normalizeRetryCount(definition.retry);
        let attempt = 0;
        let commandValue: TOutput | undefined;

        while (attempt <= retries) {
          try {
            commandValue = await executeCommandAttempt<TOutput>(
              command,
              input,
              definition,
              runState,
            );
            break;
          } catch (error) {
            if (
              runState._cancelDiagnostic ||
              error instanceof WorkflowCommandRejectionError ||
              attempt >= retries
            ) {
              throw error;
            }

            attempt += 1;
          }
        }

        applyLifecycleTarget(definition.success, {
          command,
          input,
          data,
          output: commandValue,
        });

        const result: WorkflowResult<TOutput> = {
          ok: true,
          status: "completed",
          output: commandValue as TOutput,
          diagnostics: undefined,
        };

        appendHistory({
          type: "command.completed",
          command,
          input,
          output: result.output,
          diagnostics: result.diagnostics,
        });

        return result;
      } catch (error) {
        if (runState._cancelDiagnostic) {
          if (runState._discardResult) {
            return {
              ok: false,
              status: commandStatusFromDiagnostics([
                runState._cancelDiagnostic,
              ]),
              diagnostics: [runState._cancelDiagnostic],
            };
          }

          applyFailureLifecycle(definition, command, input, [
            runState._cancelDiagnostic,
          ]);

          return failCommand<TOutput>(command, input, [
            runState._cancelDiagnostic,
          ]);
        }

        if (error instanceof WorkflowCommandRejectionError) {
          const diagnostic = error.diagnostic;

          applyFailureLifecycle(definition, command, input, [diagnostic]);

          return failCommand<TOutput>(command, input, [diagnostic], "rejected");
        }

        const commandDiagnostics = [diagnosticFromError(error, command)];

        applyFailureLifecycle(definition, command, input, commandDiagnostics);

        return failCommand<TOutput>(command, input, commandDiagnostics);
      } finally {
        finishRunState(runState);
      }
    }

    async function executeCommandAttempt<TOutput>(
      command: string,
      input: unknown,
      definition: WorkflowCommandDefinition<
        WorkflowContractOf<TData, TCommands, TState>
      >,
      runState: WorkflowRunState,
    ): Promise<TOutput> {
      const commandPromise = Promise.resolve(
        definition.execute
          ? invokeWorkflowCommand(definition.execute, {
              cleanup(callback) {
                if (isFunction(callback)) {
                  runState._cleanups.push(callback);
                }
              },
              reject(diagnostic) {
                throw new WorkflowCommandRejectionError(
                  normalizeDiagnostic(diagnostic),
                );
              },
              data: createReadonlyWorkflowData(data),
              input,
              command,
              signal: runState._controller.signal,
            })
          : undefined,
      );
      const commandValue = (await Promise.race([
        commandPromise,
        runState._cancelPromise.then(
          (diagnostic) =>
            ({
              [WORKFLOW_COMMAND_CANCELLATION]: diagnostic,
            }) satisfies WorkflowCommandCancellation,
        ),
      ])) as TOutput | WorkflowCommandCancellation;

      commandPromise.catch(() => undefined);

      if (
        isObject(commandValue) &&
        WORKFLOW_COMMAND_CANCELLATION in commandValue
      ) {
        throw new WorkflowCommandRejectionError(
          commandValue[WORKFLOW_COMMAND_CANCELLATION],
        );
      }

      return commandValue;
    }

    function applyLifecycleTarget<TContext>(
      target: WorkflowLifecycleTarget<TState, TContext>,
      context: TContext,
    ): void {
      if (isString(target)) {
        state = target;
      } else {
        state = target.to;
        target.update?.(context);
      }

      scheduleWorkflowBindings();
    }

    function applyFailureLifecycle(
      definition: WorkflowCommandDefinition<
        WorkflowContractOf<TData, TCommands, TState>
      >,
      command: string,
      input: unknown,
      commandDiagnostics: WorkflowDiagnostic[],
    ): void {
      const status = commandStatusFromDiagnostics(commandDiagnostics);
      const target =
        status === "timeout"
          ? (definition.timeout ?? definition.failure)
          : status === "cancelled"
            ? (definition.cancelled ?? definition.failure)
            : definition.failure;

      try {
        applyLifecycleTarget(target, {
          command,
          input,
          data,
          diagnostic: commandDiagnostics[0],
          diagnostics: commandDiagnostics,
        });
      } catch (error) {
        commandDiagnostics.push(
          diagnosticFromError(error, command, "workflow.lifecycleUpdateFailed"),
        );
      }
    }

    function scheduleWorkflowBindings(): void {
      for (const [scopeId, binding] of bindings) {
        if (binding._handler._destroyed) {
          bindings.delete(scopeId);

          continue;
        }

        binding._handler._scheduleWatchKeys([
          "state",
          "data",
          "diagnostics",
          "history",
        ]);
        binding._handler._checkListenersForAllKeys(workflowTarget as never);
        binding._handler._checkListenersForAllKeys(data as never);
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

      history.push(historyEntry);
      trimHistory();
      scheduleWorkflowBindings();

      return historyEntry;
    }

    function trimHistory(): void {
      trimArray(history, historyLimit);
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
      commandTimeout?: number,
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
      const timeout = normalizeTimeout(commandTimeout);
      let timeoutId: number | undefined;

      if (timeout !== undefined) {
        timeoutId = globalThis.setTimeout(() => {
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
          globalThis.clearTimeout(timeoutId);
        });
      }

      runningCommands.add(state);

      return state;
    }

    function cancelRun(
      state: WorkflowRunState,
      diagnostic: WorkflowDiagnostic,
      discardResult = false,
    ): boolean {
      if (state._done || state._cancelDiagnostic) {
        return false;
      }

      state._discardResult = discardResult;
      state._cancelDiagnostic = diagnostic;
      state._cancel(diagnostic);

      if (!state._controller.signal.aborted) {
        state._controller.abort(diagnostic);
      }

      return true;
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

    function cancelRunningCommands(recordResult: boolean): void {
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

    function normalizeWorkflowSnapshot(
      snapshot: unknown,
    ): WorkflowSnapshot<WorkflowContractOf<TData, TCommands, TState>> {
      if (
        isObject(snapshot) &&
        (snapshot as { version?: unknown }).version === 1
      ) {
        assertWorkflowSnapshot(snapshot);

        return snapshot as WorkflowSnapshot<
          WorkflowContractOf<TData, TCommands, TState>
        >;
      }

      if (config.migrateSnapshot) {
        const migrated = config.migrateSnapshot(snapshot);

        assertWorkflowSnapshot(migrated);

        return migrated;
      }

      throw new Error("$workflow restore requires a version 1 snapshot.");
    }

    function failCommand<TOutput = unknown>(
      command: unknown,
      input: unknown,
      commandDiagnostics: WorkflowDiagnostic[],
      status?: WorkflowFailureStatus,
    ): WorkflowResult<TOutput> {
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
        status: status ?? commandStatusFromDiagnostics(commandDiagnostics),
        diagnostics: commandDiagnostics,
      };
    }
  };
}

function runWorkflowCommand<TOutput>(
  workflow: unknown,
  command: string,
  input?: unknown,
): Promise<WorkflowResult<TOutput>> {
  const runner = workflow as {
    run<TCommandOutput = unknown>(
      command: string,
      input?: unknown,
    ): Promise<WorkflowResult<TCommandOutput>>;
  };

  return runner.run<TOutput>(command, input);
}

function invokeWorkflowCommand<
  TInput,
  TOutput,
  TContract extends WorkflowContract,
>(
  handler: WorkflowCommand<TContract, { input: TInput; output: TOutput }>,
  context: WorkflowCommandContext<TContract, TInput>,
): WorkflowCommandHandlerResult<TOutput> {
  return handler(context);
}

function createReadonlyWorkflowData<TData extends object>(data: TData): TData {
  const proxies = new WeakMap<object, object>();
  const targets = new WeakMap<object, object>();

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
          return getReadonlyWorkflowMapProperty(
            target,
            property,
            proxify,
            unproxify,
          );
        }

        if (isInstanceOf(target, Set)) {
          return getReadonlyWorkflowSetProperty(
            target,
            property,
            proxify,
            unproxify,
          );
        }

        return proxify(Reflect.get(target, property, receiver));
      },
      set() {
        throwReadonlyWorkflowDataError();
      },
      deleteProperty() {
        throwReadonlyWorkflowDataError();
      },
      defineProperty() {
        throwReadonlyWorkflowDataError();
      },
      setPrototypeOf() {
        throwReadonlyWorkflowDataError();
      },
    });

    proxies.set(value, proxy);
    targets.set(proxy, value);

    return proxy;
  }

  function unproxify(value: unknown): unknown {
    return isObject(value) ? (targets.get(value) ?? value) : value;
  }
}

function getReadonlyWorkflowMapProperty(
  target: Map<unknown, unknown>,
  property: string | symbol,
  proxify: (value: unknown) => unknown,
  unproxify: (value: unknown) => unknown,
): unknown {
  if (property === "size") {
    return target.size;
  }

  if (property === "get") {
    return (key: unknown) => proxify(target.get(unproxify(key)));
  }

  if (property === "has") {
    return (key: unknown) => target.has(unproxify(key));
  }

  if (property === "keys") {
    return () => mapReadonlyIterator(target.keys(), proxify);
  }

  if (property === "values") {
    return () => mapReadonlyIterator(target.values(), proxify);
  }

  if (property === "entries" || property === Symbol.iterator) {
    return () => mapReadonlyEntries(target.entries(), proxify);
  }

  if (property === "forEach") {
    return (callback: (value: unknown, key: unknown) => void) => {
      target.forEach((value, key) => {
        callback(proxify(value), proxify(key));
      });
    };
  }

  if (property === "set" || property === "delete" || property === "clear") {
    return throwReadonlyWorkflowDataError;
  }

  if (property === "constructor") {
    return target.constructor;
  }

  const value = Reflect.get(target, property, target) as unknown;

  return isFunction(value) ? value.bind(target) : value;
}

function getReadonlyWorkflowSetProperty(
  target: Set<unknown>,
  property: string | symbol,
  proxify: (value: unknown) => unknown,
  unproxify: (value: unknown) => unknown,
): unknown {
  if (property === "size") {
    return target.size;
  }

  if (property === "add" || property === "delete" || property === "clear") {
    return throwReadonlyWorkflowDataError;
  }

  if (property === "has") {
    return (value: unknown) => target.has(unproxify(value));
  }

  if (
    property === "keys" ||
    property === "values" ||
    property === Symbol.iterator
  ) {
    return () => mapReadonlyIterator(target.values(), proxify);
  }

  if (property === "entries") {
    return () => mapReadonlyEntries(target.entries(), proxify);
  }

  if (property === "forEach") {
    return (callback: (value: unknown, key: unknown) => void) => {
      target.forEach((value) => {
        const readonlyValue = proxify(value);

        callback(readonlyValue, readonlyValue);
      });
    };
  }

  if (property === "constructor") {
    return target.constructor;
  }

  const value = Reflect.get(target, property, target) as unknown;

  return isFunction(value) ? value.bind(target) : value;
}

function* mapReadonlyIterator(
  iterator: IterableIterator<unknown>,
  proxify: (value: unknown) => unknown,
): IterableIterator<unknown> {
  for (const value of iterator) {
    yield proxify(value);
  }
}

function* mapReadonlyEntries(
  iterator: IterableIterator<[unknown, unknown]>,
  proxify: (value: unknown) => unknown,
): IterableIterator<[unknown, unknown]> {
  for (const [key, value] of iterator) {
    yield [proxify(key), proxify(value)];
  }
}

function throwReadonlyWorkflowDataError(): never {
  throw new TypeError(
    "Workflow command data is readonly; mutate data in a lifecycle update.",
  );
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
  TCommands extends object = WorkflowNoCommands,
  TState extends string = string,
>(
  config: WorkflowConfiguration<TData, TCommands, TState>,
  command: string,
):
  | WorkflowCommandDefinition<WorkflowContractOf<TData, TCommands, TState>>
  | undefined {
  if (!hasOwn(config.commands, command)) {
    return undefined;
  }

  const definition = (config.commands as Record<string, unknown>)[command];

  return definition as WorkflowCommandDefinition<
    WorkflowContractOf<TData, TCommands, TState>
  >;
}

function isCommandAllowedFrom(
  definition: { from: string | readonly string[] },
  state: string,
): boolean {
  return isArray(definition.from)
    ? definition.from.includes(state)
    : definition.from === state;
}

function commandStatusFromDiagnostics(
  diagnostics: WorkflowDiagnostic[],
): WorkflowFailureStatus {
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
      diagnostic.code === "workflow.commandNotAllowed" ||
      diagnostic.code === "workflow.commandRunning"
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

function normalizeDiagnostic(
  diagnostic: WorkflowDiagnostic,
): WorkflowDiagnostic {
  return normalizeDiagnostics([diagnostic])[0];
}

function normalizeHistoryValue(value: unknown): unknown {
  return normalizeDiagnosticDetail(value);
}

function normalizeHistory(
  historyEntries: readonly WorkflowHistoryEntry[],
): WorkflowHistoryEntry[] {
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
  const deleteCount = target.length - limit;

  if (deleteCount <= 0) {
    return [];
  }

  return target.splice(0, deleteCount);
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

function normalizeRetryCount(value: unknown): number {
  return normalizeEntryLimit(value, "$workflow command retry", 0);
}

function createDiagnostic(
  code: string,
  message: string,
  command: string | undefined,
  recoverable: boolean,
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

function replaceWorkflowData<TData extends object>(
  target: TData,
  source: TData,
): void {
  const restored = structuredClone(source);

  if (isArray(target) && isArray(restored)) {
    target.splice(0, target.length, ...restored);

    return;
  }

  if (isInstanceOf(target, Map) && isInstanceOf(restored, Map)) {
    target.clear();

    for (const [key, value] of restored) {
      target.set(key, value);
    }

    return;
  }

  if (isInstanceOf(target, Set) && isInstanceOf(restored, Set)) {
    target.clear();

    for (const value of restored) {
      target.add(value);
    }

    return;
  }

  for (const key of Reflect.ownKeys(target)) {
    Reflect.deleteProperty(target, key);
  }

  Object.assign(target, restored);
}

function defaultWorkflowData<TData extends object>(
  data: TData | undefined,
): TData {
  if (data === undefined) {
    return {} as TData;
  }

  return data;
}

function assertWorkflowConfig<
  TData extends object,
  TCommands extends object,
  TState extends string,
>(config: WorkflowConfiguration<TData, TCommands, TState>): void {
  if (!isString(config.id) || !config.id) {
    throw new Error("$workflow requires a non-empty id.");
  }

  if (!isString(config.initial) || !config.initial) {
    throw new Error("$workflow requires a non-empty initial state.");
  }

  if (!isObject(config.data)) {
    throw new Error("$workflow requires a data object.");
  }

  if (!isObject(config.commands) || isArray(config.commands)) {
    throw new Error("$workflow commands must be an object.");
  }

  for (const [command, value] of Object.entries(config.commands)) {
    if (!command) {
      throw new Error("$workflow command names must be non-empty strings.");
    }

    assertWorkflowCommandDefinition(command, value);
  }

  normalizeHistoryLimit(config.historyLimit);
  normalizeEntryLimit(
    config.diagnosticLimit,
    "$workflow diagnosticLimit",
    1000,
  );
  if (
    config.migrateSnapshot !== undefined &&
    !isFunction(config.migrateSnapshot)
  ) {
    throw new Error("$workflow migrateSnapshot must be a function.");
  }
}

function assertWorkflowCommandDefinition(
  command: string,
  value: unknown,
): asserts value is WorkflowCommandDefinition {
  if (!isObject(value) || isArray(value)) {
    throw new Error(
      `$workflow command '${command}' must be a lifecycle definition.`,
    );
  }

  const definition = value as Partial<WorkflowCommandDefinition>;

  if (
    !(isString(definition.from) && definition.from.length > 0) &&
    !(
      isArray(definition.from) &&
      definition.from.length > 0 &&
      definition.from.every((state) => isString(state) && state.length > 0)
    )
  ) {
    throw new Error(
      `$workflow command '${command}' requires a non-empty from state.`,
    );
  }

  assertWorkflowLifecycleTarget(command, "pending", definition.pending);
  assertWorkflowLifecycleTarget(command, "success", definition.success);
  assertWorkflowLifecycleTarget(command, "failure", definition.failure);

  if (definition.cancelled !== undefined) {
    assertWorkflowLifecycleTarget(command, "cancelled", definition.cancelled);
  }

  if (definition.timeout !== undefined) {
    assertWorkflowLifecycleTarget(command, "timeout", definition.timeout);
  }

  if (definition.execute !== undefined && !isFunction(definition.execute)) {
    throw new Error(
      `$workflow command '${command}' execute must be a function.`,
    );
  }

  const concurrency = (value as { concurrency?: unknown }).concurrency;

  if (
    concurrency !== undefined &&
    concurrency !== "parallel" &&
    concurrency !== "reject" &&
    concurrency !== "queue"
  ) {
    throw new Error(
      `$workflow command '${command}' concurrency must be 'parallel', 'reject', or 'queue'.`,
    );
  }

  normalizeTimeout(definition.commandTimeout);
  normalizeRetryCount(definition.retry);
}

function assertWorkflowLifecycleTarget(
  command: string,
  lifecycle: string,
  value: unknown,
): void {
  if (isString(value) && value) {
    return;
  }

  const target = value as { to?: unknown; update?: unknown };

  if (
    isObject(value) &&
    isString(target.to) &&
    target.to.length > 0 &&
    (target.update === undefined || isFunction(target.update))
  ) {
    return;
  }

  throw new Error(
    `$workflow command '${command}' ${lifecycle} must target a non-empty state.`,
  );
}

function assertWorkflowSnapshot(snapshot: unknown): void {
  const candidate = snapshot as Partial<WorkflowSnapshot>;

  if (!isString(candidate.id) || !candidate.id) {
    throw new Error("$workflow restore requires a non-empty id.");
  }

  if (!isString(candidate.state) || !candidate.state) {
    throw new Error("$workflow restore requires a non-empty state.");
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
