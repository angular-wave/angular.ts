export class AnimationProvider {
  /**
   * @type {string[]}
   */
  _drivers: string[];
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: ng.InjectorService,
      ) => import("./interface.ts").AnimationService)
  )[];
  #private;
}
export type SortedAnimationEntry =
  import("./interface.ts").SortedAnimationEntry;
export type AnimationOptions = import("./interface.ts").AnimationOptions;
export type AnimationDetails = import("./interface.ts").AnimationDetails;
export type AnimationEntry = import("./interface.ts").AnimationEntry;
export type AnchorRef = import("./interface.ts").AnchorRef;
export type AnchorRefEntry = import("./interface.ts").AnchorRefEntry;
