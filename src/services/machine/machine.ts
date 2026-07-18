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
import { normalizePolicyDecision } from "../../core/policy/policy.ts";

export type MachineState = string;

export type MachineEventMap = Record<string, unknown>;

export type MachineNoEvents = Record<never, never>;

/** Labeled type contract carried by a machine definition and instance. */
export interface MachineContract {
  data: object;
  events: object;
  state: MachineState;
}

type DefaultMachineContract = {
  data: object;
  events: MachineEventMap;
  state: MachineState;
};

type MachineContractOf<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
> = {
  data: TData;
  events: TEvents;
  state: TState;
};

type MachineInstance<
  TData extends object,
  TEvents extends object,
  TState extends MachineState = MachineState,
> = Machine<MachineContractOf<TData, TEvents, TState>>;

type MachineConfiguration<
  TData extends object,
  TEvents extends object,
  TState extends MachineState = MachineState,
> = MachineConfig<MachineContractOf<TData, TEvents, TState>>;

type MachineEventName<TEvents extends object> = Extract<keyof TEvents, string>;

type MachineSendPayload<
  TEvents extends object,
  TType extends MachineEventName<TEvents>,
> = undefined extends TEvents[TType]
  ? [payload?: TEvents[TType]]
  : [payload: TEvents[TType]];

/** @inline */
type MachineReadonlyMachine<
  TData extends object,
  TEvents extends object,
  TState extends MachineState = MachineState,
> = Omit<
  Pick<
    MachineInstance<TData, TEvents, TState>,
    "state" | "data" | "can" | "matches" | "snapshot"
  >,
  "data"
> & {
  readonly data: Readonly<TData>;
};

/** @inline */
interface MachineTransitionPolicyContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
> extends PolicyContext<"machine.transition"> {
  readonly machineId?: string;
  readonly type: string;
  readonly from: TState;
  readonly to: TState;
  readonly payload: TPayload;
  readonly data: Readonly<TData>;
  readonly machine: MachineReadonlyMachine<TData, TEvents, TState>;
}

/** @inline */
type MachineTransitionPolicy<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TState extends MachineState = MachineState,
> = (
  context: string extends keyof TEvents
    ? MachineTransitionPolicyContext<
        TData,
        TEvents,
        TEvents extends Record<string, infer TPayload> ? TPayload : unknown,
        TState
      >
    : {
        [TType in MachineEventName<TEvents>]: MachineTransitionPolicyContext<
          TData,
          TEvents,
          TEvents[TType],
          TState
        > & {
          readonly type: TType;
        };
      }[MachineEventName<TEvents>],
) => PolicyDecision<"allow" | "deny"> | "allow" | "deny";

/** @inline */
interface MachineEventTransitionContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
> {
  readonly type: string;
  readonly from: TState;
  readonly to: TState;
  readonly payload: TPayload;
  readonly data: TData;
  readonly machine: MachineInstance<TData, TEvents, TState>;
}

/** @inline */
type MachineEventTransitionGuardContext<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
> = Omit<
  MachineEventTransitionContext<TData, TEvents, TPayload, TState>,
  "data" | "machine"
> & {
  readonly data: Readonly<TData>;
  readonly machine: MachineReadonlyMachine<TData, TEvents, TState>;
};

/** @inline */
type MachineEventTransitionGuard<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
> = (
  context: MachineEventTransitionGuardContext<TData, TEvents, TPayload, TState>,
) => boolean;

/** @inline */
type MachineEventTransitionUpdate<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
> = (
  context: MachineEventTransitionContext<TData, TEvents, TPayload, TState>,
) => void;

/** @inline */
type MachineEventTransitionHook<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
> = (
  context: MachineEventTransitionContext<TData, TEvents, TPayload, TState>,
) => void;

/** @inline */
type MachineEventTransitionConfig<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TPayload = unknown,
  TState extends MachineState = MachineState,
  TFrom extends TState = TState,
> = {
  guard?: MachineEventTransitionGuard<TData, TEvents, TPayload, TState>;
  before?: MachineEventTransitionHook<TData, TEvents, TPayload, TState>;
  after?: MachineEventTransitionHook<TData, TEvents, TPayload, TState>;
  denied?: MachineEventTransitionHook<TData, TEvents, TPayload, TState>;
} & (
  | {
      to:
        | TState
        | ((
            context: MachineEventTransitionGuardContext<
              TData,
              TEvents,
              TPayload,
              TState
            >,
          ) => TState);
      update?: MachineEventTransitionUpdate<TData, TEvents, TPayload, TState>;
    }
  | {
      to?: TFrom;
      update: MachineEventTransitionUpdate<TData, TEvents, TPayload, TState>;
    }
);

/** @inline */
type MachineStateTransitionMap<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
  TFrom extends TState,
> = string extends keyof TEvents
  ? Partial<
      Record<
        string,
        MachineEventTransitionConfig<
          TData,
          TEvents,
          TEvents[string],
          TState,
          TFrom
        >
      >
    >
  : Partial<{
      [TType in MachineEventName<TEvents>]: MachineEventTransitionConfig<
        TData,
        TEvents,
        TEvents[TType],
        TState,
        TFrom
      >;
    }>;

export interface MachineStateDefinition<
  TContract extends MachineContract = DefaultMachineContract,
  TFrom extends TContract["state"] = TContract["state"],
> {
  on?: MachineStateTransitionMap<
    TContract["data"],
    TContract["events"],
    TContract["state"],
    TFrom
  >;
}

export type MachineStateMap<
  TContract extends MachineContract = DefaultMachineContract,
> = {
  [TFrom in TContract["state"]]: MachineStateDefinition<TContract, TFrom>;
};

/** @inline */
type MachineEventNamesFromStates<TStates extends object> = {
  [TState in keyof TStates]: TStates[TState] extends { on?: infer TOn }
    ? Extract<keyof TOn, string>
    : never;
}[keyof TStates];

/** @inline */
type MachineEventsFromStates<TStates extends object> = Record<
  MachineEventNamesFromStates<TStates>,
  unknown
>;

type InferredMachineConfig<TData extends object, TStates extends object> = Omit<
  MachineConfig<
    MachineContractOf<
      TData,
      MachineEventsFromStates<TStates>,
      Extract<keyof TStates, string>
    >
  >,
  "data" | "initial" | "states"
> & {
  initial: Extract<keyof TStates, string>;
  states: TStates &
    MachineStateMap<
      MachineContractOf<
        TData,
        MachineEventsFromStates<TStates>,
        Extract<keyof TStates, string>
      >
    >;
};

type MachineEmptyData = Record<never, never>;

type MachineDataConfig<TData extends object> = keyof TData extends never
  ? { data?: TData }
  : { data: TData };

export type MachineConfig<
  TContract extends MachineContract = DefaultMachineContract,
> = {
  id?: string;
  initial: TContract["state"];
  states: MachineStateMap<TContract>;
  hooks?: MachineHooks<
    TContract["data"],
    TContract["events"],
    TContract["state"]
  >;
  policy?: MachineTransitionPolicy<
    TContract["data"],
    TContract["events"],
    TContract["state"]
  >;
  meta?: Readonly<Record<string, unknown>>;
} & MachineDataConfig<TContract["data"]>;

export type MachineDataOf<TMachine> = TMachine extends {
  data: infer TData extends object;
}
  ? TData
  : TMachine extends MachineConfig<infer TContract>
    ? TContract["data"]
    : never;

export type MachineEventsOf<TMachine> =
  TMachine extends Machine<infer TContract>
    ? TContract["events"]
    : TMachine extends MachineConfig<infer TContract>
      ? TContract["events"]
      : MachineEventMap;

export type MachineEventNamesOf<TMachine> = Extract<
  keyof MachineEventsOf<TMachine>,
  string
>;

export type MachineStatesOf<TMachine> =
  TMachine extends MachineConfig<infer TContract>
    ? TContract["state"]
    : TMachine extends Machine<infer TContract>
      ? TContract["state"]
      : TMachine extends { states: infer TStates }
        ? Extract<keyof TStates, string>
        : MachineState;

/** @inline */
type MachineGlobalTransitionHook<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TState extends MachineState = MachineState,
> = (
  context: string extends keyof TEvents
    ? MachineEventTransitionContext<TData, TEvents, TEvents[string], TState>
    : {
        [TType in MachineEventName<TEvents>]: MachineEventTransitionContext<
          TData,
          TEvents,
          TEvents[TType],
          TState
        > & {
          type: TType;
        };
      }[MachineEventName<TEvents>],
) => void;

/** @inline */
type MachineStateHooks<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TState extends MachineState = MachineState,
> = Partial<
  Record<TState, MachineGlobalTransitionHook<TData, TEvents, TState>>
>;

/** @inline */
interface MachineHooks<
  TData extends object = Record<string, unknown>,
  TEvents extends object = MachineEventMap,
  TState extends MachineState = MachineState,
> {
  enter?: MachineStateHooks<TData, TEvents, TState>;
  exit?: MachineStateHooks<TData, TEvents, TState>;
  transition?: MachineGlobalTransitionHook<TData, TEvents, TState>;
}

export interface MachineSnapshot<
  TContract extends MachineContract = DefaultMachineContract,
> {
  readonly state: TContract["state"];
  readonly data: TContract["data"];
}

export type MachineSendStatus =
  | "transitioned"
  | "updated"
  | "missing-transition"
  | "guard-denied"
  | "policy-denied"
  | "invalid-event";

type MachineSendResultBase<TState extends MachineState = MachineState> = {
  readonly type: string;
  readonly from: TState;
  readonly to: TState;
};

export type MachineSendResult<TState extends MachineState = MachineState> =
  MachineSendResultBase<TState> &
    (
      | {
          readonly ok: true;
          readonly status: Extract<
            MachineSendStatus,
            "transitioned" | "updated"
          >;
        }
      | {
          readonly ok: false;
          readonly status: Exclude<
            MachineSendStatus,
            "transitioned" | "updated"
          >;
          readonly reason?: string;
        }
    );

export interface Machine<
  TContract extends MachineContract = DefaultMachineContract,
> {
  readonly state: TContract["state"];
  readonly data: TContract["data"];
  send<TType extends MachineEventName<TContract["events"]>>(
    type: TType,
    ...payload: MachineSendPayload<TContract["events"], TType>
  ): MachineSendResult<TContract["state"]>;
  can<TType extends MachineEventName<TContract["events"]>>(
    type: TType,
    ...payload: MachineSendPayload<TContract["events"], TType>
  ): boolean;
  matches(state: TContract["state"]): boolean;
  snapshot(): MachineSnapshot<TContract>;
  restore(snapshot: unknown): void;
}

export interface MachineService {
  <
    TData extends object,
    const TStates extends Record<
      string,
      MachineStateDefinition<
        MachineContractOf<TData, MachineEventMap, MachineState>
      >
    >,
  >(
    config: { data: TData } & InferredMachineConfig<TData, TStates>,
  ): Machine<
    MachineContractOf<
      TData,
      MachineEventsFromStates<TStates>,
      Extract<keyof TStates, string>
    >
  >;
  <
    const TStates extends Record<
      string,
      MachineStateDefinition<
        MachineContractOf<MachineEmptyData, MachineEventMap, MachineState>
      >
    >,
  >(
    config: { data?: undefined } & InferredMachineConfig<
      MachineEmptyData,
      TStates
    >,
  ): Machine<
    MachineContractOf<
      MachineEmptyData,
      MachineEventsFromStates<TStates>,
      Extract<keyof TStates, string>
    >
  >;
  <TContract extends MachineContract = DefaultMachineContract>(
    config: MachineConfig<TContract>,
  ): Machine<TContract>;
}

type MachineTarget<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
> = MachineInstance<TData, TEvents, TState> & ScopeProxyBindable;

type ResolvedMachineConfiguration<
  TData extends object,
  TEvents extends object,
  TState extends MachineState = MachineState,
> = Omit<MachineConfiguration<TData, TEvents, TState>, "data"> & {
  data: TData;
};

interface MachineArgs<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
> {
  _scope?: ng.Scope;
  _config: MachineConfiguration<TData, TEvents, TState>;
}

interface MachineBinding<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
> {
  _handler: Scope;
  _proxy: MachineInstance<TData, TEvents, TState>;
}

interface ResolvedMachineStateTransition<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
> {
  _to?:
    | TState
    | ((
        context: MachineEventTransitionGuardContext<
          TData,
          TEvents,
          unknown,
          TState
        >,
      ) => TState);
  _guard?: MachineEventTransitionGuard<TData, TEvents, unknown, TState>;
  _before?: MachineEventTransitionHook<TData, TEvents, unknown, TState>;
  _update?: MachineEventTransitionUpdate<TData, TEvents, unknown, TState>;
  _after?: MachineEventTransitionHook<TData, TEvents, unknown, TState>;
  _denied?: MachineEventTransitionHook<TData, TEvents, unknown, TState>;
}

/** @internal */
export function createMachineService(): MachineService {
  return createMachine as MachineService;
}

function createMachine<
  TData extends object,
  TEvents extends object = MachineEventMap,
  TState extends MachineState = MachineState,
>(
  scopeOrConfig: ng.Scope | MachineConfiguration<TData, TEvents, TState>,
  maybeConfig?: MachineConfiguration<TData, TEvents, TState>,
): MachineInstance<TData, TEvents, TState> {
  const { _scope: scope, _config: typedConfig } = normalizeMachineArgs(
    scopeOrConfig,
    maybeConfig,
  );

  const config = {
    ...typedConfig,
    data: defaultMachineData(typedConfig.data),
  } as unknown as ResolvedMachineConfiguration<TData, TEvents, TState>;

  assertMachineConfig(config);
  const rawData = config.data;
  let currentState: TState = config.initial;
  let activeBinding: MachineBinding<TData, TEvents, TState> | undefined;
  const bindings = new Map<number, MachineBinding<TData, TEvents, TState>>();

  const machineTarget: MachineTarget<TData, TEvents, TState> = {
    get state() {
      return currentState;
    },
    get data() {
      return rawData;
    },
    send(type: string, payload?: unknown): MachineSendResult<TState> {
      if (!isString(type)) {
        return createSendResult("invalid-event", "", false);
      }

      return dispatchMachineStateTransition(type, payload, config);
    },
    can(type: string, payload?: unknown): boolean {
      if (!isString(type)) {
        return false;
      }

      const transition = getStateTransition(currentState, config, type);

      if (!transition) {
        return false;
      }

      const activeMachine = getActiveMachine();
      const from = currentState;
      const to = resolveMachineTransitionTarget(
        transition,
        type,
        from,
        payload,
        activeMachine,
        config,
      );
      const context = createStateTransitionContext(
        type,
        from,
        to,
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
            context.to,
            payload,
            activeMachine,
          ),
        ),
      );
    },
    matches(state: TState): boolean {
      return currentState === state;
    },
    snapshot(): MachineSnapshot<MachineContractOf<TData, TEvents, TState>> {
      return {
        state: currentState,
        data: cloneMachineData(rawData),
      };
    },
    restore(snapshot: unknown): void {
      assertMachineSnapshot(snapshot, config);

      const binding = getActiveBinding();

      batch(binding?._handler, () => {
        const previousDataKeys = collectMachineDataKeys(rawData);

        currentState = snapshot.state;
        restoreMachineData(rawData, snapshot.data);
        scheduleMachineBindings(previousDataKeys);
      });
    },
  };

  Object.defineProperty(machineTarget, SCOPE_PROXY_BIND, {
    value(handler: Scope, proxy: MachineInstance<TData, TEvents, TState>) {
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
    ) as unknown as MachineInstance<TData, TEvents, TState>;
  }

  return machineTarget as MachineInstance<TData, TEvents, TState>;

  function getActiveMachine(): MachineInstance<TData, TEvents, TState> {
    return getActiveBinding()?._proxy ?? machineTarget;
  }

  function getActiveBinding():
    | MachineBinding<TData, TEvents, TState>
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

  function scheduleMachineBindings(extraDataKeys: string[] = []): void {
    const dataKeys = Array.from(
      new Set([...extraDataKeys, ...collectMachineDataKeys(rawData)]),
    );

    for (const [scopeId, binding] of bindings) {
      if (binding._handler._destroyed) {
        bindings.delete(scopeId);

        continue;
      }

      binding._handler._scheduleWatchKeys(["state", "data"]);
      binding._handler._checkListenersForAllKeys(rawData as never);

      if (dataKeys.length > 0) {
        binding._handler._scheduleWatchKeys(dataKeys);
      }
    }
  }

  function dispatchMachineStateTransition(
    type: string,
    payload: unknown,
    stateConfig: MachineConfiguration<TData, TEvents, TState>,
  ): MachineSendResult<TState> {
    const transition = getStateTransition(currentState, stateConfig, type);

    if (!transition) {
      return createSendResult("missing-transition", type, false);
    }

    const binding = getActiveBinding();

    return batch(binding?._handler, () => {
      let transitionStarted = false;

      try {
        const activeMachine = getActiveMachine();
        const from = machineTarget.state;
        const to = resolveMachineTransitionTarget(
          transition,
          type,
          from,
          payload,
          activeMachine,
          stateConfig,
        );
        const context = createStateTransitionContext(
          type,
          from,
          to,
          payload,
          activeMachine,
        );

        if (!canRunStateTransition(transition, context)) {
          transitionStarted = !!transition._denied;
          transition._denied?.(context);

          return createSendResult("guard-denied", type, false, from, from);
        }

        const policyDecision = checkMachineTransitionPolicy(
          stateConfig,
          createTransitionPolicyContext(
            stateConfig,
            type,
            from,
            context.to,
            payload,
            activeMachine,
          ),
        );

        if (isMachinePolicyDenied(policyDecision)) {
          return createSendResult(
            "policy-denied",
            type,
            false,
            from,
            from,
            policyDecision.reason,
          );
        }

        transitionStarted = true;

        transition._before?.(context);
        transition._update?.(context);

        const hookContext = context as Parameters<
          MachineGlobalTransitionHook<TData, TEvents, TState>
        >[0];

        if (from !== to) {
          getModeHook(stateConfig.hooks?.exit, from)?.(hookContext);
        }

        currentState = to;

        if (from !== to) {
          getModeHook(stateConfig.hooks?.enter, to)?.(hookContext);
        }

        transition._after?.(context);
        getTransitionHook(stateConfig.hooks)?.(hookContext);

        return createSendResult(
          from === to ? "updated" : "transitioned",
          type,
          true,
          from,
          to,
        );
      } finally {
        if (transitionStarted) {
          scheduleMachineBindings();
        }
      }
    });
  }

  function createStateTransitionContext(
    type: string,
    from: TState,
    to: TState,
    payload: unknown,
    activeMachine: MachineInstance<TData, TEvents, TState>,
  ): MachineEventTransitionContext<TData, TEvents, unknown, TState> {
    return {
      type,
      from,
      to,
      payload,
      data: activeMachine.data,
      machine: activeMachine,
    };
  }

  function resolveMachineTransitionTarget(
    transition: ResolvedMachineStateTransition<TData, TEvents, TState>,
    type: string,
    from: TState,
    payload: unknown,
    activeMachine: MachineInstance<TData, TEvents, TState>,
    stateConfig: MachineConfiguration<TData, TEvents, TState>,
  ): TState {
    const to = isFunction(transition._to)
      ? transition._to(
          createStateTransitionContext(
            type,
            from,
            from,
            payload,
            activeMachine,
          ),
        )
      : (transition._to ?? from);

    if (!isNonEmptyString(to)) {
      throw new Error(
        "$machine transition target resolver must return a non-empty state.",
      );
    }

    if (!hasOwn(stateConfig.states, to)) {
      throw new Error(
        `$machine transition target '${to}' is not a configured state.`,
      );
    }

    return to;
  }

  function createSendResult(
    status: MachineSendStatus,
    type: string,
    ok: boolean,
    from: TState = currentState,
    to: TState = from,
    reason?: string,
  ): MachineSendResult<TState> {
    return {
      ok,
      status,
      type,
      from,
      to,
      ...(reason === undefined ? {} : { reason }),
    } as MachineSendResult<TState>;
  }
}

const ALLOW_MACHINE_TRANSITION: PolicyDecision<"allow" | "deny"> = {
  type: "allow",
};

function createTransitionPolicyContext<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  config: MachineConfiguration<TData, TEvents, TState>,
  type: string,
  from: TState,
  to: TState,
  payload: unknown,
  activeMachine: MachineInstance<TData, TEvents, TState>,
): MachineTransitionPolicyContext<TData, TEvents, unknown, TState> {
  return {
    operation: "machine.transition",
    machineId: config.id,
    type,
    from,
    to,
    payload,
    data: activeMachine.data,
    machine: activeMachine,
    meta: config.meta,
  };
}

function checkMachineTransitionPolicy<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  config: MachineConfiguration<TData, TEvents, TState>,
  context: MachineTransitionPolicyContext<TData, TEvents, unknown, TState>,
): PolicyDecision<"allow" | "deny"> {
  if (!config.policy) {
    return ALLOW_MACHINE_TRANSITION;
  }

  const decision = config.policy(
    context as Parameters<MachineTransitionPolicy<TData, TEvents, TState>>[0],
  );

  if (isPromiseLike(decision)) {
    throw new Error("$machine policy must return a synchronous decision.");
  }

  return normalizePolicyDecision(decision);
}

function isMachinePolicyDenied(
  decision: PolicyDecision<"allow" | "deny">,
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

function defaultMachineData<TData extends object>(
  data: TData | undefined,
): TData {
  if (data === undefined) {
    return {} as TData;
  }

  return data;
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

function getStateTransition<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  currentState: TState,
  config: MachineConfiguration<TData, TEvents, TState>,
  type: string,
): ResolvedMachineStateTransition<TData, TEvents, TState> | undefined {
  if (!hasOwn(config.states, currentState)) {
    return undefined;
  }

  const stateDefinition = config.states[currentState];

  if (
    !isObject(stateDefinition) ||
    !isObject(stateDefinition.on) ||
    !hasOwn(stateDefinition.on, type)
  ) {
    return undefined;
  }

  const transition = (stateDefinition.on as Record<string, unknown>)[type];

  return resolveMachineStateTransition<TData, TEvents, TState>(transition);
}

function resolveMachineStateTransition<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  transition: unknown,
): ResolvedMachineStateTransition<TData, TEvents, TState> | undefined {
  if (!isPlainObject(transition)) {
    return undefined;
  }

  const descriptor = transition as Partial<
    MachineEventTransitionConfig<TData, TEvents, unknown, TState>
  >;
  const hasTo = hasOwn(transition, "to");
  const hasUpdate = hasOwn(transition, "update");

  if (hasTo && !isNonEmptyString(descriptor.to) && !isFunction(descriptor.to)) {
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
    _to:
      isNonEmptyString(descriptor.to) || isFunction(descriptor.to)
        ? descriptor.to
        : undefined,
    _guard: isFunction(descriptor.guard) ? descriptor.guard : undefined,
    _before: isFunction(descriptor.before) ? descriptor.before : undefined,
    _update: isFunction(descriptor.update) ? descriptor.update : undefined,
    _after: isFunction(descriptor.after) ? descriptor.after : undefined,
    _denied: isFunction(descriptor.denied) ? descriptor.denied : undefined,
  };
}

function canRunStateTransition<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  transition: ResolvedMachineStateTransition<TData, TEvents, TState>,
  context: MachineEventTransitionContext<TData, TEvents, unknown, TState>,
): boolean {
  return transition._guard ? transition._guard(context) : true;
}

function getModeHook<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  hooks: MachineStateHooks<TData, TEvents, TState> | undefined,
  state: TState,
): MachineGlobalTransitionHook<TData, TEvents, TState> | undefined {
  if (!hooks || !hasOwn(hooks, state)) {
    return undefined;
  }

  const hook = hooks[state];

  return isFunction(hook) ? hook : undefined;
}

function getTransitionHook<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  hooks: MachineHooks<TData, TEvents, TState> | undefined,
): MachineGlobalTransitionHook<TData, TEvents, TState> | undefined {
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
  TState extends MachineState,
>(
  scopeOrConfig: ng.Scope | MachineConfiguration<TData, TEvents, TState>,
  maybeConfig?: MachineConfiguration<TData, TEvents, TState>,
): MachineArgs<TData, TEvents, TState> {
  if (maybeConfig) {
    return {
      _scope: scopeOrConfig as ng.Scope,
      _config: maybeConfig,
    };
  }

  return {
    _config: scopeOrConfig as MachineConfiguration<TData, TEvents, TState>,
  };
}

function assertMachineConfig<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(config: MachineConfiguration<TData, TEvents, TState>): void {
  if (!isObject(config)) {
    throw new Error("$machine requires a config object.");
  }

  if (!isString(config.initial) || !config.initial) {
    throw new Error("$machine requires a non-empty initial state.");
  }

  if (!isObject(config.data)) {
    throw new Error("$machine requires a data object.");
  }

  if (!isObject(config.states)) {
    throw new Error("$machine requires a states object.");
  }

  if (!hasOwn(config.states, config.initial)) {
    throw new Error("$machine initial state must exist in states.");
  }

  assertMachineHooks(config.hooks);
}

function assertMachineSnapshot<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(
  snapshot: unknown,
  config: MachineConfiguration<TData, TEvents, TState>,
): asserts snapshot is MachineSnapshot<
  MachineContractOf<TData, TEvents, TState>
> {
  if (!snapshot || !isObject(snapshot)) {
    throw new Error("$machine restore requires a snapshot object.");
  }

  const candidate = snapshot as Partial<MachineSnapshot>;

  if (!isString(candidate.state) || !candidate.state) {
    throw new Error("$machine restore requires a non-empty state.");
  }

  if (!isObject(candidate.data)) {
    throw new Error("$machine restore requires a data object.");
  }

  if (!hasOwn(config.states, candidate.state)) {
    throw new Error("$machine restore state must exist in states.");
  }
}

function assertMachineHooks<
  TData extends object,
  TEvents extends object,
  TState extends MachineState,
>(hooks: MachineHooks<TData, TEvents, TState> | undefined): void {
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
