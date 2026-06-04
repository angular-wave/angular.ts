import {
  SCOPE_PROXY_BIND,
  createScope,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";
import {
  hasOwn,
  isArray,
  isFunction,
  isInstanceOf,
  isObject,
  isString,
  keys,
} from "../../shared/utils.ts";

export type MachineMode = string;

export type MachineEventMap = Record<string, unknown>;

export type MachineNoEvents = Record<never, never>;

type MachineEventName<TEvents extends object> = Extract<keyof TEvents, string>;

type MachineSendPayload<
  TEvents extends object,
  TType extends MachineEventName<TEvents>,
> = undefined extends TEvents[TType]
  ? [payload?: TEvents[TType]]
  : [payload: TEvents[TType]];

type MachineTransitionTable<
  TData extends object,
  TEvents extends object,
> = string extends keyof TEvents
  ? Partial<
      Record<
        string,
        MachineTransitionDefinition<TData, TEvents[string], TEvents>
      >
    >
  : Partial<{
      [TType in MachineEventName<TEvents>]: MachineTransitionDefinition<
        TData,
        TEvents[TType],
        TEvents
      >;
    }>;

export type MachineTransitionResult = MachineMode | false | undefined;

export type MachineTransition<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineNoEvents,
> = (
  data: TData,
  payload: TPayload,
  machine: Machine<TData, TEvents>,
) => MachineTransitionResult;

export type MachineGuard<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineNoEvents,
> = (
  data: TData,
  payload: TPayload,
  machine: Machine<TData, TEvents>,
) => boolean;

export interface MachineTransitionDescriptor<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineNoEvents,
> {
  guard?: MachineGuard<TData, TPayload, TEvents>;
  target: MachineTransition<TData, TPayload, TEvents>;
}

export type MachineTransitionDefinition<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineNoEvents,
> =
  | MachineTransition<TData, TPayload, TEvents>
  | MachineTransitionDescriptor<TData, TPayload, TEvents>;

export type MachineTransitionMap<
  TData extends object,
  TEvents extends object = MachineNoEvents,
> = Partial<
  Record<MachineMode, MachineTransitionTable<TData, TEvents> | undefined>
>;

export interface MachineTransitionContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
  TPayload = unknown,
> {
  type: string;
  from: MachineMode;
  to: MachineMode;
  payload: TPayload;
  data: TData;
  machine: Machine<TData, TEvents>;
}

type MachineTransitionContextUnion<
  TData extends object,
  TEvents extends object,
> = string extends keyof TEvents
  ? MachineTransitionContext<TData, TEvents, TEvents[string]>
  : {
      [TType in MachineEventName<TEvents>]: MachineTransitionContext<
        TData,
        TEvents,
        TEvents[TType]
      > & {
        type: TType;
      };
    }[MachineEventName<TEvents>];

export type MachineTransitionHook<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
> = (context: MachineTransitionContextUnion<TData, TEvents>) => void;

export type MachineModeHooks<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
> = Partial<Record<MachineMode, MachineTransitionHook<TData, TEvents>>>;

export interface MachineHooks<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
> {
  enter?: MachineModeHooks<TData, TEvents>;
  exit?: MachineModeHooks<TData, TEvents>;
  transition?: MachineTransitionHook<TData, TEvents>;
}

export interface MachineConfig<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
> {
  initial: MachineMode;
  data: TData;
  transitions: MachineTransitionMap<TData, TEvents>;
  hooks?: MachineHooks<TData, TEvents>;
}

export interface MachineSnapshot<
  TData extends object = Record<string, unknown>,
> {
  current: MachineMode;
  data: TData;
}

export interface Machine<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
> {
  current: MachineMode;
  data: TData;
  send<TType extends MachineEventName<TEvents>>(
    type: TType,
    ...payload: MachineSendPayload<TEvents, TType>
  ): boolean;
  can<TType extends MachineEventName<TEvents>>(
    type: TType,
    payload?: TEvents[TType],
  ): boolean;
  matches(mode: MachineMode): boolean;
  snapshot(): MachineSnapshot<TData>;
  restore(snapshot: MachineSnapshot<TData>): void;
}

export interface MachineService {
  <
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineNoEvents,
  >(
    config: MachineConfig<TData, TEvents>,
  ): Machine<TData, TEvents>;
  <
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineNoEvents,
  >(
    scope: ng.Scope,
    config: MachineConfig<TData, TEvents>,
  ): Machine<TData, TEvents>;
}

type MachineTarget<TData extends object, TEvents extends object> = Machine<
  TData,
  TEvents
> &
  ScopeProxyBindable;

interface MachineArgs<TData extends object, TEvents extends object> {
  _scope?: ng.Scope;
  _config: MachineConfig<TData, TEvents>;
}

interface MachineBinding<TData extends object, TEvents extends object> {
  _handler: Scope;
  _proxy: Machine<TData, TEvents>;
}

interface ResolvedMachineTransition<
  TData extends object,
  TEvents extends object,
> {
  _guard?: MachineGuard<TData, unknown, TEvents>;
  _target: MachineTransition<TData, unknown, TEvents>;
}

/**
 * Provides reactive mode machines backed by AngularTS scope proxies.
 */
export class MachineProvider {
  $get = (): MachineService => createMachine as MachineService;
}

export function defineMachine<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineNoEvents,
>(config: MachineConfig<TData, TEvents>): MachineConfig<TData, TEvents> {
  return config;
}

function createMachine<
  TData extends object,
  TEvents extends object = MachineNoEvents,
>(
  scopeOrConfig: ng.Scope | MachineConfig<TData, TEvents>,
  maybeConfig?: MachineConfig<TData, TEvents>,
): Machine<TData, TEvents> {
  const { _scope: scope, _config: config } = normalizeMachineArgs(
    scopeOrConfig,
    maybeConfig,
  );

  assertMachineConfig(config);

  const rawData = config.data;
  let activeBinding: MachineBinding<TData, TEvents> | undefined;
  const bindings = new Map<number, MachineBinding<TData, TEvents>>();

  const machineTarget: MachineTarget<TData, TEvents> = {
    current: config.initial,
    data: rawData,
    send(type: string, payload?: unknown): boolean {
      if (!isString(type)) {
        return false;
      }

      const transition = getTransition(machineTarget.current, config, type);

      if (!transition) {
        return false;
      }

      const binding = getActiveBinding();

      return batch(binding?._handler, () => {
        let transitionStarted = false;

        try {
          const activeMachine = getActiveMachine();

          if (!canRunTransition(transition, payload, activeMachine)) {
            return false;
          }

          const from = machineTarget.current;

          transitionStarted = true;

          const nextMode = transition._target(
            activeMachine.data,
            payload,
            activeMachine,
          );
          const to = isNonEmptyString(nextMode) ? nextMode : from;
          const context: MachineTransitionContext<TData, TEvents> = {
            type,
            from,
            to,
            payload,
            data: activeMachine.data,
            machine: activeMachine,
          };
          const hookContext = context as MachineTransitionContextUnion<
            TData,
            TEvents
          >;

          if (from !== to) {
            getModeHook(config.hooks?.exit, from)?.(hookContext);
          }

          if (isNonEmptyString(nextMode)) {
            machineTarget.current = nextMode;
          } else {
            machineTarget.current = from;
          }

          if (from !== to) {
            getModeHook(config.hooks?.enter, to)?.(hookContext);
          }

          getTransitionHook(config.hooks)?.(hookContext);

          return true;
        } finally {
          if (transitionStarted) {
            scheduleMachineBindings();
          }
        }
      });
    },
    can(type: string, payload?: unknown): boolean {
      if (!isString(type)) {
        return false;
      }

      const transition = getTransition(machineTarget.current, config, type);

      return (
        !!transition &&
        canRunTransition(transition, payload, getActiveMachine())
      );
    },
    matches(mode: MachineMode): boolean {
      return machineTarget.current === mode;
    },
    snapshot(): MachineSnapshot<TData> {
      return {
        current: machineTarget.current,
        data: cloneMachineData(rawData),
      };
    },
    restore(snapshot: MachineSnapshot<TData>): void {
      assertMachineSnapshot(snapshot);

      const binding = getActiveBinding();

      batch(binding?._handler, () => {
        const previousDataKeys = collectMachineDataKeys(rawData);

        machineTarget.current = snapshot.current;
        restoreMachineData(rawData, snapshot.data);
        scheduleMachineBindings(previousDataKeys);
      });
    },
  };

  Object.defineProperty(machineTarget, SCOPE_PROXY_BIND, {
    value(handler: Scope, proxy: Machine<TData, TEvents>) {
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
    return createScope(machineTarget, scope.$handler as Scope) as Machine<
      TData,
      TEvents
    >;
  }

  return machineTarget;

  function getActiveMachine(): Machine<TData, TEvents> {
    return getActiveBinding()?._proxy ?? machineTarget;
  }

  function getActiveBinding(): MachineBinding<TData, TEvents> | undefined {
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

  function scheduleMachineBindings(extraDataKeys: string[] = []): void {
    const dataKeys = Array.from(
      new Set([...extraDataKeys, ...collectMachineDataKeys(rawData)]),
    );

    for (const [scopeId, binding] of bindings) {
      if (binding._handler._destroyed) {
        bindings.delete(scopeId);

        continue;
      }

      binding._handler._scheduleWatchKeys(["current", "data"]);
      binding._handler._checkListenersForAllKeys(rawData as never);

      if (dataKeys.length > 0) {
        binding._handler._scheduleWatchKeys(dataKeys);
      }
    }
  }
}

function collectMachineDataKeys(value: object): string[] {
  const keySet = new Set<string>();
  const visited = new WeakSet<object>();

  collectKeys(value, keySet, visited);

  return Array.from(keySet);
}

function collectKeys(
  value: unknown,
  keySet: Set<string>,
  visited: WeakSet<object>,
): void {
  if (!isObject(value)) {
    return;
  }

  const objectValue = value;

  if (visited.has(objectValue)) {
    return;
  }

  visited.add(objectValue);

  collectNativeCollectionKeys(objectValue, keySet);

  const keyList = keys(objectValue);

  for (let i = 0, l = keyList.length; i < l; i++) {
    const key = keyList[i];

    keySet.add(key);
    collectKeys((objectValue as Record<string, unknown>)[key], keySet, visited);
  }
}

function collectNativeCollectionKeys(value: object, keySet: Set<string>): void {
  if (isInstanceOf(value, Map)) {
    keySet.add("size");
    keySet.add("get");
    keySet.add("has");

    return;
  }

  if (isInstanceOf(value, Set)) {
    keySet.add("size");
    keySet.add("has");
  }
}

function cloneMachineData<TData extends object>(data: TData): TData {
  return structuredClone(data);
}

function restoreMachineData<TData extends object>(
  target: TData,
  source: TData,
): void {
  restoreMachineDataValue(target, source, new WeakMap());
}

function restoreMachineDataValue(
  target: object,
  source: object,
  visited: WeakMap<object, WeakSet<object>>,
): void {
  let sourceTargets = visited.get(source);

  if (sourceTargets?.has(target)) {
    return;
  }

  if (!sourceTargets) {
    sourceTargets = new WeakSet();
    visited.set(source, sourceTargets);
  }

  sourceTargets.add(target);

  const targetRecord = target as Record<string, unknown>;
  const sourceRecord = source as Record<string, unknown>;
  const targetKeys = keys(target);

  for (let i = 0, l = targetKeys.length; i < l; i++) {
    const key = targetKeys[i];

    if (!hasOwn(sourceRecord, key)) {
      Reflect.deleteProperty(targetRecord, key);
    }
  }

  const sourceKeys = keys(source);

  for (let i = 0, l = sourceKeys.length; i < l; i++) {
    const key = sourceKeys[i];
    const sourceValue = sourceRecord[key];
    const targetValue = getMachineDataProperty(targetRecord, key);

    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      restoreMachineDataValue(targetValue, sourceValue, visited);

      continue;
    }

    setMachineDataProperty(targetRecord, key, cloneSnapshotValue(sourceValue));
  }
}

function cloneSnapshotValue<T>(value: T): T {
  return isObject(value) ? structuredClone(value) : value;
}

function getMachineDataProperty(
  target: Record<string, unknown>,
  key: string,
): unknown {
  if (key === "__proto__") {
    return hasOwn(target, key)
      ? Object.getOwnPropertyDescriptor(target, key)?.value
      : undefined;
  }

  return target[key];
}

function setMachineDataProperty(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (key === "__proto__") {
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });

    return;
  }

  target[key] = value;
}

function getTransition<TData extends object, TEvents extends object>(
  mode: MachineMode,
  config: MachineConfig<TData, TEvents>,
  type: string,
): ResolvedMachineTransition<TData, TEvents> | undefined {
  if (!hasOwn(config.transitions, mode)) {
    return undefined;
  }

  const transitions = config.transitions[mode];

  if (!isObject(transitions) || !hasOwn(transitions, type)) {
    return undefined;
  }

  const transition = (transitions as Record<string, unknown>)[type];

  return resolveMachineTransition<TData, TEvents>(transition);
}

function resolveMachineTransition<TData extends object, TEvents extends object>(
  transition: unknown,
): ResolvedMachineTransition<TData, TEvents> | undefined {
  if (isFunction(transition)) {
    return {
      _target: transition as MachineTransition<TData, unknown, TEvents>,
    };
  }

  if (!isPlainObject(transition) || !hasOwn(transition, "target")) {
    return undefined;
  }

  const descriptor = transition as Partial<
    MachineTransitionDescriptor<TData, unknown, TEvents>
  >;

  if (!isFunction(descriptor.target)) {
    return undefined;
  }

  return {
    _guard: isFunction(descriptor.guard) ? descriptor.guard : undefined,
    _target: descriptor.target,
  };
}

function canRunTransition<TData extends object, TEvents extends object>(
  transition: ResolvedMachineTransition<TData, TEvents>,
  payload: unknown,
  machine: Machine<TData, TEvents>,
): boolean {
  return transition._guard
    ? transition._guard(machine.data, payload, machine)
    : true;
}

function getModeHook<TData extends object, TEvents extends object>(
  hooks: MachineModeHooks<TData, TEvents> | undefined,
  mode: MachineMode,
): MachineTransitionHook<TData, TEvents> | undefined {
  if (!hooks || !hasOwn(hooks, mode)) {
    return undefined;
  }

  const hook = hooks[mode];

  return isFunction(hook) ? hook : undefined;
}

function getTransitionHook<TData extends object, TEvents extends object>(
  hooks: MachineHooks<TData, TEvents> | undefined,
): MachineTransitionHook<TData, TEvents> | undefined {
  if (!hooks || !hasOwn(hooks, "transition")) {
    return undefined;
  }

  return isFunction(hooks.transition) ? hooks.transition : undefined;
}

function batch<T>(scope: Scope | undefined, fn: () => T): T {
  if (!scope || scope._destroyed) {
    return fn();
  }

  return scope.$batch(fn);
}

function normalizeMachineArgs<TData extends object, TEvents extends object>(
  scopeOrConfig: ng.Scope | MachineConfig<TData, TEvents>,
  maybeConfig?: MachineConfig<TData, TEvents>,
): MachineArgs<TData, TEvents> {
  if (maybeConfig) {
    return {
      _scope: scopeOrConfig as ng.Scope,
      _config: maybeConfig,
    };
  }

  return {
    _config: scopeOrConfig as MachineConfig<TData, TEvents>,
  };
}

function assertMachineConfig<TData extends object, TEvents extends object>(
  config: MachineConfig<TData, TEvents>,
): void {
  if (!isObject(config)) {
    throw new Error("$machine requires a config object.");
  }

  if (!isString(config.initial) || !config.initial) {
    throw new Error("$machine requires a non-empty initial mode.");
  }

  if (!isObject(config.data)) {
    throw new Error("$machine requires a data object.");
  }

  if (!isObject(config.transitions)) {
    throw new Error("$machine requires a transitions object.");
  }

  assertMachineHooks(config.hooks);
}

function assertMachineSnapshot(snapshot: unknown): void {
  if (!snapshot || !isObject(snapshot)) {
    throw new Error("$machine restore requires a snapshot object.");
  }

  const candidate = snapshot as Partial<MachineSnapshot>;

  if (!isString(candidate.current) || !candidate.current) {
    throw new Error("$machine restore requires a non-empty current mode.");
  }

  if (!isObject(candidate.data)) {
    throw new Error("$machine restore requires a data object.");
  }
}

function assertMachineHooks<TData extends object, TEvents extends object>(
  hooks: MachineHooks<TData, TEvents> | undefined,
): void {
  if (hooks === undefined) {
    return;
  }

  if (!isPlainObject(hooks)) {
    throw new Error("$machine hooks must be an object.");
  }

  assertMachineHookMap("enter", hooks.enter);
  assertMachineHookMap("exit", hooks.exit);

  if (hooks.transition !== undefined && !isFunction(hooks.transition)) {
    throw new Error("$machine hooks.transition must be a function.");
  }
}

function assertMachineHookMap(name: "enter" | "exit", hooks: unknown): void {
  if (hooks === undefined) {
    return;
  }

  if (!isPlainObject(hooks)) {
    throw new Error(`$machine hooks.${name} must be an object.`);
  }

  const hookNames = keys(hooks);

  for (let i = 0, l = hookNames.length; i < l; i++) {
    if (!isFunction(hooks[hookNames[i]])) {
      throw new Error(`$machine hooks.${name} entries must be functions.`);
    }
  }
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value !== "";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isObject(value) || isArray(value)) {
    return false;
  }

  const prototype = Reflect.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}
