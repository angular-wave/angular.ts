/** @type {ng.DirectiveFactory} */
export declare const ngGetDirective: (
  $http: any,
  $compile: any,
  $log: any,
  $parse: any,
  $state: any,
  $sse: any,
  $animate: any,
) => {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
/** @type {ng.DirectiveFactory} */
export declare const ngDeleteDirective: (
  $http: any,
  $compile: any,
  $log: any,
  $parse: any,
  $state: any,
  $sse: any,
  $animate: any,
) => {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
/** @type {ng.DirectiveFactory} */
export declare const ngPostDirective: (
  $http: any,
  $compile: any,
  $log: any,
  $parse: any,
  $state: any,
  $sse: any,
  $animate: any,
) => {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
/** @type {ng.DirectiveFactory} */
export declare const ngPutDirective: (
  $http: any,
  $compile: any,
  $log: any,
  $parse: any,
  $state: any,
  $sse: any,
  $animate: any,
) => {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
/** @type {ng.DirectiveFactory} */
export declare const ngSseDirective: (
  $http: any,
  $compile: any,
  $log: any,
  $parse: any,
  $state: any,
  $sse: any,
  $animate: any,
) => {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
/**
 * Selects DOM event to listen for based on the element type.
 *
 * @param {Element} element - The DOM element to inspect.
 * @returns {"click" | "change" | "submit"} The name of the event to listen for.
 */
export declare function getEventNameForElement(
  element: any,
): "submit" | "change" | "click";
/**
 * Creates an HTTP directive factory that supports GET, DELETE, POST, PUT.
 *
 * @param {"get" | "delete" | "post" | "put"} method - HTTP method to use.
 * @param {string} attrName - Attribute name containing the URL.
 * @returns {ng.DirectiveFactory}
 */
export declare function createHttpDirective(
  method: any,
  attrName: any,
): (
  $http: any,
  $compile: any,
  $log: any,
  $parse: any,
  $state: any,
  $sse: any,
  $animate: any,
) => {
  restrict: string;
  link(scope: any, element: any, attrs: any): void;
};
