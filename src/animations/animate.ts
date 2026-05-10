import { _injector } from "../injection-tokens.ts";
import type { Injectable } from "../interface.ts";
import {
  assign,
  createErrorFactory,
  isFunction,
  isString,
} from "../shared/utils.ts";
import { domInsert, removeElement } from "../shared/dom.ts";

const $animateError = createErrorFactory("$animate");

export type AnimationPhase =
  | "enter"
  | "leave"
  | "move"
  | "addClass"
  | "removeClass"
  | "setClass"
  | "animate";

export type AnimationResult = Animation | Promise<void> | void;

export interface AnimationContext {
  signal: AbortSignal;
  phase: AnimationPhase;
  className?: string;
  addClass?: string;
  removeClass?: string;
  from?: Record<string, string | number>;
  to?: Record<string, string | number>;
}

export type AnimationLifecycleCallback = (
  element: Element,
  context: AnimationContext,
) => void;

export interface NativeAnimationOptions extends KeyframeAnimationOptions {
  animation?: string;
  keyframes?: Keyframe[] | PropertyIndexedKeyframes;
  enter?: Keyframe[] | PropertyIndexedKeyframes;
  leave?: Keyframe[] | PropertyIndexedKeyframes;
  move?: Keyframe[] | PropertyIndexedKeyframes;
  addClass?: string;
  removeClass?: string;
  from?: Record<string, string | number>;
  to?: Record<string, string | number>;
  tempClasses?: string | string[];
  onStart?: AnimationLifecycleCallback;
  onDone?: AnimationLifecycleCallback;
  onCancel?: AnimationLifecycleCallback;
}

export type AnimationOptions = NativeAnimationOptions;

export type AnimationPresetHandler = (
  element: Element,
  context: AnimationContext,
  options: NativeAnimationOptions,
) => AnimationResult;

export interface AnimationPreset {
  enter?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  leave?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  move?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  addClass?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  removeClass?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  setClass?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  animate?: AnimationPresetHandler | Keyframe[] | PropertyIndexedKeyframes;
  options?: KeyframeAnimationOptions;
}

export class AnimationHandle implements PromiseLike<void> {
  readonly controller: AbortController;
  readonly finished: Promise<void>;
  private readonly animations: Animation[];
  private readonly cleanup?: (ok: boolean) => void;
  private doneCallbacks: Array<(ok: boolean) => void> = [];
  private settled = false;
  private status = true;

  constructor(
    result: AnimationResult | AnimationResult[],
    controller = new AbortController(),
    cleanup?: (ok: boolean) => void,
  ) {
    this.controller = controller;
    this.cleanup = cleanup;
    const results = Array.isArray(result) ? result : [result];

    this.animations = results.filter(
      (item): item is Animation => !!item && "finished" in item,
    );

    const promises = results.map((item) => {
      if (!item) return Promise.resolve();

      if ("finished" in item) return item.finished.then(() => undefined);

      return item;
    });

    this.finished = Promise.allSettled(promises).then((settled) => {
      const rejected = settled.some((item) => item.status === "rejected");

      this.complete(!rejected);
    });

    controller.signal.addEventListener(
      "abort",
      () => {
        this.cancel();
      },
      { once: true },
    );
  }

  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.finished.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<void | TResult> {
    return this.finished.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<void> {
    return this.finished.finally(onfinally);
  }

  done(callback: (ok: boolean) => void): void {
    if (this.settled) {
      callback(this.status);

      return;
    }

    this.doneCallbacks.push(callback);
  }

  cancel(): void {
    this.status = false;
    this.animations.forEach((animation) => animation.cancel());
    this.controller.abort();
    this.complete(false);
  }

  finish(): void {
    this.animations.forEach((animation) => animation.finish());
    this.complete(true);
  }

  pause(): void {
    this.animations.forEach((animation) => animation.pause());
  }

  play(): void {
    this.animations.forEach((animation) => animation.play());
  }

  complete(status = true): void {
    if (this.settled) return;

    this.settled = true;
    this.status = status;
    this.cleanup?.(status);

    const callbacks = this.doneCallbacks;

    this.doneCallbacks = [];
    callbacks.forEach((callback) => callback(status));
  }
}

export interface AnimateService {
  cancel(handle?: AnimationHandle): void;
  define(name: string, preset: AnimationPreset): void;
  enter(
    element: Element,
    parent?: Element | null,
    after?: ChildNode | null,
    options?: NativeAnimationOptions,
  ): AnimationHandle;
  move(
    element: Element,
    parent: Element | null,
    after?: ChildNode | null,
    options?: NativeAnimationOptions,
  ): AnimationHandle;
  leave(element: Element, options?: NativeAnimationOptions): AnimationHandle;
  addClass(
    element: Element,
    className: string,
    options?: NativeAnimationOptions,
  ): AnimationHandle;
  removeClass(
    element: Element,
    className: string,
    options?: NativeAnimationOptions,
  ): AnimationHandle;
  setClass(
    element: Element,
    add: string,
    remove: string,
    options?: NativeAnimationOptions,
  ): AnimationHandle;
  animate(
    element: Element,
    from: Record<string, string | number>,
    to?: Record<string, string | number>,
    className?: string,
    options?: NativeAnimationOptions,
  ): AnimationHandle;
  transition(update: () => void | Promise<void>): Promise<void>;
}

type PresetRegistration = AnimationPreset | Injectable<() => AnimationPreset>;

interface AnimateProviderInstance {
  _registeredAnimations: Record<string, PresetRegistration>;
  _customAnimationNames: Set<string>;
  register(name: string, preset: PresetRegistration): void;
  $get: [string, ($injector: ng.InjectorService) => AnimateService];
}

const DEFAULT_DURATION = 150;

const DEFAULT_EASING = "cubic-bezier(0.2, 0, 0, 1)";

const ENTER_EASING = "cubic-bezier(0, 0, 0, 1)";

const CSS_ANIMATION_PROPERTIES: Record<AnimationPhase, string> = {
  enter: "--ng-enter-animation",
  leave: "--ng-leave-animation",
  move: "--ng-move-animation",
  addClass: "--ng-add-class-animation",
  removeClass: "--ng-remove-class-animation",
  setClass: "--ng-set-class-animation",
  animate: "--ng-style-animation",
};

const BUILT_IN_PRESETS: Record<string, AnimationPreset> = {
  fade: {
    enter: [{ opacity: 0 }, { opacity: 1 }],
    leave: [{ opacity: 1 }, { opacity: 0 }],
    options: { duration: DEFAULT_DURATION, easing: ENTER_EASING, fill: "both" },
  },
  "fade-slide": {
    enter: [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    leave: [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(8px)" },
    ],
    move: [
      { opacity: 0.8, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    options: { duration: 160, easing: ENTER_EASING, fill: "both" },
  },
  scale: {
    enter: [
      { opacity: 0, transform: "scale(0.96)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    leave: [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.96)" },
    ],
    options: { duration: 180, easing: DEFAULT_EASING, fill: "both" },
  },
  "slide-start": {
    enter: [
      { opacity: 0, transform: "translateX(-12px)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    leave: [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(-12px)" },
    ],
    move: [
      { opacity: 0.8, transform: "translateX(-6px)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    options: { duration: 180, easing: DEFAULT_EASING, fill: "both" },
  },
  "slide-end": {
    enter: [
      { opacity: 0, transform: "translateX(12px)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    leave: [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: "translateX(12px)" },
    ],
    move: [
      { opacity: 0.8, transform: "translateX(6px)" },
      { opacity: 1, transform: "translateX(0)" },
    ],
    options: { duration: 180, easing: DEFAULT_EASING, fill: "both" },
  },
  collapse: {
    enter: expandHeight,
    leave: collapseHeight,
    options: { duration: 200, easing: DEFAULT_EASING, fill: "both" },
  },
  expand: {
    enter: expandHeight,
    leave: collapseHeight,
    options: { duration: 200, easing: DEFAULT_EASING, fill: "both" },
  },
};

AnimateProvider.$inject = [] as string[];

export function AnimateProvider(this: AnimateProviderInstance): void {
  this._registeredAnimations = { ...BUILT_IN_PRESETS };
  this._customAnimationNames = new Set();

  this.register = (name: string, preset: PresetRegistration): void => {
    if (!name || !isString(name)) {
      throw $animateError("noname", "Animation name must be a string.");
    }

    const normalizedName = normalizeAnimationName(name);

    this._registeredAnimations[normalizedName] = preset;
    this._customAnimationNames.add(normalizedName);
  };

  this.$get = [
    _injector,
    ($injector: ng.InjectorService): AnimateService => {
      const resolvedPresets = new Map<string, AnimationPreset>();

      const activeHandles = new WeakMap<Element, AnimationHandle>();

      const resolvePreset = (
        element: Element,
        options?: NativeAnimationOptions,
      ) => {
        const name = animationNameFor(element, options);

        if (!name) return undefined;

        if (resolvedPresets.has(name)) {
          return {
            preset: resolvedPresets.get(name) as AnimationPreset,
            custom: this._customAnimationNames.has(name),
          };
        }

        const registration = this._registeredAnimations[name];

        if (!registration) return undefined;

        const preset = (
          isFunction(registration) || Array.isArray(registration)
            ? $injector.invoke(
                registration as Injectable<() => AnimationPreset>,
              )
            : registration
        ) as AnimationPreset;

        resolvedPresets.set(name, preset);

        return {
          preset,
          custom: this._customAnimationNames.has(name),
        };
      };

      const run = (
        phase: AnimationPhase,
        element: Element,
        options: NativeAnimationOptions = {},
        contextOverrides: Partial<AnimationContext> = {},
        cleanup?: (ok: boolean) => void,
      ): AnimationHandle => {
        const controller = new AbortController();

        activeHandles.get(element)?.cancel();
        activeHandles.delete(element);

        const context: AnimationContext = {
          phase,
          signal: controller.signal,
          ...contextOverrides,
        };

        const tempClasses = splitOptionClasses(options.tempClasses);

        const elementClassList = element.classList;

        if (tempClasses.length) {
          elementClassList.add(...tempClasses);
        }

        const finishCleanup = (ok: boolean): void => {
          if (tempClasses.length) {
            elementClassList.remove(...tempClasses);
          }

          if (ok) {
            options.onDone?.(element, context);
          } else {
            options.onCancel?.(element, context);
          }

          cleanup?.(ok);
        };

        if (shouldSkipAnimation(element, options)) {
          finishCleanup(true);

          return new AnimationHandle(undefined, controller);
        }

        options.onStart?.(element, context);

        const resolvedPreset = resolvePreset(element, options);

        const preset = resolvedPreset?.preset;

        const handler = preset?.[phase];

        let result: AnimationResult | AnimationResult[];

        let animationCleanup: (() => void) | undefined;

        if (isFunction(handler)) {
          result = handler(element, context, options);
        } else {
          const optionKeyframes = keyframesForPhase(phase, options);

          const customKeyframes =
            resolvedPreset?.custom && handler ? handler : undefined;

          const keyframes = optionKeyframes || customKeyframes;

          const cssAnimation = keyframes
            ? undefined
            : cssAnimationForPhase(element, phase);

          const presetKeyframes =
            !cssAnimation && !resolvedPreset?.custom ? handler : undefined;

          if (keyframes) {
            result = element.animate(
              keyframes,
              animationOptionsFor(preset, options),
            );
          } else if (cssAnimation) {
            const cssResult = runCssAnimation(element, cssAnimation);

            result = cssResult.animations;
            animationCleanup = cssResult.cleanup;
          } else if (presetKeyframes) {
            result = element.animate(
              presetKeyframes,
              animationOptionsFor(preset, options),
            );
          } else {
            const styleKeyframes = keyframesFromStyles(
              context.from,
              context.to,
            );

            result = styleKeyframes
              ? element.animate(
                  styleKeyframes,
                  animationOptionsFor(preset, options),
                )
              : undefined;
          }
        }

        const handle = new AnimationHandle(result, controller, (ok) => {
          animationCleanup?.();
          finishCleanup(ok);
        });

        activeHandles.set(element, handle);
        handle.done(() => {
          if (activeHandles.get(element) === handle) {
            activeHandles.delete(element);
          }
        });

        return handle;
      };

      return {
        cancel(handle?: AnimationHandle): void {
          handle?.cancel?.();
        },

        define: (name, preset): void => {
          this.register(name, preset);
          resolvedPresets.delete(normalizeAnimationName(name));
        },

        enter: (element, parent, after, options) => {
          domInsert(element, parent as Element, after);

          return run("enter", element, options);
        },

        move: (element, parent, after, options) => {
          domInsert(element, parent as Element, after);

          return run("move", element, options);
        },

        leave: (element, options) =>
          run("leave", element, options, {}, (ok) => {
            if (ok !== false) removeElement(element);
          }),

        addClass: (element, className, options) => {
          const nextOptions = { ...options, addClass: className };

          element.classList.add(...splitClasses(className));

          return run("addClass", element, nextOptions, {
            className,
            addClass: className,
          });
        },

        removeClass: (element, className, options) => {
          const nextOptions = { ...options, removeClass: className };

          element.classList.remove(...splitClasses(className));

          return run("removeClass", element, nextOptions, {
            className,
            removeClass: className,
          });
        },

        setClass: (element, add, remove, options) => {
          const nextOptions = {
            ...options,
            addClass: add,
            removeClass: remove,
          };

          element.classList.add(...splitClasses(add));
          element.classList.remove(...splitClasses(remove));

          return run("setClass", element, nextOptions, {
            addClass: add,
            removeClass: remove,
          });
        },

        animate: (element, from, to = {}, className, options) => {
          if (className) element.classList.add(...splitClasses(className));

          assign((element as HTMLElement).style, from);

          return run(
            "animate",
            element,
            { ...options, from, to },
            { from, to, className },
            () => {
              assign((element as HTMLElement).style, to);
            },
          );
        },

        async transition(update): Promise<void> {
          const documentWithTransitions = document as Document & {
            startViewTransition?: (callback: () => void | Promise<void>) => {
              finished: Promise<void>;
            };
          };

          if (!documentWithTransitions.startViewTransition) {
            await update();

            return;
          }

          await documentWithTransitions.startViewTransition(update).finished;
        },
      };
    },
  ];
}

function splitClasses(className: string): string[] {
  return className.trim().split(/\s+/).filter(Boolean);
}

function splitOptionClasses(className?: string | string[]): string[] {
  if (!className) return [];

  return Array.isArray(className)
    ? className.flatMap(splitClasses)
    : splitClasses(className);
}

function normalizeAnimationName(name: string): string {
  return name.charAt(0) === "." ? name.slice(1) : name;
}

function animationNameFor(
  element: Element,
  options?: NativeAnimationOptions,
): string | undefined {
  const explicit = options?.animation;

  if (explicit) return normalizeAnimationName(explicit);

  const value =
    (element as HTMLElement).dataset.animate || element.getAttribute("animate");

  if (!value || value === "true" || value === "") return "fade";

  if (value === "false") return undefined;

  return normalizeAnimationName(value);
}

function keyframesForPhase(
  phase: AnimationPhase,
  options: NativeAnimationOptions,
): Keyframe[] | PropertyIndexedKeyframes | undefined {
  if (options.keyframes) return options.keyframes;

  if (phase === "enter") return options.enter;

  if (phase === "leave") return options.leave;

  if (phase === "move") return options.move;

  return undefined;
}

function keyframesFromStyles(
  from?: Record<string, string | number>,
  to?: Record<string, string | number>,
): Keyframe[] | undefined {
  if (!from && !to) return undefined;

  return [from || {}, to || {}] as Keyframe[];
}

function animationOptionsFor(
  preset: AnimationPreset | undefined,
  options: NativeAnimationOptions,
): KeyframeAnimationOptions {
  const defaults = preset?.options || {};

  const {
    keyframes: _keyframes,
    enter,
    leave,
    move,
    animation,
    tempClasses,
    onStart,
    onDone,
    onCancel,
    ...rest
  } = options;

  void _keyframes;
  void enter;
  void leave;
  void move;
  void animation;
  void tempClasses;
  void onStart;
  void onDone;
  void onCancel;

  return {
    duration: DEFAULT_DURATION,
    fill: "both",
    ...defaults,
    ...rest,
  };
}

function cssAnimationForPhase(
  element: Element,
  phase: AnimationPhase,
): string | undefined {
  const styles = getComputedStyle(element);

  const value =
    readCssAnimationProperty(styles, CSS_ANIMATION_PROPERTIES[phase]) ||
    readCssAnimationProperty(styles, "--ng-animation");

  if (!value || value === "none") return undefined;

  return value;
}

function readCssAnimationProperty(
  styles: CSSStyleDeclaration,
  property: string,
): string | undefined {
  const value = styles.getPropertyValue(property).trim();

  return value || undefined;
}

function runCssAnimation(
  element: Element,
  animation: string,
): { animations: Animation[]; cleanup: () => void } {
  const animatedElement = element as HTMLElement | SVGElement;

  const { style } = animatedElement;

  const previousAnimation = style.animation;

  const previousAnimations = new Set(element.getAnimations());

  style.animation = "none";

  if ("offsetWidth" in animatedElement) {
    animatedElement.offsetWidth;
  }

  style.animation = animation;

  const animations = element
    .getAnimations()
    .filter(
      (currentAnimation) =>
        !previousAnimations.has(currentAnimation) &&
        currentAnimation.playState !== "finished",
    );

  return {
    animations,
    cleanup: () => {
      style.animation = previousAnimation;
    },
  };
}

function shouldSkipAnimation(
  element: Element,
  options: NativeAnimationOptions,
): boolean {
  if (!("animate" in element)) return true;

  if (document.hidden) return true;

  if (options.duration === 0) return true;

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function expandHeight(
  element: Element,
  context: AnimationContext,
  options: NativeAnimationOptions,
): AnimationResult {
  const target = element as HTMLElement;

  const previousOverflow = target.style.overflow;

  const previousHeight = target.style.height;

  const previousOpacity = target.style.opacity;

  const height = `${target.scrollHeight}px`;

  target.style.overflow = "hidden";

  const animation = target.animate(
    [
      { height: "0px", opacity: 0 },
      { height, opacity: 1 },
    ],
    animationOptionsFor(BUILT_IN_PRESETS.expand, options),
  );

  cleanupHeightAnimation(target, context, animation, {
    height: previousHeight,
    opacity: previousOpacity,
    overflow: previousOverflow,
  });

  return animation;
}

function collapseHeight(
  element: Element,
  context: AnimationContext,
  options: NativeAnimationOptions,
): AnimationResult {
  const target = element as HTMLElement;

  const previousOverflow = target.style.overflow;

  const previousHeight = target.style.height;

  const previousOpacity = target.style.opacity;

  const height = `${target.offsetHeight || target.scrollHeight}px`;

  target.style.height = height;
  target.style.overflow = "hidden";

  const animation = target.animate(
    [
      { height, opacity: 1 },
      { height: "0px", opacity: 0 },
    ],
    animationOptionsFor(BUILT_IN_PRESETS.collapse, options),
  );

  cleanupHeightAnimation(target, context, animation, {
    height: previousHeight,
    opacity: previousOpacity,
    overflow: previousOverflow,
  });

  return animation;
}

function cleanupHeightAnimation(
  element: HTMLElement,
  context: AnimationContext,
  animation: Animation,
  previous: { height: string; opacity: string; overflow: string },
): void {
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;

    cleaned = true;
    element.style.height = previous.height;
    element.style.opacity = previous.opacity;
    element.style.overflow = previous.overflow;
  };

  context.signal.addEventListener("abort", cleanup, { once: true });
  animation.finished.then(cleanup, cleanup);
}
