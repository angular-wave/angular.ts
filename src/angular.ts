import {
  AngularRuntime,
  configureBuiltinRuntime,
  configureRuntimeInjectionTokens,
} from "./angular-runtime.ts";
import { $injectTokens } from "./injection-tokens.ts";
import { registerNgModule } from "./ng.ts";
import { ScopeElement } from "./services/web-component/web-component.ts";
import {
  attrs,
  each,
  event,
  props,
  tag,
  tagNS,
  tags,
} from "./core/compile/programmatic-view.ts";

configureBuiltinRuntime(registerNgModule);
configureRuntimeInjectionTokens($injectTokens);

/**
 * Main AngularTS runtime entry point with the full built-in `ng` module
 * configured by default.
 */
export class Angular extends AngularRuntime {
  /** Base class for user-authored AngularTS custom elements. */
  public readonly ScopeElement = ScopeElement;

  /** JSX-free real-DOM tag factories for programmatic component views. */
  public readonly tags = tags;

  /** Explicit programmatic-view binding and element helpers. */
  public readonly view = { attrs, each, event, props, tag, tagNS };
}

export { configureBuiltinRuntime, configureRuntimeInjectionTokens };
export type {
  AngularRuntimeConstructorInput,
  AngularRuntimeOptions,
  RuntimeModule,
} from "./angular-runtime.ts";
