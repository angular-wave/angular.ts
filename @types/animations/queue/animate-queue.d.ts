/** @typedef {import("../interface.ts").AnimationOptions} AnimationOptions */
/**
 * @param {import("../animate.js").AnimateProvider} $animateProvider
 * @constructor
 */
export function AnimateQueueProvider(
  $animateProvider: import("../animate.js").AnimateProvider,
): void;
export class AnimateQueueProvider {
  /** @typedef {import("../interface.ts").AnimationOptions} AnimationOptions */
  /**
   * @param {import("../animate.js").AnimateProvider} $animateProvider
   * @constructor
   */
  constructor($animateProvider: import("../animate.js").AnimateProvider);
  rules: Record<string, any>;
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: ng.InjectorService,
        $$animation: import("../interface.ts").AnimationService,
      ) => import("../queue/interface.ts").AnimateQueueService)
  )[];
}
export namespace AnimateQueueProvider {
  let $inject: string[];
}
export type AnimationOptions = import("../interface.ts").AnimationOptions;
