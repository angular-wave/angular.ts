import { _window, _document, _filter, _parse, _injector, _rootScope, _exceptionHandler, _interpolate, _controller, _compile, _angular } from '../injection-tokens.js';
import { createFilterRegistration } from '../core/filter/filter.js';
import { applyInterpolateConfiguration, createInterpolateRegistration } from '../core/interpolate/interpolate.js';
import { passThroughSecurityAdapter } from '../services/security/security-adapter.js';
import { createParseService } from '../core/parse/parse.js';
import { createRootScopeService } from '../core/scope/scope.js';
import { requireAppRoot } from '../core/app-context/app-context.js';
import { registerRuntimeProviders } from '../core/composition/runtime-composition.js';
import { createControllerService } from '../core/controller/controller.js';
import { applyExceptionHandlerConfiguration, createExceptionHandlerService } from '../services/exception/exception.js';
import { keys } from '../shared/utils.js';

/** @internal */
function getRuntimeComposition(angular) {
    return angular._composition;
}
/** @internal */
function memoizeRuntimeModule(registerModule) {
    const registrations = new WeakMap();
    return (angular) => {
        const key = angular;
        const existing = registrations.get(key);
        if (existing)
            return existing;
        const module = registerModule(angular);
        registrations.set(key, module);
        return module;
    };
}
/**
 * Registers a composed AngularTS `ng` module from core providers and a caller
 * supplied directive list.
 */
function registerComposedNgModule(angular, options) {
    const moduleName = options.name ?? "ng";
    const providers = options.providers ?? {};
    const directiveRegistrations = normalizeRegistrations(options.directives);
    const filterRegistrations = normalizeRegistrations(options.filters);
    const serviceRegistrations = normalizeRegistrations(options.services);
    const composition = getRuntimeComposition(angular);
    const { compileRegistry, platform } = composition;
    const ngModule = angular.createModule(moduleName, options.requires);
    ngModule._registerProviders((registry) => {
        registry.value(_window, platform.window);
        registry.value(_document, platform.document);
        composition.filterRegistry.attach(registry);
        registry.factory(_filter, createFilterRegistration(composition.filterRegistry));
        registry.factory(_parse, [
            _injector,
            ($injector) => createParseService($injector),
        ]);
        registry.factory(_rootScope, [
            _exceptionHandler,
            _parse,
            ($exceptionHandler, $parse) => createRootScopeService(composition.appContext, $exceptionHandler, $parse),
        ]);
        composition.configRegistry.register(_interpolate, (value) => {
            applyInterpolateConfiguration(composition.interpolateState, value);
        });
        registry.factory(_interpolate, createInterpolateRegistration(composition.interpolateState, passThroughSecurityAdapter));
        registry.factory(_controller, [
            _injector,
            ($injector) => createControllerService(composition.controllerRegistry, $injector),
        ]);
        composition.configRegistry.register(_exceptionHandler, (value) => {
            applyExceptionHandlerConfiguration(composition.exceptionHandlerState, value);
        });
        registry.factory(_exceptionHandler, () => createExceptionHandlerService(composition.exceptionHandlerState));
        registry.factory(_compile, [
            _injector,
            _interpolate,
            _exceptionHandler,
            _parse,
            _controller,
            _rootScope,
            ($injector, $interpolate, $exceptionHandler, $parse, $controller, $rootScope) => compileRegistry.createService($injector, $interpolate, passThroughSecurityAdapter, $exceptionHandler, $parse, $controller, requireAppRoot(composition.appContext, $rootScope)),
        ]);
        registry.value(_angular, angular);
        registerRuntimeProviders(registry, providers, composition);
        for (const filters of filterRegistrations) {
            for (const name of keys(filters)) {
                composition.filterRegistry.register(name, filters[name]);
            }
        }
        for (const services of serviceRegistrations) {
            for (const name of keys(services)) {
                registry.service(name, services[name]);
            }
        }
    });
    for (const directives of directiveRegistrations) {
        for (const name of keys(directives)) {
            ngModule.directive(name, directives[name]);
        }
    }
    return ngModule;
}
function normalizeRegistrations(registrations) {
    if (!registrations)
        return [];
    return Array.isArray(registrations) ? registrations : [registrations];
}

export { getRuntimeComposition, memoizeRuntimeModule, registerComposedNgModule };
