import { AnimateRunner } from "./runner/animate-runner.js";
import { QueuePhase } from "./queue/interface.ts";
export type AnimationService = (
  element: HTMLElement,
  event: string,
  options?: any,
) => AnimateRunner;
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
    callback?: (
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
    parent?: Element | null,
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
  to?: Record<string, string | number>;
  removeClass?: string;
  tempClasses: string | string[];
  /** Optional DOM operation callback executed before animation */
  domOperation?: () => void;
  onDone?: () => void;
  _domOperationFired?: boolean;
  _prepared?: boolean;
  _skipPreparationClasses?: boolean;
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
export interface AnimationDetails {
  /** CSS properties & values at the beginning of animation */
  from?: AnimationDetails;
  /** CSS properties & values at the end of animation */
  to?: AnimationDetails;
  /** Anchor elements for shared element transitions */
  anchors?: Array<{
    out: HTMLElement;
    in: HTMLElement;
  }>;
  /** Target element for the animation */
  element: HTMLElement;
  /** Animation method / event name */
  event: AnimationMethod | string;
  /** Space-delimited CSS classes involved in the animation */
  classes?: string | null;
  /** Whether the animation is structural (enter / leave / move) */
  structural: boolean;
  /** Normalized animation options */
  options: AnimationOptions;
}
export interface AnimateJsRunner {
  _willAnimate: true;
  start: () => AnimateRunner;
  end: () => AnimateRunner;
}
export interface AnimateJsFn {
  (
    element: HTMLElement,
    event: string,
    classes?: string | null,
    options?: AnimationOptions,
  ): Animator;
}
export interface Animator {
  /** Whether this handle is expected to perform a real animation. */
  _willAnimate: boolean;
  /** Start the animation and return a runner you can control/cancel. */
  start(): AnimateRunner;
  /** Force-finish the animation (may be sync). */
  end(): void;
}
export interface AnimatorWithEndRunner extends Animator {
  end(): AnimateRunner;
}
export type AnimateFn = (
  element: HTMLElement,
  event: string,
  classes?: string | null,
  options?: AnimationOptions,
) => Animator;
export type AnimateCssService = (
  element: HTMLElement,
  options?: ng.AnimationOptions,
) => Animator;
export type InlineStyleEntry = [string, string];
