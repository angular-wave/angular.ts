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
  /**
   * @returns {PubSub}
   */
  $get: () => PubSub;
}
export class PubSub {
  /**
   * Runs a function asynchronously.
   *
   * @private
   * @param {Function} fn Function to run.
   * @param {Object} context Context in which to run the function.
   * @param {Array} args Arguments to pass to the function.
   */
  private static runAsync_;
  /**
   * Topic-based publish/subscribe channel.  Maintains a map of topics to
   * subscriptions.  When a message is published to a topic, all functions
   * subscribed to that topic are invoked in the order they were added.
   * Uncaught errors abort publishing.
   *
   * Topics may be identified by any nonempty string, <strong>except</strong>
   * strings corresponding to native Object properties, e.g. "constructor",
   * "toString", "hasOwnProperty", etc.
   *
   * @param {boolean=} async Enable asynchronous behavior.  Recommended for
   *     new code.  See notes on the publish() method.
   */
  constructor(async?: boolean | undefined);
  disposed: boolean;
  /**
   * The next available subscription key.  Internally, this is an index into the
   * sparse array of subscriptions.
   *
   * @private {number}
   */
  private key;
  /**
   * Array of subscription keys pending removal once publishing is done.
   *
   * @private {!Array<number>}
   * @const
   */
  private pendingKeys;
  /**
   * Lock to prevent the removal of subscriptions during publishing. Incremented
   * at the beginning of {@link #publish}, and decremented at the end.
   *
   * @private {number}
   */
  private publishDepth;
  /**
   * Sparse array of subscriptions. Each subscription is represented by a tuple
   * comprising a topic identifier, a function, and an optional context object.
   * Each tuple occupies three consecutive positions in the array, with the
   * topic identifier at index n, the function at index (n + 1), the context
   * object at index (n + 2), the next topic at index (n + 3), etc. (This
   * representation minimizes the number of object allocations and has been
   * shown to be faster than an array of objects with three key-value pairs or
   * three parallel arrays, especially on IE.) Once a subscription is removed
   * via {@link unsubscribe} or {@link unsubscribeByKey}, the three
   * corresponding array elements are deleted, and never reused. This means the
   * total number of subscriptions during the lifetime of the pubsub channel is
   * limited by the maximum length of a JavaScript array to (2^32 - 1) / 3 =
   * 1,431,655,765 subscriptions, which should suffice for most applications.
   *
   * @private {!Array<?>}
   * @const
   */
  private subscriptions;
  /**
   * Map of topics to arrays of subscription keys.
   *
   * @private {!Object<!Array<number>>}
   */
  private topics;
  /**
   * @private @const {boolean}
   */
  private async_;
  /**
   * Subscribes a function to a topic.  The function is invoked as a method on
   * the given `opt_context` object, or in the global scope if no context
   * is specified.  Subscribing the same function to the same topic multiple
   * times will result in multiple function invocations while publishing.
   * Returns a subscription key that can be used to unsubscribe the function from
   * the topic via {@link unsubscribeByKey}.
   *
   * @param {string} topic Topic to subscribe to.
   * @param {Function} fn Function to be invoked when a message is published to
   *     the given topic.
   * @param {Object=} opt_context Object in whose context the function is to be
   *     called (the global scope if none).
   * @return {number} Subscription key.
   */
  subscribe(topic: string, fn: Function, opt_context?: any | undefined): number;
  /**
   * Subscribes a single-use function to a topic.  The function is invoked as a
   * method on the given `opt_context` object, or in the global scope if
   * no context is specified, and is then unsubscribed.  Returns a subscription
   * key that can be used to unsubscribe the function from the topic via
   * {@link unsubscribeByKey}.
   *
   * @param {string} topic Topic to subscribe to.
   * @param {Function} fn Function to be invoked once and then unsubscribed when
   *     a message is published to the given topic.
   * @param {Object=} opt_context Object in whose context the function is to be
   *     called (the global scope if none).
   * @return {number} Subscription key.
   */
  subscribeOnce(
    topic: string,
    fn: Function,
    opt_context?: any | undefined,
  ): number;
  /**
   * Unsubscribes a function from a topic.  Only deletes the first match found.
   * Returns a Boolean indicating whether a subscription was removed.
   *
   * @param {string} topic Topic to unsubscribe from.
   * @param {Function} fn Function to unsubscribe.
   * @param {Object=} opt_context Object in whose context the function was to be
   *     called (the global scope if none).
   * @return {boolean} Whether a matching subscription was removed.
   */
  unsubscribe(
    topic: string,
    fn: Function,
    opt_context?: any | undefined,
  ): boolean;
  /**
   * Removes a subscription based on the key returned by {@link subscribe}.
   * No-op if no matching subscription is found.  Returns a Boolean indicating
   * whether a subscription was removed.
   *
   * @param {number} key Subscription key.
   * @return {boolean} Whether a matching subscription was removed.
   */
  unsubscribeByKey(key: number): boolean;
  /**
   * Publishes a message to a topic.  Calls functions subscribed to the topic in
   * the order in which they were added, passing all arguments along.
   *
   * If this object was created with async=true, subscribed functions are called
   * via Promise.resolve().  Otherwise, the functions are called directly, and if
   * any of them throw an uncaught error, publishing is aborted.
   *
   * @param {string} topic Topic to publish to.
   * @param {...*} var_args Arguments that are applied to each subscription
   *     function.
   * @return {boolean} Whether any subscriptions were called.
   */
  publish(topic: string, ...var_args: any[]): boolean;
  /**
   * Clears the subscription list for a topic, or all topics if unspecified.
   * @param {string=} opt_topic Topic to clear (all topics if unspecified).
   */
  clear(opt_topic?: string | undefined): void;
  /**
   * Returns the number of subscriptions to the given topic (or all topics if
   * unspecified). This number will not change while publishing any messages.
   * @param {string=} opt_topic The topic (all topics if unspecified).
   * @return {number} Number of subscriptions to the topic.
   */
  getCount(opt_topic?: string | undefined): number;
  isDisposed(): boolean;
  dispose(): void;
}
export const EventBus: PubSub;
/**
 * /**
 * Configurable provider for an injectable event bus
 */
export type ServiceProvider = import("../../interface.ts").ServiceProvider;
