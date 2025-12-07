/** @typedef {import('../../interface.ts').ServiceProvider} ServiceProvider

/**
 * Configurable provider for an injectable event bus
 * @extends {ServiceProvider}
 */
export class PubSubProvider {
  /**
   * @type {PubSub}
   */
  eventBus: PubSub;
  $get: any[];
}
export class PubSub {
  /** @private {Object<string, Array<{fn: Function, context: any}>>} */
  private _topics;
  /** @private */
  private _disposed;
  /** @type {ng.ExceptionHandlerService} */
  _$exceptionHandler: ng.ExceptionHandlerService;
  /**
   * Set instance to initial state
   */
  reset(): void;
  /**
   * Checks if instance has been disposed.
   * @returns {boolean} True if disposed.
   */
  isDisposed(): boolean;
  /**
   * Dispose the instance, removing all topics and listeners.
   */
  dispose(): void;
  /**
   * Subscribe a function to a topic.
   * @param {string} topic - The topic to subscribe to.
   * @param {Function} fn - The callback function to invoke when published.
   * @param {*} [context] - Optional `this` context for the callback.
   * @returns {() => boolean} A function that unsubscribes this listener.
   */
  subscribe(topic: string, fn: Function, context?: any): () => boolean;
  /**
   * Subscribe a function to a topic only once.
   * Listener is removed before the first invocation.
   * @param {string} topic - The topic to subscribe to.
   * @param {Function} fn - The callback function.
   * @param {*} [context] - Optional `this` context for the callback.
   * @returns {() => boolean} A function that unsubscribes this listener.
   */
  subscribeOnce(topic: string, fn: Function, context?: any): () => boolean;
  /**
   * Unsubscribe a specific function from a topic.
   * Matches by function reference and optional context.
   * @param {string} topic - The topic to unsubscribe from.
   * @param {Function} fn - The listener function.
   * @param {*} [context] - Optional `this` context.
   * @returns {boolean} True if the listener was found and removed.
   */
  unsubscribe(topic: string, fn: Function, context?: any): boolean;
  /**
   * Get the number of subscribers for a topic.
   * @param {string} topic
   * @returns {number}
   */
  getCount(topic: string): number;
  /**
   * Publish a value to a topic asynchronously.
   * All listeners are invoked in the order they were added.
   * @param {string} topic - The topic to publish.
   * @param {...*} args - Arguments to pass to listeners.
   * @returns {boolean} True if any listeners exist for this topic.
   */
  publish(topic: string, ...args: any[]): boolean;
}
export const EventBus: PubSub;
/**
 * /**
 * Configurable provider for an injectable event bus
 */
export type ServiceProvider = import("../../interface.ts").ServiceProvider;
