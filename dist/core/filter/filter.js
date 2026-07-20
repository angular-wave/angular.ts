import { _injector } from '../../injection-tokens.js';
import { validateIsString, validate } from '../../shared/validate.js';
import { isInjectable } from '../di/injectable.js';

const SUFFIX = "Filter";
/** @internal */
class FilterRegistry {
    constructor() {
        this._factories = new Map();
        this._boundFactories = new Map();
        this._destroyed = false;
    }
    attach(providerRegistry) {
        this._assertActive();
        this._providerRegistry = providerRegistry;
        this._boundFactories.clear();
        this._factories.forEach((factory, name) => {
            this._bind(name, factory);
        });
    }
    register(name, factory) {
        this._assertActive();
        validateIsString(name, "name");
        validate(isInjectable, factory, "factory");
        this._factories.set(name, factory);
        this._bind(name, factory);
        return this;
    }
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        this._factories.clear();
        this._boundFactories.clear();
        this._providerRegistry = undefined;
    }
    assertActive() {
        this._assertActive();
    }
    _bind(name, factory) {
        if (!this._providerRegistry)
            return;
        if (this._boundFactories.get(name) === factory)
            return;
        this._providerRegistry.factory(name + SUFFIX, factory);
        this._boundFactories.set(name, factory);
    }
    _assertActive() {
        if (this._destroyed) {
            throw new Error("Filter registry has been destroyed");
        }
    }
}
/** @internal */
function createFilterService(registry, $injector) {
    return (name) => {
        registry.assertActive();
        validateIsString(name, "name");
        return $injector.get(name + SUFFIX);
    };
}
/** @internal */
function createFilterRegistration(registry) {
    return [_injector, ($injector) => createFilterService(registry, $injector)];
}

export { FilterRegistry, createFilterRegistration, createFilterService };
