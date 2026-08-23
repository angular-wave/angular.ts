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

/** @internal */
export function getRuntimeComposition(
  angular: ng.Angular | { _composition: RuntimeComposition },
): RuntimeComposition {
  return (
    angular as ng.Angular & {
      _composition: RuntimeComposition;
    }
  )._composition;
}

/** @internal */
export function memoizeRuntimeModule(
  registerModule: import("../angular-runtime.ts").RuntimeModule,
): import("../angular-runtime.ts").RuntimeModule {
  const registrations = new WeakMap<object, ng.NgModule>();

  return (angular) => {
    const key = angular as object;
    const existing = registrations.get(key);

    if (existing) return existing;

    const module = registerModule(angular);

    registrations.set(key, module);

    return module;
  };
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

  const directiveRegistrations = normalizeRegistrations(options.directives);
  const filterRegistrations = normalizeRegistrations(options.filters);
  const serviceRegistrations = normalizeRegistrations(options.services);
  const composition = getRuntimeComposition(angular);
  const { compileRegistry, platform } = composition;

  const ngModule = angular.module(moduleName, options.requires);

  ngModule._registerProviders((registry) => {
    registry.value(_window, platform.window);
    registry.value(_document, platform.document);
    composition.filterRegistry.attach(registry);
    registry.factory(
      _filter,
      createFilterRegistration(composition.filterRegistry),
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
          composition.appContext,
          $exceptionHandler,
          $parse,
        ),
    ]);
    composition.configRegistry.register(_interpolate, (value) => {
      applyInterpolateConfiguration(
        composition.interpolateState,
        value as InterpolateConfig,
      );
    });
    registry.factory(
      _interpolate,
      createInterpolateRegistration(
        composition.interpolateState,
        passThroughSecurityAdapter,
      ),
    );
    registry.factory(_controller, [
      _injector,
      ($injector: ng.InjectorService) =>
        createControllerService(composition.controllerRegistry, $injector),
    ]);
    composition.configRegistry.register(_exceptionHandler, (value) => {
      applyExceptionHandlerConfiguration(
        composition.exceptionHandlerState,
        value as ExceptionHandlerConfig,
      );
    });
    registry.factory(_exceptionHandler, () =>
      createExceptionHandlerService(composition.exceptionHandlerState),
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
          requireAppRoot(composition.appContext, $rootScope),
        ),
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

function normalizeRegistrations<T>(registrations: T | T[] | undefined): T[] {
  if (!registrations) return [];

  return Array.isArray(registrations) ? registrations : [registrations];
}
