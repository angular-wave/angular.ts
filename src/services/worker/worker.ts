import { _exceptionHandler, _log } from "../../injection-tokens.ts";
import { assign, isString } from "../../shared/utils.ts";

export interface WorkerConfig {
  onMessage?: (data: any, event: MessageEvent) => void;
  onError?: (err: ErrorEvent) => void;
  autoRestart?: boolean;
  autoTerminate?: boolean;
  transformMessage?: (data: any) => any;
  logger?: ng.LogService;
  err?: ng.ExceptionHandlerService;
}

export interface DefaultWorkerConfig {
  onMessage: (data: any, event: MessageEvent) => void;
  onError: (err: ErrorEvent) => void;
  autoRestart: boolean;
  autoTerminate: boolean;
  transformMessage: (data: any) => any;
  logger: ng.LogService;
  err: ng.ExceptionHandlerService;
}

export interface WorkerConnection {
  post(data: any): void;
  terminate(): void;
  restart(): void;
  config: WorkerConfig;
}

export type WorkerService = (
  scriptPath: string | URL,
  config?: WorkerConfig,
) => WorkerConnection;

/**
 * Creates a managed Web Worker connection.
 */
export function createWorkerConnection(
  scriptPath: string | URL,
  config?: WorkerConfig,
): WorkerConnection {
  if (!scriptPath) throw new Error("Worker script path required");

  const defaults: DefaultWorkerConfig = {
    autoRestart: false,
    autoTerminate: false,
    onMessage() {
      /* empty */
    },
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
    logger: config?.logger || console,
    err: (config?.err || (() => undefined)) as ng.ExceptionHandlerService,
  };

  const cfg = assign({}, defaults, config) as DefaultWorkerConfig;

  let worker = new Worker(scriptPath, { type: "module" });

  let terminated = false;

  const wire = (workerParam: Worker) => {
    workerParam.onmessage = (event: MessageEvent) => {
      let { data } = event;

      try {
        data = cfg.transformMessage(data);
      } catch {
        /* no-op */
      }

      cfg.onMessage(data, event);
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

    cfg.logger.info("Worker: restarting...");
    worker.terminate();
    worker = new Worker(scriptPath, { type: "module" });
    wire(worker);
  };

  wire(worker);

  return {
    post(data: unknown) {
      if (terminated) {
        cfg.logger.warn("Worker already terminated");
      }

      try {
        worker.postMessage(data);
      } catch (err) {
        cfg.logger.log("Worker post failed", err);
      }
    },

    terminate() {
      terminated = true;
      worker.terminate();
    },

    restart() {
      if (terminated) {
        cfg.logger.warn("Worker cannot restart after terminate");
      }

      reconnect();
    },

    config: cfg,
  };
}

export class WorkerProvider {
  $get = [
    _log,
    _exceptionHandler,
    (log: ng.LogService, exceptionHandler: ng.ExceptionHandlerService) => {
      return (scriptPath: string | URL, config: WorkerConfig = {}) =>
        createWorkerConnection(scriptPath, {
          ...config,
          logger: config.logger || log,
          err: config.err || exceptionHandler,
        });
    },
  ];
}
