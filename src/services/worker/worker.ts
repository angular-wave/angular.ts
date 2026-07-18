import { assign, isString } from "../../shared/utils.ts";

export interface WorkerConfig {
  onMessage?: (data: unknown, event: MessageEvent) => void;
  onError?: (err: ErrorEvent) => void;
  autoRestart?: boolean;
  transformMessage?: (data: unknown) => unknown;
}

interface DefaultWorkerConfig {
  onError: (err: ErrorEvent) => void;
  autoRestart: boolean;
  transformMessage: (data: unknown) => unknown;
}

type WorkerConstructor = new (
  scriptURL: string | URL,
  options?: WorkerOptions,
) => Worker;

export interface WorkerConnection {
  postMessage(data: unknown): void;
  onMessage(listener: (data: unknown, event: MessageEvent) => void): () => void;
  terminate(): void;
  restart(): void;
}

export type WorkerService = (
  scriptPath: string | URL,
  config?: WorkerConfig,
) => WorkerConnection;

/** @internal */
export interface WorkerRuntimeState {
  readonly connections: Set<WorkerConnection>;
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

/**
 * Creates a managed Web Worker connection.
 */
export function createWorkerConnection(
  scriptPath: string | URL,
  config?: WorkerConfig,
): WorkerConnection {
  return createManagedWorkerConnection(
    scriptPath,
    config,
    console as unknown as ng.LogService,
    () => Worker,
  );
}

function createManagedWorkerConnection(
  scriptPath: string | URL,
  config: WorkerConfig | undefined,
  logger: ng.LogService,
  getWorkerConstructor: () => WorkerConstructor,
  onTerminate?: () => void,
): WorkerConnection {
  if (!scriptPath) throw new Error("Worker script path required");

  const defaults: DefaultWorkerConfig = {
    autoRestart: false,
    onError() {
      /* empty */
    },
    transformMessage(data: unknown) {
      if (!isString(data)) {
        return data;
      }

      try {
        return JSON.parse(data) as unknown;
      } catch {
        return data;
      }
    },
  };

  const cfg = assign({}, defaults, config) as DefaultWorkerConfig;
  const messageListeners = new Set<
    (data: unknown, event: MessageEvent) => void
  >();

  if (config?.onMessage) {
    messageListeners.add(config.onMessage);
  }

  let worker = new (getWorkerConstructor())(scriptPath, { type: "module" });

  let terminated = false;

  const wire = (workerParam: Worker) => {
    workerParam.onmessage = (event: MessageEvent) => {
      let data: unknown = event.data;

      try {
        data = cfg.transformMessage(data);
      } catch {
        /* no-op */
      }

      for (const listener of messageListeners) {
        listener(data, event);
      }
    };

    workerParam.onerror = (err: ErrorEvent) => {
      cfg.onError(err);

      if (cfg.autoRestart) {
        reconnect();
      }
    };
  };

  const reconnect = () => {
    if (terminated) return;

    logger.info("Worker: restarting...");
    worker.terminate();
    worker = new (getWorkerConstructor())(scriptPath, { type: "module" });
    wire(worker);
  };

  wire(worker);

  return {
    postMessage(data: unknown) {
      if (terminated) {
        logger.warn("Worker already terminated");
      }

      try {
        worker.postMessage(data);
      } catch (err) {
        logger.log("Worker post failed", err);
      }
    },

    onMessage(listener) {
      messageListeners.add(listener);

      return () => {
        messageListeners.delete(listener);
      };
    },

    terminate() {
      if (terminated) return;

      terminated = true;
      worker.onmessage = null;
      worker.onerror = null;
      messageListeners.clear();
      worker.terminate();
      onTerminate?.();
    },

    restart() {
      if (terminated) {
        logger.warn("Worker cannot restart after terminate");
      }

      reconnect();
    },
  };
}

/** @internal */
export function createWorkerService(
  log: ng.LogService,
  state: WorkerRuntimeState,
  getWorkerConstructor: () => WorkerConstructor,
): WorkerService {
  return (scriptPath: string | URL, config: WorkerConfig = {}) => {
    if (state.destroyed) {
      throw new Error("Cannot create a Worker after runtime teardown");
    }

    const connection = createManagedWorkerConnection(
      scriptPath,
      config,
      log,
      getWorkerConstructor,
      () => {
        state.connections.delete(connection);
      },
    );

    state.connections.add(connection);

    return connection;
  };
}
