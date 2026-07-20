import { _transitions, _stateRegistry, _injector, _templateRequest, _compile, _controller, _rootScope, _location, _security } from '../../injection-tokens.js';
import { RouterRuntimeState } from '../router.js';
import { StateRegistryRuntime } from '../state/state-registry.js';
import { StateRuntime } from '../state/state-service.js';
import { TemplateFactoryService } from '../router/template-factory.js';
import { TransitionRuntime } from '../transition/transition-service.js';
import { ViewService } from '../view/view.js';

/** @internal */
const routerRuntimeConfigKey = "$router";
/** @internal */
function applyRouterRuntimeCommand(runtime, command) {
    switch (command.type) {
        case "config":
            runtime.routerState.config(command.config);
            break;
        case "state":
            runtime.stateService.state(command.definition);
            break;
        case "lazy":
            runtime.stateService.lazy(command.prefix, command.loader);
            break;
    }
}
/** @internal */
function createRouterRuntime(dependencies) {
    const routerState = new RouterRuntimeState(dependencies.locationConfig);
    const stateRegistry = new StateRegistryRuntime(routerState, dependencies.compileRegistry);
    const transitions = new TransitionRuntime(routerState, dependencies.exceptionHandler, dependencies.securityPolicy);
    const stateService = new StateRuntime(stateRegistry, routerState, transitions, dependencies.exceptionHandler);
    let templateFactory;
    let viewService;
    let destroyed = false;
    return {
        routerState,
        stateRegistry,
        stateService,
        transitions,
        get templateFactory() {
            return templateFactory;
        },
        get viewService() {
            return viewService;
        },
        get destroyed() {
            return destroyed;
        },
        createTemplateFactory(templateRequest, injector) {
            if (destroyed) {
                throw new Error("Cannot create a template factory after router destruction");
            }
            templateFactory ?? (templateFactory = new TemplateFactoryService(dependencies.compileRegistry, templateRequest, injector));
            return templateFactory;
        },
        createViewService(viewDependencies) {
            if (destroyed) {
                throw new Error("Cannot create a view service after router destruction");
            }
            viewService ?? (viewService = new ViewService({
                compileLifecycle: dependencies.compileLifecycle,
                routerState,
                transitions,
                ...viewDependencies,
            }));
            return viewService;
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            viewService?.destroy();
        },
    };
}
/** @internal */
const routerRuntimeRegistration = {
    _register(registry, name, { runtime, providers }) {
        const locationState = requireProvider(providers, _location);
        const securityPolicy = requireProvider(providers, _security);
        const routerRuntime = createRouterRuntime({
            compileLifecycle: runtime.compileLifecycle,
            compileRegistry: runtime.compileRegistry,
            exceptionHandler: runtime.exceptionHandlerState.service,
            locationConfig: locationState.config,
            securityPolicy,
        });
        runtime.addDisposer(() => {
            routerRuntime.destroy();
        });
        runtime.configRegistry.register(routerRuntimeConfigKey, (value) => {
            applyRouterRuntimeCommand(routerRuntime, value);
        });
        registry.value(_transitions, routerRuntime.transitions);
        registry.factory(_stateRegistry, [
            _injector,
            ($injector) => routerRuntime.stateRegistry._initRuntime($injector),
        ]);
        const stateService = routerRuntime.stateService;
        registry.factory(name, [
            _templateRequest,
            _compile,
            _controller,
            _rootScope,
            _injector,
            _location,
            _stateRegistry,
            (templateRequest, compile, controller, rootScope, injector, location, stateRegistry) => {
                const templateFactory = routerRuntime.createTemplateFactory(templateRequest, injector);
                const viewService = routerRuntime.createViewService({
                    templateFactory,
                    compile,
                    controller,
                    rootScope,
                    injector,
                });
                return stateService._initRuntime(injector, location, stateRegistry, rootScope, viewService);
            },
        ]);
        return stateService;
    },
};
function requireProvider(providers, name) {
    const provider = providers.get(name);
    if (!provider) {
        throw new Error(`${name} must be composed before the router runtime`);
    }
    return provider;
}

export { applyRouterRuntimeCommand, createRouterRuntime, routerRuntimeConfigKey, routerRuntimeRegistration };
