import {
  AngularRuntime,
  type AngularRuntimeOptions,
  type RuntimeModule,
} from "../angular-runtime.ts";
import {
  registerComposedNgModule,
  type DirectiveRegistrations,
  type FilterRegistrations,
  type ProviderRegistration,
  type ServiceRegistrations,
} from "./custom-ng.ts";

/** Declarative inputs for a tree-shakable AngularTS runtime. */
export interface AngularComposition {
  /** Treat this runtime as a sub-application of the current host runtime. */
  subapp?: AngularRuntimeOptions["subapp"];
  /** Framework modules included by the composed `ng` module. */
  modules?: readonly RuntimeModule[];
  /** Name of the composed root module. Defaults to `ng`. */
  name?: string;
  /** Additional application modules required by the composed root module. */
  requires?: string[];
  /** Additional providers registered in the composed root module. */
  providers?: ProviderRegistration;
  /** Services registered in the composed root module. */
  services?: ServiceRegistrations;
  /** Filters registered in the composed root module. */
  filters?: FilterRegistrations;
  /** Directives registered in the composed root module. */
  directives?: DirectiveRegistrations;
}

function createBareRuntime(
  options: AngularRuntimeOptions = {},
): AngularRuntime {
  return new AngularRuntime({
    registerBuiltins: false,
    ...options,
  });
}

/**
 * Creates a tree-shakable AngularTS runtime from the requested composition.
 */
export function createAngular(
  options: AngularComposition = {},
): AngularRuntime {
  const { modules = [], subapp, ...moduleOptions } = options;
  const angular = createBareRuntime({ subapp });
  const moduleNames = modules.map(
    (registerModule) => registerModule(angular).name,
  );
  const requires = Array.from(
    new Set([...moduleNames, ...(moduleOptions.requires ?? [])]),
  );

  registerComposedNgModule(angular as unknown as ng.Angular, {
    ...moduleOptions,
    requires,
  });

  return angular;
}

export { AngularRuntime };
export type {
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
} from "./custom-ng.ts";
export type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  RuntimeModule,
} from "../angular-runtime.ts";
