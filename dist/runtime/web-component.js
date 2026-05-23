import { AngularRuntime } from '../angular-runtime.js';
import { _rootScope, _webComponent } from '../injection-tokens.js';
import { registerCustomNgModule } from './custom-ng.js';
import { WebComponentProvider } from '../services/web-component/web-component.js';

/**
 * Defines a standalone AngularTS-backed custom element.
 *
 * The helper creates a custom runtime, installs the `$webComponent` provider,
 * creates a small application module, and eagerly
 * builds an injector so the native custom element can be consumed by any host
 * framework without calling `angular.bootstrap`.
 */
function defineAngularElement(name, options) {
    const { component, elementModule, ngModule, ...runtimeOptions } = options;
    const ngModuleOptions = ngModule ?? {};
    const angular = createAngularElementRuntime({
        ...runtimeOptions,
        ngModule: {
            ...ngModuleOptions,
            providers: {
                [_webComponent]: WebComponentProvider,
                ...(ngModuleOptions.providers ?? {}),
            },
        },
    });
    const ngModuleName = ngModuleOptions.name ?? "ng";
    const elementModuleName = elementModule?.name ?? defaultElementModuleName(name);
    const appModule = angular.module(elementModuleName, elementModule?.requires ?? []);
    elementModule?.configure?.(appModule, angular);
    appModule.appComponent(name, component);
    const injector = angular.injector([ngModuleName, elementModuleName]);
    angular.$rootScope = injector.get(_rootScope);
    const element = customElements.get(name);
    if (!element) {
        throw new Error(`Custom element ${name} was not registered`);
    }
    return {
        angular,
        element,
        elementModule: appModule,
        injector,
        name,
        ngModule: angular.module(ngModuleName),
    };
}
/** Alias for callers that prefer factory-style naming. */
const createAngularElement = defineAngularElement;
function createAngularElementRuntime(options) {
    const angular = new AngularRuntime({
        registerBuiltins: false,
        ...options,
    });
    registerCustomNgModule(angular, options.ngModule);
    return angular;
}
function defaultElementModuleName(name) {
    return `ngElement:${name}`;
}

export { createAngularElement, defineAngularElement };
