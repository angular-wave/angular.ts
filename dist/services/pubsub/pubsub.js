import { _exceptionHandlerProvider, _angularProvider } from '../../injection-tokens.js';
import { nullObject } from '../../shared/utils.js';

let eventBusInstance;
/**
 * Configurable provider for the application-wide {@link PubSub} event bus.
 *
 * The provider creates the singleton `$eventBus` service and also exposes it on
 * the global Angular service for integrations that publish from outside
 * dependency injection.
 */
class PubSubProvider {
    constructor($exceptionHandler, angularProvider) {
        this.$get = () => this.eventBus;
        this.eventBus = eventBusInstance =
            eventBusInstance || new PubSub($exceptionHandler.handler);
        angularProvider.$get().$eventBus = this.eventBus;
    }
}
PubSubProvider.$inject = [_exceptionHandlerProvider, _angularProvider];
/**
 * Creates a small domain-specific facade around the application event bus.
 *
 * `createTopicService(eventBus, "tasks").publish("saved", task)` maps to
 * `$eventBus.publish("tasks:saved", task)`.
 */
function createTopicService(eventBus, topic) {
    const eventName = (event) => (event ? `${topic}:${event}` : topic);
    return {
        topic,
        publish(event, ...args) {
            return eventBus.publish(eventName(event), ...args);
        },
        subscribe(event, fn, context) {
            return eventBus.subscribe(eventName(event), fn, context);
        },
        subscribeOnce(event, fn, context) {
            return eventBus.subscribeOnce(eventName(event), fn, context);
        },
        getCount(event) {
            return eventBus.getCount(eventName(event));
        },
    };
}
class PubSub {
    /**
     * Create a publish/subscribe event bus.
     *
     * Applications usually receive the singleton instance by injecting
     * `$eventBus` instead of constructing this class directly.
     *
     * @param $exceptionHandler - Handler invoked when a subscriber throws.
     */
    constructor($exceptionHandler) {
        this._topics = nullObject();
        this._disposed = false;
        this._exceptionHandler = $exceptionHandler;
    }
    /**
     * Reset the bus to its initial state without disposing it.
     *
     * All topics and listeners are removed, and the instance can be reused.
     */
    reset() {
        this._topics = nullObject();
        this._disposed = false;
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
    /**
     * Subscribe a function to a topic.
     *
     * The returned function removes only this listener registration.
     *
     * @param topic - The topic to subscribe to.
     * @param fn - The callback function to invoke when published.
     * @param [context] - Optional `this` context for the callback.
     * @returns A function that unsubscribes this listener.
     */
    subscribe(topic, fn, context) {
        if (this._disposed)
            return () => false;
        let listeners = this._topics[topic];
        if (!listeners)
            this._topics[topic] = listeners = [];
        const entry = { _fn: fn, _context: context };
        listeners.push(entry);
        return () => this.unsubscribe(topic, fn, context);
    }
    /**
     * Subscribe a function to a topic only once.
     *
     * Listener is removed before the first invocation.
     *
     * @param topic - The topic to subscribe to.
     * @param fn - The callback function.
     * @param [context] - Optional `this` context for the callback.
     * @returns A function that unsubscribes this listener.
     */
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
        const unsub = this.subscribe(topic, wrapper);
        return unsub;
    }
    /**
     * Unsubscribe a specific function from a topic.
     * Matches by function reference and optional context.
     * @param topic - The topic to unsubscribe from.
     * @param fn - The listener function.
     * @param [context] - Optional `this` context.
     * @returns True if the listener was found and removed.
     */
    unsubscribe(topic, fn, context) {
        if (this._disposed)
            return false;
        const listeners = this._topics[topic];
        if (!listeners || listeners.length === 0)
            return false;
        for (let i = 0; i < listeners.length; i++) {
            const l = listeners[i];
            if (l._fn === fn && l._context === context) {
                listeners.splice(i, 1);
                return true;
            }
        }
        return false;
    }
    /**
     * Get the number of subscribers for a topic.
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
     * Delivery is scheduled with `queueMicrotask`.
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
            for (const { _fn: fn, _context: context } of snapshot) {
                try {
                    fn.apply(context, args);
                }
                catch (err) {
                    this._exceptionHandler(err);
                }
            }
        });
        return true;
    }
}

export { PubSub, PubSubProvider, createTopicService };
