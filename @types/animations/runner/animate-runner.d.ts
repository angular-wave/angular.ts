/**
 * Schedule a callback to run on the next animation frame.
 * Multiple calls within the same frame are batched together.
 *
 * @param {VoidFunction} fn - The callback to execute.
 */
export function schedule(fn: VoidFunction): void;
/**
 * Provider for the `$$AnimateRunner` service.
 * Used to inject the runner into the animation subsystem.
 */
export class AnimateRunnerFactoryProvider {
  /** @type {() => typeof AnimateRunner} */
  $get: () => typeof AnimateRunner;
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
  static chain(runners: AnimateRunner[], callback: (ok: boolean) => void): void;
  /**
   * Waits for all animation runners to complete before invoking the callback.
   *
   * @param {AnimateRunner[]} runners - Active runners to wait for.
   * @param {(ok: boolean) => void} callback - Called when all runners complete.
   */
  static all(runners: AnimateRunner[], callback: (ok: boolean) => void): void;
  /**
   * @param {import("../interface.ts").AnimationHost} [host] - Optional animation host.
   */
  constructor(host?: import("../interface.ts").AnimationHost);
  /** @type {import("../interface.ts").AnimationHost} */
  host: import("../interface.ts").AnimationHost;
  /** @type {Array<(ok: boolean) => void>} */
  _doneCallbacks: Array<(ok: boolean) => void>;
  /** @type {0|1|2} */
  _state: 0 | 1 | 2;
  /** @type {Promise<void>|null} */
  _promise: Promise<void> | null;
  /** @type {(fn: VoidFunction) => void} */
  _schedule: (fn: VoidFunction) => void;
  /**
   * Sets or updates the animation host.
   * @param {import("../interface.ts").AnimationHost} host - The host object.
   */
  setHost(host: import("../interface.ts").AnimationHost): void;
  /**
   * Registers a callback to be called once the animation completes.
   * If the animation is already complete, it's called immediately.
   *
   * @param {(ok: boolean) => void} fn - Completion callback.
   */
  done(fn: (ok: boolean) => void): void;
  /**
   * Notifies the host of animation progress.
   * @param {...any} args - Progress arguments.
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
   * @param {boolean} [status=true] - True if successful, false if canceled.
   */
  complete(status?: boolean): void;
  /**
   * Returns a promise that resolves or rejects when the animation completes.
   * @returns {Promise<void>} Promise resolved on success or rejected on cancel.
   */
  getPromise(): Promise<void>;
  /** @inheritdoc */
  then(onFulfilled: any, onRejected: any): Promise<void>;
  /** @inheritdoc */
  catch(onRejected: any): Promise<void>;
  /** @inheritdoc */
  finally(onFinally: any): Promise<void>;
  /**
   * Completes the animation and invokes all done callbacks.
   * @private
   * @param {boolean} status - True if completed successfully, false if canceled.
   */
  private _finish;
}
