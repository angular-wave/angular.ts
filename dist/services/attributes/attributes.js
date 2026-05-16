import { _injector, _exceptionHandler } from '../../injection-tokens.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { getBooleanAttrName, getNormalizedAttr, getNormalizedAttrName, hasNormalizedAttr, getDirectiveHostElement } from '../../shared/dom.js';
import { ALIASED_ATTR } from '../../shared/constants.js';
import { directiveNormalize, hasOwn, snakeCase, isNullOrUndefined } from '../../shared/utils.js';

const SIMPLE_ATTR_NAME = /^\w/;
const specialAttrHolder = document.createElement("div");
const observerStates = new WeakMap();
const interpolatedAttributes = new WeakMap();
const observerScopes = new WeakMap();
class AttributesProvider {
    constructor() {
        this.$get = [
            _injector,
            _exceptionHandler,
            function ($injector, $exceptionHandler) {
                const getAnimate = createLazyAnimate($injector);
                function getElement(element) {
                    const hostElement = getDirectiveHostElement(element);
                    if (hostElement)
                        return hostElement;
                    return element instanceof Element ? element : null;
                }
                function invokeCallback(callback, value) {
                    try {
                        callback(value);
                    }
                    catch (err) {
                        $exceptionHandler(err);
                    }
                }
                function notifyCallbacks(state, normalizedName, value) {
                    const callbacks = state.callbacks.get(normalizedName);
                    if (!callbacks?.size)
                        return;
                    Array.from(callbacks).forEach((callback) => {
                        invokeCallback(callback, value);
                    });
                }
                function valuesMatch(left, right) {
                    return (Object.is(left, right) ||
                        (typeof left === "boolean" && right === String(left)) ||
                        (left === null && right === undefined));
                }
                function consumePendingMutation(state, normalizedName, value) {
                    const pendingValues = state.pendingMutations.get(normalizedName);
                    if (!pendingValues?.length)
                        return false;
                    const nextValue = pendingValues[0];
                    if (!valuesMatch(nextValue, value))
                        return false;
                    pendingValues.shift();
                    if (pendingValues.length === 0) {
                        state.pendingMutations.delete(normalizedName);
                    }
                    return true;
                }
                function getObserverState(element) {
                    const state = observerStates.get(element);
                    if (state)
                        return state;
                    const newState = {
                        callbacks: new Map(),
                        pendingMutations: new Map(),
                        observer: undefined,
                    };
                    newState.observer = new MutationObserver((mutations) => {
                        for (let i = 0; i < mutations.length; i++) {
                            const { attributeName } = mutations[i];
                            if (!attributeName)
                                continue;
                            const normalizedName = directiveNormalize(attributeName);
                            const value = getNormalizedAttr(element, normalizedName);
                            if (!consumePendingMutation(newState, normalizedName, value)) {
                                notifyCallbacks(newState, normalizedName, value);
                            }
                            const aliasedName = hasOwn(ALIASED_ATTR, normalizedName)
                                ? ALIASED_ATTR[normalizedName]
                                : undefined;
                            if (aliasedName &&
                                !consumePendingMutation(newState, aliasedName, value)) {
                                notifyCallbacks(newState, aliasedName, value);
                            }
                        }
                    });
                    newState.observer.observe(element, { attributes: true });
                    observerStates.set(element, newState);
                    return newState;
                }
                function rememberPendingMutation(element, normalizedName, value) {
                    const state = observerStates.get(element);
                    if (!state)
                        return;
                    let pendingValues = state.pendingMutations.get(normalizedName);
                    if (!pendingValues) {
                        pendingValues = [];
                        state.pendingMutations.set(normalizedName, pendingValues);
                    }
                    pendingValues.push(value);
                }
                function setSpecialAttr(element, attrName, value) {
                    specialAttrHolder.innerHTML = `<span ${attrName}>`;
                    const { attributes } = specialAttrHolder.firstChild;
                    const attribute = attributes[0];
                    attributes.removeNamedItem(attribute.name);
                    attribute.value = value ?? "";
                    element.setAttributeNode(attribute);
                }
                function tokenizeClassString(value) {
                    const trimmed = value.trim();
                    return trimmed ? trimmed.split(/\s+/) : [];
                }
                function tokenDifference(str1, str2) {
                    if (str1 === str2) {
                        return [];
                    }
                    const tokens1 = tokenizeClassString(str1);
                    if (tokens1.length === 0) {
                        return [];
                    }
                    const excludedTokens = new Set(tokenizeClassString(str2));
                    const seenTokens = new Set();
                    const difference = [];
                    for (let i = 0; i < tokens1.length; i++) {
                        const token = tokens1[i];
                        if (!excludedTokens.has(token) && !seenTokens.has(token)) {
                            seenTokens.add(token);
                            difference.push(token);
                        }
                    }
                    return difference;
                }
                return {
                    read(element, normalizedName) {
                        return getNormalizedAttr(getElement(element), normalizedName);
                    },
                    has(element, normalizedName) {
                        return hasNormalizedAttr(getElement(element), normalizedName);
                    },
                    originalName(element, normalizedName) {
                        return getNormalizedAttrName(getElement(element), normalizedName);
                    },
                    observe(scope, element, normalizedName, callback) {
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return () => undefined;
                        const observedElement = targetElement;
                        const normalized = directiveNormalize(normalizedName);
                        const state = getObserverState(observedElement);
                        let callbacks = state.callbacks.get(normalized);
                        if (!callbacks) {
                            callbacks = new Set();
                            state.callbacks.set(normalized, callbacks);
                        }
                        callbacks.add(callback);
                        const initialValue = getNormalizedAttr(observedElement, normalized);
                        if (initialValue !== undefined) {
                            invokeCallback(callback, initialValue);
                        }
                        let deregisterDestroy;
                        if (scope) {
                            deregisterDestroy = scope.$on("$destroy", () => {
                                deregister();
                            });
                        }
                        function deregister() {
                            callbacks?.delete(callback);
                            if (callbacks?.size === 0) {
                                state.callbacks.delete(normalized);
                            }
                            if (state.callbacks.size === 0) {
                                state.observer.disconnect();
                                observerStates.delete(observedElement);
                            }
                            deregisterDestroy?.();
                            deregisterDestroy = undefined;
                        }
                        return deregister;
                    },
                    set(element, normalizedName, value, options) {
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return;
                        const normalized = directiveNormalize(normalizedName);
                        const observerName = hasOwn(ALIASED_ATTR, normalized)
                            ? ALIASED_ATTR[normalized]
                            : normalized;
                        const booleanName = getBooleanAttrName(targetElement, observerName);
                        let attrName = options?.attrName;
                        if (booleanName) {
                            targetElement[observerName] = value;
                            attrName = booleanName;
                        }
                        else if (!attrName) {
                            attrName = snakeCase(normalized, "-");
                        }
                        if (options?.writeAttr !== false && attrName) {
                            rememberPendingMutation(targetElement, observerName, value);
                            if (isNullOrUndefined(value)) {
                                targetElement.removeAttribute(attrName);
                            }
                            else if (SIMPLE_ATTR_NAME.test(attrName)) {
                                if (booleanName && value === false) {
                                    targetElement.removeAttribute(attrName);
                                }
                                else if (booleanName) {
                                    targetElement.toggleAttribute(attrName, value);
                                }
                                else {
                                    targetElement.setAttribute(attrName, value);
                                }
                            }
                            else {
                                setSpecialAttr(targetElement, attrName, value);
                            }
                        }
                        const state = observerStates.get(targetElement);
                        if (state) {
                            const observedValue = options?.writeAttr === false
                                ? isNullOrUndefined(value)
                                    ? undefined
                                    : String(value)
                                : attrName
                                    ? (targetElement.getAttribute(attrName) ?? undefined)
                                    : getNormalizedAttr(targetElement, observerName);
                            notifyCallbacks(state, observerName, observedValue);
                        }
                    },
                    addClass(element, classValue) {
                        if (!classValue)
                            return;
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return;
                        const animate = getAnimateForNode(getAnimate, targetElement);
                        if (animate) {
                            animate.addClass(targetElement, classValue);
                        }
                        else {
                            const tokens = tokenizeClassString(classValue);
                            if (tokens.length) {
                                targetElement.classList.add(...tokens);
                            }
                        }
                    },
                    removeClass(element, classValue) {
                        if (!classValue)
                            return;
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return;
                        const animate = getAnimateForNode(getAnimate, targetElement);
                        if (animate) {
                            animate.removeClass(targetElement, classValue);
                        }
                        else {
                            const tokens = tokenizeClassString(classValue);
                            if (tokens.length) {
                                targetElement.classList.remove(...tokens);
                            }
                        }
                    },
                    updateClass(element, newClasses, oldClasses) {
                        if (newClasses === oldClasses)
                            return;
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return;
                        const animate = getAnimateForNode(getAnimate, targetElement);
                        const toAdd = tokenDifference(newClasses, oldClasses);
                        if (toAdd.length) {
                            if (animate) {
                                animate.addClass(targetElement, toAdd.join(" "));
                            }
                            else {
                                targetElement.classList.add(...toAdd);
                            }
                        }
                        const toRemove = tokenDifference(oldClasses, newClasses);
                        if (toRemove.length) {
                            if (animate) {
                                animate.removeClass(targetElement, toRemove.join(" "));
                            }
                            else {
                                targetElement.classList.remove(...toRemove);
                            }
                        }
                    },
                    _markInterpolated(element, normalizedName) {
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return;
                        const normalized = directiveNormalize(normalizedName);
                        let interpolated = interpolatedAttributes.get(targetElement);
                        if (!interpolated) {
                            interpolated = new Set();
                            interpolatedAttributes.set(targetElement, interpolated);
                        }
                        interpolated.add(normalized);
                    },
                    _isInterpolated(element, normalizedName) {
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return false;
                        return (interpolatedAttributes
                            .get(targetElement)
                            ?.has(directiveNormalize(normalizedName)) || false);
                    },
                    _setObserverScope(element, normalizedName, scope) {
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return;
                        const normalized = directiveNormalize(normalizedName);
                        let scopes = observerScopes.get(targetElement);
                        if (!scopes) {
                            scopes = new Map();
                            observerScopes.set(targetElement, scopes);
                        }
                        scopes.set(normalized, scope);
                    },
                    _getObserverScope(element, normalizedName) {
                        const targetElement = getElement(element);
                        if (!targetElement)
                            return undefined;
                        return observerScopes
                            .get(targetElement)
                            ?.get(directiveNormalize(normalizedName));
                    },
                };
            },
        ];
    }
}

export { AttributesProvider };
