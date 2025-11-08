/**
 * Provides a frame-synchronized asynchronous execution queue.
 * Schedules functions to run on the next animation frame (via `requestAnimationFrame`)
 * or in a microtask (via `queueMicrotask`) when the document is hidden.
 */
export class AnimateAsyncRunFactoryProvider {
  constructor() {
    this.$get = () => {
      /**
       * Schedule a callback for the next repaint or microtask if tab is hidden.
       * @param {VoidFunction} fn - The callback to schedule.
       */
      const nextFrame = (fn) => {
        if (document.hidden) queueMicrotask(fn);
        else requestAnimationFrame(fn);
      };

      /**
       * Creates a frame-based batching scheduler.
       * Multiple calls in a single frame will be batched together and flushed once.
       *
       * @returns {Function} A scheduler function that queues callbacks for the next frame.
       */
      return () => {
        let queue = [];
        let scheduled = false;

        const flush = () => {
          const tasks = queue.slice();
          queue.length = 0;
          scheduled = false;
          for (const fn of tasks) fn();
        };

        return (fn) => {
          queue.push(fn);
          if (!scheduled) {
            scheduled = true;
            nextFrame(flush);
          }
        };
      };
    };
  }
}

// Internal runner states
const STATE_INITIAL = 0;
const STATE_PENDING = 1;
const STATE_DONE = 2;

let $$animateAsyncRun;

/**
 * Provides the `AnimateRunner` service used by AngularJS animation subsystems.
 */
export class AnimateRunnerFactoryProvider {
  constructor() {
    this.$get = [
      "$$animateAsyncRun",
      /**
       * @param {Function} animateAsyncRun - Factory for frame-based async scheduling.
       * @returns {typeof AnimateRunner} The AnimateRunner class.
       */
      (animateAsyncRun) => {
        $$animateAsyncRun = animateAsyncRun;
        return AnimateRunner;
      },
    ];
  }
}

/**
 * Represents an asynchronous animation operation, providing both
 * callback-based and promise-based APIs for completion tracking.
 */
export class AnimateRunner {
  /**
   * Run an array of animation runners in sequence.
   * Each runner waits for the previous one to complete.
   *
   * @param {Array<AnimateRunner>} runners - Array of runners to execute in order.
   * @param {Function} callback - Called once all runners complete or one fails.
   */
  static chain(runners, callback) {
    let i = 0;
    const next = (ok = true) => {
      if (!ok || i >= runners.length) {
        callback(ok);
        return;
      }
      runners[i++].done(next);
    };
    next();
  }

  /**
   * Waits for all animation runners to complete before invoking the callback.
   *
   * @param {Array<AnimateRunner>} runners - Array of active runners.
   * @param {Function} callback - Called when all runners complete.
   */
  static all(runners, callback) {
    let remaining = runners.length;
    let status = true;
    for (const r of runners) {
      r.done((result) => {
        status = status && result !== false;
        if (--remaining === 0) callback(status);
      });
    }
  }

  /**
   * Creates a new animation runner instance.
   *
   * @param {Object} [host] - Optional host object implementing animation lifecycle methods:
   *   - `pause()`, `resume()`, `end()`, `cancel()`, `progress()`
   * @param {Function} [frameScheduler] - Optional injected frame scheduler.
   */
  constructor(host, frameScheduler) {
    this.host = host || {};
    this._doneCallbacks = [];
    this._state = STATE_INITIAL;
    this._promise = null;

    // Scheduler: prefer injected $$animateAsyncRun, else fallback to RAF
    const asyncRunFactory = frameScheduler || $$animateAsyncRun;
    this._schedule =
      (asyncRunFactory && asyncRunFactory()) ||
      ((fn) => requestAnimationFrame(fn));
  }

  /**
   * Sets or updates the animation host.
   * @param {Object} host - The host object.
   */
  setHost(host) {
    this.host = host || {};
  }

  /**
   * Registers a callback to be called once the animation is complete.
   * If the animation is already complete, it is called immediately.
   *
   * @param {Function} fn - The callback to invoke upon completion.
   */
  done(fn) {
    if (this._state === STATE_DONE) {
      fn(true);
    } else {
      this._doneCallbacks.push(fn);
    }
  }

  /**
   * Notifies the host of animation progress.
   * @param {...any} args - Optional progress parameters.
   */
  progress(...args) {
    this.host.progress?.(...args);
  }

  /** Pauses the animation, if supported by the host. */
  pause() {
    this.host.pause?.();
  }

  /** Resumes the animation, if supported by the host. */
  resume() {
    this.host.resume?.();
  }

  /** Ends the animation successfully. */
  end() {
    this.host.end?.();
    this._finish(true);
  }

  /** Cancels the animation. */
  cancel() {
    this.host.cancel?.();
    this._finish(false);
  }

  /**
   * Marks the animation as complete on the next animation frame.
   *
   * @param {boolean} [status=true] - Whether the animation succeeded.
   */
  complete(status = true) {
    if (this._state === STATE_INITIAL) {
      this._state = STATE_PENDING;
      this._schedule(() => this._finish(status));
    }
  }

  /**
   * Returns a promise that resolves or rejects when the animation completes.
   * @returns {Promise<void>} Promise resolved on success or rejected on cancel.
   */
  getPromise() {
    if (!this._promise) {
      this._promise = new Promise((resolve, reject) => {
        this.done((success) => {
          if (success === false) reject();
          else resolve();
        });
      });
    }
    return this._promise;
  }

  /** Promise-compatible `then()` method. */
  then(onFulfilled, onRejected) {
    return this.getPromise().then(onFulfilled, onRejected);
  }

  /** Promise-compatible `catch()` method. */
  catch(onRejected) {
    return this.getPromise().catch(onRejected);
  }

  /** Promise-compatible `finally()` method. */
  finally(onFinally) {
    return this.getPromise().finally(onFinally);
  }

  /**
   * @private
   * Completes the animation and invokes all done callbacks.
   *
   * @param {boolean} status - True if completed successfully, false if cancelled.
   */
  _finish(status) {
    if (this._state === STATE_DONE) return;
    this._state = STATE_DONE;
    for (const fn of this._doneCallbacks) fn(status);
    this._doneCallbacks.length = 0;
  }
}
