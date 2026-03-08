declare class NgMessageCtrl {
  /**
   * @param {HTMLElement} $element
   * @param {ng.Scope} $scope
   * @param {ng.Attributes} $attrs
   * @param {ng.AnimateService} $animate
   */
  constructor($element: any, $scope: any, $attrs: any, $animate: any);
  _getAttachId(): number;
  _render(collection?: {}): void;
  reRender(): void;
  /**
   * @param {{ _ngMessageNode: string; }} comment
   * @param {any} messageCtrl
   * @param {any} isDefault
   */
  register(comment: any, messageCtrl: any, isDefault: any): void;
  /**
   * @param {{ _ngMessageNode: any; }} comment
   * @param {any} isDefault
   */
  deregister(comment: any, isDefault: any): void;
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
  insertMessageNode(parent: any, comment: any, key: any): void;
  /**
   * @param {HTMLElement} parent
   * @param {{ _ngMessageNode: any; }} comment
   * @param {string | number} key
   */
  removeMessageNode(parent: any, comment: any, key: any): void;
}
/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive<NgMessageCtrl>}
 */
export declare function ngMessagesDirective($animate: any): {
  require: string;
  restrict: string;
  controller: ($element: any, $scope: any, $attrs: any) => NgMessageCtrl;
};
export declare namespace ngMessagesDirective {
  var $inject: "$animate"[];
}
/**
 * @param {ng.TemplateRequestService} $templateRequest
 * @param {ng.CompileService} $compile
 * @returns {ng.Directive}
 */
export declare function ngMessagesIncludeDirective(
  $templateRequest: any,
  $compile: any,
): {
  restrict: string;
  require: string;
  link($scope: any, element: any, attrs: any): void;
};
export declare namespace ngMessagesIncludeDirective {
  var $inject: ("$compile" | "$templateRequest")[];
}
export declare const ngMessageDirective: {
  ($animate: any): {
    restrict: string;
    transclude: string;
    priority: number;
    terminal: boolean;
    require: string;
    link(
      scope: any,
      element: any,
      attrs: any,
      ngMessagesCtrl: any,
      $transclude: any,
    ): void;
  };
  $inject: "$animate"[];
};
export declare const ngMessageExpDirective: {
  ($animate: any): {
    restrict: string;
    transclude: string;
    priority: number;
    terminal: boolean;
    require: string;
    link(
      scope: any,
      element: any,
      attrs: any,
      ngMessagesCtrl: any,
      $transclude: any,
    ): void;
  };
  $inject: "$animate"[];
};
export declare const ngMessageDefaultDirective: {
  ($animate: any): {
    restrict: string;
    transclude: string;
    priority: number;
    terminal: boolean;
    require: string;
    link(
      scope: any,
      element: any,
      attrs: any,
      ngMessagesCtrl: any,
      $transclude: any,
    ): void;
  };
  $inject: "$animate"[];
};
export {};
