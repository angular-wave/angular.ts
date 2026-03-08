export declare function ngBindDirective(): ng.Directive;
export declare function ngBindTemplateDirective(): ng.Directive;
export declare function ngBindHtmlDirective(
  $parse: ng.ParseService,
): ng.Directive;
export declare namespace ngBindHtmlDirective {
  var $inject: "$parse"[];
}
