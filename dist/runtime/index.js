import { AngularRuntime } from '../angular-runtime.js';
import { registerCustomNgModule } from './custom-ng.js';
export { coreProviders } from './custom-ng.js';

/**
 * Creates an AngularTS runtime with no built-in modules.
 */
function createAngularBare(options = {}) {
    return new AngularRuntime({
        registerBuiltins: false,
        ...options,
    });
}
/**
 * Creates an AngularTS runtime with a custom `ng` module.
 */
function createAngularCustom(options = {}) {
    const angular = createAngularBare(options);
    registerCustomNgModule(angular, options.ngModule);
    return angular;
}

export { AngularRuntime, createAngularBare, createAngularCustom, registerCustomNgModule };
