import { AngularRuntime, configureBuiltinRuntime, configureRuntimeInjectionTokens } from './angular-runtime.js';
import { $injectTokens } from './injection-tokens.js';
import { registerNgModule } from './ng.js';
import { ScopeElement } from './services/web-component/web-component.js';

configureBuiltinRuntime(registerNgModule);
configureRuntimeInjectionTokens($injectTokens);
/**
 * Main AngularTS runtime entry point with the full built-in `ng` module
 * configured by default.
 */
class Angular extends AngularRuntime {
    constructor() {
        super(...arguments);
        /** Base class for user-authored AngularTS custom elements. */
        this.ScopeElement = ScopeElement;
    }
}

export { Angular, configureBuiltinRuntime, configureRuntimeInjectionTokens };
