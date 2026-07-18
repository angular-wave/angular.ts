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
  isPromiseLike,
  isString,
  keys,
} from "../../shared/utils.ts";
import type {
  PolicyContext,
  PolicyDecision,
} from "../../core/policy/policy.ts";

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

export type MachineTransitionPolicyDecisionType = "allow" | "deny";

export type MachineReadonlyMachine<
  TData extends object,
  TEvents extends object,
  TMode extends MachineMode = MachineMode,
> = Omit<Machine<TData, TEvents, TMode>, "data"> & {
  readonly data: Readonly<TData>;
};

export interface MachineTransitionPolicyContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TMode extends MachineMode = MachineMode,
> extends PolicyContext {
  operation: "machine.transition";
  machineId?: string;
  type: string;
  from: TMode;
  to: TMode;
  payload: TPayload;
  data: Readonly<TData>;
  machine: MachineReadonlyMachine<TData, TEvents, TMode>;
  metadata?: Record<string, unknown>;
}

export type MachineTransitionPolicyDecision =
  PolicyDecision<MachineTransitionPolicyDecisionType>;

export type MachineTransitionPolicy<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = (
  context: MachineTransitionPolicyContext<
    TData,
    TEvents,
    TEvents extends Record<string, infer TPayload> ? TPayload : unknown,
    TMode
  >,
) => MachineTransitionPolicyDecision | MachineTransitionPolicyDecisionType;

export interface MachineEventTransitionContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TMode extends MachineMode = MachineMode,
> {
  type: string;
  from: TMode;
  to?: TMode;
  payload: TPayload;
  data: TData;
  machine: Machine<TData, TEvents, TMode>;
}

export type MachineEventTransitionGuardContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TMode extends MachineMode = MachineMode,
> = Omit<
  MachineEventTransitionContext<TData, TEvents, TPayload, TMode>,
  "data" | "machine"
> & {
  readonly data: Readonly<TData>;
  readonly machine: MachineReadonlyMachine<TData, TEvents, TMode>;
};

export type MachineEventTransitionGuard<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = (
  context: MachineEventTransitionGuardContext<TData, TEvents, TPayload, TMode>,
) => boolean;

export type MachineEventTransitionUpdate<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = (
  context: MachineEventTransitionContext<TData, TEvents, TPayload, TMode>,
) => void;

export type MachineEventTransitionHook<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = (
  context: MachineEventTransitionContext<TData, TEvents, TPayload, TMode>,
) => void;

export type MachineEventTransitionConfig<
  TData extends object = Record<string, unknown>,
  TPayload = unknown,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
  TFrom extends TMode = TMode,
> =
  | {
      guard?: MachineEventTransitionGuard<TData, TPayload, TEvents, TMode>;
      before?: MachineEventTransitionHook<TData, TPayload, TEvents, TMode>;
      after?: MachineEventTransitionHook<TData, TPayload, TEvents, TMode>;
      denied?: MachineEventTransitionHook<TData, TPayload, TEvents, TMode>;
      to: TMode;
      update?: MachineEventTransitionUpdate<TData, TPayload, TEvents, TMode>;
    }
  | {
      guard?: MachineEventTransitionGuard<TData, TPayload, TEvents, TMode>;
      before?: MachineEventTransitionHook<TData, TPayload, TEvents, TMode>;
      after?: MachineEventTransitionHook<TData, TPayload, TEvents, TMode>;
      denied?: MachineEventTransitionHook<TData, TPayload, TEvents, TMode>;
      to?: TFrom;
      update: MachineEventTransitionUpdate<TData, TPayload, TEvents, TMode>;
    };

export type MachineStateTransitionMap<
  TData extends object,
  TEvents extends object,
  TMode extends MachineMode,
  TFrom extends TMode,
> = string extends keyof TEvents
  ? Partial<
      Record<
        string,
        MachineEventTransitionConfig<
          TData,
          TEvents[string],
          TEvents,
          TMode,
          TFrom
        >
      >
    >
  : Partial<{
      [TType in MachineEventName<TEvents>]: MachineEventTransitionConfig<
        TData,
        TEvents[TType],
        TEvents,
        TMode,
        TFrom
      >;
    }>;

export interface MachineStateDefinition<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
  TFrom extends TMode = TMode,
> {
  on?: MachineStateTransitionMap<TData, TEvents, TMode, TFrom>;
}

export type MachineStateMap<
  TData extends object,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = {
  [TFrom in TMode]: MachineStateDefinition<TData, TEvents, TMode, TFrom>;
};

type MachineEventNamesFromStates<TStates extends object> = {
  [TMode in keyof TStates]: TStates[TMode] extends { on?: infer TOn }
    ? Extract<keyof TOn, string>
    : never;
}[keyof TStates];

type MachineEventsFromStates<TStates extends object> = Record<
  MachineEventNamesFromStates<TStates>,
  unknown
>;

type InferredMachineConfig<
  TData extends object,
  TStates extends Record<string, MachineStateDefinition<TData>>,
> = Omit<
  MachineConfig<
    TData,
    MachineEventsFromStates<TStates>,
    Extract<keyof TStates, string>
  >,
  "initial" | "states"
> & {
  initial: Extract<keyof TStates, string>;
  states: TStates &
    MachineStateMap<
      TData,
      MachineEventsFromStates<TStates>,
      Extract<keyof TStates, string>
    >;
};

export interface MachineConfig<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> {
  id?: string;
  initial: TMode;
  data: TData;
  states: MachineStateMap<TData, TEvents, TMode>;
  hooks?: MachineHooks<TData, TEvents, TMode>;
  policy?: MachineTransitionPolicy<TData, TEvents, TMode>;
  metadata?: Record<string, unknown>;
}

export type MachineDataOf<TMachine> = TMachine extends {
  data: infer TData extends object;
}
  ? TData
  : TMachine extends MachineConfig<infer TData extends object>
    ? TData
    : never;

export type MachineEventsOf<TMachine> =
  TMachine extends Machine<object, infer TEvents>
    ? TEvents
    : TMachine extends MachineConfig<object, infer TEvents extends object>
      ? TEvents
      : MachineEventMap;

export type MachineEventNamesOf<TMachine> = Extract<
  keyof MachineEventsOf<TMachine>,
  string
>;

export type MachineModesOf<TMachine> =
  TMachine extends MachineConfig<
    object,
    object,
    infer TMode extends MachineMode
  >
    ? TMode
    : TMachine extends { states: infer TStates }
      ? Extract<keyof TStates, string>
      : MachineMode;

export type MachineGlobalTransitionHook<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
> = (
  context: string extends keyof TEvents
    ? MachineEventTransitionContext<TData, TEvents, TEvents[string]>
    : {
        [TType in MachineEventName<TEvents>]: MachineEventTransitionContext<
          TData,
          TEvents,
          TEvents[TType]
        > & {
          type: TType;
        };
      }[MachineEventName<TEvents>],
) => void;

export type MachineModeHooks<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = Partial<Record<TMode, MachineGlobalTransitionHook<TData, TEvents>>>;

export interface MachineHooks<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> {
  enter?: MachineModeHooks<TData, TEvents, TMode>;
  exit?: MachineModeHooks<TData, TEvents, TMode>;
  transition?: MachineGlobalTransitionHook<TData, TEvents>;
}

export interface MachineSnapshot<
  TData extends object = Record<string, unknown>,
  TMode extends MachineMode = MachineMode,
> {
  readonly current: TMode;
  readonly data: TData;
}

export type MachineSendStatus =
  | "transitioned"
  | "updated"
  | "missing-transition"
  | "guard-denied"
  | "policy-denied"
  | "invalid-event";

type MachineSendResultBase<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = {
  readonly type: string;
  readonly from: TMode;
  readonly to: TMode;
  readonly data: TData;
  readonly payload: unknown;
  readonly machine: Machine<TData, TEvents, TMode>;
  readonly policyDecision?: MachineTransitionPolicyDecision;
};

export type MachineSendResult<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> = MachineSendResultBase<TData, TEvents, TMode> &
  (
    | {
        readonly ok: true;
        readonly status: Extract<MachineSendStatus, "transitioned" | "updated">;
      }
    | {
        readonly ok: false;
        readonly status: Exclude<MachineSendStatus, "transitioned" | "updated">;
      }
  );

export interface Machine<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
> {
  readonly current: TMode;
  data: TData;
  send<TType extends MachineEventName<TEvents>>(
    type: TType,
    ...payload: MachineSendPayload<TEvents, TType>
  ): MachineSendResult<TData, TEvents, TMode>;
  can<TType extends MachineEventName<TEvents>>(
    type: TType,
    ...payload: MachineSendPayload<TEvents, TType>
  ): boolean;
  matches(mode: TMode): boolean;
  snapshot(): MachineSnapshot<TData, TMode>;
  restore(snapshot: MachineSnapshot<TData, TMode>): void;
}

export interface MachineService {
  <
    TData extends object = Record<string, unknown>,
    TEvents extends object = MachineEventMap,
    TMode extends MachineMode = MachineMode,
  >(
    config: MachineConfig<TData, TEvents, TMode>,
  ): Machine<TData, TEvents, TMode>;
}

type MachineTarget<TData extends object, TEvents extends object> = Machine<
  TData,
  TEvents
> &
  ScopeProxyBindable;

interface MachineArgs<
  TData extends object,
  TEvents extends object,
  TMode extends MachineMode,
> {
  _scope?: ng.Scope;
  _config: MachineConfig<TData, TEvents, TMode>;
}

interface MachineBinding<TData extends object, TEvents extends object> {
  _handler: Scope;
  _proxy: Machine<TData, TEvents>;
}

interface ResolvedMachineStateTransition<
  TData extends object,
  TEvents extends object,
> {
  _to?: MachineMode;
  _guard?: MachineEventTransitionGuard<TData, unknown, TEvents>;
  _before?: MachineEventTransitionHook<TData, unknown, TEvents>;
  _update?: MachineEventTransitionUpdate<TData, unknown, TEvents>;
  _after?: MachineEventTransitionHook<TData, unknown, TEvents>;
  _denied?: MachineEventTransitionHook<TData, unknown, TEvents>;
}

/** @internal */
export function createMachineService(): MachineService {
  return createMachine as MachineService;
}

export function defineMachine<
  TData extends object = Record<string, unknown>,
  const TStates extends Record<string, MachineStateDefinition<TData>> = Record<
    string,
    MachineStateDefinition<TData>
  >,
>(
  config: InferredMachineConfig<TData, TStates>,
): MachineConfig<
  TData,
  MachineEventsFromStates<TStates>,
  Extract<keyof TStates, string>
>;
export function defineMachine<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
>(
  config: MachineConfig<TData, TEvents, TMode>,
): MachineConfig<TData, TEvents, TMode>;
export function defineMachine<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
>(
  config: MachineConfig<TData, TEvents, TMode>,
): MachineConfig<TData, TEvents, TMode> {
  return config;
}

function createMachine<
  TData extends object,
  TEvents extends object = MachineEventMap,
  TMode extends MachineMode = MachineMode,
>(
  scopeOrConfig: ng.Scope | MachineConfig<TData, TEvents, TMode>,
  maybeConfig?: MachineConfig<TData, TEvents, TMode>,
): Machine<TData, TEvents, TMode> {
  const { _scope: scope, _config: typedConfig } = normalizeMachineArgs(
    scopeOrConfig,
    maybeConfig,
  );

  assertMachineConfig(typedConfig as unknown as MachineConfig<TData, TEvents>);

  const config = typedConfig as unknown as MachineConfig<TData, TEvents>;
  const rawData = config.data;
  let currentMode = config.initial;
  let activeBinding: MachineBinding<TData, TEvents> | undefined;
  const bindings = new Map<number, MachineBinding<TData, TEvents>>();

  const machineTarget: MachineTarget<TData, TEvents> = {
    get current() {
      return currentMode;
    },
    data: rawData,
    send(type: string, payload?: unknown): MachineSendResult<TData, TEvents> {
      if (!isString(type)) {
        return createSendResult("invalid-event", "", payload, false);
      }

      return dispatchMachineStateTransition(type, payload, config);
    },
    can(type: string, payload?: unknown): boolean {
      if (!isString(type)) {
        return false;
      }

      const transition = getStateTransition(currentMode, config, type);

      if (!transition) {
        return false;
      }

      const activeMachine = getActiveMachine();
      const from = currentMode;
      const context = createStateTransitionContext(
        transition,
        type,
        from,
        payload,
        activeMachine,
      );

      if (!canRunStateTransition(transition, context)) {
        return false;
      }

      return !isMachinePolicyDenied(
        checkMachineTransitionPolicy(
          config,
          createTransitionPolicyContext(
            config,
            type,
            from,
            context.to ?? from,
            payload,
            activeMachine,
          ),
        ),
      );
    },
    matches(mode: MachineMode): boolean {
      return currentMode === mode;
    },
    snapshot(): MachineSnapshot<TData> {
      return {
        current: currentMode,
        data: cloneMachineData(rawData),
      };
    },
    restore(snapshot: MachineSnapshot<TData>): void {
      assertMachineSnapshot(snapshot);

      const binding = getActiveBinding();

      batch(binding?._handler, () => {
        const previousDataKeys = collectMachineDataKeys(rawData);

        currentMode = snapshot.current;
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
    return createScope(
      machineTarget,
      scope.$handler as Scope,
    ) as unknown as Machine<TData, TEvents, TMode>;
  }

  return machineTarget as Machine<TData, TEvents, TMode>;

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

  function dispatchMachineStateTransition(
    type: string,
    payload: unknown,
    stateConfig: MachineConfig<TData, TEvents>,
  ): MachineSendResult<TData, TEvents> {
    const transition = getStateTransition(currentMode, stateConfig, type);

    if (!transition) {
      return createSendResult("missing-transition", type, payload, false);
    }

    const binding = getActiveBinding();

    return batch(binding?._handler, () => {
      let transitionStarted = false;

      try {
        const activeMachine = getActiveMachine();
        const from = machineTarget.current;
        const context = createStateTransitionContext(
          transition,
          type,
          from,
          payload,
          activeMachine,
        );

        if (!canRunStateTransition(transition, context)) {
          transitionStarted = !!transition._denied;
          transition._denied?.(context);

          return createSendResult(
            "guard-denied",
            type,
            payload,
            false,
            from,
            from,
            activeMachine,
          );
        }

        const policyDecision = checkMachineTransitionPolicy(
          stateConfig,
          createTransitionPolicyContext(
            stateConfig,
            type,
            from,
            context.to ?? from,
            payload,
            activeMachine,
          ),
        );

        if (isMachinePolicyDenied(policyDecision)) {
          return createSendResult(
            "policy-denied",
            type,
            payload,
            false,
            from,
            from,
            activeMachine,
            policyDecision,
          );
        }

        transitionStarted = true;

        transition._before?.(context);
        transition._update?.(context);

        const to = context.to ?? from;
        const hookContext = context as Parameters<
          MachineGlobalTransitionHook<TData, TEvents>
        >[0];

        if (from !== to) {
          getModeHook(stateConfig.hooks?.exit, from)?.(hookContext);
        }

        currentMode = to;

        if (from !== to) {
          getModeHook(stateConfig.hooks?.enter, to)?.(hookContext);
        }

        transition._after?.(context);
        getTransitionHook(stateConfig.hooks)?.(hookContext);

        return createSendResult(
          from === to ? "updated" : "transitioned",
          type,
          payload,
          true,
          from,
          to,
          activeMachine,
        );
      } finally {
        if (transitionStarted) {
          scheduleMachineBindings();
        }
      }
    });
  }

  function createStateTransitionContext(
    transition: ResolvedMachineStateTransition<TData, TEvents>,
    type: string,
    from: MachineMode,
    payload: unknown,
    activeMachine: Machine<TData, TEvents>,
  ): MachineEventTransitionContext<TData, TEvents> {
    return {
      type,
      from,
      to: transition._to ?? from,
      payload,
      data: activeMachine.data,
      machine: activeMachine,
    };
  }

  function createSendResult(
    status: MachineSendStatus,
    type: string,
    payload: unknown,
    ok: boolean,
    from: MachineMode = currentMode,
    to: MachineMode = from,
    activeMachine: Machine<TData, TEvents> = getActiveMachine(),
    policyDecision?: MachineTransitionPolicyDecision,
  ): MachineSendResult<TData, TEvents> {
    return {
      ok,
      status,
      type,
      from,
      to,
      data: activeMachine.data,
      payload,
      machine: activeMachine,
      policyDecision,
    } as MachineSendResult<TData, TEvents>;
  }
}

const ALLOW_MACHINE_TRANSITION: MachineTransitionPolicyDecision = {
  type: "allow",
};

function createTransitionPolicyContext<
  TData extends object,
  TEvents extends object,
>(
  config: MachineConfig<TData, TEvents>,
  type: string,
  from: MachineMode,
  to: MachineMode,
  payload: unknown,
  activeMachine: Machine<TData, TEvents>,
): MachineTransitionPolicyContext<TData, TEvents> {
  const metadata = config.metadata;

  return {
    operation: "machine.transition",
    target: config.id,
    machineId: config.id,
    type,
    from,
    to,
    payload,
    data: activeMachine.data,
    machine: activeMachine,
    meta: metadata,
    metadata,
  };
}

function checkMachineTransitionPolicy<
  TData extends object,
  TEvents extends object,
>(
  config: MachineConfig<TData, TEvents>,
  context: MachineTransitionPolicyContext<TData, TEvents>,
): MachineTransitionPolicyDecision {
  if (!config.policy) {
    return ALLOW_MACHINE_TRANSITION;
  }

  const decision = config.policy(
    context as MachineTransitionPolicyContext<
      TData,
      TEvents,
      TEvents extends Record<string, infer TPayload> ? TPayload : unknown
    >,
  );

  if (isPromiseLike(decision)) {
    throw new Error("$machine policy must return a synchronous decision.");
  }

  if (isString(decision)) {
    return { type: decision };
  }

  if (!isObject(decision) || !isString(decision.type)) {
    return ALLOW_MACHINE_TRANSITION;
  }

  return decision;
}

function isMachinePolicyDenied(
  decision: MachineTransitionPolicyDecision,
): boolean {
  return decision.type === "deny";
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

function getStateTransition<TData extends object, TEvents extends object>(
  mode: MachineMode,
  config: MachineConfig<TData, TEvents>,
  type: string,
): ResolvedMachineStateTransition<TData, TEvents> | undefined {
  if (!hasOwn(config.states, mode)) {
    return undefined;
  }

  const state = config.states[mode];

  if (!isObject(state) || !isObject(state.on) || !hasOwn(state.on, type)) {
    return undefined;
  }

  const transition = (state.on as Record<string, unknown>)[type];

  return resolveMachineStateTransition<TData, TEvents>(transition);
}

function resolveMachineStateTransition<
  TData extends object,
  TEvents extends object,
>(
  transition: unknown,
): ResolvedMachineStateTransition<TData, TEvents> | undefined {
  if (!isPlainObject(transition)) {
    return undefined;
  }

  const descriptor = transition as Partial<
    MachineEventTransitionConfig<TData, unknown, TEvents>
  >;
  const hasTo = hasOwn(transition, "to");
  const hasUpdate = hasOwn(transition, "update");

  if (hasTo && !isNonEmptyString(descriptor.to)) {
    return undefined;
  }

  if (!hasTo && !isFunction(descriptor.update)) {
    return undefined;
  }

  if (hasUpdate && !isFunction(descriptor.update)) {
    return undefined;
  }

  if (descriptor.guard !== undefined && !isFunction(descriptor.guard)) {
    return undefined;
  }

  if (descriptor.before !== undefined && !isFunction(descriptor.before)) {
    return undefined;
  }

  if (descriptor.after !== undefined && !isFunction(descriptor.after)) {
    return undefined;
  }

  if (descriptor.denied !== undefined && !isFunction(descriptor.denied)) {
    return undefined;
  }

  return {
    _to: isNonEmptyString(descriptor.to) ? descriptor.to : undefined,
    _guard: isFunction(descriptor.guard) ? descriptor.guard : undefined,
    _before: isFunction(descriptor.before) ? descriptor.before : undefined,
    _update: isFunction(descriptor.update) ? descriptor.update : undefined,
    _after: isFunction(descriptor.after) ? descriptor.after : undefined,
    _denied: isFunction(descriptor.denied) ? descriptor.denied : undefined,
  };
}

function canRunStateTransition<TData extends object, TEvents extends object>(
  transition: ResolvedMachineStateTransition<TData, TEvents>,
  context: MachineEventTransitionContext<TData, TEvents>,
): boolean {
  return transition._guard ? transition._guard(context) : true;
}

function getModeHook<TData extends object, TEvents extends object>(
  hooks: MachineModeHooks<TData, TEvents> | undefined,
  mode: MachineMode,
): MachineGlobalTransitionHook<TData, TEvents> | undefined {
  if (!hooks || !hasOwn(hooks, mode)) {
    return undefined;
  }

  const hook = hooks[mode];

  return isFunction(hook) ? hook : undefined;
}

function getTransitionHook<TData extends object, TEvents extends object>(
  hooks: MachineHooks<TData, TEvents> | undefined,
): MachineGlobalTransitionHook<TData, TEvents> | undefined {
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

function normalizeMachineArgs<
  TData extends object,
  TEvents extends object,
  TMode extends MachineMode,
>(
  scopeOrConfig: ng.Scope | MachineConfig<TData, TEvents, TMode>,
  maybeConfig?: MachineConfig<TData, TEvents, TMode>,
): MachineArgs<TData, TEvents, TMode> {
  if (maybeConfig) {
    return {
      _scope: scopeOrConfig as ng.Scope,
      _config: maybeConfig,
    };
  }

  return {
    _config: scopeOrConfig as MachineConfig<TData, TEvents, TMode>,
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

  if (!isObject(config.states)) {
    throw new Error("$machine requires a states object.");
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
