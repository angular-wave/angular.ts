/**
 * @param {ng.AnimationOptions} options
 */
export function packageStyles(options: ng.AnimationOptions):
  | {
      to: Record<string, string | number>;
      from: Record<string, string | number>;
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
export function pendClasses(
  classes: string | string[],
  fix: string,
  isPrefix?: boolean | undefined,
): string;
/**
 *
 * @param {NodeList|Node} element
 * @returns {Node[]|Node|undefined}
 */
export function stripCommentsFromElement(
  element: NodeList | Node,
): Node[] | Node | undefined;
export function applyAnimationClassesFactory(): (
  /** @type {HTMLElement} */ element: HTMLElement,
  /** @type {ng.AnimationOptions} */ options: ng.AnimationOptions,
) => void;
/**
 * @param {ng.AnimationOptions | undefined} options
 */
export function prepareAnimationOptions(
  options: ng.AnimationOptions | undefined,
): import("./interface.ts").AnimationOptions;
/**
 * @param {HTMLElement} element
 * @param {ng.AnimationOptions | undefined} options
 */
export function applyAnimationStyles(
  element: HTMLElement,
  options: ng.AnimationOptions | undefined,
): void;
/**
 * Applies initial animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.from`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {ng.AnimationOptions} [options] - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationFromStyles(
  element: HTMLElement,
  options?: ng.AnimationOptions,
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
export function applyAnimationToStyles(
  element: HTMLElement,
  options?: ng.AnimationOptions,
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
export function mergeAnimationDetails(
  element: HTMLElement,
  oldAnimation: {
    options?: ng.AnimationOptions;
    addClass?: string;
    removeClass?: string;
  },
  newAnimation: {
    options?: ng.AnimationOptions;
    addClass?: string;
    removeClass?: string;
    preparationClasses?: string;
  },
): ng.AnimationOptions;
/**
 * @param {HTMLElement} element
 * @param {string | null} event
 * @param {ng.AnimationOptions} options
 */
export function applyGeneratedPreparationClasses(
  element: HTMLElement,
  event: string | null,
  options: ng.AnimationOptions,
): void;
/**
 * @param {HTMLElement} element
 * @param {ng.AnimationOptions} options
 */
export function clearGeneratedClasses(
  element: HTMLElement,
  options: ng.AnimationOptions,
): void;
/**
 * @param {HTMLElement} node
 * @param {boolean} applyBlock
 * @returns {string[]}
 */
export function blockKeyframeAnimations(
  node: HTMLElement,
  applyBlock: boolean,
): string[];
/**
 * @param {HTMLElement} node
 * @param {any[]} styleTuple
 */
export function applyInlineStyle(node: HTMLElement, styleTuple: any[]): void;
/**
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export function concatWithSpace(a: string, b: string): string;
export const ADD_CLASS_SUFFIX: "-add";
export const REMOVE_CLASS_SUFFIX: "-remove";
export const EVENT_CLASS_PREFIX: "ng-";
export const ACTIVE_CLASS_SUFFIX: "-active";
export const PREPARE_CLASS_SUFFIX: "-prepare";
export const NG_ANIMATE_CLASSNAME: "ng-animate";
export const NG_ANIMATE_CHILDREN_DATA: "$$ngAnimateChildren";
