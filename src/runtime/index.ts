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
export * from "../ng.ts";
export { WasmScope, WasmScopeAbi } from "../services/wasm/wasm.ts";
export { createAngularElement, defineAngularElement } from "./web-component.ts";
export type {
  AngularElementDefinition,
  AngularElementModuleOptions,
  AngularElementOptions,
} from "./web-component.ts";
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
export type {
  WasmAbiExports,
  WasmScopeAbiImportObject,
  WasmScopeAbiImports,
  WasmScopeBindingOptions,
  WasmScopeOptions,
  WasmScopeReference,
  WasmScopeUpdate,
  WasmScopeWatchOptions,
} from "../services/wasm/wasm.ts";
export type {
  WebTransportBufferInput,
  WebTransportCertificateHash,
  WebTransportConfig,
  WebTransportConnection,
  WebTransportDatagramEvent,
  WebTransportOptions,
  WebTransportReconnectEvent,
  WebTransportRetryDelay,
  WebTransportService,
} from "../services/webtransport/webtransport.ts";
