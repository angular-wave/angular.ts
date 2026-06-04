import {
  SCOPE_PROXY_BIND,
  createScope,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";
import { _machine } from "../../injection-tokens.ts";
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
  MachineConfig,
  MachineMode,
  MachineNoEvents,
  MachineService,
  MachineTransitionMap,
} from "../machine/machine.ts";

export type WorkflowMode = MachineMode;

export type WorkflowStatus = WorkflowMode;

export type WorkflowNoCommands = Record<never, never>;

export type WorkflowConcurrencyPolicy = "allow" | "reject" | "queue";

export interface WorkflowDiagnostic {
  code: string;
  message: string;
  recoverable?: boolean;
  path?: string;
  command?: string;
  detail?: unknown;
}

export type WorkflowCommandResult<TOutput = unknown> =
  | {
      ok: true;
      output?: TOutput;
      diagnostics?: WorkflowDiagnostic[];
    }
  | {
      ok: false;
      diagnostics: WorkflowDiagnostic[];
    };

export interface WorkflowCommandOptions {
  concurrency?: WorkflowConcurrencyPolicy;
  signal?: AbortSignal;
  timeout?: number;
}

export interface WorkflowCommandContext<
  TData extends object = Record<string, unknown>,
  TInput = unknown,
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
  TName extends string = string,
> {
  workflow: Workflow<TData, TEvents, TCommands>;
  data: TData;
  input: TInput;
  command: TName;
  cleanup(callback: () => void): void;
  signal: AbortSignal;
}

export type WorkflowCommand<
  TData extends object = Record<string, unknown>,
  TInput = unknown,
  TOutput = unknown,
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
  TName extends string = string,
> = (
  context: WorkflowCommandContext<TData, TInput, TEvents, TCommands, TName>,
) =>
  | WorkflowCommandResult<TOutput>
  | TOutput
  | Promise<WorkflowCommandResult<TOutput> | TOutput>;

export type WorkflowCommandMap<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
> = Record<string, WorkflowCommand<TData, unknown, unknown, TEvents>>;

type WorkflowCommandDefs<TCommands extends object> = {
  [TName in keyof TCommands]: (context: never) => unknown;
};

type WorkflowCommandName<TCommands extends object> = Extract<
  keyof TCommands,
  string
>;

type WorkflowCommandParts<TCommand> =
  TCommand extends WorkflowCommand<
    infer TData,
    infer TInput,
    infer TOutput,
    infer TEvents,
    infer TCommands,
    infer TName
  >
    ? [TData, TInput, TOutput, TEvents, TCommands, TName]
    : [never, unknown, unknown, never, never, string];

type WorkflowCommandInput<
  TCommands extends object,
  TName extends WorkflowCommandName<TCommands>,
> = WorkflowCommandParts<TCommands[TName]>[1];

type WorkflowCommandOutput<
  TCommands extends object,
  TName extends WorkflowCommandName<TCommands>,
> = WorkflowCommandParts<TCommands[TName]>[2];

type WorkflowCommandInputArgs<TInput> = undefined extends TInput
  ? [input?: TInput, options?: WorkflowCommandOptions]
  : [input: TInput, options?: WorkflowCommandOptions];

type WorkflowCommandOutputUnion<TCommands extends object> =
  WorkflowCommandName<TCommands> extends infer TName
    ? TName extends WorkflowCommandName<TCommands>
      ? WorkflowCommandOutput<TCommands, TName>
      : never
    : never;

type WorkflowRun<TCommands extends object> = string extends keyof TCommands
  ? <TOutput = unknown>(
      command: string,
      input?: unknown,
      options?: WorkflowCommandOptions,
    ) => Promise<WorkflowCommandResult<TOutput>>
  : <TName extends WorkflowCommandName<TCommands>>(
      command: TName,
      ...input: WorkflowCommandInputArgs<WorkflowCommandInput<TCommands, TName>>
    ) => Promise<
      WorkflowCommandResult<WorkflowCommandOutput<TCommands, TName>>
    >;

type WorkflowReplay<TCommands extends object> = string extends keyof TCommands
  ? <TOutput = unknown>(
      command?: string,
      options?: WorkflowCommandOptions,
    ) => Promise<WorkflowCommandResult<TOutput>>
  : {
      (
        options?: WorkflowCommandOptions,
      ): Promise<WorkflowCommandResult<WorkflowCommandOutputUnion<TCommands>>>;
      <TName extends WorkflowCommandName<TCommands>>(
        command: TName,
        options?: WorkflowCommandOptions,
      ): Promise<
        WorkflowCommandResult<WorkflowCommandOutput<TCommands, TName>>
      >;
    };

export interface WorkflowHistoryEntry {
  id: number;
  type: "command.started" | "command.completed" | "command.failed";
  command: string;
  input?: unknown;
  output?: unknown;
  diagnostics?: WorkflowDiagnostic[];
}

interface WorkflowBaseConfig<TData extends object, TEvents extends object> {
  commandTimeout?: number;
  concurrency?: WorkflowConcurrencyPolicy;
  diagnosticLimit?: number;
  id: string;
  initial: WorkflowMode;
  data: TData;
  historyLimit?: number;
  migrateSnapshot?: WorkflowSnapshotMigration<TData>;
  transitions: MachineTransitionMap<TData, TEvents>;
}

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
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
> = WorkflowBaseConfig<TData, TEvents> & WorkflowCommandConfig<TCommands>;

export interface WorkflowSnapshot<
  TData extends object = Record<string, unknown>,
> {
  version: 1;
  id: string;
  current: WorkflowMode;
  data: TData;
  diagnostics: WorkflowDiagnostic[];
  history: WorkflowHistoryEntry[];
}

export type WorkflowSnapshotMigration<
  TData extends object = Record<string, unknown>,
> = (snapshot: unknown) => WorkflowSnapshot<TData>;

export interface Workflow<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
> {
  id: string;
  current: WorkflowMode;
  data: TData;
  diagnostics: WorkflowDiagnostic[];
  history: WorkflowHistoryEntry[];
  send<TType extends Extract<keyof TEvents, string>>(
    type: TType,
    ...payload: undefined extends TEvents[TType]
      ? [payload?: TEvents[TType]]
      : [payload: TEvents[TType]]
  ): boolean;
  can(type: Extract<keyof TEvents, string>): boolean;
  matches(mode: WorkflowMode): boolean;
  run: WorkflowRun<TCommands>;
  retry: WorkflowReplay<TCommands>;
  repeat: WorkflowReplay<TCommands>;
  cancel(command?: string): number;
  snapshot(): WorkflowSnapshot<TData>;
  restore(snapshot: unknown): void;
}

export interface WorkflowService {
  <
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineNoEvents,
    TCommands extends object = WorkflowNoCommands,
  >(
    config: WorkflowConfig<TData, TEvents, TCommands>,
  ): Workflow<TData, TEvents, TCommands>;
  <
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineNoEvents,
    TCommands extends object = WorkflowNoCommands,
  >(
    scope: ng.Scope,
    config: WorkflowConfig<TData, TEvents, TCommands>,
  ): Workflow<TData, TEvents, TCommands>;
}

type WorkflowTarget<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
> = Workflow<TData, TEvents, TCommands> & ScopeProxyBindable;

interface WorkflowArgs<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
> {
  _scope?: ng.Scope;
  _config: WorkflowConfig<TData, TEvents, TCommands>;
}

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

export class WorkflowProvider {
  $get = [
    _machine,
    ($machine: MachineService): WorkflowService =>
      createWorkflowFactory($machine) as WorkflowService,
  ];
}

export function defineWorkflow<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
>(
  config: WorkflowConfig<TData, TEvents, TCommands>,
): WorkflowConfig<TData, TEvents, TCommands> {
  return config;
}

export function defineCommand<
  TData extends object = Record<string, unknown>,
  TInput = unknown,
  TOutput = unknown,
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
  TName extends string = string,
>(
  command: WorkflowCommand<TData, TInput, TOutput, TEvents, TCommands, TName>,
): WorkflowCommand<TData, TInput, TOutput, TEvents, TCommands, TName> {
  return command;
}

function createWorkflowFactory($machine: MachineService) {
  return function createWorkflow<
    TData extends object,
    TEvents extends object = MachineNoEvents,
    TCommands extends object = WorkflowNoCommands,
  >(
    scopeOrConfig: ng.Scope | WorkflowConfig<TData, TEvents, TCommands>,
    maybeConfig?: WorkflowConfig<TData, TEvents, TCommands>,
  ): Workflow<TData, TEvents, TCommands> {
    const { _scope: scope, _config: config } = normalizeWorkflowArgs(
      scopeOrConfig,
      maybeConfig,
    );

    assertWorkflowConfig(config);

    const machine = $machine({
      initial: config.initial,
      data: config.data,
      transitions: config.transitions,
    } as MachineConfig<TData, TEvents>);
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
        return machine.current;
      },
      get data() {
        return machine.data;
      },
      diagnostics,
      history,
      send(type: string, payload?: unknown): boolean {
        const handled = machine.send(
          type as Extract<keyof TEvents, string>,
          payload as never,
        );

        if (handled) {
          scheduleWorkflowBindings();
        } else {
          appendDiagnostics(
            createDiagnostic(
              "workflow.invalidTransition",
              `Workflow mode '${machine.current}' cannot handle transition '${type}'.`,
              undefined,
              true,
              {
                current: machine.current,
                type,
                payload,
              },
            ),
          );
          scheduleWorkflowBindings();
        }

        return handled;
      },
      can(type: string): boolean {
        return machine.can(type as Extract<keyof TEvents, string>);
      },
      matches(mode: WorkflowMode): boolean {
        return machine.matches(mode);
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
      repeat<TOutput = unknown>(
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

        const repeatEntry = findRepeatEntry(replay.command);

        if (!repeatEntry) {
          return Promise.resolve(
            failWithoutHistory<TOutput>([
              createDiagnostic(
                "workflow.noCompletedCommand",
                isString(replay.command) && replay.command
                  ? `Workflow command '${replay.command}' has no completed run to repeat.`
                  : "Workflow has no completed command to repeat.",
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
          repeatEntry.command,
          getReplayInput(repeatEntry),
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
        return {
          version: 1,
          id: config.id,
          current: machine.current,
          data: structuredClone(machine.data),
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
        machine.restore({
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

    if (scope?.$handler) {
      return createScope(workflowTarget, scope.$handler as Scope) as Workflow<
        TData,
        TEvents,
        TCommands
      >;
    }

    return workflowTarget;

    async function executeCommand<TOutput>(
      command: string,
      input: unknown,
      handler: WorkflowCommand<TData, unknown, unknown, TEvents, TCommands>,
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
            const data = createWorkflowDataProxy(machine.data, state);

            return handler({
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
          | WorkflowCommandResult<TOutput>
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
          commandValue as WorkflowCommandResult<TOutput> | TOutput,
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
        binding._handler._checkListenersForAllKeys(machine.data as never);
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
      };

      if (hasOwn(entry, "input")) {
        historyEntry.input = normalizeHistoryValue(entry.input);
        replayInputs.set(historyEntry.id, entry.input);
      }

      if (hasOwn(entry, "output")) {
        historyEntry.output = normalizeHistoryValue(entry.output);
      }

      if (entry.diagnostics) {
        historyEntry.diagnostics = normalizeDiagnostics(entry.diagnostics);
      }

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

    function findRepeatEntry(
      command?: string,
    ): WorkflowHistoryEntry | undefined {
      for (let index = history.length - 1; index >= 0; index -= 1) {
        const entry = history[index];

        if (entry.type !== "command.completed") {
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
        return (...args: unknown[]) =>
          state._done
            ? false
            : (target.send as (...sendArgs: unknown[]) => boolean)(...args);
      }

      if (property === "run" || property === "retry" || property === "repeat") {
        return (...args: unknown[]) =>
          state._done
            ? Promise.resolve({
                ok: false,
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
  TEvents extends object = MachineNoEvents,
  TCommands extends object = WorkflowNoCommands,
>(
  config: WorkflowConfig<TData, TEvents, TCommands>,
  command: string,
): WorkflowCommand<TData, unknown, unknown, TEvents, TCommands> | undefined {
  if (!config.commands || !hasOwn(config.commands, command)) {
    return undefined;
  }

  const handler = (config.commands as Record<string, unknown>)[command];

  return isFunction(handler)
    ? (handler as WorkflowCommand<TData, unknown, unknown, TEvents, TCommands>)
    : undefined;
}

function normalizeCommandResult<TOutput>(
  value: WorkflowCommandResult<TOutput> | TOutput,
): WorkflowCommandResult<TOutput> {
  if (isObject(value) && hasOwn(value, "ok")) {
    const result = value as {
      ok: unknown;
      output?: TOutput;
      diagnostics?: WorkflowDiagnostic[];
    };
    const ok = result.ok;

    if (ok === true) {
      return {
        ok: true,
        output: result.output,
        diagnostics: normalizeOptionalDiagnostics(result.diagnostics),
      };
    }

    if (ok === false) {
      return {
        ok: false,
        diagnostics: normalizeOptionalDiagnostics(result.diagnostics) ?? [
          createDiagnostic(
            "workflow.commandFailed",
            "Workflow command failed.",
            undefined,
            true,
          ),
        ],
      };
    }

    return {
      ok: false,
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
    output: value as TOutput,
  };
}

function normalizeDiagnostics(
  diagnostics: WorkflowDiagnostic[] | undefined,
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
  diagnostics: WorkflowDiagnostic[] | undefined,
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
  historyEntries: WorkflowHistoryEntry[] | undefined,
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
    const historyEntry: WorkflowHistoryEntry = {
      id,
      type: normalizeHistoryType(candidate.type),
      command:
        isString(candidate.command) && candidate.command
          ? candidate.command
          : "unknown",
    };

    if (hasOwn(candidate, "input")) {
      historyEntry.input = normalizeHistoryValue(candidate.input);
    }

    if (hasOwn(candidate, "output")) {
      historyEntry.output = normalizeHistoryValue(candidate.output);
    }

    if (hasOwn(candidate, "diagnostics")) {
      historyEntry.diagnostics = normalizeDiagnostics(candidate.diagnostics);
    }

    return historyEntry;
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

function normalizeWorkflowArgs<
  TData extends object,
  TEvents extends object,
  TCommands extends object,
>(
  scopeOrConfig: ng.Scope | WorkflowConfig<TData, TEvents, TCommands>,
  maybeConfig?: WorkflowConfig<TData, TEvents, TCommands>,
): WorkflowArgs<TData, TEvents, TCommands> {
  if (maybeConfig) {
    return {
      _scope: scopeOrConfig as ng.Scope,
      _config: maybeConfig,
    };
  }

  return {
    _config: scopeOrConfig as WorkflowConfig<TData, TEvents, TCommands>,
  };
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

  if (!isObject(config.transitions)) {
    throw new Error("$workflow requires a transitions object.");
  }

  if (config.commands !== undefined && !isObject(config.commands)) {
    throw new Error("$workflow commands must be an object.");
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
