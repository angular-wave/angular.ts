export function assertArg(arg: any, name: any, reason: any): any;
export function packageStyles(options: any): {
  to: any;
  from: any;
};
export function pendClasses(classes: any, fix: any, isPrefix: any): string;
export function removeFromArray(arr: any, val: any): void;
/**
 *
 * @param {NodeList|Node} element
 * @returns {Node[]|Node|undefined}
 */
export function stripCommentsFromElement(
  element: NodeList | Node,
): Node[] | Node | undefined;
/**
 * @param {NodeList|Node} element
 * @returns {Node}
 */
export function extractElementNode(element: NodeList | Node): Node;
export function applyAnimationClassesFactory(): (
  element: any,
  options: any,
) => void;
export function prepareAnimationOptions(options: any): any;
export function applyAnimationStyles(element: any, options: any): void;
/**
 * Applies initial animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.from`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {{ from?: Partial<CSSStyleDeclaration> | null }} options - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationFromStyles(
  element: HTMLElement,
  options: {
    from?: Partial<CSSStyleDeclaration> | null;
  },
): void;
/**
 * Applies final animation styles to a DOM element.
 *
 * This function sets the element's inline styles using the properties
 * defined in `options.to`, then clears the property to prevent reuse.
 *
 * @param {HTMLElement} element - The target DOM element to apply styles to.
 * @param {{ to?: Partial<CSSStyleDeclaration> | null }} options - options containing a `from` object with CSS property–value pairs.
 */
export function applyAnimationToStyles(
  element: HTMLElement,
  options: {
    to?: Partial<CSSStyleDeclaration> | null;
  },
): void;
export function mergeAnimationDetails(
  element: any,
  oldAnimation: any,
  newAnimation: any,
): any;
export function resolveElementClasses(
  existing: any,
  toAdd: any,
  toRemove: any,
): {
  addClass: string;
  removeClass: string;
};
export function applyGeneratedPreparationClasses(
  element: any,
  event: any,
  options: any,
): void;
export function clearGeneratedClasses(element: any, options: any): void;
export function blockKeyframeAnimations(node: any, applyBlock: any): string[];
export function applyInlineStyle(node: any, styleTuple: any): void;
export function concatWithSpace(a: any, b: any): any;
export const ADD_CLASS_SUFFIX: "-add";
export const REMOVE_CLASS_SUFFIX: "-remove";
export const EVENT_CLASS_PREFIX: "ng-";
export const ACTIVE_CLASS_SUFFIX: "-active";
export const PREPARE_CLASS_SUFFIX: "-prepare";
export const NG_ANIMATE_CLASSNAME: "ng-animate";
export const NG_ANIMATE_CHILDREN_DATA: "$$ngAnimateChildren";
export const ngMinErr: (arg0: string, ...arg1: any[]) => Error;
