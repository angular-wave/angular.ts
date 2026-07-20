import { SCOPE_PROXY_BIND } from '../../core/scope/scope.js';
import { isObject, isArray, isString } from '../../shared/utils.js';

/** Typed failure reported by a managed worker. */
class WorkerError extends Error {
    constructor(code, message, options = {}) {
        super(message, { cause: options.cause });
        this.code = code;
        this.name = "WorkerError";
        this.event = options.event;
    }
}
/** @internal */
function createWorkerRuntimeState() {
    return {
        connections: new Set(),
        destroyed: false,
    };
}
/** @internal */
function destroyWorkerRuntimeState(state) {
    if (state.destroyed)
        return;
    state.destroyed = true;
    for (const connection of state.connections)
        connection.terminate();
    state.connections.clear();
}
function createManagedWorkerHandle(scriptPath, config, logger, getWorkerConstructor, onTerminate) {
    if (!scriptPath)
        throw new Error("Worker script path required");
    const restartEnabled = config?.restart ?? false;
    const restartDelay = typeof config?.restartDelay === "number" && config.restartDelay >= 0
        ? config.restartDelay
        : 1000;
    const maxRestarts = typeof config?.maxRestarts === "number" && config.maxRestarts >= 0
        ? Math.floor(config.maxRestarts)
        : 3;
    const decode = config?.decode ?? ((data) => data);
    const workerOptions = { type: config?.type ?? "module" };
    if (config?.credentials !== undefined) {
        workerOptions.credentials = config.credentials;
    }
    if (config?.name !== undefined)
        workerOptions.name = config.name;
    const messageListeners = new Set();
    const errorListeners = new Set();
    const modelListeners = new Map();
    const pendingRequests = new Map();
    const bindings = new Map();
    let status = "running";
    let error;
    let restartCount = 0;
    let automaticRestartCount = 0;
    let restartTimer;
    let nextRequestId = 1;
    let terminated = false;
    let worker = new (getWorkerConstructor())(scriptPath, workerOptions);
    const scheduleBindings = () => {
        for (const [scopeId, handler] of bindings) {
            if (handler._destroyed) {
                bindings.delete(scopeId);
                continue;
            }
            handler._scheduleWatchKeys(["status", "error", "restartCount"]);
        }
    };
    const setStatus = (next) => {
        status = next;
        scheduleBindings();
    };
    const reportError = (nextError) => {
        error = nextError;
        scheduleBindings();
        for (const listener of errorListeners)
            listener(nextError);
    };
    const cleanupRequest = (request) => {
        clearTimeout(request.timer);
        if (request.signal && request.abort) {
            request.signal.removeEventListener("abort", request.abort);
        }
    };
    const rejectPendingRequests = (nextError) => {
        for (const request of pendingRequests.values()) {
            cleanupRequest(request);
            request.reject(nextError);
        }
        pendingRequests.clear();
    };
    const postNative = (message, transfer = []) => {
        if (terminated) {
            throw new WorkerError("terminated", "Cannot post to a terminated Worker");
        }
        worker.postMessage(message, [...transfer]);
    };
    const decodeMessage = (data, event) => {
        try {
            return { value: decode(data, event) };
        }
        catch (cause) {
            const decodeError = new WorkerError("decode", "Worker message decoder failed", { cause, event });
            logger.error(decodeError.message, cause);
            reportError(decodeError);
            return { error: decodeError };
        }
    };
    const resolveRequest = (response, event) => {
        const request = pendingRequests.get(response.id);
        if (!request)
            return;
        pendingRequests.delete(response.id);
        cleanupRequest(request);
        if (!response.ok) {
            const requestError = new WorkerError("request", formatWorkerFailure(response.error, "Worker request failed"), { cause: response.error, event });
            reportError(requestError);
            request.reject(requestError);
            return;
        }
        const result = decodeMessage(response.result, event);
        if ("error" in result) {
            request.reject(result.error);
            return;
        }
        request.resolve(result.value);
    };
    const deliverModelSnapshot = (message) => {
        const listeners = modelListeners.get(message.channel);
        if (!listeners)
            return;
        for (const listener of listeners) {
            listener(message.snapshot, message.options);
        }
    };
    const wire = (activeWorker) => {
        activeWorker.onmessage = (event) => {
            automaticRestartCount = 0;
            if (isWorkerResponse(event.data)) {
                resolveRequest(event.data, event);
                return;
            }
            if (isWorkerModelSnapshot(event.data)) {
                deliverModelSnapshot(event.data);
                return;
            }
            if (isWorkerProtocolMessage(event.data)) {
                reportError(new WorkerError("message", "Worker sent a malformed protocol message", {
                    event,
                }));
                return;
            }
            const data = decodeMessage(event.data, event);
            if ("error" in data)
                return;
            for (const listener of messageListeners) {
                listener(data.value, event);
            }
        };
        activeWorker.onerror = (event) => {
            const runtimeError = new WorkerError("runtime", event.message || "Worker runtime failed", { cause: event.error, event });
            setStatus("error");
            reportError(runtimeError);
            rejectPendingRequests(runtimeError);
            scheduleAutomaticRestart();
        };
        activeWorker.onmessageerror = (event) => {
            reportError(new WorkerError("message", "Worker message could not be deserialized", {
                event,
            }));
        };
    };
    const restartWorker = (manual = false) => {
        if (terminated)
            return;
        clearTimeout(restartTimer);
        restartTimer = undefined;
        if (manual)
            automaticRestartCount = 0;
        rejectPendingRequests(new WorkerError("request", "Worker restarted before request completed"));
        setStatus("restarting");
        logger.info("Worker: restarting...");
        worker.onmessage = null;
        worker.onerror = null;
        worker.onmessageerror = null;
        worker.terminate();
        worker = new (getWorkerConstructor())(scriptPath, workerOptions);
        restartCount += 1;
        wire(worker);
        for (const channel of modelListeners.keys()) {
            postNative(createWorkerModelSubscribeMessage(channel));
        }
        setStatus("running");
    };
    const scheduleAutomaticRestart = () => {
        if (!restartEnabled ||
            terminated ||
            restartTimer !== undefined ||
            automaticRestartCount >= maxRestarts) {
            return;
        }
        const delay = Math.min(restartDelay * 2 ** automaticRestartCount, 30000);
        automaticRestartCount += 1;
        restartTimer = setTimeout(() => {
            restartWorker();
        }, delay);
    };
    wire(worker);
    const handle = {
        get status() {
            return status;
        },
        get error() {
            return error;
        },
        get restartCount() {
            return restartCount;
        },
        post(message, transfer = []) {
            postNative(message, transfer);
        },
        request(message, options = {}) {
            assertWorkerRequestOptions(options);
            if (terminated) {
                return Promise.reject(new WorkerError("terminated", "Cannot request from a terminated Worker"));
            }
            if (options.signal?.aborted) {
                return Promise.reject(new WorkerError("request-aborted", "Worker request was aborted", {
                    cause: options.signal.reason,
                }));
            }
            const id = `worker-${String(nextRequestId++)}`;
            const requestMessage = {
                type: "angular-ts:worker:request",
                id,
                payload: message,
            };
            return new Promise((resolve, reject) => {
                const request = { resolve, reject };
                const timeout = options.timeout ?? 30000;
                if (timeout !== Infinity) {
                    request.timer = setTimeout(() => {
                        pendingRequests.delete(id);
                        cleanupRequest(request);
                        const timeoutError = new WorkerError("request-timeout", `Worker request timed out after ${String(timeout)}ms`);
                        reportError(timeoutError);
                        reject(timeoutError);
                    }, timeout);
                }
                if (options.signal) {
                    request.signal = options.signal;
                    request.abort = () => {
                        pendingRequests.delete(id);
                        cleanupRequest(request);
                        reject(new WorkerError("request-aborted", "Worker request was aborted", {
                            cause: options.signal?.reason,
                        }));
                    };
                    options.signal.addEventListener("abort", request.abort, {
                        once: true,
                    });
                }
                pendingRequests.set(id, request);
                try {
                    postNative(requestMessage, options.transfer);
                }
                catch (cause) {
                    pendingRequests.delete(id);
                    cleanupRequest(request);
                    reject(cause instanceof WorkerError
                        ? cause
                        : new WorkerError("request", "Worker request could not be posted", {
                            cause,
                        }));
                }
            });
        },
        model(channel = "default") {
            if (!channel) {
                throw new Error("Worker model channel must be a non-empty string.");
            }
            let disposed = false;
            let listener;
            const removeListener = () => {
                if (!listener)
                    return;
                const listeners = modelListeners.get(channel);
                listeners?.delete(listener);
                if (listeners?.size === 0)
                    modelListeners.delete(channel);
                listener = undefined;
            };
            return {
                write(snapshot, change) {
                    if (disposed)
                        return;
                    const message = {
                        type: "angular-ts:worker:model:update",
                        channel,
                        snapshot,
                        change,
                    };
                    postNative(message);
                },
                receive(apply) {
                    if (disposed) {
                        throw new Error("Cannot receive from a disposed Worker model target.");
                    }
                    removeListener();
                    listener = (snapshot, restoreOptions) => {
                        apply(snapshot, restoreOptions);
                    };
                    let listeners = modelListeners.get(channel);
                    if (!listeners) {
                        listeners = new Set();
                        modelListeners.set(channel, listeners);
                    }
                    listeners.add(listener);
                    postNative(createWorkerModelSubscribeMessage(channel));
                    return removeListener;
                },
                dispose() {
                    if (disposed)
                        return;
                    disposed = true;
                    removeListener();
                },
            };
        },
        onMessage(listener) {
            messageListeners.add(listener);
            return () => messageListeners.delete(listener);
        },
        onError(listener) {
            errorListeners.add(listener);
            return () => errorListeners.delete(listener);
        },
        terminate() {
            if (terminated)
                return;
            terminated = true;
            clearTimeout(restartTimer);
            restartTimer = undefined;
            worker.onmessage = null;
            worker.onerror = null;
            worker.onmessageerror = null;
            rejectPendingRequests(new WorkerError("terminated", "Worker terminated before request completed"));
            messageListeners.clear();
            errorListeners.clear();
            modelListeners.clear();
            worker.terminate();
            setStatus("terminated");
            bindings.clear();
            onTerminate?.();
        },
        restart() {
            if (terminated) {
                throw new WorkerError("terminated", "Cannot restart a terminated Worker");
            }
            restartWorker(true);
        },
    };
    Object.defineProperty(handle, SCOPE_PROXY_BIND, {
        value(handler) {
            if (!terminated)
                bindings.set(handler.$id, handler);
        },
    });
    return handle;
}
function isWorkerResponse(value) {
    if (!isObject(value) || isArray(value))
        return false;
    const candidate = value;
    return (candidate.type === "angular-ts:worker:response" &&
        isString(candidate.id) &&
        candidate.id.length > 0 &&
        typeof candidate.ok === "boolean" &&
        (!candidate.ok || Object.hasOwn(candidate, "result")));
}
function isWorkerModelSnapshot(value) {
    if (!isObject(value) || isArray(value))
        return false;
    const candidate = value;
    return (candidate.type === "angular-ts:worker:model:snapshot" &&
        isString(candidate.channel) &&
        candidate.channel.length > 0 &&
        isObject(candidate.snapshot) &&
        !isArray(candidate.snapshot));
}
function isWorkerProtocolMessage(value) {
    if (!isObject(value) || isArray(value))
        return false;
    const type = value.type;
    return (type === "angular-ts:worker:response" ||
        type === "angular-ts:worker:model:snapshot");
}
function createWorkerModelSubscribeMessage(channel) {
    return {
        type: "angular-ts:worker:model:subscribe",
        channel,
    };
}
function formatWorkerFailure(value, fallback) {
    if (value instanceof Error)
        return value.message || value.name;
    if (isString(value) && value)
        return value;
    if (isObject(value) && isString(value.message)) {
        return value.message;
    }
    return fallback;
}
function assertWorkerRequestOptions(options) {
    if (!isObject(options) || isArray(options)) {
        throw new Error("$worker request options must be an object.");
    }
    const candidate = options;
    if (candidate.timeout !== undefined &&
        (typeof candidate.timeout !== "number" ||
            candidate.timeout < 0 ||
            Number.isNaN(candidate.timeout))) {
        throw new Error("$worker request timeout must be a non-negative number or Infinity.");
    }
    if (candidate.transfer !== undefined && !isArray(candidate.transfer)) {
        throw new Error("$worker request transfer must be an array.");
    }
    if (candidate.signal !== undefined &&
        (!(candidate.signal instanceof AbortSignal) ||
            typeof candidate.signal.addEventListener !== "function")) {
        throw new Error("$worker request signal must be an AbortSignal.");
    }
}
/** @internal */
function createWorkerService(log, state, getWorkerConstructor, security) {
    return (scriptPath, config = {}) => {
        if (state.destroyed) {
            throw new Error("Cannot create a Worker after runtime teardown");
        }
        assertWorkerConfig(config);
        if (security) {
            const decision = security.check({
                operation: "request",
                transport: "worker",
                method: "GET",
                url: String(scriptPath),
                credentials: config.credentials,
                hasBody: false,
            });
            if (decision.type !== "allow") {
                throw new Error(decision.reason ?? "Worker creation denied by security policy");
            }
        }
        const handle = createManagedWorkerHandle(scriptPath, config, log, getWorkerConstructor, () => state.connections.delete(handle));
        state.connections.add(handle);
        return handle;
    };
}
function assertWorkerConfig(config) {
    if (typeof config !== "object" || config === null || Array.isArray(config)) {
        throw new Error("$worker config must be an object.");
    }
    const candidate = config;
    if (candidate.type !== undefined &&
        candidate.type !== "classic" &&
        candidate.type !== "module") {
        throw new Error("$worker type must be 'classic' or 'module'.");
    }
    if (candidate.credentials !== undefined &&
        candidate.credentials !== "omit" &&
        candidate.credentials !== "same-origin" &&
        candidate.credentials !== "include") {
        throw new Error("$worker credentials must be 'omit', 'same-origin', or 'include'.");
    }
    if (candidate.name !== undefined && typeof candidate.name !== "string") {
        throw new Error("$worker name must be a string.");
    }
    if (candidate.decode !== undefined &&
        typeof candidate.decode !== "function") {
        throw new Error("$worker decode must be a function.");
    }
    if (candidate.restart !== undefined &&
        typeof candidate.restart !== "boolean") {
        throw new Error("$worker restart must be a boolean.");
    }
    if (candidate.restart !== true &&
        (Object.hasOwn(candidate, "restartDelay") ||
            Object.hasOwn(candidate, "maxRestarts"))) {
        throw new Error("$worker restartDelay and maxRestarts require restart: true.");
    }
    if (candidate.restartDelay !== undefined &&
        (typeof candidate.restartDelay !== "number" ||
            !Number.isFinite(candidate.restartDelay) ||
            candidate.restartDelay < 0)) {
        throw new Error("$worker restartDelay must be a finite non-negative number.");
    }
    if (candidate.maxRestarts !== undefined &&
        (typeof candidate.maxRestarts !== "number" ||
            candidate.maxRestarts < 0 ||
            (candidate.maxRestarts !== Infinity &&
                !Number.isInteger(candidate.maxRestarts)))) {
        throw new Error("$worker maxRestarts must be a non-negative integer or Infinity.");
    }
}

export { WorkerError, createWorkerRuntimeState, createWorkerService, destroyWorkerRuntimeState };
