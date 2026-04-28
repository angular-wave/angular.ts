import { _sceDelegate, _provide, _angular, _window, _document, _compile, _filter } from '../injection-tokens.js';
import { CompileProvider } from '../core/compile/compile.js';
import { FilterProvider } from '../core/filter/filter.js';
import { InterpolateProvider } from '../core/interpolate/interpolate.js';
import { ParseProvider } from '../core/parse/parse.js';
import { RootScopeProvider } from '../core/scope/scope.js';
import { ExceptionHandlerProvider } from '../services/exception/exception.js';
import { DisabledTemplateRequestProvider, DisabledControllerProvider } from './disabled-providers.js';
import { MinimalSceDelegateProvider, MinimalSceProvider } from './minimal-providers.js';

/**
 * Providers required by `$compile` and scope/interpolation at runtime.
 *
 * This set intentionally avoids browser I/O services such as `$http` so small
 * custom builds do not pull them in unless explicitly requested.
 */
const coreProviders = {
    $controller: DisabledControllerProvider,
    $exceptionHandler: ExceptionHandlerProvider,
    $interpolate: InterpolateProvider,
    $parse: ParseProvider,
    $rootScope: RootScopeProvider,
    $sce: MinimalSceProvider,
    [_sceDelegate]: MinimalSceDelegateProvider,
    $templateRequest: DisabledTemplateRequestProvider,
};
/**
 * Registers a custom AngularTS `ng` module from core providers and a caller
 * supplied directive list.
 */
function registerCustomNgModule(angular, options = {}) {
    const moduleName = options.name ?? "ng";
    const providers = {
        ...coreProviders,
        ...(options.providers ?? {}),
    };
    const directiveRegistrations = normalizeDirectiveRegistrations(options.directives);
    const filterRegistrations = normalizeFilterRegistrations(options.filters);
    const serviceRegistrations = normalizeServiceRegistrations(options.services);
    return angular.module(moduleName, options.requires ?? [], [
        _provide,
        ($provide) => {
            $provide.provider({
                [_angular]: class {
                    constructor() {
                        this.$get = () => angular;
                    }
                },
                ...providers,
            });
            $provide.value(_window, window);
            $provide.value(_document, document);
            const $compileProvider = $provide.provider(_compile, CompileProvider);
            directiveRegistrations.forEach((directives) => {
                $compileProvider.directive(directives);
            });
            if (filterRegistrations.length) {
                const $filterProvider = $provide.provider(_filter, FilterProvider);
                filterRegistrations.forEach((filters) => {
                    Object.keys(filters).forEach((name) => {
                        $filterProvider.register(name, filters[name]);
                    });
                });
            }
            serviceRegistrations.forEach((services) => {
                Object.keys(services).forEach((name) => {
                    $provide.service(name, services[name]);
                });
            });
        },
    ]);
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

export { coreProviders, registerCustomNgModule };
