import { $injectTokens, provider } from "../../injection-tokens.js";

/**
 * Configurable provider for an injectable event bus
 * @extends {ng.ServiceProvider}
 */
export class PubSubProvider {
  static $inject = provider([
    $injectTokens._exceptionHandler,
    $injectTokens._angular,
  ]);

  /**
   * @param {ng.ExceptionHandlerProvider} $exceptionHandler
   * @param {ng.ServiceProvider} angularProvider
   */
  constructor($exceptionHandler, angularProvider) {
    /**
     * @type {PubSub}
     */
    this.eventBus = new PubSub($exceptionHandler.handler);
    /** @type {ng.Angular} */ (angularProvider.$get()).$eventBus =
      this.eventBus;
  }

  $get = () => this.eventBus;
}

export class PubSub {
  /**
   * @param {ng.ExceptionHandlerService} $exceptionHandler
   */
  constructor($exceptionHandler) {
    /** @private {Object<string, Array<{fn: Function, context: any}>>} */
    this._topics = Object.create(null);

    /** @private */
    this._disposed = false;

    /** @public @type {ng.ExceptionHandlerService} */
    this.$exceptionHandler = $exceptionHandler;
  }

  /**
   * Set instance to initial state
   */
  reset() {
    /** @private {Object<string, Array<{fn: Function, context: any}>>} */
    this._topics = Object.create(null);

    /** @private */
    this._disposed = false;
  }

  /**
   * Checks if instance has been disposed.
   * @returns {boolean} True if disposed.
   */
  isDisposed() {
    return this._disposed;
  }

  /**
   * Dispose the instance, removing all topics and listeners.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._topics = Object.create(null);
  }

  /**
   * Subscribe a function to a topic.
   * @param {string} topic - The topic to subscribe to.
   * @param {Function} fn - The callback function to invoke when published.
   * @param {*} [context] - Optional `this` context for the callback.
   * @returns {() => boolean} A function that unsubscribes this listener.
   */
  subscribe(topic, fn, context = undefined) {
    if (this._disposed) return () => false;

    /** @type {Array<{fn: Function, context: any}>} */
    let listeners = this._topics[topic];

    if (!listeners) this._topics[topic] = listeners = [];

    const entry = { fn, context };

    listeners.push(entry);

    return () => this.unsubscribe(topic, fn, context);
  }

  /**
   * Subscribe a function to a topic only once.
   * Listener is removed before the first invocation.
   * @param {string} topic - The topic to subscribe to.
   * @param {Function} fn - The callback function.
   * @param {*} [context] - Optional `this` context for the callback.
   * @returns {() => boolean} A function that unsubscribes this listener.
   */
  subscribeOnce(topic, fn, context = undefined) {
    if (this._disposed) return () => false;

    let called = false;

    const wrapper = (/** @type {any[]} */ ...args) => {
      if (called) return;
      called = true;

      unsub(); // unsubscribe before running
      fn.apply(context, args);
    };

    const unsub = this.subscribe(topic, wrapper);

    return unsub;
  }

  /**
   * Unsubscribe a specific function from a topic.
   * Matches by function reference and optional context.
   * @param {string} topic - The topic to unsubscribe from.
   * @param {Function} fn - The listener function.
   * @param {*} [context] - Optional `this` context.
   * @returns {boolean} True if the listener was found and removed.
   */
  unsubscribe(topic, fn, context = undefined) {
    if (this._disposed) return false;

    const listeners = this._topics[topic];

    if (!listeners || listeners.length === 0) return false;

    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];

      if (l.fn === fn && l.context === context) {
        listeners.splice(i, 1);

        return true;
      }
    }

    return false;
  }

  /**
   * Get the number of subscribers for a topic.
   * @param {string} topic
   * @returns {number}
   */
  getCount(topic) {
    const listeners = this._topics[topic];

    return listeners ? listeners.length : 0;
  }

  /**
   * Publish a value to a topic asynchronously.
   * All listeners are invoked in the order they were added.
   * @param {string} topic - The topic to publish.
   * @param {...*} args - Arguments to pass to listeners.
   * @returns {boolean} True if any listeners exist for this topic.
   */
  publish(topic, ...args) {
    if (this._disposed) return false;

    const listeners = this._topics[topic];

    if (!listeners || listeners.length === 0) return false;

    // snapshot to prevent modifications during publish from affecting this call
    const snapshot = listeners.slice();

    queueMicrotask(() => {
      for (const { fn, context } of snapshot) {
        try {
          fn.apply(context, args);
        } catch (err) {
          this.$exceptionHandler(err);
        }
      }
    });

    return true;
  }
}
