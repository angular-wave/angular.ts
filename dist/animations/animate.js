import { _injector } from '../injection-tokens.js';
import { isString, assign, assertDefined, createErrorFactory, isFunction } from '../shared/utils.js';
import { domInsert, removeElement } from '../shared/dom.js';

const $animateError = createErrorFactory("$animate");
class AnimationHandle {
    constructor(result, controller = new AbortController(), cleanup) {
        this.doneCallbacks = [];
        this.settled = false;
        this.status = true;
        this.controller = controller;
        this.cleanup = cleanup;
        const results = Array.isArray(result) ? result : [result];
        this.animations = results.filter((item) => !!item && "finished" in item);
        const promises = results.map((item) => {
            if (!item)
                return Promise.resolve();
            if ("finished" in item)
                return item.finished.then(() => undefined);
            return item;
        });
        this.finished = Promise.allSettled(promises).then((settled) => {
            const rejected = settled.some((item) => item.status === "rejected");
            this.complete(!rejected);
            return undefined;
        });
        controller.signal.addEventListener("abort", () => {
            this.cancel();
        }, { once: true });
    }
    then(onfulfilled, onrejected) {
        return this.finished.then(onfulfilled, onrejected);
    }
    catch(onrejected) {
        return this.finished.catch(onrejected);
    }
    finally(onfinally) {
        return this.finished.finally(onfinally);
    }
    done(callback) {
        if (this.settled) {
            callback(this.status);
            return;
        }
        this.doneCallbacks.push(callback);
    }
    cancel() {
        this.status = false;
        this.animations.forEach((animation) => {
            animation.cancel();
        });
        this.controller.abort();
        this.complete(false);
    }
    finish() {
        this.animations.forEach((animation) => {
            animation.finish();
        });
        this.complete(true);
    }
    pause() {
        this.animations.forEach((animation) => {
            animation.pause();
        });
    }
    play() {
        this.animations.forEach((animation) => {
            animation.play();
        });
    }
    complete(status = true) {
        if (this.settled)
            return;
        this.settled = true;
        this.status = status;
        this.cleanup?.(status);
        const callbacks = this.doneCallbacks;
        this.doneCallbacks = [];
        callbacks.forEach((callback) => {
            callback(status);
        });
    }
}
const DEFAULT_DURATION = 150;
const DEFAULT_EASING = "cubic-bezier(0.2, 0, 0, 1)";
const CSS_ANIMATION_PROPERTIES = {
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
]);
const BUILT_IN_PRESETS = {
    // CSS-defined presets live in css/angular.css. Height presets stay here
    // because they need runtime measurements before each animation.
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
AnimateProvider.$inject = [];
function AnimateProvider() {
    this._registeredAnimations = { ...BUILT_IN_PRESETS };
    this._customAnimationNames = new Set();
    this.register = (name, preset) => {
        if (!name || !isString(name)) {
            throw $animateError("noname", "Animation name must be a string.");
        }
        const normalizedName = normalizeAnimationName(name);
        this._registeredAnimations[normalizedName] = preset;
        this._customAnimationNames.add(normalizedName);
    };
    this.$get = [
        _injector,
        ($injector) => {
            const resolvedPresets = new Map();
            const activeHandles = new WeakMap();
            const resolvePreset = (element, options) => {
                const name = animationNameFor(element, options);
                if (!name)
                    return undefined;
                if (resolvedPresets.has(name)) {
                    return {
                        preset: assertDefined(resolvedPresets.get(name)),
                        custom: this._customAnimationNames.has(name),
                    };
                }
                const registration = this._registeredAnimations[name];
                if (!registration)
                    return undefined;
                const preset = (isFunction(registration) || Array.isArray(registration)
                    ? $injector.invoke(registration)
                    : registration);
                resolvedPresets.set(name, preset);
                return {
                    preset,
                    custom: this._customAnimationNames.has(name),
                };
            };
            const run = (phase, element, options = {}, contextOverrides = {}, cleanup) => {
                const controller = new AbortController();
                activeHandles.get(element)?.cancel();
                activeHandles.delete(element);
                const context = {
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
                const cssPresetClass = animationName && !this._registeredAnimations[animationName]
                    ? cssPresetClassFor(animationName)
                    : undefined;
                const finishCleanup = (ok) => {
                    if (tempClasses.length) {
                        elementClassList.remove(...tempClasses);
                    }
                    if (cssPresetClass) {
                        elementClassList.remove(cssPresetClass);
                    }
                    if (ok) {
                        options.onDone?.(element, context);
                    }
                    else {
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
                const preset = resolvedPreset?.preset;
                const handler = preset?.[phase];
                let result;
                let animationCleanup;
                if (isFunction(handler)) {
                    result = handler(element, context, options);
                }
                else {
                    const optionKeyframes = keyframesForPhase(phase, options);
                    const customKeyframes = resolvedPreset?.custom && handler ? handler : undefined;
                    const keyframes = optionKeyframes || customKeyframes;
                    const cssAnimation = keyframes
                        ? undefined
                        : cssAnimationForPhase(element, phase);
                    const presetKeyframes = !cssAnimation && !resolvedPreset?.custom ? handler : undefined;
                    if (keyframes) {
                        result = element.animate(keyframes, animationOptionsFor(preset, options));
                    }
                    else if (cssAnimation) {
                        const cssResult = runCssAnimation(element, cssAnimation);
                        result = cssResult.animations;
                        animationCleanup = cssResult.cleanup;
                    }
                    else if (presetKeyframes) {
                        result = element.animate(presetKeyframes, animationOptionsFor(preset, options));
                    }
                    else {
                        const styleKeyframes = keyframesFromStyles(context.from, context.to);
                        result = styleKeyframes
                            ? element.animate(styleKeyframes, animationOptionsFor(preset, options))
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
                cancel(handle) {
                    handle?.cancel?.();
                },
                define: (name, preset) => {
                    this.register(name, preset);
                    resolvedPresets.delete(normalizeAnimationName(name));
                },
                enter: (element, parent, after, options) => {
                    domInsert(element, assertDefined(parent ?? after?.parentNode), after);
                    return run("enter", element, options);
                },
                move: (element, parent, after, options) => {
                    domInsert(element, assertDefined(parent ?? after?.parentNode), after);
                    return run("move", element, options);
                },
                leave: (element, options) => run("leave", element, options, {}, (ok) => {
                    if (ok)
                        removeElement(element);
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
                    if (className)
                        element.classList.add(...splitClasses(className));
                    assign(element.style, from);
                    return run("animate", element, { ...options, from, to }, { from, to, className }, () => {
                        assign(element.style, to);
                    });
                },
                async transition(update) {
                    const documentWithTransitions = document;
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
function splitClasses(className) {
    return className.trim().split(/\s+/).filter(Boolean);
}
function splitOptionClasses(className) {
    if (!className)
        return [];
    return Array.isArray(className)
        ? className.flatMap(splitClasses)
        : splitClasses(className);
}
function normalizeAnimationName(name) {
    return name.startsWith(".") ? name.slice(1) : name;
}
function cssPresetClassFor(name) {
    return CSS_BUILT_IN_PRESETS.has(name)
        ? `ng-animate-preset-${name}`
        : undefined;
}
function animationNameFor(element, options) {
    const explicit = options?.animation;
    if (explicit)
        return normalizeAnimationName(explicit);
    const value = element.dataset.animate || element.getAttribute("animate");
    if (!value || value === "true" || value === "")
        return "fade";
    if (value === "false")
        return undefined;
    return normalizeAnimationName(value);
}
function keyframesForPhase(phase, options) {
    if (options.keyframes)
        return options.keyframes;
    if (phase === "enter")
        return options.enter;
    if (phase === "leave")
        return options.leave;
    if (phase === "move")
        return options.move;
    return undefined;
}
function keyframesFromStyles(from, to) {
    if (!from && !to)
        return undefined;
    return [from || {}, to || {}];
}
function animationOptionsFor(preset, options) {
    const defaults = preset?.options || {};
    const { keyframes: _keyframes, enter, leave, move, animation, tempClasses, onStart, onDone, onCancel, ...rest } = options;
    return {
        duration: DEFAULT_DURATION,
        fill: "both",
        ...defaults,
        ...rest,
    };
}
function cssAnimationForPhase(element, phase) {
    const styles = getComputedStyle(element);
    const value = readCssAnimationProperty(styles, CSS_ANIMATION_PROPERTIES[phase]) ||
        readCssAnimationProperty(styles, "--ng-animation");
    if (!value || value === "none")
        return undefined;
    return value;
}
function readCssAnimationProperty(styles, property) {
    const value = styles.getPropertyValue(property).trim();
    return value || undefined;
}
function runCssAnimation(element, animation) {
    const animatedElement = element;
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
        .filter((currentAnimation) => !previousAnimations.has(currentAnimation) &&
        currentAnimation.playState !== "finished");
    return {
        animations,
        cleanup: () => {
            style.animation = previousAnimation;
        },
    };
}
function shouldSkipAnimation(element, options) {
    if (!("animate" in element))
        return true;
    if (document.hidden)
        return true;
    if (options.duration === 0)
        return true;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
function expandHeight(element, context, options) {
    const target = element;
    const previousOverflow = target.style.overflow;
    const previousHeight = target.style.height;
    const previousOpacity = target.style.opacity;
    const height = `${target.scrollHeight}px`;
    target.style.overflow = "hidden";
    const animation = target.animate([
        { height: "0px", opacity: 0 },
        { height, opacity: 1 },
    ], animationOptionsFor(BUILT_IN_PRESETS.expand, options));
    cleanupHeightAnimation(target, context, animation, {
        height: previousHeight,
        opacity: previousOpacity,
        overflow: previousOverflow,
    });
    return animation;
}
function collapseHeight(element, context, options) {
    const target = element;
    const previousOverflow = target.style.overflow;
    const previousHeight = target.style.height;
    const previousOpacity = target.style.opacity;
    const height = `${target.offsetHeight || target.scrollHeight}px`;
    target.style.height = height;
    target.style.overflow = "hidden";
    const animation = target.animate([
        { height, opacity: 1 },
        { height: "0px", opacity: 0 },
    ], animationOptionsFor(BUILT_IN_PRESETS.collapse, options));
    cleanupHeightAnimation(target, context, animation, {
        height: previousHeight,
        opacity: previousOpacity,
        overflow: previousOverflow,
    });
    return animation;
}
function cleanupHeightAnimation(element, context, animation, previous) {
    let cleaned = false;
    const cleanup = () => {
        if (cleaned)
            return;
        cleaned = true;
        element.style.height = previous.height;
        element.style.opacity = previous.opacity;
        element.style.overflow = previous.overflow;
    };
    context.signal.addEventListener("abort", cleanup, { once: true });
    animation.finished.then(cleanup, cleanup);
}

export { AnimateProvider, AnimationHandle };
