declare class NgSwitchController {
  _cases: Record<
    string,
    {
      transclude: ng.TranscludeFn;
      element: Element;
    }[]
  >;
  constructor();
}
/**
 * @param {ng.AnimateService} $animate
 * @returns {ng.Directive<NgSwitchController>}
 */
export declare function ngSwitchDirective(
  $animate: ng.AnimateService,
): ng.Directive<NgSwitchController>;
export declare namespace ngSwitchDirective {
  var $inject: "$animate"[];
}
export declare function ngSwitchWhenDirective(): {
  transclude: string;
  terminal: boolean;
  priority: number;
  require: string;
  link(
    scope: ng.Scope,
    element: Element,
    attrs: import("../../core/compile/attributes.ts").Attributes &
      Record<string, string>,
    ctrl: NgSwitchController,
    $transclude?: ng.TranscludeFn,
  ): void;
};
export declare function ngSwitchDefaultDirective(): {
  transclude: string;
  terminal: boolean;
  priority: number;
  require: string;
  link(
    _scope: ng.Scope,
    element: Element,
    _attr: import("../../core/compile/attributes.ts").Attributes,
    ctrl: NgSwitchController,
    $transclude?: ng.TranscludeFn,
  ): void;
};
export {};
