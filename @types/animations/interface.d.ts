export type RafScheduler = {
  /**
   * Schedules a list of functions to run on the next animation frame(s).
   * @param tasks - The tasks to be scheduled.
   */
  (tasks: Array<() => void>): void;
  /**
   * Internal queue of scheduled task arrays.
   */
  queue: Array<Array<() => void>>;
  /**
   * Waits until the animation frame is quiet before running the provided function.
   * Cancels any previous animation frame requests.
   * @param fn - The function to run when the frame is quiet.
   */
  waitUntilQuiet(fn: () => void): void;
};
export interface AnimationHost {
  /** Pause animation. */
  pause?: () => void;
  /** Resume animation. */
  resume?: () => void;
  /** End animation. */
  end?: () => void;
  /** Cancel animation. */
  cancel?: () => void;
  /** Report animation progress. */
  progress?: (...args: any[]) => void;
}
