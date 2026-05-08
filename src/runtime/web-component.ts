import type { AngularRuntimeOptions } from "../angular-runtime.ts";
import { _rootScope, _webComponent } from "../injection-tokens.ts";
import {
  createAngularCustom,
  type CustomAngularRuntimeOptions,
} from "./index.ts";
import {
  WebComponentProvider,
  type WebComponentOptions,
} from "../services/web-component/web-component.ts";

/** Configuration for the application module that owns the custom element. */
export interface AngularElementModuleOptions {
  /** Name of the element application module. Defaults to a name derived from the tag. */
  name?: string;
  /** Additional application modules required by the element module. */
  requires?: string[];
  /** Optional hook for adding services, filters, directives, or config to the element module. */
  configure?: (module: ng.NgModule, angular: ng.Angular) => void;
}

/** Options for a standalone AngularTS-backed custom element runtime. */
export interface AngularElementOptions<
  T extends object = Record<string, any>,
> extends AngularRuntimeOptions {
  /** Custom runtime `ng` module configuration. */
  ngModule?: CustomAngularRuntimeOptions["ngModule"];
  /** Application module that registers the custom element. */
  elementModule?: AngularElementModuleOptions;
  /** Custom element definition passed to `$webComponent.define`. */
  component: WebComponentOptions<T>;
}

/** Runtime metadata returned after defining a standalone custom element. */
export interface AngularElementDefinition {
  /** AngularTS runtime instance that owns the element injector. */
  angular: ng.Angular;
  /** Custom runtime `ng` module. */
  ngModule: ng.NgModule;
  /** Application module that registered the element. */
  elementModule: ng.NgModule;
  /** Injector used by all instances of this custom element definition. */
  injector: ng.InjectorService;
  /** Native custom element constructor registered with `customElements`. */
  element: CustomElementConstructor;
  /** Registered custom element tag name. */
  name: string;
}

/**
 * Defines a standalone AngularTS-backed custom element.
 *
 * The helper creates a side-effect-free custom runtime, installs the
 * `$webComponent` provider, creates a small application module, and eagerly
 * builds an injector so the native custom element can be consumed by any host
 * framework without calling `angular.bootstrap`.
 */
export function defineAngularElement<T extends object = Record<string, any>>(
  name: string,
  options: AngularElementOptions<T>,
): AngularElementDefinition {
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
  }) as unknown as ng.Angular;

  const ngModuleName = ngModuleOptions.name ?? "ng";

  const elementModuleName =
    elementModule?.name ?? defaultElementModuleName(name);

  const appModule = angular.module(
    elementModuleName,
    elementModule?.requires ?? [],
  );

  elementModule?.configure?.(appModule, angular);
  appModule.webComponent(name, component);

  const previousAngular = (window as Window & { angular?: ng.Angular }).angular;

  (window as Window & { angular?: ng.Angular }).angular = angular;

  let injector: ng.InjectorService;

  try {
    injector = angular.injector([ngModuleName, elementModuleName]);
  } finally {
    if (!runtimeOptions.attachToWindow) {
      (window as Window & { angular?: ng.Angular }).angular = previousAngular;
    }
  }

  (angular as ng.Angular & { $rootScope?: ng.Scope }).$rootScope =
    injector.get(_rootScope);

  return {
    angular,
    element: customElements.get(name) as CustomElementConstructor,
    elementModule: appModule,
    injector,
    name,
    ngModule: angular.module(ngModuleName),
  };
}

/** Alias for callers that prefer factory-style naming. */
export const createAngularElement = defineAngularElement;

function defaultElementModuleName(name: string): string {
  return `ngElement:${name}`;
}
