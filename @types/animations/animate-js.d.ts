/**
 * @param {import("./animate.js").AnimateProvider} $animateProvider
 */
export function AnimateJsProvider(
  $animateProvider: import("./animate.js").AnimateProvider,
): void;
export class AnimateJsProvider {
  /**
   * @param {import("./animate.js").AnimateProvider} $animateProvider
   */
  constructor($animateProvider: import("./animate.js").AnimateProvider);
  $get: (
    | string
    | (($injector: ng.InjectorService) => import("./interface.ts").AnimateJsFn)
  )[];
}
export namespace AnimateJsProvider {
  let $inject: string[];
}
