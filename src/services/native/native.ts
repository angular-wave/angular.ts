import { _log, _rootScope, _window } from "../../injection-tokens.ts";
import { isFunction, isObject, isString } from "../../shared/utils.ts";

/** JSON-compatible payload sent from AngularTS to the native shell. */
export interface NativeCallMessage<TParams = unknown> {
  /** Unique message id used to match native replies. */
  id: string;
  /** Native component or capability name, such as `camera` or `share`. */
  target: string;
  /** Method or event name handled by the native component. */
  method: string;
  /** Optional parameters for the native component. */
  params?: TParams;
  /** AngularTS scope id that initiated the call, when available. */
  scopeId?: string | number;
  /** DOM element id that initiated the call, when available. */
  elementId?: string;
}

/** Reply message sent by the native shell for a previous call. */
export interface NativeReplyMessage<TResult = unknown> {
  /** Message id matching the original call. */
  id: string;
  /** Whether the native call completed successfully. */
  ok: boolean;
  /** Native result payload for successful replies. */
  result?: TResult;
  /** Native error payload for failed replies. */
  error?: unknown;
}

/** Native event pushed into AngularTS without a matching request. */
export interface NativeEventMessage<TData = unknown> {
  /** Native component or capability name. */
  target: string;
  /** Event name emitted by the native component. */
  event: string;
  /** Event payload. */
  data?: TData;
}

/** Low-level object exposed by the forked native WebView shell. */
export interface NativeBridgeAdapter {
  /** Receives one serialized AngularTS native call. */
  postMessage?(message: string): void;
  /** Alternate Android-friendly method name for receiving one serialized call. */
  receive?(message: string): void;
}

export interface NativeCallOptions {
  /** Explicit call id. Defaults to an internally generated id. */
  id?: string;
  /** AngularTS scope id associated with the call. */
  scopeId?: string | number;
  /** DOM element id associated with the call. */
  elementId?: string;
  /** Override the default timeout in milliseconds. */
  timeout?: number;
}

export type NativeEventHandler<TData = unknown> = (
  event: NativeEventMessage<TData>,
) => void;

export interface NativeService {
  /** Sends a call to a native component and resolves with the native result. */
  call<TResult = unknown, TParams = unknown>(
    target: string,
    method: string,
    params?: TParams,
    options?: NativeCallOptions,
  ): Promise<TResult>;
  /** Receives a reply or event from the native shell. */
  receive(message: string | object): void;
  /** Subscribes to native push events. */
  on<TData = unknown>(
    target: string,
    event: string,
    handler: NativeEventHandler<TData>,
  ): () => void;
  /** Current native bridge adapter, when available. */
  adapter(): NativeBridgeAdapter | undefined;
}

interface PendingCall {
  reject(error: unknown): void;
  resolve(value: unknown): void;
  timer?: ReturnType<typeof setTimeout>;
}

type NativeGlobalWindow = Window &
  typeof globalThis & {
    AngularNative?: NativeBridgeAdapter;
    angularNative?: {
      receive(message: string | object): void;
      dispatch(message: string | object): void;
    };
  };

const DEFAULT_TIMEOUT = 30000;

const RANDOM_ID_RADIX = 36;

/** Provider for the AngularTS native bridge service. */
export class NativeProvider {
  /** Global native adapter name exposed by the forked native WebView shell. */
  globalName = "AngularNative";
  /** Default timeout for request/reply calls. */
  timeout = DEFAULT_TIMEOUT;
  /** Explicit adapter, useful in tests or browser demos. */
  bridge?: NativeBridgeAdapter;

  $get = [
    _window,
    _rootScope,
    _log,
    (
      windowRef: Window,
      rootScope: ng.Scope,
      log: ng.LogService,
    ): NativeService => {
      const nativeWindow = windowRef as NativeGlobalWindow;

      const pending = new Map<string, PendingCall>();

      const listeners = new Map<string, Set<NativeEventHandler>>();

      const adapter = (): NativeBridgeAdapter | undefined =>
        this.bridge ||
        ((nativeWindow as unknown as Record<string, unknown>)[
          this.globalName
        ] as NativeBridgeAdapter | undefined);

      const flush = (): void => {
        if (isFunction(rootScope.$flushQueue)) {
          rootScope.$flushQueue();
        }
      };

      const emit = (event: NativeEventMessage): void => {
        const keys = [
          eventKey(event.target, event.event),
          eventKey("*", event.event),
          eventKey(event.target, "*"),
          eventKey("*", "*"),
        ];

        keys.forEach((key) => {
          listeners.get(key)?.forEach((handler) => handler(event));
        });

        windowRef.dispatchEvent(
          new CustomEvent("ng:native", {
            detail: event,
          }),
        );
        windowRef.dispatchEvent(
          new CustomEvent(`ng:native:${event.target}:${event.event}`, {
            detail: event.data,
          }),
        );
        flush();
      };

      const receive = (message: string | object): void => {
        const data = parseNativeMessage(message);

        if (!data) return;

        if (isNativeReply(data)) {
          const call = pending.get(data.id);

          if (!call) return;

          pending.delete(data.id);

          if (call.timer) clearTimeout(call.timer);

          if (data.ok) {
            call.resolve(data.result);
          } else {
            call.reject(data.error);
          }

          flush();

          return;
        }

        if (isNativeEvent(data)) {
          emit(data);
        }
      };

      nativeWindow.angularNative = {
        receive,
        dispatch: receive,
      };

      return {
        call: <TResult = unknown, TParams = unknown>(
          target: string,
          method: string,
          params?: TParams,
          options: NativeCallOptions = {},
        ): Promise<TResult> => {
          const native = adapter();

          if (!native) {
            return Promise.reject(
              new Error(`Native bridge "${this.globalName}" is not available`),
            );
          }

          const id = options.id || createNativeCallId();

          const payload: NativeCallMessage<TParams> = {
            id,
            target,
            method,
            params,
            scopeId: options.scopeId,
            elementId: options.elementId,
          };

          const message = JSON.stringify(payload);

          return new Promise<TResult>((resolve, reject) => {
            const timeout = options.timeout ?? this.timeout;

            const timer =
              timeout > 0
                ? setTimeout(() => {
                    pending.delete(id);
                    reject(
                      new Error(`Native call timed out: ${target}.${method}`),
                    );
                  }, timeout)
                : undefined;

            pending.set(id, { resolve, reject, timer });

            try {
              if (native.postMessage) {
                native.postMessage(message);
              } else if (native.receive) {
                native.receive(message);
              } else {
                throw new Error(
                  "Native bridge adapter cannot receive messages",
                );
              }
            } catch (error) {
              pending.delete(id);

              if (timer) clearTimeout(timer);
              log.error("Native bridge call failed", error);
              reject(error);
            }
          });
        },
        receive,
        on<TData = unknown>(
          target: string,
          event: string,
          handler: NativeEventHandler<TData>,
        ): () => void {
          const key = eventKey(target || "*", event || "*");

          let handlers = listeners.get(key);

          if (!handlers) {
            handlers = new Set();
            listeners.set(key, handlers);
          }

          handlers.add(handler as NativeEventHandler);

          return () => {
            handlers?.delete(handler as NativeEventHandler);

            if (handlers?.size === 0) {
              listeners.delete(key);
            }
          };
        },
        adapter,
      };
    },
  ];
}

function createNativeCallId(): string {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `native-${Date.now()}-${Math.random().toString(RANDOM_ID_RADIX).slice(2)}`;
}

function eventKey(target: string, event: string): string {
  return `${target}:${event}`;
}

function parseNativeMessage(message: string | object): unknown {
  if (isString(message)) {
    try {
      return JSON.parse(message);
    } catch {
      return undefined;
    }
  }

  return message;
}

function isNativeReply(value: unknown): value is NativeReplyMessage {
  return (
    isObject(value) &&
    isString((value as NativeReplyMessage).id) &&
    "ok" in value
  );
}

function isNativeEvent(value: unknown): value is NativeEventMessage {
  return (
    isObject(value) &&
    isString((value as NativeEventMessage).target) &&
    isString((value as NativeEventMessage).event)
  );
}
