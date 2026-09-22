import { isFunction, isObject, isString } from "../../shared/utils.ts";
import type {
  NativeCapabilityEventName,
  NativeCapabilityEventPayload,
  NativeCapabilityMethodName,
  NativeCapabilityName,
  NativeCapabilityParameters,
  NativeCapabilityResult,
} from "../../runtime/native-capabilities.ts";

/** JSON-compatible request sent to a native application shell. */
export interface NativeCallMessage<TParams = unknown> {
  readonly protocol: number;
  readonly id: string;
  readonly target: string;
  readonly method: string;
  readonly params?: TParams;
  readonly session?: string;
  readonly scopeId?: string | number;
  readonly elementId?: string;
}

/** Reply returned by a native application shell. */
export interface NativeReplyMessage<TResult = unknown> {
  readonly protocol?: number;
  readonly id: string;
  readonly ok: boolean;
  readonly result?: TResult;
  readonly error?:
    | string
    | {
        readonly code: string;
        readonly message: string;
        readonly details?: unknown;
      };
}

/** Event pushed by a native application shell. */
export interface NativeEventMessage<TData = unknown> {
  readonly protocol?: number;
  readonly target: string;
  readonly event: string;
  readonly data?: TData;
}

/** Host object exposed by Android, iOS, or a test adapter. */
export interface NativeBridgeAdapter {
  postMessage?(message: string): void;
  receive?(message: string): void;
}

/** Options for one request to the native shell. */
export interface NativeCallOptions {
  readonly id?: string;
  readonly scopeId?: string | number;
  readonly elementId?: string;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
}

/** Configuration accepted by the optional native runtime module. */
export interface NativeConfig {
  /** Explicit bridge adapter. The global Android bridge is used by default. */
  bridge?: NativeBridgeAdapter;
  /** Global bridge property. Defaults to `AngularNative`. */
  globalName?: string;
  /** Request timeout in milliseconds. Defaults to 30 seconds. */
  timeout?: number;
  /** Session token injected by a native shell. */
  session?: string;
  /** Maximum serialized request size. Defaults to 256 KiB. */
  maxMessageBytes?: number;
}

/** Environment injected into the top-level document by a native shell. */
export interface NativeEnvironment {
  readonly platform: string;
  readonly location?: string;
  readonly session?: string;
  readonly cssVariables?: Readonly<Record<string, string>>;
  readonly protocolVersion?: number;
  readonly maxMessageBytes?: number;
  readonly capabilities?: Readonly<Record<string, readonly string[]>>;
}

export type NativeEventHandler<TData = unknown> = (
  event: NativeEventMessage<TData>,
) => void;

/** Typed request, reply, and event API shared by native application shells. */
export interface NativeService {
  readonly available: boolean;
  readonly capabilities: Readonly<Record<string, readonly string[]>>;
  readonly protocolVersion: number;
  call<
    Name extends NativeCapabilityName,
    Method extends NativeCapabilityMethodName<Name>,
  >(
    target: Name,
    method: Method,
    params?: NativeCapabilityParameters<Name, Method>,
    options?: NativeCallOptions,
  ): Promise<NativeCapabilityResult<Name, Method>>;
  call<TResult = unknown>(
    target: string,
    method: string,
    params?: unknown,
    options?: NativeCallOptions,
  ): Promise<TResult>;
  receive(message: string | object): void;
  on<
    Name extends NativeCapabilityName,
    Event extends NativeCapabilityEventName<Name>,
  >(
    target: Name,
    event: Event,
    handler: NativeEventHandler<NativeCapabilityEventPayload<Name, Event>>,
  ): () => void;
  on<TData = unknown>(
    target: string,
    event: string,
    handler: NativeEventHandler<TData>,
  ): () => void;
  supports(target: string, method?: string): boolean;
  dispose(): void;
}

interface PendingCall {
  readonly cancel: () => void;
  readonly reject: (error: unknown) => void;
  readonly resolve: (value: unknown) => void;
  readonly timer?: ReturnType<typeof setTimeout>;
  readonly cleanup?: () => void;
}

interface NativeWindow extends Window {
  AngularNative?: NativeBridgeAdapter;
  angularNative?: NativeReceiver;
  angularNativeEnvironment?: NativeEnvironment;
}

interface NativeReceiver {
  receive(message: string | object): void;
  dispatch(message: string | object): void;
}

interface NativeReceiverBroker {
  readonly endpoint: NativeReceiver;
  readonly ids: Set<string>;
  readonly previous?: NativeReceiver;
  readonly receivers: Set<(message: string | object) => void>;
}

/** @internal */
export interface NativeRuntimeState {
  readonly config: Required<
    Pick<NativeConfig, "globalName" | "timeout" | "maxMessageBytes">
  > &
    Pick<NativeConfig, "bridge" | "session">;
}

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_MESSAGE_BYTES = 256 * 1024;
const NATIVE_PROTOCOL_VERSION = 1;
const BROKER = Symbol.for("angular.ts.native.receiver");
const RANDOM_ID_RADIX = 36;

/** @internal */
export function createNativeRuntimeState(): NativeRuntimeState {
  return {
    config: {
      globalName: "AngularNative",
      timeout: DEFAULT_TIMEOUT,
      maxMessageBytes: DEFAULT_MAX_MESSAGE_BYTES,
    },
  };
}

/** @internal */
export function applyNativeConfiguration(
  state: NativeRuntimeState,
  value: NativeConfig,
): void {
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
    if (
      !Number.isSafeInteger(value.maxMessageBytes) ||
      value.maxMessageBytes <= 0
    ) {
      throw new TypeError("Native maxMessageBytes must be a positive integer");
    }
    state.config.maxMessageBytes = value.maxMessageBytes;
  }

  if (value.bridge !== undefined) {
    state.config.bridge = value.bridge;
  }
}

/** Creates a native bridge service for a browser window. */
export function createNativeService(
  windowRef: Window,
  config: NativeConfig = {},
): NativeService {
  const state = createNativeRuntimeState();

  applyNativeConfiguration(state, config);

  return createNativeRuntimeService(windowRef, state);
}

/** @internal */
export function createNativeRuntimeService(
  windowRef: Window,
  state: NativeRuntimeState,
): NativeService {
  const nativeWindow = windowRef as NativeWindow;

  const pending = new Map<string, PendingCall>();
  const listeners = new Map<string, Set<NativeEventHandler>>();
  const broker = getNativeReceiverBroker(nativeWindow);
  let disposed = false;

  const getAdapter = (): NativeBridgeAdapter | undefined =>
    state.config.bridge ??
    ((nativeWindow as unknown as Record<string, unknown>)[
      state.config.globalName
    ] as NativeBridgeAdapter | undefined);

  const releaseCall = (id: string): PendingCall | undefined => {
    const call = pending.get(id);

    if (!call) return undefined;

    pending.delete(id);
    broker.ids.delete(id);
    if (call.timer) clearTimeout(call.timer);
    call.cleanup?.();

    return call;
  };

  const cancelCall = (id: string, error: Error): void => {
    const call = releaseCall(id);

    if (!call) return;

    call.cancel();
    call.reject(error);
  };

  const emit = (event: NativeEventMessage): void => {
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
    windowRef.dispatchEvent(
      new CustomEvent(`ng:native:${event.target}:${event.event}`, {
        detail: event.data,
      }),
    );
  };

  const receive = (message: string | object): void => {
    if (disposed) return;

    const value = parseNativeMessage(message);

    if (isNativeReply(value)) {
      const call = releaseCall(value.id);

      if (!call) return;

      if (value.ok) call.resolve(value.result);
      else call.reject(toError(value.error));

      return;
    }

    if (isNativeEvent(value)) emit(value);
  };

  broker.receivers.add(receive);

  return {
    get available(): boolean {
      return !disposed && getAdapter() !== undefined;
    },

    get protocolVersion(): number {
      return NATIVE_PROTOCOL_VERSION;
    },

    get capabilities(): Readonly<Record<string, readonly string[]>> {
      return nativeWindow.angularNativeEnvironment?.capabilities ?? {};
    },

    call<TResult = unknown>(
      target: string,
      method: string,
      params?: unknown,
      options: NativeCallOptions = {},
    ): Promise<TResult> {
      if (disposed) {
        return Promise.reject(new Error("Native service is disposed"));
      }

      const adapter = getAdapter();

      if (!adapter) {
        return Promise.reject(new Error("Native bridge is not available"));
      }

      if (!isString(target) || target.trim().length === 0) {
        return Promise.reject(
          new TypeError("Native target must be a non-empty string"),
        );
      }
      if (!isString(method) || method.trim().length === 0) {
        return Promise.reject(
          new TypeError("Native method must be a non-empty string"),
        );
      }
      if (options.signal?.aborted) {
        return Promise.reject(createAbortError());
      }

      const id = options.id ?? createNativeCallId();

      if (broker.ids.has(id)) {
        return Promise.reject(
          new Error(`Native call id is already pending: ${id}`),
        );
      }

      const payload: NativeCallMessage = {
        protocol: NATIVE_PROTOCOL_VERSION,
        id,
        target,
        method,
        params,
        session:
          state.config.session ??
          nativeWindow.angularNativeEnvironment?.session,
        scopeId: options.scopeId,
        elementId: options.elementId,
      };
      let message: string;

      try {
        message = JSON.stringify(payload);
      } catch (error) {
        return Promise.reject(toError(error));
      }

      if (
        new TextEncoder().encode(message).byteLength >
        state.config.maxMessageBytes
      ) {
        return Promise.reject(
          new RangeError(
            `Native call exceeds ${String(state.config.maxMessageBytes)} bytes`,
          ),
        );
      }

      return new Promise<TResult>((resolve, reject) => {
        const timeout = options.timeout ?? state.config.timeout;
        const timer =
          timeout > 0
            ? setTimeout(() => {
                cancelCall(
                  id,
                  new Error(`Native call timed out: ${target}.${method}`),
                );
              }, timeout)
            : undefined;
        const abort = (): void => {
          cancelCall(id, createAbortError());
        };

        options.signal?.addEventListener("abort", abort, { once: true });

        broker.ids.add(id);
        pending.set(id, {
          cancel: () => {
            const cancelPayload: NativeCallMessage<{ id: string }> = {
              protocol: NATIVE_PROTOCOL_VERSION,
              id: `${id}:cancel`,
              target: "bridge",
              method: "cancel",
              params: { id },
              session:
                state.config.session ??
                nativeWindow.angularNativeEnvironment?.session,
            };

            try {
              const cancellation = JSON.stringify(cancelPayload);

              if (adapter.postMessage) adapter.postMessage(cancellation);
              else adapter.receive?.(cancellation);
            } catch {
              // The original request is already locally cancelled.
            }
          },
          resolve: (value) => {
            resolve(value as TResult);
          },
          reject,
          timer,
          cleanup: options.signal
            ? () => options.signal?.removeEventListener("abort", abort)
            : undefined,
        });

        try {
          if (adapter.postMessage) adapter.postMessage(message);
          else if (adapter.receive) adapter.receive(message);
          else throw new Error("Native bridge cannot receive messages");
        } catch (error) {
          releaseCall(id);
          reject(toError(error));
        }
      });
    },

    receive,

    on<TData = unknown>(
      target: string,
      event: string,
      handler: NativeEventHandler<TData>,
    ): () => void {
      if (disposed) return () => undefined;

      const key = eventKey(target || "*", event || "*");
      let handlers = listeners.get(key);

      if (!handlers) {
        handlers = new Set();
        listeners.set(key, handlers);
      }

      handlers.add(handler as NativeEventHandler);

      return () => {
        handlers.delete(handler as NativeEventHandler);
        if (handlers.size === 0) listeners.delete(key);
      };
    },

    supports(target: string, method?: string): boolean {
      const methods =
        nativeWindow.angularNativeEnvironment?.capabilities?.[target];

      return (
        methods !== undefined &&
        (method === undefined || methods.includes(method))
      );
    },

    dispose(): void {
      if (disposed) return;

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

function getNativeReceiverBroker(
  windowRef: NativeWindow,
): NativeReceiverBroker {
  const record = windowRef as unknown as Record<PropertyKey, unknown>;
  const existing = record[BROKER] as NativeReceiverBroker | undefined;

  if (existing) return existing;

  const receivers = new Set<(message: string | object) => void>();
  const previous = windowRef.angularNative;
  const dispatch = (message: string | object): void => {
    if (previous) previous.receive.call(previous, message);
    receivers.forEach((receiver) => {
      receiver(message);
    });
  };
  const broker: NativeReceiverBroker = {
    endpoint: { receive: dispatch, dispatch },
    ids: new Set(),
    previous,
    receivers,
  };

  record[BROKER] = broker;
  windowRef.angularNative = broker.endpoint;

  return broker;
}

function releaseNativeReceiverBroker(
  windowRef: NativeWindow,
  broker: NativeReceiverBroker,
): void {
  if (broker.receivers.size > 0) return;

  const record = windowRef as unknown as Record<PropertyKey, unknown>;

  if (windowRef.angularNative === broker.endpoint) {
    windowRef.angularNative = broker.previous;
  }
  Reflect.deleteProperty(record, BROKER);
}

function createNativeCallId(): string {
  const cryptoRef = globalThis.crypto as Partial<Crypto> | undefined;

  if (cryptoRef && isFunction(cryptoRef.randomUUID)) {
    return cryptoRef.randomUUID.call(cryptoRef);
  }

  return `native-${String(Date.now())}-${Math.random()
    .toString(RANDOM_ID_RADIX)
    .slice(2)}`;
}

function eventKey(target: string, event: string): string {
  return `${target}:${event}`;
}

function parseNativeMessage(message: string | object): unknown {
  if (!isString(message)) return message;

  try {
    return JSON.parse(message);
  } catch {
    return undefined;
  }
}

function isNativeReply(value: unknown): value is NativeReplyMessage {
  return (
    isObject(value) &&
    isString((value as NativeReplyMessage).id) &&
    typeof (value as NativeReplyMessage).ok === "boolean" &&
    hasSupportedProtocol(value)
  );
}

function isNativeEvent(value: unknown): value is NativeEventMessage {
  return (
    isObject(value) &&
    isString((value as NativeEventMessage).target) &&
    isString((value as NativeEventMessage).event) &&
    hasSupportedProtocol(value)
  );
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;

  if (isObject(value)) {
    const record = value as Record<string, unknown>;
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

function hasSupportedProtocol(value: object): boolean {
  const protocol = (value as { protocol?: unknown }).protocol;

  return protocol === undefined || protocol === NATIVE_PROTOCOL_VERSION;
}

function createAbortError(): DOMException {
  return new DOMException("Native call was aborted", "AbortError");
}
