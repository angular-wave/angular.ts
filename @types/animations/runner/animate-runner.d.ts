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
export declare class AnimateRunner {
  /**
   * @param {AnimationHost} [host] - Optional animation host callbacks.
   * @param {boolean} [jsAnimation=false]
   *        If true: use RAF/timer ticks.
   *        If false: use batched CSS animation ticks.
   */
  constructor(host?: {}, jsAnimation?: boolean);
  /**
   * Sets or replaces the current host.
   * @param {AnimationHost} host
   */
  setHost(host: any): void;
  /**
   * Register a completion callback.
   * Fires immediately if animation is already done.
   *
   * @param {(ok: boolean) => void} fn
   */
  done(fn: any): void;
  /**
   * Reports progress to host.
   * @param {...any} args
   */
  progress(...args: any[]): void;
  /** Pause underlying animation (if supported). */
  pause(): void;
  /** Resume underlying animation (if supported). */
  resume(): void;
  /**
   * Ends the animation successfully.
   * Equivalent to user choosing to finish it immediately.
   */
  end(): void;
  /**
   * Cancels the animation.
   */
  cancel(): void;
  /**
   * Schedule animation completion.
   *
   * @param {boolean} [status=true]
   */
  complete(status?: boolean): void;
  /**
   * Completes the animation and invokes all done callbacks.
   * @param {boolean} status
   * @private
   */
  _finish(status: any): void;
  /**
   * Returns an internal promise that resolves on success,
   * and rejects on cancel.
   *
   * @returns {Promise<void>}
   */
  getPromise(): any;
  /**
   * Standard "thenable" interface
   * @template T
   * @param {(value: void) => T|Promise<T>} onFulfilled
   * @param {(reason: any) => any} [onRejected]
   * @returns {Promise<T>}
   */
  then(onFulfilled: any, onRejected: any): any;
  /**
   * Standard promise catcher.
   * @param {(reason: any) => any} onRejected
   * @returns {Promise<void>}
   */
  catch(onRejected: any): any;
  /**
   * Standard promise finally.
   * @param {() => any} onFinally
   * @returns {Promise<void>}
   */
  finally(onFinally: any): any;
  /**
   * Executes a list of runners sequentially.
   * Each must complete before the next starts.
   *
   * @param {AnimateRunner[]} runners
   * @param {(ok: boolean) => void} callback
   */
  static _chain(runners: any, callback: any): void;
  /**
   * Waits until all runners complete.
   *
   * @param {AnimateRunner[]} runners
   * @param {(ok: boolean) => void} callback
   */
  static _all(runners: any, callback: any): void;
}
