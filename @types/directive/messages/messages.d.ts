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
export const ngMessageDirective: ($animate: ng.AnimateService) => ng.Directive;
export const ngMessageExpDirective: (
  $animate: ng.AnimateService,
) => ng.Directive;
export const ngMessageDefaultDirective: (
  $animate: ng.AnimateService,
) => ng.Directive;
declare class NgMessageCtrl {
  /**
   * @param {HTMLElement} $element
   * @param {ng.Scope} $scope
   * @param {ng.Attributes} $attrs
   * @param {ng.AnimateService} $animate
   */
  constructor(
    $element: HTMLElement,
    $scope: ng.Scope,
    $attrs: ng.Attributes,
    $animate: ng.AnimateService,
  );
  _element: HTMLElement;
  _scope: ng.Scope;
  _attrs: ng.Attributes;
  _animate: import("../../docs.ts").AnimateService;
  _latestKey: number;
  _nextAttachId: number;
  /** @type {Record<string, any>} */
  _messages: Record<string, any>;
  _renderLater: boolean;
  _cachedCollection: {};
  _head: any;
  _default: any;
  _getAttachId(): number;
  _render(collection?: {}): void;
  reRender(): void;
  /**
   * @param {{ _ngMessageNode: string; }} comment
   * @param {any} messageCtrl
   * @param {any} isDefault
   */
  register(
    comment: {
      _ngMessageNode: string;
    },
    messageCtrl: any,
    isDefault: any,
  ): void;
  /**
   * @param {{ _ngMessageNode: any; }} comment
   * @param {any} isDefault
   */
  deregister(
    comment: {
      _ngMessageNode: any;
    },
    isDefault: any,
  ): void;
  /**
   * @param {any} parent
   * @param {any} comment
   */
  findPreviousMessage(parent: any, comment: any): any;
  /**
   * @param {HTMLElement} parent
   * @param {{ _ngMessageNode: string; }} comment
   * @param {string} key
   */
  insertMessageNode(
    parent: HTMLElement,
    comment: {
      _ngMessageNode: string;
    },
    key: string,
  ): void;
  /**
   * @param {HTMLElement} parent
   * @param {{ _ngMessageNode: any; }} comment
   * @param {string | number} key
   */
  removeMessageNode(
    parent: HTMLElement,
    comment: {
      _ngMessageNode: any;
    },
    key: string | number,
  ): void;
}
export {};
