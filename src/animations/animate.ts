import type { Injectable } from "../interface.ts";
import {
  assign,
  createErrorFactory,
  isFunction,
  isString,
  assertDefined,
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

export type AnimationResult = Animation | Promise<void> | undefined;

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

export interface AnimationOptions extends KeyframeAnimationOptions {
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

export type AnimationPresetHandler = (
  element: Element,
  context: AnimationContext,
  options: AnimationOptions,
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

export class AnimationHandle implements PromiseLike<undefined> {
  readonly controller: AbortController;
  readonly finished: Promise<undefined>;
  private readonly _animations: Animation[];
  private readonly _cleanup?: (ok: boolean) => void;
  private _doneCallbacks: ((ok: boolean) => void)[] = [];
  private _settled = false;
  private _status = true;

  constructor(
    result: AnimationResult | AnimationResult[],
    controller = new AbortController(),
    cleanup?: (ok: boolean) => void,
  ) {
    this.controller = controller;
    this._cleanup = cleanup;
    const results = Array.isArray(result) ? result : [result];

    this._animations = results.filter(
      (item): item is Animation => !!item && "finished" in item,
    );

    const promises = results.map(async (item) => {
      if (!item) return Promise.resolve();

      if ("finished" in item) return item.finished.then(() => undefined);

      return item;
    });

    this.finished = Promise.allSettled(promises).then((settled) => {
      const rejected = settled.some((item) => item.status === "rejected");

      this.complete(!rejected);

      return undefined;
    });

    controller.signal.addEventListener(
      "abort",
      () => {
        this.cancel();
      },
      { once: true },
    );
  }

  then<TResult1 = undefined, TResult2 = never>(
    onfulfilled?:
      | ((value: undefined) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.finished.then(onfulfilled, onrejected);
  }

  async catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<undefined | TResult> {
    return this.finished.catch(onrejected);
  }

  async finally(onfinally?: (() => void) | null): Promise<undefined> {
    return this.finished.finally(onfinally);
  }

  done(callback: (ok: boolean) => void): void {
    if (this._settled) {
      callback(this._status);

      return;
    }

    this._doneCallbacks.push(callback);
  }

  cancel(): void {
    this._status = false;
    this._animations.forEach((animation) => {
      animation.cancel();
    });
    this.controller.abort();
    this.complete(false);
  }

  finish(): void {
    this._animations.forEach((animation) => {
      animation.finish();
    });
    this.complete(true);
  }

  pause(): void {
    this._animations.forEach((animation) => {
      animation.pause();
    });
  }

  play(): void {
    this._animations.forEach((animation) => {
      animation.play();
    });
  }

  complete(status = true): void {
    if (this._settled) return;

    this._settled = true;
    this._status = status;
    this._cleanup?.(status);

    const callbacks = this._doneCallbacks;

    this._doneCallbacks = [];
    callbacks.forEach((callback) => {
      callback(status);
    });
  }
}

export interface AnimateService {
  cancel(handle?: AnimationHandle): void;
  define(name: string, preset: AnimationPreset): void;
  enter(
    element: Element,
    parent?: ParentNode | null,
    after?: ChildNode | null,
    options?: AnimationOptions,
  ): AnimationHandle;
  move(
    element: Element,
    parent: ParentNode | null,
    after?: ChildNode | null,
    options?: AnimationOptions,
  ): AnimationHandle;
  leave(element: Element, options?: AnimationOptions): AnimationHandle;
  addClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimationHandle;
  removeClass(
    element: Element,
    className: string,
    options?: AnimationOptions,
  ): AnimationHandle;
  setClass(
    element: Element,
    add: string,
    remove: string,
    options?: AnimationOptions,
  ): AnimationHandle;
  animate(
    element: Element,
    from: Record<string, string | number>,
    to?: Record<string, string | number>,
    className?: string,
    options?: AnimationOptions,
  ): AnimationHandle;
  transition(update: () => void | Promise<void>): Promise<void>;
}

type PresetRegistration = AnimationPreset | Injectable<() => AnimationPreset>;

const DEFAULT_DURATION = 150;

const CSS_ANIMATION_PROPERTIES: Record<AnimationPhase, string> = {
  enter: "--ng-enter-animation",
  leave: "--ng-leave-animation",
  move: "--ng-move-animation",
  addClass: "--ng-add-class-animation",
  removeClass: "--ng-remove-class-animation",
  setClass: "--ng-set-class-animation",
  animate: "--ng-style-animation",
};

const CSS_BUILT_IN_PRESETS = new Set([
  "fade",
  "fade-slide",
  "scale",
  "slide-start",
  "slide-end",
  "collapse",
  "expand",
]);

/** @internal */
export class AnimationRegistry {
  private readonly _registrations = new Map<string, PresetRegistration>();
  private _destroyed = false;

  register(name: string, preset: PresetRegistration): void {
    this.assertActive();

    if (!name || !isString(name)) {
      throw $animateError("noname", "Animation name must be a string.");
    }

    const normalizedName = normalizeAnimationName(name);

    this._registrations.set(normalizedName, preset);
  }

  get(name: string): PresetRegistration | undefined {
    this.assertActive();

    return this._registrations.get(name);
  }

  has(name: string): boolean {
    this.assertActive();

    return this._registrations.has(name);
  }

  destroy(): void {
    if (this._destroyed) return;

    this._destroyed = true;
    this._registrations.clear();
  }

  private assertActive(): void {
    if (this._destroyed) {
      throw new Error("Animation registry has already been disposed.");
    }
  }
}

/** @internal */
export function createAnimateService(
  registry: AnimationRegistry,
  $injector: ng.InjectorService,
): AnimateService {
  const resolvedPresets = new Map<
    string,
    { registration: PresetRegistration; preset: AnimationPreset }
  >();

  const activeHandles = new WeakMap<Element, AnimationHandle>();

  const resolvePreset = (element: Element, options?: AnimationOptions) => {
    const name = animationNameFor(element, options);

    if (!name) return undefined;

    const registration = registry.get(name);

    if (!registration) return undefined;

    const resolved = resolvedPresets.get(name);

    if (resolved?.registration === registration) {
      return resolved.preset;
    }

    const preset =
      isFunction(registration) || Array.isArray(registration)
        ? $injector.invoke(registration)
        : registration;

    resolvedPresets.set(name, { registration, preset });

    return preset;
  };

  const run = (
    phase: AnimationPhase,
    element: Element,
    options: AnimationOptions = {},
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

    const animationName = animationNameFor(element, options);

    const cssPresetClass =
      animationName && !registry.has(animationName)
        ? cssPresetClassFor(animationName)
        : undefined;

    const finishCleanup = (ok: boolean): void => {
      if (tempClasses.length) {
        elementClassList.remove(...tempClasses);
      }

      if (cssPresetClass) {
        elementClassList.remove(cssPresetClass);
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

    if (cssPresetClass) {
      elementClassList.add(cssPresetClass);
    }

    const resolvedPreset = resolvePreset(element, options);

    const preset = resolvedPreset;

    const handler = preset?.[phase];

    let result: AnimationResult | AnimationResult[];

    let animationCleanup: (() => void) | undefined;

    const cssPresetCleanup = animationName
      ? prepareCssPreset(element, animationName, phase)
      : undefined;

    if (isFunction(handler)) {
      result = handler(element, context, options);
    } else {
      const optionKeyframes = keyframesForPhase(phase, options);

      const keyframes = optionKeyframes ?? handler;

      const cssAnimation = keyframes
        ? undefined
        : cssAnimationForPhase(element, phase);

      if (keyframes) {
        result = element.animate(
          keyframes,
          animationOptionsFor(preset, options),
        );
      } else if (cssAnimation) {
        const cssResult = runCssAnimation(element, cssAnimation);

        if (animationName && isAutoHeightPreset(animationName)) {
          applyCssAnimationTiming(cssResult.animations, options);
        }
        result = cssResult.animations;
        animationCleanup = cssResult.cleanup;
      } else {
        const styleKeyframes = keyframesFromStyles(context.from, context.to);

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
      cssPresetCleanup?.();
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
      handle?.cancel();
    },

    define: (name, preset): void => {
      registry.register(name, preset);
    },

    enter: (element, parent, after, options) => {
      domInsert(element, assertDefined(parent ?? after?.parentNode), after);

      return run("enter", element, options);
    },

    move: (element, parent, after, options) => {
      domInsert(element, assertDefined(parent ?? after?.parentNode), after);

      return run("move", element, options);
    },

    leave: (element, options) =>
      run("leave", element, options, {}, (ok) => {
        if (ok) removeElement(element);
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

    animate: (element, from, to, className, options) => {
      const toStyles = to ?? {};

      if (className) element.classList.add(...splitClasses(className));

      assign((element as HTMLElement).style, from);

      return run(
        "animate",
        element,
        { ...options, from, to: toStyles },
        { from, to: toStyles, className },
        () => {
          assign((element as HTMLElement).style, toStyles);
        },
      );
    },

    async transition(update): Promise<void> {
      type ViewTransitionStarter = (callback: () => void | Promise<void>) => {
        finished: Promise<void>;
      };
      const startViewTransition = Reflect.get(
        document,
        "startViewTransition",
      ) as unknown;

      if (!isFunction(startViewTransition)) {
        await update();

        return;
      }

      await (startViewTransition as ViewTransitionStarter).call(
        document,
        update,
      ).finished;
    },
  };
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
  return name.startsWith(".") ? name.slice(1) : name;
}

function cssPresetClassFor(name: string): string | undefined {
  return CSS_BUILT_IN_PRESETS.has(name)
    ? `ng-animate-preset-${name}`
    : undefined;
}

function prepareCssPreset(
  element: Element,
  name: string,
  phase: AnimationPhase,
): (() => void) | undefined {
  if (
    !isAutoHeightPreset(name) ||
    (phase !== "enter" && phase !== "leave") ||
    !(element instanceof HTMLElement)
  ) {
    return undefined;
  }

  const property = "--ng-animate-auto-height";
  const previousHeight = element.style.getPropertyValue(property);
  const height =
    phase === "enter"
      ? element.scrollHeight
      : element.offsetHeight || element.scrollHeight;

  element.style.setProperty(property, `${String(height)}px`);

  return () => {
    if (previousHeight) {
      element.style.setProperty(property, previousHeight);
    } else {
      element.style.removeProperty(property);
    }
  };
}

function isAutoHeightPreset(name: string): boolean {
  return name === "collapse" || name === "expand";
}

function animationNameFor(
  element: Element,
  options?: AnimationOptions,
): string | undefined {
  const explicit = options?.animation;

  if (explicit) return normalizeAnimationName(explicit);

  const value =
    (element as HTMLElement).dataset.animate ?? element.getAttribute("animate");

  if (!value || value === "true" || value === "") return "fade";

  if (value === "false") return undefined;

  return normalizeAnimationName(value);
}

function keyframesForPhase(
  phase: AnimationPhase,
  options: AnimationOptions,
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

  return [from ?? {}, to ?? {}] as Keyframe[];
}

function animationOptionsFor(
  preset: AnimationPreset | undefined,
  options: AnimationOptions,
): KeyframeAnimationOptions {
  const defaults = preset?.options ?? {};

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
    readCssAnimationProperty(styles, CSS_ANIMATION_PROPERTIES[phase]) ??
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
    void animatedElement.offsetWidth;
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

function applyCssAnimationTiming(
  animations: Animation[],
  options: AnimationOptions,
): void {
  const timing: OptionalEffectTiming = {};
  const timingKeys = [
    "delay",
    "direction",
    "duration",
    "easing",
    "endDelay",
    "fill",
    "iterationStart",
    "iterations",
  ] as const;

  timingKeys.forEach((key) => {
    const value = options[key];

    if (value !== undefined) {
      Object.assign(timing, { [key]: value });
    }
  });

  if (Object.keys(timing).length === 0) return;

  animations.forEach((animation) => {
    animation.effect?.updateTiming(timing);
  });
}

function shouldSkipAnimation(
  element: Element,
  options: AnimationOptions,
): boolean {
  if (!("animate" in element)) return true;

  if (document.hidden) return true;

  if (options.duration === 0) return true;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
