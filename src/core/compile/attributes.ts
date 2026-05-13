import { getBooleanAttrName } from "../../shared/dom.ts";
import {
  createLazyAnimate,
  getAnimateForNode,
  type LazyAnimate,
} from "../../animations/lazy-animate.ts";
import {
  arrayRemove,
  directiveNormalize,
  hasOwn,
  isNullOrUndefined,
  isUndefined,
  keys,
  nullObject,
  snakeCase,
} from "../../shared/utils.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";
import { NodeRef } from "../../shared/noderef.ts";

const SIMPLE_ATTR_NAME = /^\w/;

const specialAttrHolder = document.createElement("div");

const lazyAnimateByInjector = new WeakMap<ng.InjectorService, LazyAnimate>();

function getLazyAnimate($injector: ng.InjectorService): LazyAnimate {
  let getAnimate = lazyAnimateByInjector.get($injector);

  if (!getAnimate) {
    getAnimate = createLazyAnimate($injector);
    lazyAnimateByInjector.set($injector, getAnimate);
  }

  return getAnimate;
}

type ObserverList = ((value?: unknown) => void)[] & {
  /** @internal */
  _inter?: boolean;
  /** @internal */
  _scope?: ng.Scope;
};

type ObserverMap = Record<string, ObserverList>;

export class Attributes {
  static $nonscope = true;

  /**
   * Creates an Attributes instance.
   *
   * There are two construction modes:
   *
   * 1. **Fresh instance** (no `attributesToCopy`):
   *    - Used when compiling a DOM element for the first time.
   *    - Initializes a new `$attr` map to track normalized -> DOM attribute names.
   *
   * 2. **Clone instance** (`attributesToCopy` provided):
   *    - Used when cloning attributes for directive linking / child scopes.
   *    - Performs a shallow copy of all properties from the source Attributes object,
   *      including `$attr` and normalized attribute values.
   *    - Observer state is intentionally not copied, because link-time `Attributes`
   *      instances own their own `$observe(...)` registrations.
   *    - `$attr` is intentionally **not reinitialized** in this case, because the
   *      source object already contains the correct normalized -> DOM attribute mapping.
   */

  /** @internal */
  _getAnimate: LazyAnimate;
  /** @internal */
  _exceptionHandler: ng.ExceptionHandlerService;
  $attr: Record<string, string>;
  /** @internal */
  _node: Node | Element | undefined;
  /** @internal */
  _nodeRefCache: NodeRef | undefined;
  /** @internal */
  _observers: ObserverMap | undefined;
  [key: string]: any;

  constructor(
    $injector: ng.InjectorService,
    $exceptionHandler: ng.ExceptionHandlerService,
    node?: Node | Element | NodeRef,
    attributesToCopy?: Record<string, any>,
  ) {
    this._getAnimate = getLazyAnimate($injector);
    this._exceptionHandler = $exceptionHandler;
    this.$attr = {};

    if (attributesToCopy) {
      const attributeKeys = keys(attributesToCopy);

      for (let i = 0, l = attributeKeys.length; i < l; i++) {
        const key = attributeKeys[i];

        if (key === "_observers") {
          continue;
        }

        this[key] = attributesToCopy[key];
      }
    }

    if (node instanceof NodeRef) {
      this._node = node._getAny();
      this._nodeRefCache = node;
    } else {
      this._node = node;
      this._nodeRefCache = undefined;
    }
  }

  /** @internal */
  get _nodeRef(): NodeRef | undefined {
    const node = this._node;

    if (!node) {
      return undefined;
    }

    return (this._nodeRefCache ||= NodeRef._fromNode(node));
  }

  /** @internal */
  set _nodeRef(nodeRef: NodeRef | undefined) {
    this._nodeRefCache = nodeRef;
    this._node = nodeRef?._getAny();
  }

  /** @ignore Internal element accessor used by legacy attribute helpers. */
  /** @internal */
  _element(): Node | Element {
    return this._node!;
  }

  /**
   * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `x-` or
   * `data-`) to its normalized, camelCase form.
   *
   * Also there is special case for Moz prefix starting with upper case letter.
   *
   * Normalization follows the directive matching rules used by `$compile`.
   *
   * @param name Name to normalize
   */
  $normalize = directiveNormalize;

  $addClass(classVal: string): void {
    if (classVal && classVal.length > 0) {
      const element = this._element() as Element;

      const animate = getAnimateForNode(this._getAnimate, element);

      if (animate) {
        animate.addClass(element, classVal);
      } else {
        element.classList.add(classVal);
      }
    }
  }

  $removeClass(classVal: string): void {
    if (classVal && classVal.length > 0) {
      const element = this._element() as Element;

      const animate = getAnimateForNode(this._getAnimate, element);

      if (animate) {
        animate.removeClass(element, classVal);
      } else {
        element.classList.remove(classVal);
      }
    }
  }

  $updateClass(newClasses: string, oldClasses: string): void {
    if (newClasses === oldClasses) {
      return;
    }

    const element = this._element() as Element;

    const animate = getAnimateForNode(this._getAnimate, element);

    const toAdd = tokenDifference(newClasses, oldClasses);

    if (toAdd.length) {
      if (animate) {
        animate.addClass(element, toAdd.join(" "));
      } else {
        element.classList.add(...toAdd);
      }
    }

    const toRemove = tokenDifference(oldClasses, newClasses);

    if (toRemove.length) {
      if (animate) {
        animate.removeClass(element, toRemove.join(" "));
      } else {
        element.classList.remove(...toRemove);
      }
    }
  }

  $set(
    key: string,
    value: string | boolean | null,
    writeAttr?: boolean,
    attrName?: string,
  ): void {
    const node = this._element();

    const booleanKey = getBooleanAttrName(node as Element, key);

    const aliasedKey = ALIASED_ATTR[key];

    let observer = key;

    if (booleanKey) {
      (this._element() as Record<string, any>)[key] = value;
      attrName = booleanKey;
    } else if (aliasedKey) {
      this[aliasedKey] = value;
      observer = aliasedKey;
    }

    this[key] = value;

    if (attrName) {
      this.$attr[key] = attrName;
    } else {
      attrName = this.$attr[key];

      if (!attrName) {
        this.$attr[key] = attrName = snakeCase(key, "-");
      }
    }

    if (writeAttr !== false) {
      if (!attrName) return;
      const elem = this._element() as Element;

      if (isNullOrUndefined(value)) {
        elem.removeAttribute(attrName);
      } else if (SIMPLE_ATTR_NAME.test(attrName)) {
        if (booleanKey && value === false) {
          elem.removeAttribute(attrName);
        } else if (booleanKey) {
          elem.toggleAttribute(attrName, value as boolean);
        } else {
          elem.setAttribute(attrName, value as string);
        }
      } else {
        this._setSpecialAttr(elem, attrName, value as string);
      }
    }

    const { _observers } = this;

    if (_observers?.[observer]) {
      const observerListeners = _observers[observer];

      for (let i = 0, l = observerListeners.length; i < l; i++) {
        try {
          observerListeners[i](value);
        } catch (err) {
          this._exceptionHandler(err);
        }
      }
    }
  }

  $observe(key: string, fn: (value?: any) => any): Function {
    const _observers = this._observers || (this._observers = nullObject());

    const listeners = _observers[key] || (_observers[key] = [] as ObserverList);

    listeners.push(fn as (value?: unknown) => void);

    if (!listeners._inter && hasOwn(this, key) && !isUndefined(this[key])) {
      fn(this[key]);
    }

    return function () {
      arrayRemove(listeners, fn as (value?: unknown) => void);
    };
  }

  /** @internal */
  _setSpecialAttr(
    element: Element,
    attrName: string,
    value: string | null,
  ): void {
    specialAttrHolder.innerHTML = `<span ${attrName}>`;
    const { attributes } = specialAttrHolder.firstChild as Element;

    const attribute = attributes[0];

    attributes.removeNamedItem(attribute.name);
    attribute.value = value ?? "";
    element.attributes.setNamedItem(attribute);
  }
}

/**
 * Splits a space-separated class string into normalized tokens.
 *
 * @param value - The class string to split.
 * @returns The normalized class tokens.
 */
function tokenizeClassString(value: string): string[] {
  const trimmed = value.trim();

  return trimmed ? trimmed.split(/\s+/) : [];
}

/**
 * Computes the difference between two space-separated token strings.
 *
 * @param str1 - The first string containing space-separated tokens.
 * @param str2 - The second string containing space-separated tokens.
 * @returns Tokens that are present in `str1` but not in `str2`.
 */
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
