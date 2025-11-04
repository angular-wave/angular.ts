/**
 * ngWorker directive factory
 * Usage: <div ng-worker="workerName" data-params="{{ expression }}" data-on-result="callback($result)"></div>
 */
export function ngWorkerDirective(
  $worker: any,
  $parse: any,
  $log: any,
): {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
export namespace ngWorkerDirective {
  let $inject: string[];
}
