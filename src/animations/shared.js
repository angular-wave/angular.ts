import { extend, isArray, isString, minErr } from "../shared/utils.js";
import { ASTType } from "../core/parse/ast-type.js";
import { NodeType } from "../shared/dom.js";

export const ADD_CLASS_SUFFIX = "-add";
export const REMOVE_CLASS_SUFFIX = "-remove";
export const EVENT_CLASS_PREFIX = "ng-";
export const ACTIVE_CLASS_SUFFIX = "-active";
export const PREPARE_CLASS_SUFFIX = "-prepare";

export const NG_ANIMATE_CLASSNAME = "ng-animate";
export const NG_ANIMATE_CHILDREN_DATA = "$$ngAnimateChildren";

// Detect proper transitionend/animationend event names.
export let CSS_PREFIX = "";
export let TRANSITION_PROP;
export let TRANSITIONEND_EVENT;
export let ANIMATION_PROP;
export let ANIMATIONEND_EVENT;

// If unprefixed events are not supported but webkit-prefixed are, use the latter.
// Otherwise, just use W3C names, browsers not supporting them at all will just ignore them.
// Note: Chrome implements `window.onwebkitanimationend` and doesn't implement `window.onanimationend`
// but at the same time dispatches the `animationend` event and not `webkitAnimationEnd`.
// Register both events in case `window.onanimationend` is not supported because of that,
// do the same for `transitionend` as Safari is likely to exhibit similar behavior.
// Also, the only modern browser that uses vendor prefixes for transitions/keyframes is webkit
// therefore there is no reason to test anymore for other vendor prefixes:
// http://caniuse.com/#search=transition
if (
  window.ontransitionend === undefined &&
  window.onwebkittransitionend !== undefined
) {
  CSS_PREFIX = "-webkit-";
  TRANSITION_PROP = "WebkitTransition";
  TRANSITIONEND_EVENT = "webkitTransitionEnd transitionend";
} else {
  TRANSITION_PROP = "transition";
  TRANSITIONEND_EVENT = "transitionend";
}

if (
  window.onanimationend === undefined &&
  window.onwebkitanimationend !== undefined
) {
  CSS_PREFIX = "-webkit-";
  ANIMATION_PROP = "WebkitAnimation";
  ANIMATIONEND_EVENT = "webkitAnimationEnd animationend";
} else {
  ANIMATION_PROP = "animation";
  ANIMATIONEND_EVENT = "animationend";
}

export const DURATION_KEY = "Duration";
export const PROPERTY_KEY = ASTType._Property;
export const DELAY_KEY = "Delay";
export const TIMING_KEY = "TimingFunction";
export const ANIMATION_ITERATION_COUNT_KEY = "IterationCount";
export const ANIMATION_PLAYSTATE_KEY = "PlayState";
export const SAFE_FAST_FORWARD_DURATION_VALUE = 9999;

export const ANIMATION_DELAY_PROP = ANIMATION_PROP + DELAY_KEY;
export const ANIMATION_DURATION_PROP = ANIMATION_PROP + DURATION_KEY;
export const TRANSITION_DELAY_PROP = TRANSITION_PROP + DELAY_KEY;
export const TRANSITION_DURATION_PROP = TRANSITION_PROP + DURATION_KEY;

export const ngMinErr = minErr("ng");
export function assertArg(arg, name, reason) {
  if (!arg) {
    throw ngMinErr(
      "areq",
      "Argument '{0}' is {1}",
      name || "?",
      reason || "required",
    );
  }

  return arg;
}

export function packageStyles(options) {
  const styles = {};

  if (options && (options.to || options.from)) {
    styles.to = options.to;
    styles.from = options.from;
  }

  return styles;
}

export function pendClasses(classes, fix, isPrefix) {
  let className = "";

  classes = isArray(classes)
    ? classes
    : classes && isString(classes) && classes.length
      ? classes.split(/\s+/)
      : [];
  classes.forEach((klass, i) => {
    if (klass && klass.length > 0) {
      className += i > 0 ? " " : "";
      className += isPrefix ? fix + klass : klass + fix;
    }
  });

  return className;
}

export function removeFromArray(arr, val) {
  const index = arr.indexOf(val);

  if (val >= 0) {
    arr.splice(index, 1);
  }
}

/**
 *
 * @param {NodeList|Node} element
 * @returns {Node[]|Node|undefined}
 */
export function stripCommentsFromElement(element) {
  if (element instanceof NodeList) {
    return Array.from(element).filter(
      (x) => x.nodeType === NodeType._ELEMENT_NODE,
    );
  } else if (element.nodeType === NodeType._ELEMENT_NODE) {
    return /** @type {Node} */ (element);
  } else {
    return undefined;
  }
}

/**
 * @param {NodeList|Node} element
 * @returns {Node}
 */
export function extractElementNode(element) {
  if (!element || !isArray(element)) return /** @type {Node} */ (element);

  for (let i = 0; i < /** @type {NodeList} */ (element).length; i++) {
    const elm = element[i];

    if (elm.nodeType === NodeType._ELEMENT_NODE) {
      return elm;
    }
  }

  return undefined; // TODO mayb throw?
}

export function applyAnimationClassesFactory() {
  return function (element, options) {
    if (options.addClass) {
      element.classList.add(...options.addClass.trim().split(" "));
      options.addClass = null;
    }

    if (options.removeClass) {
      element.classList.remove(...options.removeClass.trim().split(" "));
      options.removeClass = null;
    }
  };
}

export function prepareAnimationOptions(options) {
  options = options || {};

  if (!options.$$prepared) {
    let domOperation =
      options.domOperation ||
      (() => {
        /* empty */
      });

    options.domOperation = function () {
      options.$$domOperationFired = true;
      domOperation();
      domOperation = () => {
        /* empty */
      };
    };
    options.$$prepared = true;
  }

  return options;
}

export function applyAnimationStyles(element, options) {
  applyAnimationFromStyles(element, options);
  applyAnimationToStyles(element, options);
}

/**
 * Applies initial animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.from`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {{ from?: Partial<CSSStyleDeclaration> | null }} options - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationFromStyles(element, options) {
  if (options.from) {
    Object.assign(element.style, options.from);
    options.from = null;
  }
}

/**
 * Applies final animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.to`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {{ to?: Partial<CSSStyleDeclaration> | null }} options - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationToStyles(element, options) {
  if (options.to) {
    Object.assign(element.style, options.to);
    options.to = null;
  }
}

export function mergeAnimationDetails(element, oldAnimation, newAnimation) {
  const target = oldAnimation.options || {};

  const newOptions = newAnimation.options || {};

  const toAdd = `${target.addClass || ""} ${newOptions.addClass || ""}`;

  const toRemove = `${target.removeClass || ""} ${newOptions.removeClass || ""}`;

  const classes = resolveElementClasses(
    element.getAttribute("class"),
    toAdd,
    toRemove,
  );

  if (newOptions.preparationClasses) {
    target.preparationClasses = concatWithSpace(
      newOptions.preparationClasses,
      target.preparationClasses,
    );
    delete newOptions.preparationClasses;
  }

  extend(target, newOptions);

  if (classes.addClass) {
    target.addClass = classes.addClass;
  } else {
    target.addClass = null;
  }

  if (classes.removeClass) {
    target.removeClass = classes.removeClass;
  } else {
    target.removeClass = null;
  }

  oldAnimation.addClass = target.addClass;
  oldAnimation.removeClass = target.removeClass;

  return target;
}

export function resolveElementClasses(existing, toAdd, toRemove) {
  const ADD_CLASS = 1;

  const REMOVE_CLASS = -1;

  const flags = {};

  existing = splitClassesToLookup(existing);

  toAdd = splitClassesToLookup(toAdd);
  Object.keys(toAdd).forEach((key) => {
    flags[key] = ADD_CLASS;
  });

  toRemove = splitClassesToLookup(toRemove);
  Object.keys(toRemove).forEach((key) => {
    flags[key] = flags[key] === ADD_CLASS ? null : REMOVE_CLASS;
  });

  const classes = {
    addClass: "",
    removeClass: "",
  };

  Object.entries(flags).forEach(([klass, val]) => {
    let prop, allow;

    if (val === ADD_CLASS) {
      prop = "addClass";
      allow = !existing[klass] || existing[klass + REMOVE_CLASS_SUFFIX];
    } else if (val === REMOVE_CLASS) {
      prop = "removeClass";
      allow = existing[klass] || existing[klass + ADD_CLASS_SUFFIX];
    }

    if (allow) {
      if (classes[prop].length) {
        classes[prop] += " ";
      }
      classes[prop] += klass;
    }
  });

  function splitClassesToLookup(cls) {
    if (isString(cls)) {
      cls = cls.trim().split(" ");
    }

    const obj = {};

    if (cls) {
      cls.forEach((klass) => {
        // sometimes the split leaves empty string values
        // incase extra spaces were applied to the options
        if (klass.length) {
          obj[klass] = true;
        }
      });
    }

    return obj;
  }

  return classes;
}

export function applyGeneratedPreparationClasses(element, event, options) {
  let classes = "";

  if (event) {
    classes = pendClasses(event, EVENT_CLASS_PREFIX, true);
  }

  if (options.addClass) {
    classes = concatWithSpace(
      classes,
      pendClasses(options.addClass, ADD_CLASS_SUFFIX),
    );
  }

  if (options.removeClass) {
    classes = concatWithSpace(
      classes,
      pendClasses(options.removeClass, REMOVE_CLASS_SUFFIX),
    );
  }

  if (classes.length) {
    options.preparationClasses = classes;
    element.className += ` ${classes}`;
  }
}

export function clearGeneratedClasses(element, options) {
  if (options.preparationClasses) {
    options.preparationClasses
      .split(" ")
      .forEach((cls) => element.classList.remove(cls));
    options.preparationClasses = null;
  }

  if (options.activeClasses) {
    options.activeClasses
      .split(" ")
      .forEach((cls) => element.classList.remove(cls));
    options.activeClasses = null;
  }
}

export function blockKeyframeAnimations(node, applyBlock) {
  const value = applyBlock ? "paused" : "";

  const key = ANIMATION_PROP + ANIMATION_PLAYSTATE_KEY;

  applyInlineStyle(node, [key, value]);

  return [key, value];
}

export function applyInlineStyle(node, styleTuple) {
  const prop = styleTuple[0];

  node.style[prop] = styleTuple[1];
}

export function concatWithSpace(a, b) {
  if (!a) return b;

  if (!b) return a;

  return `${a} ${b}`;
}
