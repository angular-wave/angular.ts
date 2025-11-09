/**
 * @fileoverview
 * Frame-synchronized animation runner and scheduler.
 * Provides async batching of animation callbacks using requestAnimationFrame.
 */

/** @enum {number} Internal runner states. */
const STATE_INITIAL = 0;
const STATE_PENDING = 1;
const STATE_DONE = 2;

/** @type {VoidFunction[]} */
let queue = [];

/** @type {boolean} */
let scheduled = false;

/**
 * Flush all queued callbacks.
 * @private
 */
function flush() {
  const tasks = queue;
  queue = [];
  scheduled = false;
  for (let i = 0; i < tasks.length; i++) {
    tasks[i]();
  }
}

/**
 * Schedule a callback to run on the next animation frame.
 * Multiple calls within the same frame are batched together.
 *
 * @param {VoidFunction} fn - The callback to execute.
 */
export function schedule(fn) {
  queue.push(fn);
  if (!scheduled) {
    scheduled = true;
    (typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : setTimeout)(flush, 0);
  }
}

/**
 * Provider for the `$$AnimateRunner` service.
 * Used to inject the runner into the animation subsystem.
 */
export class AnimateRunnerFactoryProvider {
  constructor() {
    /** @type {() => typeof AnimateRunner} */
    this.$get = () => AnimateRunner; // Returning a class itself, not at instance
  }
}

/**
 * Represents an asynchronous animation operation.
 * Provides both callback-based and promise-based completion APIs.
 */
export class AnimateRunner {
  /**
   * Run an array of animation runners in sequence.
   * Each runner waits for the previous one to complete.
   *
   * @param {AnimateRunner[]} runners - Runners to execute in order.
   * @param {(ok: boolean) => void} callback - Invoked when all complete or one fails.
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
   * @param {AnimateRunner[]} runners - Active runners to wait for.
   * @param {(ok: boolean) => void} callback - Called when all runners complete.
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
   * @param {import("../interface.ts").AnimationHost} [host] - Optional animation host.
   */
  constructor(host) {
    /** @type {import("../interface.ts").AnimationHost} */
    this.host = host || {};

    /** @type {Array<(ok: boolean) => void>} */
    this._doneCallbacks = [];

    /** @type {0|1|2} */
    this._state = STATE_INITIAL;

    /** @type {Promise<void>|null} */
    this._promise = null;

    /** @type {(fn: VoidFunction) => void} */
    this._schedule = schedule;
  }

  /**
   * Sets or updates the animation host.
   * @param {import("../interface.ts").AnimationHost} host - The host object.
   */
  setHost(host) {
    this.host = host || {};
  }

  /**
   * Registers a callback to be called once the animation completes.
   * If the animation is already complete, it's called immediately.
   *
   * @param {(ok: boolean) => void} fn - Completion callback.
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
   * @param {...any} args - Progress arguments.
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
   * @param {boolean} [status=true] - True if successful, false if canceled.
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

  /** @inheritdoc */
  then(onFulfilled, onRejected) {
    return this.getPromise().then(onFulfilled, onRejected);
  }

  /** @inheritdoc */
  catch(onRejected) {
    return this.getPromise().catch(onRejected);
  }

  /** @inheritdoc */
  finally(onFinally) {
    return this.getPromise().finally(onFinally);
  }

  /**
   * Completes the animation and invokes all done callbacks.
   * @private
   * @param {boolean} status - True if completed successfully, false if canceled.
   */
  _finish(status) {
    if (this._state === STATE_DONE) return;
    this._state = STATE_DONE;

    const callbacks = this._doneCallbacks;
    for (let i = 0; i < callbacks.length; i++) {
      callbacks[i](status);
    }
    callbacks.length = 0;
  }
}
