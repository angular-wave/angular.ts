import { SCOPE_PROXY_BIND } from '../../core/scope/scope.js';

/** @internal */
function createServiceWorkerRuntimeConfiguration() {
    return {
        registration: {},
        autoRegister: false,
        checkForUpdatesOnRegister: false,
    };
}
/** @internal */
function applyServiceWorkerConfiguration(configuration, scriptUrl, config) {
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
/**
 * Stable error reported by service-worker lifecycle and messaging operations.
 *
 * The error preserves a framework code for control flow and the native browser
 * failure for diagnostics.
 */
class ServiceWorkerError extends Error {
    /** Create a stable service-worker operation error. */
    constructor(code, message, nativeError) {
        super(message);
        this.code = code;
        this.nativeError = nativeError;
        this.name = "ServiceWorkerError";
    }
}
function createUnsupportedError() {
    return new ServiceWorkerError("unsupported", "Service workers are not supported in this environment.");
}
function createNoRegistrationError() {
    return new ServiceWorkerError("no-registration", "No service worker registration is available.");
}
function createNativeOperationError(code, message, nativeError) {
    return new ServiceWorkerError(code, message, nativeError);
}
function resolveUnsupported() {
    return Promise.reject(createUnsupportedError());
}
function createNoControllerError() {
    return new ServiceWorkerError("no-controller", "No active service worker controller is available.");
}
const defaultServiceWorkerRequestTimeout = 30000;
const serviceWorkerServiceDisposers = new WeakMap();
/** @internal */
function destroyServiceWorkerService(service) {
    const dispose = serviceWorkerServiceDisposers.get(service);
    if (!dispose)
        return;
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
function createServiceWorkerService(container, options) {
    const supported = Boolean(container);
    const configuration = options.configuration ?? createServiceWorkerRuntimeConfiguration();
    const createMessageChannel = options.createMessageChannel ?? (() => new MessageChannel());
    let status = supported ? "idle" : "unsupported";
    let controller = container?.controller ?? null;
    let registration = null;
    let disposeRegistrationUpdateListener;
    let disposeWorkerStateListener;
    let destroyed = false;
    const updateCallbacks = [];
    const controllerCallbacks = [];
    const bindings = new Map();
    const containerListenerDisposers = new Set();
    const registrationState = {
        registered: false,
    };
    const updateState = {
        checking: false,
        waiting: false,
        controllerChanged: false,
    };
    const getServiceWatchKeys = () => [
        "supported",
        "status",
        "controller",
        "registration",
        "registrationState",
        "updateState",
    ];
    const scheduleServiceBindings = () => {
        if (destroyed)
            return;
        for (const [scopeId, binding] of bindings) {
            if (binding._handler._destroyed) {
                bindings.delete(scopeId);
                continue;
            }
            binding._handler._scheduleWatchKeys(getServiceWatchKeys());
            binding._handler._checkListenersForAllKeys(registrationState);
            binding._handler._checkListenersForAllKeys(updateState);
        }
    };
    const setStatus = (nextStatus) => {
        status = nextStatus;
    };
    const updateRegistrationState = (nextRegistration) => {
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
        }
        else {
            delete registrationState.installing;
        }
        if (waiting) {
            registrationState.waiting = waiting;
        }
        else {
            delete registrationState.waiting;
        }
        if (active) {
            registrationState.active = active;
        }
        else {
            delete registrationState.active;
        }
        updateState.waiting = Boolean(nextRegistration.waiting);
        scheduleServiceBindings();
    };
    const notifyUpdateCallbacks = () => {
        updateCallbacks.slice().forEach((callback) => {
            try {
                callback(updateState);
            }
            catch (error) {
                options.err(error);
            }
        });
    };
    const emitUpdateState = (worker, nextRegistration) => {
        updateRegistrationState(nextRegistration);
        updateState.phase = worker.state;
        updateState.worker = worker;
        updateState.registration = nextRegistration;
        updateState.waiting = Boolean(nextRegistration.waiting);
        scheduleServiceBindings();
        notifyUpdateCallbacks();
    };
    const watchUpdateWorker = (worker, nextRegistration) => {
        disposeWorkerStateListener?.();
        disposeWorkerStateListener = undefined;
        if (destroyed)
            return;
        const onStateChange = () => {
            emitUpdateState(worker, nextRegistration);
        };
        worker.addEventListener("statechange", onStateChange);
        disposeWorkerStateListener = () => {
            worker.removeEventListener("statechange", onStateChange);
        };
        emitUpdateState(worker, nextRegistration);
    };
    const trackRegistrationUpdates = (nextRegistration) => {
        disposeRegistrationUpdateListener?.();
        disposeRegistrationUpdateListener = undefined;
        if (destroyed || !nextRegistration) {
            disposeWorkerStateListener?.();
            disposeWorkerStateListener = undefined;
            return;
        }
        const onUpdateFound = () => {
            const worker = nextRegistration.installing ??
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
    const listen = (type, listener) => {
        if (destroyed ||
            !container ||
            typeof container.addEventListener !== "function" ||
            typeof container.removeEventListener !== "function") {
            return () => undefined;
        }
        container.addEventListener(type, listener);
        let disposed = false;
        const dispose = () => {
            if (disposed)
                return;
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
            }
            catch (error) {
                options.err(error);
            }
        });
    });
    const getMessageTarget = (target = "controller") => {
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
    const service = {
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
        async register(scriptOrOptions, explicitOptions = {}) {
            if (!container) {
                return resolveUnsupported();
            }
            const hasExplicitScript = typeof scriptOrOptions === "string" || scriptOrOptions instanceof URL;
            const resolvedScriptUrl = hasExplicitScript
                ? scriptOrOptions
                : configuration.scriptUrl;
            const registerOptions = hasExplicitScript
                ? explicitOptions
                : (scriptOrOptions ?? {});
            if (resolvedScriptUrl === undefined) {
                throw new ServiceWorkerError("register-failed", "Service worker registration requires a configured script URL.");
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
                        throw new ServiceWorkerError("register-failed", decision.reason ??
                            "Service worker registration denied by security policy.");
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
            }
            catch (error) {
                setStatus("error");
                scheduleServiceBindings();
                if (error instanceof ServiceWorkerError)
                    throw error;
                throw createNativeOperationError("register-failed", "Service worker registration failed.", error);
            }
        },
        async ready() {
            if (!container) {
                return resolveUnsupported();
            }
            try {
                const readyRegistration = await container.ready;
                updateRegistrationState(readyRegistration);
                trackRegistrationUpdates(readyRegistration);
                setStatus("ready");
                scheduleServiceBindings();
                return readyRegistration;
            }
            catch (error) {
                setStatus("error");
                scheduleServiceBindings();
                throw createNativeOperationError("ready-failed", "Service worker ready promise failed.", error);
            }
        },
        async update() {
            if (!container) {
                return resolveUnsupported();
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
            }
            catch (error) {
                updateState.errorCode = "update-failed";
                updateState.error = error;
                setStatus("error");
                scheduleServiceBindings();
                throw createNativeOperationError("update-failed", "Service worker update check failed.", error);
            }
            finally {
                updateState.checking = false;
                scheduleServiceBindings();
            }
        },
        async unregister() {
            if (!container) {
                return resolveUnsupported();
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
            }
            catch (error) {
                setStatus("error");
                scheduleServiceBindings();
                throw createNativeOperationError("unregister-failed", "Service worker unregister failed.", error);
            }
        },
        async post(message, postOptions = {}) {
            if (!container) {
                return resolveUnsupported();
            }
            const worker = getMessageTarget(postOptions.target);
            if (!worker) {
                throw createNoControllerError();
            }
            worker.postMessage(message, [...(postOptions.transfer ?? [])]);
        },
        async request(message, requestOptions = {}) {
            const channel = createMessageChannel();
            const timeout = requestOptions.timeout ?? defaultServiceWorkerRequestTimeout;
            return new Promise((resolve, reject) => {
                let settled = false;
                const finish = (callback) => {
                    if (settled)
                        return;
                    settled = true;
                    globalThis.clearTimeout(timer);
                    channel.port1.close();
                    callback();
                };
                const timer = globalThis.setTimeout(() => {
                    finish(() => {
                        reject(new ServiceWorkerError("request-timeout", "Service worker request timed out."));
                    });
                }, timeout);
                channel.port1.onmessage = (event) => {
                    finish(() => {
                        resolve(event.data);
                    });
                };
                channel.port1.onmessageerror = (event) => {
                    finish(() => {
                        reject(new ServiceWorkerError("request-failed", "Service worker response could not be deserialized.", event));
                    });
                };
                channel.port1.start();
                void service
                    .post(message, {
                    transfer: [...(requestOptions.transfer ?? []), channel.port2],
                    target: requestOptions.target,
                })
                    .catch((error) => {
                    finish(() => {
                        reject(createNativeOperationError("request-failed", "Service worker request could not be posted.", error));
                    });
                });
            });
        },
        onMessage(callback) {
            return listen("message", (event) => {
                const messageEvent = event;
                try {
                    callback({
                        data: messageEvent.data,
                        event: messageEvent,
                        source: messageEvent.source,
                    });
                }
                catch (error) {
                    options.err(error);
                }
            });
        },
        onControllerChange(callback) {
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
        onUpdate(callback) {
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
        value(handler) {
            if (destroyed)
                return;
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
        for (const dispose of Array.from(containerListenerDisposers))
            dispose();
        controllerCallbacks.length = 0;
        updateCallbacks.length = 0;
        bindings.clear();
    });
    if (!supported) {
        options.log.warn("Service workers are not supported in this environment.");
        disposeControllerChangeListener();
    }
    if (supported && configuration.autoRegister && configuration.scriptUrl) {
        void service.register().catch((error) => options.err(error));
    }
    return service;
}

export { ServiceWorkerError, applyServiceWorkerConfiguration, createServiceWorkerRuntimeConfiguration, createServiceWorkerService, destroyServiceWorkerService };
