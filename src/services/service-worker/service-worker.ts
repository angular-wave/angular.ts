import {
  SCOPE_PROXY_BIND,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";
import type { SecurityPolicy } from "../security/security.ts";

/**
 * Declarative defaults used when registering an application service worker.
 *
 * This config intentionally maps only browser registration options and safe
 * observation policy. Activation, reload, cache strategy, push, and background
 * sync remain explicit application or adapter policy.
 */
export interface ServiceWorkerConfig extends RegistrationOptions {
  /** Register automatically when the runtime service is created. */
  autoRegister?: boolean;

  /** Check for an updated worker after registration succeeds. */
  checkForUpdatesOnRegister?: boolean;
}

/**
 * Template-friendly snapshot of the current registration.
 */
export interface ServiceWorkerRegistrationState {
  /** True when a registration is currently known by the service. */
  readonly registered: boolean;

  /** Registration scope, when available. */
  readonly scope?: string;

  /** Update cache policy reported by the browser registration. */
  readonly updateViaCache?: ServiceWorkerUpdateViaCache;

  /** State of the installing worker, when present. */
  readonly installing?: ServiceWorkerState;

  /** State of the waiting worker, when present. */
  readonly waiting?: ServiceWorkerState;

  /** State of the active worker, when present. */
  readonly active?: ServiceWorkerState;
}

/**
 * Template-friendly snapshot of update-related service-worker state.
 */
export interface ServiceWorkerUpdateState {
  /** True while an explicit update check is in flight. */
  readonly checking: boolean;

  /** True when a waiting worker has been discovered. */
  readonly waiting: boolean;

  /** True when the active worker changed during the current page lifetime. */
  readonly controllerChanged: boolean;

  /** Last successful update-check time in epoch milliseconds. */
  readonly lastCheckedAt?: number;

  /** Latest observed service worker lifecycle phase. */
  readonly phase?: ServiceWorkerState;

  /** Worker associated with the latest update event. */
  readonly worker?: ServiceWorker;

  /** Registration associated with the latest update event. */
  readonly registration?: ServiceWorkerRegistration;

  /** Stable failure code from the last update-related operation. */
  readonly errorCode?: "no-registration" | "update-failed";

  /** Native error preserved for diagnostics. */
  readonly error?: unknown;
}

/**
 * Message event normalized by `$serviceWorker`.
 */
export interface ServiceWorkerMessageEvent<TData = unknown> {
  /** Message payload from the native service worker event. */
  data: TData;

  /** Native event for callers that need browser-specific fields. */
  event: MessageEvent<TData>;

  /** Native source that sent the message, when supplied by the browser. */
  source?: ServiceWorker | MessageEventSource | null;
}

/**
 * Explicit message target for `$serviceWorker.post(...)`.
 */
export type ServiceWorkerMessageTarget =
  | "controller"
  | "active"
  | "waiting"
  | "installing";

/** Options for {@link ServiceWorkerService.post}. */
export interface ServiceWorkerPostOptions {
  /** Transferable objects sent with `postMessage(...)`. */
  transfer?: readonly Transferable[];

  /** Worker target for this message. */
  target?: ServiceWorkerMessageTarget;
}

/** Per-request options for {@link ServiceWorkerService.request}. */
export interface ServiceWorkerRequestOptions extends ServiceWorkerPostOptions {
  /** Request timeout in milliseconds. */
  timeout?: number;
}

/**
 * Injectable service-worker lifecycle and messaging facade.
 */
export interface ServiceWorkerService {
  /** Support flag for templates and guards. */
  readonly supported: boolean;

  /** Template-facing lifecycle status for the latest service-worker operation. */
  readonly status:
    | "unsupported"
    | "idle"
    | "registering"
    | "registered"
    | "ready"
    | "updating"
    | "unregistered"
    | "error";

  /** Current native controller, if the page is controlled. */
  readonly controller: ServiceWorker | null;

  /** Latest known native registration. */
  readonly registration: ServiceWorkerRegistration | null;

  /** Template-friendly registration snapshot. */
  readonly registrationState: ServiceWorkerRegistrationState;

  /** Template-friendly update snapshot. */
  readonly updateState: ServiceWorkerUpdateState;

  /** Register the configured script or an explicit script URL. */
  register(
    scriptOrOptions?: string | URL | RegistrationOptions,
    options?: RegistrationOptions,
  ): Promise<ServiceWorkerRegistration>;

  /** Resolve when the browser reports an active ready registration. */
  ready(): Promise<ServiceWorkerRegistration>;

  /** Ask the latest known registration to check for an updated worker. */
  update(): Promise<ServiceWorkerRegistration>;

  /** Unregister the latest known registration. */
  unregister(): Promise<boolean>;

  /** Send a message to the current controller or an explicit worker target. */
  post(message: unknown, options?: ServiceWorkerPostOptions): Promise<void>;

  /** Send a request through a dedicated `MessageChannel`. */
  request<TResponse = unknown>(
    message: unknown,
    options?: ServiceWorkerRequestOptions,
  ): Promise<TResponse>;

  /** Subscribe to messages from the service worker container. */
  onMessage<TData = unknown>(
    callback: (event: ServiceWorkerMessageEvent<TData>) => void,
  ): () => void;

  /** Subscribe to controller-change notifications. */
  onControllerChange(
    callback: (controller: ServiceWorker | null) => void,
  ): () => void;

  /** Subscribe to update-state notifications. */
  onUpdate(callback: (state: ServiceWorkerUpdateState) => void): () => void;
}

/** Stable failure codes reported by {@link ServiceWorkerError}. */
export type ServiceWorkerErrorCode =
  | "unsupported"
  | "no-controller"
  | "no-registration"
  | "register-failed"
  | "ready-failed"
  | "update-failed"
  | "unregister-failed"
  | "request-failed"
  | "request-timeout";

/** @internal */
export interface ServiceWorkerRuntimeConfiguration {
  scriptUrl?: string | URL;
  registration: RegistrationOptions;
  autoRegister: boolean;
  checkForUpdatesOnRegister: boolean;
}

/** @internal */
export function createServiceWorkerRuntimeConfiguration(): ServiceWorkerRuntimeConfiguration {
  return {
    registration: {},
    autoRegister: false,
    checkForUpdatesOnRegister: false,
  };
}

/** @internal */
export function applyServiceWorkerConfiguration(
  configuration: ServiceWorkerRuntimeConfiguration,
  scriptUrl: string | URL,
  config: ServiceWorkerConfig,
): void {
  configuration.scriptUrl = scriptUrl;
  configuration.registration = {
    ...(config.scope === undefined ? {} : { scope: config.scope }),
    ...(config.type === undefined ? {} : { type: config.type }),
    ...(config.updateViaCache === undefined
      ? {}
      : { updateViaCache: config.updateViaCache }),
  };
  configuration.autoRegister = config.autoRegister ?? false;
  configuration.checkForUpdatesOnRegister =
    config.checkForUpdatesOnRegister ?? false;
}

interface ServiceWorkerFactoryOptions {
  log: ng.LogService;
  err: ng.ExceptionHandlerService;
  configuration?: ServiceWorkerRuntimeConfiguration;
  security?: SecurityPolicy;
  createMessageChannel?: () => MessageChannel;
}

type ServiceWorkerStatus = ServiceWorkerService["status"];

type Mutable<T> = { -readonly [TKey in keyof T]: T[TKey] };

type ServiceWorkerTarget = ServiceWorkerService & ScopeProxyBindable;

interface ServiceWorkerBinding {
  _handler: Scope;
}

type ServiceWorkerContainerEventType = "message" | "controllerchange";

type ServiceWorkerContainerEventListener = (event: Event) => void;

/**
 * Stable error reported by service-worker lifecycle and messaging operations.
 *
 * The error preserves a framework code for control flow and the native browser
 * failure for diagnostics.
 */
export class ServiceWorkerError extends Error {
  /** Framework failure category. */
  public readonly code: ServiceWorkerErrorCode;

  /** Original browser error when an underlying operation failed. */
  public readonly nativeError?: unknown;

  /** Create a stable service-worker operation error. */
  constructor(
    code: ServiceWorkerErrorCode,
    message: string,
    nativeError?: unknown,
  ) {
    super(message);
    this.code = code;
    this.nativeError = nativeError;
    this.name = "ServiceWorkerError";
  }
}

function createUnsupportedError(): ServiceWorkerError {
  return new ServiceWorkerError(
    "unsupported",
    "Service workers are not supported in this environment.",
  );
}

function createNoRegistrationError(): ServiceWorkerError {
  return new ServiceWorkerError(
    "no-registration",
    "No service worker registration is available.",
  );
}

function createNativeOperationError(
  code: ServiceWorkerErrorCode,
  message: string,
  nativeError: unknown,
): ServiceWorkerError {
  return new ServiceWorkerError(code, message, nativeError);
}

function resolveUnsupported<T>(): Promise<T> {
  return Promise.reject(createUnsupportedError());
}

function createNoControllerError(): ServiceWorkerError {
  return new ServiceWorkerError(
    "no-controller",
    "No active service worker controller is available.",
  );
}

const defaultServiceWorkerRequestTimeout = 30_000;

const serviceWorkerServiceDisposers = new WeakMap<
  ServiceWorkerService,
  () => void
>();

/** @internal */
export function destroyServiceWorkerService(
  service: ServiceWorkerService,
): void {
  const dispose = serviceWorkerServiceDisposers.get(service);

  if (!dispose) return;

  serviceWorkerServiceDisposers.delete(service);
  dispose();
}

/**
 * Create the injectable service-worker facade.
 *
 * The optional container parameter is the internal test seam. Passing `null` or
 * `undefined` creates the same stable unsupported service object users get in
 * browsers without `navigator.serviceWorker`.
 *
 * @internal
 */
export function createServiceWorkerService(
  container: ServiceWorkerContainer | undefined | null,
  options: ServiceWorkerFactoryOptions,
): ServiceWorkerService {
  const supported = Boolean(container);
  const configuration =
    options.configuration ?? createServiceWorkerRuntimeConfiguration();
  const createMessageChannel =
    options.createMessageChannel ?? (() => new MessageChannel());
  let status: ServiceWorkerStatus = supported ? "idle" : "unsupported";
  let controller = container?.controller ?? null;
  let registration: ServiceWorkerRegistration | null = null;
  let disposeRegistrationUpdateListener: (() => void) | undefined;
  let disposeWorkerStateListener: (() => void) | undefined;
  let destroyed = false;
  const updateCallbacks: Array<(state: ServiceWorkerUpdateState) => void> = [];
  const controllerCallbacks: Array<(controller: ServiceWorker | null) => void> =
    [];
  const bindings = new Map<number, ServiceWorkerBinding>();
  const containerListenerDisposers = new Set<() => void>();
  const registrationState: Mutable<ServiceWorkerRegistrationState> = {
    registered: false,
  };
  const updateState: Mutable<ServiceWorkerUpdateState> = {
    checking: false,
    waiting: false,
    controllerChanged: false,
  };

  const getServiceWatchKeys = (): string[] => [
    "supported",
    "status",
    "controller",
    "registration",
    "registrationState",
    "updateState",
  ];

  const scheduleServiceBindings = (): void => {
    if (destroyed) return;

    for (const [scopeId, binding] of bindings) {
      if (binding._handler._destroyed) {
        bindings.delete(scopeId);

        continue;
      }

      binding._handler._scheduleWatchKeys(getServiceWatchKeys());
      binding._handler._checkListenersForAllKeys(registrationState as never);
      binding._handler._checkListenersForAllKeys(updateState as never);
    }
  };

  const setStatus = (nextStatus: ServiceWorkerStatus): void => {
    status = nextStatus;
  };

  const updateRegistrationState = (
    nextRegistration: ServiceWorkerRegistration | null,
  ): void => {
    registration = nextRegistration;
    registrationState.registered = Boolean(nextRegistration);

    if (!nextRegistration) {
      delete registrationState.scope;
      delete registrationState.updateViaCache;
      delete registrationState.installing;
      delete registrationState.waiting;
      delete registrationState.active;
      updateState.waiting = false;
      delete updateState.phase;
      delete updateState.worker;
      delete updateState.registration;
      scheduleServiceBindings();
      return;
    }

    delete updateState.errorCode;
    delete updateState.error;

    registrationState.scope = nextRegistration.scope;
    registrationState.updateViaCache = nextRegistration.updateViaCache;

    const installing = nextRegistration.installing?.state;
    const waiting = nextRegistration.waiting?.state;
    const active = nextRegistration.active?.state;

    if (installing) {
      registrationState.installing = installing;
    } else {
      delete registrationState.installing;
    }

    if (waiting) {
      registrationState.waiting = waiting;
    } else {
      delete registrationState.waiting;
    }

    if (active) {
      registrationState.active = active;
    } else {
      delete registrationState.active;
    }

    updateState.waiting = Boolean(nextRegistration.waiting);
    scheduleServiceBindings();
  };

  const notifyUpdateCallbacks = (): void => {
    updateCallbacks.slice().forEach((callback) => {
      try {
        callback(updateState);
      } catch (error) {
        options.err(error);
      }
    });
  };

  const emitUpdateState = (
    worker: ServiceWorker,
    nextRegistration: ServiceWorkerRegistration,
  ): void => {
    updateRegistrationState(nextRegistration);
    updateState.phase = worker.state;
    updateState.worker = worker;
    updateState.registration = nextRegistration;
    updateState.waiting = Boolean(nextRegistration.waiting);
    scheduleServiceBindings();
    notifyUpdateCallbacks();
  };

  const watchUpdateWorker = (
    worker: ServiceWorker,
    nextRegistration: ServiceWorkerRegistration,
  ): void => {
    disposeWorkerStateListener?.();
    disposeWorkerStateListener = undefined;

    if (destroyed) return;

    const onStateChange = () => {
      emitUpdateState(worker, nextRegistration);
    };

    worker.addEventListener("statechange", onStateChange);
    disposeWorkerStateListener = () => {
      worker.removeEventListener("statechange", onStateChange);
    };

    emitUpdateState(worker, nextRegistration);
  };

  const trackRegistrationUpdates = (
    nextRegistration: ServiceWorkerRegistration | null,
  ): void => {
    disposeRegistrationUpdateListener?.();
    disposeRegistrationUpdateListener = undefined;

    if (destroyed || !nextRegistration) {
      disposeWorkerStateListener?.();
      disposeWorkerStateListener = undefined;
      return;
    }

    const onUpdateFound = () => {
      const worker =
        nextRegistration.installing ??
        nextRegistration.waiting ??
        nextRegistration.active;

      if (worker) {
        watchUpdateWorker(worker, nextRegistration);
      }
    };

    nextRegistration.addEventListener("updatefound", onUpdateFound);
    disposeRegistrationUpdateListener = () => {
      nextRegistration.removeEventListener("updatefound", onUpdateFound);
    };
  };

  const listen = (
    type: ServiceWorkerContainerEventType,
    listener: ServiceWorkerContainerEventListener,
  ): (() => void) => {
    if (
      destroyed ||
      !container ||
      typeof container.addEventListener !== "function" ||
      typeof container.removeEventListener !== "function"
    ) {
      return () => undefined;
    }

    container.addEventListener(type, listener);

    let disposed = false;
    const dispose = () => {
      if (disposed) return;

      disposed = true;
      container.removeEventListener(type, listener);
      containerListenerDisposers.delete(dispose);
    };

    containerListenerDisposers.add(dispose);

    return dispose;
  };

  const disposeControllerChangeListener = listen("controllerchange", () => {
    controller = container?.controller ?? null;
    updateState.controllerChanged = true;
    scheduleServiceBindings();

    controllerCallbacks.slice().forEach((callback) => {
      try {
        callback(controller);
      } catch (error) {
        options.err(error);
      }
    });
  });

  const getMessageTarget = (
    target: ServiceWorkerMessageTarget = "controller",
  ): ServiceWorker | null => {
    switch (target) {
      case "active":
        return registration?.active ?? null;
      case "installing":
        return registration?.installing ?? null;
      case "waiting":
        return registration?.waiting ?? null;
      case "controller":
        return controller;
    }
  };

  const service: ServiceWorkerTarget = {
    supported,
    get status() {
      return status;
    },
    get controller() {
      return controller;
    },
    get registration() {
      return registration;
    },
    registrationState,
    updateState,

    async register(
      scriptOrOptions?: string | URL | RegistrationOptions,
      explicitOptions: RegistrationOptions = {},
    ) {
      if (!container) {
        return resolveUnsupported<ServiceWorkerRegistration>();
      }

      const hasExplicitScript =
        typeof scriptOrOptions === "string" || scriptOrOptions instanceof URL;
      const resolvedScriptUrl = hasExplicitScript
        ? scriptOrOptions
        : configuration.scriptUrl;
      const registerOptions = hasExplicitScript
        ? explicitOptions
        : (scriptOrOptions ?? {});

      if (resolvedScriptUrl === undefined) {
        throw new ServiceWorkerError(
          "register-failed",
          "Service worker registration requires a configured script URL.",
        );
      }

      setStatus("registering");
      scheduleServiceBindings();

      try {
        if (options.security) {
          const decision = options.security.check({
            operation: "request",
            transport: "service-worker",
            method: "GET",
            url: String(resolvedScriptUrl),
            credentials: "same-origin",
            hasBody: false,
          });

          if (decision.type !== "allow") {
            throw new ServiceWorkerError(
              "register-failed",
              decision.reason ??
                "Service worker registration denied by security policy.",
            );
          }
        }

        const nextRegistration = await container.register(resolvedScriptUrl, {
          ...configuration.registration,
          ...registerOptions,
        });

        updateRegistrationState(nextRegistration);
        trackRegistrationUpdates(nextRegistration);
        setStatus("registered");
        scheduleServiceBindings();

        if (configuration.checkForUpdatesOnRegister) {
          await service.update();
        }

        return nextRegistration;
      } catch (error) {
        setStatus("error");
        scheduleServiceBindings();

        if (error instanceof ServiceWorkerError) throw error;

        throw createNativeOperationError(
          "register-failed",
          "Service worker registration failed.",
          error,
        );
      }
    },

    async ready() {
      if (!container) {
        return resolveUnsupported<ServiceWorkerRegistration>();
      }

      try {
        const readyRegistration = await container.ready;

        updateRegistrationState(readyRegistration);
        trackRegistrationUpdates(readyRegistration);
        setStatus("ready");
        scheduleServiceBindings();

        return readyRegistration;
      } catch (error) {
        setStatus("error");
        scheduleServiceBindings();
        throw createNativeOperationError(
          "ready-failed",
          "Service worker ready promise failed.",
          error,
        );
      }
    },

    async update() {
      if (!container) {
        return resolveUnsupported<ServiceWorkerRegistration>();
      }

      if (!registration) {
        updateState.errorCode = "no-registration";
        setStatus("error");
        scheduleServiceBindings();
        throw createNoRegistrationError();
      }

      updateState.checking = true;
      delete updateState.errorCode;
      delete updateState.error;
      setStatus("updating");
      scheduleServiceBindings();

      try {
        const nextRegistration = await registration.update();

        updateState.lastCheckedAt = Date.now();
        updateRegistrationState(nextRegistration);
        trackRegistrationUpdates(nextRegistration);
        setStatus("registered");
        scheduleServiceBindings();

        return nextRegistration;
      } catch (error) {
        updateState.errorCode = "update-failed";
        updateState.error = error;
        setStatus("error");
        scheduleServiceBindings();
        throw createNativeOperationError(
          "update-failed",
          "Service worker update check failed.",
          error,
        );
      } finally {
        updateState.checking = false;
        scheduleServiceBindings();
      }
    },

    async unregister() {
      if (!container) {
        return resolveUnsupported<boolean>();
      }

      if (!registration) {
        setStatus("error");
        scheduleServiceBindings();
        throw createNoRegistrationError();
      }

      try {
        const didUnregister = await registration.unregister();

        if (didUnregister) {
          updateRegistrationState(null);
          trackRegistrationUpdates(null);
          setStatus("unregistered");
          scheduleServiceBindings();
        }

        return didUnregister;
      } catch (error) {
        setStatus("error");
        scheduleServiceBindings();
        throw createNativeOperationError(
          "unregister-failed",
          "Service worker unregister failed.",
          error,
        );
      }
    },

    async post(message: unknown, postOptions: ServiceWorkerPostOptions = {}) {
      if (!container) {
        return resolveUnsupported<never>();
      }

      const worker = getMessageTarget(postOptions.target);

      if (!worker) {
        throw createNoControllerError();
      }

      worker.postMessage(message, [...(postOptions.transfer ?? [])]);
    },

    async request<TResponse = unknown>(
      message: unknown,
      requestOptions: ServiceWorkerRequestOptions = {},
    ): Promise<TResponse> {
      const channel = createMessageChannel();
      const timeout =
        requestOptions.timeout ?? defaultServiceWorkerRequestTimeout;

      return new Promise<TResponse>((resolve, reject) => {
        let settled = false;
        const finish = (callback: () => void): void => {
          if (settled) return;

          settled = true;
          globalThis.clearTimeout(timer);
          channel.port1.close();
          callback();
        };
        const timer = globalThis.setTimeout(() => {
          finish(() => {
            reject(
              new ServiceWorkerError(
                "request-timeout",
                "Service worker request timed out.",
              ),
            );
          });
        }, timeout);

        channel.port1.onmessage = (event: MessageEvent<TResponse>) => {
          finish(() => {
            resolve(event.data);
          });
        };
        channel.port1.onmessageerror = (event: MessageEvent) => {
          finish(() => {
            reject(
              new ServiceWorkerError(
                "request-failed",
                "Service worker response could not be deserialized.",
                event,
              ),
            );
          });
        };
        channel.port1.start();

        void service
          .post(message, {
            transfer: [...(requestOptions.transfer ?? []), channel.port2],
            target: requestOptions.target,
          })
          .catch((error: unknown) => {
            finish(() => {
              reject(
                createNativeOperationError(
                  "request-failed",
                  "Service worker request could not be posted.",
                  error,
                ),
              );
            });
          });
      });
    },

    onMessage<TData = unknown>(
      callback: (event: ServiceWorkerMessageEvent<TData>) => void,
    ) {
      return listen("message", (event) => {
        const messageEvent = event as MessageEvent<TData>;

        try {
          callback({
            data: messageEvent.data,
            event: messageEvent,
            source: messageEvent.source,
          });
        } catch (error) {
          options.err(error);
        }
      });
    },

    onControllerChange(callback: (controller: ServiceWorker | null) => void) {
      if (destroyed || !container) {
        return () => undefined;
      }

      controllerCallbacks.push(callback);

      return () => {
        const index = controllerCallbacks.indexOf(callback);

        if (index !== -1) {
          controllerCallbacks.splice(index, 1);
        }
      };
    },

    onUpdate(callback: (state: ServiceWorkerUpdateState) => void) {
      if (destroyed) {
        return () => undefined;
      }

      updateCallbacks.push(callback);

      return () => {
        const index = updateCallbacks.indexOf(callback);

        if (index !== -1) {
          updateCallbacks.splice(index, 1);
        }
      };
    },
  };

  Object.defineProperty(service, SCOPE_PROXY_BIND, {
    value(handler: Scope) {
      if (destroyed) return;

      let binding = bindings.get(handler.$id);

      if (!binding) {
        binding = {
          _handler: handler,
        };
        bindings.set(handler.$id, binding);
      }
    },
  });

  serviceWorkerServiceDisposers.set(service, () => {
    destroyed = true;
    disposeWorkerStateListener?.();
    disposeWorkerStateListener = undefined;
    disposeRegistrationUpdateListener?.();
    disposeRegistrationUpdateListener = undefined;

    for (const dispose of Array.from(containerListenerDisposers)) dispose();

    controllerCallbacks.length = 0;
    updateCallbacks.length = 0;
    bindings.clear();
  });

  if (!supported) {
    options.log.warn("Service workers are not supported in this environment.");
    disposeControllerChangeListener();
  }

  if (supported && configuration.autoRegister && configuration.scriptUrl) {
    void service.register().catch((error: unknown) => options.err(error));
  }

  return service;
}
