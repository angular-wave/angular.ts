/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive<NgMessageCtrl>}
 */
export function ngMessagesDirective(
  $animate: ng.AnimateService,
): ng.Directive<NgMessageCtrl>;
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
declare class NgMessageCtrl {
  /**
   * @param {Element} $element
   * @param {ng.Scope} $scope
   * @param {ng.Attributes} $attrs
   * @param {ng.AnimateService} $animate
   */
  constructor(
    $element: Element,
    $scope: ng.Scope,
    $attrs: ng.Attributes,
    $animate: ng.AnimateService,
  );
  $element: Element;
  $scope: ng.Scope;
  $attrs: ng.Attributes;
  $animate: import("../../interface.ts").AnimateService;
  latestKey: number;
  nextAttachId: number;
  messages: {};
  renderLater: boolean;
  cachedCollection: {};
  head: any;
  default: any;
  getAttachId(): number;
  render(collection?: {}): void;
  reRender(): void;
  register(comment: any, messageCtrl: any, isDefault: any): void;
  deregister(comment: any, isDefault: any): void;
  findPreviousMessage(parent: any, comment: any): any;
  insertMessageNode(parent: any, comment: any, key: any): void;
  removeMessageNode(parent: any, comment: any, key: any): void;
}
export {};
