import { emptyElement, removeElement, createDocumentFragment } from '../../shared/dom.js';
import { NodeType } from '../../shared/node.js';
import { stringify, isInstanceOf, arrayFrom, isArray, assertDefined } from '../../shared/utils.js';

/** Creates a per-directive realtime DOM swap handler. */
function createRealtimeSwapHandler({ $compile, $log, getAnimate, scope, attrs, element, logPrefix, }) {
    let content;
    return (html, swap, options = {}) => {
        const animationEnabled = !!attrs.animate;
        const animate = animationEnabled ? getAnimate() : undefined;
        let nodes = [];
        if (!["textContent", "delete", "none"].includes(swap)) {
            if (!html)
                return false;
            const compiled = $compile(stringify(html))(scope);
            nodes = isInstanceOf(compiled, DocumentFragment)
                ? arrayFrom(compiled.childNodes)
                : [compiled];
        }
        const targetSelector = (options.targetSelector || attrs.target);
        const target = targetSelector
            ? document.querySelector(targetSelector)
            : element;
        if (!target) {
            $log.warn(`${logPrefix}: target "${targetSelector}" not found`);
            return false;
        }
        const applySwap = () => {
            switch (swap) {
                case "outerHTML": {
                    const parent = target.parentNode;
                    if (!parent)
                        return false;
                    const frag = createDocumentFragment();
                    nodes.forEach((x) => frag.appendChild(x));
                    if (!animationEnabled) {
                        parent.replaceChild(frag, target);
                        break;
                    }
                    const placeholder = document.createElement("span");
                    placeholder.style.display = "none";
                    parent.insertBefore(placeholder, target.nextSibling);
                    assertDefined(animate)
                        .leave(target)
                        .done(() => {
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
                    });
                    break;
                }
                case "textContent":
                    if (animationEnabled) {
                        assertDefined(animate)
                            .leave(target)
                            .done(() => {
                            target.textContent = stringify(html);
                            assertDefined(animate).enter(target, target.parentNode);
                        });
                    }
                    else {
                        target.textContent = stringify(html);
                    }
                    break;
                case "beforebegin": {
                    const parent = target.parentNode;
                    if (!parent)
                        return false;
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
                    if (!parent)
                        return false;
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
                        assertDefined(animate)
                            .leave(target)
                            .done(() => {
                            removeElement(target);
                        });
                    }
                    else {
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
                            assertDefined(animate)
                                .leave(content)
                                .done(() => {
                                content = nodes[0];
                                assertDefined(animate).enter(nodes[0], target);
                            });
                        }
                        else {
                            content = nodes[0];
                            if (content &&
                                !isArray(content) &&
                                content.nodeType === NodeType._TEXT_NODE) {
                                emptyElement(target);
                                target.replaceChildren(...nodes);
                            }
                            else {
                                assertDefined(animate).enter(nodes[0], target);
                            }
                        }
                    }
                    else {
                        emptyElement(target);
                        target.replaceChildren(...nodes);
                    }
                    break;
            }
            return true;
        };
        if (shouldUseViewTransition(attrs, target, animationEnabled)) {
            const documentWithTransitions = document;
            documentWithTransitions.startViewTransition?.(() => {
                applySwap();
            });
            return true;
        }
        return applySwap();
    };
}
function shouldUseViewTransition(attrs, target, animationEnabled) {
    if (animationEnabled)
        return false;
    const documentWithTransitions = document;
    if (!documentWithTransitions.startViewTransition)
        return false;
    if (!target.isConnected)
        return false;
    const attrValue = attrs.viewTransition ?? attrs.dataViewTransition;
    const targetValue = target.getAttribute("data-view-transition");
    return (isTruthyTransitionFlag(attrValue) || isTruthyTransitionFlag(targetValue));
}
function isTruthyTransitionFlag(value) {
    return value === "" || value === true || value === "true";
}

export { createRealtimeSwapHandler };
