export class AnimateRunner {
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
  ): void;
  /**
   * Waits until all runners complete.
   *
   * @param {AnimateRunner[]} runners
   * @param {(ok: boolean) => void} callback
   */
  static _all(runners: AnimateRunner[], callback: (ok: boolean) => void): void;
  /**
   * @param {AnimationHost} [host] - Optional animation host callbacks.
   * @param {boolean} [jsAnimation=false]
   *        If true: use RAF/timer ticks.
   *        If false: use batched CSS animation ticks.
   */
  constructor(host?: AnimationHost, jsAnimation?: boolean);
  /** @type {AnimationHost} */
  _host: AnimationHost;
  /** @type {Array<(ok: boolean) => void>} */
  _doneCallbacks: Array<(ok: boolean) => void>;
  /** @type {RunnerState} */
  _state: RunnerState;
  /**
   * Deferred promise used by .then/.catch/.finally.
   * @type {Promise<void>|null}
   * @private
   */
  private _promise;
  /** @type {(fn: VoidFunction) => void} */
  _tick: (fn: VoidFunction) => void;
  /**
   * Sets or replaces the current host.
   * @param {AnimationHost} host
   */
  setHost(host: AnimationHost): void;
  /**
   * Register a completion callback.
   * Fires immediately if animation is already done.
   *
   * @param {(ok: boolean) => void} fn
   */
  done(fn: (ok: boolean) => void): void;
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
  private _finish;
  /**
   * Returns an internal promise that resolves on success,
   * and rejects on cancel.
   *
   * @returns {Promise<void>}
   */
  getPromise(): Promise<void>;
  /**
   * Standard "thenable" interface
   * @template T
   * @param {(value: void) => T|Promise<T>} onFulfilled
   * @param {(reason: any) => any} [onRejected]
   * @returns {Promise<T>}
   */
  then<T>(
    onFulfilled: (value: void) => T | Promise<T>,
    onRejected?: (reason: any) => any,
  ): Promise<T>;
  /**
   * Standard promise catcher.
   * @param {(reason: any) => any} onRejected
   * @returns {Promise<void>}
   */
  catch(onRejected: (reason: any) => any): Promise<void>;
  /**
   * Standard promise finally.
   * @param {() => any} onFinally
   * @returns {Promise<void>}
   */
  finally(onFinally: () => any): Promise<void>;
}
export type AnimationHost = import("../interface.ts").AnimationHost;
/**
 * Internal runner states.
 */
type RunnerState = number;
declare namespace RunnerState {
  let _INITIAL: number;
  let _PENDING: number;
  let _DONE: number;
}
export {};
