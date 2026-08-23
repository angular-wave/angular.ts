import { _animate, _injector } from '../injection-tokens.js';
import { AnimationRegistry, createAnimateService } from '../animations/animate.js';
import { getRuntimeComposition } from './custom-ng.js';

/**
 * Registers animation declarations and the `$animate` service for custom runtimes.
 */
const animationModule = (angular) => {
    const composition = getRuntimeComposition(angular);
    const animationRegistry = new AnimationRegistry();
    composition._installAnimationRegistry(animationRegistry);
    return angular
        .module("ng.animation", [])
        .factory(_animate, [
        _injector,
        ($injector) => createAnimateService(animationRegistry, $injector),
    ]);
};

export { animationModule };
