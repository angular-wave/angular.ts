import { nullObject, shouldHandleViewRetentionPause, isProxy } from '../../shared/utils.js';
import { normalizePolicyDecision } from '../../core/policy/policy.js';

function isScopeLifecycleContext(value) {
    return isProxy(value) && typeof value.$on === "function";
}
function isDestroyedScopeLifecycleContext(value) {
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
class EventBus {
    /**
     * Create a publish/subscribe event bus.
     *
     * Applications usually receive the singleton instance by injecting
     * `$eventBus` instead of constructing this class directly.
     *
     * @param $exceptionHandler - Handler invoked when a subscriber throws.
     */
    constructor($exceptionHandler, deliveryPolicy = defaultEventDeliveryPolicy) {
        /** @internal */
        this._scopeRetentionStates = new WeakMap();
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
    reset() {
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
    setDeliveryPolicy(policy) {
        this._deliveryPolicy = policy ?? defaultEventDeliveryPolicy;
    }
    /**
     * Checks if instance has been disposed.
     * @returns True if disposed.
     */
    isDisposed() {
        return this._disposed;
    }
    /**
     * Dispose the instance, removing all topics and listeners.
     */
    dispose() {
        if (this._disposed)
            return;
        this._disposed = true;
        this._topics = nullObject();
    }
    subscribe(topic, fn, context) {
        if (this._disposed)
            return () => false;
        let listeners = this._topics[topic];
        if (!listeners)
            this._topics[topic] = listeners = [];
        const scopeLifecycleContext = isScopeLifecycleContext(context);
        const entry = {
            _fn: fn,
            _context: context,
            _active: true,
            _scopeLifecycleContext: scopeLifecycleContext,
        };
        listeners.push(entry);
        const unsubscribe = () => this._unsubscribe(topic, fn, context);
        if (!scopeLifecycleContext) {
            return unsubscribe;
        }
        this._getScopeRetentionState(context);
        let removeDestroyListener = context.$on("$destroy", () => {
            cleanup();
        });
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
    subscribeOnce(topic, fn, context) {
        if (this._disposed)
            return () => false;
        let called = false;
        const wrapper = (...args) => {
            if (called)
                return;
            called = true;
            unsub(); // unsubscribe before running
            Reflect.apply(fn, context, args);
        };
        const unsub = context === undefined
            ? this.subscribe(topic, wrapper)
            : this.subscribe(topic, wrapper, context);
        return unsub;
    }
    unsubscribe(topic, fn, context) {
        return this._unsubscribe(topic, fn, context);
    }
    _unsubscribe(topic, fn, context) {
        if (this._disposed)
            return false;
        const listeners = this._topics[topic];
        if (!listeners || listeners.length === 0)
            return false;
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
    getCount(topic) {
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
    publish(topic, ...args) {
        if (this._disposed)
            return false;
        const listeners = this._topics[topic];
        if (!listeners || listeners.length === 0)
            return false;
        // snapshot to prevent modifications during publish from affecting this call
        const snapshot = listeners.slice();
        queueMicrotask(() => {
            void this._deliverSnapshot(topic, args, snapshot);
        });
        return true;
    }
    /** @internal */
    async _deliverSnapshot(topic, args, snapshot) {
        for (let listenerIndex = 0; listenerIndex < snapshot.length; listenerIndex++) {
            const entry = snapshot[listenerIndex];
            const { _fn: fn, _context: context } = entry;
            const targetAlive = !entry._scopeLifecycleContext ||
                (entry._active && !isDestroyedScopeLifecycleContext(context));
            if (!targetAlive) {
                continue;
            }
            if (entry._scopeLifecycleContext) {
                const state = this._scopeRetentionStates.get(context);
                if (state?._paused) {
                    this._queuePausedScopeDelivery(topic, args, listenerIndex, entry);
                    continue;
                }
            }
            let decisionType;
            try {
                const decision = await this._deliveryPolicy({
                    operation: "event.delivery",
                    topic,
                    args,
                    listenerIndex,
                    scopeOwned: entry._scopeLifecycleContext,
                    targetAlive,
                });
                decisionType = normalizePolicyDecision(decision).type;
            }
            catch (err) {
                this._exceptionHandler(err);
                continue;
            }
            if (decisionType === "drop") {
                continue;
            }
            if (decisionType !== "deliver") {
                this._exceptionHandler(new Error(`Unsupported event delivery policy decision: ${decisionType}`));
                continue;
            }
            try {
                fn.apply(context, args);
            }
            catch (err) {
                this._exceptionHandler(err);
            }
        }
    }
    _queuePausedScopeDelivery(topic, args, listenerIndex, entry) {
        if (!entry._scopeLifecycleContext)
            return;
        const scopeState = this._scopeRetentionStates.get(entry._context);
        if (!scopeState)
            return;
        scopeState._pending.push({
            _topic: topic,
            _args: args,
            _listenerIndex: listenerIndex,
            _entry: entry,
        });
        this._flushScopeDeliveryQueue(scopeState);
    }
    _flushScopeDeliveryQueue(state) {
        if (state._flushing || state._paused || state._pending.length === 0) {
            return;
        }
        state._flushing = true;
        queueMicrotask(() => {
            void this._drainScopeDeliveryQueue(state);
        });
    }
    async _drainScopeDeliveryQueue(state) {
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
    _getScopeRetentionState(scope) {
        let state = this._scopeRetentionStates.get(scope);
        if (state)
            return state;
        let nextState;
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
            if (!nextState._paused)
                return;
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
const defaultEventDeliveryPolicy = () => "deliver";
/** @internal */
function createEventBusRuntimeState() {
    return {
        ownsService: false,
        destroyed: false,
    };
}
/** @internal */
function applyEventBusConfiguration(state, config) {
    if (state.destroyed) {
        throw new Error("EventBus runtime has already been disposed.");
    }
    state.deliveryPolicy = config.deliveryPolicy;
    state.service?.setDeliveryPolicy(config.deliveryPolicy);
}
/** @internal */
function createEventBusService(state, exceptionHandler, existing) {
    if (state.destroyed) {
        throw new Error("EventBus runtime has already been disposed.");
    }
    if (state.service)
        return state.service;
    const service = existing ?? new EventBus(exceptionHandler);
    state.service = service;
    state.ownsService = !existing;
    service.setDeliveryPolicy(state.deliveryPolicy);
    return service;
}
/** @internal */
function destroyEventBusRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    if (state.ownsService)
        state.service?.dispose();
    state.service = undefined;
    state.ownsService = false;
}

export { EventBus, applyEventBusConfiguration, createEventBusRuntimeState, createEventBusService, destroyEventBusRuntimeState };
