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
import type {
  AfterRenderCallback,
  AfterRenderOptions,
} from "./core/render/after-render.ts";
import type {
  Machine,
  MachineConfig,
  MachineMode,
  MachineService,
  MachineTransition,
  MachineTransitionMap,
  MachineTransitionResult,
} from "./core/machine/machine.ts";

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
export { afterRender, queueAfterRender } from "./core/render/after-render.ts";
export { MachineProvider } from "./core/machine/machine.ts";

export type {
  AfterRenderCallback,
  AfterRenderOptions,
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  BuiltinNgModuleRegistrar,
  CustomAngularRuntimeOptions,
  CustomNgModuleOptions,
  DirectiveRegistration,
  DirectiveRegistrations,
  FilterRegistration,
  FilterRegistrations,
  Machine,
  MachineConfig,
  MachineMode,
  MachineService,
  MachineTransition,
  MachineTransitionMap,
  MachineTransitionResult,
  ProviderRegistration,
  ServiceRegistration,
  ServiceRegistrations,
};
