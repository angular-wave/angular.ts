/** @typedef {import('../../interface.ts').ServiceProvider} ServiceProvider

/**
 * Configurable provider for an injectable event bus
 * @extends {ServiceProvider}
 */
export class PubSubProvider {
  constructor() {
    /**
     * @type {PubSub}
     */
    this.eventBus = EventBus;
  }

  /**
   * @returns {PubSub}
   */
  $get = () => this.eventBus;
}

export class PubSub {
  static $nonscope;
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
  constructor(async = false) {
    this.disposed = false;

    /**
     * The next available subscription key.  Internally, this is an index into the
     * sparse array of subscriptions.
     *
     * @private {number}
     */
    this.key = 1;

    /**
     * Array of subscription keys pending removal once publishing is done.
     *
     * @private {!Array<number>}
     * @const
     */
    this.pendingKeys = [];

    /**
     * Lock to prevent the removal of subscriptions during publishing. Incremented
     * at the beginning of {@link #publish}, and decremented at the end.
     *
     * @private {number}
     */
    this.publishDepth = 0;

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
    this.subscriptions = [];

    /**
     * Map of topics to arrays of subscription keys.
     *
     * @private {!Object<!Array<number>>}
     */
    this.topics = {};

    /**
     * @private @const {boolean}
     */
    this.async_ = Boolean(async);
  }

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
  subscribe(topic, fn, opt_context = null) {
    let keys = this.topics[topic];

    if (!keys) {
      // First subscription to this topic; initialize subscription key array.
      keys = this.topics[topic] = [];
    }

    // Push the tuple representing the subscription onto the subscription array.
    const { key } = this;

    this.subscriptions[key] = topic;
    this.subscriptions[key + 1] = fn;
    this.subscriptions[key + 2] = opt_context;
    this.key = key + 3;

    // Push the subscription key onto the list of subscriptions for the topic.
    keys.push(key);

    // Return the subscription key.
    return key;
  }

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
  subscribeOnce(topic, fn, opt_context = null) {
    let called = false;

    // Behold the power of lexical closures!
    const key = this.subscribe(
      topic,
      (...args) => {
        if (!called) {
          called = true;

          // Unsubscribe before calling function so the function is unsubscribed
          // even if it throws an exception.
          this.unsubscribeByKey(key);

          fn.apply(opt_context, args);
        }
      },
      this,
    );

    return key;
  }

  /**
   * Runs a function asynchronously.
   *
   * @private
   * @param {Function} fn Function to run.
   * @param {Object} context Context in which to run the function.
   * @param {Array} args Arguments to pass to the function.
   */
  static runAsync_(fn, context, args) {
    queueMicrotask(() => {
      fn.apply(context, args);
    });
  }

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
  unsubscribe(topic, fn, opt_context = null) {
    const keys = this.topics[topic];

    if (keys) {
      const { subscriptions } = this;

      const key = keys.find(
        (k) =>
          subscriptions[k + 1] === fn && subscriptions[k + 2] === opt_context,
      );

      if (key !== undefined) {
        return this.unsubscribeByKey(key);
      }
    }

    return false;
  }

  /**
   * Removes a subscription based on the key returned by {@link subscribe}.
   * No-op if no matching subscription is found.  Returns a Boolean indicating
   * whether a subscription was removed.
   *
   * @param {number} key Subscription key.
   * @return {boolean} Whether a matching subscription was removed.
   */
  unsubscribeByKey(key) {
    const topic = this.subscriptions[key];

    if (topic) {
      const keys = this.topics[topic];

      if (this.publishDepth !== 0) {
        // Defer removal until after publishing is complete, but replace the
        // function with a no-op so it isn't called.
        this.pendingKeys.push(key);
        this.subscriptions[key + 1] = () => {};
      } else {
        if (keys) {
          this.topics[topic] = keys.filter((k) => k !== key);
        }
        delete this.subscriptions[key];
        delete this.subscriptions[key + 1];
        delete this.subscriptions[key + 2];
      }
    }

    return !!topic;
  }

  /**
   * Publishes a message to a topic.  Calls functions subscribed to the topic in
   * the order in which they were added, passing all arguments along.
   *
   * If this object was created with async=true, subscribed functions are called
   * via `queueMicrotask`.  Otherwise, the functions are called directly, and if
   * any of them throw an uncaught error, publishing is aborted.
   *
   * @param {string} topic Topic to publish to.
   * @param {...*} var_args Arguments that are applied to each subscription
   *     function.
   * @return {boolean} Whether any subscriptions were called.
   */
  publish(topic, ...var_args) {
    const keys = this.topics[topic];

    if (keys) {
      const args = var_args;

      if (this.async_) {
        // For each key in the list of subscription keys for the topic, schedule
        // the function to be applied to the arguments in the appropriate context.
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];

          PubSub.runAsync_(
            this.subscriptions[key + 1],
            this.subscriptions[key + 2],
            args,
          );
        }
      } else {
        this.publishDepth++;

        try {
          for (
            let i = 0, len = keys.length;
            i < len && !this.isDisposed();
            i++
          ) {
            const key = keys[i];

            this.subscriptions[key + 1].apply(
              this.subscriptions[key + 2],
              args,
            );
          }
        } finally {
          this.publishDepth--;

          if (this.pendingKeys.length > 0 && this.publishDepth === 0) {
            let pendingKey;

            while ((pendingKey = this.pendingKeys.pop())) {
              this.unsubscribeByKey(pendingKey);
            }
          }
        }
      }

      return true;
    }

    return false;
  }

  /**
   * Clears the subscription list for a topic, or all topics if unspecified.
   * @param {string=} opt_topic Topic to clear (all topics if unspecified).
   */
  clear(opt_topic) {
    if (opt_topic) {
      const keys = this.topics[opt_topic];

      if (keys) {
        keys.forEach(this.unsubscribeByKey, this);
        delete this.topics[opt_topic];
      }
    } else {
      this.subscriptions.length = 0;
      this.topics = {};
    }
  }

  /**
   * Returns the number of subscriptions to the given topic (or all topics if
   * unspecified). This number will not change while publishing any messages.
   * @param {string=} opt_topic The topic (all topics if unspecified).
   * @return {number} Number of subscriptions to the topic.
   */
  getCount(opt_topic) {
    if (opt_topic) {
      const keys = this.topics[opt_topic];

      return keys ? keys.length : 0;
    }

    let count = 0;

    for (const topic in this.topics) {
      count += this.getCount(topic);
    }

    return count;
  }

  isDisposed() {
    return this.disposed;
  }

  dispose() {
    this.clear();
    this.pendingKeys.length = 0;
    this.disposed = true;
  }
}

export const EventBus = new PubSub(true);
