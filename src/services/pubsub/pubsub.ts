import { $injectTokens } from "../../injection-tokens.ts";
import { nullObject } from "../../shared/utils.ts";

type ListenerEntry = { fn: Function; context: any };
let eventBusInstance: PubSub | undefined;

/**
 * Configurable provider for an injectable event bus
 * @extends {ng.ServiceProvider}
 */
export class PubSubProvider {
  static $inject = [
    $injectTokens._exceptionHandlerProvider,
    $injectTokens._angularProvider,
  ];

  /**
   * @param {ng.ExceptionHandlerProvider} $exceptionHandler
   * @param {ng.AngularServiceProvider} angularProvider
   */
  eventBus: PubSub;

  constructor(
    $exceptionHandler: ng.ExceptionHandlerProvider,
    angularProvider: ng.AngularServiceProvider,
  ) {
    this.eventBus = eventBusInstance =
      eventBusInstance || new PubSub($exceptionHandler.handler);
    angularProvider.$get().$eventBus = this.eventBus;
  }

  $get = () => this.eventBus;
}

export class PubSub {
  private _topics: Record<string, ListenerEntry[]>;
  private _disposed: boolean;
  public $exceptionHandler: ng.ExceptionHandlerService;

  /**
   * @param {ng.ExceptionHandlerService} $exceptionHandler
   */
  constructor($exceptionHandler: ng.ExceptionHandlerService) {
    this._topics = nullObject() as Record<string, ListenerEntry[]>;
    this._disposed = false;
    this.$exceptionHandler = $exceptionHandler;
  }

  /**
   * Set instance to initial state
   */
  reset(): void {
    this._topics = nullObject() as Record<string, ListenerEntry[]>;
    this._disposed = false;
  }

  /**
   * Checks if instance has been disposed.
   * @returns {boolean} True if disposed.
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
   * @param {string} topic - The topic to subscribe to.
   * @param {Function} fn - The callback function to invoke when published.
   * @param {*} [context] - Optional `this` context for the callback.
   * @returns {() => boolean} A function that unsubscribes this listener.
   */
  subscribe(
    topic: string,
    fn: Function,
    context: any = undefined,
  ): () => boolean {
    if (this._disposed) return () => false;
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
  subscribeOnce(
    topic: string,
    fn: Function,
    context: any = undefined,
  ): () => boolean {
    if (this._disposed) return () => false;

    let called = false;

    const wrapper = (...args: any[]) => {
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
  unsubscribe(topic: string, fn: Function, context: any = undefined): boolean {
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
  getCount(topic: string): number {
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
  publish(topic: string, ...args: any[]): boolean {
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
