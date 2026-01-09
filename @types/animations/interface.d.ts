import { AnimateRunner } from "./runner/animate-runner.js";
import { QueuePhase } from "./queue/interface.ts";
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
  pin(element: Element, parentElement: Element): void;
  enabled(element?: Element, enabled?: boolean): boolean;
  cancel(runner: AnimateRunner): void;
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
  addClass?: string;
  from?: Record<string, string | number>;
  removeClass?: string;
  to?: Record<string, string | number>;
  tempClasses: string | string[];
  /** Optional DOM operation callback executed before animation */
  domOperation?: () => void;
  onDone?: () => void;
  $$domOperationFired?: boolean;
  $$prepared?: boolean;
  $$skipPreparationClasses?: boolean;
  cleanupStyles?: boolean;
  preparationClasses?: string;
  activeClasses?: string;
  duration?: number | string;
  event?: string | string[];
  easing?: string;
  delay?: string;
  structural?: boolean;
  transitionStyle?: string;
  staggerIndex?: number;
  skipBlocking?: boolean;
  stagger?: number | string;
  keyframeStyle?: string;
  applyClassesEarly?: boolean;
}
export interface AnimateJsRunner {
  $$willAnimate: true;
  start: () => AnimateRunner;
  end: () => AnimateRunner;
}
export interface AnimateJsFn {
  (
    element: HTMLElement,
    event: string,
    classes?: string | null,
    options?: AnimationOptions,
  ): AnimateJsRunner;
}
