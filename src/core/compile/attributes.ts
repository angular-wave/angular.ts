import { getBooleanAttrName } from "../../shared/dom.ts";
import {
  arrayRemove,
  directiveNormalize,
  hasAnimate,
  hasOwn,
  isNullOrUndefined,
  isString,
  isUndefined,
  minErr,
  nullObject,
  snakeCase,
  trim,
} from "../../shared/utils.ts";
import { ALIASED_ATTR } from "../../shared/constants.ts";
import type { NodeRef } from "../../shared/noderef.ts";

const $compileMinErr = minErr("$compile");

const SIMPLE_ATTR_NAME = /^\w/;

const specialAttrHolder = document.createElement("div");

type ObserverList = Array<(value?: unknown) => void> & {
  _inter?: boolean;
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
   *      including `$attr`, normalized attribute values, and internal fields
   *      (e.g. `_observers`).
   *    - `$attr` is intentionally **not reinitialized** in this case, because the
   *      source object already contains the correct normalized -> DOM attribute mapping.
   */

  _animate: ng.AnimateService;
  _exceptionHandler: ng.ExceptionHandlerService;
  _sce: ng.SceService;
  $attr: Record<string, string>;
  _nodeRef: NodeRef | undefined;
  _observers: ObserverMap | undefined;
  [key: string]: any;

  constructor(
    $animate: ng.AnimateService,
    $exceptionHandler: ng.ExceptionHandlerService,
    $sce: ng.SceService,
    nodeRef?: NodeRef,
    attributesToCopy?: Record<string, any>,
  ) {
    this._animate = $animate;
    this._exceptionHandler = $exceptionHandler;
    this._sce = $sce;
    this.$attr = {};

    if (attributesToCopy) {
      const attributeKeys = Object.keys(attributesToCopy);

      for (let i = 0, l = attributeKeys.length; i < l; i++) {
        const key = attributeKeys[i];

        this[key] = attributesToCopy[key];
      }
    }

    this._nodeRef = nodeRef;
  }

  /** @ignore Internal element accessor used by legacy attribute helpers. */
  _element(): Node | Element {
    return this._nodeRef?._getAny() as Node | Element;
  }

  /**
   * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `x-` or
   * `data-`) to its normalized, camelCase form.
   *
   * Also there is special case for Moz prefix starting with upper case letter.
   *
   * For further information check out the guide on {@link guide/directive#matching-directives Matching Directives}
   *
   * @param name Name to normalize
   */
  $normalize = directiveNormalize;

  $addClass(classVal: string): void {
    if (classVal && classVal.length > 0) {
      if (hasAnimate(this._element())) {
        this._animate.addClass(this._element() as Element, classVal);
      } else {
        this._nodeRef?.element.classList.add(classVal);
      }
    }
  }

  $removeClass(classVal: string): void {
    if (classVal && classVal.length > 0) {
      if (hasAnimate(this._element())) {
        this._animate.removeClass(this._element() as Element, classVal);
      } else {
        this._nodeRef?.element.classList.remove(classVal);
      }
    }
  }

  $updateClass(newClasses: string, oldClasses: string): void {
    const toAdd = tokenDifference(newClasses, oldClasses);

    if (toAdd && toAdd.length) {
      if (hasAnimate(this._element())) {
        this._animate.addClass(this._element() as Element, toAdd);
      } else {
        this._nodeRef?.element.classList.add(...toAdd.trim().split(/\s+/));
      }
    }

    const toRemove = tokenDifference(oldClasses, newClasses);

    if (toRemove && toRemove.length) {
      if (hasAnimate(this._element())) {
        this._animate.removeClass(this._element() as Element, toRemove);
      } else {
        this._nodeRef?.element.classList.remove(
          ...toRemove.trim().split(/\s+/),
        );
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

    const aliasedKey = ALIASED_ATTR[key as keyof typeof ALIASED_ATTR];

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

    const nodeName = this._nodeRef?.node.nodeName.toLowerCase();

    let maybeSanitizedValue: string | boolean | null | unknown;

    if (nodeName === "img" && key === "srcset") {
      this[key] = maybeSanitizedValue = this.sanitizeSrcset(
        value,
        "$set('srcset', value)",
      );
    } else {
      maybeSanitizedValue = value;
    }

    if (writeAttr !== false) {
      if (!attrName) return;
      const elem = this._element() as Element;

      if (isNullOrUndefined(maybeSanitizedValue)) {
        elem.removeAttribute(attrName);
      } else if (SIMPLE_ATTR_NAME.test(attrName)) {
        if (booleanKey && maybeSanitizedValue === false) {
          elem.removeAttribute(attrName);
        } else if (booleanKey) {
          elem.toggleAttribute(attrName, maybeSanitizedValue as boolean);
        } else {
          elem.setAttribute(attrName, maybeSanitizedValue as string);
        }
      } else {
        this.setSpecialAttr(elem, attrName, maybeSanitizedValue as string);
      }
    }

    const { _observers } = this;

    if (_observers && _observers[observer]) {
      _observers[observer].forEach((fn) => {
        try {
          fn(maybeSanitizedValue);
        } catch (err) {
          this._exceptionHandler(err);
        }
      });
    }
  }

  $observe<T>(key: string, fn: (value?: T) => any): Function {
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

  setSpecialAttr(
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

  sanitizeSrcset(value: unknown, invokeType: string): unknown {
    let i: number;

    if (!value) {
      return value;
    }

    if (!isString(value)) {
      throw $compileMinErr(
        "srcset",
        'Can\'t pass trusted values to `{0}`: "{1}"',
        invokeType,
        (value as Object).toString(),
      );
    }

    let result = "";

    const trimmedSrcset = trim(value);

    const srcPattern = /(\s+\d+x\s*,|\s+\d+w\s*,|\s+,|,\s+)/;

    const pattern = /\s/.test(trimmedSrcset) ? srcPattern : /(,)/;

    const rawUris = trimmedSrcset.split(pattern);

    const nbrUrisWith2parts = Math.floor(rawUris.length / 2);

    for (i = 0; i < nbrUrisWith2parts; i++) {
      const innerIdx = i * 2;

      result += this._sce.getTrustedMediaUrl(trim(rawUris[innerIdx]));
      result += ` ${trim(rawUris[innerIdx + 1])}`;
    }

    const lastTuple = trim(rawUris[i * 2]).split(/\s/);

    result += this._sce.getTrustedMediaUrl(trim(lastTuple[0]));

    if (lastTuple.length === 2) {
      result += ` ${trim(lastTuple[1])}`;
    }

    return result.replace(/unsafe:unsafe/g, "unsafe");
  }
}

/**
 * Computes the difference between two space-separated token strings.
 *
 * @param str1 - The first string containing space-separated tokens.
 * @param str2 - The second string containing space-separated tokens.
 * @returns A string containing tokens that are in str1 but not in str2, separated by spaces.
 *
 */
function tokenDifference(str1: string, str2: string): string {
  const tokens1 = new Set(str1.split(/\s+/));

  const tokens2 = new Set(str2.split(/\s+/));

  const difference = Array.from(tokens1).filter((token) => !tokens2.has(token));

  return difference.join(" ");
}
