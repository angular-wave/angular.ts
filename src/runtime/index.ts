import {
  AngularRuntime,
  type AngularRuntimeOptions,
} from "../angular-runtime.ts";
import {
  registerCustomNgModule,
  type CustomNgModuleOptions,
} from "./custom-ng.ts";

export interface CustomAngularRuntimeOptions extends AngularRuntimeOptions {
  /** Configuration for the custom `ng` module. */
  ngModule?: CustomNgModuleOptions;
}

/**
 * Creates a side-effect-free AngularTS runtime with no built-in modules.
 */
export function createAngularBare(
  options: AngularRuntimeOptions = {},
): AngularRuntime {
  return new AngularRuntime({
    attachToWindow: false,
    registerBuiltins: false,
    ...options,
  });
}

/**
 * Creates a side-effect-free AngularTS runtime with a custom `ng` module.
 */
export function createAngularCustom(
  options: CustomAngularRuntimeOptions = {},
): AngularRuntime {
  const angular = createAngularBare(options);

  registerCustomNgModule(angular as unknown as ng.Angular, options.ngModule);

  return angular;
}

export { AngularRuntime, registerCustomNgModule };
export { coreProviders } from "./custom-ng.ts";
export type {
  CustomNgModuleOptions,
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
  BuiltinNgModuleRegistrar,
} from "../angular-runtime.ts";
