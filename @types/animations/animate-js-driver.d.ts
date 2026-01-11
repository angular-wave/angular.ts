/**
 * @param {import("./animation.js").AnimationProvider} $$animationProvider
 */
export function AnimateJsDriverProvider(
  $$animationProvider: import("./animation.js").AnimationProvider,
): void;
export class AnimateJsDriverProvider {
  /**
   * @param {import("./animation.js").AnimationProvider} $$animationProvider
   */
  constructor($$animationProvider: import("./animation.js").AnimationProvider);
  $get: (string | (($$animateJs: any) => (animationDetails: any) => any))[];
}
export namespace AnimateJsDriverProvider {
  let $inject: string[];
}
