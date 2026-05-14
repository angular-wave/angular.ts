import { getBooleanAttrName } from '../../shared/dom.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { directiveNormalize, assertDefined, snakeCase, isNullOrUndefined, nullObject, hasOwn, isUndefined, arrayRemove, keys } from '../../shared/utils.js';
import { ALIASED_ATTR } from '../../shared/constants.js';
import { NodeRef } from '../../shared/noderef.js';

const SIMPLE_ATTR_NAME = /^\w/;
const specialAttrHolder = document.createElement("div");
const lazyAnimateByInjector = new WeakMap();
function getLazyAnimate($injector) {
    let getAnimate = lazyAnimateByInjector.get($injector);
    if (!getAnimate) {
        getAnimate = createLazyAnimate($injector);
        lazyAnimateByInjector.set($injector, getAnimate);
    }
    return getAnimate;
}
class Attributes {
    constructor($injector, $exceptionHandler, node, attributesToCopy) {
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
        this.$normalize = directiveNormalize;
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
        }
        else {
            this._node = node;
            this._nodeRefCache = undefined;
        }
    }
    /** @internal */
    get _nodeRef() {
        const node = this._node;
        if (!node) {
            return undefined;
        }
        return (this._nodeRefCache || (this._nodeRefCache = NodeRef._fromNode(node)));
    }
    /** @internal */
    set _nodeRef(nodeRef) {
        this._nodeRefCache = nodeRef;
        this._node = nodeRef?._getAny();
    }
    /** @ignore Internal element accessor used by legacy attribute helpers. */
    /** @internal */
    _element() {
        return assertDefined(this._node);
    }
    $addClass(classVal) {
        if (classVal && classVal.length > 0) {
            const element = this._element();
            const animate = getAnimateForNode(this._getAnimate, element);
            if (animate) {
                animate.addClass(element, classVal);
            }
            else {
                element.classList.add(classVal);
            }
        }
    }
    $removeClass(classVal) {
        if (classVal && classVal.length > 0) {
            const element = this._element();
            const animate = getAnimateForNode(this._getAnimate, element);
            if (animate) {
                animate.removeClass(element, classVal);
            }
            else {
                element.classList.remove(classVal);
            }
        }
    }
    $updateClass(newClasses, oldClasses) {
        if (newClasses === oldClasses) {
            return;
        }
        const element = this._element();
        const animate = getAnimateForNode(this._getAnimate, element);
        const toAdd = tokenDifference(newClasses, oldClasses);
        if (toAdd.length) {
            if (animate) {
                animate.addClass(element, toAdd.join(" "));
            }
            else {
                element.classList.add(...toAdd);
            }
        }
        const toRemove = tokenDifference(oldClasses, newClasses);
        if (toRemove.length) {
            if (animate) {
                animate.removeClass(element, toRemove.join(" "));
            }
            else {
                element.classList.remove(...toRemove);
            }
        }
    }
    $set(key, value, writeAttr, attrName) {
        const node = this._element();
        const booleanKey = getBooleanAttrName(node, key);
        const aliasedKey = ALIASED_ATTR[key];
        let observer = key;
        if (booleanKey) {
            this._element()[key] = value;
            attrName = booleanKey;
        }
        else if (aliasedKey) {
            this[aliasedKey] = value;
            observer = aliasedKey;
        }
        this[key] = value;
        if (attrName) {
            this.$attr[key] = attrName;
        }
        else {
            attrName = this.$attr[key];
            if (!attrName) {
                this.$attr[key] = attrName = snakeCase(key, "-");
            }
        }
        if (writeAttr !== false) {
            if (!attrName)
                return;
            const elem = this._element();
            if (isNullOrUndefined(value)) {
                elem.removeAttribute(attrName);
            }
            else if (SIMPLE_ATTR_NAME.test(attrName)) {
                if (booleanKey && value === false) {
                    elem.removeAttribute(attrName);
                }
                else if (booleanKey) {
                    elem.toggleAttribute(attrName, value);
                }
                else {
                    elem.setAttribute(attrName, value);
                }
            }
            else {
                this._setSpecialAttr(elem, attrName, value);
            }
        }
        const { _observers } = this;
        if (_observers?.[observer]) {
            const observerListeners = _observers[observer];
            for (let i = 0, l = observerListeners.length; i < l; i++) {
                try {
                    observerListeners[i](value);
                }
                catch (err) {
                    this._exceptionHandler(err);
                }
            }
        }
    }
    $observe(key, fn) {
        const _observers = this._observers || (this._observers = nullObject());
        const listeners = _observers[key] || (_observers[key] = []);
        listeners.push(fn);
        if (!listeners._inter && hasOwn(this, key) && !isUndefined(this[key])) {
            fn(this[key]);
        }
        return function () {
            arrayRemove(listeners, fn);
        };
    }
    /** @internal */
    _setSpecialAttr(element, attrName, value) {
        specialAttrHolder.innerHTML = `<span ${attrName}>`;
        const { attributes } = specialAttrHolder.firstChild;
        const attribute = attributes[0];
        attributes.removeNamedItem(attribute.name);
        attribute.value = value ?? "";
        element.attributes.setNamedItem(attribute);
    }
}
Attributes.$nonscope = true;
/**
 * Splits a space-separated class string into normalized tokens.
 *
 * @param value - The class string to split.
 * @returns The normalized class tokens.
 */
function tokenizeClassString(value) {
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

export { Attributes };
