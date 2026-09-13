import { isObject, isString, isFunction } from '../../shared/utils.js';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_MESSAGE_BYTES = 256 * 1024;
const NATIVE_PROTOCOL_VERSION = 1;
const BROKER = Symbol.for("angular.ts.native.receiver");
const RANDOM_ID_RADIX = 36;
/** @internal */
function createNativeRuntimeState() {
    return {
        config: {
            globalName: "AngularNative",
            timeout: DEFAULT_TIMEOUT,
            maxMessageBytes: DEFAULT_MAX_MESSAGE_BYTES,
        },
    };
}
/** @internal */
function applyNativeConfiguration(state, value) {
    if (!isObject(value)) {
        throw new TypeError("Native configuration must be an object");
    }
    if (value.globalName !== undefined) {
        if (!isString(value.globalName) || value.globalName.length === 0) {
            throw new TypeError("Native globalName must be a non-empty string");
        }
        state.config.globalName = value.globalName;
    }
    if (value.timeout !== undefined) {
        if (!Number.isFinite(value.timeout) || value.timeout < 0) {
            throw new TypeError("Native timeout must be a non-negative number");
        }
        state.config.timeout = value.timeout;
    }
    if (value.session !== undefined) {
        if (!isString(value.session) || value.session.length === 0) {
            throw new TypeError("Native session must be a non-empty string");
        }
        state.config.session = value.session;
    }
    if (value.maxMessageBytes !== undefined) {
        if (!Number.isSafeInteger(value.maxMessageBytes) ||
            value.maxMessageBytes <= 0) {
            throw new TypeError("Native maxMessageBytes must be a positive integer");
        }
        state.config.maxMessageBytes = value.maxMessageBytes;
    }
    if (value.bridge !== undefined) {
        state.config.bridge = value.bridge;
    }
}
/** Creates a native bridge service for a browser window. */
function createNativeService(windowRef, config = {}) {
    const state = createNativeRuntimeState();
    applyNativeConfiguration(state, config);
    return createNativeRuntimeService(windowRef, state);
}
/** @internal */
function createNativeRuntimeService(windowRef, state) {
    const nativeWindow = windowRef;
    const pending = new Map();
    const listeners = new Map();
    const broker = getNativeReceiverBroker(nativeWindow);
    let disposed = false;
    const getAdapter = () => state.config.bridge ??
        nativeWindow[state.config.globalName];
    const releaseCall = (id) => {
        const call = pending.get(id);
        if (!call)
            return undefined;
        pending.delete(id);
        broker.ids.delete(id);
        if (call.timer)
            clearTimeout(call.timer);
        call.cleanup?.();
        return call;
    };
    const cancelCall = (id, error) => {
        const call = releaseCall(id);
        if (!call)
            return;
        call.cancel();
        call.reject(error);
    };
    const emit = (event) => {
        const keys = new Set([
            eventKey(event.target, event.event),
            eventKey("*", event.event),
            eventKey(event.target, "*"),
            eventKey("*", "*"),
        ]);
        keys.forEach((key) => {
            listeners.get(key)?.forEach((handler) => {
                handler(event);
            });
        });
        windowRef.dispatchEvent(new CustomEvent("ng:native", { detail: event }));
        windowRef.dispatchEvent(new CustomEvent(`ng:native:${event.target}:${event.event}`, {
            detail: event.data,
        }));
    };
    const receive = (message) => {
        if (disposed)
            return;
        const value = parseNativeMessage(message);
        if (isNativeReply(value)) {
            const call = releaseCall(value.id);
            if (!call)
                return;
            if (value.ok)
                call.resolve(value.result);
            else
                call.reject(toError(value.error));
            return;
        }
        if (isNativeEvent(value))
            emit(value);
    };
    broker.receivers.add(receive);
    return {
        get available() {
            return !disposed && getAdapter() !== undefined;
        },
        get protocolVersion() {
            return NATIVE_PROTOCOL_VERSION;
        },
        get capabilities() {
            return nativeWindow.angularNativeEnvironment?.capabilities ?? {};
        },
        call(target, method, params, options = {}) {
            if (disposed) {
                return Promise.reject(new Error("Native service is disposed"));
            }
            const adapter = getAdapter();
            if (!adapter) {
                return Promise.reject(new Error("Native bridge is not available"));
            }
            if (!isString(target) || target.trim().length === 0) {
                return Promise.reject(new TypeError("Native target must be a non-empty string"));
            }
            if (!isString(method) || method.trim().length === 0) {
                return Promise.reject(new TypeError("Native method must be a non-empty string"));
            }
            if (options.signal?.aborted) {
                return Promise.reject(createAbortError());
            }
            const id = options.id ?? createNativeCallId();
            if (broker.ids.has(id)) {
                return Promise.reject(new Error(`Native call id is already pending: ${id}`));
            }
            const payload = {
                protocol: NATIVE_PROTOCOL_VERSION,
                id,
                target,
                method,
                params,
                session: state.config.session ??
                    nativeWindow.angularNativeEnvironment?.session,
                scopeId: options.scopeId,
                elementId: options.elementId,
            };
            let message;
            try {
                message = JSON.stringify(payload);
            }
            catch (error) {
                return Promise.reject(toError(error));
            }
            if (new TextEncoder().encode(message).byteLength >
                state.config.maxMessageBytes) {
                return Promise.reject(new RangeError(`Native call exceeds ${String(state.config.maxMessageBytes)} bytes`));
            }
            return new Promise((resolve, reject) => {
                const timeout = options.timeout ?? state.config.timeout;
                const timer = timeout > 0
                    ? setTimeout(() => {
                        cancelCall(id, new Error(`Native call timed out: ${target}.${method}`));
                    }, timeout)
                    : undefined;
                const abort = () => {
                    cancelCall(id, createAbortError());
                };
                options.signal?.addEventListener("abort", abort, { once: true });
                broker.ids.add(id);
                pending.set(id, {
                    cancel: () => {
                        const cancelPayload = {
                            protocol: NATIVE_PROTOCOL_VERSION,
                            id: `${id}:cancel`,
                            target: "bridge",
                            method: "cancel",
                            params: { id },
                            session: state.config.session ??
                                nativeWindow.angularNativeEnvironment?.session,
                        };
                        try {
                            const cancellation = JSON.stringify(cancelPayload);
                            if (adapter.postMessage)
                                adapter.postMessage(cancellation);
                            else
                                adapter.receive?.(cancellation);
                        }
                        catch {
                            // The original request is already locally cancelled.
                        }
                    },
                    resolve: (value) => {
                        resolve(value);
                    },
                    reject,
                    timer,
                    cleanup: options.signal
                        ? () => options.signal?.removeEventListener("abort", abort)
                        : undefined,
                });
                try {
                    if (adapter.postMessage)
                        adapter.postMessage(message);
                    else if (adapter.receive)
                        adapter.receive(message);
                    else
                        throw new Error("Native bridge cannot receive messages");
                }
                catch (error) {
                    releaseCall(id);
                    reject(toError(error));
                }
            });
        },
        receive,
        on(target, event, handler) {
            if (disposed)
                return () => undefined;
            const key = eventKey(target || "*", event || "*");
            let handlers = listeners.get(key);
            if (!handlers) {
                handlers = new Set();
                listeners.set(key, handlers);
            }
            handlers.add(handler);
            return () => {
                handlers.delete(handler);
                if (handlers.size === 0)
                    listeners.delete(key);
            };
        },
        supports(target, method) {
            const methods = nativeWindow.angularNativeEnvironment?.capabilities?.[target];
            return (methods !== undefined &&
                (method === undefined || methods.includes(method)));
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            broker.receivers.delete(receive);
            pending.forEach((_call, id) => {
                cancelCall(id, new Error("Native service is disposed"));
            });
            listeners.clear();
            releaseNativeReceiverBroker(nativeWindow, broker);
        },
    };
}
function getNativeReceiverBroker(windowRef) {
    const record = windowRef;
    const existing = record[BROKER];
    if (existing)
        return existing;
    const receivers = new Set();
    const previous = windowRef.angularNative;
    const dispatch = (message) => {
        if (previous)
            previous.receive.call(previous, message);
        receivers.forEach((receiver) => {
            receiver(message);
        });
    };
    const broker = {
        endpoint: { receive: dispatch, dispatch },
        ids: new Set(),
        previous,
        receivers,
    };
    record[BROKER] = broker;
    windowRef.angularNative = broker.endpoint;
    return broker;
}
function releaseNativeReceiverBroker(windowRef, broker) {
    if (broker.receivers.size > 0)
        return;
    const record = windowRef;
    if (windowRef.angularNative === broker.endpoint) {
        windowRef.angularNative = broker.previous;
    }
    Reflect.deleteProperty(record, BROKER);
}
function createNativeCallId() {
    const cryptoRef = globalThis.crypto;
    if (cryptoRef && isFunction(cryptoRef.randomUUID)) {
        return cryptoRef.randomUUID.call(cryptoRef);
    }
    return `native-${String(Date.now())}-${Math.random()
        .toString(RANDOM_ID_RADIX)
        .slice(2)}`;
}
function eventKey(target, event) {
    return `${target}:${event}`;
}
function parseNativeMessage(message) {
    if (!isString(message))
        return message;
    try {
        return JSON.parse(message);
    }
    catch {
        return undefined;
    }
}
function isNativeReply(value) {
    return (isObject(value) &&
        isString(value.id) &&
        typeof value.ok === "boolean" &&
        hasSupportedProtocol(value));
}
function isNativeEvent(value) {
    return (isObject(value) &&
        isString(value.target) &&
        isString(value.event) &&
        hasSupportedProtocol(value));
}
function toError(value) {
    if (value instanceof Error)
        return value;
    if (isObject(value)) {
        const record = value;
        const message = isString(record.message)
            ? record.message
            : "Native bridge call failed";
        const error = new Error(message, { cause: value });
        if (isString(record.code)) {
            Object.defineProperty(error, "code", {
                configurable: true,
                enumerable: true,
                value: record.code,
            });
        }
        return error;
    }
    return new Error(isString(value) ? value : "Native bridge call failed", {
        cause: value,
    });
}
function hasSupportedProtocol(value) {
    const protocol = value.protocol;
    return protocol === undefined || protocol === NATIVE_PROTOCOL_VERSION;
}
function createAbortError() {
    return new DOMException("Native call was aborted", "AbortError");
}

export { applyNativeConfiguration, createNativeRuntimeService, createNativeRuntimeState, createNativeService };
