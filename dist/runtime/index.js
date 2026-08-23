import { AngularRuntime } from '../angular-runtime.js';
import { registerComposedNgModule } from './custom-ng.js';

function createBareRuntime(options = {}) {
    return new AngularRuntime({
        registerBuiltins: false,
        ...options,
    });
}
/**
 * Creates a tree-shakable AngularTS runtime from the requested composition.
 */
function createAngular(options = {}) {
    const { modules = [], subapp, ...moduleOptions } = options;
    const angular = createBareRuntime({ subapp });
    try {
        const moduleNames = Array.from(new Set(modules), (registerModule) => registerModule(angular).name);
        const requires = Array.from(new Set([...moduleNames, ...(moduleOptions.requires ?? [])]));
        registerComposedNgModule(angular, {
            ...moduleOptions,
            requires,
        });
        return angular;
    }
    catch (error) {
        angular._composition.destroy();
        throw error;
    }
}

export { AngularRuntime, createAngular };
