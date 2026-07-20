import { _templateRequest, _anchorScroll, _injector, _exceptionHandler, _parse, _compile } from '../../injection-tokens.js';
import { assertDefined, isInstanceOf, isDefined } from '../../shared/utils.js';
import { getNormalizedAttr } from '../../shared/dom.js';
import { getCompiledFragmentRecordFromNodes } from '../../core/compile/incremental-fragment.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';

ngIncludeDirective.$inject = [
    _templateRequest,
    _anchorScroll,
    _injector,
    _exceptionHandler,
    _parse,
];
/**
 * Loads external template content, transcludes it, and swaps it into the DOM.
 */
function ngIncludeDirective($templateRequest, $anchorScroll, $injector, $exceptionHandler, $parse) {
    const getAnimate = createLazyAnimate($injector);
    return {
        priority: 400,
        terminal: true,
        transclude: "element",
        controller: () => {
            /* empty */
            return undefined;
        },
        require: "ngInclude",
        compile(element) {
            const srcExp = getNormalizedAttr(element, "ngInclude") ??
                getNormalizedAttr(element, "src") ??
                "";
            const onloadExp = getNormalizedAttr(element, "onload") ?? "";
            const autoScrollExp = getNormalizedAttr(element, "autoscroll");
            const onloadFn = onloadExp ? $parse(onloadExp) : undefined;
            const autoScrollFn = autoScrollExp ? $parse(autoScrollExp) : undefined;
            return (scope, $element, ctrl, $transclude) => {
                if (!$transclude) {
                    return;
                }
                function maybeScroll() {
                    if (isDefined(autoScrollExp) &&
                        (!autoScrollExp || autoScrollFn?.(scope))) {
                        $anchorScroll();
                    }
                }
                let changeCounter = 0;
                let currentScope;
                let previousElement;
                let previousFragment;
                let currentElement;
                let currentFragment;
                const cleanupLastIncludeContent = () => {
                    if (previousElement) {
                        if (previousFragment && !previousFragment.disposed) {
                            previousFragment.dispose();
                        }
                        previousElement = null;
                        previousFragment = null;
                    }
                    if (currentScope) {
                        currentScope.$destroy();
                        currentScope = null;
                    }
                    if (currentElement) {
                        const leavingFragment = currentFragment;
                        const animate = getAnimateForNode(getAnimate, currentElement);
                        if (animate) {
                            animate.leave(currentElement).done((response) => {
                                if (response) {
                                    leavingFragment?.dispose();
                                    previousElement = null;
                                    previousFragment = null;
                                }
                            });
                        }
                        else {
                            if (leavingFragment && !leavingFragment.disposed) {
                                leavingFragment.dispose();
                            }
                        }
                        previousElement = currentElement;
                        previousFragment = currentFragment;
                        currentElement = null;
                        currentFragment = null;
                    }
                };
                scope.$watch(srcExp, (src) => {
                    const afterAnimation = function (response) {
                        if (response) {
                            maybeScroll();
                        }
                    };
                    const thisChangeId = ++changeCounter;
                    if (src) {
                        scope.$emit("$includeContentRequested", src);
                        $templateRequest(src)
                            .then((response) => {
                            if (scope._destroyed)
                                return;
                            if (thisChangeId !== changeCounter)
                                return undefined;
                            const newScope = scope.$new();
                            ctrl.template = response;
                            // Note: This will also link all children of ng-include that were contained in the original
                            // html. If that content contains controllers, ... they could pollute/change the scope.
                            // However, using ng-include on an element with additional content does not make sense...
                            // Note: We can't remove them in the cloneAttchFn of $transclude as that
                            // function is called before linking the content, which would apply child
                            // directives to non existing elements.
                            const clone = $transclude(newScope, (cloneParam) => {
                                cleanupLastIncludeContent();
                                const animate = getAnimateForNode(getAnimate, cloneParam);
                                if (animate) {
                                    animate
                                        .enter(cloneParam, null, $element)
                                        .done(afterAnimation);
                                }
                                else {
                                    $element.after(cloneParam);
                                    maybeScroll();
                                }
                            });
                            currentScope = newScope;
                            currentElement = clone;
                            currentFragment = assertDefined(getCompiledFragmentRecordFromNodes(clone));
                            currentScope.$emit("$includeContentLoaded", src);
                            onloadFn?.(scope);
                            return undefined;
                        })
                            .catch((err) => {
                            if (scope._destroyed)
                                return undefined;
                            if (thisChangeId === changeCounter) {
                                cleanupLastIncludeContent();
                                scope.$emit("$includeContentError", src);
                            }
                            $exceptionHandler(isInstanceOf(err, Error) ? err : new Error(String(err)));
                            return undefined;
                        });
                    }
                    else {
                        cleanupLastIncludeContent();
                        ctrl.template = null;
                    }
                });
            };
        },
    };
}
// This directive is called during the $transclude call of the first `ngInclude` directive.
// It will replace and compile the content of the element with the loaded template.
// We need this directive so that the element content is already filled when
// the link function of another directive on the same element as ngInclude
// is called.
ngIncludeFillContentDirective.$inject = [_compile];
/**
 * Fills the `ngInclude` element with the resolved template content and compiles it.
 */
function ngIncludeFillContentDirective($compile) {
    return {
        priority: -400,
        require: "ngInclude",
        link(scope, $element, ctrl) {
            $element.innerHTML = ctrl.template ?? "";
            $compile($element.childNodes)(scope);
        },
    };
}

export { ngIncludeDirective, ngIncludeFillContentDirective };
