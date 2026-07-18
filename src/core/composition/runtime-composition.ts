import { AppContext } from "../app-context/app-context.ts";
import { CompileLifecycle, CompileRegistry } from "../compile/compile.ts";
import { AnimationRegistry } from "../../animations/animate.ts";
import { ControllerRegistry } from "../controller/controller.ts";
import { FilterRegistry } from "../filter/filter.ts";
import {
  createInterpolateRuntimeState,
  destroyInterpolateRuntimeState,
  type InterpolateRuntimeState,
} from "../interpolate/interpolate.ts";
import {
  createExceptionHandlerRuntimeState,
  destroyExceptionHandlerRuntimeState,
  type ExceptionHandlerRuntimeState,
} from "../../services/exception/exception.ts";
import type { ProviderDefinition } from "../../interface.ts";
import type { ProviderRegistry } from "../di/interface.ts";

export interface ProviderCompositionContext {
  readonly runtime: RuntimeComposition;
  readonly platform: PlatformRuntimeComposition;
  readonly compileRegistry: CompileRegistry;
  readonly providers: ReadonlyMap<string, unknown>;
}

export interface RuntimeRegistrationRecipe {
  /** @internal */
  readonly _compose?: undefined;
  /** @internal */
  _register(
    registry: ProviderRegistry,
    name: string,
    context: ProviderCompositionContext,
  ): unknown;
}

export type RuntimeProviderRecipe =
  | (ProviderDefinition & {
      /** @internal */
      _compose?: (context: ProviderCompositionContext) => unknown;
      /** @internal */
      readonly _register?: undefined;
    })
  | RuntimeRegistrationRecipe;

export interface CoreRuntimeDependencies {
  appContext?: AppContext;
  console?: Console;
  document: Document;
  window: Window;
}

export interface PlatformRuntimeDependencies {
  console?: Console;
  document: Document;
  window: Window;
}

export interface PlatformRuntimeComposition {
  readonly console: Console;
  readonly document: Document;
  readonly window: Window;
  readonly destroyed: boolean;
  addDisposer(disposer: () => void): () => void;
  destroy(): void;
}

/** @internal */
export class RuntimeConfigRegistry {
  private readonly _configurators = new Map<
    string,
    (config: unknown) => void
  >();

  register(name: string, configure: (config: unknown) => void): void {
    this._configurators.set(name, configure);
  }

  configure(name: string, config: unknown): void {
    const configure = this._configurators.get(name);

    if (!configure) {
      throw new Error(`No runtime configurator registered for ${name}`);
    }

    configure(config);
  }

  clear(): void {
    this._configurators.clear();
  }
}

export interface RuntimeComposition {
  /** @internal */
  readonly animationRegistry: AnimationRegistry;
  readonly appContext: AppContext;
  readonly compileLifecycle: CompileLifecycle;
  readonly compileRegistry: CompileRegistry;
  /** @internal */
  readonly controllerRegistry: ControllerRegistry;
  /** @internal */
  readonly exceptionHandlerState: ExceptionHandlerRuntimeState;
  /** @internal */
  readonly filterRegistry: FilterRegistry;
  /** @internal */
  readonly interpolateState: InterpolateRuntimeState;
  /** @internal */
  readonly configRegistry: RuntimeConfigRegistry;
  readonly platform: PlatformRuntimeComposition;
  readonly destroyed: boolean;
  addDisposer(disposer: () => void): () => void;
  destroy(): void;
}

/** @internal */
export function registerRuntimeProviders(
  registry: ProviderRegistry,
  definitions: Record<string, RuntimeProviderRecipe>,
  runtime: RuntimeComposition,
  providers: Map<string, unknown> = new Map(),
): Map<string, unknown> {
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
    const definition = (
      compose ? compose(context) : recipe
    ) as ProviderDefinition;
    const provider = registry.provider(name, definition);

    providers.set(name, provider);
  }

  return providers;
}

/** @internal */
export function createPlatformRuntime(
  dependencies: PlatformRuntimeDependencies,
): PlatformRuntimeComposition {
  const disposers: Array<() => void> = [];
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

        if (index >= 0) disposers.splice(index, 1);
      };
    },
    destroy() {
      if (destroyed) return;

      destroyed = true;

      for (let index = disposers.length - 1; index >= 0; index--) {
        disposers[index]();
      }

      disposers.length = 0;
    },
  };
}

/** @internal */
export function createCoreRuntime(
  dependencies: CoreRuntimeDependencies,
): RuntimeComposition {
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
  const disposers: Array<() => void> = [];
  let destroyed = false;

  const finishDestroy = (): void => {
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

        if (index >= 0) disposers.splice(index, 1);
      };
    },
    destroy() {
      if (destroyed) return;

      if (ownsAppContext && !appContext.destroyed) {
        appContext.destroy();

        return;
      }

      finishDestroy();
    },
  };
}
