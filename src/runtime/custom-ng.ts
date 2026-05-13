import {
  _angular,
  _compile,
  _document,
  _filter,
  _provide,
  _window,
} from "../injection-tokens.ts";
import { CompileProvider } from "../core/compile/compile.ts";
import { FilterProvider } from "../core/filter/filter.ts";
import { InterpolateProvider } from "../core/interpolate/interpolate.ts";
import { ParseProvider } from "../core/parse/parse.ts";
import { RootScopeProvider } from "../core/scope/scope.ts";
import { ControllerProvider } from "../core/controller/controller.ts";
import { ExceptionHandlerProvider } from "../services/exception/exception.ts";
import type { Injectable } from "../interface.ts";
import { keys } from "../shared/utils.ts";

type ProviderFactory =
  | (new (...args: never[]) => unknown)
  | ((this: never, ...args: never[]) => unknown);

type ServiceFactory = (...args: never[]) => unknown;

export type DirectiveRegistration = Record<string, ng.DirectiveFactory>;

export type DirectiveRegistrations =
  | DirectiveRegistration
  | DirectiveRegistration[];

export type ProviderRegistration = Record<string, ProviderFactory>;

export type ServiceRegistration = Record<string, Injectable<ServiceFactory>>;

export type FilterRegistration = Record<string, ng.FilterFactory>;

export type FilterRegistrations = FilterRegistration | FilterRegistration[];

export type ServiceRegistrations = ServiceRegistration | ServiceRegistration[];

export interface CustomNgModuleOptions {
  /** Name of the module to create. Defaults to `ng`. */
  name?: string;
  /** Modules required by the custom module. */
  requires?: string[];
  /** Additional or replacement providers to register. */
  providers?: ProviderRegistration;
  /** Services to register with `$provide.service`. */
  services?: ServiceRegistrations;
  /** Filters to register with `$filterProvider`. */
  filters?: FilterRegistrations;
  /** Directives to register with `$compileProvider`. */
  directives?: DirectiveRegistrations;
}

/**
 * Providers required by `$compile` and scope/interpolation at runtime.
 *
 * This set intentionally avoids browser I/O services such as `$http` so small
 * custom builds do not pull them in unless explicitly requested.
 */
export const coreProviders = {
  $controller: ControllerProvider,
  $exceptionHandler: ExceptionHandlerProvider,
  $interpolate: InterpolateProvider,
  $parse: ParseProvider,
  $rootScope: RootScopeProvider,
} satisfies ProviderRegistration;

/**
 * Registers a custom AngularTS `ng` module from core providers and a caller
 * supplied directive list.
 */
export function registerCustomNgModule(
  angular: ng.Angular,
  options: CustomNgModuleOptions = {},
): ng.NgModule {
  const moduleName = options.name ?? "ng";

  const providers = {
    ...coreProviders,
    ...(options.providers ?? {}),
  };

  const directiveRegistrations = normalizeDirectiveRegistrations(
    options.directives,
  );

  const filterRegistrations = normalizeFilterRegistrations(options.filters);

  const serviceRegistrations = normalizeServiceRegistrations(options.services);

  return angular.module(moduleName, options.requires ?? [], [
    _provide,
    ($provide: ng.ProvideService) => {
      $provide.provider({
        [_angular]: class {
          $get = () => angular;
        },
        ...providers,
      });
      $provide.value(_window, window);
      $provide.value(_document, document);

      const $compileProvider = $provide.provider(
        _compile,
        CompileProvider,
      ) as unknown as ng.ProvideService;

      directiveRegistrations.forEach((directives) => {
        $compileProvider.directive(directives);
      });

      if (filterRegistrations.length) {
        const $filterProvider = $provide.provider(
          _filter,
          FilterProvider,
        ) as unknown as FilterProvider;

        filterRegistrations.forEach((filters) => {
          keys(filters).forEach((name) => {
            $filterProvider.register(name, filters[name]);
          });
        });
      }

      serviceRegistrations.forEach((services) => {
        keys(services).forEach((name) => {
          $provide.service(name, services[name]);
        });
      });
    },
  ]);
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
