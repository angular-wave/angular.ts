/**
 * @typedef {import('./interface.ts').RafScheduler} RafScheduler
 */

/**
 * Service provider that creates a requestAnimationFrame-based scheduler.
 * @type {ng.ServiceProvider}
 */
export class RafSchedulerProvider {
  constructor() {
    /**
     * Internal task queue, where each item is an array of functions to run.
     * @type {Array<Array<() => void>>}
     */
    this.queue = [];

    /**
     * ID of the currently scheduled animation frame (if any).
     * Used for cancellation and tracking.
     * @type {number|null}
     */
    this.cancelFn = null;
  }

  /**
   * Processes the next batch of tasks in the animation frame.
   * Executes the first group of functions in the queue, then
   * schedules the next frame if needed.
   */
  nextTick() {
    if (!this.queue.length) return;

    const items = this.queue.shift();

    items.forEach((fn) => fn());

    if (!this.cancelFn) {
      this.cancelFn = window.requestAnimationFrame(() => {
        this.cancelFn = null;
        this.nextTick();
      });
    }
  }

  /**
   * Returns the scheduler function.
   * This function allows tasks to be queued for execution on future animation frames.
   * It also has helper methods and state attached.
   *
   * @returns {RafScheduler} The scheduler function with `queue` and `waitUntilQuiet`.
   */
  $get() {
    /**
     * The main scheduler function.
     * Accepts an array of functions and schedules them to run in the next available frame(s).
     *
     * @type {RafScheduler}
     */
    const scheduler = (tasks) => {
      // Clone the input array to avoid mutating the original.
      this.queue = this.queue.concat(tasks);
      this.nextTick();
    };

    /**
     * Exposes the internal queue to consumers (read-only use preferred).
     * This matches the type signature for RafScheduler.
     */
    scheduler.queue = this.queue;

    /**
     * Cancels any pending frame and runs the given function once the frame is idle.
     * Useful for debounced updates.
     *
     * @param {Function} fn - Function to run when the animation frame is quiet.
     */
    scheduler.waitUntilQuiet = (fn) => {
      if (this.cancelFn !== null) {
        window.cancelAnimationFrame(this.cancelFn);
        this.cancelFn = null;
      }

      this.cancelFn = window.requestAnimationFrame(() => {
        this.cancelFn = null;
        fn();
        this.nextTick();
      });
    };

    return scheduler;
  }
}
