import { _injector } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { removeElement, domInsert } from '../../shared/dom.js';
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
        link(scope, _element, attr, ngSwitchController) {
            const watchExpr = attr.ngSwitch || attr.on;
            let selectedTranscludes = [];
            const selectedElements = [];
            const previousLeaveAnimations = [];
            const selectedScopes = [];
            const spliceFactory = function (array, index) {
                return function (response) {
                    if (response !== false)
                        array.splice(index, 1);
                };
            };
            scope.$watch(watchExpr, (value) => {
                let i;
                let ii;
                let runner;
                // Start with the last, in case the array is modified during the loop
                const animate = previousLeaveAnimations.length
                    ? getAnimate()
                    : undefined;
                while (previousLeaveAnimations.length) {
                    animate?.cancel(previousLeaveAnimations.pop());
                }
                for (i = 0, ii = selectedScopes.length; i < ii; ++i) {
                    const selected = selectedElements[i]._clone;
                    selectedScopes[i].$destroy();
                    const leaveAnimate = getAnimateForNode(getAnimate, selected);
                    if (leaveAnimate) {
                        runner = previousLeaveAnimations[i] = leaveAnimate.leave(selected);
                        runner.done(spliceFactory(previousLeaveAnimations, i));
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
                                if (runner) {
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
            attrs.ngSwitchWhen
                .split(attrs.ngSwitchWhenSeparator)
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
