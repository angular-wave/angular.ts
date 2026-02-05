import { AnimateRunner } from "./runner/animate-runner.js";
import { QueuePhase } from "./queue/interface.ts";

/**
 * Low-level animation executor used by the animation queue.
 *
 * This is the “engine” entry point: given a concrete element, an event name,
 * and normalized options, it starts an animation and returns an {@link AnimateRunner}
 * that represents the running work.
 *
 * Notes:
 * - `event` is intentionally `string` to support custom/internal events beyond the
 *   built-in set (e.g. driver-specific events).
 * - Callers typically pass normalized {@link AnimationOptions}.
 */
export type AnimationService = (
  element: HTMLElement,
  event: string,
  options?: AnimationOptions,
) => AnimateRunner;

/**
 * Optional host controls that may be provided by a concrete animation runner implementation.
 *
 * A runner host represents the underlying “real” animation (CSS/JS/driver-based) and
 * exposes lifecycle controls. The queue/runner wrapper can forward calls to this host.
 */
export interface AnimationHost {
  /** Pause animation. */
  pause?: () => void;

  /** Resume animation. */
  resume?: () => void;

  /** End animation (finish immediately). */
  end?: () => void;

  /** Cancel animation (abort and rollback if applicable). */
  cancel?: () => void;

  /** Report animation progress; signature is driver-dependent. */
  progress?: (...args: any[]) => void;
}

/**
 * Public-facing animation orchestration API.
 *
 * This is the service used by higher-level code to:
 * - register lifecycle callbacks (`on`/`off`)
 * - issue animations (`enter`, `leave`, `addClass`, `animate`, …)
 * - control global/element-level enabling
 * - cancel running work
 *
 * The service returns {@link AnimateRunner} instances for all animation requests.
 */
export interface AnimateService {
  /**
   * Register an animation callback for a given event name on a container.
   *
   * Callbacks fire for matching descendant elements during queue execution phases.
   */
  on(
    event: string,
    container: Element,
    callback?: (
      element: Element,
      phase: QueuePhase,
      data: AnimationEventData,
    ) => void,
  ): void;

  /**
   * Remove a previously registered callback.
   *
   * If only `event` is provided, removes all callbacks for that event.
   * If `container` and/or `callback` are provided, filters removals accordingly.
   */
  off(event: string, container?: Element, callback?: Function): void;

  /**
   * Pin an element to a host parent for animation ancestry checks.
   *
   * This is used when the DOM parent relationship is not the effective “animation host”
   * relationship (e.g. transclusion/moves).
   */
  pin(element: Element, parentElement: Element): void;

  /**
   * Enable/disable animations globally or for a specific element.
   *
   * - Called with no args: returns global enabled state.
   * - Called with element: returns enabled state for that element.
   * - Called with element + boolean: sets enabled state for that element.
   */
  enabled(element?: Element, enabled?: boolean): boolean;

  /**
   * Cancel a running animation by runner.
   */
  cancel(runner: AnimateRunner): void;

  /**
   * Structural animation: insert `element` into the DOM.
   */
  enter(
    element: Element,
    parent?: Element | null,
    after?: Element,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Structural animation: move `element` within the DOM.
   */
  move(
    element: Element,
    parent: Element | null,
    after?: Element,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Structural animation: remove `element` from the DOM.
   */
  leave(element: Element, options?: AnimationOptions): AnimateRunner;

  /**
   * Class-based animation: add classes to `element`.
   */
  addClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Class-based animation: remove classes from `element`.
   */
  removeClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Class-based animation: add and remove classes as a single atomic operation.
   */
  setClass(
    element: Element,
    add: string,
    remove: string,
    options?: AnimationOptions,
  ): AnimateRunner;

  /**
   * Inline-style animation: animate from `from` styles to `to` styles.
   *
   * `className` may be applied during the animation to help CSS-based drivers.
   */
  animate(
    element: Element,
    from: Record<string, string | number>,
    to: Record<string, string | number>,
    className?: string,
    options?: AnimationOptions,
  ): AnimateRunner;
}

/**
 * Data payload delivered to animation event callbacks (`AnimateService.on`).
 *
 * This is intentionally a small subset of animation information: it tells listeners
 * which classes are being added/removed and which style maps are being applied.
 *
 * Values may be `null` when not applicable.
 */
export interface AnimationEventData {
  addClass?: string | null;
  removeClass?: string | null;
  from?: Record<string, any> | null;
  to?: Record<string, any> | null;
}

/**
 * Built-in animation method names used by the queue and drivers.
 *
 * These correspond to the public API methods on {@link AnimateService} that are
 * class-based or structural.
 */
export type AnimationMethod =
  | "enter"
  | "leave"
  | "move"
  | "addClass"
  | "setClass"
  | "removeClass";

/**
 * Normalized animation options and (in some cases) internal queue state.
 *
 * This type is used widely in the animation subsystem:
 * - As the normalized options object passed down to drivers.
 * - As the mutable “details/state” object stored on active animations (queue internals).
 *
 * Note: This interface currently includes both user-facing options (e.g. `duration`,
 * `easing`, `addClass`) and internal fields (e.g. `state`, `counter`, `runner`).
 * If stronger separation is desired, consider splitting into `AnimationOptions`
 * (public config) + `AnimationState` (internal runtime fields).
 */
export interface AnimationOptions {
  /** Target element for the animation (internal convenience). */
  element?: HTMLElement;

  /** Space-separated or list of CSS classes involved in the animation. */
  classes?: string | string[];

  /** Space-separated CSS classes to add to element. */
  addClass?: string;

  /** CSS properties & values at the beginning of animation. */
  from?: Record<string, string | number>;

  /** CSS properties & values at end of animation. */
  to?: Record<string, string | number>;

  /** Space-separated CSS classes to remove from element. */
  removeClass?: string;

  /** CSS classes applied temporarily during animation. */
  tempClasses?: string | string[];

  /** Optional DOM operation callback executed before animation. */
  domOperation?: () => void;

  /** Optional completion callback (driver/queue dependent). */
  onDone?: () => void;

  /** Internal flag: whether domOperation has fired. */
  _domOperationFired?: boolean;

  /** Internal flag: whether preparation has been performed. */
  _prepared?: boolean;

  /** Internal flag: skip preparation classes. */
  _skipPreparationClasses?: boolean;

  /** Whether to clean up styles after animation completes. */
  cleanupStyles?: boolean;

  /** Generated preparation classes applied before animation start. */
  preparationClasses?: string;

  /** Generated active classes applied while animation runs. */
  activeClasses?: string;

  /** Duration override (seconds/ms string or number depending on implementation). */
  duration?: number | string;

  /** Event name(s) for multi-event animations (internal). */
  event?: string | string[];

  /** Easing override for the animation. */
  easing?: string;

  /** Delay override (string as parsed from computed styles is common). */
  delay?: string;

  /** Whether this is a structural animation (enter/leave/move). */
  structural?: boolean;

  /** Driver-specific transition style key. */
  transitionStyle?: string;

  /** Stagger index for staggered sequences (internal). */
  staggerIndex?: number;

  /** Whether to skip blocking behavior (internal/driver). */
  skipBlocking?: boolean;

  /** Stagger duration or configuration. */
  stagger?: number | string;

  /** Driver-specific keyframe style key. */
  keyframeStyle?: string;

  /** Whether to apply classes before measuring styles (driver/queue). */
  applyClassesEarly?: boolean;

  /** Internal: queue state marker (e.g. PRE_DIGEST/RUNNING). */
  state?: number;

  /** Internal: monotonically increasing counter for queued/cancelled animations. */
  counter?: number;

  /** Internal: close handler for queued animations. */
  close?: (reject?: boolean | undefined) => void;

  /** Internal: nested options/details reference used during merges. */
  options?: AnimationOptions;

  /** Internal: runner associated with this animation. */
  runner?: AnimateRunner;

  /** Internal: hook invoked before driver start to apply classes/styles. */
  beforeStart?: () => void;
}

/**
 * Concrete animation description passed into drivers.
 *
 * `AnimationDetails` is a normalized execution plan:
 * - includes the target element
 * - the resolved event name
 * - whether it is structural
 * - normalized options
 * - optional anchor pairs for shared-element transitions
 */
export interface AnimationDetails {
  /** Nested details describing the "from" side (used for anchor/shared transitions). */
  from?: AnimationDetails;

  /** Nested details describing the "to" side (used for anchor/shared transitions). */
  to?: AnimationDetails;

  /** Anchor element pairs for shared element transitions. */
  anchors?: Array<{ out: HTMLElement; in: HTMLElement }>;

  /** Target element for the animation. */
  element: HTMLElement;

  /** Animation method / event name. */
  event: AnimationMethod | string;

  /** Space-delimited CSS classes involved in the animation. */
  classes?: string | null;

  /** Whether the animation is structural (enter / leave / move). */
  structural: boolean;

  /** Normalized animation options. */
  options: AnimationOptions;
}

/**
 * Driver return type for JS-based animations.
 *
 * Some JS drivers expose a "runner-like" object with explicit `start()` and
 * `end()` methods that return an {@link AnimateRunner}.
 */
export interface AnimateJsRunner {
  _willAnimate: true;
  start: () => AnimateRunner;
  end: () => AnimateRunner;
}

/**
 * Signature for a JavaScript animation factory function.
 *
 * Given an element + event (+ optional classes/options), returns an {@link Animator}
 * handle when it intends to animate, or `undefined` when it cannot handle the request.
 */
export interface AnimateJsFn {
  (
    element: HTMLElement,
    event: string,
    classes?: string | null,
    options?: AnimationOptions,
  ): Animator | undefined;
}

/**
 * Handle returned by an animation factory (CSS or JS) that can be started or ended.
 *
 * `start()` begins the animation and returns a runner.
 * `end()` forces completion (may be synchronous depending on driver).
 */
export interface Animator {
  /** Whether this handle is expected to perform a real animation. */
  _willAnimate: boolean;

  /** Start the animation and return a runner you can control/cancel. */
  start(): AnimateRunner;

  /** Force-finish the animation (may be sync). */
  end(): void;
}

/**
 * Normalized animation factory signature used by the animation subsystem.
 *
 * Unlike {@link AnimateJsFn}, this always returns an {@link Animator} (never `undefined`),
 * typically because it represents the selected driver pipeline.
 */
export type AnimateFn = (
  element: HTMLElement,
  event: string,
  classes?: string | null,
  options?: AnimationOptions,
) => Animator;

/**
 * Signature for the CSS-based animation service.
 *
 * This typically returns an {@link Animator} that wraps CSS detection and timing.
 */
export type AnimateCssService = (
  element: HTMLElement,
  options?: ng.AnimationOptions,
) => Animator;

/**
 * Tuple representation of an inline style entry (`[property, value]`).
 *
 * Used by style application utilities to preserve order while iterating.
 */
export type InlineStyleEntry = [string, string];

/**
 * Internal entry used for parent-to-child sorting before scheduling with RAF.
 *
 * The queue sorts animation start functions by DOM ancestry to ensure:
 * - parent preparation classes are applied before children start
 * - child animations don't observe incorrect computed styles
 */
export interface SortedAnimationEntry {
  /** DOM node used to compute parent/child relationships (often the same as `element`). */
  domNode: Node;

  /** The element being animated. */
  element: Element;

  /** Function that triggers the animation start for this element. */
  fn: () => void;

  /** Children entries in the sort graph. */
  children: SortedAnimationEntry[];

  /** Internal marker to avoid processing nodes multiple times. */
  processed?: boolean;
}

/**
 * Internal queue entry representing an animation that will be driven.
 *
 * Extends {@link AnimationDetails} with lifecycle hooks used by the queue:
 * - `beforeStart()` applies preparation classes/styles before driver detection
 * - `close()` finalizes the animation state and resolves/rejects the runner
 */
export type AnimationEntry = AnimationDetails & {
  beforeStart: () => void;
  close: (reject?: boolean) => void;
};

/**
 * Reference to a structural animation participating in an anchor (shared element) pair.
 *
 * Stores the index into the current animation list and the anchor element node.
 */
export interface AnchorRef {
  animationID: number;
  element: Element;
}

/**
 * Pairing information for anchor animations.
 *
 * During grouping, an anchor key may map to:
 * - `from`: the leaving element
 * - `to`: the entering element
 *
 * If either side is missing, the animation falls back to non-anchor behavior.
 */
export interface AnchorRefEntry {
  from?: AnchorRef;
  to?: AnchorRef;
}
