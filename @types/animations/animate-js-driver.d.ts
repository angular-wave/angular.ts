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
  $get: (
    | string
    | (($$animateJs: import("./interface.ts").AnimateJsFn) => (
        animationDetails: import("./interface.ts").AnimationDetails,
      ) =>
        | import("./interface.ts").Animator
        | {
            start(): AnimateRunner;
          })
  )[];
}
export namespace AnimateJsDriverProvider {
  let $inject: string[];
}
import { AnimateRunner } from "./runner/animate-runner.js";
