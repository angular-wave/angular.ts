import { _webComponent, _injector, _rootScope, _compile } from '../injection-tokens.js';
import { createAngular } from './index.js';
import { destroyWebComponentRuntimeState, createWebComponentService, createWebComponentRuntimeState } from '../services/web-component/web-component.js';

/** Register scoped custom-element support in a custom AngularTS runtime. */
const webComponentModule = (angular) => {
    const runtime = angular;
    const state = createWebComponentRuntimeState();
    runtime._composition.platform.addDisposer(() => {
        destroyWebComponentRuntimeState(state);
    });
    return angular
        .module("ng.webComponent", [])
        .factory(_webComponent, [
        _injector,
        _rootScope,
        _compile,
        ($injector, $rootScope, $compile) => createWebComponentService($injector, $rootScope, $compile, state),
    ]);
};
/**
 * Defines a standalone AngularTS-backed custom element.
 *
 * The helper creates a custom runtime, installs the web-component module,
 * creates a small application module, and eagerly
 * builds an injector so the native custom element can be consumed by any host
 * framework without calling `angular.bootstrap`.
 */
function defineAngularElement(name, options) {
    const { component, elementModule, modules, ...composition } = options;
    const angular = createAngular({
        ...composition,
        modules: Array.from(new Set([...(modules ?? []), webComponentModule])),
    });
    const ngModuleName = composition.name ?? "ng";
    const elementModuleName = elementModule?.name ?? defaultElementModuleName(name);
    const appModule = angular.module(elementModuleName, elementModule?.requires ?? []);
    elementModule?.configure?.(appModule, angular);
    appModule.appComponent(name, component);
    const injector = angular.injector([ngModuleName, elementModuleName]);
    angular.$rootScope =
        injector.get(_rootScope);
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
function defaultElementModuleName(name) {
    return `ngElement:${name}`;
}

export { createAngularElement, defineAngularElement, webComponentModule };
