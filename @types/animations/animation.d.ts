export function AnimationProvider(): void;
export class AnimationProvider {
  drivers: string[];
  $get: (
    | string
    | ((
        $rootScope: ng.RootScopeService,
        $injector: ng.InjectorService,
      ) => (elementParam: any, event: any, options: any) => AnimateRunner)
  )[];
}
import { AnimateRunner } from "./runner/animate-runner.js";
