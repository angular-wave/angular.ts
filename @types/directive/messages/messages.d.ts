/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive}
 */
export function ngMessagesDirective($animate: ng.AnimateService): ng.Directive;
export namespace ngMessagesDirective {
  let $inject: string[];
}
export function ngMessagesIncludeDirective(
  $templateRequest: any,
  $compile: any,
): {
  restrict: string;
  require: string;
  link($scope: any, element: any, attrs: any): void;
};
export namespace ngMessagesIncludeDirective {
  let $inject_1: string[];
  export { $inject_1 as $inject };
}
export const ngMessageDirective: (any: any) => ng.Directive;
export const ngMessageExpDirective: (any: any) => ng.Directive;
export const ngMessageDefaultDirective: (any: any) => ng.Directive;
