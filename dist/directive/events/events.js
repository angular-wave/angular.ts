import { _parse, _exceptionHandler } from '../../injection-tokens.js';
import { directiveNormalize, isString } from '../../shared/utils.js';
import { getNormalizedAttr, hasNormalizedAttr, getInheritedData } from '../../shared/dom.js';
import { AFTER_RENDER_EVENT_SCHEDULER_KEY } from '../../core/render/after-render.js';

/*
 * A collection of directives that allows creation of custom event handlers that are defined as
 * AngularTS expressions and are compiled and executed within the current scope.
 */
const EVENT_NAMES = [
    "blur",
    "change",
    "click",
    "copy",
    "cut",
    "dblclick",
    "focus",
    "input",
    "keydown",
    "keyup",
    "load",
    "mousedown",
    "mouseenter",
    "mouseleave",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "paste",
    "submit",
    "touchstart",
    "touchend",
    "touchmove",
];
function directiveNameForEvent(eventName) {
    return directiveNormalize(`ng-${eventName}`);
}
function createEventDirectiveFactory(eventName) {
    const directiveName = directiveNameForEvent(eventName);
    return [
        _parse,
        _exceptionHandler,
        /**
         * Creates the event directive factory for this DOM event name.
         */
        ($parse, $exceptionHandler) => {
            return createEventDirective($parse, $exceptionHandler, directiveName, eventName);
        },
    ];
}
const ngEventDirectives = EVENT_NAMES.reduce((directives, eventName) => {
    directives[directiveNameForEvent(eventName)] =
        createEventDirectiveFactory(eventName);
    return directives;
}, {});
const ngClickDirective = ngEventDirectives.ngClick;
/**
 * Creates a directive that evaluates an expression when the element event fires.
 */
function createEventDirective($parse, $exceptionHandler, directiveName, eventName) {
    return {
        restrict: "A",
        compile(element) {
            const expression = getNormalizedAttr(element, directiveName);
            if (!isString(expression))
                return () => undefined;
            const eventBehavior = readEventBehavior(element);
            const fn = $parse(expression);
            return (scope, element) => {
                const handler = (event) => {
                    if (eventBehavior._prevent) {
                        event.preventDefault();
                    }
                    if (eventBehavior._stop) {
                        event.stopPropagation();
                    }
                    try {
                        fn(scope, { $event: event });
                    }
                    catch (error) {
                        $exceptionHandler(error);
                    }
                    finally {
                        scheduleEventAfterRender(scope, element);
                    }
                };
                if (eventBehavior._listenerOptions) {
                    element.addEventListener(eventName, handler, eventBehavior._listenerOptions);
                }
                else {
                    element.addEventListener(eventName, handler);
                }
                scope.$on("$destroy", () => {
                    if (eventBehavior._listenerOptions) {
                        element.removeEventListener(eventName, handler, eventBehavior._listenerOptions);
                    }
                    else {
                        element.removeEventListener(eventName, handler);
                    }
                });
            };
        },
    };
}
function readEventBehavior(element) {
    const prevent = hasNormalizedAttr(element, "eventPrevent");
    const stop = hasNormalizedAttr(element, "eventStop");
    const capture = hasNormalizedAttr(element, "eventCapture");
    const once = hasNormalizedAttr(element, "eventOnce");
    const passive = hasNormalizedAttr(element, "eventPassive");
    if (prevent && passive) {
        throw new Error("data-event-prevent cannot be combined with data-event-passive because passive listeners cannot prevent default.");
    }
    return {
        _prevent: prevent,
        _stop: stop,
        _listenerOptions: capture || once || passive
            ? {
                capture,
                once,
                passive,
            }
            : undefined,
    };
}
function scheduleEventAfterRender(scope, element) {
    const scheduler = getInheritedData(element, AFTER_RENDER_EVENT_SCHEDULER_KEY);
    const scheduleCallback = scope._scheduleCallback;
    if (!scheduler) {
        return;
    }
    if (scheduleCallback) {
        scheduleCallback.call(scope, scheduler);
        return;
    }
    scheduler();
}
/**
 * Creates a directive that evaluates an expression when a global event target fires.
 */
function createWindowEventDirective($parse, $exceptionHandler, target, directiveName, eventName) {
    return {
        restrict: "A",
        compile(element) {
            const expression = getNormalizedAttr(element, directiveName);
            if (!isString(expression))
                return () => undefined;
            const fn = $parse(expression);
            return (scope) => {
                const handler = (event) => {
                    try {
                        fn(scope, { $event: event });
                    }
                    catch (error) {
                        $exceptionHandler(error);
                    }
                    finally {
                        scheduleEventAfterRender(scope, element);
                    }
                };
                target.addEventListener(eventName, handler);
                scope.$on("$destroy", () => {
                    target.removeEventListener(eventName, handler);
                });
            };
        },
    };
}

export { createEventDirective, createWindowEventDirective, ngClickDirective, ngEventDirectives };
