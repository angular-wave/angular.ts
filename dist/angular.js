import { AngularRuntime, configureBuiltinRuntime, configureRuntimeInjectionTokens } from './angular-runtime.js';
import { $injectTokens } from './injection-tokens.js';
import { registerNgModule } from './ng.js';

configureBuiltinRuntime(registerNgModule);
configureRuntimeInjectionTokens($injectTokens);
/**
 * Main AngularTS runtime entry point with the full built-in `ng` module
 * configured by default.
 */
class Angular extends AngularRuntime {
}

export { Angular, configureBuiltinRuntime, configureRuntimeInjectionTokens };
