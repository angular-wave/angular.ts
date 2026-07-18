/// <reference types="jasmine" />
import { Angular } from "../../angular.ts";
import { createInjector } from "../../core/di/injector.ts";
import { SCOPE_PROXY_BIND } from "../../core/scope/scope.ts";
import { dealoc } from "../../shared/dom.ts";
import { wait } from "../../shared/test-utils.ts";
import {
  createConfiguredServiceWorkerService,
  createServiceWorkerService,
  destroyServiceWorkerService,
  ServiceWorkerMessageClient,
  ServiceWorkerMessageClientError,
  ServiceWorkerError,
} from "./service-worker.ts";
import type { ServiceWorkerMessageEvent } from "./service-worker.ts";

function createLog(): ng.LogService {
  return {
    debug: jasmine.createSpy("debug"),
    error: jasmine.createSpy("error"),
    info: jasmine.createSpy("info"),
    log: jasmine.createSpy("log"),
    warn: jasmine.createSpy("warn"),
  };
}

function createExceptionHandler(): ng.ExceptionHandlerService {
  return (() => undefined) as unknown as ng.ExceptionHandlerService;
}

function createReactiveScope(): ng.Scope {
  window.angular = new Angular();

  return createInjector(["ng"]).get("$rootScope") as ng.Scope;
}

async function expectUnsupported(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
    fail("Expected service-worker operation to reject.");
  } catch (error) {
    expect(error instanceof ServiceWorkerError).toBeTrue();
    expect((error as ServiceWorkerError).name).toBe("ServiceWorkerError");
    expect((error as ServiceWorkerError).code).toBe("unsupported");
  }
}

async function expectServiceWorkerError(
  promise: Promise<unknown>,
  code: ServiceWorkerError["code"],
): Promise<void> {
  try {
    await promise;
    fail(`Expected service-worker operation to reject with ${code}.`);
  } catch (error) {
    expect(error instanceof ServiceWorkerError).toBeTrue();
    expect((error as ServiceWorkerError).code).toBe(code);
  }
}

async function expectMessageClientError(
  promise: Promise<unknown>,
  code: ServiceWorkerMessageClientError["code"],
): Promise<void> {
  try {
    await promise;
    fail(`Expected service-worker message client to reject with ${code}.`);
  } catch (error) {
    expect(error instanceof ServiceWorkerMessageClientError).toBeTrue();
    expect((error as ServiceWorkerMessageClientError).code).toBe(code);
  }
}

interface FakeRegistrationOptions {
  scope?: string;
  updateViaCache?: ServiceWorkerUpdateViaCache;
  installing?: ServiceWorker;
  waiting?: ServiceWorker;
  active?: ServiceWorker;
  update?: () => Promise<ServiceWorkerRegistration>;
  unregister?: () => Promise<boolean>;
}

interface FakeServiceWorkerContainer extends ServiceWorkerContainer {
  listeners: Partial<Record<string, EventListener[]>>;
  dispatch(type: string, event?: Event): void;
}

interface FakeServiceWorker extends ServiceWorker {
  listeners: Partial<Record<string, EventListener[]>>;
  dispatch(type: string, event?: Event): void;
  skipWaiting: jasmine.Spy;
}

interface FakeServiceWorkerRegistration extends ServiceWorkerRegistration {
  listeners: Partial<Record<string, EventListener[]>>;
  dispatch(type: string, event?: Event): void;
}

function createWorker(state: ServiceWorkerState): FakeServiceWorker {
  const listeners: Partial<Record<string, EventListener[]>> = {};
  const worker = {
    state,
    postMessage: jasmine.createSpy("postMessage"),
    skipWaiting: jasmine.createSpy("skipWaiting"),
    listeners,
    addEventListener(type: string, listener: EventListener) {
      listeners[type] ??= [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners[type] = (listeners[type] ?? []).filter(
        (entry) => entry !== listener,
      );
    },
    dispatch(type: string, event: Event = new Event(type)) {
      (listeners[type] ?? []).forEach((listener) => listener(event));
    },
  } as unknown as FakeServiceWorker;

  return worker;
}

function setWorkerState(
  worker: FakeServiceWorker,
  state: ServiceWorkerState,
): void {
  (worker as unknown as { state: ServiceWorkerState }).state = state;
}

function createContainer(
  controller: ServiceWorker | null = null,
): FakeServiceWorkerContainer {
  const listeners: Partial<Record<string, EventListener[]>> = {};
  const container = {
    controller,
    listeners,
    addEventListener(type: string, listener: EventListener) {
      listeners[type] ??= [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners[type] = (listeners[type] ?? []).filter(
        (entry) => entry !== listener,
      );
    },
    dispatch(type: string, event: Event = new Event(type)) {
      (listeners[type] ?? []).forEach((listener) => listener(event));
    },
  } as FakeServiceWorkerContainer;

  return container;
}

function createRegistration(
  options: FakeRegistrationOptions = {},
): FakeServiceWorkerRegistration {
  const listeners: Partial<Record<string, EventListener[]>> = {};
  const registration = {
    scope: options.scope ?? "/",
    updateViaCache: options.updateViaCache ?? "imports",
    installing: options.installing ?? null,
    waiting: options.waiting ?? null,
    active: options.active ?? null,
    update:
      options.update ??
      jasmine
        .createSpy("update")
        .and.resolveTo(null as unknown as ServiceWorkerRegistration),
    unregister:
      options.unregister ?? jasmine.createSpy("unregister").and.resolveTo(true),
    listeners,
    addEventListener(type: string, listener: EventListener) {
      listeners[type] ??= [];
      listeners[type].push(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners[type] = (listeners[type] ?? []).filter(
        (entry) => entry !== listener,
      );
    },
    dispatch(type: string, event: Event = new Event(type)) {
      (listeners[type] ?? []).forEach((listener) => listener(event));
    },
  } as unknown as FakeServiceWorkerRegistration;

  return registration;
}

function setRegistrationWorker(
  registration: FakeServiceWorkerRegistration,
  key: "installing" | "waiting" | "active",
  worker: ServiceWorker | null,
): void {
  (registration as unknown as Record<typeof key, ServiceWorker | null>)[key] =
    worker;
}

describe("$serviceWorker", () => {
  it("creates a supported service with a fake container", () => {
    const controller = { state: "activated" } as ServiceWorker;
    const container = {
      controller,
    } as ServiceWorkerContainer;
    const log = createLog();
    const err = createExceptionHandler();

    const service = createServiceWorkerService(container, { log, err });

    expect(service.supported).toBeTrue();
    expect(service.support).toEqual({ supported: true });
    expect(service.status).toBe("idle");
    expect(service.controller).toBe(controller);
    expect(service.registration).toBeNull();
    expect(service.registrationState).toEqual({ registered: false });
    expect(service.updateState).toEqual({
      checking: false,
      waiting: false,
      controllerChanged: false,
    });
    expect(log.warn).not.toHaveBeenCalled();
  });

  it("schedules bound scope watchers after registration state changes", async () => {
    const registration = createRegistration({
      scope: "/app/",
      waiting: createWorker("installed"),
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const scope = createReactiveScope();
    const statuses: string[] = [];
    const registered: boolean[] = [];

    scope.sw = service;
    const scopedService = scope.sw as ng.ServiceWorkerService;
    scope.$watch("sw.status", (value) => {
      statuses.push(value as string);
    });
    scope.$watch("sw.registrationState.registered", (value) => {
      registered.push(value as boolean);
    });
    await wait();
    statuses.length = 0;
    registered.length = 0;

    await scopedService.register("/sw.js");
    await wait();

    expect(statuses).toContain("registered");
    expect(registered).toContain(true);
  });

  it("schedules bound scope watchers after controller changes", async () => {
    const nextController = createWorker("activated");
    const container = createContainer(null);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const scope = createReactiveScope();
    const controllers: Array<ServiceWorker | null> = [];

    scope.sw = service;
    const scopedService = scope.sw as ng.ServiceWorkerService;
    scope.$watch("sw.controller", (value) => {
      controllers.push(value as ServiceWorker | null);
    });
    await wait();
    controllers.length = 0;

    (container as unknown as { controller: ServiceWorker | null }).controller =
      nextController;
    container.dispatch("controllerchange");
    await wait();

    expect(service.controller).toBe(nextController);
    expect(scopedService.controller?.state).toBe("activated");
    expect(controllers.length).toBe(1);
    expect(controllers[0]?.state).toBe("activated");
  });

  it("schedules bound scope watchers after update detection", async () => {
    const worker = createWorker("installing");
    const registration = createRegistration({
      scope: "/app/",
      installing: worker,
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const scope = createReactiveScope();
    const phases: Array<ServiceWorkerState | undefined> = [];

    scope.sw = service;
    const scopedService = scope.sw as ng.ServiceWorkerService;
    scope.$watch("sw.updateState.phase", (value) => {
      phases.push(value as ServiceWorkerState | undefined);
    });
    await wait();
    phases.length = 0;

    await scopedService.register("/sw.js");
    registration.dispatch("updatefound");
    await wait();

    expect(phases).toContain("installing");
  });

  it("cleans up destroyed bound scopes opportunistically", async () => {
    const registration = createRegistration({ scope: "/app/" });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const scope = createReactiveScope();
    const statuses: string[] = [];

    scope.sw = service;
    const scopedService = scope.sw as ng.ServiceWorkerService;
    scope.$watch("sw.status", (value) => {
      statuses.push(value as string);
    });
    await wait();
    statuses.length = 0;

    scope.$destroy();
    await scopedService.register("/sw.js");
    await wait();

    expect(statuses).toEqual([]);
  });

  it("registers with script URL and registration options", async () => {
    const registration = createRegistration({
      scope: "/app/",
      updateViaCache: "none",
      installing: createWorker("installing"),
      waiting: createWorker("installed"),
      active: createWorker("activated"),
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    const result = await service.register("/sw.js", {
      scope: "/app/",
      type: "module",
      updateViaCache: "none",
    });

    expect(result).toBe(registration);
    expect(container.register).toHaveBeenCalledWith("/sw.js", {
      scope: "/app/",
      type: "module",
      updateViaCache: "none",
    });
    expect(service.registration).toBe(registration);
    expect(service.registrationState).toEqual({
      registered: true,
      scope: "/app/",
      updateViaCache: "none",
      installing: "installing",
      waiting: "installed",
      active: "activated",
    });
    expect(service.updateState.waiting).toBeTrue();
  });

  it("resolves ready state and stores the ready registration", async () => {
    const registration = createRegistration({
      scope: "/ready/",
      updateViaCache: "imports",
      active: createWorker("activated"),
    });
    const container = {
      controller: null,
      ready: Promise.resolve(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await expectAsync(service.ready()).toBeResolvedTo(registration);

    expect(service.registration).toBe(registration);
    expect(service.registrationState).toEqual({
      registered: true,
      scope: "/ready/",
      updateViaCache: "imports",
      active: "activated",
    });
  });

  it("updates an existing registration", async () => {
    const updatedRegistration = createRegistration({
      scope: "/updated/",
      updateViaCache: "all",
      waiting: createWorker("installed"),
    });
    const registration = createRegistration({
      scope: "/app/",
      update: jasmine.createSpy("update").and.resolveTo(updatedRegistration),
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await service.register("/sw.js");
    await expectAsync(service.update()).toBeResolvedTo(updatedRegistration);

    expect(registration.update).toHaveBeenCalled();
    expect(service.updateState.checking).toBeFalse();
    expect(service.updateState.lastCheckedAt).toEqual(jasmine.any(Number));
    expect(service.updateState.waiting).toBeTrue();
    expect(service.registration).toBe(updatedRegistration);
    expect(service.registrationState).toEqual({
      registered: true,
      scope: "/updated/",
      updateViaCache: "all",
      waiting: "installed",
    });
  });

  it("unregisters an existing registration and clears state", async () => {
    const registration = createRegistration({
      scope: "/app/",
      waiting: createWorker("installed"),
      unregister: jasmine.createSpy("unregister").and.resolveTo(true),
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await service.register("/sw.js");
    await expectAsync(service.unregister()).toBeResolvedTo(true);

    expect(registration.unregister).toHaveBeenCalled();
    expect(service.registration).toBeNull();
    expect(service.registrationState).toEqual({ registered: false });
    expect(service.updateState.waiting).toBeFalse();
  });

  it("rejects update and unregister when no registration exists", async () => {
    const container = {
      controller: null,
    } as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await expectServiceWorkerError(service.update(), "no-registration");
    await expectServiceWorkerError(service.unregister(), "no-registration");
    expect(service.updateState.errorCode).toBe("no-registration");
  });

  it("registers and disposes message listeners", () => {
    const container = createContainer();
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const received: ServiceWorkerMessageEvent<{ ok: true }>[] = [];

    const dispose = service.onMessage<{ ok: true }>((event) => {
      received.push(event);
    });
    const event = {
      data: { ok: true },
      source: null,
    } as MessageEvent<{ ok: true }>;

    container.dispatch("message", event);
    dispose();
    container.dispatch("message", {
      data: { ok: true },
      source: null,
    } as MessageEvent<{ ok: true }>);

    expect(received.length).toBe(1);
    expect(received[0].data).toEqual({ ok: true });
    expect(received[0].event).toBe(event);
  });

  it("registers and disposes controller-change listeners", () => {
    const initialController = createWorker("activated");
    const nextController = createWorker("activating");
    const container = createContainer(initialController);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const controllers: (ServiceWorker | null)[] = [];

    const dispose = service.onControllerChange((controller) => {
      controllers.push(controller);
    });

    (container as unknown as { controller: ServiceWorker | null }).controller =
      nextController;
    container.dispatch("controllerchange");
    dispose();
    (container as unknown as { controller: ServiceWorker | null }).controller =
      null;
    container.dispatch("controllerchange");

    expect(service.controller).toBeNull();
    expect(service.updateState.controllerChanged).toBeTrue();
    expect(controllers).toEqual([nextController]);
  });

  it("releases framework listeners without unregistering the browser worker", async () => {
    const worker = createWorker("installing");
    const registration = createRegistration({ installing: worker });
    const container = createContainer();
    container.register = jasmine
      .createSpy("register")
      .and.resolveTo(registration);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    service.onMessage(() => undefined);
    service.onControllerChange(() => undefined);
    service.onUpdate(() => undefined);
    await service.register("/sw.js");
    registration.dispatch("updatefound");

    expect(container.listeners.controllerchange?.length).toBe(1);
    expect(container.listeners.message?.length).toBe(1);
    expect(registration.listeners.updatefound?.length).toBe(1);
    expect(worker.listeners.statechange?.length).toBe(1);

    destroyServiceWorkerService(service);
    destroyServiceWorkerService(service);

    expect(container.listeners.controllerchange).toEqual([]);
    expect(container.listeners.message).toEqual([]);
    expect(registration.listeners.updatefound).toEqual([]);
    expect(worker.listeners.statechange).toEqual([]);
    expect(registration.unregister).not.toHaveBeenCalled();

    service.onMessage(() => undefined);
    service.onControllerChange(() => undefined);
    service.onUpdate(() => undefined);
    expect(container.listeners.message).toEqual([]);
  });

  it("posts messages to the active controller", async () => {
    const controller = createWorker("activated");
    const service = createServiceWorkerService(createContainer(controller), {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const transfer = [new ArrayBuffer(1)];

    await expectAsync(service.post({ type: "ping" }, transfer)).toBeResolved();

    expect(controller.postMessage).toHaveBeenCalledWith(
      { type: "ping" },
      transfer as unknown as StructuredSerializeOptions,
    );
  });

  it("rejects post without an active controller", async () => {
    const service = createServiceWorkerService(createContainer(null), {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await expectServiceWorkerError(
      service.post({ type: "ping" }),
      "no-controller",
    );
  });

  it("correlates service worker message client requests and responses", async () => {
    const controller = createWorker("activated");
    const container = createContainer(controller);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const client = new ServiceWorkerMessageClient(service, {
      createId: () => "request-1",
    });

    const responsePromise = client.request<{ accepted: true }>({
      action: "sync",
    });

    expect(client.pending).toBe(1);
    const postMessage = controller.postMessage as jasmine.Spy;
    expect(postMessage).toHaveBeenCalled();
    expect(postMessage.calls.mostRecent().args).toEqual([
      {
        type: "angular-ts:service-worker:request",
        id: "request-1",
        payload: { action: "sync" },
      },
      [],
    ]);

    container.dispatch("message", {
      data: {
        type: "other",
        id: "request-1",
        ok: true,
        data: { accepted: false },
      },
      source: null,
    } as MessageEvent);

    expect(client.pending).toBe(1);

    container.dispatch("message", {
      data: {
        type: "angular-ts:service-worker:response",
        id: "request-1",
        ok: true,
        data: { accepted: true },
      },
      source: null,
    } as MessageEvent);

    await expectAsync(responsePromise).toBeResolvedTo({ accepted: true });
    expect(client.pending).toBe(0);

    client.dispose();
  });

  it("rejects service worker message client response errors", async () => {
    const controller = createWorker("activated");
    const container = createContainer(controller);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const client = new ServiceWorkerMessageClient(service, {
      createId: () => "request-2",
    });

    const responsePromise = client.request("payload");

    container.dispatch("message", {
      data: {
        type: "angular-ts:service-worker:response",
        id: "request-2",
        ok: false,
        error: { reason: "denied" },
      },
      source: null,
    } as MessageEvent);

    await expectMessageClientError(responsePromise, "response-error");
    expect(client.pending).toBe(0);

    client.dispose();
  });

  it("rejects service worker message client post failures", async () => {
    const service = createServiceWorkerService(createContainer(null), {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const client = new ServiceWorkerMessageClient(service, {
      createId: () => "request-3",
    });

    await expectMessageClientError(client.request("payload"), "post-failed");
    expect(client.pending).toBe(0);

    client.dispose();
  });

  it("times out unanswered service worker message client requests", async () => {
    const controller = createWorker("activated");
    const service = createServiceWorkerService(createContainer(controller), {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const client = new ServiceWorkerMessageClient(service, {
      createId: () => "request-4",
      timeout: 1,
    });

    await expectMessageClientError(client.request("payload"), "timeout");
    expect(client.pending).toBe(0);

    client.dispose();
  });

  it("disposes service worker message client listeners and pending requests", async () => {
    const controller = createWorker("activated");
    const container = createContainer(controller);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const client = new ServiceWorkerMessageClient(service, {
      createId: () => "request-5",
    });

    const responsePromise = client.request("payload");

    expect(container.listeners.message?.length).toBe(1);

    client.dispose();

    expect(client.disposed).toBeTrue();
    expect(client.pending).toBe(0);
    expect(container.listeners.message).toEqual([]);
    await expectMessageClientError(responsePromise, "disposed");
    await expectMessageClientError(client.request("payload"), "disposed");
  });

  it("emits update state when updatefound fires", async () => {
    const worker = createWorker("installing");
    const registration = createRegistration({
      scope: "/app/",
      installing: worker,
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const updates: ng.ServiceWorkerUpdateState[] = [];

    service.onUpdate((state) => {
      updates.push({ ...state });
    });

    await service.register("/sw.js");
    registration.dispatch("updatefound");

    expect(updates.length).toBe(1);
    expect(updates[0].phase).toBe("installing");
    expect(updates[0].worker).toBe(worker);
    expect(updates[0].registration).toBe(registration);
    expect(service.updateState.phase).toBe("installing");
    expect(service.registrationState.installing).toBe("installing");
  });

  it("emits state transitions for the discovered worker", async () => {
    const worker = createWorker("installing");
    const registration = createRegistration({
      scope: "/app/",
      installing: worker,
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const phases: Array<ServiceWorkerState | undefined> = [];

    service.onUpdate((state) => {
      phases.push(state.phase);
    });

    await service.register("/sw.js");
    registration.dispatch("updatefound");

    setRegistrationWorker(registration, "installing", null);
    setRegistrationWorker(registration, "waiting", worker);
    setWorkerState(worker, "installed");
    worker.dispatch("statechange");

    setRegistrationWorker(registration, "waiting", null);
    setRegistrationWorker(registration, "active", worker);
    setWorkerState(worker, "activated");
    worker.dispatch("statechange");

    expect(phases).toEqual(["installing", "installed", "activated"]);
    expect(service.registrationState.waiting).toBeUndefined();
    expect(service.registrationState.active).toBe("activated");
    expect(service.updateState.waiting).toBeFalse();
  });

  it("removes old worker state listeners when a newer update is found", async () => {
    const oldWorker = createWorker("installing");
    const newWorker = createWorker("installing");
    const registration = createRegistration({
      scope: "/app/",
      installing: oldWorker,
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const phases: Array<ServiceWorkerState | undefined> = [];

    service.onUpdate((state) => {
      phases.push(state.phase);
    });

    await service.register("/sw.js");
    registration.dispatch("updatefound");

    setRegistrationWorker(registration, "installing", newWorker);
    registration.dispatch("updatefound");

    setWorkerState(oldWorker, "redundant");
    oldWorker.dispatch("statechange");

    setWorkerState(newWorker, "installed");
    newWorker.dispatch("statechange");

    expect(phases).toEqual(["installing", "installing", "installed"]);
  });

  it("does not activate or reload automatically when updates are discovered", async () => {
    const worker = createWorker("installing");
    const registration = createRegistration({
      scope: "/app/",
      installing: worker,
    });
    const container = {
      controller: null,
      register: jasmine.createSpy("register").and.resolveTo(registration),
    } as unknown as ServiceWorkerContainer;
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await service.register("/sw.js");
    registration.dispatch("updatefound");
    setWorkerState(worker, "installed");
    worker.dispatch("statechange");

    expect(worker.skipWaiting).not.toHaveBeenCalled();
  });

  it("creates an unsupported service without throwing", () => {
    const log = createLog();
    const err = createExceptionHandler();

    const service = createServiceWorkerService(undefined, { log, err });

    expect(service.supported).toBeFalse();
    expect(service.support.supported).toBeFalse();
    expect(service.controller).toBeNull();
    expect(service.registration).toBeNull();
    expect(log.warn).toHaveBeenCalledWith(
      "Service workers are not supported in this environment.",
    );
  });

  it("rejects unsupported async operations with stable errors", async () => {
    const service = createServiceWorkerService(undefined, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await expectUnsupported(service.register("/sw.js"));
    await expectUnsupported(service.ready());
    await expectUnsupported(service.update());
    await expectUnsupported(service.unregister());
    await expectUnsupported(service.post({ type: "ping" }));
  });

  it("returns no-op disposers for event subscriptions in the skeleton", () => {
    const service = createServiceWorkerService(undefined, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    expect(service.onMessage(() => undefined)()).toBeUndefined();
    expect(service.onControllerChange(() => undefined)()).toBeUndefined();
    expect(service.onUpdate(() => undefined)()).toBeUndefined();
  });

  it("is injectable from the default ng module", () => {
    const el = document.getElementById("app")!;
    el.innerHTML = "";

    const angular = new Angular();
    let service: ng.ServiceWorkerService | undefined;

    angular
      .bootstrap(el, [])
      .invoke(($serviceWorker: ng.ServiceWorkerService) => {
        service = $serviceWorker;
      });

    expect(service).toBeDefined();
    expect(service!.support.supported).toBe(service!.supported);

    dealoc(el);
  });

  it("preserves native failures with stable operation error codes", async () => {
    const registerService = createServiceWorkerService(
      {
        controller: null,
        register: jasmine
          .createSpy("register")
          .and.rejectWith(new Error("register failed")),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );

    await expectServiceWorkerError(
      registerService.register("/sw.js"),
      "register-failed",
    );
    expect(registerService.status).toBe("error");

    const readyService = createServiceWorkerService(
      {
        controller: null,
        ready: Promise.reject(new Error("ready failed")),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );

    await expectServiceWorkerError(readyService.ready(), "ready-failed");

    const updateRegistration = createRegistration({
      update: jasmine.createSpy("update").and.rejectWith(new Error("update")),
    });
    const updateService = createServiceWorkerService(
      {
        controller: null,
        register: jasmine
          .createSpy("register")
          .and.resolveTo(updateRegistration),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );

    await updateService.register("/sw.js");
    await expectServiceWorkerError(updateService.update(), "update-failed");
    expect(updateService.updateState.errorCode).toBe("update-failed");
    expect(updateService.updateState.error).toEqual(jasmine.any(Error));
    expect(updateService.updateState.checking).toBeFalse();

    const unregisterRegistration = createRegistration({
      unregister: jasmine
        .createSpy("unregister")
        .and.rejectWith(new Error("unregister")),
    });
    const unregisterService = createServiceWorkerService(
      {
        controller: null,
        register: jasmine
          .createSpy("register")
          .and.resolveTo(unregisterRegistration),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );

    await unregisterService.register("/sw.js");
    await expectServiceWorkerError(
      unregisterService.unregister(),
      "unregister-failed",
    );
  });

  it("checks for updates on registration when configured", async () => {
    const registration = createRegistration();

    registration.update = jasmine
      .createSpy("update")
      .and.resolveTo(registration);
    const service = createServiceWorkerService(
      {
        controller: null,
        register: jasmine.createSpy("register").and.resolveTo(registration),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );

    await service.register("/sw.js", { checkForUpdatesOnRegister: true });

    expect(registration.update).toHaveBeenCalledTimes(1);
  });

  it("posts to each explicit worker lifecycle target", async () => {
    const installing = createWorker("installing");
    const waiting = createWorker("installed");
    const active = createWorker("activated");
    const registration = createRegistration({ installing, waiting, active });
    const service = createServiceWorkerService(
      {
        controller: null,
        register: jasmine.createSpy("register").and.resolveTo(registration),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );

    await expectServiceWorkerError(
      service.post("active", undefined, "active"),
      "no-controller",
    );
    await expectServiceWorkerError(
      service.post("installing", undefined, "installing"),
      "no-controller",
    );
    await expectServiceWorkerError(
      service.post("waiting", undefined, "waiting"),
      "no-controller",
    );

    await service.register("/sw.js");
    await service.post("active", undefined, "active");
    await service.post("installing", undefined, "installing");
    await service.post("waiting", undefined, "waiting");

    expect(active.postMessage).toHaveBeenCalledWith(
      "active",
      [] as unknown as StructuredSerializeOptions,
    );
    expect(installing.postMessage).toHaveBeenCalledWith(
      "installing",
      [] as unknown as StructuredSerializeOptions,
    );
    expect(waiting.postMessage).toHaveBeenCalledWith(
      "waiting",
      [] as unknown as StructuredSerializeOptions,
    );
  });

  it("discovers waiting and active workers when no installer exists", async () => {
    const waiting = createWorker("installed");
    const active = createWorker("activated");
    const registration = createRegistration({ waiting });
    const service = createServiceWorkerService(
      {
        controller: null,
        register: jasmine.createSpy("register").and.resolveTo(registration),
      } as unknown as ServiceWorkerContainer,
      { log: createLog(), err: createExceptionHandler() },
    );
    const phases: ServiceWorkerState[] = [];

    service.onUpdate((state) => phases.push(state.phase!));
    await service.register("/sw.js");
    registration.dispatch("updatefound");

    setRegistrationWorker(registration, "waiting", null);
    setRegistrationWorker(registration, "active", active);
    registration.dispatch("updatefound");

    expect(phases).toEqual(["installed", "activated"]);
  });

  it("routes event callback failures through the exception handler", async () => {
    const err = jasmine.createSpy("err");
    const worker = createWorker("installing");
    const registration = createRegistration({ installing: worker });
    const container = createContainer();

    container.register = jasmine
      .createSpy("register")
      .and.resolveTo(registration);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: err as unknown as ng.ExceptionHandlerService,
    });

    service.onMessage(() => {
      throw new Error("message callback");
    });
    service.onControllerChange(() => {
      throw new Error("controller callback");
    });
    service.onUpdate(() => {
      throw new Error("update callback");
    });

    container.dispatch("message", new MessageEvent("message"));
    container.dispatch("controllerchange");
    await service.register("/sw.js");
    registration.dispatch("updatefound");

    expect(err).toHaveBeenCalledTimes(3);
  });

  it("keeps stale async and browser callbacks inert after destruction", async () => {
    let resolveRegistration!: (registration: ServiceWorkerRegistration) => void;
    const worker = createWorker("installing");
    const registration = createRegistration({ installing: worker });
    const registerPromise = new Promise<ServiceWorkerRegistration>(
      (resolve) => {
        resolveRegistration = resolve;
      },
    );
    const container = createContainer();

    container.register = jasmine
      .createSpy("register")
      .and.returnValue(registerPromise);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const operation = service.register("/sw.js");

    destroyServiceWorkerService(service);
    resolveRegistration(registration);
    await operation;

    (
      service as unknown as {
        [SCOPE_PROXY_BIND](handler: ng.Scope): void;
      }
    )[SCOPE_PROXY_BIND](createReactiveScope());

    expect(service.onUpdate(() => undefined)()).toBeUndefined();

    const trackedRegistration = createRegistration({ installing: worker });
    const trackedContainer = createContainer();

    trackedContainer.register = jasmine
      .createSpy("register")
      .and.resolveTo(trackedRegistration);
    const trackedService = createServiceWorkerService(trackedContainer, {
      log: createLog(),
      err: createExceptionHandler(),
    });

    await trackedService.register("/tracked.js");
    const staleUpdateFound = trackedRegistration.listeners.updatefound![0];

    destroyServiceWorkerService(trackedService);
    staleUpdateFound(new Event("updatefound"));
  });

  it("makes message client filtering and disposal idempotent", async () => {
    const controller = createWorker("activated");
    const container = createContainer(controller);
    const service = createServiceWorkerService(container, {
      log: createLog(),
      err: createExceptionHandler(),
    });
    const client = new ServiceWorkerMessageClient(service);
    const response = client.request("payload");
    const request = (controller.postMessage as jasmine.Spy).calls.mostRecent()
      .args[0] as { id: string };

    expect(request.id).toBe("sw:1");
    container.dispatch("message", new MessageEvent("message", { data: null }));
    container.dispatch(
      "message",
      new MessageEvent("message", {
        data: {
          type: "angular-ts:service-worker:response",
          id: "unknown",
        },
      }),
    );
    container.dispatch(
      "message",
      new MessageEvent("message", {
        data: {
          type: "angular-ts:service-worker:response",
          id: request.id,
          data: "done",
        },
      }),
    );

    await expectAsync(response).toBeResolvedTo("done");

    const dispose = service.onMessage(() => undefined);

    dispose();
    dispose();
    client.dispose();
    client.dispose();
  });

  it("ignores a late post rejection after its response has resolved", async () => {
    let messageCallback!: (event: ServiceWorkerMessageEvent) => void;
    let rejectPost!: (error: unknown) => void;
    const postResult = new Promise<void>((_resolve, reject) => {
      rejectPost = reject;
    });
    const service = {
      onMessage(callback: (event: ServiceWorkerMessageEvent) => void) {
        messageCallback = callback;
        return () => undefined;
      },
      post() {
        return postResult;
      },
    } as unknown as ng.ServiceWorkerService;
    const client = new ServiceWorkerMessageClient(service, {
      createId: () => "late",
    });
    const response = client.request("payload");

    messageCallback({
      data: {
        type: "angular-ts:service-worker:response",
        id: "late",
        data: "done",
      },
      event: new MessageEvent("message"),
    });
    rejectPost(new Error("late post failure"));

    await expectAsync(response).toBeResolvedTo("done");
    await wait();
    expect(client.pending).toBe(0);
    client.dispose();
  });

  it("delegates configured wrapper state, operations, events, and scope binding", async () => {
    const bind = jasmine.createSpy("bind");
    const dispose = jasmine.createSpy("dispose");
    const registration = createRegistration();
    const state: ng.ServiceWorkerUpdateState = {
      checking: false,
      waiting: false,
      controllerChanged: false,
    };
    const service = {
      support: { supported: true },
      supported: true,
      status: "idle",
      controller: null,
      registration,
      registrationState: { registered: true },
      updateState: state,
      register: jasmine.createSpy("register").and.resolveTo(registration),
      ready: jasmine.createSpy("ready").and.resolveTo(registration),
      update: jasmine.createSpy("update").and.resolveTo(registration),
      unregister: jasmine.createSpy("unregister").and.resolveTo(true),
      post: jasmine.createSpy("post").and.resolveTo(undefined),
      onMessage: jasmine.createSpy("onMessage").and.returnValue(dispose),
      onControllerChange: jasmine
        .createSpy("onControllerChange")
        .and.returnValue(dispose),
      onUpdate: jasmine.createSpy("onUpdate").and.returnValue(dispose),
    } as unknown as ng.ServiceWorkerService;

    Object.defineProperty(service, SCOPE_PROXY_BIND, { value: bind });

    const wrapper = createConfiguredServiceWorkerService(service, "/app.js");

    expect(wrapper.support).toBe(service.support);
    expect(wrapper.supported).toBeTrue();
    expect(wrapper.status).toBe("idle");
    expect(wrapper.controller).toBeNull();
    expect(wrapper.registration).toBe(registration);
    expect(wrapper.registrationState).toBe(service.registrationState);
    expect(wrapper.updateState).toBe(state);

    await (wrapper.register as () => Promise<ServiceWorkerRegistration>)();
    await wrapper.register("/other.js", { scope: "/other/" });
    await wrapper.ready();
    await wrapper.update();
    await wrapper.unregister();
    await wrapper.post("message", [], "active");
    expect(wrapper.onMessage(() => undefined)).toBe(dispose);
    expect(wrapper.onControllerChange(() => undefined)).toBe(dispose);
    expect(wrapper.onUpdate(() => undefined)).toBe(dispose);

    const handler = createReactiveScope();

    (
      wrapper as unknown as {
        [SCOPE_PROXY_BIND](handler: ng.Scope, proxy: ng.Scope): void;
      }
    )[SCOPE_PROXY_BIND](handler, handler);

    expect(bind).toHaveBeenCalledWith(handler, handler);
    expect(service.register).toHaveBeenCalledWith("/app.js", {});
    expect(service.register).toHaveBeenCalledWith("/other.js", {
      scope: "/other/",
    });
  });

  it("auto-registers configured wrappers and reports failures", async () => {
    const err = jasmine.createSpy("err");
    const service = {
      register: jasmine.createSpy("register").and.rejectWith(new Error("fail")),
    } as unknown as ng.ServiceWorkerService;

    createConfiguredServiceWorkerService(
      service,
      "/default.js",
      {
        autoRegister: true,
        scriptUrl: "/configured.js",
      },
      err as unknown as ng.ExceptionHandlerService,
    );
    createConfiguredServiceWorkerService(service, "/unhandled.js", {
      autoRegister: true,
    });

    await wait();

    expect(service.register).toHaveBeenCalledWith("/configured.js", {
      autoRegister: true,
      scriptUrl: "/configured.js",
    });
    expect(err).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a missing navigator from a missing worker container", () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: undefined,
    });

    try {
      const service = createServiceWorkerService(undefined, {
        log: createLog(),
        err: createExceptionHandler(),
      });

      expect(service.support).toEqual({
        supported: false,
        reason: "missing-navigator",
      });
    } finally {
      if (descriptor) {
        Object.defineProperty(globalThis, "navigator", descriptor);
      }
    }
  });
});
