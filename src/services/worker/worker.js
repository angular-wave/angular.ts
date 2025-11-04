import { $injectTokens } from "../../injection-tokens";

/**
 * Worker Provider
 *
 * Usage:
 *   const worker = $worker('./math.worker.js', {
 *     onMessage: (data) => console.log('Result:', data),
 *     onError: (err) => console.error('Worker error:', err),
 *     autoTerminate: false,
 *     transformMessage: (d) => d,
 *   });
 *
 *   worker.post({ action: 'fib', n: 20 });
 *   worker.terminate();
 */
export class WorkerProvider {
  /**
   * @type {ng.LogService}
   */
  $log;
  constructor() {
    /**
     * Optional provider-level defaults
     * @type {ng.WorkerConfig}
     */
    this.defaults = {
      autoTerminate: false,
      transformMessage(data) {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      },
    };
  }

  /**
   * Returns the $worker service function
   * @returns {ng.WorkerService}
   */
  $get = [
    $injectTokens.$log,
    /** @param {ng.LogService} log */
    (log) => {
      this.$log = log;
      return (scriptPath, config = {}) => {
        const merged = { ...this.defaults, ...config };
        return this.#createWorker(scriptPath, merged);
      };
    },
  ];

  /**
   * Creates a managed Web Worker instance
   * @param {string | URL} scriptPath
   * @param {ng.WorkerConfig} config
   * @returns {import("./interface.ts").WorkerConnection}
   */
  #createWorker(scriptPath, config) {
    if (!scriptPath) throw new Error("Worker script path required");

    let worker = new Worker(scriptPath, { type: "module" });
    let terminated = false;

    const reconnect = () => {
      if (terminated) return;
      this.$log.info("Worker: restarting...");
      worker.terminate();
      worker = new Worker(scriptPath, { type: "module" });
      wire(worker);
    };

    const wire = (w) => {
      w.onmessage = (e) => {
        let data = e.data;
        try {
          data = config.transformMessage ? config.transformMessage(data) : data;
        } catch {
          /* no-op */
        }
        config.onMessage?.(data, e);
      };

      w.onerror = (err) => {
        config.onError?.(err);
        if (config.autoRestart) reconnect();
      };
    };

    wire(worker);
    let that = this;
    return {
      post(data) {
        if (terminated) return that.$log.warn("Worker already terminated");
        try {
          worker.postMessage(data);
        } catch (err) {
          that.$log.error("Worker post failed", err);
        }
      },
      terminate() {
        terminated = true;
        worker.terminate();
      },
      restart() {
        if (terminated)
          return that.$log.warn("Worker cannot restart after terminate");
        reconnect();
      },
    };
  }
}
