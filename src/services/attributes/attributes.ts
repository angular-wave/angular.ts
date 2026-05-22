import {
  getDirectiveHostElement,
  getNormalizedAttr,
  setNormalizedAttr,
  type NormalizedAttributeSetValue,
  type SetNormalizedAttrOptions,
} from "../../shared/dom.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";
import { directiveNormalize, hasOwn } from "../../shared/utils.ts";

type AttributeSetValue = NormalizedAttributeSetValue;

type AttributeObserverCallback = (value?: string) => void;

interface AttributeObserverEntry {
  callback: AttributeObserverCallback;
}

interface AttributeObserverState {
  observer: MutationObserver;
  callbacks: Map<string, Set<AttributeObserverEntry>>;
  pendingMutations: Map<string, AttributeSetValue[]>;
}

type AttributesSetOptions = SetNormalizedAttrOptions;

const observerStates = new WeakMap<Element, AttributeObserverState>();
const interpolatedAttributes = new WeakMap<Element, Set<string>>();
const observerScopes = new WeakMap<Element, Map<string, ng.Scope>>();

function getElement(
  element: Element | Node | null | undefined,
): Element | null {
  return getDirectiveHostElement(element);
}

function notifyCallbacks(
  state: AttributeObserverState,
  normalizedName: string,
  value?: string,
): void {
  const callbacks = state.callbacks.get(normalizedName);

  if (!callbacks?.size) return;

  Array.from(callbacks).forEach((entry) => {
    entry.callback(value);
  });
}

function valuesMatch(
  left: AttributeSetValue,
  right: AttributeSetValue,
): boolean {
  return (
    Object.is(left, right) ||
    (typeof left === "boolean" && right === String(left)) ||
    (left === null && right === undefined)
  );
}

function consumePendingMutation(
  state: AttributeObserverState,
  normalizedName: string,
  value: AttributeSetValue,
): boolean {
  const pendingValues = state.pendingMutations.get(normalizedName);

  if (!pendingValues?.length) return false;

  const [nextValue] = pendingValues;

  if (!valuesMatch(nextValue, value)) return false;

  pendingValues.shift();

  if (pendingValues.length === 0) {
    state.pendingMutations.delete(normalizedName);
  }

  return true;
}

function getObserverState(element: Element): AttributeObserverState {
  const state = observerStates.get(element);

  if (state) return state;

  const newState: AttributeObserverState = {
    callbacks: new Map<string, Set<AttributeObserverEntry>>(),
    pendingMutations: new Map<string, AttributeSetValue[]>(),
    observer: undefined as unknown as MutationObserver,
  };

  newState.observer = new MutationObserver((mutations) => {
    for (let i = 0; i < mutations.length; i++) {
      const { attributeName } = mutations[i];

      if (!attributeName) continue;

      const normalizedName = directiveNormalize(attributeName);
      const value = getNormalizedAttr(element, normalizedName);

      if (!consumePendingMutation(newState, normalizedName, value)) {
        notifyCallbacks(newState, normalizedName, value);
      }

      const aliasedName = hasOwn(ALIASED_ATTR, normalizedName)
        ? ALIASED_ATTR[normalizedName]
        : undefined;

      if (
        aliasedName &&
        !consumePendingMutation(newState, aliasedName, value)
      ) {
        notifyCallbacks(newState, aliasedName, value);
      }
    }
  });

  newState.observer.observe(element, { attributes: true });
  observerStates.set(element, newState);

  return newState;
}

function rememberPendingMutation(
  element: Element,
  normalizedName: string,
  value: AttributeSetValue,
): void {
  const state = observerStates.get(element);

  if (!state) return;

  let pendingValues = state.pendingMutations.get(normalizedName);

  if (!pendingValues) {
    pendingValues = [];
    state.pendingMutations.set(normalizedName, pendingValues);
  }

  pendingValues.push(value);
}

/** @internal */
export function observeInternalAttribute(
  scope: ng.Scope | null | undefined,
  element: Element | Node | null | undefined,
  normalizedName: string,
  callback: AttributeObserverCallback,
): () => void {
  const targetElement = getElement(element);

  if (!targetElement) return () => undefined;

  const observedElement = targetElement;
  const normalized = directiveNormalize(normalizedName);
  const state = getObserverState(observedElement);
  let callbacks = state.callbacks.get(normalized);

  if (!callbacks) {
    callbacks = new Set<AttributeObserverEntry>();
    state.callbacks.set(normalized, callbacks);
  }

  const entry: AttributeObserverEntry = { callback };
  callbacks.add(entry);

  const initialValue = getNormalizedAttr(observedElement, normalized);

  if (initialValue !== undefined) {
    callback(initialValue);
  }

  let deregisterDestroy: (() => void) | undefined;

  if (scope) {
    deregisterDestroy = scope.$on("$destroy", () => {
      deregister();
    });
  }

  function deregister(): void {
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
export function setInternalAttribute(
  element: Element | Node | null | undefined,
  normalizedName: string,
  value: AttributeSetValue,
  options?: AttributesSetOptions,
): void {
  const result = setNormalizedAttr(element, normalizedName, value, options);

  if (!result) return;

  if (options?.writeAttr !== false && result.attrName) {
    rememberPendingMutation(result.element, result.observerName, value);
  }

  const state = observerStates.get(result.element);

  if (state) {
    notifyCallbacks(state, result.observerName, result.observedValue);
  }
}

/** @internal */
export function markInternalAttributeInterpolated(
  element: Element | Node | null | undefined,
  normalizedName: string,
): void {
  const targetElement = getElement(element);

  if (!targetElement) return;

  const normalized = directiveNormalize(normalizedName);
  let interpolated = interpolatedAttributes.get(targetElement);

  if (!interpolated) {
    interpolated = new Set<string>();
    interpolatedAttributes.set(targetElement, interpolated);
  }

  interpolated.add(normalized);
}

/** @internal */
export function isInternalAttributeInterpolated(
  element: Element | Node | null | undefined,
  normalizedName: string,
): boolean {
  const targetElement = getElement(element);

  if (!targetElement) return false;

  return (
    interpolatedAttributes
      .get(targetElement)
      ?.has(directiveNormalize(normalizedName)) ?? false
  );
}

/** @internal */
export function setInternalAttributeObserverScope(
  element: Element | Node | null | undefined,
  normalizedName: string,
  scope: ng.Scope,
): void {
  const targetElement = getElement(element);

  if (!targetElement) return;

  const normalized = directiveNormalize(normalizedName);
  let scopes = observerScopes.get(targetElement);

  if (!scopes) {
    scopes = new Map<string, ng.Scope>();
    observerScopes.set(targetElement, scopes);
  }

  scopes.set(normalized, scope);
}

/** @internal */
export function getInternalAttributeObserverScope(
  element: Element | Node | null | undefined,
  normalizedName: string,
): ng.Scope | undefined {
  const targetElement = getElement(element);

  if (!targetElement) return undefined;

  return observerScopes
    .get(targetElement)
    ?.get(directiveNormalize(normalizedName));
}
