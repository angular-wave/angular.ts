/**
 * Hybrid AnimateRunner
 * Supports both CSS animations (batched) and JS animations (per-Tick).
 *
 * The runner:
 *   - tracks completion state
 *   - supports done callbacks
 *   - exposes a host API (end, cancel, pause, resume)
 *   - can be awaited as a Promise
 *
 * It intentionally mirrors AngularJS 1.x $$AnimateRunner behavior.
 */

/**
 * @typedef {import("../interface.ts").AnimationHost} AnimationHost
 */

/**
 * Internal runner states.
 * @internal
 * @enum {number}
 */
const RunnerState = {
  /** Initial state before any completion logic started */
  _INITIAL: 0,

  /** Completion has been scheduled but not finished */
  _PENDING: 1,

  /** The runner is fully completed and callbacks fired */
  _DONE: 2,
};

/**
 * Global queue used to batch CSS animation callbacks.
 * @type {Array<VoidFunction>}
 */
let queue = [];

/** @type {boolean} */
let scheduled = false;

/**
 * Flushes all queued callbacks in FIFO order.
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
 * Schedules a callback for next animation frame,
 * falling back to setTimeout(0) when RAF is unavailable.
 *
 * @param {VoidFunction} fn
 */
function schedule(fn) {
  queue.push(fn);

  if (!scheduled) {
    scheduled = true;

    requestAnimationFrame(flush);
  }
}

export class AnimateRunner {
  /**
   * @param {AnimationHost} [host] - Optional animation host callbacks.
   * @param {boolean} [jsAnimation=false]
   *        If true: use RAF/timer ticks.
   *        If false: use batched CSS animation ticks.
   */
  constructor(host = {}, jsAnimation = false) {
    /** @type {AnimationHost} */
    this._host = host;

    /** @type {Array<(ok: boolean) => void>} */
    this._doneCallbacks = [];

    /** @type {RunnerState} */
    this._state = RunnerState._INITIAL;

    /**
     * Deferred promise used by .then/.catch/.finally.
     * @type {Promise<void>|null}
     * @private
     */
    this._promise = null;

    /**
     * Internal tick scheduling function.
     * - JS animations: immediate RAF or fallback timer
     * - CSS animations: batched global queue
     * @type {(fn: VoidFunction) => void}
     * @private
     */
    if (jsAnimation) {
      /** @type {(fn: VoidFunction) => void} */
      const rafTick = (fn) => {
        requestAnimationFrame(fn);
      };

      /** @type {(fn: VoidFunction) => void} */
      const timeoutTick = (fn) => {
        setTimeout(fn, 0);
      };

      /** @type {(fn: VoidFunction) => void} */
      this._tick = (fn) => {
        // When tab is hidden, requestAnimationFrame throttles heavily.
        if (document.hidden) timeoutTick(fn);
        else rafTick(fn);
      };
    } else {
      this._tick = schedule;
    }
  }

  /**
   * Sets or replaces the current host.
   * @param {AnimationHost} host
   */
  setHost(host) {
    this._host = host || {};
  }

  /**
   * Register a completion callback.
   * Fires immediately if animation is already done.
   *
   * @param {(ok: boolean) => void} fn
   */
  done(fn) {
    if (this._state === RunnerState._DONE) {
      fn(true);
    } else {
      this._doneCallbacks.push(fn);
    }
  }

  /**
   * Reports progress to host.
   * @param {...any} args
   */
  progress(...args) {
    this._host.progress?.(...args);
  }

  /** Pause underlying animation (if supported). */
  pause() {
    this._host.pause?.();
  }

  /** Resume underlying animation (if supported). */
  resume() {
    this._host.resume?.();
  }

  /**
   * Ends the animation successfully.
   * Equivalent to user choosing to finish it immediately.
   */
  end() {
    this._host.end?.();
    this._finish(true);
  }

  /**
   * Cancels the animation.
   */
  cancel() {
    this._host.cancel?.();
    this._finish(false);
  }

  /**
   * Schedule animation completion.
   *
   * @param {boolean} [status=true]
   */
  complete(status = true) {
    if (this._state === RunnerState._INITIAL) {
      this._state = RunnerState._PENDING;
      this._tick(() => this._finish(status));
    }
  }

  /**
   * Completes the animation and invokes all done callbacks.
   * @param {boolean} status
   * @private
   */
  _finish(status) {
    if (this._state === RunnerState._DONE) return;

    this._state = RunnerState._DONE;

    const callbacks = this._doneCallbacks;

    this._doneCallbacks = [];

    for (let i = 0; i < callbacks.length; i++) {
      callbacks[i] && callbacks[i](status);
    }
  }

  /**
   * Returns an internal promise that resolves on success,
   * and rejects on cancel.
   *
   * @returns {Promise<void>}
   */
  getPromise() {
    if (!this._promise) {
      this._promise = new Promise((resolve, reject) => {
        this.done((ok) => (ok === false ? reject() : resolve()));
      });
    }

    return this._promise;
  }

  /**
   * Standard "thenable" interface
   * @template T
   * @param {(value: void) => T|Promise<T>} onFulfilled
   * @param {(reason: any) => any} [onRejected]
   * @returns {Promise<T>}
   */
  then(onFulfilled, onRejected) {
    return this.getPromise().then(onFulfilled, onRejected);
  }

  /**
   * Standard promise catcher.
   * @param {(reason: any) => any} onRejected
   * @returns {Promise<void>}
   */
  catch(onRejected) {
    return this.getPromise().catch(onRejected);
  }

  /**
   * Standard promise finally.
   * @param {() => any} onFinally
   * @returns {Promise<void>}
   */
  finally(onFinally) {
    return this.getPromise().finally(onFinally);
  }

  // ---------------------------------------------------------------------------
  //  STATIC HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Executes a list of runners sequentially.
   * Each must complete before the next starts.
   *
   * @param {AnimateRunner[]} runners
   * @param {(ok: boolean) => void} callback
   */
  static _chain(runners, callback) {
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
   * Waits until all runners complete.
   *
   * @param {AnimateRunner[]} runners
   * @param {(ok: boolean) => void} callback
   */
  static _all(runners, callback) {
    let remaining = runners.length;

    let status = true;

    for (const i of runners) {
      i.done((result) => {
        if (result === false) status = false;

        if (--remaining === 0) callback(status);
      });
    }
  }
}
