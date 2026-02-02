export interface AnchorScrollService {
  /**
   * Invoke anchor scrolling.
   */
  (hashOrElement?: string | number | HTMLElement): void;
  /**
   * Vertical scroll offset.
   * Can be a number, a function returning a number,
   * or an Element whose offsetTop will be used.
   */
  yOffset?: number | (() => number) | Element;
}
