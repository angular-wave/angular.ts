import { Angular } from "./angular.ts";
import type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  BuiltinNgModuleRegistrar,
} from "./angular-runtime.ts";
import type {
  CustomAngularRuntimeOptions,
  CustomNgModuleOptions,
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
} from "./runtime/index.ts";

/**
 * Default browser entry point.
 */
export const angular = new Angular();

export {
  AngularRuntime,
  createAngularBare,
  createAngularCustom,
  coreProviders,
  registerCustomNgModule,
} from "./runtime/index.ts";

export type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  BuiltinNgModuleRegistrar,
  CustomAngularRuntimeOptions,
  CustomNgModuleOptions,
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
};
