import { assign, isArray, isString, isInstanceOf, arrayFrom } from '../shared/utils.js';
import { NodeType } from '../shared/node.js';

const ADD_CLASS_SUFFIX = "-add";
const REMOVE_CLASS_SUFFIX = "-remove";
const EVENT_CLASS_PREFIX = "ng-";
const ACTIVE_CLASS_SUFFIX = "-active";
const PREPARE_CLASS_SUFFIX = "-prepare";
const NG_ANIMATE_CLASSNAME = "ng-animate";
const NG_ANIMATE_CHILDREN_DATA = "$$ngAnimateChildren";
/**
 * Returns only the `from`/`to` style portions of an animation options object.
 */
function packageStyles(options) {
    return options?.to || options?.from
        ? { to: options.to, from: options.from }
        : {};
}
/**
 * Appends or prepends a suffix/prefix to each class name in a class list.
 */
function pendClasses(classes, fix, isPrefix) {
    const arrayClasses = isArray(classes)
        ? classes
        : classes && isString(classes)
            ? classes.trim().split(/\s+/)
            : [];
    return arrayClasses
        .filter(Boolean)
        .map((klass) => (isPrefix ? fix + klass : klass + fix))
        .join(" ");
}
/**
 * Removes comment nodes from a node or node list, returning only element nodes.
 */
function stripCommentsFromElement(element) {
    if (isInstanceOf(element, NodeList)) {
        return arrayFrom(element).filter((x) => x.nodeType === NodeType._ELEMENT_NODE);
    }
    else if (element.nodeType === NodeType._ELEMENT_NODE) {
        return element;
    }
    else {
        return undefined;
    }
}
function applyAnimationClasses(element, options) {
    if (options.addClass) {
        element.classList.add(...options.addClass.trim().split(" "));
        options.addClass = undefined;
    }
    if (options.removeClass) {
        element.classList.remove(...options.removeClass.trim().split(" "));
        options.removeClass = undefined;
    }
}
/**
 * Ensures animation options are normalized and safe to mutate.
 */
function prepareAnimationOptions(options) {
    const animateOptions = options || {};
    if (!animateOptions._prepared) {
        let domOperation = animateOptions.domOperation ||
            (() => {
                /* empty */
            });
        animateOptions.domOperation = function () {
            animateOptions._domOperationFired = true;
            domOperation();
            domOperation = () => {
                /* empty */
            };
        };
        animateOptions._prepared = true;
    }
    return animateOptions;
}
/**
 * Applies both `from` and `to` animation style blocks to an element.
 */
function applyAnimationStyles(element, options) {
    applyAnimationFromStyles(element, options);
    applyAnimationToStyles(element, options);
}
/**
 * Applies initial animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.from`, then clears the property to prevent reuse.
 *
 * @param element - The target DOM element to apply styles to.
 * @param [options] - options containing a `from` object with CSS property–value pairs.
 */
function applyAnimationFromStyles(element, options) {
    if (options && options.from) {
        assign(element.style, options.from);
        options.from = undefined;
    }
}
/**
 * Applies final animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.to`, then clears the property to prevent reuse.
 *
 * @param element - The target DOM element to apply styles to.
 * @param [options] - options containing a `from` object with CSS property–value pairs.
 */
function applyAnimationToStyles(element, options) {
    if (options && options.to) {
        assign(element.style, options.to);
        options.to = undefined;
    }
}
/**
 * Merge old and new animation options for an element, computing
 * the final addClass and removeClass values.
 *
 */
function mergeAnimationDetails(element, oldAnimation, newAnimation) {
    const target = oldAnimation.options || {};
    const newOptions = newAnimation.options || {};
    // Merge preparation classes if any
    if (newOptions.preparationClasses) {
        target.preparationClasses = [
            newOptions.preparationClasses,
            target.preparationClasses,
        ]
            .filter(Boolean)
            .join(" ");
        delete newOptions.preparationClasses;
    }
    // Merge other properties except addClass/removeClass
    assign(target, newOptions);
    // Combine addClass / removeClass
    const addList = `${target.addClass || ""} ${newOptions.addClass || ""}`
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const removeList = `${target.removeClass || ""} ${newOptions.removeClass || ""}`
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    // Track existing classes on the element
    const existingSet = new Set((element.getAttribute("class") || "").split(/\s+/).filter(Boolean));
    // Compute final addClass and removeClass
    const finalAdd = [];
    const finalRemove = [];
    addList.forEach(function (cls) {
        if (!existingSet.has(cls))
            finalAdd.push(cls);
    });
    removeList.forEach(function (cls) {
        if (existingSet.has(cls))
            finalRemove.push(cls);
    });
    target.addClass = finalAdd.length ? finalAdd.join(" ") : undefined;
    target.removeClass = finalRemove.length ? finalRemove.join(" ") : undefined;
    // Update oldAnimation references
    oldAnimation.addClass = target.addClass;
    oldAnimation.removeClass = target.removeClass;
    return target;
}
/**
 * Adds generated preparation classes used to bootstrap an animation.
 */
function applyGeneratedPreparationClasses(element, event, options) {
    let classes = "";
    if (event) {
        classes = pendClasses(event, EVENT_CLASS_PREFIX, true);
    }
    if (options.addClass) {
        classes = concatWithSpace(classes, pendClasses(options.addClass, ADD_CLASS_SUFFIX));
    }
    if (options.removeClass) {
        classes = concatWithSpace(classes, pendClasses(options.removeClass, REMOVE_CLASS_SUFFIX));
    }
    if (classes.length) {
        options.preparationClasses = classes;
        element.className += ` ${classes}`;
    }
}
/**
 * Removes generated preparation and active animation classes from an element.
 */
function clearGeneratedClasses(element, options) {
    if (options.preparationClasses) {
        options.preparationClasses
            .split(" ")
            .forEach((cls) => element.classList.remove(cls));
        options.preparationClasses = undefined;
    }
    if (options.activeClasses) {
        options.activeClasses
            .split(" ")
            .forEach((cls) => element.classList.remove(cls));
        options.activeClasses = undefined;
    }
}
/**
 * Pauses or unpauses keyframe animations on an element.
 */
function _blockKeyframeAnimations(node, applyBlock) {
    const value = applyBlock ? "paused" : "";
    const key = "animationPlayState";
    applyInlineStyle(node, [key, value]);
    return [key, value];
}
/**
 * Applies one inline style tuple to an element.
 */
function applyInlineStyle(node, styleTuple) {
    const prop = styleTuple[0];
    node.style[prop] = styleTuple[1];
}
/**
 * Concatenates two strings with a single separating space.
 */
function concatWithSpace(a, b) {
    return [a, b].filter(Boolean).join(" ");
}

export { ACTIVE_CLASS_SUFFIX, ADD_CLASS_SUFFIX, EVENT_CLASS_PREFIX, NG_ANIMATE_CHILDREN_DATA, NG_ANIMATE_CLASSNAME, PREPARE_CLASS_SUFFIX, REMOVE_CLASS_SUFFIX, _blockKeyframeAnimations, applyAnimationClasses, applyAnimationFromStyles, applyAnimationStyles, applyAnimationToStyles, applyGeneratedPreparationClasses, applyInlineStyle, clearGeneratedClasses, concatWithSpace, mergeAnimationDetails, packageStyles, pendClasses, prepareAnimationOptions, stripCommentsFromElement };
