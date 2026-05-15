import { _injector } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { getDirectiveAttr, removeElement, domInsert } from '../../shared/dom.js';
import { values } from '../../shared/utils.js';

class NgSwitchController {
    constructor() {
        this._cases = {};
    }
}
ngSwitchDirective.$inject = [_injector];
/** Switches between transcluded case blocks and animates block entry/exit. */
function ngSwitchDirective($injector) {
    const getAnimate = createLazyAnimate($injector);
    return {
        require: "ngSwitch",
        // asks for $scope to fool the BC controller module
        controller: NgSwitchController,
        link(scope, element, attr, ngSwitchController) {
            const watchExpr = getDirectiveAttr(element, attr, "ngSwitch") ||
                getDirectiveAttr(element, attr, "on") ||
                "";
            let selectedTranscludes = [];
            const selectedElements = [];
            const previousLeaveAnimations = new Set();
            const selectedScopes = [];
            scope.$watch(watchExpr, (value) => {
                let i;
                let ii;
                let hasLeaveAnimation = false;
                // Start with the last, in case the array is modified during the loop
                const animate = previousLeaveAnimations.size ? getAnimate() : undefined;
                for (const previous of Array.from(previousLeaveAnimations)) {
                    previousLeaveAnimations.delete(previous);
                    animate?.cancel(previous.handle);
                    removeElement(previous.element);
                }
                for (i = 0, ii = selectedScopes.length; i < ii; ++i) {
                    const selected = selectedElements[i]._clone;
                    selectedScopes[i].$destroy();
                    const leaveAnimate = getAnimateForNode(getAnimate, selected);
                    if (leaveAnimate) {
                        const handle = leaveAnimate.leave(selected);
                        const leaveAnimation = {
                            element: selected,
                            handle,
                        };
                        hasLeaveAnimation = true;
                        previousLeaveAnimations.add(leaveAnimation);
                        handle.done((response) => {
                            if (response) {
                                previousLeaveAnimations.delete(leaveAnimation);
                            }
                        });
                    }
                    else {
                        removeElement(selected);
                    }
                }
                selectedElements.length = 0;
                selectedScopes.length = 0;
                if ((selectedTranscludes =
                    ngSwitchController._cases[`!${value}`] ||
                        ngSwitchController._cases["?"])) {
                    values(selectedTranscludes).forEach((selectedTransclude) => {
                        selectedTransclude.transclude((caseElementParam, selectedScopeParam) => {
                            const caseElement = caseElementParam;
                            const selectedScope = selectedScopeParam;
                            selectedScopes.push(selectedScope);
                            const anchor = selectedTransclude.element;
                            const block = {
                                _clone: caseElement,
                                _comment: document.createComment(""),
                            };
                            selectedElements.push(block);
                            const enterAnimate = getAnimateForNode(getAnimate, caseElement);
                            if (enterAnimate) {
                                const { parentElement } = anchor;
                                if (!parentElement) {
                                    return;
                                }
                                if (hasLeaveAnimation) {
                                    requestAnimationFrame(() => {
                                        enterAnimate.enter(caseElement, parentElement, anchor);
                                    });
                                }
                                else {
                                    enterAnimate.enter(caseElement, parentElement, anchor);
                                }
                            }
                            else {
                                const { parentElement } = anchor;
                                if (!parentElement) {
                                    return;
                                }
                                domInsert(caseElement, parentElement, anchor);
                            }
                        });
                    });
                }
            });
        },
    };
}
function ngSwitchWhenDirective() {
    return {
        transclude: "element",
        terminal: true,
        priority: 1200,
        require: "^ngSwitch",
        link(scope, element, attrs, ctrl, $transclude) {
            if (!$transclude) {
                return;
            }
            const when = getDirectiveAttr(element, attrs, "ngSwitchWhen") || "";
            const separator = getDirectiveAttr(element, attrs, "ngSwitchWhenSeparator");
            (separator !== undefined ? when.split(separator) : [when])
                .sort()
                .filter(
            // Filter duplicate cases
            (elementParam, index, array) => array[index - 1] !== elementParam)
                .forEach((whenCase) => {
                ctrl._cases[`!${whenCase}`] = ctrl._cases[`!${whenCase}`] || [];
                ctrl._cases[`!${whenCase}`].push({
                    transclude: $transclude,
                    element,
                });
            });
        },
    };
}
function ngSwitchDefaultDirective() {
    return {
        transclude: "element",
        terminal: true,
        priority: 1200,
        require: "^ngSwitch",
        link(_scope, element, _attr, ctrl, $transclude) {
            if (!$transclude) {
                return;
            }
            ctrl._cases["?"] = ctrl._cases["?"] || [];
            ctrl._cases["?"].push({
                transclude: $transclude,
                element,
            });
        },
    };
}

export { ngSwitchDefaultDirective, ngSwitchDirective, ngSwitchWhenDirective };
