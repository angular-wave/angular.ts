import { getNormalizedAttr, emptyElement, removeElement, createDocumentFragment } from '../../shared/dom.js';
import { NodeType } from '../../shared/node.js';
import { getCompiledFragmentRecord, replaceCompiledFragmentNodes } from '../../core/compile/incremental-fragment.js';
import { stringify, isInstanceOf, arrayFrom, isFunction, isArray, assertDefined } from '../../shared/utils.js';

/** Creates a per-directive realtime DOM swap handler. */
function createRealtimeSwapHandler({ $compile, $log, getAnimate, scope, element, logPrefix, }) {
    let content;
    let destroyed = false;
    const ownedFragments = new Set();
    const activeAnimations = new Set();
    const placeholders = new Set();
    scope.$on("$destroy", () => {
        destroyed = true;
        activeAnimations.forEach((animation) => {
            animation.cancel();
        });
        activeAnimations.clear();
        placeholders.forEach((placeholder) => {
            placeholder.parentNode?.removeChild(placeholder);
        });
        placeholders.clear();
        disposeFragments(ownedFragments);
        content = undefined;
    });
    return (html, swap, options = {}) => {
        if (destroyed)
            return false;
        const animationEnabled = !!getNormalizedAttr(element, "animate");
        const animate = animationEnabled ? getAnimate() : undefined;
        let nodes = [];
        if (!["textContent", "delete", "none"].includes(swap)) {
            if (!html)
                return false;
            const compiled = $compile(stringify(html))(scope);
            nodes = isInstanceOf(compiled, DocumentFragment)
                ? arrayFrom(compiled.childNodes)
                : [compiled];
            trackFragments(ownedFragments, nodes);
        }
        const targetSelector = options.targetSelector ??
            element.getAttribute("data-target") ??
            undefined;
        const target = targetSelector
            ? document.querySelector(targetSelector)
            : element;
        if (!target) {
            disposeNodeFragments(nodes);
            $log.warn(`${logPrefix}: target "${String(targetSelector)}" not found`);
            return false;
        }
        const applySwap = () => {
            if (destroyed) {
                disposeNodeFragments(nodes);
                return false;
            }
            switch (swap) {
                case "outerHTML": {
                    const parent = target.parentNode;
                    if (!parent) {
                        disposeNodeFragments(nodes);
                        return false;
                    }
                    const frag = createDocumentFragment();
                    nodes.forEach((x) => {
                        frag.appendChild(x);
                    });
                    if (!animationEnabled) {
                        parent.replaceChild(frag, target);
                        disposeNodeFragment(target);
                        disposeChildFragments(target);
                        break;
                    }
                    const placeholder = document.createElement("span");
                    const outgoingFragments = collectNodeTreeFragments(target);
                    placeholder.style.display = "none";
                    parent.insertBefore(placeholder, target.nextSibling);
                    placeholders.add(placeholder);
                    trackAnimation(assertDefined(animate).leave(target), (completed) => {
                        if (!completed || destroyed) {
                            placeholder.remove();
                            placeholders.delete(placeholder);
                            disposeNodeFragments(nodes);
                            return;
                        }
                        disposeFragments(outgoingFragments);
                        const insertedNodes = arrayFrom(frag.childNodes);
                        for (const x of insertedNodes) {
                            if (x.nodeType === NodeType._ELEMENT_NODE) {
                                assertDefined(animate).enter(x, parent, placeholder);
                            }
                            else {
                                parent.insertBefore(x, placeholder);
                            }
                        }
                        content = insertedNodes;
                        placeholder.remove();
                        placeholders.delete(placeholder);
                    });
                    break;
                }
                case "textContent":
                    if (animationEnabled) {
                        const parent = target.parentNode;
                        if (!parent)
                            return false;
                        const placeholder = document.createComment("ng-text-swap");
                        const outgoingFragments = collectChildFragments(target);
                        parent.insertBefore(placeholder, target);
                        placeholders.add(placeholder);
                        trackAnimation(assertDefined(animate).leave(target), (completed) => {
                            if (!completed || destroyed) {
                                placeholder.remove();
                                placeholders.delete(placeholder);
                                return;
                            }
                            disposeFragments(outgoingFragments);
                            target.textContent = stringify(html);
                            trackAnimation(assertDefined(animate).enter(target, parent, placeholder), () => {
                                placeholder.remove();
                                placeholders.delete(placeholder);
                            });
                        });
                    }
                    else {
                        disposeChildFragments(target);
                        target.textContent = stringify(html);
                    }
                    break;
                case "beforebegin": {
                    const parent = target.parentNode;
                    if (!parent) {
                        disposeNodeFragments(nodes);
                        return false;
                    }
                    nodes.forEach((node) => {
                        if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
                            assertDefined(animate).enter(node, parent, target);
                        }
                        else {
                            parent.insertBefore(node, target);
                        }
                    });
                    break;
                }
                case "afterbegin": {
                    const { firstChild } = target;
                    [...nodes].reverse().forEach((node) => {
                        if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
                            assertDefined(animate).enter(node, target, firstChild);
                        }
                        else {
                            target.insertBefore(node, firstChild);
                        }
                    });
                    break;
                }
                case "beforeend": {
                    nodes.forEach((node) => {
                        if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
                            assertDefined(animate).enter(node, target);
                        }
                        else {
                            target.appendChild(node);
                        }
                    });
                    break;
                }
                case "afterend": {
                    const parent = target.parentNode;
                    if (!parent) {
                        disposeNodeFragments(nodes);
                        return false;
                    }
                    const { nextSibling } = target;
                    [...nodes].reverse().forEach((node) => {
                        if (animationEnabled && node.nodeType === NodeType._ELEMENT_NODE) {
                            assertDefined(animate).enter(node, parent, nextSibling);
                        }
                        else {
                            parent.insertBefore(node, nextSibling);
                        }
                    });
                    break;
                }
                case "delete":
                    if (animationEnabled) {
                        const outgoingFragments = collectNodeTreeFragments(target);
                        trackAnimation(assertDefined(animate).leave(target), (completed) => {
                            if (!completed || destroyed)
                                return;
                            disposeFragments(outgoingFragments);
                        });
                    }
                    else {
                        disposeNodeFragment(target);
                        disposeChildFragments(target);
                        removeElement(target);
                    }
                    break;
                case "none":
                    break;
                case "innerHTML":
                default:
                    if (animationEnabled) {
                        if (content &&
                            !isArray(content) &&
                            content.nodeType !== NodeType._TEXT_NODE) {
                            const outgoingFragments = collectNodeTreeFragments(content);
                            trackAnimation(assertDefined(animate).leave(content), (completed) => {
                                if (!completed || destroyed) {
                                    disposeNodeFragments(nodes);
                                    return;
                                }
                                disposeFragments(outgoingFragments);
                                content = nodes[0];
                                assertDefined(animate).enter(nodes[0], target);
                            });
                        }
                        else {
                            content = nodes[0];
                            if (content?.nodeType === NodeType._TEXT_NODE) {
                                emptyElement(target);
                                target.replaceChildren(...nodes);
                            }
                            else {
                                assertDefined(animate).enter(nodes[0], target);
                            }
                        }
                    }
                    else {
                        const replacementFragment = getSingleCompiledFragment(nodes);
                        if (replacementFragment) {
                            replaceCompiledFragmentNodes(target, replacementFragment);
                            ownedFragments.add(replacementFragment);
                        }
                        else {
                            disposeChildFragments(target);
                            emptyElement(target);
                            target.replaceChildren(...nodes);
                            trackFragments(ownedFragments, nodes);
                        }
                    }
                    break;
            }
            return true;
        };
        if (shouldUseViewTransition(getNormalizedAttr(element, "viewTransition"), target, animationEnabled)) {
            const documentWithTransitions = document;
            documentWithTransitions.startViewTransition(() => {
                applySwap();
            });
            return true;
        }
        return applySwap();
    };
    function trackAnimation(animation, complete) {
        activeAnimations.add(animation);
        animation.done((completed) => {
            activeAnimations.delete(animation);
            complete(completed);
        });
    }
}
function getSingleCompiledFragment(nodes) {
    let fragment;
    for (const node of nodes) {
        const nodeFragment = getCompiledFragmentRecord(node);
        if (!nodeFragment) {
            return undefined;
        }
        fragment ?? (fragment = nodeFragment);
        if (fragment !== nodeFragment) {
            return undefined;
        }
    }
    return fragment;
}
function trackFragments(fragments, nodes) {
    for (const node of nodes) {
        const fragment = getCompiledFragmentRecord(node);
        if (fragment && !fragment.disposed) {
            fragments.add(fragment);
        }
    }
}
function disposeFragments(fragments) {
    const current = Array.from(fragments);
    fragments.clear();
    for (const fragment of current) {
        fragment.dispose();
    }
}
function disposeNodeFragment(node) {
    const fragment = getCompiledFragmentRecord(node);
    if (fragment && !fragment.disposed) {
        fragment.dispose();
    }
}
function disposeNodeFragments(nodes) {
    const fragments = new Set();
    trackFragments(fragments, nodes);
    disposeFragments(fragments);
}
function disposeChildFragments(target) {
    disposeFragments(collectChildFragments(target));
}
function collectNodeTreeFragments(node) {
    const fragments = new Set();
    const fragment = getCompiledFragmentRecord(node);
    if (fragment && !fragment.disposed) {
        fragments.add(fragment);
    }
    if (node instanceof Element) {
        trackFragments(fragments, Array.from(node.childNodes));
    }
    return fragments;
}
function collectChildFragments(target) {
    const fragments = new Set();
    trackFragments(fragments, Array.from(target.childNodes));
    return fragments;
}
function shouldUseViewTransition(attrValue, target, animationEnabled) {
    if (animationEnabled)
        return false;
    const documentWithTransitions = document;
    const startViewTransition = Reflect.get(documentWithTransitions, "startViewTransition");
    if (!isFunction(startViewTransition))
        return false;
    if (!target.isConnected)
        return false;
    const targetValue = target.getAttribute("data-view-transition");
    return (isTruthyTransitionFlag(attrValue) || isTruthyTransitionFlag(targetValue));
}
function isTruthyTransitionFlag(value) {
    return value === "" || value === true || value === "true";
}

export { createRealtimeSwapHandler };
