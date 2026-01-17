export function AnimationProvider(): void;
export class AnimationProvider {
  drivers: string[];
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: ng.InjectorService,
      ) => import("./interface.ts").AnimationService)
  )[];
}
export type SortedAnimationEntry =
  import("./interface.ts").SortedAnimationEntry;
