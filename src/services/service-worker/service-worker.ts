import {
  SCOPE_PROXY_BIND,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";

/**
 * Stable service-worker support state exposed by `$serviceWorker`.
 */
export interface ServiceWorkerSupport {
  /** True when the current browser exposes `navigator.serviceWorker`. */
  supported: boolean;

  /** Stable reason for unsupported environments. */
  reason?: "missing-navigator" | "missing-service-worker";
}

/**
 * Declarative defaults used when registering an application service worker.
 *
 * This config intentionally maps only browser registration options and safe
 * observation policy. Activation, reload, cache strategy, push, and background
 * sync remain explicit application or adapter policy.
 */
export interface ServiceWorkerConfig {
  /** Default registration scope passed to `register(...)`. */
  scope?: string;

  /** Worker script type passed to `register(...)`. */
  type?: WorkerType;

  /** Browser update-cache policy passed to `register(...)`. */
  updateViaCache?: ServiceWorkerUpdateViaCache;

  /** Register automatically when the runtime service is created. */
  autoRegister?: boolean;

  /** Default script URL used by `autoRegister`. */
  scriptUrl?: string | URL;

  /** Check for an updated worker after registration succeeds. */
  checkForUpdatesOnRegister?: boolean;
}

/**
 * Template-friendly snapshot of the current registration.
 */
export interface ServiceWorkerRegistrationState {
  /** True when a registration is currently known by the service. */
  registered: boolean;

  /** Registration scope, when available. */
  scope?: string;

  /** Update cache policy reported by the browser registration. */
  updateViaCache?: ServiceWorkerUpdateViaCache;

  /** State of the installing worker, when present. */
  installing?: ServiceWorkerState;

  /** State of the waiting worker, when present. */
  waiting?: ServiceWorkerState;

  /** State of the active worker, when present. */
  active?: ServiceWorkerState;
}

/**
 * Template-friendly snapshot of update-related service-worker state.
 */
export interface ServiceWorkerUpdateState {
  /** True while an explicit update check is in flight. */
  checking: boolean;

  /** True when a waiting worker has been discovered. */
  waiting: boolean;

  /** True when the active worker changed during the current page lifetime. */
  controllerChanged: boolean;

  /** Last successful update-check time in epoch milliseconds. */
  lastCheckedAt?: number;

  /** Latest observed service worker lifecycle phase. */
  phase?: ServiceWorkerState;

  /** Worker associated with the latest update event. */
  worker?: ServiceWorker;

  /** Registration associated with the latest update event. */
  registration?: ServiceWorkerRegistration;

  /** Stable failure code from the last update-related operation. */
  errorCode?: "unsupported" | "no-registration" | "update-failed";

  /** Native error preserved for diagnostics. */
  error?: unknown;
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

/**
 * Request envelope sent by {@link ServiceWorkerMessageClient}.
 */
export interface ServiceWorkerMessageRequest<TPayload = unknown> {
  /** Stable protocol discriminator for request messages. */
  type: string;

  /** Correlation id used to match a later response. */
  id: string;

  /** Application payload delivered to the service worker. */
  payload: TPayload;
}

/**
 * Response envelope consumed by {@link ServiceWorkerMessageClient}.
 */
export interface ServiceWorkerMessageResponse<TData = unknown> {
  /** Stable protocol discriminator for response messages. */
  type: string;

  /** Correlation id copied from the request. */
  id: string;

  /** True for successful responses; false rejects the pending request. */
  ok?: boolean;

  /** Successful response payload. */
  data?: TData;

  /** Error payload preserved when `ok` is false. */
  error?: unknown;
}

/**
 * Configuration for {@link ServiceWorkerMessageClient}.
 */
export interface ServiceWorkerMessageClientOptions {
  /** Request envelope type. */
  requestType?: string;

  /** Response envelope type. */
  responseType?: string;

  /** Timeout in milliseconds for each request. */
  timeout?: number;

  /** Creates request ids. Defaults to a monotonically increasing id. */
  createId?: () => string;

  /** Default worker target used by `request(...)`. */
  target?: ServiceWorkerMessageTarget;
}

/**
 * Per-request overrides for {@link ServiceWorkerMessageClient.request}.
 */
export interface ServiceWorkerMessageClientRequestOptions {
  /** Transferable objects sent with `postMessage(...)`. */
  transfer?: Transferable[];

  /** Request timeout in milliseconds. */
  timeout?: number;

  /** Worker target for this request. */
  target?: ServiceWorkerMessageTarget;
}

export type ServiceWorkerMessageClientErrorCode =
  | "disposed"
  | "post-failed"
  | "response-error"
  | "timeout";

/**
 * Injectable service-worker lifecycle and messaging facade.
 */
export interface ServiceWorkerService {
  /** Stable support state for the current browser. */
  readonly support: ServiceWorkerSupport;

  /** Convenience support flag for templates and guards. */
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

  /** Register an application-owned service worker script. */
  register(
    scriptUrl: string | URL,
    options?: ServiceWorkerConfig,
  ): Promise<ServiceWorkerRegistration>;

  /** Resolve when the browser reports an active ready registration. */
  ready(): Promise<ServiceWorkerRegistration>;

  /** Ask the latest known registration to check for an updated worker. */
  update(): Promise<ServiceWorkerRegistration>;

  /** Unregister the latest known registration. */
  unregister(): Promise<boolean>;

  /** Send a message to the current controller or an explicit worker target. */
  post(
    message: unknown,
    transfer?: Transferable[],
    target?: ServiceWorkerMessageTarget,
  ): Promise<void>;

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

type ServiceWorkerFailureCode =
  | "unsupported"
  | "no-controller"
  | "no-registration"
  | "register-failed"
  | "ready-failed"
  | "update-failed"
  | "unregister-failed";

interface ServiceWorkerFactoryOptions {
  log: ng.LogService;
  err: ng.ExceptionHandlerService;
}

type ServiceWorkerStatus = ServiceWorkerService["status"];

type ServiceWorkerTarget = ServiceWorkerService & ScopeProxyBindable;

interface ServiceWorkerBinding {
  _handler: Scope;
}

interface PendingServiceWorkerMessageRequest {
  _reject: (reason: unknown) => void;
  _resolve: (value: unknown) => void;
  _timer: ReturnType<typeof setTimeout>;
}

type ServiceWorkerContainerEventType = "message" | "controllerchange";

type ServiceWorkerContainerEventListener = (event: Event) => void;

/**
 * Stable rejected error used by the service-worker skeleton.
 *
 * This class is exported for tests and internal adapters. It is intentionally
 * not exported through the public docs surface until the failure contract is
 * finalized by the runtime slices.
 */
export class ServiceWorkerError extends Error {
  constructor(
    public readonly code: ServiceWorkerFailureCode,
    message: string,
    public readonly nativeError?: unknown,
  ) {
    super(message);
    this.name = "ServiceWorkerError";
  }
}

/**
 * Stable error used by {@link ServiceWorkerMessageClient}.
 */
export class ServiceWorkerMessageClientError extends Error {
  constructor(
    public readonly code: ServiceWorkerMessageClientErrorCode,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "ServiceWorkerMessageClientError";
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
  code: ServiceWorkerFailureCode,
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

function createSupport(
  container: ServiceWorkerContainer | undefined | null,
): ServiceWorkerSupport {
  if (container) {
    return { supported: true };
  }

  if (typeof navigator === "undefined") {
    return { supported: false, reason: "missing-navigator" };
  }

  return { supported: false, reason: "missing-service-worker" };
}

const defaultMessageClientRequestType = "angular-ts:service-worker:request";
const defaultMessageClientResponseType = "angular-ts:service-worker:response";
const defaultMessageClientTimeout = 30_000;

/**
 * Request/response adapter over `$serviceWorker` messages.
 *
 * The adapter only correlates messages. It does not queue requests, retry
 * failed posts, activate waiting workers, or define a service-worker-side
 * implementation.
 */
export class ServiceWorkerMessageClient {
  private _disposed = false;
  private _nextId = 0;
  private readonly _pending = new Map<
    string,
    PendingServiceWorkerMessageRequest
  >();
  private readonly _requestType: string;
  private readonly _responseType: string;
  private readonly _timeout: number;
  private readonly _target?: ServiceWorkerMessageTarget;
  private readonly _createId: () => string;
  private readonly _disposeMessages: () => void;

  /**
   * @param service - Service-worker facade used for messaging.
   * @param options - Protocol, timeout, id, and default target options.
   */
  constructor(
    private readonly service: ServiceWorkerService,
    options: ServiceWorkerMessageClientOptions = {},
  ) {
    this._requestType = options.requestType ?? defaultMessageClientRequestType;
    this._responseType =
      options.responseType ?? defaultMessageClientResponseType;
    this._timeout = options.timeout ?? defaultMessageClientTimeout;
    this._target = options.target;
    this._createId =
      options.createId ??
      (() => {
        this._nextId++;

        return `sw:${String(this._nextId)}`;
      });
    this._disposeMessages = service.onMessage((event) => {
      this._handleMessage(event.data);
    });
  }

  /** Number of unresolved requests currently waiting for a response. */
  get pending(): number {
    return this._pending.size;
  }

  /** True after {@link dispose} has been called. */
  get disposed(): boolean {
    return this._disposed;
  }

  /**
   * Send a correlated request and resolve with the matching response payload.
   *
   * @param payload - Application request payload.
   * @param options - Per-request target, transfer, and timeout overrides.
   */
  request<TResponse = unknown>(
    payload: unknown,
    options: ServiceWorkerMessageClientRequestOptions = {},
  ): Promise<TResponse> {
    if (this._disposed) {
      return Promise.reject(
        new ServiceWorkerMessageClientError(
          "disposed",
          "Service worker message client is disposed.",
        ),
      );
    }

    const id = this._createId();
    const timeout = options.timeout ?? this._timeout;
    const message: ServiceWorkerMessageRequest = {
      type: this._requestType,
      id,
      payload,
    };

    return new Promise<TResponse>((resolve, reject) => {
      const timer = globalThis.setTimeout(() => {
        this._pending.delete(id);
        reject(
          new ServiceWorkerMessageClientError(
            "timeout",
            `Service worker message request '${id}' timed out.`,
            { id, message },
          ),
        );
      }, timeout);

      this._pending.set(id, {
        _resolve: resolve as (value: unknown) => void,
        _reject: reject,
        _timer: timer,
      });

      this.service
        .post(message, options.transfer, options.target ?? this._target)
        .catch((error: unknown) => {
          this._rejectPending(
            id,
            new ServiceWorkerMessageClientError(
              "post-failed",
              `Service worker message request '${id}' could not be posted.`,
              error,
            ),
          );
        });
    });
  }

  /**
   * Stop listening for responses and reject all pending requests.
   */
  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._disposeMessages();

    for (const [id, pending] of this._pending) {
      globalThis.clearTimeout(pending._timer);
      pending._reject(
        new ServiceWorkerMessageClientError(
          "disposed",
          `Service worker message request '${id}' was disposed.`,
          { id },
        ),
      );
    }

    this._pending.clear();
  }

  private _handleMessage(message: unknown): void {
    if (!message || typeof message !== "object") {
      return;
    }

    const response = message as Partial<ServiceWorkerMessageResponse>;

    if (
      response.type !== this._responseType ||
      typeof response.id !== "string"
    ) {
      return;
    }

    const pending = this._pending.get(response.id);

    if (!pending) {
      return;
    }

    this._pending.delete(response.id);
    globalThis.clearTimeout(pending._timer);

    if (response.ok === false) {
      pending._reject(
        new ServiceWorkerMessageClientError(
          "response-error",
          `Service worker message request '${response.id}' failed.`,
          response.error,
        ),
      );

      return;
    }

    pending._resolve(response.data);
  }

  private _rejectPending(id: string, error: ServiceWorkerMessageClientError) {
    const pending = this._pending.get(id);

    if (!pending) {
      return;
    }

    this._pending.delete(id);
    globalThis.clearTimeout(pending._timer);
    pending._reject(error);
  }
}

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
 */
export function createServiceWorkerService(
  container: ServiceWorkerContainer | undefined | null,
  options: ServiceWorkerFactoryOptions,
): ServiceWorkerService {
  const support = createSupport(container);
  let status: ServiceWorkerStatus = support.supported ? "idle" : "unsupported";
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
  const registrationState: ServiceWorkerRegistrationState = {
    registered: false,
  };
  const updateState: ServiceWorkerUpdateState = {
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

  const registerOptions = (
    config: ServiceWorkerConfig | undefined,
  ): RegistrationOptions | undefined => {
    if (!config) {
      return undefined;
    }

    const normalized: RegistrationOptions = {};

    if (config.scope !== undefined) {
      normalized.scope = config.scope;
    }

    if (config.type !== undefined) {
      normalized.type = config.type;
    }

    if (config.updateViaCache !== undefined) {
      normalized.updateViaCache = config.updateViaCache;
    }

    return normalized;
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
    support,
    supported: support.supported,
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

    async register(scriptUrl: string | URL, config?: ServiceWorkerConfig) {
      if (!container) {
        return resolveUnsupported<ServiceWorkerRegistration>();
      }

      setStatus("registering");
      scheduleServiceBindings();

      try {
        const nextRegistration = await container.register(
          scriptUrl,
          registerOptions(config),
        );

        updateRegistrationState(nextRegistration);
        trackRegistrationUpdates(nextRegistration);
        setStatus("registered");
        scheduleServiceBindings();

        if (config?.checkForUpdatesOnRegister) {
          await service.update();
        }

        return nextRegistration;
      } catch (error) {
        setStatus("error");
        scheduleServiceBindings();
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

    async post(
      message: unknown,
      transfer?: Transferable[],
      target?: ServiceWorkerMessageTarget,
    ) {
      if (!container) {
        return resolveUnsupported<never>();
      }

      const worker = getMessageTarget(target);

      if (!worker) {
        throw createNoControllerError();
      }

      worker.postMessage(message, transfer ?? []);
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

  if (!support.supported) {
    options.log.warn("Service workers are not supported in this environment.");
    disposeControllerChangeListener();
  }

  return service;
}

/**
 * Create a module-named service worker wrapper with default registration
 * script/config while preserving the singleton browser container state.
 *
 * The wrapper delegates state and events to `$serviceWorker`. It exists so
 * modules can expose an injectable named service worker without creating a
 * second service-worker container abstraction.
 */
export function createConfiguredServiceWorkerService(
  service: ServiceWorkerService,
  scriptUrl: string | URL,
  config: ServiceWorkerConfig = {},
  handleAutoRegisterError?: ng.ExceptionHandlerService,
): ServiceWorkerService {
  const bindService = (service as ScopeProxyBindable)[SCOPE_PROXY_BIND];
  const wrapper: ServiceWorkerTarget = {
    get support() {
      return service.support;
    },
    get supported() {
      return service.supported;
    },
    get status() {
      return service.status;
    },
    get controller() {
      return service.controller;
    },
    get registration() {
      return service.registration;
    },
    get registrationState() {
      return service.registrationState;
    },
    get updateState() {
      return service.updateState;
    },
    register(nextScriptUrl: string | URL = scriptUrl, options = config) {
      return service.register(nextScriptUrl, {
        ...config,
        ...options,
      });
    },
    ready() {
      return service.ready();
    },
    update() {
      return service.update();
    },
    unregister() {
      return service.unregister();
    },
    post(message, transfer, target) {
      return service.post(message, transfer, target);
    },
    onMessage(callback) {
      return service.onMessage(callback);
    },
    onControllerChange(callback) {
      return service.onControllerChange(callback);
    },
    onUpdate(callback) {
      return service.onUpdate(callback);
    },
  };

  if (bindService) {
    Object.defineProperty(wrapper, SCOPE_PROXY_BIND, {
      value(handler: Scope, proxy: ng.Scope) {
        bindService.call(service, handler, proxy);
      },
    });
  }

  if (config.autoRegister) {
    void wrapper
      .register(config.scriptUrl ?? scriptUrl, config)
      .catch((error: unknown) => {
        handleAutoRegisterError?.(error);
      });
  }

  return wrapper;
}
