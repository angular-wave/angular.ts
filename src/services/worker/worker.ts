import {
  SCOPE_PROXY_BIND,
  type Scope,
  type ScopeProxyBindable,
} from "../../core/scope/scope.ts";
import type {
  ModelChange,
  ModelRestoreOptions,
  ModelSyncTarget,
} from "../../core/app-context/app-context.ts";
import { isArray, isObject, isString } from "../../shared/utils.ts";
import type { SecurityPolicy } from "../security/security.ts";

/** Lifecycle state exposed by a managed {@link WorkerHandle}. */
export type WorkerStatus = "running" | "restarting" | "error" | "terminated";

export type WorkerErrorCode =
  | "runtime"
  | "message"
  | "decode"
  | "request"
  | "request-timeout"
  | "request-aborted"
  | "terminated";

/** Typed failure reported by a managed worker. */
export class WorkerError extends Error {
  constructor(
    readonly code: WorkerErrorCode,
    message: string,
    options: {
      cause?: unknown;
      event?: ErrorEvent | MessageEvent<unknown>;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkerError";
    this.event = options.event;
  }

  readonly event: ErrorEvent | MessageEvent<unknown> | undefined;
}

/** Native worker options plus AngularTS decoding and restart policy. */
export type WorkerConfig<TReceive = unknown> = WorkerOptions & {
  /** Decode an inbound native message before delivering it to subscribers. */
  decode?: (data: unknown, event: MessageEvent<unknown>) => TReceive;
} & (
    | {
        /** Restart the worker after a native runtime error. */
        restart: true;
        /** Base restart delay. Exponential backoff is capped at 30s. */
        restartDelay?: number;
        /** Maximum automatic restarts. Defaults to 3. */
        maxRestarts?: number;
      }
    | {
        /** Automatic restart is disabled by default. */
        restart?: false;
        restartDelay?: never;
        maxRestarts?: never;
      }
  );

/** Options for one correlated worker request. */
export interface WorkerRequestOptions {
  /** Reject the request after this many milliseconds. Defaults to 30 seconds. */
  timeout?: number;
  /** Abort the request without terminating the worker. */
  signal?: AbortSignal;
  /** Transfer ownership of values contained by the request payload. */
  transfer?: readonly Transferable[];
}

/** Request envelope understood by {@link WorkerHandle.request}. */
export interface WorkerRequest<TPayload = unknown> {
  type: "angular-ts:worker:request";
  id: string;
  payload: TPayload;
}

/** Response envelope returned for a correlated worker request. */
export type WorkerResponse<TResult = unknown> =
  | {
      type: "angular-ts:worker:response";
      id: string;
      ok: true;
      result: TResult;
    }
  | {
      type: "angular-ts:worker:response";
      id: string;
      ok: false;
      error?: unknown;
    };

/** Standard messages used by {@link WorkerHandle.model}. */
export type WorkerModelMessage<
  T extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      type: "angular-ts:worker:model:subscribe";
      channel: string;
    }
  | {
      type: "angular-ts:worker:model:update";
      channel: string;
      snapshot: T;
      change: ModelChange;
    }
  | {
      type: "angular-ts:worker:model:snapshot";
      channel: string;
      snapshot: T;
      options?: ModelRestoreOptions;
    };

type WorkerConstructor = new (
  scriptURL: string | URL,
  options?: WorkerOptions,
) => Worker;

/** Managed, scope-bindable handle to one page-owned Web Worker. */
export interface WorkerHandle<TSend = unknown, TReceive = unknown> {
  /** Current managed lifecycle state. */
  readonly status: WorkerStatus;
  /** Latest managed failure, retained across worker replacement. */
  readonly error: WorkerError | undefined;
  /** Number of explicit or automatic worker restarts. */
  readonly restartCount: number;
  /** Send a typed message and optional transferable ownership list. */
  post(message: TSend, transfer?: readonly Transferable[]): void;
  /** Send a correlated request using the AngularTS worker envelope. */
  request(message: TSend, options?: WorkerRequestOptions): Promise<TReceive>;
  /** Adapt this handle to the standard model synchronization contract. */
  model<T extends Record<string, unknown>>(
    channel?: string,
  ): ModelSyncTarget<T>;
  /** Subscribe to decoded worker messages. */
  onMessage(
    listener: (data: TReceive, event: MessageEvent<unknown>) => void,
  ): () => void;
  /** Subscribe to runtime, message, decoding, and request failures. */
  onError(listener: (error: WorkerError) => void): () => void;
  /** Permanently terminate this managed connection. */
  terminate(): void;
  /** Replace the native worker unless this connection was terminated. */
  restart(): void;
}

/** Injectable factory for typed managed Web Worker connections. */
export interface WorkerService {
  <TSend = unknown, TReceive = unknown>(
    scriptPath: string | URL,
    config?: WorkerConfig<TReceive>,
  ): WorkerHandle<TSend, TReceive>;
}

/** @internal */
export interface WorkerRuntimeState {
  readonly connections: Set<WorkerHandle>;
  destroyed: boolean;
}

/** @internal */
export function createWorkerRuntimeState(): WorkerRuntimeState {
  return {
    connections: new Set(),
    destroyed: false,
  };
}

/** @internal */
export function destroyWorkerRuntimeState(state: WorkerRuntimeState): void {
  if (state.destroyed) return;

  state.destroyed = true;

  for (const connection of state.connections) connection.terminate();

  state.connections.clear();
}

interface PendingWorkerRequest<TReceive> {
  resolve(value: TReceive): void;
  reject(error: WorkerError): void;
  timer?: ReturnType<typeof setTimeout>;
  signal?: AbortSignal;
  abort?: () => void;
}

type WorkerModelSnapshotListener = (
  snapshot: Record<string, unknown>,
  options?: ModelRestoreOptions,
) => void;

function createManagedWorkerHandle<TSend, TReceive>(
  scriptPath: string | URL,
  config: WorkerConfig<TReceive> | undefined,
  logger: ng.LogService,
  getWorkerConstructor: () => WorkerConstructor,
  onTerminate?: () => void,
): WorkerHandle<TSend, TReceive> {
  if (!scriptPath) throw new Error("Worker script path required");

  const restartEnabled = config?.restart ?? false;
  const restartDelay =
    typeof config?.restartDelay === "number" && config.restartDelay >= 0
      ? config.restartDelay
      : 1000;
  const maxRestarts =
    typeof config?.maxRestarts === "number" && config.maxRestarts >= 0
      ? Math.floor(config.maxRestarts)
      : 3;
  const decode = config?.decode ?? ((data: unknown) => data as TReceive);
  const workerOptions: WorkerOptions = { type: config?.type ?? "module" };

  if (config?.credentials !== undefined) {
    workerOptions.credentials = config.credentials;
  }

  if (config?.name !== undefined) workerOptions.name = config.name;
  const messageListeners = new Set<
    (data: TReceive, event: MessageEvent<unknown>) => void
  >();
  const errorListeners = new Set<(error: WorkerError) => void>();
  const modelListeners = new Map<string, Set<WorkerModelSnapshotListener>>();
  const pendingRequests = new Map<string, PendingWorkerRequest<TReceive>>();
  const bindings = new Map<number, Scope>();
  let status: WorkerStatus = "running";
  let error: WorkerError | undefined;
  let restartCount = 0;
  let automaticRestartCount = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let nextRequestId = 1;
  let terminated = false;
  let worker = new (getWorkerConstructor())(scriptPath, workerOptions);

  const scheduleBindings = (): void => {
    for (const [scopeId, handler] of bindings) {
      if (handler._destroyed) {
        bindings.delete(scopeId);
        continue;
      }

      handler._scheduleWatchKeys(["status", "error", "restartCount"]);
    }
  };

  const setStatus = (next: WorkerStatus): void => {
    status = next;
    scheduleBindings();
  };

  const reportError = (nextError: WorkerError): void => {
    error = nextError;
    scheduleBindings();

    for (const listener of errorListeners) listener(nextError);
  };

  const cleanupRequest = (request: PendingWorkerRequest<TReceive>): void => {
    clearTimeout(request.timer);

    if (request.signal && request.abort) {
      request.signal.removeEventListener("abort", request.abort);
    }
  };

  const rejectPendingRequests = (nextError: WorkerError): void => {
    for (const request of pendingRequests.values()) {
      cleanupRequest(request);
      request.reject(nextError);
    }

    pendingRequests.clear();
  };

  const postNative = (
    message: unknown,
    transfer: readonly Transferable[] = [],
  ): void => {
    if (terminated) {
      throw new WorkerError("terminated", "Cannot post to a terminated Worker");
    }

    worker.postMessage(message, [...transfer]);
  };

  const decodeMessage = (
    data: unknown,
    event: MessageEvent<unknown>,
  ): { value: TReceive } | { error: WorkerError } => {
    try {
      return { value: decode(data, event) };
    } catch (cause) {
      const decodeError = new WorkerError(
        "decode",
        "Worker message decoder failed",
        { cause, event },
      );

      logger.error(decodeError.message, cause);
      reportError(decodeError);

      return { error: decodeError };
    }
  };

  const resolveRequest = (
    response: WorkerResponse,
    event: MessageEvent<unknown>,
  ): void => {
    const request = pendingRequests.get(response.id);

    if (!request) return;

    pendingRequests.delete(response.id);
    cleanupRequest(request);

    if (!response.ok) {
      const requestError = new WorkerError(
        "request",
        formatWorkerFailure(response.error, "Worker request failed"),
        { cause: response.error, event },
      );

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

  const deliverModelSnapshot = (
    message: Extract<
      WorkerModelMessage,
      { type: "angular-ts:worker:model:snapshot" }
    >,
  ): void => {
    const listeners = modelListeners.get(message.channel);

    if (!listeners) return;

    for (const listener of listeners) {
      listener(message.snapshot, message.options);
    }
  };

  const wire = (activeWorker: Worker): void => {
    activeWorker.onmessage = (event: MessageEvent<unknown>) => {
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
        reportError(
          new WorkerError(
            "message",
            "Worker sent a malformed protocol message",
            {
              event,
            },
          ),
        );
        return;
      }

      const data = decodeMessage(event.data, event);

      if ("error" in data) return;

      for (const listener of messageListeners) {
        listener(data.value, event);
      }
    };

    activeWorker.onerror = (event: ErrorEvent) => {
      const runtimeError = new WorkerError(
        "runtime",
        event.message || "Worker runtime failed",
        { cause: event.error, event },
      );

      setStatus("error");
      reportError(runtimeError);
      rejectPendingRequests(runtimeError);
      scheduleAutomaticRestart();
    };

    activeWorker.onmessageerror = (event: MessageEvent<unknown>) => {
      reportError(
        new WorkerError("message", "Worker message could not be deserialized", {
          event,
        }),
      );
    };
  };

  const restartWorker = (manual = false): void => {
    if (terminated) return;

    clearTimeout(restartTimer);
    restartTimer = undefined;

    if (manual) automaticRestartCount = 0;

    rejectPendingRequests(
      new WorkerError("request", "Worker restarted before request completed"),
    );
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

  const scheduleAutomaticRestart = (): void => {
    if (
      !restartEnabled ||
      terminated ||
      restartTimer !== undefined ||
      automaticRestartCount >= maxRestarts
    ) {
      return;
    }

    const delay = Math.min(restartDelay * 2 ** automaticRestartCount, 30_000);

    automaticRestartCount += 1;
    restartTimer = setTimeout(() => {
      restartWorker();
    }, delay);
  };

  wire(worker);

  const handle: WorkerHandle<TSend, TReceive> & ScopeProxyBindable = {
    get status() {
      return status;
    },
    get error() {
      return error;
    },
    get restartCount() {
      return restartCount;
    },
    post(message: TSend, transfer: readonly Transferable[] = []) {
      postNative(message, transfer);
    },
    request(message: TSend, options: WorkerRequestOptions = {}) {
      assertWorkerRequestOptions(options);

      if (terminated) {
        return Promise.reject(
          new WorkerError(
            "terminated",
            "Cannot request from a terminated Worker",
          ),
        );
      }

      if (options.signal?.aborted) {
        return Promise.reject(
          new WorkerError("request-aborted", "Worker request was aborted", {
            cause: options.signal.reason,
          }),
        );
      }

      const id = `worker-${String(nextRequestId++)}`;
      const requestMessage: WorkerRequest<TSend> = {
        type: "angular-ts:worker:request",
        id,
        payload: message,
      };

      return new Promise<TReceive>((resolve, reject) => {
        const request: PendingWorkerRequest<TReceive> = { resolve, reject };
        const timeout = options.timeout ?? 30_000;

        if (timeout !== Infinity) {
          request.timer = setTimeout(() => {
            pendingRequests.delete(id);
            cleanupRequest(request);
            const timeoutError = new WorkerError(
              "request-timeout",
              `Worker request timed out after ${String(timeout)}ms`,
            );

            reportError(timeoutError);
            reject(timeoutError);
          }, timeout);
        }

        if (options.signal) {
          request.signal = options.signal;
          request.abort = () => {
            pendingRequests.delete(id);
            cleanupRequest(request);
            reject(
              new WorkerError("request-aborted", "Worker request was aborted", {
                cause: options.signal?.reason,
              }),
            );
          };
          options.signal.addEventListener("abort", request.abort, {
            once: true,
          });
        }

        pendingRequests.set(id, request);

        try {
          postNative(requestMessage, options.transfer);
        } catch (cause) {
          pendingRequests.delete(id);
          cleanupRequest(request);
          reject(
            cause instanceof WorkerError
              ? cause
              : new WorkerError(
                  "request",
                  "Worker request could not be posted",
                  {
                    cause,
                  },
                ),
          );
        }
      });
    },
    model<T extends Record<string, unknown>>(channel = "default") {
      if (!channel) {
        throw new Error("Worker model channel must be a non-empty string.");
      }

      let disposed = false;
      let listener: WorkerModelSnapshotListener | undefined;

      const removeListener = (): void => {
        if (!listener) return;

        const listeners = modelListeners.get(channel);

        listeners?.delete(listener);
        if (listeners?.size === 0) modelListeners.delete(channel);
        listener = undefined;
      };

      return {
        write(snapshot: T, change: ModelChange) {
          if (disposed) return;

          const message: WorkerModelMessage<T> = {
            type: "angular-ts:worker:model:update",
            channel,
            snapshot,
            change,
          };

          postNative(message);
        },
        receive(apply) {
          if (disposed) {
            throw new Error(
              "Cannot receive from a disposed Worker model target.",
            );
          }

          removeListener();
          listener = (snapshot, restoreOptions) => {
            apply(snapshot as T, restoreOptions);
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
          if (disposed) return;

          disposed = true;
          removeListener();
        },
      } satisfies ModelSyncTarget<T>;
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
      if (terminated) return;

      terminated = true;
      clearTimeout(restartTimer);
      restartTimer = undefined;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      rejectPendingRequests(
        new WorkerError(
          "terminated",
          "Worker terminated before request completed",
        ),
      );
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
        throw new WorkerError(
          "terminated",
          "Cannot restart a terminated Worker",
        );
      }

      restartWorker(true);
    },
  };

  Object.defineProperty(handle, SCOPE_PROXY_BIND, {
    value(handler: Scope) {
      if (!terminated) bindings.set(handler.$id, handler);
    },
  });

  return handle;
}

function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (!isObject(value) || isArray(value)) return false;

  const candidate = value as Partial<WorkerResponse>;

  return (
    candidate.type === "angular-ts:worker:response" &&
    isString(candidate.id) &&
    candidate.id.length > 0 &&
    typeof candidate.ok === "boolean" &&
    (!candidate.ok || Object.hasOwn(candidate, "result"))
  );
}

function isWorkerModelSnapshot(
  value: unknown,
): value is Extract<
  WorkerModelMessage,
  { type: "angular-ts:worker:model:snapshot" }
> {
  if (!isObject(value) || isArray(value)) return false;

  const candidate = value as Partial<
    Extract<WorkerModelMessage, { type: "angular-ts:worker:model:snapshot" }>
  >;

  return (
    candidate.type === "angular-ts:worker:model:snapshot" &&
    isString(candidate.channel) &&
    candidate.channel.length > 0 &&
    isObject(candidate.snapshot) &&
    !isArray(candidate.snapshot)
  );
}

function isWorkerProtocolMessage(value: unknown): boolean {
  if (!isObject(value) || isArray(value)) return false;

  const type = (value as { type?: unknown }).type;

  return (
    type === "angular-ts:worker:response" ||
    type === "angular-ts:worker:model:snapshot"
  );
}

function createWorkerModelSubscribeMessage(
  channel: string,
): WorkerModelMessage {
  return {
    type: "angular-ts:worker:model:subscribe",
    channel,
  };
}

function formatWorkerFailure(value: unknown, fallback: string): string {
  if (value instanceof Error) return value.message || value.name;
  if (isString(value) && value) return value;

  if (isObject(value) && isString((value as { message?: unknown }).message)) {
    return (value as { message: string }).message;
  }

  return fallback;
}

function assertWorkerRequestOptions(
  options: unknown,
): asserts options is WorkerRequestOptions {
  if (!isObject(options) || isArray(options)) {
    throw new Error("$worker request options must be an object.");
  }

  const candidate = options as Record<string, unknown>;

  if (
    candidate.timeout !== undefined &&
    (typeof candidate.timeout !== "number" ||
      candidate.timeout < 0 ||
      Number.isNaN(candidate.timeout))
  ) {
    throw new Error(
      "$worker request timeout must be a non-negative number or Infinity.",
    );
  }

  if (candidate.transfer !== undefined && !isArray(candidate.transfer)) {
    throw new Error("$worker request transfer must be an array.");
  }

  if (
    candidate.signal !== undefined &&
    (!(candidate.signal instanceof AbortSignal) ||
      typeof candidate.signal.addEventListener !== "function")
  ) {
    throw new Error("$worker request signal must be an AbortSignal.");
  }
}

/** @internal */
export function createWorkerService(
  log: ng.LogService,
  state: WorkerRuntimeState,
  getWorkerConstructor: () => WorkerConstructor,
  security?: SecurityPolicy,
): WorkerService {
  return <TSend = unknown, TReceive = unknown>(
    scriptPath: string | URL,
    config: WorkerConfig<TReceive> = {},
  ): WorkerHandle<TSend, TReceive> => {
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
        throw new Error(
          decision.reason ?? "Worker creation denied by security policy",
        );
      }
    }

    const handle = createManagedWorkerHandle<TSend, TReceive>(
      scriptPath,
      config,
      log,
      getWorkerConstructor,
      () => state.connections.delete(handle),
    );

    state.connections.add(handle);
    return handle;
  };
}

function assertWorkerConfig(config: unknown): asserts config is WorkerConfig {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error("$worker config must be an object.");
  }

  const candidate = config as Record<string, unknown>;

  if (
    candidate.type !== undefined &&
    candidate.type !== "classic" &&
    candidate.type !== "module"
  ) {
    throw new Error("$worker type must be 'classic' or 'module'.");
  }

  if (
    candidate.credentials !== undefined &&
    candidate.credentials !== "omit" &&
    candidate.credentials !== "same-origin" &&
    candidate.credentials !== "include"
  ) {
    throw new Error(
      "$worker credentials must be 'omit', 'same-origin', or 'include'.",
    );
  }

  if (candidate.name !== undefined && typeof candidate.name !== "string") {
    throw new Error("$worker name must be a string.");
  }

  if (
    candidate.decode !== undefined &&
    typeof candidate.decode !== "function"
  ) {
    throw new Error("$worker decode must be a function.");
  }

  if (
    candidate.restart !== undefined &&
    typeof candidate.restart !== "boolean"
  ) {
    throw new Error("$worker restart must be a boolean.");
  }

  if (
    candidate.restart !== true &&
    (Object.hasOwn(candidate, "restartDelay") ||
      Object.hasOwn(candidate, "maxRestarts"))
  ) {
    throw new Error(
      "$worker restartDelay and maxRestarts require restart: true.",
    );
  }

  if (
    candidate.restartDelay !== undefined &&
    (typeof candidate.restartDelay !== "number" ||
      !Number.isFinite(candidate.restartDelay) ||
      candidate.restartDelay < 0)
  ) {
    throw new Error(
      "$worker restartDelay must be a finite non-negative number.",
    );
  }

  if (
    candidate.maxRestarts !== undefined &&
    (typeof candidate.maxRestarts !== "number" ||
      candidate.maxRestarts < 0 ||
      (candidate.maxRestarts !== Infinity &&
        !Number.isInteger(candidate.maxRestarts)))
  ) {
    throw new Error(
      "$worker maxRestarts must be a non-negative integer or Infinity.",
    );
  }
}
