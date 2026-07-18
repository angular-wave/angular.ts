import type { RuntimeModule } from "../angular-runtime.ts";
import {
  _compile,
  _injector,
  _rootScope,
  _webComponent,
} from "../injection-tokens.ts";
import type { RuntimeComposition } from "../core/composition/runtime-composition.ts";
import { createAngular, type AngularComposition } from "./index.ts";
import {
  createWebComponentRuntimeState,
  createWebComponentService,
  destroyWebComponentRuntimeState,
  type AppComponentOptions,
} from "../services/web-component/web-component.ts";

/** Register scoped custom-element support in a custom AngularTS runtime. */
export const webComponentModule: RuntimeModule = (angular) => {
  const runtime = angular as ng.Angular & {
    _composition: RuntimeComposition;
  };
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
      (
        $injector: ng.InjectorService,
        $rootScope: ng.Scope,
        $compile: ng.CompileService,
      ) => createWebComponentService($injector, $rootScope, $compile, state),
    ]);
};

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
  T extends object = Record<string, unknown>,
> extends AngularComposition {
  /** Application module that registers the custom element. */
  elementModule?: AngularElementModuleOptions;
  /** App component definition passed to `$webComponent.defineAppComponent`. */
  component: AppComponentOptions<T>;
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
 * The helper creates a custom runtime, installs the web-component module,
 * creates a small application module, and eagerly
 * builds an injector so the native custom element can be consumed by any host
 * framework without calling `angular.bootstrap`.
 */
export function defineAngularElement<
  T extends object = Record<string, unknown>,
>(name: string, options: AngularElementOptions<T>): AngularElementDefinition {
  const { component, elementModule, modules, ...composition } = options;

  const angular = createAngular({
    ...composition,
    modules: Array.from(new Set([...(modules ?? []), webComponentModule])),
  }) as unknown as ng.Angular;

  const ngModuleName = composition.name ?? "ng";

  const elementModuleName =
    elementModule?.name ?? defaultElementModuleName(name);

  const appModule = angular.module(
    elementModuleName,
    elementModule?.requires ?? [],
  );

  elementModule?.configure?.(appModule, angular);
  appModule.appComponent(name, component);

  const injector = angular.injector([ngModuleName, elementModuleName]);

  (angular as ng.Angular & { $rootScope?: ng.Scope }).$rootScope =
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
export const createAngularElement = defineAngularElement;

function defaultElementModuleName(name: string): string {
  return `ngElement:${name}`;
}
