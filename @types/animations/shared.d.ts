export declare const ADD_CLASS_SUFFIX = "-add";
export declare const REMOVE_CLASS_SUFFIX = "-remove";
export declare const EVENT_CLASS_PREFIX = "ng-";
export declare const ACTIVE_CLASS_SUFFIX = "-active";
export declare const PREPARE_CLASS_SUFFIX = "-prepare";
export declare const NG_ANIMATE_CLASSNAME = "ng-animate";
export declare const NG_ANIMATE_CHILDREN_DATA = "$$ngAnimateChildren";
/**
 * @param {ng.AnimationOptions} options
 */
export declare function packageStyles(options: any):
  | {
      to: any;
      from: any;
    }
  | {
      to?: undefined;
      from?: undefined;
    };
/**
 * @param {string | string[]} classes
 * @param {string} fix
 * @param {boolean | undefined} [isPrefix]
 */
export declare function pendClasses(
  classes: any,
  fix: any,
  isPrefix: any,
): string;
/**
 *
 * @param {NodeList|Node} element
 * @returns {Node[]|Node|undefined}
 */
export declare function stripCommentsFromElement(element: any): any;
export declare function applyAnimationClasses(
  /** @type {HTMLElement} */ element: any,
  /** @type {ng.AnimationOptions} */ options: any,
): void;
/**
 * @param {ng.AnimationOptions | undefined} options
 */
export declare function prepareAnimationOptions(options: any): any;
/**
 * @param {HTMLElement} element
 * @param {ng.AnimationOptions | undefined} options
 */
export declare function applyAnimationStyles(element: any, options: any): void;
/**
 * Applies initial animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.from`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {ng.AnimationOptions} [options] - options containing a `from` object with CSS property–value pairs.
 */
export declare function applyAnimationFromStyles(
  element: any,
  options: any,
): void;
/**
 * Applies final animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.to`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {ng.AnimationOptions} [options] - options containing a `from` object with CSS property–value pairs.
 */
export declare function applyAnimationToStyles(
  element: any,
  options: any,
): void;
/**
 * Merge old and new animation options for an element, computing
 * the final addClass and removeClass values.
 *
 * @param {HTMLElement} element - The DOM element being animated.
 * @param {{ options?: ng.AnimationOptions; addClass?: string; removeClass?: string }} oldAnimation
 * @param {{ options?: ng.AnimationOptions; addClass?: string; removeClass?: string; preparationClasses?: string }} newAnimation
 * @returns {ng.AnimationOptions} - The merged animation options.
 */
export declare function mergeAnimationDetails(
  element: any,
  oldAnimation: any,
  newAnimation: any,
): any;
/**
 * @param {HTMLElement} element
 * @param {string | null} event
 * @param {ng.AnimationOptions} options
 */
export declare function applyGeneratedPreparationClasses(
  element: any,
  event: any,
  options: any,
): void;
/**
 * @param {HTMLElement} element
 * @param {ng.AnimationOptions} options
 */
export declare function clearGeneratedClasses(element: any, options: any): void;
/**
 * @param {HTMLElement} node
 * @param {boolean} applyBlock
 * @returns {string[]}
 */
export declare function _blockKeyframeAnimations(
  node: any,
  applyBlock: any,
): string[];
/**
 * @param {HTMLElement} node
 * @param {any[]} styleTuple
 */
export declare function applyInlineStyle(node: any, styleTuple: any): void;
/**
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export declare function concatWithSpace(a: any, b: any): string;
