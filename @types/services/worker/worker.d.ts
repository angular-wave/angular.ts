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
  $log: ng.LogService;
  /**
   * Optional provider-level defaults
   * @type {ng.WorkerConfig}
   */
  defaults: ng.WorkerConfig;
  /**
   * Returns the $worker service function
   * @returns {ng.WorkerService}
   */
  $get: any[];
  #private;
}
