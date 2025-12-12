export interface AnchorScrollObject {
  /**
   * Vertical scroll offset.
   * Can be a number, a function returning a number,
   * or an Element whose offsetTop will be used.
   */
  yOffset?: number | (() => number) | Element;
}
export type AnchorScrollFunction = (hash?: string) => void;
/**
 * AngularJS $anchorScroll service
 *
 * Callable as a function and also exposes properties.
 */
export type AnchorScrollService = AnchorScrollFunction | AnchorScrollObject;
