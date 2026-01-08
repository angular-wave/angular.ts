/**
 * A requestAnimationFrame-based scheduler.
 */
export class RafScheduler {
  /**
   * Internal task queue, where each item is an array of functions to run.
   * @type {Array<() => void>}
   */
  _queue: Array<() => void>;
  /**
   * ID of the currently scheduled animation frame (if any).
   * Used for cancellation and tracking.
   * @type {number|null}
   */
  _cancelFn: number | null;
  /**
   * Processes the next batch of tasks in the animation frame.
   * Executes the first group of functions in the queue, then
   * schedules the next frame if needed.
   */
  _nextTick(): void;
  /**
   * The main scheduler function.
   * Accepts an array of functions and schedules them to run in the next available frame(s).
   *
   * @param {Array<() => void>} tasks
   */
  _schedule(tasks: Array<() => void>): void;
  /**
   * Cancels any pending frame and runs the given function once the frame is idle.
   * Useful for debounced updates.
   *
   * @param {Function} fn - Function to run when the animation frame is quiet.
   */
  _waitUntilQuiet(fn: Function): void;
}
export const rafScheduler: RafScheduler;
