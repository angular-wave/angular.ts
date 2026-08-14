import { _animate, _injector } from '../injection-tokens.js';
import { AnimationRegistry, createAnimateService } from '../animations/animate.js';

/**
 * Registers animation declarations and the `$animate` service for custom runtimes.
 */
const animationModule = (angular) => {
    const runtime = angular;
    const animationRegistry = new AnimationRegistry();
    runtime._composition._installAnimationRegistry(animationRegistry);
    return angular
        .module("ng.animation", [])
        .factory(_animate, [
        _injector,
        ($injector) => createAnimateService(animationRegistry, $injector),
    ]);
};

export { animationModule };
