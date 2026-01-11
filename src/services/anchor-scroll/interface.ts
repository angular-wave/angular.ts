export interface AnchorScrollService {
  /**
   * Invoke anchor scrolling.
   */
  (hash?: string | number): void;

  /**
   * Vertical scroll offset.
   * Can be a number, a function returning a number,
   * or an Element whose offsetTop will be used.
   */
  yOffset?: number | (() => number) | Element;
}
