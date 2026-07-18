/// <reference types="jasmine" />
import {
  CompileLifecycle,
  CompileRegistry,
} from "../../core/compile/compile.ts";
import { RouterRuntimeState } from "../router.ts";
import { StateRegistryRuntime } from "../state/state-registry.ts";
import { StateRuntime } from "../state/state-service.ts";
import { TemplateFactoryService } from "../router/template-factory.ts";
import { TransitionRuntime } from "../transition/transition-service.ts";
import { ViewService } from "../view/view.ts";
import {
  createRouterRuntime,
  routerRuntimeRegistration,
} from "./router-runtime.ts";

describe("RouterRuntimeComposition", () => {
  const viewDependencies = {
    templateFactory: {} as never,
    compile: (() => undefined) as unknown as ng.CompileService,
    controller: (() => undefined) as unknown as ng.ControllerService,
    rootScope: {
      $on: () => () => undefined,
    } as unknown as ng.Scope,
    injector: {} as ng.InjectorService,
  };

  function createComposition(
    exceptionHandler: ng.ExceptionHandlerService = (error: unknown) => {
      throw error;
    },
  ) {
    const compileLifecycle = new CompileLifecycle();
    const compileRegistry = new CompileRegistry(compileLifecycle);
    const composition = createRouterRuntime({
      compileLifecycle,
      compileRegistry,
      exceptionHandler,
      locationConfig: {},
      securityPolicy: {} as never,
    });

    return { compileLifecycle, compileRegistry, composition };
  }

  it("constructs one connected router configuration graph", () => {
    const { compileLifecycle, compileRegistry, composition } =
      createComposition();

    expect(composition.routerState).toBeInstanceOf(RouterRuntimeState);
    expect(composition.stateRegistry).toBeInstanceOf(StateRegistryRuntime);
    expect(composition.stateService).toBeInstanceOf(StateRuntime);
    expect(composition.transitions).toBeInstanceOf(TransitionRuntime);
    expect(composition.stateRegistry._routerState).toBe(
      composition.routerState,
    );
    expect(composition.stateService._stateRegistry).toBe(
      composition.stateRegistry,
    );
    expect(composition.stateService._transitionService).toBe(
      composition.transitions,
    );
    expect(composition.transitions._routerState).toBe(composition.routerState);

    composition.destroy();
    compileRegistry.destroy();
    compileLifecycle.destroy();
  });

  it("shares one live exception handler with state and transition services", () => {
    const first = new Error("first");
    const second = new Error("second");
    let current: ng.ExceptionHandlerService = (): never => {
      throw first;
    };
    const service: ng.ExceptionHandlerService = (error): never =>
      current(error);
    const { compileLifecycle, compileRegistry, composition } =
      createComposition(service);

    expect(composition.transitions._exceptionHandler).toBe(service);
    expect(composition.stateService._defaultErrorHandler).toBe(service);
    expect(() => composition.transitions._exceptionHandler("ignored")).toThrow(
      first,
    );

    current = (): never => {
      throw second;
    };

    expect(() =>
      composition.stateService._defaultErrorHandler("ignored"),
    ).toThrow(second);

    composition.destroy();
    compileRegistry.destroy();
    compileLifecycle.destroy();
  });

  it("lazily owns one fully initialized view service and destroys it idempotently", () => {
    const { compileLifecycle, compileRegistry, composition } =
      createComposition();

    expect(composition.viewService).toBeUndefined();

    const viewService = composition.createViewService(viewDependencies);
    const destroy = spyOn(viewService, "destroy").and.callThrough();

    expect(viewService).toBeInstanceOf(ViewService);
    expect(composition.createViewService(viewDependencies)).toBe(viewService);
    expect(composition.viewService).toBe(viewService);
    expect(composition.destroyed).toBeFalse();

    composition.destroy();
    composition.destroy();

    expect(composition.destroyed).toBeTrue();
    expect(destroy).toHaveBeenCalledTimes(1);

    compileRegistry.destroy();
    compileLifecycle.destroy();
  });

  it("lazily owns one template factory", () => {
    const { compileLifecycle, compileRegistry, composition } =
      createComposition();
    const templateRequest = (() => undefined) as never;
    const injector = {} as ng.InjectorService;

    expect(composition.templateFactory).toBeUndefined();

    const templateFactory = composition.createTemplateFactory(
      templateRequest,
      injector,
    );

    expect(templateFactory).toBeInstanceOf(TemplateFactoryService);
    expect(composition.createTemplateFactory(templateRequest, injector)).toBe(
      templateFactory,
    );
    expect(composition.templateFactory).toBe(templateFactory);

    composition.destroy();
    compileRegistry.destroy();
    compileLifecycle.destroy();
  });

  it("does not create router-owned services after destruction", () => {
    const { compileLifecycle, compileRegistry, composition } =
      createComposition();

    composition.destroy();

    expect(() => composition.createViewService(viewDependencies)).toThrowError(
      "Cannot create a view service after router destruction",
    );
    expect(() =>
      composition.createTemplateFactory(
        (() => undefined) as never,
        {} as ng.InjectorService,
      ),
    ).toThrowError("Cannot create a template factory after router destruction");

    compileRegistry.destroy();
    compileLifecycle.destroy();
  });

  it("rejects composition before its required providers exist", () => {
    expect(() =>
      routerRuntimeRegistration._register({} as never, "$state", {
        providers: new Map(),
      } as never),
    ).toThrowError("$location must be composed before the router runtime");
  });
});
