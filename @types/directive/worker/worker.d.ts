import type { WorkerConfig, WorkerConnection } from "./interface.ts";
/**
 * Binds a DOM event to a module worker and routes its result back into the
 * element or an Angular expression callback.
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
 * Creates a managed worker wrapper with restart and message transformation hooks.
 */
export declare function createWorkerConnection(
  scriptPath: string | URL,
  config?: WorkerConfig,
): WorkerConnection;
