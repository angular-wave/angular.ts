import { _location, _security, _aria, _anchorScroll, _rootScope, _rootElement, _exceptionHandler, _transitions, _stateRegistry, _injector, _state, _compile, _controller } from '../injection-tokens.js';
import { applyAriaConfiguration, destroyAriaRuntimeState, createAriaService, createAriaRuntimeState } from '../directive/aria/aria.js';
import { createRouterRuntime, routerRuntimeConfigKey, applyRouterRuntimeCommand } from '../router/composition/router-runtime.js';
import { StateRefDynamicDirective, StateRefActiveDirective } from '../router/directives/state-directives.js';
import { ViewDirective, ViewDirectiveContentGuard } from '../router/directives/view-directive.js';
import { applyAnchorScrollConfiguration, destroyAnchorScrollRuntimeState, createAnchorScrollService, createAnchorScrollRuntimeState } from '../services/anchor-scroll/anchor-scroll.js';
import { createLocationRuntimeState, applyLocationConfiguration } from '../services/location/location.js';
import { createLogService, createLogRuntimeConfiguration } from '../services/log/log.js';
import { applySecurityConfiguration, createSecurityPolicy, createSecurityRuntimeConfiguration } from '../services/security/security.js';

function createRouteTemplateRequest(runtimeWindow) {
    return async (templateUrl) => {
        const response = await runtimeWindow.fetch(templateUrl, {
            headers: { Accept: "text/html" },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch route template "${templateUrl}": ${String(response.status)} ${response.statusText}`);
        }
        return response.text();
    };
}
/**
 * Registers state routing, navigation policy, URL ownership, and router
 * directives in a custom AngularTS runtime.
 */
const routerModule = (angular) => {
    const runtime = angular;
    const composition = runtime._composition;
    const { platform } = composition;
    const location = createLocationRuntimeState(platform.window);
    const securityConfiguration = createSecurityRuntimeConfiguration();
    const security = createSecurityPolicy(securityConfiguration, () => platform.window.location.href);
    const aria = createAriaRuntimeState();
    const anchorScroll = createAnchorScrollRuntimeState();
    const log = createLogService(createLogRuntimeConfiguration(), platform.console);
    const router = createRouterRuntime({
        compileLifecycle: composition.compileLifecycle,
        compileRegistry: composition.compileRegistry,
        exceptionHandler: composition.exceptionHandlerState.service,
        locationConfig: location.config,
        securityPolicy: security,
    });
    const templateRequest = createRouteTemplateRequest(platform.window);
    composition.configRegistry.register(_location, (value) => {
        applyLocationConfiguration(location, value);
    });
    composition.configRegistry.register(_security, (value) => {
        applySecurityConfiguration(securityConfiguration, value);
    });
    composition.configRegistry.register(_aria, (value) => {
        applyAriaConfiguration(aria, value);
    });
    composition.configRegistry.register(_anchorScroll, (value) => {
        applyAnchorScrollConfiguration(anchorScroll, value);
    });
    composition.configRegistry.register(routerRuntimeConfigKey, (value) => {
        applyRouterRuntimeCommand(router, value);
    });
    platform.addDisposer(() => {
        router.destroy();
        destroyAnchorScrollRuntimeState(anchorScroll);
        location.destroy();
        destroyAriaRuntimeState(aria);
    });
    const module = angular
        .module("ng.router", [])
        .value(_security, security)
        .factory(_aria, () => createAriaService(aria, log))
        .factory(_location, [
        _rootScope,
        _rootElement,
        _exceptionHandler,
        ($rootScope, $rootElement, $exceptionHandler) => location.createService($rootScope, $rootElement, $exceptionHandler),
    ])
        .factory(_anchorScroll, [
        _location,
        _rootScope,
        ($location, $rootScope) => createAnchorScrollService(anchorScroll, $location, $rootScope, platform.document, platform.window),
    ])
        .value(_transitions, router.transitions)
        .factory(_stateRegistry, [
        _injector,
        ($injector) => router.stateRegistry._initRuntime($injector),
    ]);
    const stateService = router.stateService;
    return module
        .factory(_state, [
        _compile,
        _controller,
        _rootScope,
        _injector,
        _location,
        _stateRegistry,
        (compile, controller, rootScope, injector, $location, stateRegistry) => {
            const templateFactory = router.createTemplateFactory(templateRequest, injector);
            const viewService = router.createViewService({
                templateFactory,
                compile,
                controller,
                rootScope,
                injector,
            });
            return stateService._initRuntime(injector, $location, stateRegistry, rootScope, viewService);
        },
    ])
        .directive("ngState", StateRefDynamicDirective)
        .directive("ngStateActive", StateRefActiveDirective)
        .directive("ngStateActiveExact", StateRefActiveDirective)
        .directive("ngView", ViewDirective)
        .directive("ngView", ViewDirectiveContentGuard);
};

export { routerModule };
