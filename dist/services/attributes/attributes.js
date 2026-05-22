import { getNormalizedAttr, setNormalizedAttr, getDirectiveHostElement } from '../../shared/dom.js';
import { ALIASED_ATTR } from '../../shared/constants.js';
import { directiveNormalize, hasOwn } from '../../shared/utils.js';

const observerStates = new WeakMap();
const interpolatedAttributes = new WeakMap();
const observerScopes = new WeakMap();
function getElement(element) {
    return getDirectiveHostElement(element);
}
function notifyCallbacks(state, normalizedName, value) {
    const callbacks = state.callbacks.get(normalizedName);
    if (!callbacks?.size)
        return;
    Array.from(callbacks).forEach((entry) => {
        entry.callback(value);
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
    const [nextValue] = pendingValues;
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
/** @internal */
function observeInternalAttribute(scope, element, normalizedName, callback) {
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
    const entry = { callback };
    callbacks.add(entry);
    const initialValue = getNormalizedAttr(observedElement, normalized);
    if (initialValue !== undefined) {
        callback(initialValue);
    }
    let deregisterDestroy;
    if (scope) {
        deregisterDestroy = scope.$on("$destroy", () => {
            deregister();
        });
    }
    function deregister() {
        callbacks?.delete(entry);
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
}
/** @internal */
function setInternalAttribute(element, normalizedName, value, options) {
    const result = setNormalizedAttr(element, normalizedName, value, options);
    if (!result)
        return;
    if (options?.writeAttr !== false && result.attrName) {
        rememberPendingMutation(result.element, result.observerName, value);
    }
    const state = observerStates.get(result.element);
    if (state) {
        notifyCallbacks(state, result.observerName, result.observedValue);
    }
}
/** @internal */
function markInternalAttributeInterpolated(element, normalizedName) {
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
}
/** @internal */
function isInternalAttributeInterpolated(element, normalizedName) {
    const targetElement = getElement(element);
    if (!targetElement)
        return false;
    return (interpolatedAttributes
        .get(targetElement)
        ?.has(directiveNormalize(normalizedName)) ?? false);
}
/** @internal */
function setInternalAttributeObserverScope(element, normalizedName, scope) {
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
}
/** @internal */
function getInternalAttributeObserverScope(element, normalizedName) {
    const targetElement = getElement(element);
    if (!targetElement)
        return undefined;
    return observerScopes
        .get(targetElement)
        ?.get(directiveNormalize(normalizedName));
}

export { getInternalAttributeObserverScope, isInternalAttributeInterpolated, markInternalAttributeInterpolated, observeInternalAttribute, setInternalAttribute, setInternalAttributeObserverScope };
