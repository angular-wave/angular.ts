import {
  AngularRuntime,
  configureBuiltinRuntime,
  configureRuntimeInjectionTokens,
} from "./angular-runtime.ts";
import { $injectTokens } from "./injection-tokens.ts";
import { registerNgModule } from "./ng.ts";
import { ScopeElement } from "./services/web-component/web-component.ts";

configureBuiltinRuntime(registerNgModule);
configureRuntimeInjectionTokens($injectTokens);

/**
 * Main AngularTS runtime entry point with the full built-in `ng` module
 * configured by default.
 */
export class Angular extends AngularRuntime {
  /** Base class for user-authored AngularTS custom elements. */
  public readonly ScopeElement = ScopeElement;
}

export { configureBuiltinRuntime, configureRuntimeInjectionTokens };
export type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  RuntimeModule,
} from "./angular-runtime.ts";
