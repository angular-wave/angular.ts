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

/**
 * Registers a composed AngularTS `ng` module from core providers and a caller
 * supplied directive list.
 */
function registerComposedNgModule(angular, options) {
    const moduleName = options.name ?? "ng";
    const providers = options.providers ?? {};
    const directiveRegistrations = normalizeDirectiveRegistrations(options.directives);
    const filterRegistrations = normalizeFilterRegistrations(options.filters);
    const serviceRegistrations = normalizeServiceRegistrations(options.services);
    const runtime = angular;
    const compileRegistry = runtime._composition.compileRegistry;
    const { platform } = runtime._composition;
    const ngModule = angular.module(moduleName, options.requires);
    ngModule._registerProviders((registry) => {
        registry.value(_window, platform.window);
        registry.value(_document, platform.document);
        runtime._composition.filterRegistry.attach(registry);
        registry.factory(_filter, createFilterRegistration(runtime._composition.filterRegistry));
        registry.factory(_parse, [
            _injector,
            ($injector) => createParseService($injector),
        ]);
        registry.factory(_rootScope, [
            _exceptionHandler,
            _parse,
            ($exceptionHandler, $parse) => createRootScopeService(runtime._composition.appContext, $exceptionHandler, $parse),
        ]);
        runtime._composition.configRegistry.register(_interpolate, (value) => {
            applyInterpolateConfiguration(runtime._composition.interpolateState, value);
        });
        registry.factory(_interpolate, createInterpolateRegistration(runtime._composition.interpolateState, passThroughSecurityAdapter));
        registry.factory(_controller, [
            _injector,
            ($injector) => createControllerService(runtime._composition.controllerRegistry, $injector),
        ]);
        runtime._composition.configRegistry.register(_exceptionHandler, (value) => {
            applyExceptionHandlerConfiguration(runtime._composition.exceptionHandlerState, value);
        });
        registry.factory(_exceptionHandler, () => createExceptionHandlerService(runtime._composition.exceptionHandlerState));
        registry.factory(_compile, [
            _injector,
            _interpolate,
            _exceptionHandler,
            _parse,
            _controller,
            _rootScope,
            ($injector, $interpolate, $exceptionHandler, $parse, $controller, $rootScope) => compileRegistry.createService($injector, $interpolate, passThroughSecurityAdapter, $exceptionHandler, $parse, $controller, requireAppRoot(runtime._composition.appContext, $rootScope)),
        ]);
        registry.value(_angular, angular);
        registerRuntimeProviders(registry, providers, runtime._composition);
        filterRegistrations.forEach((filters) => {
            keys(filters).forEach((name) => {
                runtime._composition.filterRegistry.register(name, filters[name]);
            });
        });
        serviceRegistrations.forEach((services) => {
            keys(services).forEach((name) => {
                registry.service(name, services[name]);
            });
        });
    });
    directiveRegistrations.forEach((directives) => {
        keys(directives).forEach((name) => {
            ngModule.directive(name, directives[name]);
        });
    });
    return ngModule;
}
function normalizeDirectiveRegistrations(directives) {
    if (!directives)
        return [];
    return Array.isArray(directives) ? directives : [directives];
}
function normalizeFilterRegistrations(filters) {
    if (!filters)
        return [];
    return Array.isArray(filters) ? filters : [filters];
}
function normalizeServiceRegistrations(services) {
    if (!services)
        return [];
    return Array.isArray(services) ? services : [services];
}

export { registerComposedNgModule };
