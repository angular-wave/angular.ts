/**
 * @typedef {import('../interface.ts').RafScheduler} RafScheduler
 */

/**
 * Service provider that creates a requestAnimationFrame-based scheduler.
 * @type {ng.ServiceProvider}
 */
export class RafSchedulerProvider {
  constructor() {
    /**
     * Internal task queue, where each item is an array of functions to run.
     * @type {Array<() => void>}
     */
    this._queue = [];

    /**
     * ID of the currently scheduled animation frame (if any).
     * Used for cancellation and tracking.
     * @type {number|null}
     */
    this._cancelFn = null;
  }

  /**
   * Processes the next batch of tasks in the animation frame.
   * Executes the first group of functions in the queue, then
   * schedules the next frame if needed.
   */
  _nextTick() {
    if (!this._queue.length) return;

    while (this._queue.length) {
      /** @type {() => void} */ (this._queue.shift())();
    }

    if (!this._cancelFn) {
      this._cancelFn = window.requestAnimationFrame(() => {
        this._cancelFn = null;
        this._nextTick();
      });
    }
  }

  /**
   * Returns the scheduler function.
   * This function allows tasks to be queued for execution on future animation frames.
   * It also has helper methods and state attached.
   *
   * @returns {RafScheduler} The scheduler function with `_queue` and `_waitUntilQuiet`.
   */
  $get() {
    /**
     * The main scheduler function.
     * Accepts an array of functions and schedules them to run in the next available frame(s).
     *
     * @type {RafScheduler}
     */
    const scheduler = (tasks) => {
      this._queue.push(...tasks);
      this._nextTick();
    };

    /**
     * Exposes the internal queue to consumers (read-only use preferred).
     * This matches the type signature for RafScheduler.
     */
    scheduler._queue = this._queue;

    /**
     * Cancels any pending frame and runs the given function once the frame is idle.
     * Useful for debounced updates.
     *
     * @param {Function} fn - Function to run when the animation frame is quiet.
     */
    scheduler._waitUntilQuiet = (fn) => {
      if (this._cancelFn !== null) {
        window.cancelAnimationFrame(this._cancelFn);
        this._cancelFn = null;
      }

      this._cancelFn = window.requestAnimationFrame(() => {
        this._cancelFn = null;
        fn();
        this._nextTick();
      });
    };

    return scheduler;
  }
}
