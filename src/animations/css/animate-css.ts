import type { AnimationOptions, Animator } from "../interface.ts";
import { $injectTokens } from "../../injection-tokens.ts";
import {
  getCacheData,
  removeElementData,
  setCacheData,
} from "../../shared/dom.ts";
import {
  entries,
  isArray,
  isDefined,
  isNullOrUndefined,
  isString,
  keys,
  nullObject,
} from "../../shared/utils.ts";
import { AnimateRunner, AnimationHost } from "../runner/animate-runner.ts";
import {
  ACTIVE_CLASS_SUFFIX,
  ADD_CLASS_SUFFIX,
  EVENT_CLASS_PREFIX,
  REMOVE_CLASS_SUFFIX,
  applyAnimationClasses,
  applyAnimationFromStyles,
  applyAnimationStyles,
  applyAnimationToStyles,
  applyInlineStyle,
  _blockKeyframeAnimations,
  packageStyles,
  pendClasses,
  prepareAnimationOptions,
} from "../shared.ts";
import { animateCache } from "../cache/animate-cache.ts";
import { rafScheduler } from "../raf/raf-scheduler.ts";

/**
 * Tuple representation of an inline style entry (`[property, value]`).
 *
 * Used by style application utilities to preserve order while iterating.
 */
export type InlineStyleEntry = [string, string];

/**
 * Signature for the CSS-based animation service.
 *
 * This typically returns an {@link Animator} that wraps CSS detection and timing.
 */
export type AnimateCssService = (
  element: HTMLElement,
  options?: ng.AnimationOptions,
) => Animator;

type AnimateCssOptions = Omit<AnimationOptions, "delay"> & {
  delay?: string | boolean;
  event?: string | string[];
  stagger?: number | string;
};

interface CssTimings {
  transitionDuration: number;
  transitionDelay: number;
  transitionProperty: string;
  animationDuration: number;
  animationDelay: number;
  animationIterationCount: number;
  maxDelay: number;
  maxDuration: number;
}

interface StaggerTimings {
  transitionDuration: number;
  transitionDelay: number;
  animationDuration: number;
  animationDelay: number;
}

interface AnimationFlags {
  /** @internal */
  _hasTransitions: boolean;
  /** @internal */
  _hasAnimations: boolean;
  /** @internal */
  _hasTransitionAll: boolean;
  /** @internal */
  _applyTransitionDuration: boolean;
  /** @internal */
  _applyAnimationDuration: boolean;
  /** @internal */
  _applyTransitionDelay: boolean;
  /** @internal */
  _applyAnimationDelay: boolean;
  /** @internal */
  _recalculateTimingStyles: boolean;
  /** @internal */
  _blockTransition: boolean;
  /** @internal */
  _blockKeyframeAnimation: boolean;
}

const ANIMATE_TIMER_KEY = $injectTokens._animateCss;

const ONE_SECOND = 1000;

const SAFE_FAST_FORWARD_DURATION_VALUE = 9999;

const ELAPSED_TIME_MAX_DECIMAL_PLACES = 3;

const CLOSING_TIME_BUFFER = 1.5;

const DETECT_CSS_PROPERTIES = {
  transitionDuration: "transitionDuration",
  transitionDelay: "transitionDelay",
  transitionProperty: "transitionProperty",
  animationDuration: "animationDuration",
  animationDelay: "animationDelay",
  animationIterationCount: "animationIterationCount",
};

const DETECT_STAGGER_CSS_PROPERTIES = {
  transitionDuration: "transitionDuration",
  transitionDelay: "transitionDelay",
  animationDuration: "animationDuration",
  animationDelay: "animationDelay",
};

/**
 * Builds an inline keyframe-duration style entry.
 */
function getCssKeyframeDurationStyle(
  duration: string | number | undefined,
): InlineStyleEntry {
  return ["animationDuration", `${duration}s`];
}

/**
 * Builds an inline delay style entry for transitions or keyframes.
 */
function getCssDelayStyle(
  delay: number | undefined,
  isKeyframeAnimation?: boolean,
): InlineStyleEntry {
  const prop = isKeyframeAnimation ? "animationDelay" : "transitionDelay";

  return [prop, `${delay}s`];
}

/**
 * Reads and normalizes the requested computed CSS properties from an element.
 */
function computeCssStyles(
  element: Element,
  properties: Record<string, string> | ArrayLike<string>,
): Record<string, string | number | null> {
  const styles: Record<string, string | number | null> = nullObject();

  const detectedStyles = window.getComputedStyle(
    element,
  ) as CSSStyleDeclaration & Record<string, string>;

  entries(properties).forEach(([actualStyleName, formalStyleName]) => {
    let val: string | number | null = detectedStyles[formalStyleName];

    if (val) {
      if (isString(val) && /^[+-]?\d/.test(val)) {
        val = parseMaxTime(val); // number
      }

      if (val === 0) {
        val = null;
      }

      styles[actualStyleName] = val;
    }
  });

  return styles;
}

/**
 * Parse a CSS time value (or comma-separated list of values) and return the maximum duration.
 *
 * Accepts values expressed in seconds (`s`) or milliseconds (`ms`) as returned by `getComputedStyle()`,
 * e.g. `"0.2s"`, `"150ms"`, or `"0.2s, 150ms"`. Milliseconds are converted to seconds before comparison.
 *
 * Invalid tokens are ignored. If no valid numeric token is found, the result is `0`.
 *
 * @param str A CSS time string (optionally comma-separated).
 * @returns The maximum time value, expressed in **seconds**.
 */
export function parseMaxTime(str: string): number {
  let max = 0;

  str.split(/\s*,\s*/).forEach((token: string) => {
    if (!token) return;

    // Computed styles usually return either "Xs" or "Yms"
    // (but we accept plain numbers too).
    let num;

    if (token.endsWith("ms")) {
      num = parseFloat(token.slice(0, -2));

      if (!isNaN(num)) num = num / 1000;
    } else if (token.endsWith("s")) {
      num = parseFloat(token.slice(0, -1));
    } else {
      num = parseFloat(token);
    }

    if (!isNaN(num)) {
      max = Math.max(max, num);
    }
  });

  return max;
}

/**
 * Treats zero as a valid timing value while still filtering out nullish values.
 */
function truthyTimingValue(val: unknown): boolean {
  return val === 0 || !isNullOrUndefined(val);
}

/**
 * Builds an inline transition-duration style entry.
 */
function getCssTransitionDurationStyle(
  duration: string | number | undefined,
  applyOnlyDuration: boolean,
): InlineStyleEntry {
  let style = "transition";

  let value = `${duration}s`;

  if (applyOnlyDuration) {
    style += "Duration";
  } else {
    value += " linear all";
  }

  return [style, value];
}

// we do not reassign an already present style value since
// if we detect the style property value again we may be
// detecting styles that were added via the `from` styles.
// We make use of `isDefined` here since an empty string
// or null value (which is what getPropertyValue will return
// for a non-existing style) will still be marked as a valid
// value for the style (a falsy value implies that the style
// is to be removed at the end of the animation). If we had a simple
// "OR" statement then it would not be enough to catch that.
/**
 * Captures inline styles so they can be restored after the animation finishes.
 */
function registerRestorableStyles(
  backup: Record<string, string | null | undefined>,
  node: HTMLElement,
  properties: string[],
): void {
  properties.forEach((prop: string) => {
    backup[prop] = isDefined(backup[prop])
      ? backup[prop]
      : node.style.getPropertyValue(prop);
  });
}

export function AnimateCssProvider(this: { $get?: unknown }): void {
  let activeClasses = "";

  this.$get = [
    /**
     * Creates the runtime `$animateCss` implementation.
     */
    (): AnimateCssService => {
      /**
       * Computes and caches CSS timing data for an element.
       */
      function computeCachedCssStyles(
        node: HTMLElement,
        cacheKey: string,
        allowNoDuration: boolean,
        properties: Record<string, string>,
      ): CssTimings {
        let timings = animateCache._get(cacheKey) as CssTimings | undefined;

        if (!timings) {
          const computed = computeCssStyles(node, properties);

          timings = {
            transitionDuration: Number(computed.transitionDuration || 0),
            transitionDelay: Number(computed.transitionDelay || 0),
            transitionProperty:
              typeof computed.transitionProperty === "string"
                ? computed.transitionProperty
                : "",
            animationDuration: Number(computed.animationDuration || 0),
            animationDelay: Number(computed.animationDelay || 0),
            animationIterationCount:
              computed.animationIterationCount === "infinite"
                ? 1
                : Number(computed.animationIterationCount || 1),
            maxDelay: 0,
            maxDuration: 0,
          };
        }

        // if a css animation has no duration we
        // should mark that so that repeated addClass/removeClass calls are skipped
        const hasDuration =
          allowNoDuration ||
          timings.transitionDuration > 0 ||
          timings.animationDuration > 0;

        // we keep putting this in multiple times even though the value and the cacheKey are the same
        // because we're keeping an internal tally of how many duplicate animations are detected.
        animateCache._put(cacheKey, timings, hasDuration);

        return timings;
      }

      /**
       * Computes and caches stagger timing data for class-based animations.
       */
      function computeCachedCssStaggerStyles(
        node: HTMLElement,
        className: string | string[],
        cacheKey: string,
        properties: Record<string, string>,
      ): Partial<StaggerTimings> {
        let stagger: Partial<StaggerTimings> | undefined;

        const staggerCacheKey = `stagger-${cacheKey}`;

        // if we have one or more existing matches of matching elements
        // containing the same parent + CSS styles (which is how cacheKey works)
        // then staggering is possible
        if (animateCache._count(cacheKey) > 0) {
          stagger = animateCache._get(staggerCacheKey);

          if (!stagger) {
            const staggerClassName = pendClasses(className, "-stagger");

            node.className += ` ${staggerClassName}`;
            stagger = computeCssStyles(node, properties);

            // force the conversion of a null value to zero incase not set
            stagger.animationDuration = Math.max(
              stagger.animationDuration || 0,
              0,
            );
            stagger.transitionDuration = Math.max(
              stagger.transitionDuration || 0,
              0,
            );

            node.classList.remove(staggerClassName);

            animateCache._put(staggerCacheKey, stagger, true);
          }
        }

        return stagger || {};
      }

      const rafWaitQueue: Array<() => void> = [];

      /**
       * Defers animation startup until the DOM and style queues are settled.
       */
      function waitUntilQuiet(callback: () => void): void {
        rafWaitQueue.push(callback);
        rafScheduler._waitUntilQuiet(() => {
          animateCache._flush();

          // Forces synchronous style & layout flush.
          // Required to commit animation prep state before activation.
          document.documentElement.getBoundingClientRect();

          // we use a for loop to ensure that if the queue is changed
          // during this looping then it will consider new requests
          for (let i = 0; i < rafWaitQueue.length; i++) {
            rafWaitQueue[i]();
          }
          rafWaitQueue.length = 0;
        });
      }

      /**
       * Computes the effective transition/keyframe timings for an element.
       */
      function computeTimings(
        node: HTMLElement,
        cacheKey: string,
        allowNoDuration: boolean,
      ): CssTimings {
        const timings = computeCachedCssStyles(
          node,
          cacheKey,
          allowNoDuration,
          DETECT_CSS_PROPERTIES,
        );

        const aD = timings.animationDelay;

        const tD = timings.transitionDelay;

        timings.maxDelay = aD && tD ? Math.max(aD, tD) : aD || tD;
        timings.maxDuration = Math.max(
          timings.animationDuration * timings.animationIterationCount,
          timings.transitionDuration,
        );

        return timings;
      }

      /**
       * Creates an animator instance for the given element and options.
       */
      function init(
        element: HTMLElement,
        initialOptions?: AnimateCssOptions,
      ): Animator {
        // all of the animation functions should create
        // a copy of the options data, however, if a
        // parent service has already created a copy then
        let delayStyle: InlineStyleEntry | undefined;

        // we should stick to using that
        let options =
          initialOptions ||
          ({
            _skipPreparationClasses: false,
          } as AnimateCssOptions);

        if (!options._prepared) {
          options = prepareAnimationOptions(
            structuredClone(options) as AnimationOptions,
          ) as AnimateCssOptions;
        }

        const restoreStyles = {};

        const node = element;

        // Note: this had an additional  !$$animateQueue.enabled() check
        if (!node || !node.parentNode) {
          return closeAndReturnNoopAnimator();
        }

        const temporaryStyles: InlineStyleEntry[] = [];

        const styles = packageStyles(options as AnimationOptions);

        let animationClosed = false;

        let animationPaused = false;

        let animationCompleted = false;

        let runner: AnimateRunner | undefined;

        let runnerHost: AnimationHost = {};

        let maxDelay = 0;

        let maxDelayTime = 0;

        let maxDuration = 0;

        let maxDurationTime = 0;

        let startTime = 0;

        const events: string[] = [];

        const delayOption = options.delay as string | boolean | undefined;

        if (options.duration === 0) {
          return closeAndReturnNoopAnimator();
        }

        const method = isArray(options.event)
          ? options.event.join(" ")
          : options.event || "";

        const isStructural = !!(method && options.structural);

        let structuralClassName = "";

        let addRemoveClassName = "";

        if (isStructural) {
          structuralClassName = pendClasses(method, EVENT_CLASS_PREFIX, true);
        } else if (method) {
          structuralClassName = method;
        }

        if (options.addClass) {
          addRemoveClassName += pendClasses(options.addClass, ADD_CLASS_SUFFIX);
        }

        if (options.removeClass) {
          if (addRemoveClassName.length) {
            addRemoveClassName += " ";
          }
          addRemoveClassName += pendClasses(
            options.removeClass,
            REMOVE_CLASS_SUFFIX,
          );
        }

        // there may be a situation where a structural animation is combined together
        // with CSS classes that need to resolve before the animation is computed.
        // However this means that there is no explicit CSS code to block the animation
        // from happening (by setting 0s none in the class name). If this is the case
        // we need to apply the classes before the first rAF so we know to continue if
        // there actually is a detected transition or keyframe animation
        if (options.applyClassesEarly && addRemoveClassName.length) {
          applyAnimationClasses(element, options as AnimationOptions);
        }

        let preparationClasses = [structuralClassName, addRemoveClassName]
          .join(" ")
          .trim();

        const hasToStyles = !!(styles.to && keys(styles.to).length > 0);

        const containsKeyframeAnimation =
          (options.keyframeStyle || "").length > 0;

        // there is no way we can trigger an animation if no styles and
        // no classes are being applied which would then trigger a transition,
        // unless there a is raw keyframe value that is applied to the element.
        if (!containsKeyframeAnimation && !hasToStyles && !preparationClasses) {
          return closeAndReturnNoopAnimator();
        }

        let stagger: Partial<StaggerTimings>;

        let cacheKey = animateCache._cacheKey(
          node,
          method || "",
          options.addClass,
          options.removeClass,
        );

        if (animateCache._containsCachedAnimationWithoutDuration(cacheKey)) {
          preparationClasses = "";

          return closeAndReturnNoopAnimator();
        }

        const staggerOption = options.stagger;

        const staggerVal =
          typeof staggerOption === "number"
            ? staggerOption
            : parseFloat(String(staggerOption));

        if (!isNaN(staggerVal) && staggerVal > 0) {
          stagger = {
            transitionDelay: staggerVal,
            animationDelay: staggerVal,
            transitionDuration: 0,
            animationDuration: 0,
          };
        } else {
          stagger = computeCachedCssStaggerStyles(
            node,
            preparationClasses,
            cacheKey,
            DETECT_STAGGER_CSS_PROPERTIES,
          );
        }

        if (!options._skipPreparationClasses) {
          element.classList.add(
            ...preparationClasses.split(" ").filter((x) => x !== ""),
          );
        }

        let applyOnlyDuration;

        if (options.transitionStyle) {
          const transitionStyle: InlineStyleEntry = [
            "transition",
            options.transitionStyle,
          ];

          applyInlineStyle(node, transitionStyle);
          temporaryStyles.push(transitionStyle);
        }

        const durationValue =
          typeof options.duration === "number"
            ? options.duration
            : parseFloat(String(options.duration));

        if (!isNaN(durationValue) && durationValue >= 0) {
          applyOnlyDuration = node.style.transition.length > 0;
          const durationStyle = getCssTransitionDurationStyle(
            durationValue,
            applyOnlyDuration,
          );

          // we set the duration so that it will be picked up by getComputedStyle later
          applyInlineStyle(node, durationStyle);

          temporaryStyles.push(durationStyle);
        }

        if (options.keyframeStyle) {
          const keyframeStyle: InlineStyleEntry = [
            "animation",
            options.keyframeStyle,
          ];

          applyInlineStyle(node, keyframeStyle);
          temporaryStyles.push(keyframeStyle);
        }

        const staggerIndex = options.staggerIndex ?? 0;

        const itemIndex = stagger
          ? staggerIndex >= 0
            ? staggerIndex
            : animateCache._count(cacheKey)
          : 0;

        const isFirst = itemIndex === 0;

        // this is a pre-emptive way of forcing the setup classes to be added and applied INSTANTLY
        // without causing any combination of transitions to kick in. By adding a negative delay value
        // it forces the setup class' transition to end immediately. We later then remove the negative
        // transition delay to allow for the transition to naturally do it's thing. The beauty here is
        // that if there is no transition defined then nothing will happen and this will also allow
        // other transitions to be stacked on top of each other without any chopping them out.
        if (isFirst) {
          blockTransitions(node, SAFE_FAST_FORWARD_DURATION_VALUE);
        }

        let timings = computeTimings(node, cacheKey, !isStructural);

        let relativeDelay = timings.maxDelay;

        maxDelay = Math.max(relativeDelay, 0);

        ({ maxDuration } = timings);

        const flags: AnimationFlags = {
          _hasTransitions: timings.transitionDuration > 0,
          _hasAnimations: timings.animationDuration > 0,
          _hasTransitionAll: false,
          _applyTransitionDuration: false,
          _applyAnimationDuration: false,
          _applyTransitionDelay: false,
          _applyAnimationDelay: false,
          _recalculateTimingStyles: addRemoveClassName.length > 0,
          _blockTransition: false,
          _blockKeyframeAnimation: false,
        };

        flags._hasTransitionAll =
          flags._hasTransitions && timings.transitionProperty === "all";
        flags._applyTransitionDuration =
          hasToStyles &&
          ((flags._hasTransitions && !flags._hasTransitionAll) ||
            (flags._hasAnimations && !flags._hasTransitions));
        flags._applyAnimationDuration =
          !!options.duration && flags._hasAnimations;
        flags._applyTransitionDelay =
          truthyTimingValue(options.delay) &&
          (flags._applyTransitionDuration || flags._hasTransitions);
        flags._applyAnimationDelay =
          truthyTimingValue(options.delay) && flags._hasAnimations;

        if (flags._applyTransitionDuration || flags._applyAnimationDuration) {
          maxDuration = options.duration
            ? parseFloat(String(options.duration))
            : maxDuration;

          if (flags._applyTransitionDuration) {
            flags._hasTransitions = true;
            timings.transitionDuration = maxDuration;
            applyOnlyDuration = node.style.transitionProperty.length > 0;
            temporaryStyles.push(
              getCssTransitionDurationStyle(maxDuration, !!applyOnlyDuration),
            );
          }

          if (flags._applyAnimationDuration) {
            flags._hasAnimations = true;
            timings.animationDuration = maxDuration;
            temporaryStyles.push(getCssKeyframeDurationStyle(maxDuration));
          }
        }

        if (maxDuration === 0 && !flags._recalculateTimingStyles) {
          return closeAndReturnNoopAnimator();
        }

        activeClasses = pendClasses(preparationClasses, ACTIVE_CLASS_SUFFIX);

        if (!isNullOrUndefined(delayOption)) {
          if (typeof delayOption !== "boolean") {
            delayStyle = getCssDelayStyle(parseFloat(delayOption));
            // number in options.delay means we have to recalculate the delay for the closing timeout
            maxDelay = Math.max(parseFloat(delayOption), 0);
          }

          if (flags._applyTransitionDelay) {
            temporaryStyles.push(delayStyle || getCssDelayStyle(0));
          }

          if (flags._applyAnimationDelay) {
            temporaryStyles.push(
              delayStyle
                ? [
                    delayStyle[0] === "transitionDelay"
                      ? "animationDelay"
                      : delayStyle[0],
                    delayStyle[1],
                  ]
                : getCssDelayStyle(0, true),
            );
          }
        }

        // we need to recalculate the delay value since we used a pre-emptive negative
        // delay value and the delay value is required for the final event checking. This
        // property will ensure that this will happen after the RAF phase has passed.
        if (
          isNullOrUndefined(options.duration) &&
          timings.transitionDuration > 0
        ) {
          flags._recalculateTimingStyles =
            flags._recalculateTimingStyles || isFirst;
        }

        maxDelayTime = maxDelay * ONE_SECOND;
        maxDurationTime = maxDuration * ONE_SECOND;

        flags._blockTransition = timings.transitionDuration > 0;
        flags._blockKeyframeAnimation =
          timings.animationDuration > 0 &&
          (stagger.animationDelay ?? 0) > 0 &&
          (stagger.animationDuration ?? 0) === 0;

        if (options.from) {
          if (options.cleanupStyles) {
            registerRestorableStyles(restoreStyles, node, keys(options.from));
          }
          applyAnimationFromStyles(element, options as AnimationOptions);
        }

        if (flags._blockTransition || flags._blockKeyframeAnimation) {
          applyBlocking(maxDuration);
        } else if (!options.skipBlocking) {
          blockTransitions(node, 0);
        }

        // TODO(matsko): for 1.5 change this code to have an animator object for better debugging
        return {
          _willAnimate: true,
          end: endFn,
          start() {
            if (animationClosed) {
              const noopRunner = new AnimateRunner();

              noopRunner.complete(true);

              return noopRunner;
            }

            runnerHost = {
              end: endFn,
              cancel: cancelFn,
              resume: undefined, // this will be set during the start() phase
              pause: undefined,
            };

            runner = new AnimateRunner(runnerHost);

            waitUntilQuiet(start);

            // we don't have access to pause/resume the animation
            // since it hasn't run yet. AnimateRunner will therefore
            // set noop functions for resume and pause and they will
            // later be overridden once the animation is triggered
            return runner!;
          },
        };

        function endFn() {
          close();
        }

        function cancelFn() {
          close(true);
        }

        /**
         * Closes the active animation and resolves the runner.
         */
        function close(rejected?: boolean) {
          // if the promise has been called already then we shouldn't close
          // the animation again
          if (animationClosed || (animationCompleted && animationPaused))
            return;
          animationClosed = true;
          animationPaused = false;

          if (preparationClasses && !options._skipPreparationClasses) {
            element.classList.remove(...preparationClasses.split(" "));
          }
          activeClasses = pendClasses(preparationClasses, ACTIVE_CLASS_SUFFIX);

          if (activeClasses) {
            element.classList.remove(...activeClasses.split(" "));
          }

          _blockKeyframeAnimations(node, false);
          blockTransitions(node, 0);

          temporaryStyles.forEach((entry) => {
            // There is only one way to remove inline style properties entirely from elements.
            // By using `removeProperty` this works, but we need to convert camel-cased CSS
            // styles down to hyphenated values.
            node.style.removeProperty(entry[0]);
          });

          applyAnimationClasses(element, options as AnimationOptions);
          applyAnimationStyles(element, options as AnimationOptions);

          if (keys(restoreStyles).length) {
            entries(restoreStyles).forEach(([prop, value]) => {
              if (value) {
                node.style.setProperty(prop, value);
              } else {
                node.style.removeProperty(prop);
              }
            });
          }

          // the reason why we have this option is to allow a synchronous closing callback
          // that is fired as SOON as the animation ends (when the CSS is removed) or if
          // the animation never takes off at all. A good example is a leave animation since
          // the element must be removed just after the animation is over or else the element
          // will appear on screen for one animation frame causing an overbearing flicker.
          if (options.onDone) {
            options.onDone();
          }

          if (events && events.length) {
            // Remove the transitionend / animationend listener(s)
            events.forEach((i) =>
              element.removeEventListener(i, onAnimationProgress),
            );
          }

          // Cancel the fallback closing timeout and remove the timer data
          const animationTimerData = getCacheData(element, ANIMATE_TIMER_KEY);

          if (animationTimerData) {
            clearTimeout(animationTimerData[0].timer);
            removeElementData(element, ANIMATE_TIMER_KEY);
          }

          // if the preparation function fails then the promise is not setup
          if (runner) {
            runner.complete(!rejected);
          }
        }

        /**
         * Applies temporary blocking styles for transitions and keyframes.
         */
        function applyBlocking(duration: number): void {
          if (flags._blockTransition) {
            blockTransitions(node, duration);
          }

          if (flags._blockKeyframeAnimation) {
            _blockKeyframeAnimations(node, !!duration);
          }
        }

        function closeAndReturnNoopAnimator() {
          runner = new AnimateRunner({
            end: endFn,
            cancel: cancelFn,
          });

          // should flush the cache animation
          waitUntilQuiet(() => {
            /* empty */
          });
          close();

          return {
            _willAnimate: false,
            start() {
              return runner!;
            },
            end: endFn,
          };
        }

        /**
         * Handles transition/keyframe progress events and completes the animation when done.
         */
        function onAnimationProgress(
          event: Event & { originalEvent?: any },
        ): void {
          event.stopPropagation();
          const ev = event.originalEvent || event;

          if (ev.target !== node) {
            // Since TransitionEvent / AnimationEvent bubble up,
            // we have to ignore events by finished child animations
            return;
          }

          // we now always use `Date.now()` due to the recent changes with
          // event.timeStamp in Firefox, Webkit and Chrome (see #13494 for more info)
          const timeStamp = ev.$manualTimeStamp || Date.now();

          /* Firefox (or possibly just Gecko) likes to not round values up
           * when a ms measurement is used for the animation */
          const elapsedTime = parseFloat(
            ev.elapsedTime.toFixed(ELAPSED_TIME_MAX_DECIMAL_PLACES),
          );

          /* $manualTimeStamp is a mocked timeStamp value which is set
           * within browserTrigger(). This is only here so that tests can
           * mock animations properly. Real events fallback to event.timeStamp,
           * or, if they don't, then a timeStamp is automatically created for them.
           * We're checking to see if the timeStamp surpasses the expected delay,
           * but we're using elapsedTime instead of the timeStamp on the 2nd
           * pre-condition since animationPauseds sometimes close off early */
          if (
            Math.max(timeStamp - startTime, 0) >= maxDelayTime &&
            elapsedTime >= maxDuration
          ) {
            // we set this flag to ensure that if the transition is paused then, when resumed,
            // the animation will automatically close itself since transitions cannot be paused.
            animationCompleted = true;
            close();
          }
        }

        function start() {
          if (animationClosed) return;

          if (!node.parentNode) {
            close();

            return;
          }

          // even though we only pause keyframe animations here the pause flag
          // will still happen when transitions are used. Only the transition will
          // not be paused since that is not possible. If the animation ends when
          // paused then it will not complete until unpaused or cancelled.
          const playPause = function (playAnimation: boolean) {
            if (!animationCompleted) {
              animationPaused = !playAnimation;

              if (timings.animationDuration) {
                const value = _blockKeyframeAnimations(node, animationPaused);

                if (animationPaused) {
                  temporaryStyles.push(value);
                } else {
                  const index = temporaryStyles.indexOf(value);

                  if (index !== -1) {
                    temporaryStyles.splice(index, 1);
                  }
                }
              }
            } else if (animationPaused && playAnimation) {
              animationPaused = false;
              close();
            }
          };

          // checking the stagger duration prevents an accidentally cascade of the CSS delay style
          // being inherited from the parent. If the transition duration is zero then we can safely
          // rely that the delay value is an intentional stagger delay style.
          const maxStagger =
            itemIndex > 0 &&
            ((timings.transitionDuration && stagger.transitionDuration === 0) ||
              (timings.animationDuration && stagger.animationDuration === 0)) &&
            Math.max(stagger.animationDelay ?? 0, stagger.transitionDelay ?? 0);

          if (maxStagger) {
            setTimeout(
              triggerAnimationStart,
              Math.floor(maxStagger * itemIndex * ONE_SECOND),
              false,
            );
          } else {
            triggerAnimationStart();
          }

          // this will decorate the existing promise runner with pause/resume methods
          runnerHost.resume = function () {
            playPause(true);
          };

          runnerHost.pause = function () {
            playPause(false);
          };

          function triggerAnimationStart() {
            // just incase a stagger animation kicks in when the animation
            // itself was cancelled entirely
            if (animationClosed) return;

            applyBlocking(0);

            temporaryStyles.forEach((entry) => {
              const key = entry[0];

              node.style.setProperty(key, entry[1]);
            });

            applyAnimationClasses(element, options as AnimationOptions);
            element.classList.add(
              ...activeClasses.split(" ").filter((x) => x !== ""),
            );

            if (flags._recalculateTimingStyles) {
              cacheKey = animateCache._cacheKey(
                node,
                method || "",
                options.addClass,
                options.removeClass,
              );

              timings = computeTimings(node, cacheKey, false);
              relativeDelay = timings.maxDelay;
              maxDelay = Math.max(relativeDelay, 0);

              ({ maxDuration } = timings);

              if (maxDuration === 0) {
                close();

                return;
              }

              flags._hasTransitions = timings.transitionDuration > 0;
              flags._hasAnimations = timings.animationDuration > 0;
            }

            if (flags._applyAnimationDelay) {
              relativeDelay =
                typeof options.delay !== "boolean" &&
                truthyTimingValue(options.delay)
                  ? parseFloat(String(options.delay))
                  : relativeDelay;

              maxDelay = Math.max(relativeDelay, 0);
              timings.animationDelay = relativeDelay;
              delayStyle = getCssDelayStyle(relativeDelay, true);
              temporaryStyles.push(delayStyle);
              node.style.setProperty(delayStyle[0], delayStyle[1]);
            }

            maxDelayTime = maxDelay * ONE_SECOND;
            maxDurationTime = maxDuration * ONE_SECOND;

            if (options.easing) {
              let easeProp;

              const easeVal = options.easing;

              if (flags._hasTransitions) {
                easeProp = "transitionTimingFunction";
                temporaryStyles.push([easeProp, easeVal]);
                node.style.setProperty(easeProp, easeVal);
              }

              if (flags._hasAnimations) {
                easeProp = "animationTimingFunction";
                temporaryStyles.push([easeProp, easeVal]);
                node.style.setProperty(easeProp, easeVal);
              }
            }

            if (timings.transitionDuration) {
              events.push("transitionend");
            }

            if (timings.animationDuration) {
              events.push("animationend");
            }

            startTime = Date.now();
            const timerTime =
              maxDelayTime + CLOSING_TIME_BUFFER * maxDurationTime;

            const endTime = startTime + timerTime;

            const animationsData =
              getCacheData(element, ANIMATE_TIMER_KEY) || [];

            let setupFallbackTimer = true;

            if (animationsData.length) {
              const currentTimerData = animationsData[0];

              setupFallbackTimer = endTime > currentTimerData.expectedEndTime;

              if (setupFallbackTimer) {
                clearTimeout(currentTimerData.timer);
              } else {
                animationsData.push(close);
              }
            }

            if (setupFallbackTimer) {
              const timer = setTimeout(onAnimationExpired, timerTime, false);

              animationsData[0] = {
                timer,
                expectedEndTime: endTime,
              };
              animationsData.push(close);
              setCacheData(element, ANIMATE_TIMER_KEY, animationsData);
            }

            if (events.length) {
              events.forEach((x) => {
                element.addEventListener(x, onAnimationProgress);
              });
            }

            if (options.to) {
              if (options.cleanupStyles) {
                registerRestorableStyles(restoreStyles, node, keys(options.to));
              }
              applyAnimationToStyles(element, options as AnimationOptions);
            }
          }

          function onAnimationExpired() {
            const animationsData = getCacheData(element, ANIMATE_TIMER_KEY);

            // this will be false in the event that the element was
            // removed from the DOM (via a leave animation or something
            // similar)
            if (animationsData) {
              for (let i = 1; i < animationsData.length; i++) {
                animationsData[i]();
              }
              removeElementData(element, ANIMATE_TIMER_KEY);
            }
          }
        }
      }

      return init;
    },
  ];
}

/**
 * Temporarily blocks transitions by applying a negative transition delay.
 */
function blockTransitions(
  node: HTMLElement,
  duration: number,
): InlineStyleEntry {
  // we use a negative delay value since it performs blocking
  // yet it doesn't kill any existing transitions running on the
  // same element which makes this safe for class-based animations
  const value = duration ? `-${duration}s` : "";

  applyInlineStyle(node, ["transitionDelay", value]);

  return ["transitionDelay", value];
}
