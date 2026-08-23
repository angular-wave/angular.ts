import { AngularRuntime, configureBuiltinRuntime, configureRuntimeInjectionTokens } from './angular-runtime.js';
import { $injectTokens } from './injection-tokens.js';
import { registerNgModule } from './ng.js';
import { ScopeElement } from './services/web-component/web-component.js';
import { tags, tagNS, tag, props, event, each, attrs } from './core/compile/programmatic-view.js';

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
        /** JSX-free real-DOM tag factories for programmatic component views. */
        this.tags = tags;
        /** Explicit programmatic-view binding and element helpers. */
        this.view = Object.freeze({
            attrs,
            each,
            event,
            props,
            tag,
            tagNS,
            tags,
        });
    }
}

export { Angular, configureBuiltinRuntime, configureRuntimeInjectionTokens };
