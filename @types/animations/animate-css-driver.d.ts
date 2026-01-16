/**
 * @param {import("./animation.js").AnimationProvider} $$animationProvider
 */
export function AnimateCssDriverProvider(
  $$animationProvider: import("./animation.js").AnimationProvider,
): void;
export class AnimateCssDriverProvider {
  /**
   * @param {import("./animation.js").AnimationProvider} $$animationProvider
   */
  constructor($$animationProvider: import("./animation.js").AnimationProvider);
  /**
   * @returns {Function}
   */
  $get: (
    | string
    | ((
        $animateCss: any,
        $rootElement: HTMLElement,
      ) => (animationDetails: import("./interface.ts").AnimationDetails) => any)
  )[];
}
export namespace AnimateCssDriverProvider {
  let $inject: string[];
}
