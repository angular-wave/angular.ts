import {
  _angular,
  _compile,
  _controller,
  _document,
  _exceptionHandler,
  _filter,
  _injector,
  _interpolate,
  _parse,
  _rootScope,
  _window,
} from "../injection-tokens.ts";
import { createFilterRegistration } from "../core/filter/filter.ts";
import type { FilterFactory } from "../filters/filter.ts";
import {
  applyInterpolateConfiguration,
  createInterpolateRegistration,
  type InterpolateConfig,
} from "../core/interpolate/interpolate.ts";
import { passThroughSecurityAdapter } from "../services/security/security-adapter.ts";
import { createParseService } from "../core/parse/parse.ts";
import { createRootScopeService } from "../core/scope/scope.ts";
import { requireAppRoot } from "../core/app-context/app-context.ts";
import {
  registerRuntimeProviders,
  type RuntimeComposition,
} from "../core/composition/runtime-composition.ts";
import { createControllerService } from "../core/controller/controller.ts";
import {
  applyExceptionHandlerConfiguration,
  createExceptionHandlerService,
  type ExceptionHandlerConfig,
} from "../services/exception/exception.ts";
import type { DirectiveFactory, Injectable } from "../interface.ts";
import { keys } from "../shared/utils.ts";

export type ProviderFactory =
  | (new (...args: never[]) => unknown)
  | ((this: never, ...args: never[]) => unknown);

export type ServiceFactory = (...args: never[]) => unknown;

export type DirectiveRegistration = Record<string, DirectiveFactory>;

export type DirectiveRegistrations =
  | DirectiveRegistration
  | DirectiveRegistration[];

export type ProviderRegistration = Record<string, ProviderFactory>;

export type ServiceRegistration = Record<string, Injectable<ServiceFactory>>;

export type FilterRegistration = Record<string, FilterFactory>;

export type FilterRegistrations = FilterRegistration | FilterRegistration[];

export type ServiceRegistrations = ServiceRegistration | ServiceRegistration[];

export interface RuntimeNgModuleOptions {
  /** Name of the module to create. Defaults to `ng`. */
  name?: string;
  /** Modules required by the custom module. */
  requires?: string[];
  /** Additional or replacement providers to register. */
  providers?: ProviderRegistration;
  /** Services to register with the runtime provider registry. */
  services?: ServiceRegistrations;
  /** Filters to register with the runtime filter registry. */
  filters?: FilterRegistrations;
  /** Directives to register with the runtime compile registry. */
  directives?: DirectiveRegistrations;
}

/**
 * Registers a composed AngularTS `ng` module from core providers and a caller
 * supplied directive list.
 */
export function registerComposedNgModule(
  angular: ng.Angular,
  options: RuntimeNgModuleOptions & { requires: string[] },
): ng.NgModule {
  const moduleName = options.name ?? "ng";

  const providers = options.providers ?? {};

  const directiveRegistrations = normalizeDirectiveRegistrations(
    options.directives,
  );

  const filterRegistrations = normalizeFilterRegistrations(options.filters);

  const serviceRegistrations = normalizeServiceRegistrations(options.services);

  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
  const compileRegistry = runtime._composition.compileRegistry;
  const { platform } = runtime._composition;

  const ngModule = angular.module(moduleName, options.requires);

  ngModule._registerProviders((registry) => {
    registry.value(_window, platform.window);
    registry.value(_document, platform.document);
    runtime._composition.filterRegistry.attach(registry);
    registry.factory(
      _filter,
      createFilterRegistration(runtime._composition.filterRegistry),
    );
    registry.factory(_parse, [
      _injector,
      ($injector: ng.InjectorService) => createParseService($injector),
    ]);
    registry.factory(_rootScope, [
      _exceptionHandler,
      _parse,
      (
        $exceptionHandler: ng.ExceptionHandlerService,
        $parse: ng.ParseService,
      ) =>
        createRootScopeService(
          runtime._composition.appContext,
          $exceptionHandler,
          $parse,
        ),
    ]);
    runtime._composition.configRegistry.register(_interpolate, (value) => {
      applyInterpolateConfiguration(
        runtime._composition.interpolateState,
        value as InterpolateConfig,
      );
    });
    registry.factory(
      _interpolate,
      createInterpolateRegistration(
        runtime._composition.interpolateState,
        passThroughSecurityAdapter,
      ),
    );
    registry.factory(_controller, [
      _injector,
      ($injector: ng.InjectorService) =>
        createControllerService(
          runtime._composition.controllerRegistry,
          $injector,
        ),
    ]);
    runtime._composition.configRegistry.register(_exceptionHandler, (value) => {
      applyExceptionHandlerConfiguration(
        runtime._composition.exceptionHandlerState,
        value as ExceptionHandlerConfig,
      );
    });
    registry.factory(_exceptionHandler, () =>
      createExceptionHandlerService(runtime._composition.exceptionHandlerState),
    );

    registry.factory(_compile, [
      _injector,
      _interpolate,
      _exceptionHandler,
      _parse,
      _controller,
      _rootScope,
      (
        $injector: ng.InjectorService,
        $interpolate: ng.InterpolateService,
        $exceptionHandler: ng.ExceptionHandlerService,
        $parse: ng.ParseService,
        $controller: ng.ControllerService,
        $rootScope: ng.Scope,
      ) =>
        compileRegistry.createService(
          $injector,
          $interpolate,
          passThroughSecurityAdapter,
          $exceptionHandler,
          $parse,
          $controller,
          requireAppRoot(runtime._composition.appContext, $rootScope),
        ),
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

function normalizeDirectiveRegistrations(
  directives: DirectiveRegistrations | undefined,
): DirectiveRegistration[] {
  if (!directives) return [];

  return Array.isArray(directives) ? directives : [directives];
}

function normalizeFilterRegistrations(
  filters: FilterRegistrations | undefined,
): FilterRegistration[] {
  if (!filters) return [];

  return Array.isArray(filters) ? filters : [filters];
}

function normalizeServiceRegistrations(
  services: ServiceRegistrations | undefined,
): ServiceRegistration[] {
  if (!services) return [];

  return Array.isArray(services) ? services : [services];
}
