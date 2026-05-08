import { _webComponent, _rootScope } from '../injection-tokens.js';
import { createAngularCustom } from './index.js';
import { WebComponentProvider } from '../services/web-component/web-component.js';

/**
 * Defines a standalone AngularTS-backed custom element.
 *
 * The helper creates a side-effect-free custom runtime, installs the
 * `$webComponent` provider, creates a small application module, and eagerly
 * builds an injector so the native custom element can be consumed by any host
 * framework without calling `angular.bootstrap`.
 */
function defineAngularElement(name, options) {
    const { component, elementModule, ngModule, ...runtimeOptions } = options;
    const ngModuleOptions = ngModule ?? {};
    const angular = createAngularCustom({
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
    appModule.webComponent(name, component);
    const previousAngular = window.angular;
    window.angular = angular;
    let injector;
    try {
        injector = angular.injector([ngModuleName, elementModuleName]);
    }
    finally {
        if (!runtimeOptions.attachToWindow) {
            window.angular = previousAngular;
        }
    }
    angular.$rootScope =
        injector.get(_rootScope);
    return {
        angular,
        element: customElements.get(name),
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

export { createAngularElement, defineAngularElement };
