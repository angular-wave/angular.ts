export function ngMessagesDirective($animate: any): {
  require: string;
  restrict: string;
  controller: ($element: any, $scope: any, $attrs: any) => NgMessageCtrl;
};
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
export const ngMessageDirective: (
  any: any,
) => import("../../interface.ts").Directive;
export const ngMessageExpDirective: (
  any: any,
) => import("../../interface.ts").Directive;
export const ngMessageDefaultDirective: (
  any: any,
) => import("../../interface.ts").Directive;
declare class NgMessageCtrl {
  /**
   * @param {Element} $element
   * @param {import('../../core/scope/scope.js').Scope} $scope
   * @param {import('../../core/compile/attributes').Attributes} $attrs
   * @param {*} $animate
   */
  constructor(
    $element: Element,
    $scope: import("../../core/scope/scope.js").Scope,
    $attrs: any,
    $animate: any,
  );
  $element: Element;
  $scope: import("../../interface.ts").Scope;
  $attrs: any;
  $animate: any;
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
