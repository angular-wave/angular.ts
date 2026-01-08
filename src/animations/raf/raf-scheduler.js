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
   * The main scheduler function.
   * Accepts an array of functions and schedules them to run in the next available frame(s).
   *
   * @param {Array<() => void>} tasks
   */
  _schedule(tasks) {
    this._queue.push(...tasks);
    this._nextTick();
  }

  /**
   * Cancels any pending frame and runs the given function once the frame is idle.
   * Useful for debounced updates.
   *
   * @param {Function} fn - Function to run when the animation frame is quiet.
   */
  _waitUntilQuiet(fn) {
    if (this._cancelFn !== null) {
      window.cancelAnimationFrame(this._cancelFn);
      this._cancelFn = null;
    }

    this._cancelFn = window.requestAnimationFrame(() => {
      this._cancelFn = null;
      fn();
      this._nextTick();
    });
  }
}

export const rafScheduler = new RafSchedulerProvider();
