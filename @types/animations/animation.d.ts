export function AnimationProvider(): void;
export class AnimationProvider {
  drivers: any[];
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: ng.InjectorService,
        $$rAFScheduler: import("./raf-scheduler.js").RafScheduler,
        $$animateCache: any,
      ) => (elementParam: any, event: any, options: any) => AnimateRunner)
  )[];
}
import { AnimateRunner } from "./runner/animate-runner.js";
