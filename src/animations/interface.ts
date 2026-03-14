import { AnimateRunner } from "./runner/animate-runner.ts";

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
