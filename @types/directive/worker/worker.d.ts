/**
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" data-on-result="callback($result)"></div>
 *
 * @param {ng.ParseService} $parse
 * @param {ng.LogService} $log
 * @returns {ng.Directive}
 */
export function ngWorkerDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
): ng.Directive;
export namespace ngWorkerDirective {
  let $inject: string[];
}
/**
 * Creates a managed Web Worker connection.
 *
 * @param {string | URL} scriptPath
 * @param {ng.WorkerConfig} [config]
 * @returns {ng.WorkerConnection}
 */
export function createWorkerConnection(
  scriptPath: string | URL,
  config?: ng.WorkerConfig,
): ng.WorkerConnection;
