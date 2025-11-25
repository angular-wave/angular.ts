import { AnimateRunner } from "./runner/animate-runner.js";
import { QueuePhase } from "./queue/interface.ts";

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

export interface AnimateService {
  // Event listeners
  on(
    event: string,
    container: Element,
    callback: (
      element: Element,
      phase: QueuePhase,
      data: {
        addClass?: string | null;
        removeClass?: string | null;
        from?: Record<string, any> | null;
        to?: Record<string, any> | null;
      },
    ) => void,
  ): void;

  off(event: string, container?: Element, callback?: Function): void;

  // Pin element to a host parent
  pin(element: Element, parentElement: Element): void;

  // Enable/disable animations globally or per-element
  enabled(element?: Element, enabled?: boolean): boolean;

  // Cancel an animation
  cancel(runner: AnimateRunner): void;

  // Structural DOM operations
  enter(
    element: Element,
    parent: Element,
    after?: Element,
    options?: AnimationOptions,
  ): AnimateRunner;

  move(
    element: Element,
    parent: Element,
    after?: Element,
    options?: AnimationOptions,
  ): AnimateRunner;

  leave(element: Element, options?: AnimationOptions): AnimateRunner;

  // Class-based animations
  addClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  removeClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  setClass(
    element: Element,
    add: string,
    remove: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  // Inline style animation
  animate(
    element: Element,
    from: Record<string, any>,
    to: Record<string, any>,
    className?: string,
    options?: AnimationOptions,
  ): AnimateRunner;
}

export type AnimationMethod =
  | "enter"
  | "leave"
  | "move"
  | "addClass"
  | "setClass"
  | "removeClass";

export interface AnimationOptions {
  addClass?: string; // space-separated CSS classes to add to element
  from?: Record<string, string | number>; // CSS properties & values at the beginning of animation
  removeClass?: string; // space-separated CSS classes to remove from element
  to?: Record<string, string | number>; // CSS properties & values at end of animation
  tempClasses: string | string[]; // CSS classes during animation
}
