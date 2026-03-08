import type { WorkerConfig, WorkerConnection } from "./interface.ts";
/**
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" data-on-result="callback($result)"></div>
 *
 * @param {ng.ParseService} $parse
 * @param {ng.LogService} $log
 * @param {ng.ExceptionHandlerService} $exceptionHandler
 * @returns {ng.Directive}
 */
export declare function ngWorkerDirective(
  $parse: ng.ParseService,
  $log: ng.LogService,
  $exceptionHandler: ng.ExceptionHandlerService,
): ng.Directive;
export declare namespace ngWorkerDirective {
  var $inject: ("$exceptionHandler" | "$log" | "$parse")[];
}
/**
 * Creates a managed Web Worker connection.
 *
 * @param {string | URL} scriptPath
 * @param {ng.WorkerConfig} [config]
 * @returns {ng.WorkerConnection}
 */
export declare function createWorkerConnection(
  scriptPath: string | URL,
  config?: WorkerConfig,
): WorkerConnection;
