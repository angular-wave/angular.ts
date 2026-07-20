import { _injector } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { getNormalizedAttr, removeElement } from '../../shared/dom.js';
import { snapshotCompiledFragmentNodes, getCompiledFragmentRecordsFromNodes } from '../../core/compile/incremental-fragment.js';

ngIfDirective.$inject = [_injector];
/** Conditionally includes or removes a transcluded block based on the watched expression. */
function ngIfDirective($injector) {
    const getAnimate = createLazyAnimate($injector);
    return {
        transclude: "element",
        priority: 600,
        terminal: true,
        restrict: "A",
        compile(tElement) {
            const expression = getNormalizedAttr(tElement, "ngIf");
            if (typeof expression !== "string") {
                return () => undefined;
            }
            return function ngIfLink($scope, $element, $transclude) {
                if (!$transclude) {
                    return;
                }
                let block = null;
                let blockNodes = [];
                let childScope;
                let blockFragments = [];
                let previousNodes = [];
                let previousFragments = [];
                $scope.$watch(expression, (value) => {
                    if (value) {
                        if (!childScope) {
                            $transclude((clone, newScope) => {
                                childScope = newScope;
                                // Note: We only need the first/last node of the cloned nodes.
                                // However, we need to keep the reference to the dom wrapper as it might be changed later
                                // by a directive with templateUrl when its template arrives.
                                blockNodes = snapshotCompiledFragmentNodes(clone);
                                block =
                                    blockNodes.find((node) => node instanceof Element) ?? null;
                                blockFragments = getCompiledFragmentRecordsFromNodes(clone);
                                const animate = block
                                    ? getAnimateForNode(getAnimate, block)
                                    : undefined;
                                if (animate && block && blockNodes.length === 1) {
                                    animate.enter(block, $element.parentElement, $element);
                                }
                                else {
                                    $element.after(...blockNodes);
                                }
                            });
                        }
                    }
                    else {
                        if (previousNodes.length) {
                            disposeBlock(previousFragments, previousNodes);
                            previousNodes = [];
                            previousFragments = [];
                        }
                        if (childScope) {
                            childScope.$destroy();
                            childScope = null;
                        }
                        if (blockNodes.length) {
                            previousNodes = blockNodes;
                            previousFragments = blockFragments;
                            const leavingBlock = block;
                            const leavingNodes = blockNodes;
                            const leavingFragments = blockFragments;
                            const animate = leavingBlock
                                ? getAnimateForNode(getAnimate, leavingBlock)
                                : undefined;
                            if (animate && leavingBlock && leavingNodes.length === 1) {
                                animate.leave(leavingBlock).done((response) => {
                                    if (response) {
                                        disposeBlock(leavingFragments, leavingNodes);
                                        previousNodes = [];
                                        previousFragments = [];
                                    }
                                });
                            }
                            else {
                                const renderedElement = $element.nextElementSibling;
                                disposeBlock(leavingFragments, leavingNodes);
                                if (renderedElement &&
                                    !leavingNodes.includes(renderedElement) &&
                                    renderedElement.parentNode) {
                                    const renderedFragment = getCompiledFragmentRecordsFromNodes(renderedElement);
                                    disposeBlock(renderedFragment, [renderedElement]);
                                }
                            }
                            block = null;
                            blockNodes = [];
                            blockFragments = [];
                        }
                    }
                });
                function disposeBlock(fragments, nodes) {
                    for (const fragment of fragments) {
                        if (!fragment.disposed) {
                            fragment.dispose();
                        }
                    }
                    for (const node of nodes) {
                        if (!node.parentNode)
                            continue;
                        if (node instanceof Element) {
                            removeElement(node);
                        }
                        else {
                            node.parentNode.removeChild(node);
                        }
                    }
                }
            };
        },
    };
}

export { ngIfDirective };
