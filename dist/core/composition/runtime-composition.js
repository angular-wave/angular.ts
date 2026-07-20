import { AppContext } from '../app-context/app-context.js';
import { CompileRegistry, CompileLifecycle } from '../compile/compile.js';
import { AnimationRegistry } from '../../animations/animate.js';
import { ControllerRegistry } from '../controller/controller.js';
import { FilterRegistry } from '../filter/filter.js';
import { createInterpolateRuntimeState, destroyInterpolateRuntimeState } from '../interpolate/interpolate.js';
import { createExceptionHandlerRuntimeState, destroyExceptionHandlerRuntimeState } from '../../services/exception/exception.js';

/** @internal */
class RuntimeConfigRegistry {
    constructor() {
        this._configurators = new Map();
    }
    register(name, configure) {
        this._configurators.set(name, configure);
    }
    configure(name, config) {
        const configure = this._configurators.get(name);
        if (!configure) {
            throw new Error(`No runtime configurator registered for ${name}`);
        }
        configure(config);
    }
    clear() {
        this._configurators.clear();
    }
}
/** @internal */
function registerRuntimeProviders(registry, definitions, runtime, providers = new Map()) {
    for (const [name, recipe] of Object.entries(definitions)) {
        const context = {
            runtime,
            platform: runtime.platform,
            compileRegistry: runtime.compileRegistry,
            providers,
        };
        const register = recipe._register;
        if (register) {
            providers.set(name, register(registry, name, context));
            continue;
        }
        const compose = recipe._compose;
        const definition = (compose ? compose(context) : recipe);
        const provider = registry.provider(name, definition);
        providers.set(name, provider);
    }
    return providers;
}
/** @internal */
function createPlatformRuntime(dependencies) {
    const disposers = [];
    let destroyed = false;
    return {
        console: dependencies.console ?? globalThis.console,
        document: dependencies.document,
        window: dependencies.window,
        get destroyed() {
            return destroyed;
        },
        addDisposer(disposer) {
            if (destroyed) {
                disposer();
                return () => undefined;
            }
            disposers.push(disposer);
            return () => {
                const index = disposers.indexOf(disposer);
                if (index >= 0)
                    disposers.splice(index, 1);
            };
        },
        destroy() {
            if (destroyed)
                return;
            destroyed = true;
            for (let index = disposers.length - 1; index >= 0; index--) {
                disposers[index]();
            }
            disposers.length = 0;
        },
    };
}
/** @internal */
function createCoreRuntime(dependencies) {
    const ownsAppContext = !dependencies.appContext;
    const appContext = dependencies.appContext ?? new AppContext();
    const animationRegistry = new AnimationRegistry();
    const compileLifecycle = new CompileLifecycle();
    const compileRegistry = new CompileRegistry(compileLifecycle);
    const controllerRegistry = new ControllerRegistry();
    const exceptionHandlerState = createExceptionHandlerRuntimeState();
    const filterRegistry = new FilterRegistry();
    const interpolateState = createInterpolateRuntimeState();
    const configRegistry = new RuntimeConfigRegistry();
    const platform = createPlatformRuntime(dependencies);
    const disposers = [];
    let destroyed = false;
    const finishDestroy = () => {
        destroyed = true;
        removeAppContextDestroyHook();
        for (let index = disposers.length - 1; index >= 0; index--) {
            disposers[index]();
        }
        disposers.length = 0;
    };
    const removeAppContextDestroyHook = appContext.onDestroy(finishDestroy);
    disposers.push(() => {
        platform.destroy();
        animationRegistry.destroy();
        controllerRegistry.destroy();
        destroyExceptionHandlerRuntimeState(exceptionHandlerState);
        filterRegistry.destroy();
        destroyInterpolateRuntimeState(interpolateState);
        configRegistry.clear();
        compileRegistry.destroy();
        compileLifecycle.destroy();
    });
    return {
        animationRegistry,
        appContext,
        compileLifecycle,
        compileRegistry,
        controllerRegistry,
        exceptionHandlerState,
        filterRegistry,
        interpolateState,
        configRegistry,
        platform,
        get destroyed() {
            return destroyed;
        },
        addDisposer(disposer) {
            if (destroyed) {
                disposer();
                return () => undefined;
            }
            disposers.push(disposer);
            return () => {
                const index = disposers.indexOf(disposer);
                if (index >= 0)
                    disposers.splice(index, 1);
            };
        },
        destroy() {
            if (destroyed)
                return;
            if (ownsAppContext && !appContext.destroyed) {
                appContext.destroy();
                return;
            }
            finishDestroy();
        },
    };
}

export { RuntimeConfigRegistry, createCoreRuntime, createPlatformRuntime, registerRuntimeProviders };
