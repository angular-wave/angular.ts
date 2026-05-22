import { hasNormalizedAttr, getBooleanAttrName } from '../../shared/dom.js';
import { createLazyAnimate } from '../../animations/lazy-animate.js';
import { updateClass } from '../../animations/class-mutation.js';
import { setInternalAttribute } from '../../services/attributes/attributes.js';
import { directiveNormalize, nullObject, keys, hasOwn, snakeCase } from '../../shared/utils.js';
import { ALIASED_ATTR } from '../../shared/constants.js';

const lazyAnimateByInjector = new WeakMap();
function getLazyAnimate($injector) {
    let getAnimate = lazyAnimateByInjector.get($injector);
    if (!getAnimate) {
        getAnimate = createLazyAnimate($injector);
        lazyAnimateByInjector.set($injector, getAnimate);
    }
    return getAnimate;
}
/** @internal */
class CompileAttributeState {
    constructor($injector, $exceptionHandler, stateToCopy) {
        /**
         * Converts an attribute name (e.g. dash/colon/underscore-delimited string, optionally prefixed with `data-`) to its
         * normalized, camelCase form.
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
        this._attributeNames = {};
        this._originalAttributeNames = nullObject();
        if (stateToCopy) {
            const attrKeys = keys(stateToCopy._attributeNames);
            for (let i = 0, l = attrKeys.length; i < l; i++) {
                const key = attrKeys[i];
                this._attributeNames[key] = stateToCopy._attributeNames[key];
            }
            const sourceKeys = keys(stateToCopy._originalAttributeNames);
            for (let i = 0, l = sourceKeys.length; i < l; i++) {
                const key = sourceKeys[i];
                this._originalAttributeNames[key] =
                    stateToCopy._originalAttributeNames[key];
            }
        }
    }
}
CompileAttributeState.$nonscope = true;
/** @internal */
function updateCompileAttributeClass(attrs, node, newClasses, oldClasses) {
    if (newClasses === oldClasses) {
        return;
    }
    updateClass(node, newClasses, oldClasses, attrs._getAnimate);
}
/** @internal */
function setCompileAttributeValue(attrs, node, key, value, writeAttr, attrName) {
    const booleanKey = getBooleanAttrName(node, key);
    const aliasedKey = hasOwn(ALIASED_ATTR, key) ? ALIASED_ATTR[key] : undefined;
    let observer = key;
    if (booleanKey) {
        node[key] = value;
        attrName = booleanKey;
    }
    else if (aliasedKey) {
        recordCompileAttribute(attrs, aliasedKey, aliasedKey);
        observer = aliasedKey;
    }
    if (attrName) {
        attrs._attributeNames[key] = attrName;
    }
    else {
        attrName = attrs._attributeNames[key];
        if (!attrName) {
            attrs._attributeNames[key] = attrName = snakeCase(key, "-");
        }
    }
    recordCompileAttribute(attrs, key, attrName);
    setInternalAttribute(node, observer, value, {
        writeAttr,
        attrName,
    });
}
/** @internal */
function recordCompileAttribute(attrs, key, attrName, sourceAttrName = attrName, overwrite = true) {
    if (overwrite || !hasOwn(attrs._attributeNames, key)) {
        attrs._attributeNames[key] = attrName;
        attrs._originalAttributeNames[key] = sourceAttrName;
    }
}
/** @internal */
function hasCompileAttribute(attrs, node, key) {
    if (hasOwn(attrs._attributeNames, key) ||
        hasOwn(attrs._originalAttributeNames, key)) {
        return true;
    }
    return hasNormalizedAttr(node, key);
}
/** @internal */
function listCompileAttributes(attrs) {
    const names = new Set(keys(attrs._attributeNames));
    keys(attrs._originalAttributeNames).forEach((key) => {
        names.add(key);
    });
    return Array.from(names);
}
/** @internal */
function getCompileAttributeName(attrs, key) {
    return attrs._attributeNames[key];
}
/** @internal */
function getCompileOriginalAttributeName(attrs, key) {
    return attrs._originalAttributeNames[key];
}

export { CompileAttributeState, getCompileAttributeName, getCompileOriginalAttributeName, hasCompileAttribute, listCompileAttributes, recordCompileAttribute, setCompileAttributeValue, updateCompileAttributeClass };
