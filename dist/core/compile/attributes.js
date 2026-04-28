import { getBooleanAttrName } from '../../shared/dom.js';
import { getAnimateForNode, createLazyAnimate } from '../../animations/lazy-animate.js';
import { directiveNormalize, snakeCase, getNodeName, isNullOrUndefined, nullObject, hasOwn, isUndefined, arrayRemove, isString, trim, keys, minErr } from '../../shared/utils.js';
import { ALIASED_ATTR } from '../../shared/constants.js';

const $compileMinErr = minErr("$compile");
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
    constructor($injector, $exceptionHandler, $sce, nodeRef, attributesToCopy) {
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
        this._sce = $sce;
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
        this._nodeRef = nodeRef;
    }
    /** @ignore Internal element accessor used by legacy attribute helpers. */
    /** @internal */
    _element() {
        return this._nodeRef?._getAny();
    }
    $addClass(classVal) {
        if (classVal && classVal.length > 0) {
            const element = this._element();
            const animate = getAnimateForNode(this._getAnimate, element);
            if (animate) {
                animate.addClass(element, classVal);
            }
            else {
                this._nodeRef?.element.classList.add(classVal);
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
                this._nodeRef?.element.classList.remove(classVal);
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
                this._nodeRef?.element.classList.add(...toAdd);
            }
        }
        const toRemove = tokenDifference(oldClasses, newClasses);
        if (toRemove.length) {
            if (animate) {
                animate.removeClass(element, toRemove.join(" "));
            }
            else {
                this._nodeRef?.element.classList.remove(...toRemove);
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
        const elementNode = this._nodeRef?.node;
        const nodeName = elementNode && getNodeName(elementNode);
        let maybeSanitizedValue;
        if (nodeName === "img" && key === "srcset") {
            this[key] = maybeSanitizedValue = this._sanitizeSrcset(value, "$set('srcset', value)");
        }
        else {
            maybeSanitizedValue = value;
        }
        if (writeAttr !== false) {
            if (!attrName)
                return;
            const elem = this._element();
            if (isNullOrUndefined(maybeSanitizedValue)) {
                elem.removeAttribute(attrName);
            }
            else if (SIMPLE_ATTR_NAME.test(attrName)) {
                if (booleanKey && maybeSanitizedValue === false) {
                    elem.removeAttribute(attrName);
                }
                else if (booleanKey) {
                    elem.toggleAttribute(attrName, maybeSanitizedValue);
                }
                else {
                    elem.setAttribute(attrName, maybeSanitizedValue);
                }
            }
            else {
                this._setSpecialAttr(elem, attrName, maybeSanitizedValue);
            }
        }
        const { _observers } = this;
        if (_observers && _observers[observer]) {
            const observerListeners = _observers[observer];
            for (let i = 0, l = observerListeners.length; i < l; i++) {
                try {
                    observerListeners[i](maybeSanitizedValue);
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
    /** @internal */
    _sanitizeSrcset(value, invokeType) {
        let i;
        if (!value) {
            return value;
        }
        if (!isString(value)) {
            throw $compileMinErr("srcset", 'Can\'t pass trusted values to `{0}`: "{1}"', invokeType, value.toString());
        }
        let result = "";
        const trimmedSrcset = trim(value);
        const srcPattern = /(\s+\d+(?:\.\d+)?x\s*,|\s+\d+w\s*,|\s+[^\s,]+\s*,|\s+,|,\s+)/;
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
