export function AnimationProvider(): void;
export class AnimationProvider {
  drivers: any[];
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: any,
        $$AnimateRunner: typeof import("./animate-runner.js").AnimateRunner,
        $$rAFScheduler: any,
        $$animateCache: any,
      ) => (
        element: any,
        event: any,
        options: any,
      ) => import("./animate-runner.js").AnimateRunner)
  )[];
}
