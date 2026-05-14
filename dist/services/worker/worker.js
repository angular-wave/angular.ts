import { _log, _exceptionHandler } from '../../injection-tokens.js';
import { assign, isString } from '../../shared/utils.js';

/**
 * Creates a managed Web Worker connection.
 */
function createWorkerConnection(scriptPath, config) {
    if (!scriptPath)
        throw new Error("Worker script path required");
    const defaults = {
        autoRestart: false,
        autoTerminate: false,
        onMessage() {
            /* empty */
        },
        onError() {
            /* empty */
        },
        transformMessage(data) {
            if (!isString(data)) {
                return data;
            }
            try {
                return JSON.parse(data);
            }
            catch {
                return data;
            }
        },
        logger: config?.logger || console,
        err: (config?.err || (() => undefined)),
    };
    const cfg = assign({}, defaults, config);
    let worker = new Worker(scriptPath, { type: "module" });
    let terminated = false;
    const wire = (workerParam) => {
        workerParam.onmessage = (event) => {
            let { data } = event;
            try {
                data = cfg.transformMessage(data);
            }
            catch {
                /* no-op */
            }
            cfg.onMessage(data, event);
        };
        workerParam.onerror = (err) => {
            cfg.onError(err);
            if (cfg.autoRestart) {
                reconnect();
            }
        };
    };
    const reconnect = () => {
        if (terminated)
            return;
        cfg.logger.info("Worker: restarting...");
        worker.terminate();
        worker = new Worker(scriptPath, { type: "module" });
        wire(worker);
    };
    wire(worker);
    return {
        post(data) {
            if (terminated) {
                cfg.logger.warn("Worker already terminated");
            }
            try {
                worker.postMessage(data);
            }
            catch (err) {
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
class WorkerProvider {
    constructor() {
        this.$get = [
            _log,
            _exceptionHandler,
            (log, exceptionHandler) => {
                return (scriptPath, config = {}) => createWorkerConnection(scriptPath, {
                    ...config,
                    logger: config.logger || log,
                    err: config.err || exceptionHandler,
                });
            },
        ];
    }
}

export { WorkerProvider, createWorkerConnection };
