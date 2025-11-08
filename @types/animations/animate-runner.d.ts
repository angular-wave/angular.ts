/**
 * Provides a frame-synchronized asynchronous execution queue.
 * Schedules functions to run on the next animation frame (via `requestAnimationFrame`)
 * or in a microtask (via `queueMicrotask`) when the document is hidden.
 */
export class AnimateAsyncRunFactoryProvider {
  $get: () => () => Function;
}
/**
 * Provides the `AnimateRunner` service used by AngularJS animation subsystems.
 */
export class AnimateRunnerFactoryProvider {
  $get: (string | ((animateAsyncRun: Function) => typeof AnimateRunner))[];
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
  static chain(runners: Array<AnimateRunner>, callback: Function): void;
  /**
   * Waits for all animation runners to complete before invoking the callback.
   *
   * @param {Array<AnimateRunner>} runners - Array of active runners.
   * @param {Function} callback - Called when all runners complete.
   */
  static all(runners: Array<AnimateRunner>, callback: Function): void;
  /**
   * Creates a new animation runner instance.
   *
   * @param {Object} [host] - Optional host object implementing animation lifecycle methods:
   *   - `pause()`, `resume()`, `end()`, `cancel()`, `progress()`
   * @param {Function} [frameScheduler] - Optional injected frame scheduler.
   */
  constructor(host?: any, frameScheduler?: Function);
  host: any;
  _doneCallbacks: any[];
  _state: number;
  _promise: Promise<any>;
  _schedule: any;
  /**
   * Sets or updates the animation host.
   * @param {Object} host - The host object.
   */
  setHost(host: any): void;
  /**
   * Registers a callback to be called once the animation is complete.
   * If the animation is already complete, it is called immediately.
   *
   * @param {Function} fn - The callback to invoke upon completion.
   */
  done(fn: Function): void;
  /**
   * Notifies the host of animation progress.
   * @param {...any} args - Optional progress parameters.
   */
  progress(...args: any[]): void;
  /** Pauses the animation, if supported by the host. */
  pause(): void;
  /** Resumes the animation, if supported by the host. */
  resume(): void;
  /** Ends the animation successfully. */
  end(): void;
  /** Cancels the animation. */
  cancel(): void;
  /**
   * Marks the animation as complete on the next animation frame.
   *
   * @param {boolean} [status=true] - Whether the animation succeeded.
   */
  complete(status?: boolean): void;
  /**
   * Returns a promise that resolves or rejects when the animation completes.
   * @returns {Promise<void>} Promise resolved on success or rejected on cancel.
   */
  getPromise(): Promise<void>;
  /** Promise-compatible `then()` method. */
  then(onFulfilled: any, onRejected: any): Promise<void>;
  /** Promise-compatible `catch()` method. */
  catch(onRejected: any): Promise<void>;
  /** Promise-compatible `finally()` method. */
  finally(onFinally: any): Promise<void>;
  /**
   * @private
   * Completes the animation and invokes all done callbacks.
   *
   * @param {boolean} status - True if completed successfully, false if cancelled.
   */
  private _finish;
}
