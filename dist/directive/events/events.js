import { _parse, _exceptionHandler } from '../../injection-tokens.js';
import { directiveNormalize } from '../../shared/utils.js';

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
const ngClickDirective = createEventDirectiveFactory("click");
const ngEventDirectives = EVENT_NAMES.reduce((directives, eventName) => {
    directives[directiveNameForEvent(eventName)] =
        createEventDirectiveFactory(eventName);
    return directives;
}, {});
/**
 * Creates a directive that evaluates an expression when the element event fires.
 */
function createEventDirective($parse, $exceptionHandler, directiveName, eventName) {
    return {
        restrict: "A",
        compile(_element, attr) {
            const fn = $parse(attr[directiveName]);
            return (scope, element) => {
                const handler = (event) => {
                    try {
                        fn(scope, { $event: event });
                    }
                    catch (error) {
                        $exceptionHandler(error);
                    }
                };
                element.addEventListener(eventName, handler);
                scope.$on("$destroy", () => element.removeEventListener(eventName, handler));
            };
        },
    };
}
/**
 * Creates a directive that evaluates an expression when the window event fires.
 */
function createWindowEventDirective($parse, $exceptionHandler, $window, directiveName, eventName) {
    return {
        restrict: "A",
        compile(_element, attr) {
            const fn = $parse(attr[directiveName]);
            return (scope) => {
                const handler = (event) => {
                    try {
                        fn(scope, { $event: event });
                    }
                    catch (error) {
                        $exceptionHandler(error);
                    }
                };
                $window.addEventListener(eventName, handler);
                scope.$on("$destroy", () => $window.removeEventListener(eventName, handler));
            };
        },
    };
}

export { createEventDirective, createWindowEventDirective, ngClickDirective, ngEventDirectives };
