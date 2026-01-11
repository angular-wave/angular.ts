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
/**
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {ng.CompileService} $compile
 * @returns {ng.Directive}
 */
export function ngMessagesIncludeDirective(
  $templateRequest: ng.TemplateRequestService,
  $compile: ng.CompileService,
): ng.Directive;
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
  _element: Element;
  _scope: ng.Scope;
  _attrs: ng.Attributes;
  _animate: import("../../animations/interface.ts").AnimateService;
  _latestKey: number;
  _nextAttachId: number;
  _messages: {};
  _renderLater: boolean;
  _cachedCollection: {};
  _head: any;
  _default: any;
  _getAttachId(): number;
  _render(collection?: {}): void;
  reRender(): void;
  register(comment: any, messageCtrl: any, isDefault: any): void;
  deregister(comment: any, isDefault: any): void;
  findPreviousMessage(parent: any, comment: any): any;
  insertMessageNode(parent: any, comment: any, key: any): void;
  removeMessageNode(parent: any, comment: any, key: any): void;
}
export {};
