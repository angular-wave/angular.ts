import { isArray, isString } from "../shared/utils.js";
import { NodeType } from "../shared/node.js";

export const ADD_CLASS_SUFFIX = "-add";
export const REMOVE_CLASS_SUFFIX = "-remove";
export const EVENT_CLASS_PREFIX = "ng-";
export const ACTIVE_CLASS_SUFFIX = "-active";
export const PREPARE_CLASS_SUFFIX = "-prepare";

export const NG_ANIMATE_CLASSNAME = "ng-animate";
export const NG_ANIMATE_CHILDREN_DATA = "$$ngAnimateChildren";

/**
 * @param {ng.AnimationOptions} options
 */
export function packageStyles(options) {
  return options?.to || options?.from
    ? { to: options.to, from: options.from }
    : {};
}

/**
 * @param {string | string[]} classes
 * @param {string} fix
 * @param {boolean | undefined} [isPrefix]
 */
export function pendClasses(classes, fix, isPrefix) {
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

export function applyAnimationClassesFactory() {
  return function (
    /** @type {HTMLElement} */ element,
    /** @type {ng.AnimationOptions} */ options,
  ) {
    if (options.addClass) {
      element.classList.add(...options.addClass.trim().split(" "));
      options.addClass = undefined;
    }

    if (options.removeClass) {
      element.classList.remove(...options.removeClass.trim().split(" "));
      options.removeClass = undefined;
    }
  };
}

/**
 * @param {ng.AnimationOptions | undefined} options
 */
export function prepareAnimationOptions(options) {
  const animateOptions = options || /** @type {ng.AnimationOptions} */ ({});

  if (!animateOptions.$$prepared) {
    let domOperation =
      animateOptions.domOperation ||
      (() => {
        /* empty */
      });

    animateOptions.domOperation = function () {
      animateOptions.$$domOperationFired = true;
      domOperation();
      domOperation = () => {
        /* empty */
      };
    };
    animateOptions.$$prepared = true;
  }

  return animateOptions;
}

/**
 * @param {HTMLElement} element
 * @param {ng.AnimationOptions | undefined} options
 */
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
 * @param {ng.AnimationOptions} [options] - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationFromStyles(element, options) {
  if (options && options.from) {
    Object.assign(element.style, options.from);
    options.from = undefined;
  }
}

/**
 * Applies final animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.to`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {ng.AnimationOptions} [options] - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationToStyles(element, options) {
  if (options && options.to) {
    Object.assign(element.style, options.to);
    options.to = undefined;
  }
}

/**
 * Merge old and new animation options for an element, computing
 * the final addClass and removeClass values.
 *
 * @param {HTMLElement} element - The DOM element being animated.
 * @param {{ options?: ng.AnimationOptions; addClass?: string; removeClass?: string }} oldAnimation
 * @param {{ options?: ng.AnimationOptions; addClass?: string; removeClass?: string; preparationClasses?: string }} newAnimation
 * @returns {ng.AnimationOptions} - The merged animation options.
 */
export function mergeAnimationDetails(element, oldAnimation, newAnimation) {
  const target =
    oldAnimation.options || /** @type {ng.AnimationOptions} */ ({});

  const newOptions =
    newAnimation.options || /** @type {ng.AnimationOptions} */ ({});

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
  Object.assign(target, newOptions);

  // Combine addClass / removeClass
  const addList = `${target.addClass || ""} ${newOptions.addClass || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const removeList =
    `${target.removeClass || ""} ${newOptions.removeClass || ""}`
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  // Track existing classes on the element
  const existingSet = new Set(
    (element.getAttribute("class") || "").split(/\s+/).filter(Boolean),
  );

  // Compute final addClass and removeClass
  /** @type {string[]} */
  const finalAdd = [];

  /** @type {string[]} */
  const finalRemove = [];

  addList.forEach(function (cls) {
    if (!existingSet.has(cls)) finalAdd.push(cls);
  });

  removeList.forEach(function (cls) {
    if (existingSet.has(cls)) finalRemove.push(cls);
  });

  target.addClass = finalAdd.length
    ? /** @type {string} */ (finalAdd.join(" "))
    : undefined;
  target.removeClass = finalRemove.length
    ? /** @type {string} */ (finalRemove.join(" "))
    : undefined;

  // Update oldAnimation references
  oldAnimation.addClass = target.addClass;
  oldAnimation.removeClass = target.removeClass;

  return target;
}

/**
 * @param {HTMLElement} element
 * @param {string | null} event
 * @param {ng.AnimationOptions} options
 */
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

/**
 * @param {HTMLElement} element
 * @param {ng.AnimationOptions} options
 */
export function clearGeneratedClasses(element, options) {
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
 * @param {HTMLElement} node
 * @param {boolean} applyBlock
 * @returns {string[]}
 */
export function blockKeyframeAnimations(node, applyBlock) {
  const value = applyBlock ? "paused" : "";

  const key = `animationPlayState`;

  applyInlineStyle(node, [key, value]);

  return [key, value];
}

/**
 * @param {HTMLElement} node
 * @param {any[]} styleTuple
 */
export function applyInlineStyle(node, styleTuple) {
  const prop = styleTuple[0];

  node.style[prop] = styleTuple[1];
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export function concatWithSpace(a, b) {
  return [a, b].filter(Boolean).join(" ");
}
