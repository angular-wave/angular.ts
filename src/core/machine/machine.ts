import {
  _SCOPE_PROXY_BIND,
  createScope,
  type Scope,
  type _ScopeProxyBindable,
} from "../scope/scope.ts";
import { isFunction, isObject, isString } from "../../shared/utils.ts";

type _Dynamic = ReturnType<typeof JSON.parse>;

export type MachineMode = string;

export type MachineTransitionResult = MachineMode | false | undefined;

export type MachineTransition<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
> = (
  data: TData,
  payload: TPayload,
  machine: Machine<TData>,
) => MachineTransitionResult;

export type MachineTransitionMap<TData extends object> = Partial<
  Record<string, Partial<Record<string, MachineTransition<TData, _Dynamic>>>>
>;

export interface MachineConfig<TData extends object = Record<string, unknown>> {
  initial: MachineMode;
  data: TData;
  transitions: MachineTransitionMap<TData>;
}

export interface Machine<TData extends object = Record<string, unknown>> {
  current: MachineMode;
  data: TData;
  send(type: string, payload?: unknown): boolean;
  can(type: string): boolean;
  matches(mode: MachineMode): boolean;
}

export interface MachineService {
  <TData extends object = Record<string, unknown>>(
    config: MachineConfig<TData>,
  ): Machine<TData>;
  <TData extends object = Record<string, unknown>>(
    scope: ng.Scope,
    config: MachineConfig<TData>,
  ): Machine<TData>;
}

type _MachineTarget<TData extends object> = Machine<TData> &
  _ScopeProxyBindable;

interface _MachineArgs<TData extends object> {
  _scope?: ng.Scope;
  _config: MachineConfig<TData>;
}

/**
 * Provides reactive mode machines backed by AngularTS scope proxies.
 */
export class MachineProvider {
  $get = (): MachineService => createMachine as MachineService;
}

function createMachine<TData extends object>(
  scopeOrConfig: ng.Scope | MachineConfig<TData>,
  maybeConfig?: MachineConfig<TData>,
): Machine<TData> {
  const { _scope: scope, _config: config } = normalizeMachineArgs(
    scopeOrConfig,
    maybeConfig,
  );

  assertMachineConfig(config);

  const rawData = config.data;
  let owner: Scope | undefined;
  let machine: Machine<TData>;

  const machineTarget: _MachineTarget<TData> = {
    current: config.initial,
    data: rawData,
    send(type: string, payload?: unknown): boolean {
      const activeMachine = getActiveMachine();
      const transition = getTransition(activeMachine, config, type);

      if (!transition) {
        return false;
      }

      return batch(owner, () => {
        const activeMachine = getActiveMachine();
        const nextMode = transition(activeMachine.data, payload, activeMachine);

        if (isString(nextMode)) {
          activeMachine.current = nextMode;
        }

        return true;
      });
    },
    can(type: string): boolean {
      return !!getTransition(getActiveMachine(), config, type);
    },
    matches(mode: MachineMode): boolean {
      return getActiveMachine().current === mode;
    },
  };

  Object.defineProperty(machineTarget, _SCOPE_PROXY_BIND, {
    value(handler: Scope, proxy: Machine<TData>) {
      owner = handler;
      machine = proxy;
      machineTarget.data = createScope(rawData, handler) as TData;
    },
  });

  machine = machineTarget;

  if (scope?.$handler) {
    return createScope(
      machineTarget,
      scope.$handler as Scope,
    ) as Machine<TData>;
  }

  return machine;

  function getActiveMachine(): Machine<TData> {
    if (owner?._destroyed) {
      owner = undefined;
      machine = machineTarget;
      machineTarget.data = rawData;
    }

    return machine;
  }
}

function getTransition<TData extends object>(
  machine: Machine<TData>,
  config: MachineConfig<TData>,
  type: string,
): MachineTransition<TData, _Dynamic> | undefined {
  const transitions = config.transitions[machine.current];

  if (!transitions) {
    return undefined;
  }

  const transition = transitions[type];

  return isFunction(transition) ? transition : undefined;
}

function batch<T>(scope: Scope | undefined, fn: () => T): T {
  if (!scope || scope._destroyed) {
    return fn();
  }

  return scope.$batch(fn);
}

function normalizeMachineArgs<TData extends object>(
  scopeOrConfig: ng.Scope | MachineConfig<TData>,
  maybeConfig?: MachineConfig<TData>,
): _MachineArgs<TData> {
  if (maybeConfig) {
    return {
      _scope: scopeOrConfig as ng.Scope,
      _config: maybeConfig,
    };
  }

  return {
    _config: scopeOrConfig as MachineConfig<TData>,
  };
}

function assertMachineConfig<TData extends object>(
  config: MachineConfig<TData>,
): void {
  if (!isString(config.initial) || !config.initial) {
    throw new Error("$machine requires a non-empty initial mode.");
  }

  if (!isObject(config.data)) {
    throw new Error("$machine requires a data object.");
  }

  if (!isObject(config.transitions)) {
    throw new Error("$machine requires a transitions object.");
  }
}
