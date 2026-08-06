import type { RuntimeModule } from "../angular-runtime.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import { _animate, _injector } from "../injection-tokens.ts";
import {
  AnimationRegistry,
  createAnimateService,
} from "../animations/animate.ts";

/**
 * Registers animation declarations and the `$animate` service for custom runtimes.
 */
export const animationModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const animationRegistry = new AnimationRegistry();

  runtime._composition._installAnimationRegistry(animationRegistry);

  return angular
    .module("ng.animation", [])
    .factory(_animate, [
      _injector,
      ($injector: ng.InjectorService) =>
        createAnimateService(animationRegistry, $injector),
    ]);
};
