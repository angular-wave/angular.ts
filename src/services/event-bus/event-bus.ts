import {
  isProxy,
  nullObject,
  shouldHandleViewRetentionPause,
} from "../../shared/utils.ts";
import type {
  Policy,
  PolicyContext,
  PolicyDecision,
} from "../../core/policy/policy.ts";

type EventDeliveryDecisionType = "deliver" | "drop";

export interface EventDeliveryPolicyContext extends PolicyContext {
  operation: "event.delivery";
  topic: string;
  args: unknown[];
  listenerIndex: number;
  scopeOwned: boolean;
  targetAlive: boolean;
}

type EventDeliveryPolicyDecision = PolicyDecision<EventDeliveryDecisionType>;

export type EventDeliveryPolicy = Policy<
  EventDeliveryPolicyContext,
  PolicyDecision<"deliver" | "drop">
>;

export interface EventBusConfig {
  deliveryPolicy?: EventDeliveryPolicy;
}

/**
 * Callback signature used by {@link EventBus} subscriptions.
 *
 * The generic parameter describes the callback `this` binding when a
 * subscription is registered with a context argument.
 */
export type EventBusListener<TContext = unknown> = (
  this: TContext,
  ...args: unknown[]
) => unknown;

type StoredEventBusListener = (this: unknown, ...args: unknown[]) => unknown;

interface ListenerEntry {
  _fn: StoredEventBusListener;
  _context: unknown;
  _active: boolean;
  _scopeLifecycleContext: boolean;
}

interface PendingScopeDelivery {
  _topic: string;
  _args: unknown[];
  _listenerIndex: number;
  _entry: ListenerEntry;
}

interface ScopeEventBusRetentionState {
  _paused: boolean;
  _pending: PendingScopeDelivery[];
  _flushing: boolean;
  _deregisterPause: () => void;
  _deregisterResume: () => void;
  _deregisterDestroy: () => void;
}

type ScopeLifecycleContext = ng.Scope & {
  $on(name: "$destroy", listener: () => unknown): () => void;
  $handler?: {
    _destroyed?: boolean;
  };
};

function isScopeLifecycleContext(
  value: unknown,
): value is ScopeLifecycleContext {
  return isProxy(value) && typeof value.$on === "function";
}

function isDestroyedScopeLifecycleContext(value: unknown): boolean {
  return isScopeLifecycleContext(value) && value.$handler._destroyed;
}

/**
 * Application-wide asynchronous publish/subscribe utility.
 *
 * `EventBus` powers `$eventBus` for cross-boundary domain events, browser
 * callbacks, worker messages, realtime messages, and non-Angular integrations.
 * It is intentionally not a state store and should not replace scope events for
 * parent/child scope-tree communication.
 */
export class EventBus {
  /** @internal */
  private _topics: Partial<Record<string, ListenerEntry[]>>;
  /** @internal */
  private _disposed: boolean;
  /** @internal */
  private readonly _exceptionHandler: ng.ExceptionHandlerService;
  /** @internal */
  private _deliveryPolicy: EventDeliveryPolicy;
  /** @internal */
  private _scopeRetentionStates = new WeakMap<
    ScopeLifecycleContext,
    ScopeEventBusRetentionState
  >();

  /**
   * Create a publish/subscribe event bus.
   *
   * Applications usually receive the singleton instance by injecting
   * `$eventBus` instead of constructing this class directly.
   *
   * @param $exceptionHandler - Handler invoked when a subscriber throws.
   */
  constructor(
    $exceptionHandler: ng.ExceptionHandlerService,
    deliveryPolicy: EventDeliveryPolicy = defaultEventDeliveryPolicy,
  ) {
    this._topics = nullObject();
    this._disposed = false;
    this._exceptionHandler = $exceptionHandler;
    this._deliveryPolicy = deliveryPolicy;
  }

  /**
   * Reset the bus to its initial state without disposing it.
   *
   * All topics and listeners are removed, and the instance can be reused.
   */
  reset(): void {
    this._topics = nullObject();
    this._disposed = false;
    this.setDeliveryPolicy();
  }

  /**
   * Replace the runtime delivery policy used by future publications.
   *
   * The default policy delivers every active listener. Configured policies can
   * drop deliveries for specific topics, scopes, or application metadata.
   */
  setDeliveryPolicy(policy?: EventDeliveryPolicy): void {
    this._deliveryPolicy = policy ?? defaultEventDeliveryPolicy;
  }

  /**
   * Checks if instance has been disposed.
   * @returns True if disposed.
   */
  isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Dispose the instance, removing all topics and listeners.
   */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._topics = nullObject();
  }

  /**
   * Subscribe a function to a topic.
   *
   * The returned function removes only this listener registration.
   * When `context` is provided, it becomes the listener `this` binding. When
   * `context` is an AngularTS scope proxy, the scope also owns the listener
   * lifecycle: destroying the scope removes the listener and prevents queued
   * delivery from reaching the destroyed scope.
   *
   * @param topic - The topic to subscribe to.
   * @param fn - The callback function to invoke when published.
   * @returns A function that unsubscribes this listener.
   */
  subscribe(topic: string, fn: EventBusListener): () => boolean;
  subscribe<TContext>(
    topic: string,
    fn: EventBusListener<NoInfer<TContext>>,
    context: TContext,
  ): () => boolean;
  subscribe<TContext>(
    topic: string,
    fn: EventBusListener<NoInfer<TContext>>,
    context?: TContext,
  ): () => boolean {
    if (this._disposed) return () => false;
    let listeners = this._topics[topic];

    if (!listeners) this._topics[topic] = listeners = [];

    const scopeLifecycleContext = isScopeLifecycleContext(context);

    const entry: ListenerEntry = {
      _fn: fn as StoredEventBusListener,
      _context: context,
      _active: true,
      _scopeLifecycleContext: scopeLifecycleContext,
    };

    listeners.push(entry);

    const unsubscribe = () => this._unsubscribe(topic, fn, context);

    if (!scopeLifecycleContext) {
      return unsubscribe;
    }

    this._getScopeRetentionState(context as ScopeLifecycleContext);

    let removeDestroyListener: (() => void) | undefined = context.$on(
      "$destroy",
      () => {
        cleanup();
      },
    );

    const cleanup = () => {
      const didUnsubscribe = unsubscribe();

      if (removeDestroyListener) {
        const remove = removeDestroyListener;

        removeDestroyListener = undefined;
        remove();
      }

      return didUnsubscribe;
    };

    return cleanup;
  }

  /**
   * Subscribe a function to a topic only once.
   *
   * Listener is removed before the first invocation.
   * When `context` is provided, it becomes the listener `this` binding. When
   * `context` is an AngularTS scope proxy, scope destruction before first
   * delivery removes the one-time listener.
   *
   * @param topic - The topic to subscribe to.
   * @param fn - The callback function.
   * @returns A function that unsubscribes this listener.
   */
  subscribeOnce(topic: string, fn: EventBusListener): () => boolean;
  subscribeOnce<TContext>(
    topic: string,
    fn: EventBusListener<NoInfer<TContext>>,
    context: TContext,
  ): () => boolean;
  subscribeOnce<TContext>(
    topic: string,
    fn: EventBusListener<NoInfer<TContext>>,
    context?: TContext,
  ): () => boolean {
    if (this._disposed) return () => false;

    let called = false;

    const wrapper = (...args: unknown[]) => {
      if (called) return;
      called = true;

      unsub(); // unsubscribe before running
      Reflect.apply(fn, context, args);
    };

    const unsub =
      context === undefined
        ? this.subscribe(topic, wrapper)
        : this.subscribe(topic, wrapper, context);

    return unsub;
  }

  /**
   * Unsubscribe a specific function from a topic.
   * Matches by function reference and optional context.
   * @param topic - The topic to unsubscribe from.
   * @param fn - The listener function.
   * @returns True if the listener was found and removed.
   */
  unsubscribe(topic: string, fn: EventBusListener): boolean;
  unsubscribe<TContext>(
    topic: string,
    fn: EventBusListener<NoInfer<TContext>>,
    context: TContext,
  ): boolean;
  unsubscribe<TContext>(
    topic: string,
    fn: EventBusListener<NoInfer<TContext>>,
    context?: TContext,
  ): boolean {
    return this._unsubscribe(topic, fn, context);
  }

  private _unsubscribe<TContext>(
    topic: string,
    fn: EventBusListener<TContext>,
    context?: TContext,
  ): boolean {
    if (this._disposed) return false;

    const listeners = this._topics[topic];

    if (!listeners || listeners.length === 0) return false;

    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];

      if (l._fn === fn && l._context === context) {
        l._active = false;
        listeners.splice(i, 1);

        return true;
      }
    }

    return false;
  }

  /**
   * Get the number of subscribers for a topic.
   *
   * This is the public diagnostic surface for `$eventBus`. It reports active
   * registered listeners only; topic listings, leak reports, and reactive
   * diagnostics are intentionally not exposed.
   *
   * @param topic - Topic name to inspect.
   * @returns The number of currently registered listeners.
   */
  getCount(topic: string): number {
    const listeners = this._topics[topic];

    return listeners ? listeners.length : 0;
  }

  /**
   * Publish a value to a topic asynchronously.
   *
   * All listeners are invoked in the order they were added.
   * Delivery is scheduled with `queueMicrotask`. Scope-owned listeners are
   * skipped if their scope is destroyed before the queued delivery runs.
   *
   * @param topic - The topic to publish.
   * @param args - Arguments to pass to listeners.
   * @returns True if any listeners exist for this topic.
   */
  publish(topic: string, ...args: unknown[]): boolean {
    if (this._disposed) return false;

    const listeners = this._topics[topic];

    if (!listeners || listeners.length === 0) return false;

    // snapshot to prevent modifications during publish from affecting this call
    const snapshot = listeners.slice();

    queueMicrotask(() => {
      void this._deliverSnapshot(topic, args, snapshot);
    });

    return true;
  }

  /** @internal */
  private async _deliverSnapshot(
    topic: string,
    args: unknown[],
    snapshot: ListenerEntry[],
  ): Promise<void> {
    for (
      let listenerIndex = 0;
      listenerIndex < snapshot.length;
      listenerIndex++
    ) {
      const entry = snapshot[listenerIndex];
      const { _fn: fn, _context: context } = entry;
      const targetAlive =
        !entry._scopeLifecycleContext ||
        (entry._active && !isDestroyedScopeLifecycleContext(context));

      if (!targetAlive) {
        continue;
      }

      if (entry._scopeLifecycleContext) {
        const state = this._scopeRetentionStates.get(
          context as ScopeLifecycleContext,
        );

        if (state?._paused) {
          this._queuePausedScopeDelivery(topic, args, listenerIndex, entry);

          continue;
        }
      }

      let decision: EventDeliveryPolicyDecision | EventDeliveryDecisionType;

      try {
        decision = await this._deliveryPolicy({
          operation: "event.delivery",
          topic,
          args,
          listenerIndex,
          scopeOwned: entry._scopeLifecycleContext,
          targetAlive,
        });
      } catch (err) {
        this._exceptionHandler(err);

        continue;
      }

      const decisionType: string =
        typeof decision === "string" ? decision : decision.type;

      if (decisionType === "drop") {
        continue;
      }

      if (decisionType !== "deliver") {
        this._exceptionHandler(
          new Error(
            `Unsupported event delivery policy decision: ${decisionType}`,
          ),
        );

        continue;
      }

      try {
        fn.apply(context, args);
      } catch (err) {
        this._exceptionHandler(err);
      }
    }
  }

  private _queuePausedScopeDelivery(
    topic: string,
    args: unknown[],
    listenerIndex: number,
    entry: ListenerEntry,
  ): void {
    if (!entry._scopeLifecycleContext) return;

    const scopeState = this._scopeRetentionStates.get(
      entry._context as ScopeLifecycleContext,
    );

    if (!scopeState) return;

    scopeState._pending.push({
      _topic: topic,
      _args: args,
      _listenerIndex: listenerIndex,
      _entry: entry,
    });

    this._flushScopeDeliveryQueue(scopeState);
  }

  private _flushScopeDeliveryQueue(state: ScopeEventBusRetentionState): void {
    if (state._flushing || state._paused || state._pending.length === 0) {
      return;
    }

    state._flushing = true;

    queueMicrotask(() => {
      void this._drainScopeDeliveryQueue(state);
    });
  }

  private async _drainScopeDeliveryQueue(
    state: ScopeEventBusRetentionState,
  ): Promise<void> {
    if (state._paused) {
      state._flushing = false;

      return;
    }

    const deliveries = state._pending;
    state._pending = [];
    state._flushing = false;

    for (let i = 0; i < deliveries.length; i++) {
      const delivery = deliveries[i];
      await this._deliverSnapshot(delivery._topic, delivery._args, [
        delivery._entry,
      ]);
    }
  }

  private _getScopeRetentionState(
    scope: ScopeLifecycleContext,
  ): ScopeEventBusRetentionState {
    let state = this._scopeRetentionStates.get(scope);

    if (state) return state;

    let nextState!: ScopeEventBusRetentionState;

    const deregisterPause = scope.$on("$viewRetentionPause", (...args) => {
      if (!shouldHandleViewRetentionPause(args, "schedulers")) {
        return;
      }

      nextState._paused = true;
    });

    const deregisterResume = scope.$on("$viewRetentionResume", (...args) => {
      if (!shouldHandleViewRetentionPause(args, "schedulers")) {
        return;
      }

      if (!nextState._paused) return;

      nextState._paused = false;
      this._flushScopeDeliveryQueue(nextState);
    });

    const deregisterDestroy = scope.$on("$destroy", () => {
      nextState._pending = [];
      nextState._deregisterPause();
      nextState._deregisterResume();
      nextState._deregisterDestroy();
      this._scopeRetentionStates.delete(scope);
    });

    state = nextState = {
      _paused: false,
      _pending: [],
      _flushing: false,
      _deregisterPause: deregisterPause,
      _deregisterResume: deregisterResume,
      _deregisterDestroy: deregisterDestroy,
    };

    this._scopeRetentionStates.set(scope, state);

    return state;
  }
}

const defaultEventDeliveryPolicy: EventDeliveryPolicy = () => "deliver";

/** @internal */
export interface EventBusRuntimeState {
  deliveryPolicy?: EventDeliveryPolicy;
  service?: EventBus;
  ownsService: boolean;
  destroyed: boolean;
}

/** @internal */
export function createEventBusRuntimeState(): EventBusRuntimeState {
  return {
    ownsService: false,
    destroyed: false,
  };
}

/** @internal */
export function applyEventBusConfiguration(
  state: EventBusRuntimeState,
  config: EventBusConfig,
): void {
  if (state.destroyed) {
    throw new Error("EventBus runtime has already been disposed.");
  }

  state.deliveryPolicy = config.deliveryPolicy;
  state.service?.setDeliveryPolicy(config.deliveryPolicy);
}

/** @internal */
export function createEventBusService(
  state: EventBusRuntimeState,
  exceptionHandler: ng.ExceptionHandlerService,
  existing?: EventBus,
): EventBus {
  if (state.destroyed) {
    throw new Error("EventBus runtime has already been disposed.");
  }

  if (state.service) return state.service;

  const service = existing ?? new EventBus(exceptionHandler);

  state.service = service;
  state.ownsService = !existing;
  service.setDeliveryPolicy(state.deliveryPolicy);

  return service;
}

/** @internal */
export function destroyEventBusRuntimeState(state: EventBusRuntimeState): void {
  if (state.destroyed) return;

  state.destroyed = true;

  if (state.ownsService) state.service?.dispose();

  state.service = undefined;
  state.ownsService = false;
}
