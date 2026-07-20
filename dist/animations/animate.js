import { isString, createErrorFactory, isFunction, assign, assertDefined } from '../shared/utils.js';
import { domInsert, removeElement } from '../shared/dom.js';

const $animateError = createErrorFactory("$animate");
class AnimationHandle {
    constructor(result, controller = new AbortController(), cleanup) {
        this._doneCallbacks = [];
        this._settled = false;
        this._status = true;
        this.controller = controller;
        this._cleanup = cleanup;
        const results = Array.isArray(result) ? result : [result];
        this._animations = results.filter((item) => !!item && "finished" in item);
        const promises = results.map(async (item) => {
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
    async catch(onrejected) {
        return this.finished.catch(onrejected);
    }
    async finally(onfinally) {
        return this.finished.finally(onfinally);
    }
    done(callback) {
        if (this._settled) {
            callback(this._status);
            return;
        }
        this._doneCallbacks.push(callback);
    }
    cancel() {
        this._status = false;
        this._animations.forEach((animation) => {
            animation.cancel();
        });
        this.controller.abort();
        this.complete(false);
    }
    finish() {
        this._animations.forEach((animation) => {
            animation.finish();
        });
        this.complete(true);
    }
    pause() {
        this._animations.forEach((animation) => {
            animation.pause();
        });
    }
    play() {
        this._animations.forEach((animation) => {
            animation.play();
        });
    }
    complete(status = true) {
        if (this._settled)
            return;
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
const DEFAULT_DURATION = 150;
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
    "collapse",
    "expand",
]);
/** @internal */
class AnimationRegistry {
    constructor() {
        this._registrations = new Map();
        this._destroyed = false;
    }
    register(name, preset) {
        this.assertActive();
        if (!name || !isString(name)) {
            throw $animateError("noname", "Animation name must be a string.");
        }
        const normalizedName = normalizeAnimationName(name);
        this._registrations.set(normalizedName, preset);
    }
    get(name) {
        this.assertActive();
        return this._registrations.get(name);
    }
    has(name) {
        this.assertActive();
        return this._registrations.has(name);
    }
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this._registrations.clear();
    }
    assertActive() {
        if (this._destroyed) {
            throw new Error("Animation registry has already been disposed.");
        }
    }
}
/** @internal */
function createAnimateService(registry, $injector) {
    const resolvedPresets = new Map();
    const activeHandles = new WeakMap();
    const resolvePreset = (element, options) => {
        const name = animationNameFor(element, options);
        if (!name)
            return undefined;
        const registration = registry.get(name);
        if (!registration)
            return undefined;
        const resolved = resolvedPresets.get(name);
        if (resolved?.registration === registration) {
            return resolved.preset;
        }
        const preset = isFunction(registration) || Array.isArray(registration)
            ? $injector.invoke(registration)
            : registration;
        resolvedPresets.set(name, { registration, preset });
        return preset;
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
        const cssPresetClass = animationName && !registry.has(animationName)
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
        const preset = resolvedPreset;
        const handler = preset?.[phase];
        let result;
        let animationCleanup;
        const cssPresetCleanup = animationName
            ? prepareCssPreset(element, animationName, phase)
            : undefined;
        if (isFunction(handler)) {
            result = handler(element, context, options);
        }
        else {
            const optionKeyframes = keyframesForPhase(phase, options);
            const keyframes = optionKeyframes ?? handler;
            const cssAnimation = keyframes
                ? undefined
                : cssAnimationForPhase(element, phase);
            if (keyframes) {
                result = element.animate(keyframes, animationOptionsFor(preset, options));
            }
            else if (cssAnimation) {
                const cssResult = runCssAnimation(element, cssAnimation);
                if (animationName && isAutoHeightPreset(animationName)) {
                    applyCssAnimationTiming(cssResult.animations, options);
                }
                result = cssResult.animations;
                animationCleanup = cssResult.cleanup;
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
        cancel(handle) {
            handle?.cancel();
        },
        define: (name, preset) => {
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
        animate: (element, from, to, className, options) => {
            const toStyles = to ?? {};
            if (className)
                element.classList.add(...splitClasses(className));
            assign(element.style, from);
            return run("animate", element, { ...options, from, to: toStyles }, { from, to: toStyles, className }, () => {
                assign(element.style, toStyles);
            });
        },
        async transition(update) {
            const startViewTransition = Reflect.get(document, "startViewTransition");
            if (!isFunction(startViewTransition)) {
                await update();
                return;
            }
            await startViewTransition.call(document, update).finished;
        },
    };
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
function prepareCssPreset(element, name, phase) {
    if (!isAutoHeightPreset(name) ||
        (phase !== "enter" && phase !== "leave") ||
        !(element instanceof HTMLElement)) {
        return undefined;
    }
    const property = "--ng-animate-auto-height";
    const previousHeight = element.style.getPropertyValue(property);
    const height = phase === "enter"
        ? element.scrollHeight
        : element.offsetHeight || element.scrollHeight;
    element.style.setProperty(property, `${String(height)}px`);
    return () => {
        if (previousHeight) {
            element.style.setProperty(property, previousHeight);
        }
        else {
            element.style.removeProperty(property);
        }
    };
}
function isAutoHeightPreset(name) {
    return name === "collapse" || name === "expand";
}
function animationNameFor(element, options) {
    const explicit = options?.animation;
    if (explicit)
        return normalizeAnimationName(explicit);
    const value = element.dataset.animate ?? element.getAttribute("animate");
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
    return [from ?? {}, to ?? {}];
}
function animationOptionsFor(preset, options) {
    const defaults = preset?.options ?? {};
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
    const value = readCssAnimationProperty(styles, CSS_ANIMATION_PROPERTIES[phase]) ??
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
function applyCssAnimationTiming(animations, options) {
    const timing = {};
    const timingKeys = [
        "delay",
        "direction",
        "duration",
        "easing",
        "endDelay",
        "fill",
        "iterationStart",
        "iterations",
    ];
    timingKeys.forEach((key) => {
        const value = options[key];
        if (value !== undefined) {
            Object.assign(timing, { [key]: value });
        }
    });
    if (Object.keys(timing).length === 0)
        return;
    animations.forEach((animation) => {
        animation.effect?.updateTiming(timing);
    });
}
function shouldSkipAnimation(element, options) {
    if (!("animate" in element))
        return true;
    if (document.hidden)
        return true;
    if (options.duration === 0)
        return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { AnimationHandle, AnimationRegistry, createAnimateService };
