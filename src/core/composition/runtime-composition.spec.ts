/// <reference types="jasmine" />
import { AppContext } from "../app-context/app-context.ts";
import type { ProviderRegistry } from "../di/interface.ts";
import { applyInterpolateConfiguration } from "../interpolate/interpolate.ts";
import {
  createCoreRuntime,
  createPlatformRuntime,
  registerRuntimeProviders,
} from "./runtime-composition.ts";

describe("RuntimeComposition", () => {
  it("owns the explicit host console dependency", () => {
    const hostConsole = { log: () => undefined } as unknown as Console;
    const composition = createCoreRuntime({
      console: hostConsole,
      document,
      window,
    });

    expect(composition.platform.console).toBe(hostConsole);

    composition.destroy();
  });

  it("owns platform hosts and idempotent browser-service teardown", () => {
    const hostConsole = { log: () => undefined } as unknown as Console;
    const platform = createPlatformRuntime({
      console: hostConsole,
      document,
      window,
    });
    const first = jasmine.createSpy("first");
    const second = jasmine.createSpy("second");
    const removed = jasmine.createSpy("removed");
    const late = jasmine.createSpy("late");
    const remove = platform.addDisposer(removed);

    platform.addDisposer(first);
    platform.addDisposer(second);
    remove();
    platform.destroy();
    platform.destroy();
    const removeLate = platform.addDisposer(late);

    removeLate();

    expect(platform.console).toBe(hostConsole);
    expect(platform.document).toBe(document);
    expect(platform.window).toBe(window);
    expect(platform.destroyed).toBeTrue();
    expect(second).toHaveBeenCalledBefore(first);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("owns and idempotently destroys its default AppContext", () => {
    const composition = createCoreRuntime({ document, window });
    const first = jasmine.createSpy("first");
    const second = jasmine.createSpy("second");

    composition.addDisposer(first);
    composition.addDisposer(second);
    composition.destroy();
    composition.destroy();

    expect(composition.destroyed).toBeTrue();
    expect(composition.appContext.destroyed).toBeTrue();
    expect(composition.platform.destroyed).toBeTrue();
    expect(second).toHaveBeenCalledBefore(first);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does not destroy a borrowed AppContext", () => {
    const appContext = new AppContext();
    const composition = createCoreRuntime({
      appContext,
      document,
      window,
    });

    composition.destroy();

    expect(composition.destroyed).toBeTrue();
    expect(appContext.destroyed).toBeFalse();

    appContext.destroy();
  });

  it("follows external AppContext teardown", () => {
    const appContext = new AppContext();
    const composition = createCoreRuntime({
      appContext,
      document,
      window,
    });
    const disposer = jasmine.createSpy("disposer");

    composition.addDisposer(disposer);
    appContext.destroy();

    expect(composition.destroyed).toBeTrue();
    expect(disposer).toHaveBeenCalledTimes(1);
  });

  it("can remove disposers and immediately disposes late ownership", () => {
    const composition = createCoreRuntime({ document, window });
    const removed = jasmine.createSpy("removed");
    const late = jasmine.createSpy("late");
    const remove = composition.addDisposer(removed);

    remove();
    composition.destroy();
    const removeLate = composition.addDisposer(late);

    removeLate();

    expect(removed).not.toHaveBeenCalled();
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("disposes the owned compile lifecycle", () => {
    const composition = createCoreRuntime({ document, window });
    const listener = jasmine.createSpy("listener");

    composition.compileLifecycle.onControllerCreated(listener);
    composition.destroy();
    composition.compileLifecycle._emitControllerCreated({
      controller: {},
      directiveName: "example",
      element: document.createElement("div"),
      scope: {} as ng.Scope,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("owns and clears its compile registry", () => {
    const composition = createCoreRuntime({ document, window });

    composition.compileRegistry.component("ownedComponent", {
      bindings: { value: "<" },
    });

    expect(
      composition.compileRegistry.getComponentBindings("ownedComponent"),
    ).toEqual([{ value: "<" }]);

    composition.destroy();

    expect(
      composition.compileRegistry.getComponentBindings("ownedComponent"),
    ).toBeUndefined();
  });

  it("owns and clears its animation registry", () => {
    const composition = createCoreRuntime({ document, window });

    composition.animationRegistry.register("owned", {});

    expect(composition.animationRegistry.has("owned")).toBeTrue();

    composition.destroy();

    expect(() => composition.animationRegistry.has("owned")).toThrowError(
      "Animation registry has already been disposed.",
    );
  });

  it("owns and clears its controller registry", () => {
    const composition = createCoreRuntime({ document, window });

    composition.controllerRegistry.register("OwnedController", () => undefined);

    expect(composition.controllerRegistry.has("OwnedController")).toBeTrue();

    composition.destroy();

    expect(() =>
      composition.controllerRegistry.has("OwnedController"),
    ).toThrowError("Controller registry has already been disposed.");
  });

  it("owns and clears its filter registry", () => {
    const composition = createCoreRuntime({ document, window });

    composition.filterRegistry.register("owned", () => () => undefined);
    composition.destroy();

    expect(() =>
      composition.filterRegistry.register("late", () => () => undefined),
    ).toThrowError("Filter registry has been destroyed");
  });

  it("owns and disposes interpolation configuration", () => {
    const composition = createCoreRuntime({ document, window });

    applyInterpolateConfiguration(composition.interpolateState, {
      startSymbol: "[[",
    });
    composition.destroy();

    expect(() =>
      applyInterpolateConfiguration(composition.interpolateState, {}),
    ).toThrowError("Interpolation runtime has already been disposed.");
  });

  it("owns and disposes its exception handler state", () => {
    const composition = createCoreRuntime({ document, window });
    const service = composition.exceptionHandlerState.service;

    composition.destroy();

    expect(() => service(new Error("late"))).toThrowError(
      "Exception handler runtime has already been disposed.",
    );
  });

  it("owns typed runtime configuration handlers", () => {
    const composition = createCoreRuntime({ document, window });
    const configure = jasmine.createSpy("configure");

    composition.configRegistry.register("$example", configure);
    composition.configRegistry.configure("$example", { enabled: true });

    expect(configure).toHaveBeenCalledOnceWith({ enabled: true });

    composition.destroy();

    expect(() =>
      composition.configRegistry.configure("$example", { enabled: false }),
    ).toThrowError("No runtime configurator registered for $example");
  });

  it("composes ordered provider recipes with runtime-owned dependencies", () => {
    const composition = createCoreRuntime({ document, window });
    const registrations: string[] = [];
    const registry = {
      provider(name: string, definition: unknown) {
        registrations.push(name);

        return definition;
      },
    } as unknown as ProviderRegistry;
    const firstProvider = { $get: () => "first" };
    const secondProvider = { $get: () => "second" };
    const composedRecipe = class {
      static _compose(context: {
        runtime: typeof composition;
        platform: typeof composition.platform;
        compileRegistry: typeof composition.compileRegistry;
        providers: ReadonlyMap<string, unknown>;
      }) {
        expect(context.runtime).toBe(composition);
        expect(context.platform).toBe(composition.platform);
        expect(context.compileRegistry).toBe(composition.compileRegistry);
        expect(context.providers.get("first")).toBe(firstProvider);

        return secondProvider;
      }

      $get = () => "unused";
    };

    const providers = registerRuntimeProviders(
      registry,
      { first: firstProvider, second: composedRecipe },
      composition,
    );

    expect(registrations).toEqual(["first", "second"]);
    expect(providers.get("second")).toBe(secondProvider);

    composition.destroy();
  });

  it("registers direct runtime recipes without constructing a provider recipe", () => {
    const composition = createCoreRuntime({ document, window });
    const provider = jasmine.createSpy("provider");
    const registration = {
      _register: jasmine
        .createSpy("register")
        .and.callFake(
          (
            registry: ProviderRegistry,
            name: string,
            context: { runtime: typeof composition },
          ) => {
            expect(registry).toBe(providerRegistry);
            expect(name).toBe("direct");
            expect(context.runtime).toBe(composition);

            return "registered";
          },
        ),
    };
    const providerRegistry = { provider } as unknown as ProviderRegistry;

    const providers = registerRuntimeProviders(
      providerRegistry,
      { direct: registration },
      composition,
    );

    expect(registration._register).toHaveBeenCalledTimes(1);
    expect(provider).not.toHaveBeenCalled();
    expect(providers.get("direct")).toBe("registered");

    composition.destroy();
  });
});
