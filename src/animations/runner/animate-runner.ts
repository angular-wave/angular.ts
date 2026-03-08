import type { AnimationHost } from "../interface.ts";
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
let queue: VoidFunction[] = [];

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
function schedule(fn: VoidFunction): void {
  queue.push(fn);

  if (!scheduled) {
    scheduled = true;

    requestAnimationFrame(flush);
  }
}

export class AnimateRunner {
  _host: AnimationHost;
  _doneCallbacks: Array<(ok: boolean) => void>;
  _state: number;
  _promise: Promise<void> | null;
  _tick: (fn: VoidFunction) => void;

  /**
   * @param {AnimationHost} [host] - Optional animation host callbacks.
   * @param {boolean} [jsAnimation=false]
   *        If true: use RAF/timer ticks.
   *        If false: use batched CSS animation ticks.
   */
  constructor(host: AnimationHost = {}, jsAnimation = false) {
    this._host = host;

    this._doneCallbacks = [];

    this._state = RunnerState._INITIAL;

    /**
     * Deferred promise used by .then/.catch/.finally.
     */
    this._promise = null;

    /**
     * Internal tick scheduling function.
     * - JS animations: immediate RAF or fallback timer
     * - CSS animations: batched global queue
     */
    if (jsAnimation) {
      const rafTick = (fn: VoidFunction): void => {
        requestAnimationFrame(fn);
      };

      const timeoutTick = (fn: VoidFunction): void => {
        setTimeout(fn, 0);
      };

      this._tick = (fn: VoidFunction): void => {
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
  setHost(host: AnimationHost): void {
    this._host = host || {};
  }

  /**
   * Register a completion callback.
   * Fires immediately if animation is already done.
   *
   * @param {(ok: boolean) => void} fn
   */
  done(fn: (ok: boolean) => void): void {
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
  progress(...args: any[]): void {
    this._host.progress?.(...args);
  }

  /** Pause underlying animation (if supported). */
  pause(): void {
    this._host.pause?.();
  }

  /** Resume underlying animation (if supported). */
  resume(): void {
    this._host.resume?.();
  }

  /**
   * Ends the animation successfully.
   * Equivalent to user choosing to finish it immediately.
   */
  end(): void {
    this._host.end?.();
    this._finish(true);
  }

  /**
   * Cancels the animation.
   */
  cancel(): void {
    this._host.cancel?.();
    this._finish(false);
  }

  /**
   * Schedule animation completion.
   *
   * @param {boolean} [status=true]
   */
  complete(status = true): void {
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
  _finish(status: boolean): void {
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
        this.done((ok) => (ok === false ? reject() : resolve(undefined)));
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
  then<T>(
    onFulfilled: (value: void) => T | PromiseLike<T>,
    onRejected?: ((reason: any) => T | PromiseLike<T>) | null,
  ): Promise<T> {
    return this.getPromise().then(onFulfilled, onRejected);
  }

  /**
   * Standard promise catcher.
   * @param {(reason: any) => any} onRejected
   * @returns {Promise<void>}
   */
  catch(onRejected: (reason: any) => any): Promise<void> {
    return this.getPromise().catch(onRejected);
  }

  /**
   * Standard promise finally.
   * @param {() => any} onFinally
   * @returns {Promise<void>}
   */
  finally(onFinally: () => any): Promise<void> {
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
  static _chain(
    runners: AnimateRunner[],
    callback: (ok: boolean) => void,
  ): void {
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
  static _all(runners: AnimateRunner[], callback: (ok: boolean) => void): void {
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
