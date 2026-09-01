import type { RuntimeModule } from "../angular-runtime.ts";
import { _animate, _injector } from "../injection-tokens.ts";
import {
  AnimationRegistry,
  createAnimateService,
} from "../animations/animate.ts";
import { getRuntimeComposition } from "./custom-ng.ts";

/**
 * Registers animation declarations and the `$animate` service for custom runtimes.
 */
export const animationModule: RuntimeModule = (angular) => {
  const composition = getRuntimeComposition(angular);
  const animationRegistry = new AnimationRegistry();

  composition._installAnimationRegistry(animationRegistry);

  return angular
    .createModule("ng.animation", [])
    .factory(_animate, [
      _injector,
      ($injector: ng.InjectorService) =>
        createAnimateService(animationRegistry, $injector),
    ]);
};
