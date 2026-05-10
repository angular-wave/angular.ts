import { _injector, _animateProvider } from '../injection-tokens.js';
import { uppercase, isArray, isFunction, isInstanceOf, isObject } from '../shared/utils.js';
import { prepareAnimationOptions, applyAnimationStyles, applyAnimationClasses } from './shared.js';
import { AnimateRunner } from './runner/animate-runner.js';

AnimateJsProvider.$inject = [_animateProvider];
/**
 * Registers the JavaScript animation driver with the animation provider.
 */
function AnimateJsProvider($animateProvider) {
    this.$get = [
        _injector,
        /**
         * Creates the runtime JavaScript animation driver.
         */
        ($injector) => {
            /**
             * Dispatches one animation request to the matching JS animation handlers.
             */
            return function (element, event, classes, options) {
                // Optional arguments
                if (arguments.length === 3 && !isArray(classes) && isObject(classes)) {
                    options = classes;
                    classes = null;
                }
                const animationOptions = prepareAnimationOptions(options);
                if (!classes) {
                    classes = element.getAttribute("class") || "";
                    if (animationOptions.addClass)
                        classes += ` ${animationOptions.addClass}`;
                    if (animationOptions.removeClass)
                        classes += ` ${animationOptions.removeClass}`;
                }
                const classesToAdd = animationOptions.addClass;
                const classesToRemove = animationOptions.removeClass;
                // Lookup animation objects
                const animations = lookupAnimations(classes);
                let before;
                let after;
                if (animations.length) {
                    let beforeFn;
                    let afterFn;
                    if (event === "leave") {
                        beforeFn = "leave";
                        afterFn = "afterLeave";
                    }
                    else {
                        beforeFn = `before${uppercase(event.charAt(0))}${event.substring(1)}`;
                        afterFn = event;
                    }
                    if (event !== "enter" && event !== "move") {
                        before = packageAnimations(element, animationOptions, animations, beforeFn, {
                            add: classesToAdd,
                            remove: classesToRemove,
                        });
                    }
                    after = packageAnimations(element, animationOptions, animations, afterFn, {
                        add: classesToAdd,
                        remove: classesToRemove,
                    });
                }
                if (!before && !after)
                    return undefined;
                function applyOptions() {
                    animationOptions.domOperation?.();
                    applyAnimationClasses(element, animationOptions);
                }
                function close() {
                    applyOptions();
                    applyAnimationStyles(element, animationOptions);
                }
                let runner;
                const animateJsRunner = {
                    _willAnimate: true,
                    start() {
                        if (runner)
                            return runner;
                        runner = new AnimateRunner({
                            end: () => finish(true),
                            cancel: () => finish(false),
                        });
                        let finished = false;
                        let remaining = (before ? 1 : 0) + (after ? 1 : 0);
                        function partDone() {
                            if (finished)
                                return;
                            if (--remaining === 0)
                                finish(true);
                        }
                        /**
                         * Finalizes the runner and applies any deferred DOM changes.
                         */
                        function finish(success) {
                            if (finished)
                                return;
                            finished = true;
                            close();
                            runner.complete(success);
                        }
                        // Run before animations
                        if (before)
                            before(partDone);
                        else
                            applyOptions();
                        // Run after animations
                        if (after)
                            after(partDone);
                        // If neither before nor after exist, nothing will call partDone()
                        if (remaining === 0)
                            finish(true);
                        return runner;
                    },
                    end() {
                        if (runner)
                            runner.end();
                        else {
                            close();
                            runner = new AnimateRunner();
                            runner.complete(true);
                        }
                        return runner;
                    },
                };
                return animateJsRunner;
                // ---- helpers ----
                /**
                 * Looks up registered JS animation handlers for a class list.
                 */
                function lookupAnimations(classList) {
                    const normalized = isArray(classList)
                        ? classList
                        : classList.split(" ");
                    const matches = [];
                    const flagMap = {};
                    for (let i = 0; i < normalized.length; i++) {
                        const klass = normalized[i];
                        const animationFactory = $animateProvider._registeredAnimations[klass];
                        if (animationFactory && !flagMap[klass]) {
                            matches.push($injector.get(animationFactory));
                            flagMap[klass] = true;
                        }
                    }
                    return matches;
                }
                /**
                 * Packages one phase of matching animation handlers into a runnable operation.
                 */
                function packageAnimations(elementParam, optionsParam, animationsParam, fnName, classNames) {
                    const operations = [];
                    animationsParam.forEach((ani) => {
                        const animationFn = ani[fnName];
                        if (!animationFn)
                            return;
                        operations.push((done) => {
                            if (isFunction(animationFn)) {
                                let args;
                                switch (fnName) {
                                    case "addClass":
                                        args = [elementParam, classNames.add, done];
                                        break;
                                    case "removeClass":
                                        args = [elementParam, classNames.remove, done];
                                        break;
                                    case "setClass":
                                        args = [
                                            elementParam,
                                            classNames.add,
                                            classNames.remove,
                                            done,
                                        ];
                                        break;
                                    case "animate":
                                        args = [
                                            elementParam,
                                            optionsParam.from,
                                            optionsParam.to,
                                            done,
                                        ];
                                        break;
                                    default:
                                        args = [elementParam, done];
                                }
                                const value = animationFn.apply(ani, args);
                                if (isInstanceOf(value, AnimateRunner))
                                    value.done(done);
                            }
                            else
                                done();
                        });
                    });
                    if (!operations.length)
                        return undefined;
                    /**
                     * Runs all packaged operations and signals completion once all are done.
                     */
                    return (done) => {
                        let completed = 0;
                        const total = operations.length;
                        operations.forEach((op) => {
                            op(() => {
                                if (++completed === total && isFunction(done))
                                    done();
                            });
                        });
                    };
                }
            };
        },
    ];
}

export { AnimateJsProvider };
