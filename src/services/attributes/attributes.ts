import { _exceptionHandler, _injector } from "../../injection-tokens.ts";
import {
  createLazyAnimate,
  getAnimateForNode,
} from "../../animations/lazy-animate.ts";
import {
  getDirectiveHostElement,
  getBooleanAttrName,
  getNormalizedAttr,
  getNormalizedAttrName,
  hasNormalizedAttr,
} from "../../shared/dom.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";
import {
  directiveNormalize,
  hasOwn,
  isNullOrUndefined,
  snakeCase,
} from "../../shared/utils.ts";

const SIMPLE_ATTR_NAME = /^\w/;

const specialAttrHolder = document.createElement("div");

export type AttributeSetValue = string | boolean | null | undefined;

type AttributeObserverCallback = (value?: string) => void;

interface AttributeObserverState {
  observer: MutationObserver;
  callbacks: Map<string, Set<AttributeObserverCallback>>;
  pendingMutations: Map<string, AttributeSetValue[]>;
}

export interface InternalAttributesService extends AttributesService {
  /** @internal */
  _markInterpolated(
    element: Element | Node | null | undefined,
    normalizedName: string,
  ): void;
  /** @internal */
  _isInterpolated(
    element: Element | Node | null | undefined,
    normalizedName: string,
  ): boolean;
  /** @internal */
  _setObserverScope(
    element: Element | Node | null | undefined,
    normalizedName: string,
    scope: ng.Scope,
  ): void;
  /** @internal */
  _getObserverScope(
    element: Element | Node | null | undefined,
    normalizedName: string,
  ): ng.Scope | undefined;
}

export interface AttributesSetOptions {
  writeAttr?: boolean;
  attrName?: string;
}

const observerStates = new WeakMap<Element, AttributeObserverState>();
const interpolatedAttributes = new WeakMap<Element, Set<string>>();
const observerScopes = new WeakMap<Element, Map<string, ng.Scope>>();

export interface AttributesService {
  read(
    element: Element | Node | null | undefined,
    normalizedName: string,
  ): string | undefined;
  has(
    element: Element | Node | null | undefined,
    normalizedName: string,
  ): boolean;
  originalName(
    element: Element | Node | null | undefined,
    normalizedName: string,
  ): string | undefined;
  observe(
    scope: ng.Scope | null | undefined,
    element: Element | Node | null | undefined,
    normalizedName: string,
    callback: AttributeObserverCallback,
  ): () => void;
  set(
    element: Element | Node | null | undefined,
    normalizedName: string,
    value: AttributeSetValue,
    options?: AttributesSetOptions,
  ): void;
  addClass(
    element: Element | Node | null | undefined,
    classValue: string,
  ): void;
  removeClass(
    element: Element | Node | null | undefined,
    classValue: string,
  ): void;
  updateClass(
    element: Element | Node | null | undefined,
    newClasses: string,
    oldClasses: string,
  ): void;
}

export class AttributesProvider {
  $get = [
    _injector,
    _exceptionHandler,
    function (
      $injector: ng.InjectorService,
      $exceptionHandler: ng.ExceptionHandlerService,
    ): AttributesService {
      const getAnimate = createLazyAnimate($injector);

      function getElement(
        element: Element | Node | null | undefined,
      ): Element | null {
        const hostElement = getDirectiveHostElement(element);

        if (hostElement) return hostElement;

        return element instanceof Element ? element : null;
      }

      function invokeCallback(
        callback: AttributeObserverCallback,
        value?: string,
      ): void {
        try {
          callback(value);
        } catch (err) {
          $exceptionHandler(err);
        }
      }

      function notifyCallbacks(
        state: AttributeObserverState,
        normalizedName: string,
        value?: string,
      ): void {
        const callbacks = state.callbacks.get(normalizedName);

        if (!callbacks?.size) return;

        Array.from(callbacks).forEach((callback) => {
          invokeCallback(callback, value);
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

        const nextValue = pendingValues[0];

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
          callbacks: new Map<string, Set<AttributeObserverCallback>>(),
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

      function setSpecialAttr(
        element: Element,
        attrName: string,
        value: string | null | undefined,
      ): void {
        specialAttrHolder.innerHTML = `<span ${attrName}>`;
        const { attributes } = specialAttrHolder.firstChild as Element;

        const attribute = attributes[0];

        attributes.removeNamedItem(attribute.name);
        attribute.value = value ?? "";
        element.setAttributeNode(attribute);
      }

      function tokenizeClassString(value: string): string[] {
        const trimmed = value.trim();

        return trimmed ? trimmed.split(/\s+/) : [];
      }

      function tokenDifference(str1: string, str2: string): string[] {
        if (str1 === str2) {
          return [];
        }

        const tokens1 = tokenizeClassString(str1);

        if (tokens1.length === 0) {
          return [];
        }

        const excludedTokens = new Set(tokenizeClassString(str2));

        const seenTokens = new Set<string>();

        const difference: string[] = [];

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

          if (!targetElement) return () => undefined;

          const observedElement = targetElement;
          const normalized = directiveNormalize(normalizedName);
          const state = getObserverState(observedElement);
          let callbacks = state.callbacks.get(normalized);

          if (!callbacks) {
            callbacks = new Set<AttributeObserverCallback>();
            state.callbacks.set(normalized, callbacks);
          }

          callbacks.add(callback);

          const initialValue = getNormalizedAttr(observedElement, normalized);

          if (initialValue !== undefined) {
            invokeCallback(callback, initialValue);
          }

          let deregisterDestroy: (() => void) | undefined;

          if (scope) {
            deregisterDestroy = scope.$on("$destroy", () => {
              deregister();
            });
          }

          function deregister(): void {
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

          if (!targetElement) return;

          const normalized = directiveNormalize(normalizedName);
          const observerName = hasOwn(ALIASED_ATTR, normalized)
            ? ALIASED_ATTR[normalized]
            : normalized;
          const booleanName = getBooleanAttrName(targetElement, observerName);
          let attrName = options?.attrName;

          if (booleanName) {
            (targetElement as unknown as Record<string, unknown>)[
              observerName
            ] = value;
            attrName = booleanName;
          } else if (!attrName) {
            attrName = snakeCase(normalized, "-");
          }

          if (options?.writeAttr !== false && attrName) {
            rememberPendingMutation(targetElement, observerName, value);

            if (isNullOrUndefined(value)) {
              targetElement.removeAttribute(attrName);
            } else if (SIMPLE_ATTR_NAME.test(attrName)) {
              if (booleanName && value === false) {
                targetElement.removeAttribute(attrName);
              } else if (booleanName) {
                targetElement.toggleAttribute(attrName, value as boolean);
              } else {
                targetElement.setAttribute(attrName, value as string);
              }
            } else {
              setSpecialAttr(targetElement, attrName, value as string | null);
            }
          }

          const state = observerStates.get(targetElement);

          if (state) {
            const observedValue =
              options?.writeAttr === false
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
          if (!classValue) return;

          const targetElement = getElement(element);

          if (!targetElement) return;

          const animate = getAnimateForNode(getAnimate, targetElement);

          if (animate) {
            animate.addClass(targetElement, classValue);
          } else {
            const tokens = tokenizeClassString(classValue);

            if (tokens.length) {
              targetElement.classList.add(...tokens);
            }
          }
        },
        removeClass(element, classValue) {
          if (!classValue) return;

          const targetElement = getElement(element);

          if (!targetElement) return;

          const animate = getAnimateForNode(getAnimate, targetElement);

          if (animate) {
            animate.removeClass(targetElement, classValue);
          } else {
            const tokens = tokenizeClassString(classValue);

            if (tokens.length) {
              targetElement.classList.remove(...tokens);
            }
          }
        },
        updateClass(element, newClasses, oldClasses) {
          if (newClasses === oldClasses) return;

          const targetElement = getElement(element);

          if (!targetElement) return;

          const animate = getAnimateForNode(getAnimate, targetElement);

          const toAdd = tokenDifference(newClasses, oldClasses);

          if (toAdd.length) {
            if (animate) {
              animate.addClass(targetElement, toAdd.join(" "));
            } else {
              targetElement.classList.add(...toAdd);
            }
          }

          const toRemove = tokenDifference(oldClasses, newClasses);

          if (toRemove.length) {
            if (animate) {
              animate.removeClass(targetElement, toRemove.join(" "));
            } else {
              targetElement.classList.remove(...toRemove);
            }
          }
        },
        _markInterpolated(element, normalizedName) {
          const targetElement = getElement(element);

          if (!targetElement) return;

          const normalized = directiveNormalize(normalizedName);
          let interpolated = interpolatedAttributes.get(targetElement);

          if (!interpolated) {
            interpolated = new Set<string>();
            interpolatedAttributes.set(targetElement, interpolated);
          }

          interpolated.add(normalized);
        },
        _isInterpolated(element, normalizedName) {
          const targetElement = getElement(element);

          if (!targetElement) return false;

          return (
            interpolatedAttributes
              .get(targetElement)
              ?.has(directiveNormalize(normalizedName)) || false
          );
        },
        _setObserverScope(element, normalizedName, scope) {
          const targetElement = getElement(element);

          if (!targetElement) return;

          const normalized = directiveNormalize(normalizedName);
          let scopes = observerScopes.get(targetElement);

          if (!scopes) {
            scopes = new Map<string, ng.Scope>();
            observerScopes.set(targetElement, scopes);
          }

          scopes.set(normalized, scope);
        },
        _getObserverScope(element, normalizedName) {
          const targetElement = getElement(element);

          if (!targetElement) return undefined;

          return observerScopes
            .get(targetElement)
            ?.get(directiveNormalize(normalizedName));
        },
      } as InternalAttributesService;
    },
  ];
}
