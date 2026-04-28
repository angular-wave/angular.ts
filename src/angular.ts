import {
  AngularRuntime,
  configureBuiltinRuntime,
  configureRuntimeInjectionTokens,
} from "./angular-runtime.ts";
import { $injectTokens } from "./injection-tokens.ts";
import { registerNgModule } from "./ng.ts";

configureBuiltinRuntime(registerNgModule);
configureRuntimeInjectionTokens($injectTokens);

/**
 * Main AngularTS runtime entry point with the full built-in `ng` module
 * configured by default.
 */
export class Angular extends AngularRuntime {}

export { configureBuiltinRuntime, configureRuntimeInjectionTokens };
export type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  BuiltinNgModuleRegistrar,
} from "./angular-runtime.ts";
